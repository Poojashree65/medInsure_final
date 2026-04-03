"""
MEDINSURE ROLLING FORECAST SYSTEM
===================================
Adapts production rolling forecast approach for MedInsure dataset.

Workflow:
- Baseline: Train on 2021-2025, predict all 12 months of 2026
- Rolling:  Retrain each month adding actual 2026 data progressively
            Jan ← train 2021-2025, predict Feb-Dec 2026
            Feb ← train 2021-2025+Jan, predict Mar-Dec 2026
            ...and so on
"""

import pandas as pd
import numpy as np
from xgboost import XGBRegressor
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.metrics import r2_score, mean_absolute_error, mean_squared_error
from datetime import datetime
import warnings
import os
warnings.filterwarnings('ignore')

BASE_PATH   = os.path.dirname(__file__)
DATA_FILE   = os.path.join(BASE_PATH, "MEDINSURE_CLAIMS_2021_2026.csv")
OUTPUT_FILE = os.path.join(BASE_PATH, "MEDINSURE_2026_FUND_FORECAST.csv")

IBNR_RATE   = 0.155
RBNS_RATE   = 0.263
RISK_BUFFER = 0.10

MONTH_NAMES = {1:'Jan',2:'Feb',3:'Mar',4:'Apr',5:'May',6:'Jun',
               7:'Jul',8:'Aug',9:'Sep',10:'Oct',11:'Nov',12:'Dec'}
MONTH_LIST  = ['','JAN','FEB','MAR','APR','MAY','JUN',
               'JUL','AUG','SEP','OCT','NOV','DEC']

# ============================================================================
# LOAD DATA
# ============================================================================
print("=" * 100)
print("MEDINSURE ROLLING FORECAST SYSTEM")
print("=" * 100)

print("\n📂 Loading dataset...")
df_full = pd.read_csv(DATA_FILE, low_memory=False)
df_full = df_full[df_full['claim_date'].between(1, 12)].copy()
df_full['month'] = df_full['claim_date'].astype(int)
print(f"   ✅ Loaded {len(df_full):,} records | Years: {sorted(df_full['year'].unique())}")

# ============================================================================
# FEATURE ENGINEERING
# ============================================================================
def create_features(df):
    df = df.copy()

    df['gender_encoded'] = df['patient_gender'].map(
        {'Male': 1, 'Female': 2, 'Unknown': 0}).fillna(0)
    df['region_encoded'] = df['region'].map(
        {'Northeast': 1, 'South': 2, 'West': 3, 'Midwest': 4}).fillna(0)
    df['hospital_type_encoded'] = df['hospital_type'].map(
        {'General': 1, 'Specialty': 2, 'Teaching': 3,
         'Community': 4, 'Clinic': 5}).fillna(1)

    le_claim = LabelEncoder()
    df['claim_type_encoded'] = le_claim.fit_transform(df['claim_type'].astype(str))
    le_icd = LabelEncoder()
    df['icd_encoded'] = le_icd.fit_transform(df['icd_category'].astype(str))

    icd_freq = df['icd_category'].value_counts(normalize=True).to_dict()
    df['icd_freq'] = df['icd_category'].map(icd_freq).fillna(0)

    df['month_sin'] = np.sin(2 * np.pi * df['month'] / 12)
    df['month_cos'] = np.cos(2 * np.pi * df['month'] / 12)
    df['quarter']   = ((df['month'] - 1) // 3) + 1
    df['is_q1']     = (df['quarter'] == 1).astype(int)
    df['is_q4']     = (df['quarter'] == 4).astype(int)
    df['year_normalized'] = (df['year'] - 2021) / 5

    df['age_squared']  = df['patient_age'] ** 2
    df['age_group']    = pd.cut(df['patient_age'],
                                bins=[0, 18, 35, 50, 65, 100],
                                labels=[0, 1, 2, 3, 4])
    df['age_group']    = df['age_group'].cat.codes.replace(-1, 2)

    df['comorbidity_score']        = df['comorbidity_count'] * df['condition_priority']
    df['has_multiple_comorbidity'] = (df['comorbidity_count'] >= 3).astype(int)
    df['comorbidity_x_age']        = df['comorbidity_count'] * df['patient_age']
    df['chronic_complex']          = (
        (df['condition_priority'] <= 2) & (df['comorbidity_count'] >= 2)
    ).astype(int)

    df['plan_generosity']    = (5 - df['deductible_category']) + (5 - df['premium_level'])
    df['high_ded_high_prem'] = (
        (df['deductible_category'] >= 3) & (df['premium_level'] >= 3)
    ).astype(int)
    df['is_hmo'] = df['plan_type_hmo'].astype(int)

    df['log_requested']  = np.log1p(df['claim_amount_requested'])
    df['regional_avg_cost'] = df.groupby('region')['claim_amount_approved'].transform('mean')
    df['seasonal_avg_by_type'] = df.groupby(
        ['month', 'claim_type'])['claim_amount_approved'].transform('mean')

    patient_stats = df.groupby('patient_id').agg(
        patient_claim_count=('claim_amount_requested', 'count'),
        patient_avg_requested=('claim_amount_requested', 'mean'),
        patient_avg_approved=('claim_amount_approved', 'mean'),
    ).reset_index()
    df = df.merge(patient_stats, on='patient_id', how='left')
    df['patient_approval_rate'] = df['patient_avg_approved'] / (
        df['patient_avg_requested'] + 0.0001)

    for col in df.select_dtypes(include=[np.number]).columns:
        if df[col].isnull().sum() > 0:
            df[col].fillna(df[col].median(), inplace=True)

    return df

FEATURES = [
    'claim_amount_requested', 'log_requested',
    'patient_age', 'age_squared', 'age_group', 'gender_encoded',
    'comorbidity_count', 'condition_priority',
    'comorbidity_score', 'has_multiple_comorbidity',
    'comorbidity_x_age', 'chronic_complex',
    'education_years', 'poverty_category',
    'region_encoded', 'regional_avg_cost',
    'hospital_type_encoded',
    'month', 'month_sin', 'month_cos', 'quarter', 'is_q1', 'is_q4',
    'year_normalized', 'seasonal_avg_by_type',
    'claim_type_encoded', 'icd_encoded', 'icd_freq',
    'plan_category', 'premium_level', 'deductible_category',
    'is_hmo', 'plan_generosity', 'high_ded_high_prem',
    'copay_percent', 'coverage_limit_usd', 'premium_usd', 'deductible_usd',
    'patient_claim_count',
]

# ============================================================================
# MONTHLY RETRAINING WORKFLOW
# ============================================================================
def monthly_retraining_workflow(df_full, current_year, current_month):

    print("\n" + "=" * 100)
    print(f"RETRAINING WORKFLOW — {MONTH_LIST[current_month]} {current_year}")
    print(f"Execution Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 100)

    # Training data: all history up to previous month
    if current_month == 1:
        train_data = df_full[df_full['year'] < current_year].copy()
        print(f"\n📂 Training data: 2021 to {current_year-1}")
    else:
        train_data = df_full[
            (df_full['year'] < current_year) |
            ((df_full['year'] == current_year) & (df_full['month'] < current_month))
        ].copy()
        print(f"\n📂 Training data: 2021 to {current_year}-{current_month-1:02d}")

    # Test data: remaining months of current year
    test_data = df_full[
        (df_full['year'] == current_year) &
        (df_full['month'] >= current_month)
    ].copy()

    months_to_predict = 13 - current_month
    print(f"   ✅ Train: {len(train_data):,} claims")
    print(f"   ✅ Test:  {len(test_data):,} claims ({months_to_predict} months)")

    if len(test_data) == 0:
        return None

    # Feature engineering
    train_data = create_features(train_data)
    test_data  = create_features(test_data)

    X_train = train_data[FEATURES]
    y_train = train_data['claim_amount_approved']
    X_test  = test_data[FEATURES]
    y_test  = test_data['claim_amount_approved']

    valid_train = (y_train.notna()) & (y_train >= 0)
    valid_test  = (y_test.notna())  & (y_test >= 0)

    X_train, y_train = X_train[valid_train], y_train[valid_train]
    X_test,  y_test  = X_test[valid_test],   y_test[valid_test]
    test_data = test_data[valid_test]

    scaler = StandardScaler()
    X_train_s = scaler.fit_transform(X_train)
    X_test_s  = scaler.transform(X_test)

    # Train
    model = XGBRegressor(
        n_estimators=500,
        max_depth=6,
        learning_rate=0.02,
        subsample=0.85,
        colsample_bytree=0.85,
        min_child_weight=3,
        gamma=0.3,
        reg_alpha=0.5,
        reg_lambda=1.0,
        random_state=42,
        n_jobs=-1,
        tree_method='hist'
    )
    model.fit(X_train_s, y_train, verbose=False)

    y_pred = np.maximum(model.predict(X_test_s), 0)
    r2  = r2_score(y_test, y_pred)
    mae = mean_absolute_error(y_test, y_pred)
    rmse= np.sqrt(mean_squared_error(y_test, y_pred))

    print(f"\n🤖 Model: R²={r2:.4f} ({r2*100:.2f}%) | MAE={mae:.4f} USD | RMSE={rmse:.4f} USD")

    test_data = test_data.copy()
    test_data['predicted_approved'] = y_pred

    # Monthly reserves
    monthly = test_data.groupby('month').agg(
        actual_claims   =('claim_amount_approved', 'sum'),
        predicted_claims=('predicted_approved', 'sum'),
        claim_count     =('claim_amount_approved', 'count'),
    ).reset_index().sort_values('month')

    monthly['ibnr_amount']   = monthly['predicted_claims'] * IBNR_RATE
    monthly['rbns_amount']   = monthly['predicted_claims'] * RBNS_RATE
    monthly['risk_buffer']   = monthly['predicted_claims'] * RISK_BUFFER
    monthly['total_reserve'] = (monthly['predicted_claims'] +
                                 monthly['ibnr_amount'] +
                                 monthly['rbns_amount'] +
                                 monthly['risk_buffer'])
    monthly['error_pct'] = abs(
        monthly['actual_claims'] - monthly['predicted_claims']
    ) / monthly['actual_claims'] * 100
    monthly['month_name']    = monthly['month'].map(MONTH_NAMES)
    monthly['year']          = current_year
    monthly['retrain_month'] = current_month
    monthly['model_version'] = f"v{current_year}.{current_month:02d}"

    # Monthly MAPE
    monthly_mape = monthly['error_pct'].mean()

    # Display
    print(f"\n{'Month':<6} | {'Claims':>7} | {'Predicted':>12} | {'IBNR':>10} | "
          f"{'RBNS':>10} | {'Risk Buf':>10} | {'Deposit':>12} | {'Error%':>7}")
    print("-" * 95)
    for _, row in monthly.iterrows():
        print(f"{row['month_name']:<6} | {row['claim_count']:>7,.0f} | "
              f"{row['predicted_claims']:>11.4f} | "
              f"{row['ibnr_amount']:>9.4f} | "
              f"{row['rbns_amount']:>9.4f} | "
              f"{row['risk_buffer']:>9.4f} | "
              f"{row['total_reserve']:>11.4f} | "
              f"{row['error_pct']:>6.2f}%")
    print("-" * 95)
    total_reserve = monthly['total_reserve'].sum()
    print(f"{'TOTAL':<6} | {monthly['claim_count'].sum():>7,.0f} | "
          f"{monthly['predicted_claims'].sum():>11.4f} | "
          f"{monthly['ibnr_amount'].sum():>9.4f} | "
          f"{monthly['rbns_amount'].sum():>9.4f} | "
          f"{monthly['risk_buffer'].sum():>9.4f} | "
          f"{total_reserve:>11.4f} | "
          f"{monthly_mape:>6.2f}%")

    return {
        'retrain_month':     current_month,
        'retrain_month_name':MONTH_LIST[current_month],
        'train_size':        len(X_train),
        'test_size':         len(X_test),
        'months_predicted':  months_to_predict,
        'r2':                round(r2, 4),
        'mae':               round(mae, 4),
        'rmse':              round(rmse, 4),
        'monthly_mape':      round(monthly_mape, 2),
        'total_reserve':     round(total_reserve, 4),
        'monthly_detail':    monthly,
    }

# ============================================================================
# BASELINE — Train on 2021-2025, predict all 2026
# ============================================================================
print("\n" + "=" * 100)
print("STEP 1: BASELINE FORECAST (Train 2021-2025 ← Predict all 2026)")
print("=" * 100)

baseline_result = monthly_retraining_workflow(df_full, 2026, 1)

# ============================================================================
# ROLLING FORECAST — Retrain each month
# ============================================================================
print("\n" + "=" * 100)
print("STEP 2: ROLLING MONTHLY RETRAINING (2026)")
print("=" * 100)

rolling_results = []
for month in range(1, 13):
    result = monthly_retraining_workflow(df_full, 2026, month)
    if result:
        rolling_results.append(result)

# ============================================================================
# FINAL COMPARISON TABLE
# ============================================================================
print("\n" + "=" * 100)
print("FINAL COMPARISON: BASELINE vs ROLLING FORECAST")
print("=" * 100)

print(f"\n{'Retrain':<8} | {'Train Size':>12} | {'Months':>7} | "
      f"{'R²':>8} | {'MAE (USD)':>10} | {'MAPE%':>7} | {'Reserve (USD)':>14}")
print("-" * 85)

# Baseline row
print(f"{'BASELINE':<8} | {baseline_result['train_size']:>12,} | "
      f"{baseline_result['months_predicted']:>7} | "
      f"{baseline_result['r2']:>7.4f} | "
      f"{baseline_result['mae']:>10.4f} | "
      f"{baseline_result['monthly_mape']:>6.2f}% | "
      f"{baseline_result['total_reserve']:>14.4f}")

for r in rolling_results:
    print(f"{r['retrain_month_name']:<8} | {r['train_size']:>12,} | "
          f"{r['months_predicted']:>7} | "
          f"{r['r2']:>7.4f} | "
          f"{r['mae']:>10.4f} | "
          f"{r['monthly_mape']:>6.2f}% | "
          f"{r['total_reserve']:>14.4f}")

print("-" * 85)
avg_r2   = np.mean([r['r2'] for r in rolling_results])
avg_mae  = np.mean([r['mae'] for r in rolling_results])
avg_mape = np.mean([r['monthly_mape'] for r in rolling_results])
print(f"{'ROLLING AVG':<8} | {'─':>12} | {'─':>7} | "
      f"{avg_r2:>7.4f} | {avg_mae:>10.4f} | {avg_mape:>6.2f}% | {'─':>14}")

print(f"\n{'='*100}")
print("KEY METRICS SUMMARY")
print(f"{'='*100}")
print(f"   Baseline R²:          {baseline_result['r2']*100:.2f}%")
print(f"   Rolling Avg R²:       {avg_r2*100:.2f}%")
print(f"   Baseline MAPE:        {baseline_result['monthly_mape']:.2f}%")
print(f"   Rolling Avg MAPE:     {avg_mape:.2f}%")
print(f"   Total 2026 Reserve:   {baseline_result['total_reserve']:.4f} USD")
print(f"   Training growth:      {rolling_results[0]['train_size']:,} -> {rolling_results[-1]['train_size']:,}")

# ============================================================================
# SAVE FORECAST
# ============================================================================
baseline_result['monthly_detail']['forecast_type'] = 'Baseline'
all_monthly = [baseline_result['monthly_detail']]
for r in rolling_results:
    r['monthly_detail']['forecast_type'] = f"Rolling-{r['retrain_month_name']}"
    all_monthly.append(r['monthly_detail'])

final_df = pd.concat(all_monthly, ignore_index=True)
final_df.to_csv(OUTPUT_FILE, index=False)
print(f"\n✅ Forecast saved: MEDINSURE_2026_FUND_FORECAST.csv")
print("=" * 100)
