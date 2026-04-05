import React, { useState } from "react";
import PolicyContract from "../../contracts/PolicyContract.json";

const POLICY_CONTRACT_ADDRESS = "0x888C72Bd841cc9B61d1d07A07b244dad70ACA057";

function CheckEligibility({ web3 }) {
  const [patientAddress, setPatientAddress] = useState("");
  const [checking, setChecking] = useState(false);
  const [eligibility, setEligibility] = useState(null);
  const [error, setError] = useState("");

  const checkEligibility = async () => {
    if (!patientAddress || !web3) return;
    setChecking(true);
    setError("");
    setEligibility(null);
    try {
      const contract = new web3.eth.Contract(PolicyContract.abi, POLICY_CONTRACT_ADDRESS);
      const r = await contract.methods.checkEligibility(patientAddress).call();
      // r is a tuple: [eligible, policyName, coverageLimit, remainingCoverage,
      //                deductible, deductibleMet, copayPercentage,
      //                subscriptionStatus, paymentStatus, message]
      setEligibility({
        isEligible:         r[0],
        policyName:         r[1],
        coverageLimit:      web3.utils.fromWei(r[2].toString(), "ether"),
        remainingCoverage:  web3.utils.fromWei(r[3].toString(), "ether"),
        deductible:         web3.utils.fromWei(r[4].toString(), "ether"),
        deductibleMet:      r[5],
        copayPercentage:    r[6].toString(),
        subscriptionStatus: r[7],
        paymentStatus:      r[8],
        message:            r[9],
      });
    } catch (err) {
      console.error(err);
      setError("Failed to check eligibility. Please verify the patient address.");
    }
    setChecking(false);
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        .eligibility-page { min-height: 100vh; background: linear-gradient(135deg, #F8FAFB 0%, #E8EDF2 100%); font-family: 'Inter', sans-serif; padding: 2rem; }
        .eligibility-container { max-width: 900px; margin: 0 auto; }
        .eligibility-header { text-align: center; margin-bottom: 2rem; }
        .eligibility-title { font-size: 2rem; font-weight: 800; color: #1A202C; margin-bottom: 0.5rem; }
        .eligibility-subtitle { color: #4A5568; font-size: 1rem; }
        .search-card { background: #FFFFFF; border-radius: 16px; padding: 2rem; box-shadow: 0 4px 12px rgba(0,0,0,0.08); margin-bottom: 2rem; }
        .search-label { font-size: 0.875rem; font-weight: 600; color: #2D3748; margin-bottom: 0.5rem; display: block; }
        .search-row { display: flex; gap: 1rem; }
        .search-input { flex: 1; padding: 0.875rem 1rem; border: 2px solid #E2E8F0; border-radius: 10px; font-size: 0.875rem; font-family: 'Inter', monospace; transition: all 0.2s; }
        .search-input:focus { outline: none; border-color: #0052CC; box-shadow: 0 0 0 3px rgba(0,82,204,0.1); }
        .search-btn { background: linear-gradient(135deg, #0052CC, #0065FF); color: #FFFFFF; padding: 0.875rem 2rem; border: none; border-radius: 10px; font-size: 0.875rem; font-weight: 600; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; gap: 0.5rem; }
        .search-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 16px rgba(0,82,204,0.3); }
        .search-btn:disabled { background: #CBD5E0; cursor: not-allowed; transform: none; }
        .result-card { background: #FFFFFF; border-radius: 16px; padding: 2rem; box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
        .result-header { display: flex; align-items: center; gap: 1rem; padding: 1.5rem; border-radius: 12px; margin-bottom: 2rem; }
        .result-header.eligible { background: linear-gradient(135deg, #E8F5E9, #C8E6C9); border: 2px solid #00C853; }
        .result-header.not-eligible { background: linear-gradient(135deg, #FFEBEE, #FFCDD2); border: 2px solid #E53E3E; }
        .result-icon { font-size: 3rem; }
        .result-text h2 { font-size: 1.5rem; font-weight: 700; margin-bottom: 0.25rem; }
        .result-text.eligible h2 { color: #00C853; }
        .result-text.not-eligible h2 { color: #E53E3E; }
        .result-text p { color: #4A5568; font-size: 0.875rem; }
        .details-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1.5rem; margin-bottom: 2rem; }
        .detail-item { padding: 1rem; background: #F8FAFB; border-radius: 10px; border-left: 4px solid #0052CC; }
        .detail-label { font-size: 0.75rem; color: #8B9DAF; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.5rem; }
        .detail-value { font-size: 1.125rem; color: #1A202C; font-weight: 700; }
        .status-badge { display: inline-block; padding: 0.375rem 0.875rem; border-radius: 20px; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
        .status-badge.active { background: #E8F5E9; color: #00C853; }
        .status-badge.suspended { background: #FFF8E1; color: #FFA000; }
        .status-badge.paid { background: #E1F5FE; color: #0288D1; }
        .status-badge.due { background: #FFF8E1; color: #FFA000; }
        .status-badge.overdue { background: #FFEBEE; color: #E53E3E; }
        .message-box { background: #E1F5FE; border-left: 4px solid #0288D1; padding: 1rem 1.5rem; border-radius: 8px; color: #0288D1; font-size: 0.875rem; line-height: 1.6; }
        .error-msg { background: #FFEBEE; color: #E53E3E; padding: 1rem; border-radius: 10px; margin-bottom: 1rem; font-size: 0.875rem; }
        @media (max-width: 768px) { .details-grid { grid-template-columns: 1fr; } }
      `}</style>

      <div className="eligibility-page">
        <div className="eligibility-container">
          <div className="eligibility-header">
            <h1 className="eligibility-title">Check Patient Eligibility</h1>
            <p className="eligibility-subtitle">Verify insurance coverage before treatment</p>
          </div>

          <div className="search-card">
            <label className="search-label">Patient Wallet Address</label>
            <div className="search-row">
              <input
                type="text"
                className="search-input"
                placeholder="Enter patient address (0x...)"
                value={patientAddress}
                onChange={(e) => setPatientAddress(e.target.value)}
              />
              <button
                className="search-btn"
                onClick={checkEligibility}
                disabled={checking || !patientAddress}
              >
                {checking ? "Checking..." : "Check Eligibility"}
              </button>
            </div>
          </div>

          {error && <div className="error-msg">{error}</div>}

          {eligibility && (
            <div className="result-card">
              <div className={`result-header ${eligibility.isEligible ? "eligible" : "not-eligible"}`}>
                <div className="result-icon">{eligibility.isEligible ? "✅" : "❌"}</div>
                <div className={`result-text ${eligibility.isEligible ? "eligible" : "not-eligible"}`}>
                  <h2>{eligibility.isEligible ? "Patient is Eligible" : "Patient Not Eligible"}</h2>
                  <p>{eligibility.message}</p>
                </div>
              </div>

              <div className="details-grid">
                <div className="detail-item">
                  <div className="detail-label">Policy Name</div>
                  <div className="detail-value">{eligibility.policyName || "No Policy"}</div>
                </div>
                <div className="detail-item">
                  <div className="detail-label">Coverage Limit</div>
                  <div className="detail-value">{eligibility.coverageLimit} ETH</div>
                </div>
                <div className="detail-item">
                  <div className="detail-label">Remaining Coverage</div>
                  <div className="detail-value">{eligibility.remainingCoverage} ETH</div>
                </div>
                <div className="detail-item">
                  <div className="detail-label">Deductible</div>
                  <div className="detail-value">
                    {eligibility.deductible} ETH
                    {eligibility.deductibleMet && (
                      <span style={{ color: "#22C55E", marginLeft: "0.5rem" }}>✓ Met</span>
                    )}
                  </div>
                </div>
                <div className="detail-item">
                  <div className="detail-label">Co-pay Percentage</div>
                  <div className="detail-value">{eligibility.copayPercentage}%</div>
                </div>
                <div className="detail-item">
                  <div className="detail-label">Subscription Status</div>
                  <div className="detail-value">
                    <span className={`status-badge ${eligibility.subscriptionStatus.toLowerCase()}`}>
                      {eligibility.subscriptionStatus}
                    </span>
                  </div>
                </div>
                <div className="detail-item">
                  <div className="detail-label">Payment Status</div>
                  <div className="detail-value">
                    <span className={`status-badge ${eligibility.paymentStatus.toLowerCase()}`}>
                      {eligibility.paymentStatus}
                    </span>
                  </div>
                </div>
                <div className="detail-item">
                  <div className="detail-label">Patient Address</div>
                  <div className="detail-value" style={{ fontSize: "0.75rem", fontFamily: "monospace" }}>
                    {patientAddress.slice(0, 10)}...{patientAddress.slice(-8)}
                  </div>
                </div>
              </div>

              {eligibility.isEligible && (
                <div className="message-box">
                  Patient is eligible for treatment. You may proceed with submitting claims for covered services.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default CheckEligibility;
