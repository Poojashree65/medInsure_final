import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import UserRegistry   from "../../contracts/UserRegistry.json";
import PolicyContract from "../../contracts/PolicyContract.json";

const USER_REGISTRY_ADDRESS   = "0xd9dce72Ad47519b83Bc8a65a8D2E442dA7a50851";
const POLICY_CONTRACT_ADDRESS = "0x658c5811c545A6753d9298d489344aEb055B902e";

function ViewSubscriptions({ account, web3 }) {
  const navigate = useNavigate();
  const [subscriptions, setSubscriptions]     = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [paymentHistory, setPaymentHistory]   = useState([]);
  const [loading, setLoading]                 = useState(true);
  const [historyLoading, setHistoryLoading]   = useState(false);
  const [error, setError]                     = useState("");
  const [search, setSearch]                   = useState("");
  const [filter, setFilter]                   = useState("All");
  const [showHistory, setShowHistory]         = useState(false);

  useEffect(() => { if (web3 && account) loadSubscriptions(); }, [web3, account]);

  const loadSubscriptions = async () => {
    try {
      setLoading(true); setError("");
      const userContract   = new web3.eth.Contract(UserRegistry.abi, USER_REGISTRY_ADDRESS);
      const policyContract = new web3.eth.Contract(PolicyContract.abi, POLICY_CONTRACT_ADDRESS);
      const allAddresses   = await userContract.methods.getAllPatients().call();
      const list = [];
      for (let addr of allAddresses) {
        try {
          const patient = await userContract.methods.getPatient(addr).call();
          const hasSub  = await policyContract.methods.checkActivePolicy(addr).call();
          if (hasSub) {
            const sub = await policyContract.methods.getSubscription(addr).call();
            if (sub && Number(sub.premiumAmount) > 0) {
              list.push({
                patientId: patient.patientId, patientName: patient.name,
                mobile: patient.mobile, email: patient.email,
                walletAddress: patient.walletAddress,
                policyId: sub.policyId, policyName: sub.policyName,
                premiumAmount: sub.premiumAmount, copayPercent: sub.copayPercent,
                deductible: sub.deductible, waitingPeriod: sub.waitingPeriod,
                totalPaid: sub.totalPaid, startDate: sub.startDate,
                endDate: sub.endDate, nextDueDate: sub.nextDueDate,
                monthsPaid: sub.monthsPaid,
                subscriptionStatus: sub.subscriptionStatus,
                paymentStatus: sub.paymentStatus,
              });
            }
          }
        } catch (innerErr) { console.warn("Skipping:", addr, innerErr.message); }
      }
      setSubscriptions(list); setLoading(false);
    } catch (err) { console.error(err); setError("Error: " + err.message); setLoading(false); }
  };

  const loadPaymentHistory = async (walletAddress, patientName) => {
    try {
      setHistoryLoading(true); setShowHistory(true); setSelectedPatient(patientName);
      const policyContract = new web3.eth.Contract(PolicyContract.abi, POLICY_CONTRACT_ADDRESS);
      const history = await policyContract.methods.getPaymentHistory(walletAddress).call();
      setPaymentHistory(history); setHistoryLoading(false);
    } catch (err) { console.error(err); setHistoryLoading(false); }
  };

  const formatDate = (ts) => new Date(Number(ts) * 1000).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  const formatETH  = (wei) => parseFloat(web3.utils.fromWei(wei.toString(), "ether")).toFixed(4);

  const filtered = subscriptions.filter((s) => {
    const matchSearch =
      s.patientName.toLowerCase().includes(search.toLowerCase()) ||
      s.policyName.toLowerCase().includes(search.toLowerCase()) ||
      s.mobile.includes(search) ||
      s.walletAddress.toLowerCase().includes(search.toLowerCase());
    return matchSearch && (filter === "All" || s.subscriptionStatus === filter);
  });

  const totalPremium = subscriptions.reduce((sum, s) => sum + Number(s.totalPaid), 0);
  const counts = {
    All:       subscriptions.length,
    Active:    subscriptions.filter((s) => s.subscriptionStatus === "Active").length,
    Suspended: subscriptions.filter((s) => s.subscriptionStatus === "Suspended").length,
    Expired:   subscriptions.filter((s) => s.subscriptionStatus === "Expired").length,
  };

  const subStatusClass = (s) => s === "Active" ? "vs-s-active" : s === "Suspended" ? "vs-s-suspended" : "vs-s-expired";
  const payStatusClass = (s) => s === "Paid" ? "vs-p-paid" : s === "Due" ? "vs-p-due" : "vs-p-overdue";

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .vs-page { min-height: 100vh; background: #f4f7fc; font-family: 'Arial', sans-serif; color: #1a237e; }
        .vs-topbar { display: flex; align-items: center; justify-content: space-between; padding: 0 36px; height: 68px; background: #fff; border-bottom: 1px solid #dde3ef; position: sticky; top: 0; z-index: 100; }
        .vs-brand { display: flex; align-items: center; gap: 10px; }
        .vs-brand-icon { width: 36px; height: 36px; background: #1565c0; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 16px; font-weight: 900; }
        .vs-brand-name { font-size: 18px; font-weight: 800; color: #1a237e; line-height: 1.2; }
        .vs-brand-sub  { font-size: 10px; color: #8fa0c0; letter-spacing: 0.5px; }
        .vs-topbar-right { display: flex; align-items: center; gap: 12px; }
        .vs-wallet { font-size: 12px; color: #5a6a88; background: #f4f7fc; border: 1px solid #dde3ef; padding: 6px 14px; border-radius: 6px; }
        .vs-back-btn { padding: 8px 18px; background: #fff; color: #1565c0; border: 2px solid #1565c0; border-radius: 6px; font-size: 13px; font-weight: 700; cursor: pointer; font-family: 'Arial', sans-serif; transition: all 0.2s; }
        .vs-back-btn:hover { background: #1565c0; color: #fff; }
        .vs-hero { background: #fff; border-bottom: 1px solid #dde3ef; padding: 36px 36px 32px; }
        .vs-hero-inner { max-width: 1500px; margin: 0 auto; }
        .vs-section-label { display: inline-block; background: #e3eaf5; color: #1565c0; padding: 4px 12px; border-radius: 3px; font-size: 11px; font-weight: 800; letter-spacing: 1.2px; text-transform: uppercase; margin-bottom: 10px; }
        .vs-hero h1 { font-size: 28px; font-weight: 700; color: #0d1b35; font-family: 'Georgia', serif; margin-bottom: 6px; }
        .vs-hero p  { font-size: 14px; color: #5a6a88; line-height: 1.7; }
        .vs-main { max-width: 1500px; margin: 0 auto; padding: 36px 36px 64px; }
        .vs-error { background: #fdf2f2; color: #c62828; border: 1px solid #ef9a9a; border-radius: 7px; padding: 12px 18px; font-size: 13px; margin-bottom: 24px; font-weight: 600; }
        .vs-stats { display: flex; gap: 16px; margin-bottom: 28px; flex-wrap: wrap; }
        .vs-stat-card { background: #fff; border: 1px solid #dde3ef; border-radius: 10px; padding: 20px 28px; min-width: 140px; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.04); }
        .vs-stat-num { font-size: 26px; font-weight: 900; font-family: 'Arial', sans-serif; line-height: 1; margin-bottom: 5px; }
        .vs-stat-lbl { font-size: 11px; color: #5a6a88; font-weight: 600; letter-spacing: 0.3px; }
        .vs-filter-row { display: flex; gap: 8px; margin-bottom: 24px; flex-wrap: wrap; }
        .vs-filter-btn { padding: 7px 18px; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 600; border: 2px solid #dde3ef; background: #fff; color: #5a6a88; font-family: 'Arial', sans-serif; transition: all 0.2s; }
        .vs-filter-btn.active { background: #1565c0; color: #fff; border-color: #1565c0; }
        .vs-table-card { background: #fff; border: 1px solid #dde3ef; border-radius: 14px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.05); }
        .vs-table-top { display: flex; align-items: center; justify-content: space-between; padding: 20px 28px; border-bottom: 1px solid #dde3ef; flex-wrap: wrap; gap: 12px; }
        .vs-table-top-left { display: flex; align-items: center; gap: 10px; }
        .vs-table-title { font-size: 16px; font-weight: 700; color: #0d1b35; font-family: 'Georgia', serif; }
        .vs-count-pill { background: #e3eaf5; color: #1565c0; padding: 3px 10px; border-radius: 3px; font-size: 11px; font-weight: 800; letter-spacing: 0.3px; }
        .vs-search-row { display: flex; gap: 8px; align-items: center; }
        .vs-search { padding: 8px 14px; border: 1px solid #dde3ef; border-radius: 7px; font-size: 13px; color: #0d1b35; font-family: 'Arial', sans-serif; width: 260px; outline: none; }
        .vs-search:focus { border-color: #1565c0; }
        .vs-refresh-btn { padding: 8px 14px; background: #f4f7fc; border: 1px solid #dde3ef; border-radius: 7px; font-size: 13px; font-weight: 700; color: #1565c0; cursor: pointer; font-family: 'Arial', sans-serif; transition: background 0.2s; }
        .vs-refresh-btn:hover { background: #e3eaf5; }
        .vs-table-wrap { overflow-x: auto; }
        .vs-table { width: 100%; border-collapse: collapse; }
        .vs-th { background: #f4f7fc; padding: 12px 14px; text-align: left; font-size: 11px; font-weight: 800; color: #5a6a88; text-transform: uppercase; letter-spacing: 0.8px; border-bottom: 2px solid #dde3ef; white-space: nowrap; }
        .vs-td { padding: 12px 14px; font-size: 13px; color: #3a4a6b; border-bottom: 1px solid #f0f4f8; white-space: nowrap; }
        .vs-td.bold  { font-weight: 700; color: #0d1b35; }
        .vs-td.blue  { font-weight: 700; color: #1565c0; }
        .vs-td.green { font-weight: 700; color: #2e7d32; }
        .vs-td.mono  { font-family: monospace; font-size: 12px; color: #5a6a88; }
        .vs-row-even { background: #fff; }
        .vs-row-odd  { background: #fafbfe; }
        .vs-name-cell { display: flex; align-items: center; gap: 9px; }
        .vs-avatar { width: 30px; height: 30px; border-radius: 50%; background: #1565c0; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; flex-shrink: 0; }
        .vs-patient-name { font-weight: 700; color: #0d1b35; font-size: 13px; }
        .vs-patient-id   { font-size: 11px; color: #8fa0c0; margin-top: 1px; }
        .vs-policy-name  { font-weight: 700; color: #1565c0; font-size: 13px; }
        .vs-policy-id    { font-size: 11px; color: #8fa0c0; margin-top: 1px; }
        .vs-pill { display: inline-block; padding: 3px 10px; border-radius: 3px; font-size: 11px; font-weight: 700; letter-spacing: 0.3px; }
        .vs-months-pill  { background: #e3eaf5; color: #1565c0; }
        .vs-s-active     { background: #e8f5e9; color: #2e7d32; }
        .vs-s-suspended  { background: #fff3e0; color: #e65100; }
        .vs-s-expired    { background: #fdf2f2; color: #c62828; }
        .vs-p-paid       { background: #e8f5e9; color: #2e7d32; }
        .vs-p-due        { background: #fff3e0; color: #e65100; }
        .vs-p-overdue    { background: #fdf2f2; color: #c62828; }
        .vs-history-btn { padding: 5px 12px; background: #e3eaf5; color: #1565c0; border: 1px solid #b0c4de; border-radius: 5px; font-size: 12px; font-weight: 700; cursor: pointer; font-family: 'Arial', sans-serif; transition: all 0.2s; }
        .vs-history-btn:hover { background: #1565c0; color: #fff; border-color: #1565c0; }
        .vs-empty { text-align: center; padding: 48px; color: #8fa0c0; font-size: 14px; }
        .vs-modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.45); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
        .vs-modal { background: #fff; border-radius: 14px; width: 100%; max-width: 660px; max-height: 82vh; overflow-y: auto; box-shadow: 0 24px 64px rgba(0,0,0,0.2); border: 1px solid #dde3ef; }
        .vs-modal-header { display: flex; justify-content: space-between; align-items: flex-start; padding: 24px 28px 18px; border-bottom: 1px solid #dde3ef; }
        .vs-modal-title { font-size: 18px; font-weight: 700; color: #0d1b35; font-family: 'Georgia', serif; }
        .vs-modal-sub   { font-size: 13px; color: #5a6a88; margin-top: 3px; }
        .vs-close-btn { width: 30px; height: 30px; border-radius: 6px; background: #f4f7fc; border: 1px solid #dde3ef; cursor: pointer; font-size: 14px; color: #5a6a88; display: flex; align-items: center; justify-content: center; font-family: 'Arial', sans-serif; transition: all 0.2s; flex-shrink: 0; }
        .vs-close-btn:hover { background: #1565c0; color: #fff; border-color: #1565c0; }
        .vs-history-stats { display: flex; gap: 16px; padding: 16px 28px; border-bottom: 1px solid #dde3ef; }
        .vs-history-stat { flex: 1; background: #f4f7fc; border-radius: 8px; padding: 14px; text-align: center; border: 1px solid #dde3ef; }
        .vs-history-stat-num { font-size: 22px; font-weight: 900; font-family: 'Arial', sans-serif; margin-bottom: 4px; }
        .vs-history-stat-lbl { font-size: 11px; color: #5a6a88; font-weight: 600; }
        @media (max-width: 640px) {
          .vs-topbar { padding: 0 16px; }
          .vs-hero, .vs-main { padding-left: 16px; padding-right: 16px; }
          .vs-wallet { display: none; }
          .vs-search { width: 160px; }
        }
      `}</style>

      <div className="vs-page">

        <nav className="vs-topbar">
          <div className="vs-brand">
            <div className="vs-brand-icon">M</div>
            <div>
              <div className="vs-brand-name">MedInsure</div>
              <div className="vs-brand-sub">Blockchain Health Insurance</div>
            </div>
          </div>
          <div className="vs-topbar-right">
            <span className="vs-wallet">{account ? `${account.slice(0,6)}...${account.slice(-4)}` : "Not Connected"}</span>
            <button className="vs-back-btn" onClick={() => navigate("/insurer")}>Back to Dashboard</button>
          </div>
        </nav>

        <div className="vs-hero">
          <div className="vs-hero-inner">
            <div className="vs-section-label">Subscriptions</div>
            <h1>Policy Subscriptions</h1>
            <p>View all patients subscribed to policies with premium payment details.</p>
          </div>
        </div>

        <div className="vs-main">
          {error && <div className="vs-error">{error}</div>}

          <div className="vs-stats">
            <div className="vs-stat-card"><div className="vs-stat-num" style={{color:"#1565c0"}}>{subscriptions.length}</div><div className="vs-stat-lbl">Total Subscribers</div></div>
            <div className="vs-stat-card"><div className="vs-stat-num" style={{color:"#2e7d32"}}>{counts.Active}</div><div className="vs-stat-lbl">Active Policies</div></div>
            <div className="vs-stat-card"><div className="vs-stat-num" style={{color:"#e65100"}}>{counts.Suspended}</div><div className="vs-stat-lbl">Suspended</div></div>
            <div className="vs-stat-card"><div className="vs-stat-num" style={{color:"#1565c0"}}>{parseFloat(web3.utils.fromWei(totalPremium.toString(),"ether")).toFixed(4)} ETH</div><div className="vs-stat-lbl">Total Collected</div></div>
          </div>

          <div className="vs-filter-row">
            {Object.entries(counts).map(([key, val]) => (
              <button key={key} className={`vs-filter-btn${filter===key?" active":""}`} onClick={() => setFilter(key)}>
                {key} ({val})
              </button>
            ))}
          </div>

          <div className="vs-table-card">
            <div className="vs-table-top">
              <div className="vs-table-top-left">
                <span className="vs-table-title">Subscribed Patients</span>
                <span className="vs-count-pill">{filtered.length} shown</span>
              </div>
              <div className="vs-search-row">
                <input className="vs-search" type="text" placeholder="Search name, policy, mobile..." value={search} onChange={(e) => setSearch(e.target.value)} />
                <button className="vs-refresh-btn" onClick={loadSubscriptions}>Refresh</button>
              </div>
            </div>

            {loading ? <div className="vs-empty">Loading subscriptions...</div>
            : subscriptions.length === 0 ? <div className="vs-empty">No patients have subscribed yet.</div>
            : filtered.length === 0 ? <div className="vs-empty">No results found for your search.</div>
            : (
              <div className="vs-table-wrap">
                <table className="vs-table">
                  <thead>
                    <tr>{["Patient","Mobile","Wallet","Policy","Premium","Co-pay","Deductible","Total Paid","Months","Next Due","Payment","Status","History"].map((h) => <th key={h} className="vs-th">{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {filtered.map((s, i) => (
                      <tr key={i} className={i%2===0?"vs-row-even":"vs-row-odd"}>
                        <td className="vs-td">
                          <div className="vs-name-cell">
                            <div className="vs-avatar">{s.patientName.charAt(0).toUpperCase()}</div>
                            <div><div className="vs-patient-name">{s.patientName}</div><div className="vs-patient-id">#{s.patientId.toString()}</div></div>
                          </div>
                        </td>
                        <td className="vs-td">{s.mobile}</td>
                        <td className="vs-td mono">{s.walletAddress.substring(0,8)}...{s.walletAddress.slice(-4)}</td>
                        <td className="vs-td"><div className="vs-policy-name">{s.policyName}</div><div className="vs-policy-id">#{s.policyId.toString()}</div></td>
                        <td className="vs-td blue">{formatETH(s.premiumAmount)} ETH</td>
                        <td className="vs-td blue">{s.copayPercent.toString()}%</td>
                        <td className="vs-td">{formatETH(s.deductible)} ETH</td>
                        <td className="vs-td green">{formatETH(s.totalPaid)} ETH</td>
                        <td className="vs-td"><span className="vs-pill vs-months-pill">{s.monthsPaid.toString()} mo</span></td>
                        <td className="vs-td">{formatDate(s.nextDueDate)}</td>
                        <td className="vs-td"><span className={`vs-pill ${payStatusClass(s.paymentStatus)}`}>{s.paymentStatus}</span></td>
                        <td className="vs-td"><span className={`vs-pill ${subStatusClass(s.subscriptionStatus)}`}>{s.subscriptionStatus}</span></td>
                        <td className="vs-td"><button className="vs-history-btn" onClick={() => loadPaymentHistory(s.walletAddress, s.patientName)}>View History</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {showHistory && (
          <div className="vs-modal-overlay" onClick={() => setShowHistory(false)}>
            <div className="vs-modal" onClick={(e) => e.stopPropagation()}>
              <div className="vs-modal-header">
                <div>
                  <div className="vs-modal-title">Payment History</div>
                  <div className="vs-modal-sub">{selectedPatient}</div>
                </div>
                <button className="vs-close-btn" onClick={() => setShowHistory(false)}>✕</button>
              </div>
              {historyLoading ? <div className="vs-empty">Loading payment records...</div>
              : paymentHistory.length === 0 ? <div className="vs-empty">No payment records found.</div>
              : (
                <>
                  <div className="vs-history-stats">
                    <div className="vs-history-stat">
                      <div className="vs-history-stat-num" style={{color:"#2e7d32"}}>{paymentHistory.length}</div>
                      <div className="vs-history-stat-lbl">Payments Made</div>
                    </div>
                    <div className="vs-history-stat">
                      <div className="vs-history-stat-num" style={{color:"#1565c0"}}>{formatETH(paymentHistory.reduce((sum,p)=>sum+Number(p.amount),0))} ETH</div>
                      <div className="vs-history-stat-lbl">Total Received</div>
                    </div>
                  </div>
                  <div className="vs-table-wrap">
                    <table className="vs-table">
                      <thead><tr>{["Month","Amount (ETH)","Paid On","Status"].map((h)=><th key={h} className="vs-th">{h}</th>)}</tr></thead>
                      <tbody>
                        {paymentHistory.map((p,i)=>(
                          <tr key={i} className={i%2===0?"vs-row-even":"vs-row-odd"}>
                            <td className="vs-td bold">Month {p.monthNumber.toString()}</td>
                            <td className="vs-td green">{formatETH(p.amount)} ETH</td>
                            <td className="vs-td">{formatDate(p.paidOn)}</td>
                            <td className="vs-td"><span className="vs-pill vs-p-paid">{p.status}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

      </div>
    </>
  );
}

export default ViewSubscriptions;