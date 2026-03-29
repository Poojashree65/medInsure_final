import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import PolicyContract from "../../contracts/PolicyContract.json";

const CONTRACT_ADDRESS = "0x9D176192efAc1BD6fe9d8Fac271E39E358A382ca";

function CreatePolicy({ account, web3 }) {
  const navigate = useNavigate();
  const [policies, setPolicies]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [showForm, setShowForm]     = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState("");
  const [success, setSuccess]       = useState("");
  const [formData, setFormData] = useState({
    policyName:"", coverageLimit:"", premiumAmount:"",
    validityPeriod:"", copayPercent:"", deductible:"",
    waitingPeriod:"", ipfsCID:"", covered:"", excluded:"",
  });

  useEffect(() => { if (web3 && account) loadPolicies(); }, [web3, account]);

  const loadPolicies = async () => {
    try {
      setLoading(true);
      const contract = new web3.eth.Contract(PolicyContract.abi, CONTRACT_ADDRESS);
      const ids = await contract.methods.getAllPolicies().call();
      const list = [];
      for (let id of ids) { const p = await contract.methods.getPolicy(id).call(); list.push(p); }
      setPolicies(list);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault(); setSubmitting(true); setError(""); setSuccess("");
    try {
      const contract = new web3.eth.Contract(PolicyContract.abi, CONTRACT_ADDRESS);
      await contract.methods.createPolicy({
        policyName:     formData.policyName,
        coverageLimit:  web3.utils.toWei(formData.coverageLimit, "ether"),
        premiumAmount:  web3.utils.toWei(formData.premiumAmount, "ether"),
        validityPeriod: parseInt(formData.validityPeriod),
        copayPercent:   parseInt(formData.copayPercent),
        deductible:     web3.utils.toWei(formData.deductible, "ether"),
        waitingPeriod:  parseInt(formData.waitingPeriod),
        ipfsCID:        formData.ipfsCID,
        covered:        formData.covered,
        excluded:       formData.excluded,
      }).send({ from: account });
      setSuccess("Policy created successfully.");
      setFormData({ policyName:"", coverageLimit:"", premiumAmount:"", validityPeriod:"", copayPercent:"", deductible:"", waitingPeriod:"", ipfsCID:"", covered:"", excluded:"" });
      setShowForm(false);
      loadPolicies();
    } catch (err) { setError("Error: " + err.message); }
    setSubmitting(false);
  };

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .cp-page {
          min-height: 100vh;
          background: #f4f7fc;
          font-family: 'Arial', sans-serif;
          color: #1a237e;
        }
        .cp-topbar {
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 36px; height: 68px;
          background: #fff; border-bottom: 1px solid #dde3ef;
          position: sticky; top: 0; z-index: 100;
        }
        .cp-brand { display: flex; align-items: center; gap: 10px; }
        .cp-brand-icon {
          width: 36px; height: 36px; background: #1565c0; border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          color: #fff; font-size: 16px; font-weight: 900;
        }
        .cp-brand-name { font-size: 18px; font-weight: 800; color: #1a237e; line-height: 1.2; }
        .cp-brand-sub  { font-size: 10px; color: #8fa0c0; letter-spacing: 0.5px; }
        .cp-topbar-right { display: flex; align-items: center; gap: 12px; }
        .cp-wallet {
          font-size: 12px; color: #5a6a88;
          background: #f4f7fc; border: 1px solid #dde3ef;
          padding: 6px 14px; border-radius: 6px;
        }
        .cp-back-btn {
          padding: 8px 18px; background: #fff; color: #1565c0;
          border: 2px solid #1565c0; border-radius: 6px;
          font-size: 13px; font-weight: 700; cursor: pointer;
          font-family: 'Arial', sans-serif; transition: all 0.2s;
        }
        .cp-back-btn:hover { background: #1565c0; color: #fff; }
        .cp-hero {
          background: #fff; border-bottom: 1px solid #dde3ef;
          padding: 36px 36px 32px;
        }
        .cp-hero-inner {
          max-width: 1320px; margin: 0 auto;
          display: flex; align-items: flex-start;
          justify-content: space-between; gap: 24px; flex-wrap: wrap;
        }
        .cp-section-label {
          display: inline-block; background: #e3eaf5; color: #1565c0;
          padding: 4px 12px; border-radius: 3px; font-size: 11px;
          font-weight: 800; letter-spacing: 1.2px; text-transform: uppercase;
          margin-bottom: 10px;
        }
        .cp-hero h1 {
          font-size: 28px; font-weight: 700; color: #0d1b35;
          font-family: 'Georgia', serif; margin-bottom: 6px;
        }
        .cp-hero p { font-size: 14px; color: #5a6a88; line-height: 1.7; }
        .cp-add-btn {
          padding: 11px 22px; background: #1565c0; color: #fff;
          border: none; border-radius: 7px; font-size: 13px; font-weight: 700;
          cursor: pointer; font-family: 'Arial', sans-serif;
          white-space: nowrap; transition: background 0.2s; align-self: center;
        }
        .cp-add-btn:hover { background: #0d47a1; }
        .cp-add-btn.open { background: #fff; color: #1565c0; border: 2px solid #1565c0; }
        .cp-add-btn.open:hover { background: #f4f7fc; }
        .cp-main { max-width: 1320px; margin: 0 auto; padding: 36px 36px 64px; }
        .cp-success {
          background: #e8f5e9; color: #2e7d32; border: 1px solid #a5d6a7;
          border-radius: 7px; padding: 12px 18px; font-size: 13px;
          margin-bottom: 24px; font-weight: 600;
        }
        .cp-error {
          background: #fdf2f2; color: #c62828; border: 1px solid #ef9a9a;
          border-radius: 7px; padding: 12px 18px; font-size: 13px;
          margin-bottom: 24px; font-weight: 600;
        }
        .cp-form-card {
          background: #fff; border: 1px solid #dde3ef; border-radius: 14px;
          padding: 32px; margin-bottom: 28px;
          box-shadow: 0 2px 12px rgba(0,0,0,0.05);
        }
        .cp-form-title {
          font-size: 18px; font-weight: 700; color: #0d1b35;
          font-family: 'Georgia', serif; margin-bottom: 24px;
          padding-bottom: 14px; border-bottom: 1px solid #dde3ef;
        }
        .cp-form-grid {
          display: grid; grid-template-columns: 1fr 1fr;
          gap: 18px; margin-bottom: 18px;
        }
        .cp-form-group { display: flex; flex-direction: column; gap: 6px; }
        .cp-label {
          font-size: 12px; font-weight: 700; color: #3a4a6b;
          text-transform: uppercase; letter-spacing: 0.5px;
        }
        .cp-hint { font-size: 11px; color: #8fa0c0; font-weight: 400; text-transform: none; letter-spacing: 0; }
        .cp-input {
          padding: 10px 14px; border: 1px solid #dde3ef; border-radius: 7px;
          font-size: 13px; color: #0d1b35; font-family: 'Arial', sans-serif;
          outline: none; transition: border 0.2s; width: 100%;
        }
        .cp-input:focus { border-color: #1565c0; }
        .cp-textarea {
          padding: 10px 14px; border: 1px solid #dde3ef; border-radius: 7px;
          font-size: 13px; color: #0d1b35; font-family: 'Arial', sans-serif;
          outline: none; transition: border 0.2s; width: 100%;
          min-height: 72px; resize: vertical;
        }
        .cp-textarea:focus { border-color: #1565c0; }
        .cp-submit-btn {
          width: 100%; padding: 13px; background: #1565c0; color: #fff;
          border: none; border-radius: 8px; font-size: 14px; font-weight: 700;
          cursor: pointer; font-family: 'Arial', sans-serif;
          margin-top: 6px; transition: background 0.2s; letter-spacing: 0.3px;
        }
        .cp-submit-btn:hover:not(:disabled) { background: #0d47a1; }
        .cp-submit-btn:disabled { background: #b0bec5; cursor: not-allowed; }
        .cp-table-card {
          background: #fff; border: 1px solid #dde3ef; border-radius: 14px;
          overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.05);
        }
        .cp-table-top {
          display: flex; align-items: center; justify-content: space-between;
          padding: 20px 28px; border-bottom: 1px solid #dde3ef;
          flex-wrap: wrap; gap: 12px;
        }
        .cp-table-top-left { display: flex; align-items: center; gap: 10px; }
        .cp-table-title { font-size: 16px; font-weight: 700; color: #0d1b35; font-family: 'Georgia', serif; }
        .cp-count-pill {
          background: #e3eaf5; color: #1565c0; padding: 3px 10px;
          border-radius: 3px; font-size: 11px; font-weight: 800; letter-spacing: 0.3px;
        }
        .cp-refresh-btn {
          padding: 8px 16px; background: #f4f7fc; border: 1px solid #dde3ef;
          border-radius: 7px; font-size: 13px; font-weight: 700; color: #1565c0;
          cursor: pointer; font-family: 'Arial', sans-serif; transition: background 0.2s;
        }
        .cp-refresh-btn:hover { background: #e3eaf5; }
        .cp-table-wrap { overflow-x: auto; }
        .cp-table { width: 100%; border-collapse: collapse; }
        .cp-th {
          background: #f4f7fc; padding: 12px 16px; text-align: left;
          font-size: 11px; font-weight: 800; color: #5a6a88;
          text-transform: uppercase; letter-spacing: 0.8px;
          border-bottom: 2px solid #dde3ef; white-space: nowrap;
        }
        .cp-td { padding: 12px 16px; font-size: 13px; color: #3a4a6b; border-bottom: 1px solid #f0f4f8; }
        .cp-td.bold   { font-weight: 700; color: #0d1b35; }
        .cp-td.accent { font-weight: 700; color: #1565c0; }
        .cp-td.wrap   { max-width: 150px; white-space: normal; font-size: 12px; }
        .cp-row-even  { background: #fff; }
        .cp-row-odd   { background: #fafbfe; }
        .cp-status-pill {
          display: inline-block; padding: 3px 10px; border-radius: 3px;
          font-size: 11px; font-weight: 700; letter-spacing: 0.3px;
        }
        .cp-status-active   { background: #e8f5e9; color: #2e7d32; }
        .cp-status-inactive { background: #fdf2f2; color: #c62828; }
        .cp-empty { text-align: center; padding: 48px; color: #8fa0c0; font-size: 14px; }

        @media (max-width: 768px) {
          .cp-topbar { padding: 0 16px; }
          .cp-hero, .cp-main { padding-left: 16px; padding-right: 16px; }
          .cp-form-grid { grid-template-columns: 1fr; }
          .cp-wallet { display: none; }
        }
      `}</style>

      <div className="cp-page">

        {/* TOPBAR */}
        <nav className="cp-topbar">
          <div className="cp-brand">
            <div className="cp-brand-icon">M</div>
            <div>
              <div className="cp-brand-name">MedInsure</div>
              <div className="cp-brand-sub">Blockchain Health Insurance</div>
            </div>
          </div>
          <div className="cp-topbar-right">
            <span className="cp-wallet">
              {account ? `${account.slice(0, 6)}...${account.slice(-4)}` : "Not Connected"}
            </span>
            <button className="cp-back-btn" onClick={() => navigate("/insurer")}>
              Back to Dashboard
            </button>
          </div>
        </nav>

        {/* HERO */}
        <div className="cp-hero">
          <div className="cp-hero-inner">
            <div>
              <div className="cp-section-label">Policy Management</div>
              <h1>Insurance Policies</h1>
              <p>Create new insurance plans and manage all existing policies.</p>
            </div>
            <button
              className={`cp-add-btn${showForm ? " open" : ""}`}
              onClick={() => { setShowForm(!showForm); setError(""); setSuccess(""); }}
            >
              {showForm ? "Close Form" : "+ Create New Policy"}
            </button>
          </div>
        </div>

        <div className="cp-main">

          {/* MESSAGES */}
          {success && <div className="cp-success">{success}</div>}
          {error   && <div className="cp-error">{error}</div>}

          {/* FORM */}
          {showForm && (
            <div className="cp-form-card">
              <div className="cp-form-title">Create New Policy</div>
              <form onSubmit={handleSubmit}>
                <div className="cp-form-grid">
                  <div className="cp-form-group">
                    <label className="cp-label">Policy Name</label>
                    <input className="cp-input" type="text" name="policyName" placeholder="e.g. Basic Health Plan" value={formData.policyName} onChange={handleChange} required />
                  </div>
                  <div className="cp-form-group">
                    <label className="cp-label">Validity Period (Years)</label>
                    <select className="cp-input" name="validityPeriod" value={formData.validityPeriod} onChange={handleChange} required>
                      <option value="">Select validity</option>
                      <option value="1">1 Year</option>
                      <option value="2">2 Years</option>
                      <option value="3">3 Years</option>
                      <option value="5">5 Years</option>
                    </select>
                  </div>
                  <div className="cp-form-group">
                    <label className="cp-label">Coverage Limit (ETH)</label>
                    <input className="cp-input" type="number" name="coverageLimit" placeholder="e.g. 5" min="0.001" step="0.001" value={formData.coverageLimit} onChange={handleChange} required />
                  </div>
                  <div className="cp-form-group">
                    <label className="cp-label">Premium Amount (ETH / month)</label>
                    <input className="cp-input" type="number" name="premiumAmount" placeholder="e.g. 0.1" min="0.001" step="0.001" value={formData.premiumAmount} onChange={handleChange} required />
                  </div>
                  <div className="cp-form-group">
                    <label className="cp-label">Co-pay % <span className="cp-hint">(patient pays this % of each claim)</span></label>
                    <input className="cp-input" type="number" name="copayPercent" placeholder="e.g. 10" min="0" max="100" step="1" value={formData.copayPercent} onChange={handleChange} required />
                  </div>
                  <div className="cp-form-group">
                    <label className="cp-label">Deductible (ETH) <span className="cp-hint">(patient pays this first per claim)</span></label>
                    <input className="cp-input" type="number" name="deductible" placeholder="e.g. 0.05" min="0" step="0.001" value={formData.deductible} onChange={handleChange} required />
                  </div>
                  <div className="cp-form-group">
                    <label className="cp-label">Waiting Period (Days) <span className="cp-hint">(days before claims are allowed)</span></label>
                    <input className="cp-input" type="number" name="waitingPeriod" placeholder="e.g. 30" min="0" max="365" step="1" value={formData.waitingPeriod} onChange={handleChange} required />
                  </div>
                  <div className="cp-form-group">
                    <label className="cp-label">IPFS CID <span className="cp-hint">(optional)</span></label>
                    <input className="cp-input" type="text" name="ipfsCID" placeholder="e.g. QmXyz123..." value={formData.ipfsCID} onChange={handleChange} />
                  </div>
                  <div className="cp-form-group">
                    <label className="cp-label">Covered Treatments</label>
                    <textarea className="cp-textarea" name="covered" placeholder="e.g. Surgery, Hospitalization, ICU" value={formData.covered} onChange={handleChange} required />
                  </div>
                  <div className="cp-form-group">
                    <label className="cp-label">Excluded Treatments</label>
                    <textarea className="cp-textarea" name="excluded" placeholder="e.g. Cosmetic Surgery, Dental" value={formData.excluded} onChange={handleChange} required />
                  </div>
                </div>
                <button className="cp-submit-btn" type="submit" disabled={submitting}>
                  {submitting ? "Creating Policy..." : "Create Policy"}
                </button>
              </form>
            </div>
          )}

          {/* TABLE */}
          <div className="cp-table-card">
            <div className="cp-table-top">
              <div className="cp-table-top-left">
                <span className="cp-table-title">Insurance Policies</span>
                <span className="cp-count-pill">{policies.length} Total</span>
              </div>
              <button className="cp-refresh-btn" onClick={loadPolicies}>Refresh</button>
            </div>

            {loading ? (
              <div className="cp-empty">Loading policies...</div>
            ) : policies.length === 0 ? (
              <div className="cp-empty">No policies created yet.</div>
            ) : (
              <div className="cp-table-wrap">
                <table className="cp-table">
                  <thead>
                    <tr>
                      {["ID","Policy Name","Coverage","Premium","Validity","Co-pay %","Deductible","Waiting","Covered","Excluded","Status"].map((h) => (
                        <th key={h} className="cp-th">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {policies.map((p, i) => (
                      <tr key={i} className={i % 2 === 0 ? "cp-row-even" : "cp-row-odd"}>
                        <td className="cp-td">#{p.policyId.toString()}</td>
                        <td className="cp-td bold">{p.policyName}</td>
                        <td className="cp-td accent">{web3.utils.fromWei(p.coverageLimit.toString(), "ether")} ETH</td>
                        <td className="cp-td">{web3.utils.fromWei(p.premiumAmount.toString(), "ether")} ETH</td>
                        <td className="cp-td">{p.validityPeriod.toString()} Yr</td>
                        <td className="cp-td accent">{p.copayPercent.toString()}%</td>
                        <td className="cp-td">{web3.utils.fromWei(p.deductible.toString(), "ether")} ETH</td>
                        <td className="cp-td">{p.waitingPeriod.toString()} days</td>
                        <td className="cp-td wrap">{p.covered}</td>
                        <td className="cp-td wrap">{p.excluded}</td>
                        <td className="cp-td">
                          <span className={`cp-status-pill ${p.status === "Active" ? "cp-status-active" : "cp-status-inactive"}`}>
                            {p.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      </div>
    </>
  );
}

export default CreatePolicy;