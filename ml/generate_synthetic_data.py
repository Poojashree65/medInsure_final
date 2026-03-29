"""
MEDINSURE SYNTHETIC DATASET GENERATOR
======================================
Generates realistic insurance claims data (2021-2026)
All monetary values are in ETH directly.
Designed for MedInsure blockchain health insurance system.
Target R²: ~90-93%
"""

import pandas as pd
import numpy as np
import os

np.random.seed(42)

OUTPUT_FILE   = "MEDINSURE_CLAIMS_2021_2026.csv"
TOTAL_RECORDS = 50000
ETH_TO_USD    = 2000  # 1 ETH = $2000

YEARS = [2021, 2022, 2023, 2024, 2025, 2026]

# Seasonal pattern — Q1 and Q4 have more claims
MONTHLY_WEIGHTS = [1.15, 0.95, 0.90, 0.85, 0.88, 0.92,
                   0.90, 0.93, 0.95, 1.05, 1.10, 1.20]

# ~5% annual growth in claim amounts
YEAR_GROWTH = {2021:1.00, 2022:1.05, 2023:1.10,
               2024:1.16, 2025:1.22, 2026:1.28}

# ============================================================================
# POLICY TYPES — all amounts in ETH
# ============================================================================
POLICY_TYPES = [
    {"name":"Basic Health Plan",    "premium_usd":40,  "copay_pct":20, "deductible_usd":6,   "coverage_limit_usd":300,  "plan_category":1, "deductible_category":4, "premium_level":1},
    {"name":"Standard Health Plan", "premium_usd":80,  "copay_pct":15, "deductible_usd":4,   "coverage_limit_usd":600,  "plan_category":2, "deductible_category":3, "premium_level":2},
    {"name":"Premium Health Plan",  "premium_usd":120, "copay_pct":10, "deductible_usd":2,   "coverage_limit_usd":1200, "plan_category":3, "deductible_category":2, "premium_level":3},
    {"name":"Senior Care Plan",     "premium_usd":100, "copay_pct":12, "deductible_usd":2,   "coverage_limit_usd":900,  "plan_category":4, "deductible_category":2, "premium_level":3},
    {"name":"Family Health Plan",   "premium_usd":110, "copay_pct":10, "deductible_usd":2,   "coverage_limit_usd":1000, "plan_category":5, "deductible_category":2, "premium_level":3},
]

# Base claim amounts in USD by claim type
CLAIM_BASE_USD = {
    "Inpatient":     (100, 40),
    "Outpatient":    (16,  6),
    "Emergency":     (80,  32),
    "Surgery":       (180, 70),
    "Pharmacy":      (8,   3),
    "Diagnostic":    (12,  4),
    "Maternity":     (120, 32),
    "Mental Health": (24,  10),
    "Dental":        (16,  6),
    "Vision":        (8,   2),
}

CLAIM_TYPES   = list(CLAIM_BASE_USD.keys())
CLAIM_WEIGHTS = [0.20, 0.25, 0.12, 0.10, 0.10, 0.08, 0.05, 0.04, 0.03, 0.03]

ICD_CATEGORIES = ["Cardiovascular","Respiratory","Musculoskeletal","Digestive",
                  "Neurological","Endocrine","Infectious","Injury","Cancer","Other"]
ICD_WEIGHTS    = [0.18, 0.15, 0.14, 0.12, 0.10, 0.09, 0.08, 0.07, 0.04, 0.03]

REGIONS            = ["Northeast","South","West","Midwest"]
REGION_COST_FACTOR = {"Northeast":1.15, "South":0.95, "West":1.10, "Midwest":0.90}

HOSPITAL_TYPES      = ["General","Specialty","Teaching","Community","Clinic"]
HOSPITAL_TYPE_FACTOR= {"General":1.0,"Specialty":1.3,"Teaching":1.2,"Community":0.85,"Clinic":0.70}

# ============================================================================
# PATIENT POOL
# ============================================================================
print("Generating patient pool...")
N_PATIENTS = 5000

patients = pd.DataFrame({
    "patient_id":       [f"PAT{str(i).zfill(5)}" for i in range(1, N_PATIENTS+1)],
    "patient_age":      np.random.choice(np.concatenate([
                            np.random.randint(18,35,1000), np.random.randint(35,50,1500),
                            np.random.randint(50,65,1500), np.random.randint(65,85,1000)])),
    "patient_gender":   np.random.choice(["Male","Female"], N_PATIENTS, p=[0.48,0.52]),
    "region":           np.random.choice(REGIONS, N_PATIENTS, p=[0.22,0.35,0.25,0.18]),
    "education_years":  np.random.choice([8,10,12,14,16,18], N_PATIENTS, p=[0.05,0.10,0.35,0.20,0.20,0.10]),
    "poverty_category": np.random.choice([1,2,3,4,5], N_PATIENTS, p=[0.10,0.20,0.35,0.25,0.10]),
    "comorbidity_count":np.random.choice([0,1,2,3,4,5], N_PATIENTS, p=[0.25,0.30,0.22,0.13,0.07,0.03]),
    "condition_priority":np.random.choice([1,2,3,4,5], N_PATIENTS, p=[0.10,0.20,0.35,0.25,0.10]),
    "policy_idx":       np.random.choice(len(POLICY_TYPES), N_PATIENTS, p=[0.30,0.30,0.15,0.15,0.10]),
})

# ============================================================================
# HOSPITAL POOL
# ============================================================================
N_HOSPITALS = 50
hospitals = pd.DataFrame({
    "hospital_id":   [f"HOSP{str(i).zfill(3)}" for i in range(1, N_HOSPITALS+1)],
    "hospital_type": np.random.choice(HOSPITAL_TYPES, N_HOSPITALS, p=[0.35,0.20,0.15,0.20,0.10]),
    "hospital_region":np.random.choice(REGIONS, N_HOSPITALS, p=[0.22,0.35,0.25,0.18]),
})

# ============================================================================
# GENERATE CLAIMS
# ============================================================================
print("Generating claims...")
records  = []
claim_id = 1
records_per_year = TOTAL_RECORDS // len(YEARS)

for year in YEARS:
    growth = YEAR_GROWTH[year]
    for month in range(1, 13):
        volume = int(records_per_year / 12 * MONTHLY_WEIGHTS[month-1])
        for _ in range(volume):
            patient  = patients.sample(1).iloc[0]
            hospital = hospitals.sample(1).iloc[0]
            policy   = POLICY_TYPES[patient["policy_idx"]]

            claim_type   = np.random.choice(CLAIM_TYPES, p=CLAIM_WEIGHTS)
            icd_category = np.random.choice(ICD_CATEGORIES, p=ICD_WEIGHTS)

            base_mean, base_std = CLAIM_BASE_USD[claim_type]
            age = patient["patient_age"]

            # Cost factors
            age_factor         = 1.0 + max(0, age - 40) * 0.008
            comorbidity_factor = 1.0 + patient["comorbidity_count"] * 0.12
            region_factor      = REGION_COST_FACTOR[patient["region"]]
            hosp_factor        = HOSPITAL_TYPE_FACTOR[hospital["hospital_type"]]
            priority_factor    = 1.0 + (3 - patient["condition_priority"]) * 0.08

            # Requested amount in ETH
            claim_requested = max(0.5, np.random.normal(
                base_mean * age_factor * comorbidity_factor *
                region_factor * hosp_factor * priority_factor * growth,
                base_std * 0.3
            ))

            # Approved = (requested - deductible) * (1 - copay), capped at coverage limit
            after_deductible = max(0, claim_requested - policy["deductible_usd"])
            after_copay      = after_deductible * (1 - policy["copay_pct"] / 100)
            claim_approved   = min(after_copay, policy["coverage_limit_usd"])

            # Realistic noise
            billing_noise    = np.random.normal(1.0, 0.11)
            doctor_noise     = np.random.normal(1.0, 0.09)
            outlier          = np.random.choice([1.0, np.random.uniform(0.50,1.7)], p=[0.93,0.07])
            processing_noise = np.random.normal(0, claim_approved * 0.07)

            claim_approved = max(0, claim_approved * abs(billing_noise) *
                                 abs(doctor_noise) * outlier + processing_noise)

            # Occasional partial approval
            if np.random.random() < 0.04:
                claim_approved *= np.random.uniform(0.5, 0.75)

            # Status
            if claim_approved <= 0:
                status = "Rejected"; claim_approved = 0.0
            elif claim_approved < claim_requested * 0.3:
                status = "Partial"
            else:
                status = "Approved"

            records.append({
                "claim_id":               f"CLM{str(claim_id).zfill(7)}",
                "year":                   year,
                "month":                  month,
                "claim_date":             month,
                "patient_id":             patient["patient_id"],
                "patient_age":            age,
                "patient_gender":         patient["patient_gender"],
                "region":                 patient["region"],
                "education_years":        int(patient["education_years"]),
                "poverty_category":       int(patient["poverty_category"]),
                "comorbidity_count":      int(patient["comorbidity_count"]),
                "condition_priority":     int(patient["condition_priority"]),
                "hospital_id":            hospital["hospital_id"],
                "hospital_type":          hospital["hospital_type"],
                "hospital_region":        hospital["hospital_region"],
                "claim_type":             claim_type,
                "icd_category":           icd_category,
                "claim_status":           status,
                "claim_amount_requested": round(claim_requested, 2),
                "claim_amount_approved":  round(claim_approved, 2),
                "policy_name":            policy["name"],
                "plan_category":          policy["plan_category"],
                "premium_level":          policy["premium_level"],
                "deductible_category":    policy["deductible_category"],
                "plan_type_hmo":          int(policy["plan_category"] in [2, 3]),
                "copay_percent":          policy["copay_pct"],
                "coverage_limit_usd":     policy["coverage_limit_usd"],
                "premium_usd":            policy["premium_usd"],
                "deductible_usd":         policy["deductible_usd"],
            })
            claim_id += 1

print(f"Generated {len(records):,} records")

df = pd.DataFrame(records)
df = df.sample(frac=1, random_state=42).reset_index(drop=True)

print(f"\nDataset shape: {df.shape}")
print(f"Years: {sorted(df['year'].unique())}")
print(f"\nClaim amounts (USD):")
print(f"  Requested — mean: ${df['claim_amount_requested'].mean():.2f}, max: ${df['claim_amount_requested'].max():.2f}")
print(f"  Approved  — mean: ${df['claim_amount_approved'].mean():.2f}, max: ${df['claim_amount_approved'].max():.2f}")
print(f"\nStatus distribution:\n{df['claim_status'].value_counts()}")
print(f"\nYear distribution:\n{df['year'].value_counts().sort_index()}")

output_path = os.path.join(os.path.dirname(__file__), OUTPUT_FILE)
df.to_csv(output_path, index=False)
print(f"\n✅ Saved: {output_path} | Rows: {len(df):,} | Columns: {len(df.columns)}")
