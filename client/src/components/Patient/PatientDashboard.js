import React, { useState, useEffect } from "react";

import { useNavigate } from "react-router-dom";

import UserRegistry   from "../../contracts/UserRegistry.json";

import PolicyContract from "../../contracts/PolicyContract.json";

import ClaimContract  from "../../contracts/ClaimContract.json";



const USER_REGISTRY_ADDRESS   = "0xfAb58c1c5B6486aBb2324270948581D4E4C8322D";

const POLICY_CONTRACT_ADDRESS = "0x888C72Bd841cc9B61d1d07A07b244dad70ACA057";

const CLAIM_CONTRACT_ADDRESS  = "0xE84B25aAeE6Bd9efeD250f2327F1Ec47ed44d40e";



function PatientDashboard({ account, web3 }) {

  const navigate = useNavigate();

  const [patient, setPatient]               = useState(null);

  const [subscription, setSubscription]     = useState(null);

  const [paymentHistory, setPaymentHistory] = useState([]);

  const [claims, setClaims]                 = useState([]);

  const [loading, setLoading]               = useState(true);

  const [paying, setPaying]                 = useState(false);

  const [confirming, setConfirming]         = useState(false);

  const [notRegistered, setNotRegistered]   = useState(false);

  const [error, setError]                   = useState("");

  const [success, setSuccess]               = useState("");



  useEffect(() => { if (web3 && account) setTimeout(() => loadData(), 500); }, [web3, account]);



  const loadData = async () => {

    try {

      setLoading(true);

      const userContract = new web3.eth.Contract(UserRegistry.abi, USER_REGISTRY_ADDRESS);

      const isRegistered = await userContract.methods.checkPatientRegistered(account).call();

      if (!isRegistered) { setNotRegistered(true); setLoading(false); return; }

      const patientData = await userContract.methods.getPatient(account).call();

      setPatient(patientData);      const policyContract = new web3.eth.Contract(PolicyContract.abi, POLICY_CONTRACT_ADDRESS);

      const hasSub = await policyContract.methods.checkActivePolicy(account).call();

      if (hasSub) {
        const sub = await policyContract.methods.getSubscription(account).call();
        // Fetch policy to get deductible + copayPercentage (not in Subscription struct)
        const policy = await policyContract.methods.getPolicy(sub.policyId).call();
        setSubscription({ ...sub, deductible: policy.deductible, copayPercentage: policy.copayPercentage });
        const history = await policyContract.methods.getPaymentHistory(account).call();
        setPaymentHistory(history);
      }

      const claimContract = new web3.eth.Contract(ClaimContract.abi, CLAIM_CONTRACT_ADDRESS);

      const claimIds = await claimContract.methods.getPatientClaims(account).call();

      const claimList = [];

      for (let id of claimIds) {

        const c = await claimContract.methods.getClaim(id).call();

        claimList.push(c);

      }

      setClaims(claimList.reverse());

      setLoading(false);

    } catch (err) { console.error("Dashboard error:", err); setError("Failed to load dashboard data: " + (err?.message || String(err))); setLoading(false); }

  };



  const payMonthlyPremium = async () => {

    setPaying(true); setError(""); setSuccess("");

    try {

      const policyContract = new web3.eth.Contract(PolicyContract.abi, POLICY_CONTRACT_ADDRESS);

      await policyContract.methods.payMonthlyPremium().send({ from: account, value: subscription.premiumAmount });

      setSuccess("Monthly premium paid successfully!");

      setTimeout(() => loadData(), 1000);

    } catch (err) { setError("Error: " + err.message); }

    setPaying(false);

  };



  const handleConfirmClaim = async (claimId) => {

    setConfirming(true); setError(""); setSuccess("");

    try {

      const claimContract = new web3.eth.Contract(ClaimContract.abi, CLAIM_CONTRACT_ADDRESS);

      await claimContract.methods.confirmClaim(claimId).send({ from: account });

      setSuccess("Claim confirmed. The insurer will now review it.");

      loadData();

    } catch (err) { setError("Error: " + err.message); }

    setConfirming(false);

  };



  const handleCancelClaim = async (claimId) => {

    setConfirming(true); setError(""); setSuccess("");

    try {

      const claimContract = new web3.eth.Contract(ClaimContract.abi, CLAIM_CONTRACT_ADDRESS);

      await claimContract.methods.cancelClaim(claimId).send({ from: account });

      setSuccess("Claim cancelled successfully.");

      loadData();

    } catch (err) { setError("Error: " + err.message); }

    setConfirming(false);

  };



  const formatDate = (ts) => ts==="0"||ts===0?"—":new Date(Number(ts)*1000).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"});

  const formatETH  = (wei) => parseFloat(web3.utils.fromWei(wei.toString(),"ether")).toFixed(4);

  const getDaysUntilDue = () => {

    if (!subscription) return 0;

    const diff = Number(subscription.nextDueDate) - Date.now()/1000;

    return diff > 0 ? Math.ceil(diff/86400) : 0;

  };

  const getProgressPercent = () => {

    if (!subscription) return 0;

    const start=Number(subscription.startDate), end=Number(subscription.endDate), now=Date.now()/1000;

    return Math.min(100, Math.round(((now-start)/(end-start))*100));

  };



  const statusStyle = (s) => ({

    AwaitingConfirmation: { bg:"#fff8e1", color:"#e65100", border:"#ffe082" },

    Pending:              { bg:"#e3f2fd", color:"#1565c0", border:"#90caf9" },

    Approved:             { bg:"#e8f5e9", color:"#2e7d32", border:"#a5d6a7" },

    Rejected:             { bg:"#ffebee", color:"#c62828", border:"#ef9a9a" },

    Cancelled:            { bg:"#f5f5f5", color:"#616161", border:"#e0e0e0" },

  }[s] || { bg:"#f4f7fc", color:"#3a4a6b", border:"#dde3ef" });



  const statusLabel = (s) => ({

    AwaitingConfirmation: "Awaiting Your Confirmation",

    Pending:              "Pending Insurer Review",

    Approved:             "Approved",

    Rejected:             "Rejected",

    Cancelled:            "Cancelled",

  }[s] || s);



  const pendingConfirmation = claims.filter(c => c.status === "AwaitingConfirmation");



  if (loading) return (

    <div style={S.loadingPage}>

      <div style={S.loadingCard}>

        <div style={S.loadingLogo}>M</div>

        <div style={S.loadingTitle}>MedInsure</div>

        <div style={S.loadingSpinner} />

        <div style={S.loadingText}>Loading your dashboard...</div>

      </div>

    </div>

  );



  if (notRegistered) return (    <div style={S.page}>

      <div style={S.topbar}>

        <div style={S.topbarBrand}>

          <div style={S.topbarLogo}>M</div>

          <div>

            <div style={S.topbarName}>MedInsure</div>

            <div style={S.topbarSub}>Blockchain Health Insurance</div>

          </div>

        </div>

      </div>

      <div style={S.mainWrap}>

        <div style={S.notRegCard}>

          <div style={S.notRegIcon}>!</div>

          <h2 style={S.notRegTitle}>Not Registered Yet</h2>

          <p style={S.notRegDesc}>Complete your KYC registration to access your patient dashboard and health insurance benefits.</p>

          <button style={S.primaryBtn} onClick={() => navigate("/patient/register")}>Register Now →</button>

        </div>

      </div>

    </div>

  );



  if (!patient) return (

    <div style={S.page}>

      <div style={S.mainWrap}>

        {error && <div style={S.errorBanner}><div style={S.bannerIconRed}>!</div>{error}</div>}

        {!error && <div style={S.errorBanner}><div style={S.bannerIconRed}>!</div>Unable to load patient data. Please refresh.</div>}

      </div>

    </div>

  );



  const kycColors = ({

    Approved: { bg:"#e8f5e9", color:"#2e7d32", border:"#a5d6a7" },

    Rejected: { bg:"#ffebee", color:"#c62828", border:"#ef9a9a" },

    Pending:  { bg:"#fff8e1", color:"#e65100", border:"#ffe082" },

  }[patient.status]) || { bg:"#f4f7fc", color:"#3a4a6b", border:"#dde3ef" };



  const subColors = subscription ? ({

    Active:    { bg:"#e8f5e9", color:"#2e7d32", border:"#a5d6a7" },

    Suspended: { bg:"#fff8e1", color:"#e65100", border:"#ffe082" },

    Expired:   { bg:"#ffebee", color:"#c62828", border:"#ef9a9a" },

  }[subscription.subscriptionStatus] || {}) : {};



  const payStatus = subscription?.paymentStatus;



  return (

    <div style={S.page}>

      {/* TOPBAR */}

      <div style={S.topbar}>

        <div style={S.topbarBrand}>

          <div style={S.topbarLogo}>M</div>

          <div>

            <div style={S.topbarName}>MedInsure</div>

            <div style={S.topbarSub}>Blockchain Health Insurance</div>

          </div>

        </div>

        <div style={S.topbarCenter}>

          <span style={S.topbarPageLabel}>Patient Dashboard</span>

        </div>

        <div style={S.topbarRight}>

          <div style={S.walletPill}>

            <div style={S.walletDot} />

            <span style={S.walletAddr}>{account.slice(0,8)}...{account.slice(-6)}</span>

          </div>

          <button style={S.refreshBtn} onClick={loadData}>Refresh</button>

        </div>

      </div>



      <div style={S.mainWrap}>



        {/* PAGE HEADER */}

        <div style={S.pageHeader}>

          <div>

            <div style={S.secLabel}>PATIENT PORTAL</div>

            <h1 style={S.pageTitle}>Welcome, {patient.name}</h1>

            <p style={S.pageSubtitle}>Manage your health insurance policy, premiums and claims</p>

          </div>

        </div>



        {/* BANNERS */}

        {success && (

          <div style={S.successBanner}>

            <div style={S.bannerIconGreen}>✓</div>{success}

          </div>

        )}

        {error && (

          <div style={S.errorBanner}>

            <div style={S.bannerIconRed}>!</div>{error}

          </div>

        )}



        {/* CLAIM CONFIRMATION ALERT */}

        {pendingConfirmation.length > 0 && (

          <div style={S.alertCard}>

            <div style={S.alertIcon}>{pendingConfirmation.length}</div>

            <div style={{ flex: 1 }}>

              <div style={S.alertTitle}>Claim{pendingConfirmation.length > 1 ? "s" : ""} Awaiting Your Confirmation</div>

              <div style={S.alertDesc}>A hospital has submitted a claim on your behalf. Scroll to Claims to review and confirm or cancel.</div>

            </div>

          </div>

        )}



        {/* ROW 1 — Personal + Account Status */}

        <div style={S.twoCol}>

          {/* Personal Details */}

          <div style={S.card}>

            <div style={S.cardHeader}>

              <div style={S.cardHeaderIcon}>P</div>

              <div style={S.cardHeaderTitle}>Personal Details</div>

            </div>

            <div style={S.cardBody}>

              {[

                ["Name",     patient.name],

                ["DOB",      patient.dob],

                ["Gender",   patient.gender],

                ["Mobile",   patient.mobile],

                ["Email",    patient.email],

                ["Address",  patient.location],

                ["OTP",      patient.otpVerified ? "Verified" : "Not Verified"],

                ["Aadhaar",  "Verified"],

                ["Face KYC", "Verified"],

              ].map(([label, value], i) => (

                <InfoRow key={i} label={label} value={value}

                  highlight={["OTP","Aadhaar","Face KYC"].includes(label)} />

              ))}

            </div>

          </div>



          {/* Account Status */}

          <div style={S.card}>

            <div style={S.cardHeader}>

              <div style={{ ...S.cardHeaderIcon, background: "#1a237e" }}>S</div>

              <div style={S.cardHeaderTitle}>Account Status</div>

            </div>

            <div style={S.cardBody}>

              {/* KYC Status */}

              <div style={{ ...S.statusBox, background: kycColors.bg, border: `1.5px solid ${kycColors.border}`, marginBottom: "16px" }}>

                <div>

                  <div style={S.statusBoxLabel}>KYC Verification</div>

                  <div style={{ ...S.statusBoxValue, color: kycColors.color }}>{patient.status}</div>

                </div>

                <div style={{ ...S.statusDot, background: kycColors.color }} />

              </div>



              {patient.status === "Approved" && !subscription && (

                <div style={S.noPolicyBox}>

                  <p style={S.noPolicyText}>You do not have an active policy yet.</p>

                  <button style={S.primaryBtn} onClick={() => navigate("/patient/subscribe-policy")}>

                    Browse Health Plans →

                  </button>

                </div>

              )}



              {patient.status === "Approved" && subscription && (

                <div style={{ ...S.statusBox, background: subColors.bg, border: `1.5px solid ${subColors.border}` }}>

                  <div>

                    <div style={S.statusBoxLabel}>Active Policy</div>

                    <div style={{ ...S.statusBoxValue, color: subColors.color }}>{subscription.policyName}</div>

                    <div style={{ fontSize: "12px", color: "#7a8aa8", marginTop: "2px" }}>{subscription.subscriptionStatus}</div>

                  </div>

                  <div style={{ ...S.statusDot, background: subColors.color }} />

                </div>

              )}



              {patient.status === "Pending" && (

                <div style={{ background: "#fff8e1", border: "1px solid #ffe082", borderRadius: "8px", padding: "14px", marginTop: "8px" }}>

                  <p style={{ color: "#e65100", fontSize: "13px", lineHeight: 1.6, margin: 0 }}>Your KYC application is currently under review. You will be notified once it is approved.</p>

                </div>

              )}

              {patient.status === "Rejected" && (

                <div style={{ background: "#ffebee", border: "1px solid #ef9a9a", borderRadius: "8px", padding: "14px", marginTop: "8px" }}>

                  <p style={{ color: "#c62828", fontSize: "13px", margin: 0 }}>Your KYC was rejected. Please contact the insurer for assistance.</p>

                </div>

              )}

            </div>

          </div>

        </div>



        {/* ROW 2 — Policy + Payment (only if subscribed) */}

        {subscription && (

          <div style={S.twoCol}>

            {/* Policy Details */}

            <div style={S.card}>

              <div style={S.cardHeader}>

                <div style={{ ...S.cardHeaderIcon, background: "#6a1b9a" }}>◈</div>

                <div style={S.cardHeaderTitle}>My Policy</div>

                <div style={{ ...S.statusPill, background: subColors.bg, color: subColors.color, border: `1px solid ${subColors.border}`, marginLeft: "auto" }}>

                  {subscription.subscriptionStatus}

                </div>

              </div>

              <div style={S.cardBody}>

                {[

                  ["Policy ID",       "#" + subscription.policyId.toString()],

                  ["Policy Name",     subscription.policyName],

                  ["Monthly Premium", formatETH(subscription.premiumAmount) + " ETH"],

                  ["Total Paid",      formatETH(subscription.totalPaid) + " ETH"],

                  ["Months Paid",     subscription.monthsPaid.toString() + " months"],

                  ["Start Date",      formatDate(subscription.startDate)],

                  ["End Date",        formatDate(subscription.endDate)],

                  ["Co-pay",         subscription.copayPercentage.toString() + "% of claim"],

                  ["Deductible",      formatETH(subscription.deductible) + " ETH per claim"],

                  ["Waiting Period",  "N/A"],

                ].map(([label, value], i) => (

                  <InfoRow key={i} label={label} value={value} />

                ))}

                <div style={{ marginTop: "16px" }}>

                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#7a8aa8", marginBottom: "6px" }}>

                    <span style={{ fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.4px" }}>Policy Progress</span>

                    <span style={{ fontWeight: "700", color: "#1565c0" }}>{getProgressPercent()}%</span>

                  </div>

                  <div style={S.progressTrack}>

                    <div style={{ ...S.progressBar, width: getProgressPercent() + "%" }} />

                  </div>

                </div>

              </div>

            </div>



            {/* Monthly Payment */}

            <div style={S.card}>

              <div style={S.cardHeader}>

                <div style={{ ...S.cardHeaderIcon, background: "#1565c0" }}>₿</div>

                <div style={S.cardHeaderTitle}>Monthly Premium</div>

              </div>

              <div style={S.cardBody}>

                <div style={{

                  ...S.premiumBox,

                  background: payStatus === "Paid" ? "linear-gradient(135deg,#1b5e20,#2e7d32)" : payStatus === "Due" ? "linear-gradient(135deg,#e65100,#bf360c)" : "linear-gradient(135deg,#b71c1c,#c62828)",

                }}>

                  <div style={S.premiumAmount}>{formatETH(subscription.premiumAmount)} <span style={{ fontSize: "18px" }}>ETH</span></div>

                  <div style={S.premiumLabel}>Monthly Premium Amount</div>

                  <div style={S.premiumStatus}>

                    {payStatus === "Paid"

                      ? `Paid · Next due in ${getDaysUntilDue()} days`

                      : payStatus === "Due"

                      ? "Payment Due Now"

                      : "Payment Overdue — Policy Suspended"}

                  </div>

                  <div style={S.premiumDue}>Due Date: {formatDate(subscription.nextDueDate)}</div>

                </div>



                {subscription.subscriptionStatus !== "Expired" && (

                  <button

                    style={{

                      ...S.payBtn,

                      background: paying ? "#90a4ae" : payStatus === "Paid" ? "#1565c0" : "#c62828",

                      cursor: paying ? "not-allowed" : "pointer",

                    }}

                    onClick={payMonthlyPremium}

                    disabled={paying}

                  >

                    {paying

                      ? "Processing..."

                      : payStatus === "Paid"

                      ? `Pay Next Month (${getDaysUntilDue()} days left)`

                      : `Pay Now — ${formatETH(subscription.premiumAmount)} ETH`}

                  </button>

                )}



                {subscription.subscriptionStatus === "Expired" && (

                  <div style={{ background: "#ffebee", border: "1px solid #ef9a9a", borderRadius: "8px", padding: "14px", textAlign: "center", marginBottom: "16px" }}>

                    <p style={{ color: "#c62828", fontSize: "13px", margin: "0 0 10px" }}>Your policy has expired.</p>

                    <button style={S.primaryBtn} onClick={() => navigate("/patient/subscribe-policy")}>Browse New Plans →</button>

                  </div>

                )}



                <div style={S.miniStatsRow}>

                  {[

                    { label: "Months Paid",  value: subscription.monthsPaid.toString() },

                    { label: "ETH Paid",     value: formatETH(subscription.totalPaid) },

                    { label: "Months Left",  value: Math.max(0, Number(subscription.endDate)>Date.now()/1000 ? Math.ceil((Number(subscription.endDate)-Date.now()/1000)/2592000) : 0).toString() },

                  ].map((s, i) => (

                    <div key={i} style={S.miniStat}>

                      <div style={S.miniStatNum}>{s.value}</div>

                      <div style={S.miniStatLabel}>{s.label}</div>

                    </div>

                  ))}

                </div>

              </div>

            </div>

          </div>

        )}



        {/* PAYMENT HISTORY */}

        {subscription && (

          <div style={S.fullCard}>

            <div style={S.cardHeader}>

              <div style={{ ...S.cardHeaderIcon, background: "#0d47a1" }}>≡</div>

              <div style={S.cardHeaderTitle}>Payment History</div>

              <span style={S.tableCountBadge}>{paymentHistory.length} record{paymentHistory.length !== 1 ? "s" : ""}</span>

            </div>

            {paymentHistory.length === 0 ? (

              <div style={S.emptyState}>

                <div style={S.emptyText}>No payment history yet.</div>

              </div>

            ) : (

              <div style={S.tableWrap}>

                <table style={S.table}>

                  <thead>

                    <tr>{["Month", "Amount (ETH)", "Paid On", "Status"].map(h => <th key={h} style={S.th}>{h}</th>)}</tr>

                  </thead>

                  <tbody>

                    {paymentHistory.map((p, i) => (

                      <tr key={i} style={{ background: i%2===0?"#fff":"#fafbfe" }}>

                        <td style={{ ...S.td, color: "#1565c0", fontWeight: "700" }}>Month {p.monthNumber.toString()}</td>

                        <td style={{ ...S.td, color: "#2e7d32", fontWeight: "600" }}>{formatETH(p.amount)} ETH</td>

                        <td style={S.td}>{formatDate(p.paidOn)}</td>

                        <td style={S.td}>

                          <span style={{ ...S.pill, background:"#e8f5e9", color:"#2e7d32", border:"1px solid #a5d6a7" }}>{p.status}</span>

                        </td>

                      </tr>

                    ))}

                  </tbody>

                </table>

              </div>

            )}

          </div>

        )}



        {/* CLAIM HISTORY */}

        <div style={S.fullCard}>

          <div style={S.cardHeader}>

            <div style={{ ...S.cardHeaderIcon, background: "#1565c0" }}>C</div>

            <div style={S.cardHeaderTitle}>My Claims</div>

            <span style={S.tableCountBadge}>{claims.length} record{claims.length !== 1 ? "s" : ""}</span>

          </div>

          {claims.length === 0 ? (

            <div style={S.emptyState}>

              <div style={S.emptyText}>No claims submitted yet.</div>

            </div>

          ) : (

            <div style={S.tableWrap}>

              <table style={S.table}>

                <thead>

                  <tr>{["Claim #","Hospital","Treatment","Date","Claimed","Insurer Pays","Status","Action"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr>

                </thead>

                <tbody>

                  {claims.map((c, i) => {

                    const ss = statusStyle(c.status);

                    return (

                      <tr key={i} style={{ background: i%2===0?"#fff":"#fafbfe" }}>

                        <td style={{ ...S.td, color:"#1565c0", fontWeight:"700" }}>#{c.claimId.toString()}</td>

                        <td style={{ ...S.td, fontWeight:"700", color:"#0d1b35" }}>{c.hospitalName}</td>

                        <td style={S.td}>{c.treatmentName}</td>

                        <td style={S.td}>{c.treatmentDate}</td>

                        <td style={{ ...S.td, color:"#1565c0", fontWeight:"600" }}>{formatETH(c.claimAmount)} ETH</td>

                        <td style={{ ...S.td, color:"#2e7d32", fontWeight:"600" }}>{formatETH(c.insurerPays)} ETH</td>

                        <td style={S.td}>

                          <span style={{ ...S.pill, background:ss.bg, color:ss.color, border:`1px solid ${ss.border}` }}>

                            {statusLabel(c.status)}

                          </span>

                        </td>

                        <td style={S.td}>

                          {c.status === "AwaitingConfirmation" && (

                            <div style={{ display:"flex", gap:"6px" }}>

                              <button style={S.confirmBtn} onClick={() => handleConfirmClaim(c.claimId)} disabled={confirming}>Confirm</button>

                              <button style={S.cancelBtn}  onClick={() => handleCancelClaim(c.claimId)}  disabled={confirming}>Cancel</button>

                            </div>

                          )}

                          {c.status === "Rejected" && c.rejectionReason && (

                            <span style={{ fontSize:"11px", color:"#c62828" }}>Reason: {c.rejectionReason}</span>

                          )}

                          {c.status === "Approved" && (

                            <span style={{ fontSize:"11px", color:"#2e7d32", fontWeight:"700" }}>ETH Transferred</span>

                          )}

                        </td>

                      </tr>

                    );

                  })}

                </tbody>

              </table>

            </div>

          )}

        </div>



      </div>



      {/* FOOTER */}

      <div style={S.footer}>

        <span>© 2026 MedInsure</span>

        <span>Powered by Ethereum Blockchain and IPFS</span>

        <span>Patient Portal v1.0</span>

      </div>

    </div>

  );

}



function InfoRow({ label, value, highlight }) {

  return (

    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"9px 0", borderBottom:"1px solid #eef1f8" }}>

      <span style={{ color:"#7a8aa8", fontSize:"11px", fontWeight:"800", textTransform:"uppercase", letterSpacing:"0.4px", fontFamily:"'Arial', sans-serif" }}>{label}</span>

      <span style={{ color: highlight ? "#2e7d32" : "#0d1b35", fontSize:"13px", fontWeight:"500", fontFamily:"'Arial', sans-serif", textAlign:"right", maxWidth:"60%" }}>{value}</span>

    </div>

  );

}



const S = {

  // LOADING

  loadingPage: { minHeight:"100vh", background:"#f4f7fc", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Arial', sans-serif" },

  loadingCard: { background:"#fff", borderRadius:"16px", padding:"48px 56px", textAlign:"center", boxShadow:"0 8px 32px rgba(21,101,192,0.10)", border:"1px solid #dde3ef" },

  loadingLogo: { width:"52px", height:"52px", background:"#1565c0", borderRadius:"12px", color:"#fff", fontSize:"26px", fontWeight:"900", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 12px", fontFamily:"'Arial', sans-serif" },

  loadingTitle: { fontSize:"20px", fontWeight:"800", color:"#1a237e", marginBottom:"24px", fontFamily:"'Arial', sans-serif" },

  loadingSpinner: { width:"36px", height:"36px", border:"3px solid #e3eaf5", borderTop:"3px solid #1565c0", borderRadius:"50%", animation:"spin 0.8s linear infinite", margin:"0 auto 16px" },

  loadingText: { color:"#7a8aa8", fontSize:"14px", fontFamily:"'Arial', sans-serif" },



  page: { minHeight:"100vh", background:"#f4f7fc", fontFamily:"'Arial', sans-serif", color:"#1a237e" },



  // TOPBAR

  topbar: { background:"#fff", borderBottom:"1px solid #dde3ef", padding:"0 40px", height:"68px", display:"flex", alignItems:"center", gap:"24px", position:"sticky", top:0, zIndex:100, boxShadow:"0 1px 0 #dde3ef" },

  topbarBrand: { display:"flex", alignItems:"center", gap:"10px", flexShrink:0 },

  topbarLogo: { width:"38px", height:"38px", background:"#1565c0", borderRadius:"9px", color:"#fff", fontSize:"19px", fontWeight:"900", display:"flex", alignItems:"center", justifyContent:"center" },

  topbarName: { fontSize:"16px", fontWeight:"800", color:"#1a237e", lineHeight:1.2 },

  topbarSub: { fontSize:"10px", color:"#8fa0c0", letterSpacing:"0.4px" },

  topbarCenter: { flex:1, display:"flex", justifyContent:"center" },

  topbarPageLabel: { fontSize:"14px", fontWeight:"700", color:"#3a4a6b", background:"#eef3fb", padding:"6px 16px", borderRadius:"5px" },

  topbarRight: { display:"flex", alignItems:"center", gap:"12px", flexShrink:0 },

  walletPill: { display:"flex", alignItems:"center", gap:"7px", background:"#eef3fb", border:"1px solid #c5d5e8", borderRadius:"20px", padding:"6px 14px" },

  walletDot: { width:"8px", height:"8px", borderRadius:"50%", background:"#2e7d32", flexShrink:0 },

  walletAddr: { fontSize:"12px", color:"#1a237e", fontWeight:"700" },

  refreshBtn: { background:"#1565c0", color:"#fff", border:"none", padding:"8px 18px", borderRadius:"6px", cursor:"pointer", fontSize:"12px", fontWeight:"700", letterSpacing:"0.3px" },



  mainWrap: { maxWidth:"1160px", margin:"0 auto", padding:"36px 36px 60px" },



  // PAGE HEADER

  pageHeader: { marginBottom:"28px" },

  secLabel: { display:"inline-block", background:"#e3eaf5", color:"#1565c0", padding:"4px 12px", borderRadius:"3px", fontSize:"11px", fontWeight:"800", letterSpacing:"1.2px", marginBottom:"10px" },

  pageTitle: { fontSize:"28px", fontWeight:"700", color:"#0d1b35", margin:"0 0 6px", fontFamily:"'Georgia', serif" },

  pageSubtitle: { fontSize:"14px", color:"#7a8aa8", margin:0 },



  // BANNERS

  successBanner: { display:"flex", alignItems:"center", gap:"10px", background:"#e8f5e9", border:"1px solid #a5d6a7", borderRadius:"8px", padding:"14px 18px", marginBottom:"16px", fontSize:"14px", color:"#2e7d32", fontWeight:"600" },

  errorBanner:   { display:"flex", alignItems:"center", gap:"10px", background:"#ffebee", border:"1px solid #ef9a9a", borderRadius:"8px", padding:"14px 18px", marginBottom:"16px", fontSize:"14px", color:"#c62828", fontWeight:"600" },

  bannerIconGreen: { width:"22px", height:"22px", borderRadius:"50%", background:"#2e7d32", color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"12px", fontWeight:"900", flexShrink:0 },

  bannerIconRed:   { width:"22px", height:"22px", borderRadius:"50%", background:"#c62828", color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"12px", fontWeight:"900", flexShrink:0 },



  // ALERT

  alertCard: { display:"flex", alignItems:"center", gap:"14px", background:"#fff8e1", border:"1.5px solid #ffe082", borderRadius:"10px", padding:"16px 20px", marginBottom:"24px" },

  alertIcon: { width:"36px", height:"36px", borderRadius:"50%", background:"#e65100", color:"#fff", fontSize:"16px", fontWeight:"900", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 },

  alertTitle: { fontSize:"14px", fontWeight:"700", color:"#e65100", marginBottom:"3px" },

  alertDesc: { fontSize:"12px", color:"#7a8aa8" },



  // LAYOUT

  twoCol: { display:"grid", gridTemplateColumns:"1fr 1fr", gap:"20px", marginBottom:"20px" },



  // CARD

  card: { background:"#fff", borderRadius:"14px", border:"1px solid #dde3ef", boxShadow:"0 2px 12px rgba(0,0,0,0.05)", overflow:"hidden" },

  fullCard: { background:"#fff", borderRadius:"14px", border:"1px solid #dde3ef", boxShadow:"0 2px 12px rgba(0,0,0,0.05)", overflow:"hidden", marginBottom:"20px" },

  cardHeader: { display:"flex", alignItems:"center", gap:"12px", padding:"18px 24px", borderBottom:"1px solid #eef1f8", background:"#fafbfe" },

  cardHeaderIcon: { width:"34px", height:"34px", background:"#1565c0", borderRadius:"8px", color:"#fff", fontSize:"15px", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:"700", flexShrink:0 },

  cardHeaderTitle: { fontSize:"15px", fontWeight:"700", color:"#0d1b35", fontFamily:"'Georgia', serif" },

  cardBody: { padding:"20px 24px" },



  // STATUS BOX

  statusBox: { display:"flex", justifyContent:"space-between", alignItems:"center", padding:"14px 16px", borderRadius:"8px", marginBottom:"4px" },

  statusBoxLabel: { fontSize:"11px", fontWeight:"800", textTransform:"uppercase", letterSpacing:"0.5px", color:"#7a8aa8", marginBottom:"4px" },

  statusBoxValue: { fontSize:"15px", fontWeight:"700", fontFamily:"'Georgia', serif" },

  statusDot: { width:"10px", height:"10px", borderRadius:"50%", flexShrink:0 },

  statusPill: { fontSize:"11px", fontWeight:"700", padding:"4px 12px", borderRadius:"4px", letterSpacing:"0.3px", marginLeft:"auto" },



  // NO POLICY

  noPolicyBox: { background:"#f4f7fc", border:"1px solid #dde3ef", borderRadius:"8px", padding:"20px", textAlign:"center", marginTop:"12px" },

  noPolicyText: { color:"#5a6a88", fontSize:"13px", marginBottom:"12px", margin:"0 0 12px" },

  primaryBtn: { background:"#1565c0", color:"#fff", border:"none", padding:"11px 22px", borderRadius:"7px", cursor:"pointer", fontSize:"13px", fontWeight:"700", letterSpacing:"0.3px" },



  // PREMIUM BOX

  premiumBox: { borderRadius:"10px", padding:"22px", textAlign:"center", marginBottom:"16px" },

  premiumAmount: { fontSize:"32px", fontWeight:"900", color:"#fff", lineHeight:1, marginBottom:"6px" },

  premiumLabel: { fontSize:"12px", color:"rgba(255,255,255,0.65)", marginBottom:"10px" },

  premiumStatus: { fontSize:"13px", fontWeight:"700", color:"#fff", marginBottom:"4px" },

  premiumDue: { fontSize:"11px", color:"rgba(255,255,255,0.6)" },

  payBtn: { width:"100%", padding:"13px", border:"none", borderRadius:"8px", color:"#fff", fontWeight:"700", fontSize:"14px", marginBottom:"16px", letterSpacing:"0.3px" },



  // MINI STATS

  miniStatsRow: { display:"flex", gap:"10px" },

  miniStat: { flex:1, background:"#f4f7fc", border:"1px solid #dde3ef", borderRadius:"8px", padding:"12px", textAlign:"center" },

  miniStatNum: { fontSize:"20px", fontWeight:"900", color:"#1565c0" },

  miniStatLabel: { fontSize:"10px", color:"#7a8aa8", fontWeight:"700", textTransform:"uppercase", letterSpacing:"0.4px", marginTop:"3px" },



  // PROGRESS

  progressTrack: { height:"7px", background:"#e3eaf5", borderRadius:"10px", overflow:"hidden" },

  progressBar: { height:"100%", background:"linear-gradient(90deg,#1565c0,#42a5f5)", borderRadius:"10px", transition:"width 0.5s" },



  // TABLE

  tableCountBadge: { marginLeft:"auto", fontSize:"12px", color:"#8fa0c0", fontWeight:"600", background:"#eef3fb", padding:"3px 10px", borderRadius:"10px" },

  tableWrap: { overflowX:"auto" },

  table: { width:"100%", borderCollapse:"collapse" },

  th: { background:"#f4f7fc", padding:"12px 16px", textAlign:"left", fontSize:"11px", fontWeight:"800", color:"#7a8aa8", textTransform:"uppercase", letterSpacing:"0.6px", borderBottom:"2px solid #dde3ef", whiteSpace:"nowrap" },

  td: { padding:"12px 16px", fontSize:"13px", color:"#3a4a6b", borderBottom:"1px solid #eef1f8", whiteSpace:"nowrap" },

  pill: { padding:"4px 11px", borderRadius:"4px", fontSize:"11px", fontWeight:"700", letterSpacing:"0.3px" },

  confirmBtn: { background:"#1565c0", color:"#fff", border:"none", padding:"6px 12px", borderRadius:"5px", cursor:"pointer", fontSize:"12px", fontWeight:"700" },

  cancelBtn:  { background:"#fff", color:"#c62828", border:"1px solid #ef9a9a", padding:"6px 12px", borderRadius:"5px", cursor:"pointer", fontSize:"12px", fontWeight:"700" },



  // EMPTY

  emptyState: { padding:"40px 24px", textAlign:"center" },

  emptyText: { fontSize:"14px", color:"#7a8aa8", fontWeight:"600" },



  // NOT REGISTERED

  notRegCard: { background:"#fff", borderRadius:"16px", maxWidth:"460px", margin:"80px auto 0", padding:"48px 40px", textAlign:"center", border:"1px solid #dde3ef", boxShadow:"0 8px 32px rgba(0,0,0,0.07)" },

  notRegIcon: { width:"56px", height:"56px", borderRadius:"50%", background:"#fff8e1", border:"2px solid #ffe082", color:"#e65100", fontSize:"24px", fontWeight:"900", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 20px" },

  notRegTitle: { fontSize:"22px", fontWeight:"700", color:"#0d1b35", margin:"0 0 12px", fontFamily:"'Georgia', serif" },

  notRegDesc: { fontSize:"14px", color:"#5a6a88", lineHeight:1.75, margin:"0 0 24px" },



  // FOOTER

  footer: { borderTop:"1px solid #dde3ef", background:"#fff", padding:"18px 40px", display:"flex", justifyContent:"space-between", fontSize:"12px", color:"#a0b0c8", flexWrap:"wrap", gap:"8px" },

};



export default PatientDashboard;