import React, { useState, useEffect } from "react";

import { useNavigate } from "react-router-dom";

import ClaimContract from "../../contracts/ClaimContract.json";



const CLAIM_CONTRACT_ADDRESS = "0x71eF08435556B638e6086cBa29929CABDAa80eEA";



function FundManagement({ account, web3 }) {

  const navigate = useNavigate();

  const [balance, setBalance]         = useState("0");

  const [depositAmt, setDepositAmt]   = useState("");

  const [withdrawAmt, setWithdrawAmt] = useState("");

  const [loading, setLoading]         = useState(true);

  const [processing, setProcessing]   = useState(false);

  const [error, setError]             = useState("");

  const [success, setSuccess]         = useState("");

  const [claimStats, setClaimStats]   = useState({ total: 0, pending: 0, approved: 0, totalPaid: "0" });

  const [mlRecommendation, setMlRecommendation] = useState(null);



  const ETH_PRICE_USD = 2000; // 1 ETH = $2000



  useEffect(() => {

    if (web3 && account) loadData();

    fetchMLRecommendation();

  }, [web3, account]);



  const fetchMLRecommendation = async () => {

    try {

      const res  = await fetch("http://localhost:5001/api/forecast");

      const data = await res.json();

      const currentMonth = new Date().getMonth() + 1;

      const current = data.monthly.find(m => m.month === currentMonth) || data.monthly[0];

      const ethAmount = (current.total_reserve / ETH_PRICE_USD).toFixed(4);

      setMlRecommendation({

        usd:        current.total_reserve.toFixed(2),

        eth:        ethAmount,

        month_name: current.month_name,

        error_pct:  current.error_pct.toFixed(2),

      });

    } catch { /* API not running — silently skip */ }

  };



  const loadData = async () => {

    try {

      setLoading(true);

      const contract = new web3.eth.Contract(ClaimContract.abi, CLAIM_CONTRACT_ADDRESS);

      const bal = await contract.methods.getContractBalance().call();

      setBalance(bal);

      const ids = await contract.methods.getAllClaims().call();

      let pending = 0, approved = 0, totalPaid = 0;

      for (let id of ids) {

        const c = await contract.methods.getClaim(id).call();

        if (c.status === "Pending") pending++;

        if (c.status === "Approved") { approved++; totalPaid += Number(c.insurerPays); }

      }

      setClaimStats({ total: ids.length, pending, approved, totalPaid: totalPaid.toString() });

      setLoading(false);

    } catch (err) { setError("Error: " + err.message); setLoading(false); }

  };



  const handleDeposit = async () => {

    if (!depositAmt || isNaN(depositAmt) || Number(depositAmt) <= 0) { setError("Enter a valid deposit amount."); return; }

    setProcessing(true); setError(""); setSuccess("");

    try {

      const contract = new web3.eth.Contract(ClaimContract.abi, CLAIM_CONTRACT_ADDRESS);

      await contract.methods.depositFunds().send({ from: account, value: web3.utils.toWei(depositAmt, "ether") });

      setSuccess("Successfully deposited " + depositAmt + " ETH into the contract.");

      setDepositAmt(""); loadData();

    } catch (err) { setError("Error: " + err.message); }

    setProcessing(false);

  };



  const handleWithdraw = async () => {

    if (!withdrawAmt || isNaN(withdrawAmt) || Number(withdrawAmt) <= 0) { setError("Enter a valid withdrawal amount."); return; }

    setProcessing(true); setError(""); setSuccess("");

    try {

      const contract = new web3.eth.Contract(ClaimContract.abi, CLAIM_CONTRACT_ADDRESS);

      await contract.methods.withdrawFunds(web3.utils.toWei(withdrawAmt, "ether")).send({ from: account });

      setSuccess("Successfully withdrawn " + withdrawAmt + " ETH.");

      setWithdrawAmt(""); loadData();

    } catch (err) { setError("Error: " + err.message); }

    setProcessing(false);

  };



  const formatETH = (wei) => parseFloat(web3.utils.fromWei(wei.toString(), "ether")).toFixed(4);



  const balanceETH = formatETH(balance);

  const balanceNum = parseFloat(balanceETH);

  const alertLevel = balanceNum === 0 ? "critical" : balanceNum < 1 ? "warning" : balanceNum < 3 ? "monitor" : "normal";

  const alertInfo  = {

    normal:   { color: "#2e7d32", bg: "#e8f5e9", border: "#a5d6a7", dot: "#2e7d32", label: "Normal — Sufficient Funds" },

    monitor:  { color: "#e65100", bg: "#fff8e1", border: "#ffcc80", dot: "#f59e0b", label: "Monitor — Funds Getting Low" },

    warning:  { color: "#e65100", bg: "#fff3e0", border: "#ffb74d", dot: "#e65100", label: "Warning — Top Up Soon" },

    critical: { color: "#c62828", bg: "#fdf2f2", border: "#ef9a9a", dot: "#c62828", label: "Critical — Deposit ETH Now" },

  }[alertLevel];



  const healthRows = [

    { level: "Normal",   desc: "Balance above 3 ETH — all claims can be paid",    color: "#2e7d32" },

    { level: "Monitor",  desc: "Balance 1–3 ETH — consider topping up soon",       color: "#f59e0b" },

    { level: "Warning",  desc: "Balance below 1 ETH — top up immediately",         color: "#e65100" },

    { level: "Critical", desc: "Balance is 0 — claims cannot be approved",         color: "#c62828" },

  ];



  return (

    <>

      <style>{`

        * { box-sizing: border-box; margin: 0; padding: 0; }

        .fm-page { min-height: 100vh; background: #f4f7fc; font-family: 'Arial', sans-serif; color: #1a237e; }



        /* TOPBAR */

        .fm-topbar { display: flex; align-items: center; justify-content: space-between; padding: 0 36px; height: 68px; background: #fff; border-bottom: 1px solid #dde3ef; position: sticky; top: 0; z-index: 100; }

        .fm-brand { display: flex; align-items: center; gap: 10px; }

        .fm-brand-icon { width: 36px; height: 36px; background: #1565c0; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 16px; font-weight: 900; }

        .fm-brand-name { font-size: 18px; font-weight: 800; color: #1a237e; line-height: 1.2; }

        .fm-brand-sub  { font-size: 10px; color: #8fa0c0; letter-spacing: 0.5px; }

        .fm-topbar-right { display: flex; align-items: center; gap: 10px; }

        .fm-wallet { font-size: 12px; color: #5a6a88; background: #f4f7fc; border: 1px solid #dde3ef; padding: 6px 14px; border-radius: 6px; }

        .fm-claims-btn { padding: 8px 16px; background: #1565c0; color: #fff; border: none; border-radius: 6px; font-size: 13px; font-weight: 700; cursor: pointer; font-family: 'Arial', sans-serif; transition: background 0.2s; }

        .fm-claims-btn:hover { background: #0d47a1; }

        .fm-back-btn { padding: 8px 18px; background: #fff; color: #1565c0; border: 2px solid #1565c0; border-radius: 6px; font-size: 13px; font-weight: 700; cursor: pointer; font-family: 'Arial', sans-serif; transition: all 0.2s; }

        .fm-back-btn:hover { background: #1565c0; color: #fff; }



        /* HERO */

        .fm-hero { background: #fff; border-bottom: 1px solid #dde3ef; padding: 36px 36px 32px; }

        .fm-hero-inner { max-width: 1080px; margin: 0 auto; }

        .fm-section-label { display: inline-block; background: #e3eaf5; color: #1565c0; padding: 4px 12px; border-radius: 3px; font-size: 11px; font-weight: 800; letter-spacing: 1.2px; text-transform: uppercase; margin-bottom: 10px; }

        .fm-hero h1 { font-size: 28px; font-weight: 700; color: #0d1b35; font-family: 'Georgia', serif; margin-bottom: 6px; }

        .fm-hero p  { font-size: 14px; color: #5a6a88; line-height: 1.7; }



        /* MAIN */

        .fm-main { max-width: 1080px; margin: 0 auto; padding: 36px 36px 64px; }

        .fm-success { background: #e8f5e9; color: #2e7d32; border: 1px solid #a5d6a7; border-radius: 7px; padding: 12px 18px; font-size: 13px; margin-bottom: 24px; font-weight: 600; }

        .fm-error   { background: #fdf2f2; color: #c62828; border: 1px solid #ef9a9a; border-radius: 7px; padding: 12px 18px; font-size: 13px; margin-bottom: 24px; font-weight: 600; }

        .fm-loading { text-align: center; padding: 48px; color: #8fa0c0; font-size: 14px; }



        /* ALERT BANNER */

        .fm-alert { display: flex; align-items: center; gap: 14px; padding: 16px 20px; border-radius: 10px; border: 2px solid; margin-bottom: 28px; }

        .fm-alert-dot { width: 14px; height: 14px; border-radius: 50%; flex-shrink: 0; }

        .fm-alert-title { font-size: 14px; font-weight: 700; margin-bottom: 2px; }

        .fm-alert-sub   { font-size: 12px; color: #5a6a88; }



        /* STATS */

        .fm-stats { display: flex; gap: 16px; margin-bottom: 28px; flex-wrap: wrap; }

        .fm-stat-card { background: #fff; border: 1px solid #dde3ef; border-radius: 10px; padding: 18px 24px; min-width: 140px; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.04); flex: 1; }

        .fm-stat-num { font-size: 24px; font-weight: 900; font-family: 'Arial', sans-serif; line-height: 1; margin-bottom: 5px; }

        .fm-stat-lbl { font-size: 11px; color: #5a6a88; font-weight: 600; letter-spacing: 0.3px; }



        /* ACTION CARDS ROW */

        .fm-cards-row { display: flex; gap: 20px; margin-bottom: 24px; flex-wrap: wrap; }

        .fm-action-card { background: #fff; border: 1px solid #dde3ef; border-radius: 14px; padding: 28px; flex: 1; min-width: 280px; box-shadow: 0 2px 12px rgba(0,0,0,0.05); }

        .fm-card-title { font-size: 17px; font-weight: 700; color: #0d1b35; font-family: 'Georgia', serif; margin-bottom: 8px; }

        .fm-card-desc  { font-size: 13px; color: #5a6a88; margin-bottom: 20px; line-height: 1.6; }



        /* DIVIDER between cards */

        .fm-action-card + .fm-action-card { border-left: 3px solid #f4f7fc; }



        /* FORM */

        .fm-label { display: block; font-size: 11px; font-weight: 800; color: #3a4a6b; text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 6px; }

        .fm-input { width: 100%; padding: 10px 14px; border: 1px solid #dde3ef; border-radius: 7px; font-size: 13px; color: #0d1b35; font-family: 'Arial', sans-serif; outline: none; margin-bottom: 14px; transition: border 0.2s; }

        .fm-input:focus { border-color: #1565c0; }

        .fm-deposit-btn { width: 100%; background: #1565c0; color: #fff; padding: 12px; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 700; font-family: 'Arial', sans-serif; transition: background 0.2s; }

        .fm-deposit-btn:hover:not(:disabled) { background: #0d47a1; }

        .fm-deposit-btn:disabled { background: #b0bec5; cursor: not-allowed; }

        .fm-withdraw-btn { width: 100%; background: #fff; color: #c62828; padding: 12px; border: 2px solid #c62828; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 700; font-family: 'Arial', sans-serif; transition: all 0.2s; }

        .fm-withdraw-btn:hover:not(:disabled) { background: #c62828; color: #fff; }

        .fm-withdraw-btn:disabled { border-color: #b0bec5; color: #b0bec5; cursor: not-allowed; }

        .fm-quick-btns { display: flex; gap: 8px; margin-top: 12px; }

        .fm-quick-btn { flex: 1; background: #f4f7fc; border: 1px solid #dde3ef; padding: 7px; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 700; color: #1565c0; font-family: 'Arial', sans-serif; transition: all 0.2s; }

        .fm-quick-btn:hover { background: #e3eaf5; border-color: #1565c0; }

        .fm-avail { margin-top: 14px; font-size: 12px; color: #5a6a88; text-align: center; }



        /* INFO CARD */

        .fm-info-card { background: #fff; border: 1px solid #dde3ef; border-radius: 14px; padding: 28px; box-shadow: 0 2px 12px rgba(0,0,0,0.05); }

        .fm-health-row { display: flex; align-items: center; gap: 12px; padding: 12px 14px; background: #f4f7fc; border-radius: 7px; margin-bottom: 8px; border: 1px solid #dde3ef; }

        .fm-health-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }

        .fm-health-level { font-weight: 700; font-size: 13px; margin-bottom: 2px; }

        .fm-health-desc  { font-size: 12px; color: #5a6a88; }



        @media (max-width: 640px) {

          .fm-topbar { padding: 0 16px; }

          .fm-hero, .fm-main { padding-left: 16px; padding-right: 16px; }

          .fm-wallet { display: none; }

          .fm-cards-row { flex-direction: column; }

        }

      `}</style>



      <div className="fm-page">



        {/* TOPBAR */}

        <nav className="fm-topbar">

          <div className="fm-brand">

            <div className="fm-brand-icon">M</div>

            <div>

              <div className="fm-brand-name">MedInsure</div>

              <div className="fm-brand-sub">Blockchain Health Insurance</div>

            </div>

          </div>

          <div className="fm-topbar-right">

            <span className="fm-wallet">{account ? `${account.slice(0,6)}...${account.slice(-4)}` : "Not Connected"}</span>

            <button className="fm-claims-btn" onClick={() => navigate("/insurer/manage-claims")}>View Claims</button>

            <button className="fm-back-btn" onClick={() => navigate("/insurer")}>Back to Dashboard</button>

          </div>

        </nav>



        {/* HERO */}

        <div className="fm-hero">

          <div className="fm-hero-inner">

            <div className="fm-section-label">Finance</div>

            <h1>Fund Management</h1>

            <p>Deposit and withdraw ETH from the insurance pool. Maintain sufficient balance for claim payouts.</p>

          </div>

        </div>



        <div className="fm-main">

          {/* ML RECOMMENDATION BANNER */}

          {mlRecommendation && (

            <div style={{

              display:"flex", alignItems:"center", justifyContent:"space-between",

              background:"linear-gradient(135deg,#e3f2fd,#f3e5f5)",

              border:"2px solid #90caf9", borderRadius:"12px",

              padding:"16px 20px", marginBottom:"24px", gap:"16px", flexWrap:"wrap"

            }}>

              <div style={{display:"flex", alignItems:"center", gap:"12px"}}>

                <div style={{

                  width:"40px", height:"40px", borderRadius:"10px",

                  background:"#1565c0", color:"#fff", fontSize:"18px",

                  display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0

                }}>🤖</div>

                <div>

                  <div style={{fontSize:"13px", fontWeight:"800", color:"#1565c0", marginBottom:"3px"}}>

                    ML Recommendation — {mlRecommendation.month_name} 2026

                  </div>

                  <div style={{fontSize:"14px", color:"#0d1b35"}}>

                    Deposit <strong style={{color:"#1565c0"}}>{mlRecommendation.eth} ETH</strong>

                    <span style={{color:"#7a8aa8", fontSize:"12px", marginLeft:"6px"}}>

                      (≈ ${Number(mlRecommendation.usd).toLocaleString()} USD)

                    </span>

                    <span style={{

                      marginLeft:"10px", background:"#e8f5e9", color:"#2e7d32",

                      border:"1px solid #a5d6a7", borderRadius:"20px",

                      padding:"2px 10px", fontSize:"11px", fontWeight:"700"

                    }}>

                      {mlRecommendation.error_pct}% error

                    </span>

                  </div>

                  <div style={{fontSize:"11px", color:"#7a8aa8", marginTop:"2px"}}>

                    Based on XGBoost prediction (R² = 92.10%) — includes IBNR, RBNS & risk buffer

                  </div>

                </div>

              </div>

              <div style={{display:"flex", gap:"8px", flexShrink:0}}>

                <button style={{

                  background:"#1565c0", color:"#fff", border:"none",

                  padding:"9px 18px", borderRadius:"7px", fontSize:"12px",

                  fontWeight:"700", cursor:"pointer", fontFamily:"inherit"

                }} onClick={() => setDepositAmt(mlRecommendation.eth)}>

                  Use This Amount

                </button>

                <button style={{

                  background:"#fff", color:"#1565c0", border:"2px solid #1565c0",

                  padding:"9px 18px", borderRadius:"7px", fontSize:"12px",

                  fontWeight:"700", cursor:"pointer", fontFamily:"inherit"

                }} onClick={() => navigate("/insurer/fund-prediction")}>

                  View Full Forecast →

                </button>

              </div>

            </div>

          )}



          {success && <div className="fm-success">{success}</div>}

          {error   && <div className="fm-error">{error}</div>}



          {loading ? <div className="fm-loading">Loading fund data...</div> : (

            <>

              {/* ALERT BANNER */}

              <div className="fm-alert" style={{ backgroundColor: alertInfo.bg, borderColor: alertInfo.border }}>

                <div className="fm-alert-dot" style={{ backgroundColor: alertInfo.dot }} />

                <div>

                  <div className="fm-alert-title" style={{ color: alertInfo.color }}>{alertInfo.label}</div>

                  <div className="fm-alert-sub">Contract Balance: {balanceETH} ETH</div>

                </div>

              </div>



              {/* STATS */}

              <div className="fm-stats">

                <div className="fm-stat-card">

                  <div className="fm-stat-num" style={{ color: "#1565c0" }}>{balanceETH}</div>

                  <div className="fm-stat-lbl">Contract Balance (ETH)</div>

                </div>

                <div className="fm-stat-card">

                  <div className="fm-stat-num" style={{ color: "#1565c0" }}>{claimStats.total}</div>

                  <div className="fm-stat-lbl">Total Claims</div>

                </div>

                <div className="fm-stat-card">

                  <div className="fm-stat-num" style={{ color: "#e65100" }}>{claimStats.pending}</div>

                  <div className="fm-stat-lbl">Pending Claims</div>

                </div>

                <div className="fm-stat-card">

                  <div className="fm-stat-num" style={{ color: "#2e7d32" }}>{claimStats.approved}</div>

                  <div className="fm-stat-lbl">Approved Claims</div>

                </div>

                <div className="fm-stat-card">

                  <div className="fm-stat-num" style={{ color: "#c62828" }}>{formatETH(claimStats.totalPaid)}</div>

                  <div className="fm-stat-lbl">Total ETH Paid Out</div>

                </div>

              </div>



              {/* ACTION CARDS */}

              <div className="fm-cards-row">

                {/* DEPOSIT */}

                <div className="fm-action-card">

                  <div className="fm-card-title">Deposit ETH</div>

                  <div className="fm-card-desc">Add ETH to the contract pool so claims can be auto-paid on approval.</div>

                  <label className="fm-label">Amount (ETH)</label>

                  <input className="fm-input" type="number" placeholder="e.g. 5" min="0.001" step="0.001"

                    value={depositAmt} onChange={e => setDepositAmt(e.target.value)} />

                  <button className="fm-deposit-btn" onClick={handleDeposit} disabled={processing}>

                    {processing ? "Processing..." : "Deposit ETH"}

                  </button>

                  <div className="fm-quick-btns">

                    {["1","2","5","10"].map(amt => (

                      <button key={amt} className="fm-quick-btn" onClick={() => setDepositAmt(amt)}>{amt} ETH</button>

                    ))}

                  </div>

                </div>



                {/* WITHDRAW */}

                <div className="fm-action-card">

                  <div className="fm-card-title">Withdraw ETH</div>

                  <div className="fm-card-desc">Withdraw unused funds back to the insurer wallet.</div>

                  <label className="fm-label">Amount (ETH)</label>

                  <input className="fm-input" type="number" placeholder="e.g. 2" min="0.001" step="0.001"

                    value={withdrawAmt} onChange={e => setWithdrawAmt(e.target.value)} />

                  <button className="fm-withdraw-btn" onClick={handleWithdraw} disabled={processing}>

                    {processing ? "Processing..." : "Withdraw ETH"}

                  </button>

                  <div className="fm-avail">

                    Available to withdraw: <strong style={{ color: "#0d1b35" }}>{balanceETH} ETH</strong>

                  </div>

                </div>

              </div>



              {/* HEALTH GUIDE */}

              <div className="fm-info-card">

                <div className="fm-card-title" style={{ marginBottom: "16px" }}>Fund Health Guide</div>

                {healthRows.map(({ level, desc, color }) => (

                  <div key={level} className="fm-health-row">

                    <div className="fm-health-dot" style={{ backgroundColor: color }} />

                    <div>

                      <div className="fm-health-level" style={{ color }}>{level}</div>

                      <div className="fm-health-desc">{desc}</div>

                    </div>

                  </div>

                ))}

              </div>

            </>

          )}

        </div>



      </div>

    </>

  );

}



export default FundManagement;