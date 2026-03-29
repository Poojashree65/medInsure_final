import React, { useState, useEffect } from "react";

import { useNavigate } from "react-router-dom";

import ClaimContract from "../../contracts/ClaimContract.json";



const CLAIM_CONTRACT_ADDRESS = "0x923E94A65dE82C198e7C3bBA3A2aBf3E122f1f37";



function HospitalClaims({ account, web3 }) {

  const navigate = useNavigate();

  const [claims, setClaims]     = useState([]);

  const [loading, setLoading]   = useState(true);

  const [filter, setFilter]     = useState("All");

  const [selected, setSelected] = useState(null);

  const [error, setError]       = useState("");



  useEffect(() => { if (web3 && account) loadClaims(); }, [web3, account]);



  const loadClaims = async () => {

    try {

      setLoading(true);

      const contract = new web3.eth.Contract(ClaimContract.abi, CLAIM_CONTRACT_ADDRESS);

      const ids = await contract.methods.getHospitalClaims(account).call();

      const list = [];

      for (let id of ids) {

        const c = await contract.methods.getClaim(id).call();

        list.push(c);

      }

      setClaims(list.reverse());

      setLoading(false);

    } catch (err) { setError("Error: " + err.message); setLoading(false); }

  };



  const formatDate = (ts) => ts === "0" || ts === 0 ? "—" : new Date(Number(ts)*1000).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"});

  const formatETH  = (wei) => parseFloat(web3.utils.fromWei(wei.toString(),"ether")).toFixed(4);



  const statusStyle = (s) => ({

    AwaitingConfirmation: { bg:"#fff8e1", color:"#e65100", border:"#ffe082" },

    Pending:              { bg:"#e3f2fd", color:"#1565c0", border:"#90caf9" },

    Approved:             { bg:"#e8f5e9", color:"#2e7d32", border:"#a5d6a7" },

    Rejected:             { bg:"#ffebee", color:"#c62828", border:"#ef9a9a" },

    Cancelled:            { bg:"#f5f5f5", color:"#616161", border:"#e0e0e0" },

  }[s] || { bg:"#f4f7fc", color:"#3a4a6b", border:"#dde3ef" });



  const statusLabel = (s) => ({

    AwaitingConfirmation: "Awaiting Patient",

    Pending:              "Pending Review",

    Approved:             "Approved",

    Rejected:             "Rejected",

    Cancelled:            "Cancelled",

  }[s] || s);



  const counts = {

    All:                  claims.length,

    AwaitingConfirmation: claims.filter(c => c.status==="AwaitingConfirmation").length,

    Pending:              claims.filter(c => c.status==="Pending").length,

    Approved:             claims.filter(c => c.status==="Approved").length,

    Rejected:             claims.filter(c => c.status==="Rejected").length,

  };



  const filtered = filter==="All" ? claims : claims.filter(c => c.status===filter);



  const totalReceived = claims

    .filter(c => c.status==="Approved")

    .reduce((sum, c) => sum + Number(c.insurerPays), 0);



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

          <span style={S.topbarPageLabel}>Claims History</span>

        </div>

        <div style={S.topbarRight}>

          <div style={S.walletPill}>

            <div style={S.walletDot} />

            <span style={S.walletAddr}>{account.slice(0,8)}...{account.slice(-6)}</span>

          </div>

          <button style={S.refreshBtn} onClick={loadClaims}>Refresh</button>

        </div>

      </div>



      <div style={S.mainWrap}>



        {/* PAGE HEADER */}

        <div style={S.pageHeader}>

          <div>

            <div style={S.secLabel}>HOSPITAL PORTAL</div>

            <h1 style={S.pageTitle}>My Claims</h1>

            <p style={S.pageSubtitle}>All claims submitted by your hospital on the MedInsure platform</p>

          </div>

          <div style={S.headerBtns}>

            <button style={S.submitBtn} onClick={() => navigate("/hospital/submit-claim")}>+ Submit New Claim</button>

            <button style={S.backBtn}   onClick={() => navigate("/hospital/dashboard")}>← Dashboard</button>

          </div>

        </div>



        {error && (

          <div style={S.errorBanner}>

            <span style={S.errorDot}>!</span>

            {error}

          </div>

        )}



        {/* STATS */}

        <div style={S.statsGrid}>

          {[

            { label: "Total Claims",    value: claims.length,              color: "#1565c0" },

            { label: "Awaiting",        value: counts.AwaitingConfirmation, color: "#e65100" },

            { label: "Pending Review",  value: counts.Pending,             color: "#1565c0" },

            { label: "Approved",        value: counts.Approved,            color: "#2e7d32" },

            { label: "Rejected",        value: counts.Rejected,            color: "#c62828" },

            { label: "ETH Received",    value: formatETH(totalReceived) + " ETH", color: "#6a1b9a" },

          ].map((s, i) => (

            <div key={i} style={S.statCard}>

              <div style={{ ...S.statNum, color: s.color }}>{s.value}</div>

              <div style={S.statLabel}>{s.label}</div>

            </div>

          ))}

        </div>



        {/* FILTER TABS */}

        <div style={S.filterRow}>

          {[

            ["All",                  "All"],

            ["AwaitingConfirmation", "Awaiting"],

            ["Pending",              "Pending"],

            ["Approved",             "Approved"],

            ["Rejected",             "Rejected"],

          ].map(([key, label]) => (

            <button

              key={key}

              onClick={() => setFilter(key)}

              style={{

                ...S.filterBtn,

                background: filter === key ? "#1565c0" : "#fff",

                color:      filter === key ? "#fff"    : "#1565c0",

                border:     filter === key ? "2px solid #1565c0" : "2px solid #dde3ef",

                fontWeight: filter === key ? "700" : "600",

              }}

            >

              {label} <span style={{ ...S.filterCount, background: filter === key ? "rgba(255,255,255,0.25)" : "#e3eaf5", color: filter === key ? "#fff" : "#1565c0" }}>

                {key === "All" ? claims.length : (counts[key] || 0)}

              </span>

            </button>

          ))}

        </div>



        {/* TABLE CARD */}

        <div style={S.tableCard}>

          <div style={S.tableTopRow}>

            <div>

              <span style={S.tableTitle}>Claims History</span>

              <span style={S.tableCount}>{filtered.length} record{filtered.length !== 1 ? "s" : ""}</span>

            </div>

          </div>



          {loading ? (

            <div style={S.emptyState}>

              <div style={S.loadingSpinner} />

              <div style={S.emptyText}>Loading claims...</div>

            </div>

          ) : filtered.length === 0 ? (

            <div style={S.emptyState}>

              <div style={S.emptyIcon}>≡</div>

              <div style={S.emptyText}>No claims found for this filter.</div>

            </div>

          ) : (

            <div style={S.tableWrap}>

              <table style={S.table}>

                <thead>

                  <tr>

                    {["ID", "Patient", "Treatment", "Date", "Claimed", "Insurer Pays", "Status", "Docs", "Details"].map(h => (

                      <th key={h} style={S.th}>{h}</th>

                    ))}

                  </tr>

                </thead>

                <tbody>

                  {filtered.map((c, i) => {

                    const ss = statusStyle(c.status);

                    return (

                      <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#fafbfe" }}>

                        <td style={{ ...S.td, color: "#1565c0", fontWeight: "700" }}>#{c.claimId.toString()}</td>

                        <td style={{ ...S.td, fontWeight: "700", color: "#0d1b35" }}>{c.patientName}</td>

                        <td style={S.td}>{c.treatmentName}</td>

                        <td style={S.td}>{c.treatmentDate}</td>

                        <td style={{ ...S.td, color: "#1565c0", fontWeight: "600" }}>{formatETH(c.claimAmount)} ETH</td>

                        <td style={{ ...S.td, color: "#2e7d32", fontWeight: "600" }}>{formatETH(c.insurerPays)} ETH</td>

                        <td style={S.td}>

                          <span style={{

                            ...S.statusPill,

                            background: ss.bg,

                            color: ss.color,

                            border: `1px solid ${ss.border}`,

                          }}>

                            {statusLabel(c.status)}

                          </span>

                        </td>

                        <td style={S.td}>

                          {c.ipfsCID && (

                            <a href={"https://gateway.pinata.cloud/ipfs/" + c.ipfsCID} target="_blank" rel="noreferrer" style={S.docLink}>

                              View Docs

                            </a>

                          )}

                        </td>

                        <td style={S.td}>

                          <button style={S.detailBtn} onClick={() => setSelected(c)}>Details</button>

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

        <span>Hospital Portal v1.0</span>

      </div>



      {/* DETAIL MODAL */}

      {selected && (

        <div style={S.overlay} onClick={() => setSelected(null)}>

          <div style={S.modal} onClick={e => e.stopPropagation()}>

            <div style={S.modalHeader}>

              <div>

                <div style={S.secLabel}>CLAIM DETAILS</div>

                <h2 style={S.modalTitle}>Claim #{selected.claimId.toString()}</h2>

              </div>

              <button style={S.closeBtn} onClick={() => setSelected(null)}>✖</button>

            </div>

            <div style={S.modalBody}>

              {[

                ["Patient",        selected.patientName],

                ["Policy",         selected.policyName],

                ["Treatment",      selected.treatmentName],

                ["Date",           selected.treatmentDate],

                ["Description",    selected.description],

                ["Claim Amount",   formatETH(selected.claimAmount) + " ETH"],

                ["Patient Pays",   formatETH(selected.patientPays) + " ETH"],

                ["Insurer Pays",   formatETH(selected.insurerPays) + " ETH"],

                ["Submitted On",   formatDate(selected.submittedOn)],

                ["Settled On",     formatDate(selected.settledOn)],

                ["Status",         statusLabel(selected.status)],

                ...(selected.rejectionReason ? [["Rejection Reason", selected.rejectionReason]] : []),

              ].map(([label, value], i) => (

                <ModalRow key={i} label={label} value={value} />

              ))}



              {selected.ipfsCID && (

                <div style={S.modalDocRow}>

                  <a

                    href={"https://gateway.pinata.cloud/ipfs/" + selected.ipfsCID}

                    target="_blank"

                    rel="noreferrer"

                    style={S.modalDocLink}

                  >

                    View IPFS Documents →

                  </a>

                </div>

              )}

            </div>

          </div>

        </div>

      )}

    </div>

  );

}



function ModalRow({ label, value }) {

  return (

    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "10px 0", borderBottom: "1px solid #eef1f8" }}>

      <span style={{ color: "#7a8aa8", fontSize: "12px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.4px", fontFamily: "'Arial', sans-serif", flexShrink: 0, marginRight: "16px" }}>

        {label}

      </span>

      <span style={{ color: "#0d1b35", fontSize: "13px", fontFamily: "'Arial', sans-serif", textAlign: "right", maxWidth: "60%", wordBreak: "break-all", fontWeight: "500" }}>

        {value}

      </span>

    </div>

  );

}



const S = {

  page: { background: "#f4f7fc", minHeight: "100vh", fontFamily: "'Arial', sans-serif", color: "#1a237e" },



  // TOPBAR

  topbar: { background: "#fff", borderBottom: "1px solid #dde3ef", padding: "0 40px", height: "68px", display: "flex", alignItems: "center", gap: "24px", position: "sticky", top: 0, zIndex: 100, boxShadow: "0 1px 0 #dde3ef" },

  topbarBrand: { display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 },

  topbarLogo: { width: "38px", height: "38px", background: "#1565c0", borderRadius: "9px", color: "#fff", fontSize: "19px", fontWeight: "900", display: "flex", alignItems: "center", justifyContent: "center" },

  topbarName: { fontSize: "16px", fontWeight: "800", color: "#1a237e", lineHeight: 1.2 },

  topbarSub: { fontSize: "10px", color: "#8fa0c0", letterSpacing: "0.4px" },

  topbarCenter: { flex: 1, display: "flex", justifyContent: "center" },

  topbarPageLabel: { fontSize: "14px", fontWeight: "700", color: "#3a4a6b", background: "#eef3fb", padding: "6px 16px", borderRadius: "5px" },

  topbarRight: { display: "flex", alignItems: "center", gap: "12px", flexShrink: 0 },

  walletPill: { display: "flex", alignItems: "center", gap: "7px", background: "#eef3fb", border: "1px solid #c5d5e8", borderRadius: "20px", padding: "6px 14px" },

  walletDot: { width: "8px", height: "8px", borderRadius: "50%", background: "#2e7d32", flexShrink: 0 },

  walletAddr: { fontSize: "12px", color: "#1a237e", fontWeight: "700" },

  refreshBtn: { background: "#1565c0", color: "#fff", border: "none", padding: "8px 18px", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontWeight: "700", letterSpacing: "0.3px" },



  // MAIN

  mainWrap: { maxWidth: "1300px", margin: "0 auto", padding: "36px 36px 60px" },



  // PAGE HEADER

  pageHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "32px", gap: "20px", flexWrap: "wrap" },

  secLabel: { display: "inline-block", background: "#e3eaf5", color: "#1565c0", padding: "4px 12px", borderRadius: "3px", fontSize: "11px", fontWeight: "800", letterSpacing: "1.2px", marginBottom: "10px" },

  pageTitle: { fontSize: "28px", fontWeight: "700", color: "#0d1b35", margin: "0 0 6px", fontFamily: "'Georgia', serif" },

  pageSubtitle: { fontSize: "14px", color: "#7a8aa8", margin: 0 },

  headerBtns: { display: "flex", gap: "10px", flexShrink: 0 },

  submitBtn: { background: "#1565c0", color: "#fff", border: "none", padding: "11px 22px", borderRadius: "7px", cursor: "pointer", fontSize: "13px", fontWeight: "700", letterSpacing: "0.3px" },

  backBtn: { background: "#fff", color: "#1565c0", border: "2px solid #1565c0", padding: "11px 22px", borderRadius: "7px", cursor: "pointer", fontSize: "13px", fontWeight: "700" },



  // ERROR

  errorBanner: { display: "flex", alignItems: "center", gap: "10px", background: "#ffebee", border: "1px solid #ef9a9a", borderRadius: "8px", padding: "12px 18px", marginBottom: "24px", fontSize: "14px", color: "#c62828", fontWeight: "600" },

  errorDot: { width: "22px", height: "22px", borderRadius: "50%", background: "#c62828", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontWeight: "900", flexShrink: 0 },



  // STATS

  statsGrid: { display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "14px", marginBottom: "28px" },

  statCard: { background: "#fff", borderRadius: "12px", padding: "20px 16px", border: "1px solid #dde3ef", boxShadow: "0 2px 8px rgba(0,0,0,0.04)", textAlign: "center" },

  statNum: { fontSize: "26px", fontWeight: "900", lineHeight: 1, marginBottom: "6px" },

  statLabel: { fontSize: "11px", color: "#7a8aa8", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.4px" },



  // FILTER

  filterRow: { display: "flex", gap: "10px", marginBottom: "20px", flexWrap: "wrap" },

  filterBtn: { padding: "9px 18px", borderRadius: "6px", cursor: "pointer", fontSize: "13px", display: "flex", alignItems: "center", gap: "7px" },

  filterCount: { fontSize: "11px", fontWeight: "800", padding: "2px 7px", borderRadius: "10px" },



  // TABLE CARD

  tableCard: { background: "#fff", borderRadius: "14px", border: "1px solid #dde3ef", boxShadow: "0 2px 12px rgba(0,0,0,0.05)", overflow: "hidden" },

  tableTopRow: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderBottom: "1px solid #eef1f8", background: "#fafbfe" },

  tableTitle: { fontSize: "15px", fontWeight: "700", color: "#0d1b35", fontFamily: "'Georgia', serif", marginRight: "10px" },

  tableCount: { fontSize: "12px", color: "#8fa0c0", fontWeight: "600", background: "#eef3fb", padding: "3px 10px", borderRadius: "10px" },

  tableWrap: { overflowX: "auto" },

  table: { width: "100%", borderCollapse: "collapse" },

  th: { background: "#f4f7fc", padding: "12px 16px", textAlign: "left", fontSize: "11px", fontWeight: "800", color: "#7a8aa8", textTransform: "uppercase", letterSpacing: "0.6px", borderBottom: "2px solid #dde3ef", whiteSpace: "nowrap" },

  td: { padding: "12px 16px", fontSize: "13px", color: "#3a4a6b", borderBottom: "1px solid #eef1f8", whiteSpace: "nowrap" },

  statusPill: { padding: "4px 11px", borderRadius: "4px", fontSize: "11px", fontWeight: "700", letterSpacing: "0.3px" },

  docLink: { color: "#1565c0", textDecoration: "none", fontSize: "12px", fontWeight: "700", borderBottom: "1px solid #c5d5e8", paddingBottom: "1px" },

  detailBtn: { background: "#eef3fb", color: "#1565c0", border: "1px solid #c5d5e8", padding: "5px 12px", borderRadius: "5px", cursor: "pointer", fontSize: "12px", fontWeight: "700" },



  // EMPTY / LOADING

  emptyState: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 24px", gap: "14px" },

  loadingSpinner: { width: "32px", height: "32px", border: "3px solid #e3eaf5", borderTop: "3px solid #1565c0", borderRadius: "50%", animation: "spin 0.8s linear infinite" },

  emptyIcon: { fontSize: "36px", color: "#c5d5e8" },

  emptyText: { fontSize: "14px", color: "#7a8aa8", fontWeight: "600" },



  // FOOTER

  footer: { borderTop: "1px solid #dde3ef", background: "#fff", padding: "18px 40px", display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#a0b0c8", flexWrap: "wrap", gap: "8px" },



  // MODAL

  overlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(10,22,40,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" },

  modal: { background: "#fff", borderRadius: "16px", width: "100%", maxWidth: "540px", maxHeight: "88vh", overflowY: "auto", boxShadow: "0 24px 64px rgba(0,0,0,0.25)", border: "1px solid #dde3ef" },

  modalHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "24px 28px 18px", borderBottom: "1px solid #eef1f8", background: "#fafbfe" },

  modalTitle: { fontSize: "20px", fontWeight: "700", color: "#0d1b35", margin: "0", fontFamily: "'Georgia', serif" },

  closeBtn: { background: "#eef1f8", border: "none", width: "32px", height: "32px", borderRadius: "50%", cursor: "pointer", fontSize: "14px", color: "#3a4a6b", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },

  modalBody: { padding: "20px 28px 28px" },

  modalDocRow: { marginTop: "20px", paddingTop: "16px", borderTop: "1px solid #eef1f8", textAlign: "center" },

  modalDocLink: { color: "#1565c0", fontWeight: "700", fontSize: "14px", textDecoration: "none", borderBottom: "1px solid #c5d5e8", paddingBottom: "2px" },

};



export default HospitalClaims;