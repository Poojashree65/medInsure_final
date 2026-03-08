import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ClaimContract from "../../contracts/ClaimContract.json";

const CLAIM_CONTRACT_ADDRESS = "0x97350Ee0A9168089aCEf311F71A7B32141f4c21C";

function ManageClaims({ account, web3 }) {
  const navigate = useNavigate();
  const [claims, setClaims]             = useState([]);
  const [loading, setLoading]           = useState(true);
  const [filter, setFilter]             = useState("Pending");
  const [selected, setSelected]         = useState(null);
  const [rejecting, setRejecting]       = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [processing, setProcessing]     = useState(false);
  const [error, setError]               = useState("");
  const [success, setSuccess]           = useState("");

  useEffect(() => { if (web3 && account) loadClaims(); }, [web3, account]);

  const loadClaims = async () => {
    try {
      setLoading(true);
      const contract = new web3.eth.Contract(ClaimContract.abi, CLAIM_CONTRACT_ADDRESS);
      const ids = await contract.methods.getAllClaims().call();
      const list = [];
      for (let id of ids) {
        const c = await contract.methods.getClaim(id).call();
        list.push(c);
      }
      setClaims(list.reverse());
      setLoading(false);
    } catch (err) { setError("Error: " + err.message); setLoading(false); }
  };

  const handleApprove = async (claimId) => {
    setProcessing(true); setError(""); setSuccess("");
    try {
      const contract = new web3.eth.Contract(ClaimContract.abi, CLAIM_CONTRACT_ADDRESS);
      const balance = await contract.methods.getContractBalance().call();
      const claim   = claims.find(c => c.claimId.toString() === claimId.toString());
      if (Number(balance) < Number(claim.insurerPays)) {
        setError("Insufficient contract funds. Go to Fund Management to deposit ETH.");
        setProcessing(false); return;
      }
      await contract.methods.approveClaim(claimId).send({ from: account });
      setSuccess("Claim #" + claimId + " approved. ETH transferred to hospital.");
      setSelected(null);
      loadClaims();
    } catch (err) { setError("Error: " + err.message); }
    setProcessing(false);
  };

  const handleReject = async (claimId) => {
    if (!rejectReason.trim()) { setError("Please enter a rejection reason."); return; }
    setProcessing(true); setError(""); setSuccess("");
    try {
      const contract = new web3.eth.Contract(ClaimContract.abi, CLAIM_CONTRACT_ADDRESS);
      await contract.methods.rejectClaim(claimId, rejectReason).send({ from: account });
      setSuccess("Claim #" + claimId + " rejected.");
      setSelected(null); setRejecting(false); setRejectReason("");
      loadClaims();
    } catch (err) { setError("Error: " + err.message); }
    setProcessing(false);
  };

  const formatDate = (ts) => ts === "0" || ts === 0 ? "—" : new Date(Number(ts) * 1000).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  const formatETH  = (wei) => parseFloat(web3.utils.fromWei(wei.toString(), "ether")).toFixed(4);

  const statusCls = (s) => ({
    AwaitingConfirmation: "mc-s-awaiting",
    Pending:  "mc-s-pending",
    Approved: "mc-s-approved",
    Rejected: "mc-s-rejected",
    Cancelled:"mc-s-cancelled",
  }[s] || "mc-s-pending");

  const statusLabel = (s) => ({
    AwaitingConfirmation: "Awaiting Patient",
    Pending:   "Pending Review",
    Approved:  "Approved",
    Rejected:  "Rejected",
    Cancelled: "Cancelled",
  }[s] || s);

  const counts = {
    All:      claims.length,
    Pending:  claims.filter(c => c.status === "Pending").length,
    Approved: claims.filter(c => c.status === "Approved").length,
    Rejected: claims.filter(c => c.status === "Rejected").length,
    AwaitingConfirmation: claims.filter(c => c.status === "AwaitingConfirmation").length,
  };

  const filtered = filter === "All" ? claims : claims.filter(c => c.status === filter);

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .mc-page { min-height: 100vh; background: #f4f7fc; font-family: 'Arial', sans-serif; color: #1a237e; }

        /* TOPBAR */
        .mc-topbar { display: flex; align-items: center; justify-content: space-between; padding: 0 36px; height: 68px; background: #fff; border-bottom: 1px solid #dde3ef; position: sticky; top: 0; z-index: 100; }
        .mc-brand { display: flex; align-items: center; gap: 10px; }
        .mc-brand-icon { width: 36px; height: 36px; background: #1565c0; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 16px; font-weight: 900; }
        .mc-brand-name { font-size: 18px; font-weight: 800; color: #1a237e; line-height: 1.2; }
        .mc-brand-sub  { font-size: 10px; color: #8fa0c0; letter-spacing: 0.5px; }
        .mc-topbar-right { display: flex; align-items: center; gap: 10px; }
        .mc-wallet { font-size: 12px; color: #5a6a88; background: #f4f7fc; border: 1px solid #dde3ef; padding: 6px 14px; border-radius: 6px; }
        .mc-fund-btn { padding: 8px 16px; background: #1565c0; color: #fff; border: none; border-radius: 6px; font-size: 13px; font-weight: 700; cursor: pointer; font-family: 'Arial', sans-serif; transition: background 0.2s; }
        .mc-fund-btn:hover { background: #0d47a1; }
        .mc-back-btn { padding: 8px 18px; background: #fff; color: #1565c0; border: 2px solid #1565c0; border-radius: 6px; font-size: 13px; font-weight: 700; cursor: pointer; font-family: 'Arial', sans-serif; transition: all 0.2s; }
        .mc-back-btn:hover { background: #1565c0; color: #fff; }

        /* HERO */
        .mc-hero { background: #fff; border-bottom: 1px solid #dde3ef; padding: 36px 36px 32px; }
        .mc-hero-inner { max-width: 1400px; margin: 0 auto; }
        .mc-section-label { display: inline-block; background: #e3eaf5; color: #1565c0; padding: 4px 12px; border-radius: 3px; font-size: 11px; font-weight: 800; letter-spacing: 1.2px; text-transform: uppercase; margin-bottom: 10px; }
        .mc-hero h1 { font-size: 28px; font-weight: 700; color: #0d1b35; font-family: 'Georgia', serif; margin-bottom: 6px; }
        .mc-hero p  { font-size: 14px; color: #5a6a88; line-height: 1.7; }

        /* MAIN */
        .mc-main { max-width: 1400px; margin: 0 auto; padding: 36px 36px 64px; }
        .mc-success { background: #e8f5e9; color: #2e7d32; border: 1px solid #a5d6a7; border-radius: 7px; padding: 12px 18px; font-size: 13px; margin-bottom: 24px; font-weight: 600; }
        .mc-error   { background: #fdf2f2; color: #c62828; border: 1px solid #ef9a9a; border-radius: 7px; padding: 12px 18px; font-size: 13px; margin-bottom: 24px; font-weight: 600; }

        /* STATS */
        .mc-stats { display: flex; gap: 16px; margin-bottom: 28px; flex-wrap: wrap; }
        .mc-stat-card { background: #fff; border: 1px solid #dde3ef; border-radius: 10px; padding: 18px 24px; min-width: 120px; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.04); }
        .mc-stat-num { font-size: 26px; font-weight: 900; font-family: 'Arial', sans-serif; line-height: 1; margin-bottom: 5px; }
        .mc-stat-lbl { font-size: 11px; color: #5a6a88; font-weight: 600; letter-spacing: 0.3px; }

        /* FILTER */
        .mc-filter-row { display: flex; gap: 8px; margin-bottom: 24px; flex-wrap: wrap; }
        .mc-filter-btn { padding: 7px 18px; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 600; border: 2px solid #dde3ef; background: #fff; color: #5a6a88; font-family: 'Arial', sans-serif; transition: all 0.2s; }
        .mc-filter-btn.active { background: #1565c0; color: #fff; border-color: #1565c0; }

        /* TABLE CARD */
        .mc-table-card { background: #fff; border: 1px solid #dde3ef; border-radius: 14px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.05); }
        .mc-table-top { display: flex; align-items: center; justify-content: space-between; padding: 20px 28px; border-bottom: 1px solid #dde3ef; }
        .mc-table-title { font-size: 16px; font-weight: 700; color: #0d1b35; font-family: 'Georgia', serif; }
        .mc-refresh-btn { padding: 8px 14px; background: #f4f7fc; border: 1px solid #dde3ef; border-radius: 7px; font-size: 13px; font-weight: 700; color: #1565c0; cursor: pointer; font-family: 'Arial', sans-serif; transition: background 0.2s; }
        .mc-refresh-btn:hover { background: #e3eaf5; }
        .mc-table-wrap { overflow-x: auto; }
        .mc-table { width: 100%; border-collapse: collapse; }
        .mc-th { background: #f4f7fc; padding: 12px 16px; text-align: left; font-size: 11px; font-weight: 800; color: #5a6a88; text-transform: uppercase; letter-spacing: 0.8px; border-bottom: 2px solid #dde3ef; white-space: nowrap; }
        .mc-td { padding: 12px 16px; font-size: 13px; color: #3a4a6b; border-bottom: 1px solid #f0f4f8; white-space: nowrap; }
        .mc-td.bold  { font-weight: 700; color: #0d1b35; }
        .mc-td.blue  { font-weight: 700; color: #1565c0; }
        .mc-td.green { font-weight: 700; color: #2e7d32; }
        .mc-row-even { background: #fff; }
        .mc-row-odd  { background: #fafbfe; }

        /* STATUS PILLS */
        .mc-pill { display: inline-block; padding: 3px 10px; border-radius: 3px; font-size: 11px; font-weight: 700; letter-spacing: 0.3px; }
        .mc-s-awaiting  { background: #fff3e0; color: #e65100; }
        .mc-s-pending   { background: #e3eaf5; color: #1565c0; }
        .mc-s-approved  { background: #e8f5e9; color: #2e7d32; }
        .mc-s-rejected  { background: #fdf2f2; color: #c62828; }
        .mc-s-cancelled { background: #f0f0f0; color: #5a6a88; }

        /* VIEW BUTTON */
        .mc-view-btn { padding: 5px 12px; background: #e3eaf5; color: #1565c0; border: 1px solid #b0c4de; border-radius: 5px; font-size: 12px; font-weight: 700; cursor: pointer; font-family: 'Arial', sans-serif; transition: all 0.2s; }
        .mc-view-btn:hover { background: #1565c0; color: #fff; border-color: #1565c0; }

        .mc-empty { text-align: center; padding: 48px; color: #8fa0c0; font-size: 14px; }

        /* MODAL */
        .mc-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.45); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
        .mc-modal { background: #fff; border-radius: 14px; width: 100%; max-width: 600px; max-height: 90vh; overflow-y: auto; box-shadow: 0 24px 64px rgba(0,0,0,0.2); border: 1px solid #dde3ef; }
        .mc-modal-header { display: flex; justify-content: space-between; align-items: center; padding: 22px 28px; border-bottom: 1px solid #dde3ef; }
        .mc-modal-title { font-size: 18px; font-weight: 700; color: #0d1b35; font-family: 'Georgia', serif; }
        .mc-close-btn { width: 30px; height: 30px; border-radius: 6px; background: #f4f7fc; border: 1px solid #dde3ef; cursor: pointer; font-size: 14px; color: #5a6a88; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
        .mc-close-btn:hover { background: #1565c0; color: #fff; border-color: #1565c0; }
        .mc-modal-body { padding: 22px 28px; }
        .mc-row { display: flex; justify-content: space-between; padding: 9px 0; border-bottom: 1px solid #f0f4f8; }
        .mc-row-label { color: #5a6a88; font-size: 13px; font-weight: 700; }
        .mc-row-value { color: #0d1b35; font-size: 13px; max-width: 60%; text-align: right; }
        .mc-row-value.green { color: #2e7d32; font-weight: 800; }
        .mc-payout-box { background: #f4f7fc; border: 1px solid #dde3ef; border-radius: 8px; padding: 14px; margin: 14px 0; }
        .mc-payout-title { font-size: 13px; font-weight: 700; color: #1a237e; margin-bottom: 8px; font-family: 'Georgia', serif; }
        .mc-ipfs-link { display: block; text-align: center; margin-top: 14px; padding: 9px 20px; background: #1565c0; color: #fff; border-radius: 7px; text-decoration: none; font-size: 13px; font-weight: 700; font-family: 'Arial', sans-serif; transition: background 0.2s; }
        .mc-ipfs-link:hover { background: #0d47a1; }
        .mc-action-btns { display: flex; gap: 10px; margin-top: 18px; }
        .mc-approve-btn { flex: 1; background: #1565c0; color: #fff; padding: 12px; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 700; font-family: 'Arial', sans-serif; transition: background 0.2s; }
        .mc-approve-btn:hover:not(:disabled) { background: #0d47a1; }
        .mc-approve-btn:disabled { background: #b0bec5; cursor: not-allowed; }
        .mc-reject-outline { flex: 1; background: #fff; color: #c62828; padding: 12px; border: 2px solid #c62828; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 700; font-family: 'Arial', sans-serif; transition: all 0.2s; }
        .mc-reject-outline:hover { background: #c62828; color: #fff; }
        .mc-reject-btn { flex: 1; background: #c62828; color: #fff; padding: 12px; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 700; font-family: 'Arial', sans-serif; transition: background 0.2s; }
        .mc-reject-btn:hover:not(:disabled) { background: #b71c1c; }
        .mc-reject-btn:disabled { background: #b0bec5; cursor: not-allowed; }
        .mc-cancel-btn { flex: 1; background: #fff; color: #5a6a88; padding: 12px; border: 2px solid #dde3ef; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 700; font-family: 'Arial', sans-serif; transition: all 0.2s; }
        .mc-cancel-btn:hover { background: #f4f7fc; }
        .mc-reason-label { font-size: 12px; font-weight: 700; color: #3a4a6b; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 6px; margin-top: 16px; }
        .mc-reason-input { width: 100%; padding: 10px 14px; border: 1px solid #dde3ef; border-radius: 7px; font-size: 13px; color: #0d1b35; font-family: 'Arial', sans-serif; outline: none; min-height: 80px; resize: vertical; transition: border 0.2s; }
        .mc-reason-input:focus { border-color: #1565c0; }

        @media (max-width: 640px) {
          .mc-topbar { padding: 0 16px; }
          .mc-hero, .mc-main { padding-left: 16px; padding-right: 16px; }
          .mc-wallet { display: none; }
        }
      `}</style>

      <div className="mc-page">

        {/* TOPBAR */}
        <nav className="mc-topbar">
          <div className="mc-brand">
            <div className="mc-brand-icon">M</div>
            <div>
              <div className="mc-brand-name">MedInsure</div>
              <div className="mc-brand-sub">Blockchain Health Insurance</div>
            </div>
          </div>
          <div className="mc-topbar-right">
            <span className="mc-wallet">{account ? `${account.slice(0,6)}...${account.slice(-4)}` : "Not Connected"}</span>
            <button className="mc-fund-btn" onClick={() => navigate("/insurer/fund-management")}>Fund Management</button>
            <button className="mc-back-btn" onClick={() => navigate("/insurer")}>Back to Dashboard</button>
          </div>
        </nav>

        {/* HERO */}
        <div className="mc-hero">
          <div className="mc-hero-inner">
            <div className="mc-section-label">Claims Management</div>
            <h1>Manage Claims</h1>
            <p>Review pending claims, verify IPFS documents, and approve or reject submissions.</p>
          </div>
        </div>

        <div className="mc-main">
          {success && <div className="mc-success">{success}</div>}
          {error   && <div className="mc-error">{error}</div>}

          {/* STATS */}
          <div className="mc-stats">
            <div className="mc-stat-card"><div className="mc-stat-num" style={{color:"#1565c0"}}>{counts.All}</div><div className="mc-stat-lbl">Total Claims</div></div>
            <div className="mc-stat-card"><div className="mc-stat-num" style={{color:"#e65100"}}>{counts.AwaitingConfirmation}</div><div className="mc-stat-lbl">Awaiting Patient</div></div>
            <div className="mc-stat-card"><div className="mc-stat-num" style={{color:"#1565c0"}}>{counts.Pending}</div><div className="mc-stat-lbl">Pending Review</div></div>
            <div className="mc-stat-card"><div className="mc-stat-num" style={{color:"#2e7d32"}}>{counts.Approved}</div><div className="mc-stat-lbl">Approved</div></div>
            <div className="mc-stat-card"><div className="mc-stat-num" style={{color:"#c62828"}}>{counts.Rejected}</div><div className="mc-stat-lbl">Rejected</div></div>
          </div>

          {/* FILTER */}
          <div className="mc-filter-row">
            {[["All","All"],["Pending","Pending"],["AwaitingConfirmation","Awaiting"],["Approved","Approved"],["Rejected","Rejected"]].map(([key, label]) => (
              <button key={key} className={`mc-filter-btn${filter===key?" active":""}`} onClick={() => setFilter(key)}>
                {label} ({counts[key] || 0})
              </button>
            ))}
          </div>

          {/* TABLE */}
          <div className="mc-table-card">
            <div className="mc-table-top">
              <span className="mc-table-title">All Claims</span>
              <button className="mc-refresh-btn" onClick={loadClaims}>Refresh</button>
            </div>

            {loading ? <div className="mc-empty">Loading claims...</div>
            : filtered.length === 0 ? <div className="mc-empty">No claims found.</div>
            : (
              <div className="mc-table-wrap">
                <table className="mc-table">
                  <thead>
                    <tr>{["ID","Patient","Hospital","Treatment","Claimed","Insurer Pays","Date","Status","Action"].map(h => <th key={h} className="mc-th">{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {filtered.map((c, i) => (
                      <tr key={i} className={i%2===0?"mc-row-even":"mc-row-odd"}>
                        <td className="mc-td">#{c.claimId.toString()}</td>
                        <td className="mc-td bold">{c.patientName}</td>
                        <td className="mc-td">{c.hospitalName}</td>
                        <td className="mc-td">{c.treatmentName}</td>
                        <td className="mc-td blue">{formatETH(c.claimAmount)} ETH</td>
                        <td className="mc-td green">{formatETH(c.insurerPays)} ETH</td>
                        <td className="mc-td">{formatDate(c.submittedOn)}</td>
                        <td className="mc-td"><span className={`mc-pill ${statusCls(c.status)}`}>{statusLabel(c.status)}</span></td>
                        <td className="mc-td">
                          <button className="mc-view-btn" onClick={() => { setSelected(c); setRejecting(false); setRejectReason(""); }}>
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* DETAIL MODAL */}
        {selected && (
          <div className="mc-overlay" onClick={() => setSelected(null)}>
            <div className="mc-modal" onClick={e => e.stopPropagation()}>
              <div className="mc-modal-header">
                <div className="mc-modal-title">Claim #{selected.claimId.toString()}</div>
                <button className="mc-close-btn" onClick={() => setSelected(null)}>✕</button>
              </div>
              <div className="mc-modal-body">
                <ModalRow label="Patient"     value={selected.patientName} />
                <ModalRow label="Hospital"    value={selected.hospitalName} />
                <ModalRow label="Policy"      value={selected.policyName} />
                <ModalRow label="Treatment"   value={selected.treatmentName} />
                <ModalRow label="Date"        value={selected.treatmentDate} />
                <ModalRow label="Description" value={selected.description} />

                <div className="mc-payout-box">
                  <div className="mc-payout-title">Payout Breakdown</div>
                  <ModalRow label="Claim Amount" value={formatETH(selected.claimAmount) + " ETH"} />
                  <ModalRow label="Patient Pays" value={formatETH(selected.patientPays) + " ETH"} />
                  <ModalRow label="Insurer Pays" value={formatETH(selected.insurerPays) + " ETH"} green />
                </div>

                <ModalRow label="Submitted" value={formatDate(selected.submittedOn)} />
                <ModalRow label="Status"    value={statusLabel(selected.status)} />
                {selected.rejectionReason && <ModalRow label="Rejection" value={selected.rejectionReason} />}

                {selected.ipfsCID && (
                  <a href={"https://gateway.pinata.cloud/ipfs/" + selected.ipfsCID} target="_blank" rel="noreferrer" className="mc-ipfs-link">
                    View IPFS Documents
                  </a>
                )}

                {selected.status === "Pending" && !rejecting && (
                  <div className="mc-action-btns">
                    <button className="mc-approve-btn" onClick={() => handleApprove(selected.claimId)} disabled={processing}>
                      {processing ? "Processing..." : "Approve and Transfer ETH"}
                    </button>
                    <button className="mc-reject-outline" onClick={() => setRejecting(true)}>Reject</button>
                  </div>
                )}

                {selected.status === "Pending" && rejecting && (
                  <div>
                    <label className="mc-reason-label">Rejection Reason</label>
                    <textarea className="mc-reason-input" placeholder="Enter reason for rejection..." value={rejectReason} onChange={e => setRejectReason(e.target.value)} />
                    <div className="mc-action-btns">
                      <button className="mc-reject-btn" onClick={() => handleReject(selected.claimId)} disabled={processing}>
                        {processing ? "Processing..." : "Confirm Rejection"}
                      </button>
                      <button className="mc-cancel-btn" onClick={() => setRejecting(false)}>Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </>
  );
}

function ModalRow({ label, value, green }) {
  return (
    <div className="mc-row">
      <span className="mc-row-label">{label}</span>
      <span className={`mc-row-value${green ? " green" : ""}`}>{value}</span>
    </div>
  );
}

export default ManageClaims;