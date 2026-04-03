import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import UserRegistry from "../../contracts/UserRegistry.json";

const CONTRACT_ADDRESS = "0x7AA9894AC875d5614Eebe2109BFD57f9f8930c4d";

function ApprovePatient({ account, web3 }) {
  const navigate = useNavigate();

  const [patients, setPatients]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [actionMsg, setActionMsg] = useState("");
  const [error, setError]         = useState("");
  const [search, setSearch]       = useState("");
  const [filter, setFilter]       = useState("All");

  useEffect(() => {
    if (web3 && account) loadPatients();
  }, [web3, account]);

  const loadPatients = async () => {
    try {
      setLoading(true);
      const contract = new web3.eth.Contract(UserRegistry.abi, CONTRACT_ADDRESS);
      const allAddresses = await contract.methods.getAllPatients().call();
      const list = [];
      for (let addr of allAddresses) {
        const data = await contract.methods.getPatient(addr).call();
        list.push(data);
      }
      setPatients(list);
      setLoading(false);
    } catch (err) {
      setError("Error loading patients: " + err.message);
      setLoading(false);
    }
  };

  const approvePatient = async (walletAddress) => {
    try {
      setActionMsg("");
      setError("");
      const contract = new web3.eth.Contract(UserRegistry.abi, CONTRACT_ADDRESS);
      await contract.methods.approvePatient(walletAddress).send({ from: account });
      setActionMsg("Patient approved successfully.");
      loadPatients();
    } catch (err) {
      setError("Error: " + err.message);
    }
  };

  const rejectPatient = async (walletAddress) => {
    try {
      setActionMsg("");
      setError("");
      const contract = new web3.eth.Contract(UserRegistry.abi, CONTRACT_ADDRESS);
      await contract.methods.rejectPatient(walletAddress).send({ from: account });
      setActionMsg("Patient rejected.");
      loadPatients();
    } catch (err) {
      setError("Error: " + err.message);
    }
  };

  const filtered = patients.filter((p) => {
    const matchSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.mobile.includes(search) ||
      p.email.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "All" || p.status === filter;
    return matchSearch && matchFilter;
  });

  const counts = {
    All:      patients.length,
    Pending:  patients.filter((p) => p.status === "Pending").length,
    Approved: patients.filter((p) => p.status === "Approved").length,
    Rejected: patients.filter((p) => p.status === "Rejected").length,
  };

  const statConfig = {
    All:      { border: "#1565c0", color: "#1565c0", bg: "#e3eaf5" },
    Pending:  { border: "#f57c00", color: "#e65100", bg: "#fff3e0" },
    Approved: { border: "#2e7d32", color: "#1b5e20", bg: "#e8f5e9" },
    Rejected: { border: "#c62828", color: "#b71c1c", bg: "#fdf2f2" },
  };

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .ap-page {
          min-height: 100vh;
          background: #f4f7fc;
          font-family: 'Arial', sans-serif;
          color: #1a237e;
        }

        /* TOPBAR */
        .ap-topbar {
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
        .ap-brand { display: flex; align-items: center; gap: 10px; }
        .ap-brand-icon {
          width: 36px; height: 36px;
          background: #1565c0; border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          color: #fff; font-size: 16px; font-weight: 900;
        }
        .ap-brand-name { font-size: 18px; font-weight: 800; color: #1a237e; line-height: 1.2; }
        .ap-brand-sub  { font-size: 10px; color: #8fa0c0; letter-spacing: 0.5px; }
        .ap-topbar-right { display: flex; align-items: center; gap: 12px; }
        .ap-wallet {
          font-size: 12px; color: #5a6a88;
          background: #f4f7fc; border: 1px solid #dde3ef;
          padding: 6px 14px; border-radius: 6px;
        }
        .ap-back-btn {
          padding: 8px 18px;
          background: #fff; color: #1565c0;
          border: 2px solid #1565c0; border-radius: 6px;
          font-size: 13px; font-weight: 700; cursor: pointer;
          font-family: 'Arial', sans-serif; transition: all 0.2s;
        }
        .ap-back-btn:hover { background: #1565c0; color: #fff; }

        /* HERO */
        .ap-hero {
          background: #fff;
          border-bottom: 1px solid #dde3ef;
          padding: 36px 36px 32px;
        }
        .ap-hero-inner { max-width: 1200px; margin: 0 auto; }
        .ap-section-label {
          display: inline-block;
          background: #e3eaf5; color: #1565c0;
          padding: 4px 12px; border-radius: 3px;
          font-size: 11px; font-weight: 800;
          letter-spacing: 1.2px; text-transform: uppercase;
          margin-bottom: 10px;
        }
        .ap-hero h1 {
          font-size: 28px; font-weight: 700; color: #0d1b35;
          font-family: 'Georgia', serif; margin-bottom: 6px;
        }
        .ap-hero p { font-size: 14px; color: #5a6a88; line-height: 1.7; }

        /* MAIN */
        .ap-main { max-width: 1200px; margin: 0 auto; padding: 36px 36px 64px; }

        /* MESSAGES */
        .ap-success {
          background: #e8f5e9; color: #2e7d32;
          border: 1px solid #a5d6a7; border-radius: 7px;
          padding: 12px 18px; font-size: 13px;
          margin-bottom: 24px; font-weight: 600;
        }
        .ap-error {
          background: #fdf2f2; color: #c62828;
          border: 1px solid #ef9a9a; border-radius: 7px;
          padding: 12px 18px; font-size: 13px;
          margin-bottom: 24px; font-weight: 600;
        }

        /* STATS ROW */
        .ap-stats { display: flex; gap: 16px; margin-bottom: 28px; flex-wrap: wrap; }
        .ap-stat-card {
          background: #fff;
          border: 2px solid;
          border-radius: 10px;
          padding: 18px 28px;
          cursor: pointer;
          transition: all 0.2s;
          min-width: 110px;
          text-align: center;
        }
        .ap-stat-card:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0,0,0,0.08); }
        .ap-stat-card.active { box-shadow: 0 4px 16px rgba(0,0,0,0.1); }
        .ap-stat-num { font-size: 28px; font-weight: 900; font-family: 'Arial', sans-serif; line-height: 1; margin-bottom: 4px; }
        .ap-stat-lbl { font-size: 12px; color: #5a6a88; font-weight: 600; letter-spacing: 0.3px; }

        /* TABLE CARD */
        .ap-table-card {
          background: #fff;
          border: 1px solid #dde3ef;
          border-radius: 14px;
          overflow: hidden;
          box-shadow: 0 2px 12px rgba(0,0,0,0.05);
        }
        .ap-table-top {
          display: flex; align-items: center;
          justify-content: space-between;
          padding: 20px 28px;
          border-bottom: 1px solid #dde3ef;
          flex-wrap: wrap; gap: 12px;
        }
        .ap-table-top-left { display: flex; align-items: center; gap: 10px; }
        .ap-table-title { font-size: 16px; font-weight: 700; color: #0d1b35; font-family: 'Georgia', serif; }
        .ap-count-pill {
          background: #e3eaf5; color: #1565c0;
          padding: 3px 10px; border-radius: 3px;
          font-size: 11px; font-weight: 800; letter-spacing: 0.3px;
        }
        .ap-search-row { display: flex; gap: 8px; align-items: center; }
        .ap-search {
          padding: 8px 14px;
          border: 1px solid #dde3ef; border-radius: 7px;
          font-size: 13px; color: #0d1b35;
          font-family: 'Arial', sans-serif; width: 260px; outline: none;
        }
        .ap-search:focus { border-color: #1565c0; }
        .ap-refresh-btn {
          padding: 8px 14px;
          background: #f4f7fc; border: 1px solid #dde3ef;
          border-radius: 7px; font-size: 13px; font-weight: 700;
          color: #1565c0; cursor: pointer;
          font-family: 'Arial', sans-serif; transition: background 0.2s;
        }
        .ap-refresh-btn:hover { background: #e3eaf5; }

        /* TABLE */
        .ap-table-wrap { overflow-x: auto; }
        .ap-table { width: 100%; border-collapse: collapse; }
        .ap-th {
          background: #f4f7fc; padding: 12px 18px;
          text-align: left; font-size: 11px; font-weight: 800;
          color: #5a6a88; text-transform: uppercase;
          letter-spacing: 0.8px; border-bottom: 2px solid #dde3ef;
          white-space: nowrap;
        }
        .ap-td {
          padding: 13px 18px; font-size: 13px; color: #3a4a6b;
          border-bottom: 1px solid #f0f4f8; white-space: nowrap;
        }
        .ap-td.bold { font-weight: 700; color: #0d1b35; }
        .ap-row-even { background: #fff; }
        .ap-row-odd  { background: #fafbfe; }

        /* AVATAR */
        .ap-name-cell { display: flex; align-items: center; gap: 9px; }
        .ap-avatar {
          width: 30px; height: 30px; border-radius: 50%;
          background: #1565c0; color: #fff;
          display: flex; align-items: center; justify-content: center;
          font-size: 13px; font-weight: 700; flex-shrink: 0;
        }

        /* PILLS */
        .ap-pill {
          display: inline-block;
          padding: 3px 10px; border-radius: 3px;
          font-size: 11px; font-weight: 700; letter-spacing: 0.3px;
        }
        .ap-otp-yes  { background: #e8f5e9; color: #2e7d32; }
        .ap-otp-no   { background: #fdf2f2; color: #c62828; }
        .ap-s-pending  { background: #fff3e0; color: #e65100; }
        .ap-s-approved { background: #e8f5e9; color: #2e7d32; }
        .ap-s-rejected { background: #fdf2f2; color: #c62828; }

        /* ACTION BUTTONS */
        .ap-action-btns { display: flex; gap: 6px; }
        .ap-approve-btn {
          padding: 5px 12px;
          background: #1565c0; color: #fff;
          border: none; border-radius: 5px;
          font-size: 12px; font-weight: 700;
          cursor: pointer; font-family: 'Arial', sans-serif;
          transition: background 0.2s; white-space: nowrap;
        }
        .ap-approve-btn:hover { background: #0d47a1; }
        .ap-reject-btn {
          padding: 5px 12px;
          background: #fff; color: #c62828;
          border: 2px solid #c62828; border-radius: 5px;
          font-size: 12px; font-weight: 700;
          cursor: pointer; font-family: 'Arial', sans-serif;
          transition: all 0.2s; white-space: nowrap;
        }
        .ap-reject-btn:hover { background: #c62828; color: #fff; }
        .ap-done-lbl { font-size: 12px; color: #8fa0c0; }

        .ap-empty { text-align: center; padding: 48px; color: #8fa0c0; font-size: 14px; }

        @media (max-width: 640px) {
          .ap-topbar { padding: 0 16px; }
          .ap-hero, .ap-main { padding-left: 16px; padding-right: 16px; }
          .ap-wallet { display: none; }
          .ap-search { width: 160px; }
        }
      `}</style>

      <div className="ap-page">

        {/* TOPBAR */}
        <nav className="ap-topbar">
          <div className="ap-brand">
            <div className="ap-brand-icon">M</div>
            <div>
              <div className="ap-brand-name">MedInsure</div>
              <div className="ap-brand-sub">Blockchain Health Insurance</div>
            </div>
          </div>
          <div className="ap-topbar-right">
            <span className="ap-wallet">
              {account ? `${account.slice(0, 6)}...${account.slice(-4)}` : "Not Connected"}
            </span>
            <button className="ap-back-btn" onClick={() => navigate("/insurer")}>
              Back to Dashboard
            </button>
          </div>
        </nav>

        {/* HERO */}
        <div className="ap-hero">
          <div className="ap-hero-inner">
            <div className="ap-section-label">Patient Management</div>
            <h1>Patient Approvals</h1>
            <p>Review KYC submissions and approve or reject patient registrations.</p>
          </div>
        </div>

        <div className="ap-main">

          {/* MESSAGES */}
          {actionMsg && <div className="ap-success">{actionMsg}</div>}
          {error      && <div className="ap-error">{error}</div>}

          {/* STATS */}
          <div className="ap-stats">
            {Object.entries(counts).map(([key, val]) => {
              const cfg = statConfig[key];
              return (
                <div
                  key={key}
                  className={`ap-stat-card${filter === key ? " active" : ""}`}
                  style={{
                    borderColor: cfg.border,
                    background: filter === key ? cfg.bg : "#fff",
                  }}
                  onClick={() => setFilter(key)}
                >
                  <div className="ap-stat-num" style={{ color: cfg.color }}>{val}</div>
                  <div className="ap-stat-lbl">{key}</div>
                </div>
              );
            })}
          </div>

          {/* TABLE */}
          <div className="ap-table-card">
            <div className="ap-table-top">
              <div className="ap-table-top-left">
                <span className="ap-table-title">Patient Registrations</span>
                <span className="ap-count-pill">{filtered.length} shown</span>
              </div>
              <div className="ap-search-row">
                <input
                  className="ap-search"
                  type="text"
                  placeholder="Search name, mobile, email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <button className="ap-refresh-btn" onClick={loadPatients}>Refresh</button>
              </div>
            </div>

            {loading ? (
              <div className="ap-empty">Loading patient records...</div>
            ) : filtered.length === 0 ? (
              <div className="ap-empty">
                {patients.length === 0 ? "No patient registrations yet." : "No results found for your search."}
              </div>
            ) : (
              <div className="ap-table-wrap">
                <table className="ap-table">
                  <thead>
                    <tr>
                      {["ID","Name","DOB","Gender","Mobile","Email","OTP","Status","Actions"].map((h) => (
                        <th key={h} className="ap-th">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((p, i) => (
                      <tr key={i} className={i % 2 === 0 ? "ap-row-even" : "ap-row-odd"}>
                        <td className="ap-td">#{p.patientId.toString()}</td>
                        <td className="ap-td bold">
                          <div className="ap-name-cell">
                            <div className="ap-avatar">{p.name.charAt(0).toUpperCase()}</div>
                            {p.name}
                          </div>
                        </td>
                        <td className="ap-td">{p.dob}</td>
                        <td className="ap-td">{p.gender}</td>
                        <td className="ap-td">{p.mobile}</td>
                        <td className="ap-td">{p.email}</td>
                        <td className="ap-td">
                          <span className={`ap-pill ${p.otpVerified ? "ap-otp-yes" : "ap-otp-no"}`}>
                            {p.otpVerified ? "Verified" : "Not Verified"}
                          </span>
                        </td>
                        <td className="ap-td">
                          <span className={`ap-pill ${
                            p.status === "Approved" ? "ap-s-approved"
                            : p.status === "Rejected" ? "ap-s-rejected"
                            : "ap-s-pending"
                          }`}>
                            {p.status}
                          </span>
                        </td>
                        <td className="ap-td">
                          {p.status === "Pending" ? (
                            <div className="ap-action-btns">
                              <button className="ap-approve-btn" onClick={() => approvePatient(p.walletAddress)}>
                                Approve
                              </button>
                              <button className="ap-reject-btn" onClick={() => rejectPatient(p.walletAddress)}>
                                Reject
                              </button>
                            </div>
                          ) : (
                            <span className="ap-done-lbl">{p.status}</span>
                          )}
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

export default ApprovePatient;