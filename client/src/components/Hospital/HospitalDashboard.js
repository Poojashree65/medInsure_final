import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import HospitalRegistry from "../../contracts/HospitalRegistry.json";
import ClaimContract    from "../../contracts/ClaimContract.json";

const CONTRACT_ADDRESS       = "0xa844AC1fDf0de42429050B2a34F23afBD5D003d0";
const CLAIM_CONTRACT_ADDRESS = "0x923E94A65dE82C198e7C3bBA3A2aBf3E122f1f37";

function HospitalDashboard({ account, web3 }) {
  const navigate = useNavigate();
  const [hospital, setHospital]           = useState(null);
  const [claimStats, setClaimStats]       = useState({ total:0, pending:0, approved:0, rejected:0, earned:"0" });
  const [loading, setLoading]             = useState(true);
  const [notRegistered, setNotRegistered] = useState(false);

  useEffect(() => { if (web3 && account) loadData(); }, [web3, account]);

  const loadData = async () => {
    try {
      setLoading(true);
      const contract = new web3.eth.Contract(HospitalRegistry.abi, CONTRACT_ADDRESS);
      const isRegistered = await contract.methods.checkHospital(account).call();
      if (!isRegistered) { setNotRegistered(true); setLoading(false); return; }
      const hospitalData = await contract.methods.getHospital(account).call();
      setHospital(hospitalData);
      const claimContract = new web3.eth.Contract(ClaimContract.abi, CLAIM_CONTRACT_ADDRESS);
      const ids = await claimContract.methods.getHospitalClaims(account).call();
      let pending=0, approved=0, rejected=0, earned=0;
      for (let id of ids) {
        const c = await claimContract.methods.getClaim(id).call();
        if (c.status==="Pending"||c.status==="AwaitingConfirmation") pending++;
        if (c.status==="Approved") { approved++; earned += Number(c.insurerPays); }
        if (c.status==="Rejected") rejected++;
      }
      setClaimStats({ total:ids.length, pending, approved, rejected, earned: earned.toString() });
      setLoading(false);
    } catch (err) { console.error(err); setLoading(false); }
  };

  const formatETH = (wei) => parseFloat(web3.utils.fromWei(wei.toString(),"ether")).toFixed(4);

  if (loading) return (
    <div style={S.loadingPage}>
      <div style={S.loadingCard}>
        <div style={S.loadingLogo}>M</div>
        <div style={S.loadingTitle}>MedInsure</div>
        <div style={S.loadingSpinner} />
        <div style={S.loadingText}>Loading hospital details...</div>
      </div>
    </div>
  );

  if (notRegistered) return (
    <div style={S.page}>
      <div style={S.topbar}>
        <div style={S.topbarBrand}>
          <div style={S.topbarLogo}>M</div>
          <div>
            <div style={S.topbarName}>MedInsure</div>
            <div style={S.topbarSub}>Blockchain Health Insurance</div>
          </div>
        </div>
        <div style={S.topbarRole}>Hospital Portal</div>
      </div>
      <div style={S.mainWrap}>
        <div style={S.notRegCard}>
          <div style={S.notRegIcon}>!</div>
          <h2 style={S.notRegTitle}>Hospital Not Registered</h2>
          <p style={S.notRegDesc}>
            Your wallet address is not linked to any registered hospital in the MedInsure system.
            Please contact the insurer to register your hospital on the platform.
          </p>
          <div style={S.notRegWallet}>
            <span style={S.notRegWalletLabel}>Connected Wallet</span>
            <span style={S.notRegWalletAddr}>{account}</span>
          </div>
        </div>
      </div>
    </div>
  );

  const isActive = hospital.status === "Active";

  return (
    <div style={S.page}>
      {/* TOP BAR */}
      <div style={S.topbar}>
        <div style={S.topbarBrand}>
          <div style={S.topbarLogo}>M</div>
          <div>
            <div style={S.topbarName}>MedInsure</div>
            <div style={S.topbarSub}>Blockchain Health Insurance</div>
          </div>
        </div>
        <div style={S.topbarCenter}>
          <span style={S.topbarPageLabel}>Hospital Dashboard</span>
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
            <div style={S.secLabel}>HOSPITAL PORTAL</div>
            <h1 style={S.pageTitle}>{hospital.name}</h1>
            <p style={S.pageSubtitle}>Hospital ID #{hospital.hospitalId.toString()} &nbsp;·&nbsp; {hospital.city}, {hospital.state}</p>
          </div>
          <div style={{
            ...S.statusBadge,
            background: isActive ? "#e8f5e9" : "#ffebee",
            color: isActive ? "#2e7d32" : "#c62828",
            border: `1.5px solid ${isActive ? "#a5d6a7" : "#ef9a9a"}`,
          }}>
            <div style={{
              ...S.statusDot,
              background: isActive ? "#2e7d32" : "#c62828",
            }} />
            {hospital.status}
          </div>
        </div>

        {/* STAT CARDS */}
        <div style={S.statsGrid}>
          {[
            { label: "Total Claims",   value: claimStats.total,    color: "#1565c0" },
            { label: "Pending",        value: claimStats.pending,  color: "#e65100" },
            { label: "Approved",       value: claimStats.approved, color: "#2e7d32" },
            { label: "Rejected",       value: claimStats.rejected, color: "#c62828" },
            { label: "ETH Received",   value: formatETH(claimStats.earned) + " ETH", color: "#6a1b9a" },
          ].map((s, i) => (
            <div key={i} style={S.statCard}>
              <div style={{ ...S.statNum, color: s.color }}>{s.value}</div>
              <div style={S.statLabel}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* QUICK ACTIONS */}
        <div style={S.sectionLabel}>Quick Actions</div>
        <div style={S.actionsGrid}>
          <div style={S.actionCard} onClick={() => navigate("/hospital/submit-claim")}>
            <div style={S.actionIconWrap}>
              <div style={{ ...S.actionIcon, background: "#fff3e0", color: "#e65100" }}>⚠️</div>
            </div>
            <div style={S.actionBody}>
              <div style={S.actionTitle}>Submit New Claim</div>
              <div style={S.actionDesc}>Submit a claim for a patient visit with IPFS-secured documents</div>
            </div>
            <button style={{ ...S.actionBtn, background: "#1565c0" }}>Submit Claim →</button>
          </div>
          <div style={S.actionCard} onClick={() => navigate("/hospital/claims")}>
            <div style={S.actionIconWrap}>
              <div style={{ ...S.actionIcon, background: "#e3f2fd", color: "#1565c0" }}>✓</div>
            </div>
            <div style={S.actionBody}>
              <div style={S.actionTitle}>View All Claims</div>
              <div style={S.actionDesc}>Track submitted claims, approvals and payment history</div>
            </div>
            <button style={{ ...S.actionBtn, background: "#0d47a1" }}>View Claims →</button>
          </div>
        </div>

        {/* DETAILS CARDS */}
        <div style={S.detailsGrid}>
          {/* Hospital Details */}
          <div style={S.card}>
            <div style={S.cardHeader}>
              <div style={S.cardHeaderIcon}>H</div>
              <div style={S.cardHeaderTitle}>Hospital Details</div>
            </div>
            <div style={S.cardBody}>
              {[
                ["Hospital ID",     "#" + hospital.hospitalId.toString()],
                ["Hospital Name",   hospital.name],
                ["Address",         hospital.location],
                ["City",            hospital.city],
                ["State",           hospital.state],
                ["Pincode",         hospital.pincode],
                ["License Number",  hospital.licenseNumber],
                ["Status",          hospital.status],
                ["Registered On",   new Date(Number(hospital.timestamp)*1000).toLocaleDateString()],
              ].map(([label, value], i) => (
                <InfoRow key={i} label={label} value={value} />
              ))}
            </div>
          </div>

          {/* Blockchain Details */}
          <div style={S.card}>
            <div style={S.cardHeader}>
              <div style={{ ...S.cardHeaderIcon, background: "#1a237e" }}>≡</div>
              <div style={S.cardHeaderTitle}>Blockchain Details</div>
            </div>
            <div style={S.cardBody}>
              <InfoRow label="Wallet Address" value={hospital.walletAddress} />
              <div style={S.blockchainNote}>
                <p style={S.blockchainNoteText}>
                  Your hospital is registered on the Ethereum blockchain. All patient claims are processed
                  through this wallet and payments are received here automatically via smart contract.
                </p>
              </div>
              <div style={S.ethBox}>
                <div style={S.ethAmount}>{formatETH(claimStats.earned)} <span style={S.ethUnit}>ETH</span></div>
                <div style={S.ethLabel}>Total ETH Received from Claims</div>
              </div>
              <div style={S.securedNote}>
                Secured by Ethereum Blockchain &amp; IPFS Document Verification
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* FOOTER */}
      <div style={S.footer}>
        <span>© 2026 MedInsure</span>
        <span>Powered by Ethereum Blockchain and IPFS</span>
        <span>Hospital Portal v1.0</span>
      </div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "10px 0",
      borderBottom: "1px solid #eef1f8",
    }}>
      <span style={{ color: "#7a8aa8", fontSize: "12px", fontWeight: "700", fontFamily: "'Arial', sans-serif", textTransform: "uppercase", letterSpacing: "0.4px" }}>
        {label}
      </span>
      <span style={{ color: "#0d1b35", fontSize: "13px", fontFamily: "'Arial', sans-serif", textAlign: "right", maxWidth: "58%", wordBreak: "break-all", fontWeight: "500" }}>
        {value}
      </span>
    </div>
  );
}

const S = {
  // LOADING
  loadingPage: { minHeight: "100vh", background: "#f4f7fc", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Arial', sans-serif" },
  loadingCard: { background: "#fff", borderRadius: "16px", padding: "48px 56px", textAlign: "center", boxShadow: "0 8px 32px rgba(21,101,192,0.10)", border: "1px solid #dde3ef" },
  loadingLogo: { width: "52px", height: "52px", background: "#1565c0", borderRadius: "12px", color: "#fff", fontSize: "26px", fontWeight: "900", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px", fontFamily: "'Arial', sans-serif" },
  loadingTitle: { fontSize: "20px", fontWeight: "800", color: "#1a237e", marginBottom: "24px", fontFamily: "'Arial', sans-serif" },
  loadingSpinner: { width: "36px", height: "36px", border: "3px solid #e3eaf5", borderTop: "3px solid #1565c0", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" },
  loadingText: { color: "#7a8aa8", fontSize: "14px", fontFamily: "'Arial', sans-serif" },

  // PAGE
  page: { minHeight: "100vh", background: "#f4f7fc", fontFamily: "'Arial', sans-serif", color: "#1a237e" },

  // TOPBAR
  topbar: { background: "#fff", borderBottom: "1px solid #dde3ef", padding: "0 40px", height: "68px", display: "flex", alignItems: "center", gap: "24px", position: "sticky", top: 0, zIndex: 100, boxShadow: "0 1px 0 #dde3ef" },
  topbarBrand: { display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 },
  topbarLogo: { width: "38px", height: "38px", background: "#1565c0", borderRadius: "9px", color: "#fff", fontSize: "19px", fontWeight: "900", display: "flex", alignItems: "center", justifyContent: "center" },
  topbarName: { fontSize: "16px", fontWeight: "800", color: "#1a237e", lineHeight: 1.2 },
  topbarSub: { fontSize: "10px", color: "#8fa0c0", letterSpacing: "0.4px" },
  topbarCenter: { flex: 1, display: "flex", justifyContent: "center" },
  topbarPageLabel: { fontSize: "14px", fontWeight: "700", color: "#3a4a6b", background: "#eef3fb", padding: "6px 16px", borderRadius: "5px" },
  topbarRight: { display: "flex", alignItems: "center", gap: "12px", flexShrink: 0 },
  topbarRole: { fontSize: "13px", fontWeight: "700", color: "#1565c0", background: "#e3eaf5", padding: "6px 14px", borderRadius: "5px" },
  walletPill: { display: "flex", alignItems: "center", gap: "7px", background: "#eef3fb", border: "1px solid #c5d5e8", borderRadius: "20px", padding: "6px 14px" },
  walletDot: { width: "8px", height: "8px", borderRadius: "50%", background: "#2e7d32", flexShrink: 0 },
  walletAddr: { fontSize: "12px", color: "#1a237e", fontWeight: "700" },
  refreshBtn: { background: "#1565c0", color: "#fff", border: "none", padding: "8px 18px", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontWeight: "700", letterSpacing: "0.3px" },

  // MAIN WRAP
  mainWrap: { maxWidth: "1200px", margin: "0 auto", padding: "36px 36px 60px" },

  // PAGE HEADER
  pageHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "32px", gap: "20px", flexWrap: "wrap" },
  secLabel: { display: "inline-block", background: "#e3eaf5", color: "#1565c0", padding: "4px 12px", borderRadius: "3px", fontSize: "11px", fontWeight: "800", letterSpacing: "1.2px", marginBottom: "10px" },
  pageTitle: { fontSize: "28px", fontWeight: "700", color: "#0d1b35", margin: "0 0 6px", fontFamily: "'Georgia', serif", lineHeight: 1.2 },
  pageSubtitle: { fontSize: "14px", color: "#7a8aa8", margin: 0 },
  statusBadge: { display: "flex", alignItems: "center", gap: "8px", padding: "10px 18px", borderRadius: "8px", fontSize: "14px", fontWeight: "700", flexShrink: 0, marginTop: "30px" },
  statusDot: { width: "8px", height: "8px", borderRadius: "50%", flexShrink: 0 },

  // STATS
  statsGrid: { display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "16px", marginBottom: "36px" },
  statCard: { background: "#fff", borderRadius: "12px", padding: "22px 20px", border: "1px solid #dde3ef", boxShadow: "0 2px 10px rgba(0,0,0,0.04)", textAlign: "center" },
  statNum: { fontSize: "28px", fontWeight: "900", lineHeight: 1, marginBottom: "6px" },
  statLabel: { fontSize: "11px", color: "#7a8aa8", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px" },

  // ACTIONS
  sectionLabel: { fontSize: "12px", fontWeight: "800", color: "#7a8aa8", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "14px" },
  actionsGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "36px" },
  actionCard: { background: "#fff", border: "1px solid #dde3ef", borderRadius: "12px", padding: "24px", display: "flex", alignItems: "center", gap: "18px", cursor: "pointer", boxShadow: "0 2px 10px rgba(0,0,0,0.04)", transition: "box-shadow 0.2s" },
  actionIconWrap: { flexShrink: 0 },
  actionIcon: { width: "44px", height: "44px", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", fontWeight: "900" },
  actionBody: { flex: 1 },
  actionTitle: { fontSize: "15px", fontWeight: "700", color: "#0d1b35", marginBottom: "4px", fontFamily: "'Georgia', serif" },
  actionDesc: { fontSize: "12px", color: "#7a8aa8", lineHeight: 1.5 },
  actionBtn: { flexShrink: 0, color: "#fff", border: "none", padding: "10px 20px", borderRadius: "7px", cursor: "pointer", fontSize: "13px", fontWeight: "700", letterSpacing: "0.3px", whiteSpace: "nowrap" },

  // DETAIL CARDS
  detailsGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" },
  card: { background: "#fff", borderRadius: "14px", border: "1px solid #dde3ef", boxShadow: "0 2px 12px rgba(0,0,0,0.05)", overflow: "hidden" },
  cardHeader: { display: "flex", alignItems: "center", gap: "12px", padding: "20px 24px", borderBottom: "1px solid #eef1f8", background: "#fafbfe" },
  cardHeaderIcon: { width: "34px", height: "34px", background: "#1565c0", borderRadius: "8px", color: "#fff", fontSize: "16px", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "700", flexShrink: 0 },
  cardHeaderTitle: { fontSize: "15px", fontWeight: "700", color: "#0d1b35", fontFamily: "'Georgia', serif" },
  cardBody: { padding: "20px 24px" },

  // BLOCKCHAIN SECTION
  blockchainNote: { background: "#f4f7fc", borderRadius: "8px", padding: "16px", margin: "16px 0", border: "1px solid #dde3ef" },
  blockchainNoteText: { fontSize: "13px", color: "#5a6a88", lineHeight: 1.75, margin: 0 },
  ethBox: { background: "linear-gradient(135deg, #1565c0 0%, #0d47a1 100%)", borderRadius: "10px", padding: "20px 24px", textAlign: "center", margin: "12px 0" },
  ethAmount: { fontSize: "30px", fontWeight: "900", color: "#fff", lineHeight: 1 },
  ethUnit: { fontSize: "16px", fontWeight: "700" },
  ethLabel: { fontSize: "12px", color: "rgba(255,255,255,0.7)", marginTop: "6px" },
  securedNote: { fontSize: "11px", color: "#1565c0", fontWeight: "600", textAlign: "center", paddingTop: "14px", borderTop: "1px solid #eef1f8", letterSpacing: "0.3px" },

  // NOT REGISTERED
  notRegCard: { background: "#fff", borderRadius: "16px", maxWidth: "480px", margin: "80px auto 0", padding: "48px 40px", textAlign: "center", border: "1px solid #dde3ef", boxShadow: "0 8px 32px rgba(0,0,0,0.07)" },
  notRegIcon: { width: "60px", height: "60px", borderRadius: "50%", background: "#fff3e0", border: "2px solid #ffb74d", color: "#e65100", fontSize: "28px", fontWeight: "900", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" },
  notRegTitle: { fontSize: "22px", fontWeight: "700", color: "#0d1b35", margin: "0 0 12px", fontFamily: "'Georgia', serif" },
  notRegDesc: { fontSize: "14px", color: "#5a6a88", lineHeight: 1.75, margin: "0 0 24px" },
  notRegWallet: { display: "flex", flexDirection: "column", gap: "4px", background: "#f4f7fc", border: "1px solid #dde3ef", borderRadius: "8px", padding: "12px 16px" },
  notRegWalletLabel: { fontSize: "11px", color: "#8fa0c0", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px" },
  notRegWalletAddr: { fontSize: "12px", color: "#1a237e", fontWeight: "600", wordBreak: "break-all" },

  // FOOTER
  footer: { borderTop: "1px solid #dde3ef", background: "#fff", padding: "18px 40px", display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#a0b0c8", flexWrap: "wrap", gap: "8px" },
};

export default HospitalDashboard;
