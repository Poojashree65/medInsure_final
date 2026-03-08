import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import HospitalRegistry from "../../contracts/HospitalRegistry.json";

const CONTRACT_ADDRESS = "0x7B13E94a2f62D998CBD0e9471a5b750c1FDE2DF6";

function RegisterHospital({ account, web3 }) {
  const navigate = useNavigate();

  const [hospitals, setHospitals]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [showForm, setShowForm]     = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState("");
  const [success, setSuccess]       = useState("");
  const [search, setSearch]         = useState("");

  const [formData, setFormData] = useState({
    name: "", location: "", city: "",
    state: "", pincode: "", licenseNumber: "",
    walletAddress: "",
  });

  useEffect(() => {
    if (web3 && account) loadHospitals();
  }, [web3, account]);

  const loadHospitals = async () => {
    try {
      setLoading(true);
      const contract = new web3.eth.Contract(HospitalRegistry.abi, CONTRACT_ADDRESS);
      const events = await contract.getPastEvents("HospitalRegistered", { fromBlock: 0, toBlock: "latest" });
      const list = [];
      for (let e of events) {
        const data = await contract.methods.getHospital(e.returnValues.walletAddress).call();
        list.push(data);
      }
      setHospitals(list);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");
    try {
      const contract = new web3.eth.Contract(HospitalRegistry.abi, CONTRACT_ADDRESS);
      await contract.methods
        .registerHospital(
          formData.name, formData.location, formData.city,
          formData.state, formData.pincode,
          formData.licenseNumber, formData.walletAddress
        )
        .send({ from: account });
      setSuccess("Hospital registered successfully.");
      setFormData({ name:"", location:"", city:"", state:"", pincode:"", licenseNumber:"", walletAddress:"" });
      setShowForm(false);
      loadHospitals();
    } catch (err) {
      setError("Registration failed: " + err.message);
    }
    setSubmitting(false);
  };

  const filtered = hospitals.filter((h) =>
    h.name.toLowerCase().includes(search.toLowerCase()) ||
    h.city.toLowerCase().includes(search.toLowerCase()) ||
    h.licenseNumber.toLowerCase().includes(search.toLowerCase())
  );

  const fields = [
    { label: "Hospital Name",   name: "name",          ph: "Enter hospital name" },
    { label: "License Number",  name: "licenseNumber", ph: "Enter license number" },
    { label: "Address",         name: "location",      ph: "Enter address" },
    { label: "City",            name: "city",          ph: "Enter city" },
    { label: "State",           name: "state",         ph: "Enter state" },
    { label: "Pincode",         name: "pincode",       ph: "Enter pincode" },
  ];

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .rh-page {
          min-height: 100vh;
          background: #f4f7fc;
          font-family: 'Arial', sans-serif;
          color: #1a237e;
        }

        /* TOPBAR */
        .rh-topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 36px;
          height: 68px;
          background: #fff;
          border-bottom: 1px solid #dde3ef;
          position: sticky;
          top: 0;
          z-index: 100;
        }
        .rh-brand {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .rh-brand-icon {
          width: 36px;
          height: 36px;
          background: #1565c0;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          font-size: 16px;
          font-weight: 900;
        }
        .rh-brand-name {
          font-size: 18px;
          font-weight: 800;
          color: #1a237e;
          line-height: 1.2;
        }
        .rh-brand-sub {
          font-size: 10px;
          color: #8fa0c0;
          letter-spacing: 0.5px;
        }
        .rh-topbar-right {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .rh-back-btn {
          padding: 8px 18px;
          background: #fff;
          color: #1565c0;
          border: 2px solid #1565c0;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          font-family: 'Arial', sans-serif;
          transition: all 0.2s;
        }
        .rh-back-btn:hover { background: #1565c0; color: #fff; }
        .rh-wallet {
          font-size: 12px;
          color: #5a6a88;
          background: #f4f7fc;
          border: 1px solid #dde3ef;
          padding: 6px 14px;
          border-radius: 6px;
        }

        /* PAGE HEADER */
        .rh-hero {
          background: #fff;
          border-bottom: 1px solid #dde3ef;
          padding: 36px 36px 32px;
        }
        .rh-hero-inner {
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 24px;
          flex-wrap: wrap;
        }
        .rh-section-label {
          display: inline-block;
          background: #e3eaf5;
          color: #1565c0;
          padding: 4px 12px;
          border-radius: 3px;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 1.2px;
          text-transform: uppercase;
          margin-bottom: 10px;
        }
        .rh-hero h1 {
          font-size: 28px;
          font-weight: 700;
          color: #0d1b35;
          font-family: 'Georgia', serif;
          margin-bottom: 6px;
        }
        .rh-hero p {
          font-size: 14px;
          color: #5a6a88;
          line-height: 1.7;
        }
        .rh-add-btn {
          padding: 11px 22px;
          background: #1565c0;
          color: #fff;
          border: none;
          border-radius: 7px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          font-family: 'Arial', sans-serif;
          white-space: nowrap;
          transition: background 0.2s;
          align-self: center;
        }
        .rh-add-btn:hover { background: #0d47a1; }
        .rh-add-btn.open { background: #fff; color: #1565c0; border: 2px solid #1565c0; }
        .rh-add-btn.open:hover { background: #f4f7fc; }

        /* MAIN */
        .rh-main {
          max-width: 1200px;
          margin: 0 auto;
          padding: 36px 36px 64px;
        }

        /* MESSAGES */
        .rh-success {
          background: #e8f5e9;
          color: #2e7d32;
          border: 1px solid #a5d6a7;
          border-radius: 7px;
          padding: 12px 18px;
          font-size: 13px;
          margin-bottom: 24px;
          font-weight: 600;
        }
        .rh-error {
          background: #fdf2f2;
          color: #c62828;
          border: 1px solid #ef9a9a;
          border-radius: 7px;
          padding: 12px 18px;
          font-size: 13px;
          margin-bottom: 24px;
          font-weight: 600;
        }

        /* FORM CARD */
        .rh-form-card {
          background: #fff;
          border: 1px solid #dde3ef;
          border-radius: 14px;
          padding: 32px;
          margin-bottom: 28px;
          box-shadow: 0 2px 12px rgba(0,0,0,0.05);
        }
        .rh-form-title {
          font-size: 18px;
          font-weight: 700;
          color: #0d1b35;
          font-family: 'Georgia', serif;
          margin-bottom: 24px;
          padding-bottom: 14px;
          border-bottom: 1px solid #dde3ef;
        }
        .rh-form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 18px;
          margin-bottom: 18px;
        }
        .rh-form-group { display: flex; flex-direction: column; gap: 6px; }
        .rh-form-group.full { grid-column: 1 / -1; }
        .rh-label {
          font-size: 12px;
          font-weight: 700;
          color: #3a4a6b;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .rh-input {
          padding: 10px 14px;
          border: 1px solid #dde3ef;
          border-radius: 7px;
          font-size: 13px;
          color: #0d1b35;
          font-family: 'Arial', sans-serif;
          outline: none;
          transition: border 0.2s;
          width: 100%;
        }
        .rh-input:focus { border-color: #1565c0; }
        .rh-submit-btn {
          width: 100%;
          padding: 13px;
          background: #1565c0;
          color: #fff;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          font-family: 'Arial', sans-serif;
          margin-top: 6px;
          transition: background 0.2s;
          letter-spacing: 0.3px;
        }
        .rh-submit-btn:hover:not(:disabled) { background: #0d47a1; }
        .rh-submit-btn:disabled { background: #b0bec5; cursor: not-allowed; }

        /* TABLE CARD */
        .rh-table-card {
          background: #fff;
          border: 1px solid #dde3ef;
          border-radius: 14px;
          overflow: hidden;
          box-shadow: 0 2px 12px rgba(0,0,0,0.05);
        }
        .rh-table-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 28px;
          border-bottom: 1px solid #dde3ef;
          flex-wrap: wrap;
          gap: 12px;
        }
        .rh-table-top-left {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .rh-table-title {
          font-size: 16px;
          font-weight: 700;
          color: #0d1b35;
          font-family: 'Georgia', serif;
        }
        .rh-count-pill {
          background: #e3eaf5;
          color: #1565c0;
          padding: 3px 10px;
          border-radius: 3px;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.3px;
        }
        .rh-search-row {
          display: flex;
          gap: 8px;
          align-items: center;
        }
        .rh-search {
          padding: 8px 14px;
          border: 1px solid #dde3ef;
          border-radius: 7px;
          font-size: 13px;
          color: #0d1b35;
          font-family: 'Arial', sans-serif;
          width: 260px;
          outline: none;
        }
        .rh-search:focus { border-color: #1565c0; }
        .rh-refresh-btn {
          padding: 8px 14px;
          background: #f4f7fc;
          border: 1px solid #dde3ef;
          border-radius: 7px;
          font-size: 13px;
          font-weight: 700;
          color: #1565c0;
          cursor: pointer;
          font-family: 'Arial', sans-serif;
          transition: background 0.2s;
        }
        .rh-refresh-btn:hover { background: #e3eaf5; }
        .rh-table-wrap { overflow-x: auto; }
        .rh-table {
          width: 100%;
          border-collapse: collapse;
        }
        .rh-th {
          background: #f4f7fc;
          padding: 12px 18px;
          text-align: left;
          font-size: 11px;
          font-weight: 800;
          color: #5a6a88;
          text-transform: uppercase;
          letter-spacing: 0.8px;
          border-bottom: 2px solid #dde3ef;
          white-space: nowrap;
        }
        .rh-td {
          padding: 13px 18px;
          font-size: 13px;
          color: #3a4a6b;
          border-bottom: 1px solid #f0f4f8;
          white-space: nowrap;
        }
        .rh-td.bold { font-weight: 700; color: #0d1b35; }
        .rh-td.mono { font-family: monospace; font-size: 12px; color: #5a6a88; }
        .rh-row-even { background: #fff; }
        .rh-row-odd { background: #fafbfe; }
        .rh-status-pill {
          display: inline-block;
          padding: 3px 10px;
          border-radius: 3px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.3px;
        }
        .rh-status-active { background: #e8f5e9; color: #2e7d32; }
        .rh-status-inactive { background: #fdf2f2; color: #c62828; }
        .rh-empty {
          text-align: center;
          padding: 48px;
          color: #8fa0c0;
          font-size: 14px;
        }

        @media (max-width: 640px) {
          .rh-topbar { padding: 0 16px; }
          .rh-hero { padding: 24px 16px; }
          .rh-main { padding: 24px 16px 48px; }
          .rh-form-grid { grid-template-columns: 1fr; }
          .rh-wallet { display: none; }
          .rh-search { width: 180px; }
        }
      `}</style>

      <div className="rh-page">

        {/* TOPBAR */}
        <nav className="rh-topbar">
          <div className="rh-brand">
            <div className="rh-brand-icon">M</div>
            <div>
              <div className="rh-brand-name">MedInsure</div>
              <div className="rh-brand-sub">Blockchain Health Insurance</div>
            </div>
          </div>
          <div className="rh-topbar-right">
            <span className="rh-wallet">
              {account ? `${account.slice(0, 6)}...${account.slice(-4)}` : "Not Connected"}
            </span>
            <button className="rh-back-btn" onClick={() => navigate("/insurer")}>
              Back to Dashboard
            </button>
          </div>
        </nav>

        {/* PAGE HEADER */}
        <div className="rh-hero">
          <div className="rh-hero-inner">
            <div>
              <div className="rh-section-label">Hospital Management</div>
              <h1>Registered Hospitals</h1>
              <p>Register and manage all hospitals in the MedInsure network.</p>
            </div>
            <button
              className={`rh-add-btn${showForm ? " open" : ""}`}
              onClick={() => { setShowForm(!showForm); setError(""); setSuccess(""); }}
            >
              {showForm ? "Close Form" : "+ Register New Hospital"}
            </button>
          </div>
        </div>

        <div className="rh-main">

          {/* MESSAGES */}
          {success && <div className="rh-success">{success}</div>}
          {error   && <div className="rh-error">{error}</div>}

          {/* REGISTER FORM */}
          {showForm && (
            <div className="rh-form-card">
              <div className="rh-form-title">Register New Hospital</div>
              <form onSubmit={handleSubmit}>
                <div className="rh-form-grid">
                  {fields.map((f) => (
                    <div key={f.name} className="rh-form-group">
                      <label className="rh-label">{f.label}</label>
                      <input
                        className="rh-input"
                        type="text"
                        name={f.name}
                        placeholder={f.ph}
                        value={formData[f.name]}
                        onChange={handleChange}
                        required
                      />
                    </div>
                  ))}
                </div>
                <div className="rh-form-group full" style={{ marginBottom: "18px" }}>
                  <label className="rh-label">Hospital Wallet Address</label>
                  <input
                    className="rh-input"
                    type="text"
                    name="walletAddress"
                    placeholder="Enter Ethereum wallet address"
                    value={formData.walletAddress}
                    onChange={handleChange}
                    required
                  />
                </div>
                <button className="rh-submit-btn" type="submit" disabled={submitting}>
                  {submitting ? "Registering..." : "Register Hospital"}
                </button>
              </form>
            </div>
          )}

          {/* TABLE */}
          <div className="rh-table-card">
            <div className="rh-table-top">
              <div className="rh-table-top-left">
                <span className="rh-table-title">Registered Hospitals</span>
                <span className="rh-count-pill">{hospitals.length} Total</span>
              </div>
              <div className="rh-search-row">
                <input
                  className="rh-search"
                  type="text"
                  placeholder="Search by name, city, license..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <button className="rh-refresh-btn" onClick={loadHospitals}>Refresh</button>
              </div>
            </div>

            {loading ? (
              <div className="rh-empty">Loading hospital records...</div>
            ) : filtered.length === 0 ? (
              <div className="rh-empty">
                {hospitals.length === 0 ? "No hospitals registered yet." : "No results found for your search."}
              </div>
            ) : (
              <div className="rh-table-wrap">
                <table className="rh-table">
                  <thead>
                    <tr>
                      {["ID","Hospital Name","City","State","Pincode","License","Wallet","Registered","Status"].map((h) => (
                        <th key={h} className="rh-th">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((h, i) => (
                      <tr key={i} className={i % 2 === 0 ? "rh-row-even" : "rh-row-odd"}>
                        <td className="rh-td">#{h.hospitalId.toString()}</td>
                        <td className="rh-td bold">{h.name}</td>
                        <td className="rh-td">{h.city}</td>
                        <td className="rh-td">{h.state}</td>
                        <td className="rh-td">{h.pincode}</td>
                        <td className="rh-td">{h.licenseNumber}</td>
                        <td className="rh-td mono">
                          {h.walletAddress.substring(0, 8)}...{h.walletAddress.slice(-4)}
                        </td>
                        <td className="rh-td">
                          {new Date(Number(h.timestamp) * 1000).toLocaleDateString()}
                        </td>
                        <td className="rh-td">
                          <span className={`rh-status-pill ${h.status === "Active" ? "rh-status-active" : "rh-status-inactive"}`}>
                            {h.status}
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

export default RegisterHospital;