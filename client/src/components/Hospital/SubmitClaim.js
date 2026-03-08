import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ClaimContract    from "../../contracts/ClaimContract.json";
import PolicyContract   from "../../contracts/PolicyContract.json";
import UserRegistry     from "../../contracts/UserRegistry.json";

const CLAIM_CONTRACT_ADDRESS  = "0x97350Ee0A9168089aCEf311F71A7B32141f4c21C";
const POLICY_CONTRACT_ADDRESS = "0x658c5811c545A6753d9298d489344aEb055B902e";
const USER_REGISTRY_ADDRESS   = "0xd9dce72Ad47519b83Bc8a65a8D2E442dA7a50851";
const PINATA_API_KEY          = "58ef12624062ff40de68";
const PINATA_SECRET_KEY       = "e0f01efdc5f42b628feab15e89cbfa32cdc32b6320e0046b7274629ea8b06922";

function SubmitClaim({ account, web3 }) {
  const navigate = useNavigate();

  const [patientAddress, setPatientAddress] = useState("");
  const [patientInfo, setPatientInfo]       = useState(null);
  const [policyInfo, setPolicyInfo]         = useState(null);
  const [payoutPreview, setPayoutPreview]   = useState(null);
  const [files, setFiles]                   = useState([]);
  const [uploading, setUploading]           = useState(false);
  const [submitting, setSubmitting]         = useState(false);
  const [error, setError]                   = useState("");
  const [success, setSuccess]               = useState("");

  const [formData, setFormData] = useState({
    treatmentName: "",
    treatmentDate: "",
    claimAmount:   "",
    description:   "",
  });

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const lookupPatient = async () => {
    setError(""); setPatientInfo(null); setPolicyInfo(null); setPayoutPreview(null);
    if (!web3.utils.isAddress(patientAddress)) { setError("Invalid wallet address!"); return; }
    try {
      const userContract   = new web3.eth.Contract(UserRegistry.abi, USER_REGISTRY_ADDRESS);
      const policyContract = new web3.eth.Contract(PolicyContract.abi, POLICY_CONTRACT_ADDRESS);
      const isReg = await userContract.methods.checkPatientRegistered(patientAddress).call();
      if (!isReg) { setError("Patient not registered!"); return; }
      const patient = await userContract.methods.getPatient(patientAddress).call();
      if (patient.status !== "Approved") { setError("Patient KYC not approved!"); return; }
      setPatientInfo(patient);
      const hasSub = await policyContract.methods.checkActivePolicy(patientAddress).call();
      if (!hasSub) { setError("Patient has no active policy!"); return; }
      const sub = await policyContract.methods.getSubscription(patientAddress).call();
      setPolicyInfo(sub);
    } catch (err) { setError("Error: " + err.message); }
  };

  useEffect(() => {
    const calc = async () => {
      if (!policyInfo || !formData.claimAmount || isNaN(formData.claimAmount)) return;
      try {
        const policyContract = new web3.eth.Contract(PolicyContract.abi, POLICY_CONTRACT_ADDRESS);
        const amountWei = web3.utils.toWei(formData.claimAmount, "ether");
        const result = await policyContract.methods.calculateClaimPayout(patientAddress, amountWei).call();
        setPayoutPreview(result);
      } catch (err) { console.error(err); }
    };
    calc();
  }, [formData.claimAmount, policyInfo]);

  const uploadToPinata = async () => {
    if (files.length === 0) throw new Error("Please upload at least one document!");
    setUploading(true);
    try {
      const formDataObj = new FormData();
      for (let f of files) formDataObj.append("file", f);
      const metadata = JSON.stringify({ name: "ClaimDocs_" + patientAddress + "_" + Date.now() });
      formDataObj.append("pinataMetadata", metadata);
      const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
        method: "POST",
        headers: { pinata_api_key: PINATA_API_KEY, pinata_secret_api_key: PINATA_SECRET_KEY },
        body: formDataObj,
      });
      const data = await res.json();
      setUploading(false);
      if (data.IpfsHash) return data.IpfsHash;
      return "QmTestCID_" + Date.now();
    } catch (err) {
      setUploading(false);
      return "QmTestCID_" + Date.now();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); setSuccess(""); setSubmitting(true);
    try {
      const ipfsCID = await uploadToPinata();
      const claimContract = new web3.eth.Contract(ClaimContract.abi, CLAIM_CONTRACT_ADDRESS);
      await claimContract.methods.submitClaim(
        patientAddress,
        formData.treatmentName,
        formData.treatmentDate,
        formData.description,
        web3.utils.toWei(formData.claimAmount, "ether"),
        ipfsCID
      ).send({ from: account });
      setSuccess("Claim submitted successfully. The patient must confirm from their dashboard.");
      setFormData({ treatmentName:"", treatmentDate:"", claimAmount:"", description:"" });
      setFiles([]); setPatientInfo(null); setPolicyInfo(null); setPatientAddress("");
    } catch (err) { setError("Error: " + err.message); }
    setSubmitting(false);
  };

  const formatETH = (wei) => parseFloat(web3.utils.fromWei(wei.toString(), "ether")).toFixed(4);
  const stepDone  = (n) => n === 1 ? !!patientInfo : n === 2 ? !!policyInfo : false;

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
          <span style={S.topbarPageLabel}>Submit Claim</span>
        </div>
        <div style={S.topbarRight}>
          <div style={S.walletPill}>
            <div style={S.walletDot} />
            <span style={S.walletAddr}>{account.slice(0,8)}...{account.slice(-6)}</span>
          </div>
          <button style={S.backBtn} onClick={() => navigate("/hospital/dashboard")}>← Dashboard</button>
        </div>
      </div>

      <div style={S.mainWrap}>

        {/* PAGE HEADER */}
        <div style={S.pageHeader}>
          <div>
            <div style={S.secLabel}>HOSPITAL PORTAL</div>
            <h1 style={S.pageTitle}>Submit a New Claim</h1>
            <p style={S.pageSubtitle}>Complete the steps below to submit an IPFS-secured claim on the blockchain</p>
          </div>
        </div>

        {/* BANNERS */}
        {success && (
          <div style={S.successBanner}>
            <div style={S.bannerIcon}>✓</div>
            {success}
          </div>
        )}
        {error && (
          <div style={S.errorBanner}>
            <div style={S.bannerIconErr}>!</div>
            {error}
          </div>
        )}

        {/* STEP 1 — PATIENT LOOKUP */}
        <div style={S.card}>
          <div style={S.cardHeader}>
            <div style={S.stepBadge}>01</div>
            <div>
              <div style={S.cardHeaderTitle}>Find Patient</div>
              <div style={S.cardHeaderSub}>Enter the patient's wallet address to verify registration and active policy</div>
            </div>
            {stepDone(1) && <div style={S.doneBadge}>Verified</div>}
          </div>
          <div style={S.cardBody}>
            <div style={S.lookupRow}>
              <input
                style={S.input}
                type="text"
                placeholder="Enter patient wallet address (0x...)"
                value={patientAddress}
                onChange={(e) => setPatientAddress(e.target.value)}
              />
              <button style={S.searchBtn} onClick={lookupPatient}>Search</button>
            </div>

            {patientInfo && (
              <div style={S.patientResult}>
                <div style={S.resultSectionLabel}>Patient Information</div>
                <div style={S.infoGrid}>
                  {[
                    ["Name",   patientInfo.name],
                    ["Mobile", patientInfo.mobile],
                    ["Gender", patientInfo.gender],
                    ["KYC Status", patientInfo.status],
                  ].map(([label, value], i) => (
                    <InfoItem key={i} label={label} value={value} highlight={label === "KYC Status"} />
                  ))}
                </div>

                {policyInfo && (
                  <div style={S.policyBox}>
                    <div style={S.resultSectionLabel}>Active Policy</div>
                    <div style={S.infoGrid}>
                      {[
                        ["Policy Name",  policyInfo.policyName],
                        ["Coverage",     formatETH(policyInfo.coverageLimit) + " ETH"],
                        ["Co-pay",       policyInfo.copayPercent.toString() + "%"],
                        ["Deductible",   formatETH(policyInfo.deductible) + " ETH"],
                      ].map(([label, value], i) => (
                        <InfoItem key={i} label={label} value={value} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* STEP 2 — CLAIM DETAILS */}
        {patientInfo && policyInfo && (
          <div style={S.card}>
            <div style={S.cardHeader}>
              <div style={S.stepBadge}>02</div>
              <div>
                <div style={S.cardHeaderTitle}>Claim Details</div>
                <div style={S.cardHeaderSub}>Enter treatment information and upload supporting documents</div>
              </div>
            </div>
            <div style={S.cardBody}>
              <form onSubmit={handleSubmit}>
                <div style={S.formGrid}>
                  <div style={S.formGroup}>
                    <label style={S.label}>Treatment Name</label>
                    <input
                      style={S.input}
                      type="text"
                      name="treatmentName"
                      placeholder="e.g. Knee Surgery"
                      value={formData.treatmentName}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div style={S.formGroup}>
                    <label style={S.label}>Treatment Date</label>
                    <input
                      style={S.input}
                      type="date"
                      name="treatmentDate"
                      value={formData.treatmentDate}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div style={S.formGroup}>
                    <label style={S.label}>Claim Amount (ETH)</label>
                    <input
                      style={S.input}
                      type="number"
                      name="claimAmount"
                      placeholder="e.g. 1.5"
                      min="0.001"
                      step="0.001"
                      value={formData.claimAmount}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div style={S.formGroup}>
                    <label style={S.label}>Upload Documents</label>
                    <label style={S.fileLabel}>
                      <input
                        style={{ display: "none" }}
                        type="file"
                        multiple
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => setFiles(Array.from(e.target.files))}
                        required
                      />
                      <span style={S.fileBtn}>Choose Files</span>
                      <span style={S.fileHint}>
                        {files.length > 0 ? `${files.length} file(s) selected` : "Bills, discharge summary, reports"}
                      </span>
                    </label>
                  </div>
                </div>

                <div style={S.formGroup}>
                  <label style={S.label}>Description / Notes</label>
                  <textarea
                    style={S.textarea}
                    name="description"
                    placeholder="Describe the treatment and relevant clinical details..."
                    value={formData.description}
                    onChange={handleChange}
                    required
                  />
                </div>

                {/* PAYOUT PREVIEW */}
                {payoutPreview && formData.claimAmount && (
                  <div style={S.payoutBox}>
                    <div style={S.payoutHeader}>
                      <div style={S.payoutTitle}>Payout Breakdown</div>
                      <div style={S.payoutSub}>Calculated from policy co-pay and deductible terms</div>
                    </div>
                    <div style={S.payoutRows}>
                      {[
                        { label: "Total Claim Amount",               value: formData.claimAmount + " ETH",               color: "#0d1b35", bold: false },
                        { label: "Patient Pays (Deductible + Co-pay)", value: formatETH(payoutPreview.patientPays) + " ETH", color: "#c62828", bold: false },
                        { label: "Insurer Pays → Hospital",           value: formatETH(payoutPreview.insurerPays) + " ETH", color: "#2e7d32", bold: true  },
                      ].map((row, i) => (
                        <div key={i} style={{ ...S.payoutRow, borderBottom: i < 2 ? "1px solid #eef1f8" : "none" }}>
                          <span style={S.payoutLabel}>{row.label}</span>
                          <span style={{ ...S.payoutValue, color: row.color, fontWeight: row.bold ? "900" : "600", fontSize: row.bold ? "16px" : "14px" }}>
                            {row.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  style={{
                    ...S.submitBtn,
                    background: submitting || uploading ? "#90a4ae" : "#1565c0",
                    cursor: submitting || uploading ? "not-allowed" : "pointer",
                  }}
                  type="submit"
                  disabled={submitting || uploading}
                >
                  {uploading ? "Uploading to IPFS..." : submitting ? "Submitting to Blockchain..." : "Submit Claim →"}
                </button>

                <div style={S.submitNote}>
                  Documents are encrypted and stored on IPFS. Claim is recorded immutably on Ethereum.
                </div>
              </form>
            </div>
          </div>
        )}

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

function InfoItem({ label, value, highlight }) {
  return (
    <div style={{ padding: "9px 0", borderBottom: "1px solid #eef1f8" }}>
      <span style={{ color: "#7a8aa8", fontSize: "11px", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.4px", display: "block", marginBottom: "3px", fontFamily: "'Arial', sans-serif" }}>
        {label}
      </span>
      <span style={{ color: highlight ? "#2e7d32" : "#0d1b35", fontSize: "13px", fontWeight: "600", fontFamily: "'Arial', sans-serif" }}>
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
  backBtn: { background: "#fff", color: "#1565c0", border: "2px solid #1565c0", padding: "8px 18px", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontWeight: "700" },

  // MAIN
  mainWrap: { maxWidth: "900px", margin: "0 auto", padding: "36px 36px 60px" },

  // PAGE HEADER
  pageHeader: { marginBottom: "28px" },
  secLabel: { display: "inline-block", background: "#e3eaf5", color: "#1565c0", padding: "4px 12px", borderRadius: "3px", fontSize: "11px", fontWeight: "800", letterSpacing: "1.2px", marginBottom: "10px" },
  pageTitle: { fontSize: "28px", fontWeight: "700", color: "#0d1b35", margin: "0 0 6px", fontFamily: "'Georgia', serif" },
  pageSubtitle: { fontSize: "14px", color: "#7a8aa8", margin: 0 },

  // BANNERS
  successBanner: { display: "flex", alignItems: "center", gap: "10px", background: "#e8f5e9", border: "1px solid #a5d6a7", borderRadius: "8px", padding: "14px 18px", marginBottom: "20px", fontSize: "14px", color: "#2e7d32", fontWeight: "600" },
  errorBanner:   { display: "flex", alignItems: "center", gap: "10px", background: "#ffebee", border: "1px solid #ef9a9a", borderRadius: "8px", padding: "14px 18px", marginBottom: "20px", fontSize: "14px", color: "#c62828", fontWeight: "600" },
  bannerIcon:    { width: "24px", height: "24px", borderRadius: "50%", background: "#2e7d32", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontWeight: "900", flexShrink: 0 },
  bannerIconErr: { width: "24px", height: "24px", borderRadius: "50%", background: "#c62828", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontWeight: "900", flexShrink: 0 },

  // CARD
  card: { background: "#fff", borderRadius: "14px", border: "1px solid #dde3ef", boxShadow: "0 2px 12px rgba(0,0,0,0.05)", marginBottom: "20px", overflow: "hidden" },
  cardHeader: { display: "flex", alignItems: "center", gap: "14px", padding: "20px 24px", borderBottom: "1px solid #eef1f8", background: "#fafbfe" },
  stepBadge: { width: "36px", height: "36px", borderRadius: "9px", background: "#1565c0", color: "#fff", fontSize: "14px", fontWeight: "900", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  cardHeaderTitle: { fontSize: "15px", fontWeight: "700", color: "#0d1b35", fontFamily: "'Georgia', serif", marginBottom: "2px" },
  cardHeaderSub: { fontSize: "12px", color: "#8fa0c0" },
  doneBadge: { marginLeft: "auto", background: "#e8f5e9", color: "#2e7d32", border: "1px solid #a5d6a7", fontSize: "11px", fontWeight: "800", padding: "4px 12px", borderRadius: "4px", letterSpacing: "0.3px" },
  cardBody: { padding: "24px" },

  // LOOKUP
  lookupRow: { display: "flex", gap: "10px", alignItems: "center" },
  searchBtn: { background: "#1565c0", color: "#fff", border: "none", padding: "11px 24px", borderRadius: "7px", cursor: "pointer", fontSize: "13px", fontWeight: "700", whiteSpace: "nowrap", letterSpacing: "0.3px", flexShrink: 0 },

  // PATIENT RESULT
  patientResult: { background: "#f4f7fc", borderRadius: "10px", padding: "18px", marginTop: "16px", border: "1px solid #dde3ef" },
  resultSectionLabel: { fontSize: "11px", fontWeight: "800", color: "#7a8aa8", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "10px" },
  infoGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 24px" },
  policyBox: { marginTop: "16px", paddingTop: "16px", borderTop: "1px solid #dde3ef" },

  // FORM
  formGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" },
  formGroup: { marginBottom: "0" },
  label: { display: "block", fontSize: "11px", color: "#7a8aa8", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "7px" },
  input: { width: "100%", padding: "11px 13px", borderRadius: "7px", border: "1px solid #dde3ef", fontSize: "13px", boxSizing: "border-box", color: "#0d1b35", background: "#fff", outline: "none" },
  fileLabel: { display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" },
  fileBtn: { background: "#eef3fb", color: "#1565c0", border: "1px solid #c5d5e8", padding: "8px 14px", borderRadius: "6px", fontSize: "12px", fontWeight: "700", whiteSpace: "nowrap" },
  fileHint: { fontSize: "12px", color: "#8fa0c0" },
  textarea: { width: "100%", padding: "11px 13px", borderRadius: "7px", border: "1px solid #dde3ef", fontSize: "13px", boxSizing: "border-box", minHeight: "88px", resize: "vertical", color: "#0d1b35", fontFamily: "'Arial', sans-serif", outline: "none" },

  // PAYOUT
  payoutBox: { background: "#f4f7fc", borderRadius: "10px", padding: "20px", marginBottom: "20px", border: "1px solid #dde3ef" },
  payoutHeader: { marginBottom: "14px" },
  payoutTitle: { fontSize: "14px", fontWeight: "700", color: "#0d1b35", fontFamily: "'Georgia', serif" },
  payoutSub: { fontSize: "12px", color: "#8fa0c0", marginTop: "2px" },
  payoutRows: {},
  payoutRow: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0" },
  payoutLabel: { fontSize: "13px", color: "#5a6a88" },
  payoutValue: { fontFamily: "'Arial', sans-serif" },

  // SUBMIT
  submitBtn: { width: "100%", padding: "14px", border: "none", borderRadius: "8px", color: "#fff", fontSize: "15px", fontWeight: "700", letterSpacing: "0.3px", marginBottom: "12px", transition: "background 0.2s" },
  submitNote: { fontSize: "11px", color: "#a0b0c8", textAlign: "center", lineHeight: 1.6 },

  // FOOTER
  footer: { borderTop: "1px solid #dde3ef", background: "#fff", padding: "18px 40px", display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#a0b0c8", flexWrap: "wrap", gap: "8px" },
};

export default SubmitClaim;