import React, { useState, useEffect } from "react";

import { useNavigate } from "react-router-dom";

import PolicyContract from "../../contracts/PolicyContract.json";

import UserRegistry from "../../contracts/UserRegistry.json";



const POLICY_CONTRACT_ADDRESS = "0x9D176192efAc1BD6fe9d8Fac271E39E358A382ca";

const USER_REGISTRY_ADDRESS   = "0xf33Cb81168dF3bB94c1549bE9013b66eb058dDe9";



function SubscribePolicy({ account, web3 }) {

  const navigate = useNavigate();

  const [policies, setPolicies]                   = useState([]);

  const [loading, setLoading]                     = useState(true);

  const [subscribing, setSubscribing]             = useState(false);

  const [selectedPolicy, setSelectedPolicy]       = useState(null);

  const [alreadySubscribed, setAlreadySubscribed] = useState(false);

  const [patientApproved, setPatientApproved]     = useState(false);

  const [error, setError]                         = useState("");

  const [success, setSuccess]                     = useState("");



  useEffect(() => { if (web3 && account) loadData(); }, [web3, account]);



  const loadData = async () => {

    try {

      setLoading(true);

      const userContract = new web3.eth.Contract(UserRegistry.abi, USER_REGISTRY_ADDRESS);

      const isRegistered = await userContract.methods.checkPatientRegistered(account).call();

      if (!isRegistered) { setLoading(false); return; }

      const isApproved = await userContract.methods.checkPatientApproved(account).call();

      setPatientApproved(isApproved);

      const policyContract = new web3.eth.Contract(PolicyContract.abi, POLICY_CONTRACT_ADDRESS);

      const hasPolicy = await policyContract.methods.checkActivePolicy(account).call();

      setAlreadySubscribed(hasPolicy);

      if (hasPolicy) { setLoading(false); return; }

      const policyIds = await policyContract.methods.getAllPolicies().call();

      const policyList = [];

      for (let id of policyIds) {

        const p = await policyContract.methods.getPolicy(id).call();

        if (p.status === "Active") policyList.push(p);

      }

      setPolicies(policyList);

      setLoading(false);

    } catch (err) { console.error(err); setLoading(false); }

  };



  const handleSubscribe = async (policy) => {

    setSubscribing(true); setError(""); setSuccess("");

    try {

      const policyContract = new web3.eth.Contract(PolicyContract.abi, POLICY_CONTRACT_ADDRESS);

      await policyContract.methods.subscribePolicy(policy.policyId).send({ from: account, value: policy.premiumAmount });

      setSuccess("Successfully subscribed to " + policy.policyName + "! Redirecting...");

      setAlreadySubscribed(true);

      setTimeout(() => navigate("/patient/dashboard"), 2000);

    } catch (err) { setError("Error: " + err.message); }

    setSubscribing(false);

  };



  const CARD_ACCENTS = ["#1565c0", "#6a1b9a", "#2e7d32"];



  /* ── LOADING ── */

  if (loading) return (

    <div style={S.page}>

      <Topbar account={account} navigate={navigate} />

      <div style={S.stateWrap}>

        <div style={S.stateCard}>

          <div style={S.spinnerWrap}><div style={S.spinner} /></div>

          <div style={S.stateTitle}>Loading Policies</div>

          <div style={S.stateSub}>Fetching available health plans from the blockchain...</div>

        </div>

      </div>

    </div>

  );



  /* ── ALREADY SUBSCRIBED ── */

  if (alreadySubscribed && !success) return (

    <div style={S.page}>

      <Topbar account={account} navigate={navigate} />

      <div style={S.stateWrap}>

        <div style={S.stateCard}>

          <div style={{ ...S.stateIconCircle, background: "#e8f5e9" }}>

            <span style={{ color: "#2e7d32", fontSize: "28px" }}>✓</span>

          </div>

          <div style={{ ...S.stateTitle, color: "#2e7d32" }}>Already Subscribed</div>

          <div style={S.stateSub}>You already have an active health insurance policy.</div>

          <button style={S.btnPrimary} onClick={() => navigate("/patient/dashboard")}>View My Policy →</button>

        </div>

      </div>

    </div>

  );



  /* ── NOT APPROVED ── */

  if (!patientApproved) return (

    <div style={S.page}>

      <Topbar account={account} navigate={navigate} />

      <div style={S.stateWrap}>

        <div style={S.stateCard}>

          <div style={{ ...S.stateIconCircle, background: "#fff8e1" }}>

            <span style={{ color: "#e65100", fontSize: "28px" }}>⏳</span>

          </div>

          <div style={{ ...S.stateTitle, color: "#e65100" }}>Approval Pending</div>

          <div style={S.stateSub}>Your KYC application is under review. Please wait for insurer approval before subscribing to a policy.</div>

          <button style={S.btnGhost} onClick={() => navigate("/patient/dashboard")}>← Back to Dashboard</button>

        </div>

      </div>

    </div>

  );



  /* ── NO POLICIES ── */

  if (policies.length === 0) return (

    <div style={S.page}>

      <Topbar account={account} navigate={navigate} />

      <div style={S.stateWrap}>

        <div style={S.stateCard}>

          <div style={{ ...S.stateIconCircle, background: "#f4f7fc" }}>

            <span style={{ color: "#7a8aa8", fontSize: "28px" }}>—</span>

          </div>

          <div style={S.stateTitle}>No Policies Available</div>

          <div style={S.stateSub}>The insurer has not published any active health plans at this time. Please check back later.</div>

          <button style={S.btnGhost} onClick={() => navigate("/patient/dashboard")}>← Back to Dashboard</button>

        </div>

      </div>

    </div>

  );



  /* ── MAIN ── */

  return (

    <div style={S.page}>

      <Topbar account={account} navigate={navigate} />



      <div style={S.body}>

        {/* Page header */}

        <div style={S.pageHead}>

          <div style={S.secLabel}>HEALTH INSURANCE PLANS</div>

          <h1 style={S.pageTitle}>Available Health Plans</h1>

          <p style={S.pageSub}>Choose a plan that best fits your healthcare needs. Your first premium will be charged immediately on subscription.</p>

        </div>



        {/* Alerts */}

        {success && (

          <div style={S.alertGreen}>

            <div style={S.alertIconGreen}>✓</div>

            <span>{success}</span>

          </div>

        )}

        {error && (

          <div style={S.alertRed}>

            <div style={S.alertIconRed}>!</div>

            <span>{error}</span>

          </div>

        )}



        {/* Policy Cards */}

        <div style={S.cardGrid}>

          {policies.map((policy, index) => {

            const accent  = CARD_ACCENTS[index % CARD_ACCENTS.length];

            const premium = web3.utils.fromWei(policy.premiumAmount.toString(), "ether");

            const coverage = web3.utils.fromWei(policy.coverageLimit.toString(), "ether");

            const deductible = web3.utils.fromWei(policy.deductible.toString(), "ether");

            const isSelected = selectedPolicy?.policyId === policy.policyId;

            const isProcessing = subscribing && isSelected;



            return (

              <div key={index} style={{

                ...S.policyCard,

                border: isSelected ? `2px solid ${accent}` : "1px solid #dde3ef",

                boxShadow: isSelected ? `0 8px 32px rgba(0,0,0,0.12)` : "0 2px 12px rgba(0,0,0,0.05)",

                transform: isSelected ? "translateY(-4px)" : "none",

              }}>

                {/* Card header band */}

                <div style={{ ...S.cardBand, background: accent }}>

                  <div style={S.cardBandId}>Plan #{policy.policyId.toString()}</div>

                  <div style={S.cardBandName}>{policy.policyName}</div>

                  <div style={S.cardBandStatus}>Active</div>

                </div>



                {/* Premium */}

                <div style={S.premiumBox}>

                  <div style={{ ...S.premiumAmt, color: accent }}>{premium} ETH</div>

                  <div style={S.premiumLbl}>monthly premium</div>

                </div>



                {/* Key stats row */}

                <div style={S.statsRow}>

                  <div style={S.statItem}>

                    <div style={{ ...S.statVal, color: accent }}>{coverage} ETH</div>

                    <div style={S.statLbl}>Coverage</div>

                  </div>

                  <div style={S.statDivider} />

                  <div style={S.statItem}>

                    <div style={{ ...S.statVal, color: accent }}>{policy.copayPercent.toString()}%</div>

                    <div style={S.statLbl}>Co-pay</div>

                  </div>

                  <div style={S.statDivider} />

                  <div style={S.statItem}>

                    <div style={{ ...S.statVal, color: accent }}>{deductible} ETH</div>

                    <div style={S.statLbl}>Deductible</div>

                  </div>

                </div>



                {/* Detail rows */}

                <div style={S.detailsWrap}>

                  <DetailRow label="Validity"       value={policy.validityPeriod.toString() + " Year(s)"} />

                  <DetailRow label="Waiting Period" value={policy.waitingPeriod.toString() + " days"} />

                  <DetailRow label="Covered"        value={policy.covered} green />

                  <DetailRow label="Excluded"       value={policy.excluded} red />

                </div>



                {/* Subscribe button */}

                <div style={S.cardFooter}>

                  <button

                    style={{

                      ...S.subscribeBtn,

                      background: isProcessing ? "#90a4ae" : accent,

                      cursor: isProcessing ? "not-allowed" : "pointer",

                    }}

                    onClick={() => { setSelectedPolicy(policy); handleSubscribe(policy); }}

                    disabled={subscribing}

                  >

                    {isProcessing ? "Processing Payment..." : `Subscribe for ${premium} ETH →`}

                  </button>

                </div>

              </div>

            );

          })}

        </div>



        {/* Disclaimer */}

        <div style={S.disclaimer}>

          <span style={{ fontWeight: "700", color: "#5a6a88" }}>Note:</span> Premium payments are processed directly through Ethereum smart contracts. Ensure your wallet has sufficient ETH before subscribing. By subscribing, you agree to monthly premium auto-deduction.

        </div>

      </div>



      {/* Footer */}

      <div style={S.footer}>

        <span>© 2026 MedInsure</span>

        <span>Powered by Ethereum Blockchain and IPFS</span>

        <span>Patient Portal</span>

      </div>

    </div>

  );

}



/* ── Shared Topbar ── */

function Topbar({ account, navigate }) {

  return (

    <div style={S.topbar}>

      <div style={S.topbarBrand}>

        <div style={S.topbarLogo}>M</div>

        <div>

          <div style={S.topbarName}>MedInsure</div>

          <div style={S.topbarSub}>Blockchain Health Insurance</div>

        </div>

      </div>

      <div style={S.topbarCenter}>

        <span style={S.pageLabel}>Subscribe to a Health Plan</span>

      </div>

      <div style={S.topbarRight}>

        <div style={S.walletPill}>

          <div style={S.walletDot} />

          <span>{account.slice(0, 8)}...{account.slice(-6)}</span>

        </div>

        <button style={S.backBtn} onClick={() => navigate("/patient/dashboard")}>← Dashboard</button>

      </div>

    </div>

  );

}



/* ── Detail Row ── */

function DetailRow({ label, value, green, red }) {

  return (

    <div style={S.detailRow}>

      <span style={S.detailLbl}>{label}</span>

      <span style={{

        ...S.detailVal,

        color: green ? "#2e7d32" : red ? "#c62828" : "#0d1b35",

      }}>

        {value}

      </span>

    </div>

  );

}



/* ─── STYLES ─────────────────────────────────────────────────────── */

const S = {

  page: { background: "#f4f7fc", minHeight: "100vh", fontFamily: "'Arial', sans-serif", color: "#1a237e", display: "flex", flexDirection: "column" },



  /* topbar */

  topbar:       { background: "#fff", borderBottom: "1px solid #dde3ef", height: "68px", padding: "0 36px", display: "flex", alignItems: "center", gap: "16px", position: "sticky", top: 0, zIndex: 100, boxShadow: "0 1px 4px rgba(0,0,0,0.05)" },

  topbarBrand:  { display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 },

  topbarLogo:   { width: "38px", height: "38px", background: "#1565c0", borderRadius: "9px", color: "#fff", fontSize: "19px", fontWeight: "900", display: "flex", alignItems: "center", justifyContent: "center" },

  topbarName:   { fontSize: "16px", fontWeight: "800", color: "#1a237e", lineHeight: 1.2 },

  topbarSub:    { fontSize: "10px", color: "#8fa0c0", letterSpacing: "0.4px" },

  topbarCenter: { flex: 1, display: "flex", justifyContent: "center" },

  pageLabel:    { fontSize: "13px", fontWeight: "700", color: "#3a4a6b", background: "#eef3fb", padding: "6px 16px", borderRadius: "5px" },

  topbarRight:  { display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 },

  walletPill:   { display: "flex", alignItems: "center", gap: "7px", background: "#eef3fb", border: "1px solid #c5d5e8", borderRadius: "20px", padding: "6px 14px", fontSize: "12px", color: "#1a237e", fontWeight: "700" },

  walletDot:    { width: "8px", height: "8px", borderRadius: "50%", background: "#2e7d32", flexShrink: 0 },

  backBtn:      { background: "#fff", color: "#1565c0", border: "2px solid #1565c0", padding: "7px 16px", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontWeight: "700" },



  /* body */

  body:     { flex: 1, maxWidth: "1160px", width: "100%", margin: "0 auto", padding: "40px 24px 60px" },

  pageHead: { textAlign: "center", marginBottom: "36px" },

  secLabel: { display: "inline-block", background: "#e3eaf5", color: "#1565c0", padding: "4px 12px", borderRadius: "3px", fontSize: "11px", fontWeight: "800", letterSpacing: "1.2px", marginBottom: "10px" },

  pageTitle:{ fontSize: "28px", fontWeight: "700", color: "#0d1b35", margin: "0 0 8px", fontFamily: "'Georgia', serif" },

  pageSub:  { fontSize: "14px", color: "#7a8aa8", margin: 0, maxWidth: "520px", marginLeft: "auto", marginRight: "auto", lineHeight: 1.7 },



  /* alerts */

  alertGreen:    { display: "flex", alignItems: "center", gap: "10px", background: "#e8f5e9", border: "1px solid #a5d6a7", borderRadius: "8px", padding: "12px 16px", marginBottom: "24px", fontSize: "14px", color: "#2e7d32", fontWeight: "600" },

  alertRed:      { display: "flex", alignItems: "center", gap: "10px", background: "#ffebee", border: "1px solid #ef9a9a", borderRadius: "8px", padding: "12px 16px", marginBottom: "24px", fontSize: "14px", color: "#c62828", fontWeight: "600" },

  alertIconGreen:{ width: "22px", height: "22px", borderRadius: "50%", background: "#2e7d32", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: "900", flexShrink: 0 },

  alertIconRed:  { width: "22px", height: "22px", borderRadius: "50%", background: "#c62828", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: "900", flexShrink: 0 },



  /* policy card grid */

  cardGrid:   { display: "flex", justifyContent: "center", gap: "28px", flexWrap: "wrap", marginBottom: "36px" },

  policyCard: { background: "#fff", borderRadius: "14px", width: "340px", overflow: "hidden", transition: "all 0.25s", flexShrink: 0 },



  /* card band */

  cardBand:      { padding: "22px 24px 18px", textAlign: "center" },

  cardBandId:    { fontSize: "11px", color: "rgba(255,255,255,0.65)", fontWeight: "700", letterSpacing: "0.5px", marginBottom: "5px" },

  cardBandName:  { fontSize: "19px", fontWeight: "700", color: "#fff", marginBottom: "6px", fontFamily: "'Georgia', serif" },

  cardBandStatus:{ display: "inline-block", background: "rgba(255,255,255,0.2)", color: "#fff", fontSize: "10px", fontWeight: "800", padding: "3px 10px", borderRadius: "20px", letterSpacing: "0.5px" },



  /* premium */

  premiumBox: { textAlign: "center", padding: "20px 24px 16px", borderBottom: "1px solid #eef1f8" },

  premiumAmt: { fontSize: "30px", fontWeight: "900" },

  premiumLbl: { fontSize: "12px", color: "#8fa0c0", marginTop: "2px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px" },



  /* key stats */

  statsRow:    { display: "flex", padding: "16px 20px", borderBottom: "1px solid #eef1f8" },

  statItem:    { flex: 1, textAlign: "center" },

  statVal:     { fontSize: "16px", fontWeight: "800", marginBottom: "3px" },

  statLbl:     { fontSize: "10px", color: "#8fa0c0", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.4px" },

  statDivider: { width: "1px", background: "#eef1f8", margin: "0 4px" },



  /* detail rows */

  detailsWrap: { padding: "12px 20px" },

  detailRow:   { display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "8px 0", borderBottom: "1px solid #f4f7fc", gap: "12px" },

  detailLbl:   { fontSize: "11px", fontWeight: "800", color: "#8fa0c0", textTransform: "uppercase", letterSpacing: "0.4px", flexShrink: 0 },

  detailVal:   { fontSize: "13px", color: "#0d1b35", textAlign: "right", lineHeight: 1.4 },



  /* subscribe btn */

  cardFooter:   { padding: "16px 20px 20px" },

  subscribeBtn: { width: "100%", padding: "13px", border: "none", borderRadius: "8px", color: "#fff", fontSize: "14px", fontWeight: "700", letterSpacing: "0.3px", transition: "opacity 0.2s" },



  /* state screens */

  stateWrap:       { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 20px" },

  stateCard:       { background: "#fff", border: "1px solid #dde3ef", borderRadius: "16px", padding: "48px 40px", textAlign: "center", maxWidth: "420px", width: "100%", boxShadow: "0 2px 12px rgba(0,0,0,0.05)" },

  stateIconCircle: { width: "64px", height: "64px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" },

  stateTitle:      { fontSize: "20px", fontWeight: "700", color: "#0d1b35", marginBottom: "10px", fontFamily: "'Georgia', serif" },

  stateSub:        { fontSize: "14px", color: "#7a8aa8", lineHeight: 1.7, marginBottom: "24px" },

  spinnerWrap:     { display: "flex", justifyContent: "center", marginBottom: "20px" },

  spinner:         { width: "36px", height: "36px", border: "3px solid #eef1f8", borderTop: "3px solid #1565c0", borderRadius: "50%", animation: "spin 0.8s linear infinite" },



  /* buttons */

  btnPrimary: { width: "100%", padding: "13px", border: "none", borderRadius: "8px", background: "#1565c0", color: "#fff", fontSize: "14px", fontWeight: "700", cursor: "pointer", letterSpacing: "0.3px", marginBottom: "10px" },

  btnGhost:   { width: "100%", padding: "11px", border: "2px solid #dde3ef", borderRadius: "8px", background: "#fff", color: "#3a4a6b", fontSize: "13px", fontWeight: "700", cursor: "pointer", marginBottom: "10px" },



  /* disclaimer */

  disclaimer: { background: "#fff", border: "1px solid #dde3ef", borderRadius: "10px", padding: "14px 18px", fontSize: "13px", color: "#7a8aa8", lineHeight: 1.7, textAlign: "center", maxWidth: "760px", margin: "0 auto" },



  /* footer */

  footer: { borderTop: "1px solid #dde3ef", background: "#fff", padding: "16px 36px", display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#a0b0c8", flexWrap: "wrap", gap: "8px" },

};



export default SubscribePolicy;