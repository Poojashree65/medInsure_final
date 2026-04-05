import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ClaimContract  from "../../contracts/ClaimContract.json";
import PolicyContract from "../../contracts/PolicyContract.json";
import UserRegistry   from "../../contracts/UserRegistry.json";

const CLAIM_CONTRACT_ADDRESS  = "0xE84B25aAeE6Bd9efeD250f2327F1Ec47ed44d40e";
const POLICY_CONTRACT_ADDRESS = "0x888C72Bd841cc9B61d1d07A07b244dad70ACA057";
const USER_REGISTRY_ADDRESS   = "0xfAb58c1c5B6486aBb2324270948581D4E4C8322D";
const PINATA_API_KEY          = "58ef12624062ff40de68";
const PINATA_SECRET_KEY       = "e0f01efdc5f42b628feab15e89cbfa32cdc32b6320e0046b7274629ea8b06922";

function SubmitClaim({ account, web3 }) {
  const navigate = useNavigate();

  // ── Patient search ───────────────────────────────────────────────
  const [patientAddress, setPatientAddress] = useState("");
  const [patientInfo,    setPatientInfo]    = useState(null);
  const [policyInfo,     setPolicyInfo]     = useState(null);
  const [searching,      setSearching]      = useState(false);
  const [searchError,    setSearchError]    = useState("");

  // ── Form ─────────────────────────────────────────────────────────
  const [formData, setFormData] = useState({
    treatmentName: "", treatmentDate: "", claimAmount: "", description: "",
    primaryDiagnosis: "", icdCode: "", procedurePerformed: "",
    admissionDate: "", dischargeDate: "", lengthOfStay: "",
    wardRoom: "", attendingDoctor: "", doctorRegNo: "",
    surgeryCharges: "", otCharges: "", anaesthesiaCharges: "",
    wardCharges: "", medicinesCharges: "", labCharges: "",
  });
  const [files, setFiles] = useState([]);

  // ── Status ───────────────────────────────────────────────────────
  const [uploading,       setUploading]       = useState(false);
  const [submitting,      setSubmitting]      = useState(false);
  const [uploadProgress,  setUploadProgress]  = useState("");
  const [error,           setError]           = useState("");
  const [success,         setSuccess]         = useState("");

  // ── Derived panels ───────────────────────────────────────────────
  const [payoutBreakdown,    setPayoutBreakdown]    = useState(null);
  const [fraudFlags,         setFraudFlags]         = useState([]);
  const [verificationStatus, setVerificationStatus] = useState(null);

  const formatETH = (wei) => parseFloat(web3.utils.fromWei(wei.toString(), "ether")).toFixed(4);

  // ── PATIENT LOOKUP ───────────────────────────────────────────────
  const lookupPatient = async () => {
    setSearchError(""); setPatientInfo(null); setPolicyInfo(null);
    setPayoutBreakdown(null); setFraudFlags([]); setVerificationStatus(null);
    if (!web3.utils.isAddress(patientAddress)) { setSearchError("Invalid wallet address!"); return; }
    setSearching(true);
    try {
      const uc = new web3.eth.Contract(UserRegistry.abi, USER_REGISTRY_ADDRESS);
      const pc = new web3.eth.Contract(PolicyContract.abi, POLICY_CONTRACT_ADDRESS);
      const isReg = await uc.methods.checkPatientRegistered(patientAddress).call();
      if (!isReg) { setSearchError("Patient not registered!"); setSearching(false); return; }
      const patient = await uc.methods.getPatient(patientAddress).call();
      if (patient.status !== "Approved") { setSearchError("Patient KYC not approved!"); setSearching(false); return; }
      setPatientInfo(patient);
      const hasSub = await pc.methods.checkActivePolicy(patientAddress).call();
      if (!hasSub) { setSearchError("Patient has no active policy!"); setSearching(false); return; }
      const sub    = await pc.methods.getSubscription(patientAddress).call();
      const policy = await pc.methods.getPolicy(sub.policyId).call();
      setPolicyInfo({ ...sub, coverageLimit: policy.coverageLimit, copayPercentage: policy.copayPercentage, deductible: policy.deductible, policyName: policy.policyName });
    } catch (err) { setSearchError("Error: " + err.message); }
    setSearching(false);
  };

  // ── PAYOUT BREAKDOWN (client-side, live) ─────────────────────────
  useEffect(() => {
    if (!formData.claimAmount || !policyInfo) { setPayoutBreakdown(null); return; }
    const claimAmt     = parseFloat(formData.claimAmount);
    const deductible   = parseFloat(formatETH(policyInfo.deductible));
    const copayPct     = parseInt(policyInfo.copayPercentage.toString());
    const deductibleAmt = Math.min(claimAmt, deductible);
    const remaining    = claimAmt - deductibleAmt;
    const copayAmt     = (remaining * copayPct) / 100;
    setPayoutBreakdown({
      claimAmount: claimAmt,
      deductible:  deductibleAmt,
      copay:       copayAmt,
      patientPays: deductibleAmt + copayAmt,
      insurerPays: remaining - copayAmt,
    });
  }, [formData.claimAmount, policyInfo]);

  // ── FRAUD DETECTION ──────────────────────────────────────────────
  const runFraudDetection = async () => {
    if (!patientAddress || !formData.claimAmount || !policyInfo) return;
    const flags = [];
    try {
      const cc     = new web3.eth.Contract(ClaimContract.abi, CLAIM_CONTRACT_ADDRESS);
      const allIds = await cc.methods.getAllClaims().call();
      const patientClaims = [], hospitalClaims = [];
      for (const id of allIds) {
        try {
          const c = await cc.methods.getClaim(id).call();
          if (c.patientAddress?.toLowerCase()  === patientAddress.toLowerCase()) patientClaims.push(c);
          if (c.hospitalAddress?.toLowerCase() === account.toLowerCase())        hospitalClaims.push(c);
        } catch (_) {}
      }
      const amt      = parseFloat(formData.claimAmount);
      const admDate  = formData.admissionDate ? new Date(formData.admissionDate) : null;
      const disDate  = formData.dischargeDate ? new Date(formData.dischargeDate) : null;
      const txDate   = formData.treatmentDate ? new Date(formData.treatmentDate) : null;

      // Flag 1: duplicate within 30 days of admission
      if (admDate) {
        const recent = patientClaims.filter(c => {
          const ts = Number(c.submittedOn || 0) * 1000;
          return ts && Math.abs(admDate - new Date(ts)) / 86400000 <= 30;
        });
        if (recent.length > 0)
          flags.push({ level: "high", text: `Patient has ${recent.length} claim(s) within 30 days of this admission date.` });
      }
      // Flag 2: repeat claims in last 60 days
      const last60 = patientClaims.filter(c => {
        const ts = Number(c.submittedOn || 0) * 1000;
        return ts && (Date.now() - ts) / 86400000 <= 60;
      });
      if (last60.length > 0)
        flags.push({ level: "medium", text: `Patient has ${last60.length} prior claim(s) in the last 60 days — possible repeat billing.` });
      // Flag 3: hospital high frequency
      const recentHosp = hospitalClaims.filter(c => {
        const ts = Number(c.submittedOn || 0) * 1000;
        return ts && (Date.now() - ts) / 86400000 <= 7;
      });
      if (recentHosp.length >= 5)
        flags.push({ level: "medium", text: `This hospital has submitted ${recentHosp.length} claims in the last 7 days.` });
      // Flag 4: amount spike
      if (patientClaims.length >= 2) {
        const avg = patientClaims.reduce((s, c) => s + parseFloat(web3.utils.fromWei(c.claimAmount?.toString() || "0", "ether")), 0) / patientClaims.length;
        if (amt > avg * 2.5)
          flags.push({ level: "high", text: `Claim amount is ${(amt / avg).toFixed(1)}× the patient's historical average — unusual spike.` });
      }
      // Flag 5: ward rate vs length of stay
      const los  = parseInt(formData.lengthOfStay || 0);
      const ward = parseFloat(formData.wardCharges || 0);
      if (los > 0 && ward > 0 && (ward / los) > 0.05)
        flags.push({ level: "low", text: `Daily ward rate (${(ward / los).toFixed(4)} ETH/day) appears unusually high for ${los} day(s).` });
      // Flag 6: discharge before admission
      if (admDate && disDate && disDate < admDate)
        flags.push({ level: "high", text: "Discharge date is before admission date — data integrity issue." });
      // Flag 7: treatment date outside admission-discharge range
      if (admDate && disDate && txDate && (txDate < admDate || txDate > disDate))
        flags.push({ level: "medium", text: "Treatment date is outside the admission–discharge range." });
    } catch (e) { console.warn("Fraud detection error:", e.message); }
    setFraudFlags(flags);
  };

  useEffect(() => {
    if (patientAddress && formData.claimAmount && policyInfo) runFraudDetection();
    else setFraudFlags([]);
  }, [patientAddress, formData.claimAmount, formData.admissionDate, formData.dischargeDate,
      formData.treatmentDate, formData.lengthOfStay, formData.wardCharges, policyInfo]);

  // ── VERIFICATION SCORE ───────────────────────────────────────────
  useEffect(() => {
    if (!formData.claimAmount || !policyInfo || !formData.primaryDiagnosis) { setVerificationStatus(null); return; }
    const claimAmt      = parseFloat(formData.claimAmount);
    const coverageLimit = parseFloat(formatETH(policyInfo.coverageLimit));
    const calcTotal     = [formData.surgeryCharges, formData.otCharges, formData.anaesthesiaCharges,
      formData.wardCharges, formData.medicinesCharges, formData.labCharges]
      .reduce((s, v) => s + (parseFloat(v) || 0), 0);
    const admDate  = formData.admissionDate ? new Date(formData.admissionDate) : null;
    const disDate  = formData.dischargeDate ? new Date(formData.dischargeDate) : null;
    const today    = new Date(); today.setHours(23, 59, 59, 999);
    const validDates = admDate && disDate
      ? admDate <= disDate && disDate <= today && admDate <= today : true;
    const claimType         = (formData.treatmentName || "").toLowerCase();
    const hasSurgeryCharges = parseFloat(formData.surgeryCharges || 0) > 0;
    const hasOTCharges      = parseFloat(formData.otCharges || 0) > 0;
    const hasWardCharges    = parseFloat(formData.wardCharges || 0) > 0;
    let chargesConsistent   = true;
    if (claimType.includes("surgery") || claimType.includes("surgical"))
      chargesConsistent = hasSurgeryCharges || hasOTCharges;
    else if (claimType.includes("inpatient") || claimType.includes("hospitalization"))
      chargesConsistent = hasWardCharges;
    const checks = {
      withinCoverage:    claimAmt <= coverageLimit,
      amountMatches:     calcTotal === 0 || Math.abs(calcTotal - claimAmt) < 0.0001,
      hasDocumentation:  files.length > 0,
      hasDiagnosis:      formData.primaryDiagnosis.length > 0,
      hasDoctor:         formData.attendingDoctor.length > 0,
      hasICD:            formData.icdCode.length > 0,
      validDates,
      notHighValue:      claimAmt <= coverageLimit * 0.80,
      chargesConsistent,
    };
    const passed = Object.values(checks).filter(Boolean).length;
    const score  = Math.round((passed / Object.keys(checks).length) * 100);
    setVerificationStatus({
      score, checks,
      isHighValue: !checks.notHighValue,
      recommendation: score >= 80 ? "Auto-Approve Recommended" : score >= 60 ? "Manual Review Required" : "Additional Documentation Needed",
    });
  }, [formData, policyInfo, files]);

  // ── UPLOAD TO PINATA ─────────────────────────────────────────────
  const uploadToPinata = async () => {
    if (files.length === 0) throw new Error("Please upload at least one document!");
    setUploading(true);
    try {
      const fd = new FormData();
      for (let f of files) fd.append("file", f);
      fd.append("pinataMetadata", JSON.stringify({ name: "ClaimDocs_" + patientAddress + "_" + Date.now() }));
      const res  = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
        method: "POST",
        headers: { pinata_api_key: PINATA_API_KEY, pinata_secret_api_key: PINATA_SECRET_KEY },
        body: fd,
      });
      const data = await res.json();
      setUploading(false);
      return data.IpfsHash || "QmTestCID_" + Date.now();
    } catch { setUploading(false); return "QmTestCID_" + Date.now(); }
  };

  // ── SUBMIT ───────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting || uploading) return;
    setError(""); setSuccess(""); setUploadProgress(""); setSubmitting(true);
    try {
      setUploadProgress("⏳ Checking patient eligibility...");
      const uc = new web3.eth.Contract(UserRegistry.abi, USER_REGISTRY_ADDRESS);
      const isReg = await uc.methods.checkPatientRegistered(patientAddress).call();
      if (!isReg) throw new Error("Patient not registered!");
      const isApproved = await uc.methods.checkPatientApproved(patientAddress).call();
      if (!isApproved) throw new Error("Patient KYC not approved!");

      setUploadProgress("📤 Uploading documents to IPFS...");
      const docCID = await uploadToPinata();

      // ── Upload metadata JSON to IPFS ─────────────────────────────
      setUploadProgress("📋 Uploading claim metadata to IPFS...");
      const metadata = {
        treatmentName:      formData.treatmentName,
        treatmentDate:      formData.treatmentDate,
        admissionDate:      formData.admissionDate,
        dischargeDate:      formData.dischargeDate,
        description:        formData.description,
        primaryDiagnosis:   formData.primaryDiagnosis,
        icdCode:            formData.icdCode,
        procedurePerformed: formData.procedurePerformed,
        lengthOfStay:       formData.lengthOfStay,
        wardRoom:           formData.wardRoom,
        attendingDoctor:    formData.attendingDoctor,
        doctorRegNo:        formData.doctorRegNo,
        billingDetails: {
          surgeryCharges:      formData.surgeryCharges,
          otCharges:           formData.otCharges,
          anaesthesiaCharges:  formData.anaesthesiaCharges,
          wardCharges:         formData.wardCharges,
          medicinesCharges:    formData.medicinesCharges,
          labCharges:          formData.labCharges,
          totalAmount:         formData.claimAmount,
        },
        verificationStatus,
        fraudFlags,
        patientAddress,
        patientName:  patientInfo?.name,
        policyName:   policyInfo?.policyName,
        hospitalAddress: account,
        files: [{ fileName: files[0]?.name, cid: docCID }],
        uploadedAt: new Date().toISOString(),
      };

      let ipfsCID = docCID;
      try {
        const metaBlob = new Blob([JSON.stringify(metadata)], { type: "application/json" });
        const metaFile = new File([metaBlob], "claim-metadata.json", { type: "application/json" });
        const fd2 = new FormData();
        fd2.append("file", metaFile);
        fd2.append("pinataMetadata", JSON.stringify({ name: "ClaimMeta_" + patientAddress + "_" + Date.now() }));
        const res2 = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
          method: "POST",
          headers: { pinata_api_key: PINATA_API_KEY, pinata_secret_api_key: PINATA_SECRET_KEY },
          body: fd2,
        });
        const data2 = await res2.json();
        if (data2.IpfsHash) ipfsCID = data2.IpfsHash;
      } catch (metaErr) {
        console.warn("Metadata upload failed, using doc CID:", metaErr.message);
      }

      setUploadProgress("⛓️ Submitting claim to blockchain...");
      const treatmentDesc = `${formData.treatmentName}${formData.primaryDiagnosis ? " | Dx: " + formData.primaryDiagnosis : ""}${formData.attendingDoctor ? " | Dr: " + formData.attendingDoctor : ""}`;
      const cc = new web3.eth.Contract(ClaimContract.abi, CLAIM_CONTRACT_ADDRESS);
      await cc.methods.submitClaim(
        patientAddress,
        formData.treatmentName,
        formData.treatmentDate,
        treatmentDesc,
        web3.utils.toWei(formData.claimAmount, "ether"),
        ipfsCID
      ).send({ from: account });

      setUploadProgress("");
      setSuccess("✅ Claim submitted successfully! The patient must confirm from their dashboard.");
      setTimeout(() => navigate("/hospital/dashboard"), 2000);
    } catch (err) { setError("❌ Error: " + err.message); setUploadProgress(""); }
    setSubmitting(false); setUploading(false);
  };

  // ── RENDER ───────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .sc-page { min-height: 100vh; background: #F5F7FA; font-family: 'Inter', sans-serif; padding: 2rem; }
        .sc-container { max-width: 1000px; margin: 0 auto; }
        .sc-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 2rem; }
        .sc-title { font-size: 1.75rem; font-weight: 700; color: #2D3748; }
        .back-btn { background: #fff; color: #4A5568; padding: 0.625rem 1.25rem; border: 1px solid #E2E8F0; border-radius: 8px; font-size: 0.875rem; font-weight: 600; cursor: pointer; transition: all 0.2s; }
        .back-btn:hover { background: #F7FAFC; border-color: #CBD5E0; }
        .step-card { background: #fff; border-radius: 12px; padding: 2rem; margin-bottom: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .step-header { font-size: 1.125rem; font-weight: 600; color: #2D3748; margin-bottom: 1.5rem; padding-bottom: 0.75rem; border-bottom: 2px solid #E2E8F0; }
        .search-row { display: flex; gap: 1rem; margin-bottom: 1rem; }
        .search-input { flex: 1; padding: 0.75rem 1rem; border: 1px solid #E2E8F0; border-radius: 8px; font-size: 0.875rem; font-family: 'Inter', monospace; }
        .search-btn { background: #3182CE; color: #fff; padding: 0.75rem 2rem; border: none; border-radius: 8px; font-size: 0.875rem; font-weight: 600; cursor: pointer; transition: all 0.2s; }
        .search-btn:hover { background: #2C5282; }
        .search-btn:disabled { background: #CBD5E0; cursor: not-allowed; }
        .patient-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; margin-bottom: 1.5rem; }
        .info-item { display: flex; flex-direction: column; gap: 0.25rem; }
        .info-label { font-size: 0.75rem; color: #718096; font-weight: 600; }
        .info-value { font-size: 0.875rem; color: #2D3748; font-weight: 500; }
        .policy-card { background: linear-gradient(135deg, #E9D5FF 0%, #DDD6FE 100%); border-radius: 12px; padding: 1.5rem; }
        .policy-card-title { display: flex; align-items: center; gap: 0.5rem; font-size: 1rem; font-weight: 600; color: #6B21A8; margin-bottom: 1rem; }
        .policy-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; }
        .policy-label { font-size: 0.75rem; color: #7C3AED; font-weight: 600; }
        .policy-value { font-size: 0.875rem; color: #6B21A8; font-weight: 600; }
        .form-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1.5rem; margin-bottom: 1.5rem; }
        .form-group { display: flex; flex-direction: column; gap: 0.5rem; }
        .form-group.full { grid-column: 1 / -1; }
        .form-label { font-size: 0.875rem; font-weight: 600; color: #2D3748; }
        .form-input { padding: 0.75rem 1rem; border: 1px solid #E2E8F0; border-radius: 8px; font-size: 0.875rem; font-family: 'Inter', sans-serif; }
        .form-input:focus { outline: none; border-color: #3182CE; box-shadow: 0 0 0 3px rgba(49,130,206,0.1); }
        .form-textarea { padding: 0.75rem 1rem; border: 1px solid #E2E8F0; border-radius: 8px; font-size: 0.875rem; font-family: 'Inter', sans-serif; resize: vertical; min-height: 100px; }
        .file-input { padding: 0.75rem; border: 2px dashed #E2E8F0; border-radius: 8px; font-size: 0.875rem; cursor: pointer; }
        .section-divider { font-size: 1rem; font-weight: 700; color: #1E293B; margin-bottom: 1rem; padding-bottom: 0.5rem; border-bottom: 2px solid #E2E8F0; }
        .payout-box { background: #F7FAFC; border-radius: 12px; padding: 1.5rem; margin-top: 1.5rem; }
        .payout-title { display: flex; align-items: center; gap: 0.5rem; font-size: 1rem; font-weight: 600; color: #2D3748; margin-bottom: 1rem; }
        .payout-row { display: flex; justify-content: space-between; padding: 0.75rem 0; border-bottom: 1px solid #E2E8F0; }
        .payout-row:last-child { border-bottom: none; border-top: 2px solid #E2E8F0; padding-top: 1rem; margin-top: 0.5rem; }
        .payout-label { font-size: 0.875rem; color: #718096; }
        .payout-val { font-size: 0.875rem; font-weight: 600; color: #2D3748; }
        .payout-val.green { font-size: 1rem; color: #38A169; }
        .payout-val.red { color: #E53E3E; }
        .submit-btn { width: 100%; background: #3182CE; color: #fff; padding: 1rem; border: none; border-radius: 8px; font-size: 1rem; font-weight: 600; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 0.5rem; margin-top: 2rem; }
        .submit-btn:hover { background: #2C5282; }
        .submit-btn:disabled { background: #CBD5E0; cursor: not-allowed; }
        .msg-error    { background: #FED7D7; color: #C53030; padding: 1rem; border-radius: 8px; margin-bottom: 1rem; font-size: 0.875rem; }
        .msg-success  { background: #C6F6D5; color: #2F855A; padding: 1rem; border-radius: 8px; margin-bottom: 1rem; font-size: 0.875rem; }
        .msg-progress { background: #BEE3F8; color: #2C5282; padding: 1rem; border-radius: 8px; margin-bottom: 1rem; font-size: 0.875rem; }
        @media (max-width: 768px) {
          .sc-page { padding: 1rem; }
          .form-grid, .patient-grid, .policy-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="sc-page">
        <div className="sc-container">

          {/* Header */}
          <div className="sc-header">
            <h1 className="sc-title">Submit Insurance Claim</h1>
            <button className="back-btn" onClick={() => navigate("/hospital/dashboard")}>← Back to Dashboard</button>
          </div>

          {/* Banners */}
          {error        && <div className="msg-error">{error}</div>}
          {success      && <div className="msg-success">{success}</div>}
          {uploadProgress && <div className="msg-progress">{uploadProgress}</div>}

          {/* STEP 1 */}
          <div className="step-card">
            <h2 className="step-header">Step 1 — Find Patient</h2>
            <div className="search-row">
              <input
                type="text"
                className="search-input"
                placeholder="Enter patient wallet address (0x...)"
                value={patientAddress}
                onChange={(e) => setPatientAddress(e.target.value)}
              />
              <button
                className="search-btn"
                onClick={lookupPatient}
                disabled={searching || !patientAddress}
              >
                {searching ? "Searching..." : "🔍 Search"}
              </button>
            </div>
            {searchError && <div className="msg-error">{searchError}</div>}

            {patientInfo && (
              <>
                <div className="patient-grid">
                  <div className="info-item"><span className="info-label">Name</span><span className="info-value">{patientInfo.name}</span></div>
                  <div className="info-item"><span className="info-label">Mobile</span><span className="info-value">{patientInfo.mobile}</span></div>
                  <div className="info-item"><span className="info-label">Gender</span><span className="info-value">{patientInfo.gender}</span></div>
                  <div className="info-item"><span className="info-label">Status</span><span className="info-value">{patientInfo.status}</span></div>
                </div>
                {policyInfo && (
                  <div className="policy-card">
                    <div className="policy-card-title">🛡️ Active Policy</div>
                    <div className="policy-grid">
                      <div className="info-item"><span className="policy-label">Policy</span><span className="policy-value">{policyInfo.policyName}</span></div>
                      <div className="info-item"><span className="policy-label">Coverage Limit</span><span className="policy-value">{formatETH(policyInfo.coverageLimit)} ETH</span></div>
                      <div className="info-item"><span className="policy-label">Co-pay</span><span className="policy-value">{policyInfo.copayPercentage.toString()}%</span></div>
                      <div className="info-item"><span className="policy-label">Deductible</span><span className="policy-value">{formatETH(policyInfo.deductible)} ETH</span></div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* STEP 2 — only after patient found */}
          {patientInfo && policyInfo && (
            <form onSubmit={handleSubmit}>
              <div className="step-card">
                <h2 className="step-header">Step 2 — Claim Details</h2>
                <div className="form-grid">

                  {/* Treatment Info */}
                  <div className="form-group">
                    <label className="form-label">Treatment / Procedure Name *</label>
                    <input type="text" className="form-input" placeholder="e.g., Arthroscopic Partial Medial Meniscectomy"
                      value={formData.treatmentName} onChange={(e) => setFormData({ ...formData, treatmentName: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Primary Diagnosis *</label>
                    <input type="text" className="form-input" placeholder="e.g., Medial Meniscus Tear — Right Knee"
                      value={formData.primaryDiagnosis} onChange={(e) => setFormData({ ...formData, primaryDiagnosis: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">ICD-10 Code</label>
                    <input type="text" className="form-input" placeholder="e.g., M23.201"
                      value={formData.icdCode} onChange={(e) => setFormData({ ...formData, icdCode: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Procedure Performed</label>
                    <input type="text" className="form-input" placeholder="e.g., Arthroscopic Surgery"
                      value={formData.procedurePerformed} onChange={(e) => setFormData({ ...formData, procedurePerformed: e.target.value })} />
                  </div>

                  {/* Dates */}
                  <div className="form-group">
                    <label className="form-label">Admission Date *</label>
                    <input type="date" className="form-input"
                      value={formData.admissionDate} onChange={(e) => setFormData({ ...formData, admissionDate: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Discharge Date *</label>
                    <input type="date" className="form-input"
                      value={formData.dischargeDate} onChange={(e) => setFormData({ ...formData, dischargeDate: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Treatment Date *</label>
                    <input type="date" className="form-input"
                      value={formData.treatmentDate} onChange={(e) => setFormData({ ...formData, treatmentDate: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Length of Stay (days)</label>
                    <input type="number" className="form-input" placeholder="e.g., 2"
                      value={formData.lengthOfStay} onChange={(e) => setFormData({ ...formData, lengthOfStay: e.target.value })} />
                  </div>

                  {/* Ward & Doctor */}
                  <div className="form-group">
                    <label className="form-label">Ward / Room</label>
                    <input type="text" className="form-input" placeholder="e.g., Orthopaedic Ward — Room 204"
                      value={formData.wardRoom} onChange={(e) => setFormData({ ...formData, wardRoom: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Attending Doctor *</label>
                    <input type="text" className="form-input" placeholder="e.g., Dr. Ramesh Nair, MS (Ortho)"
                      value={formData.attendingDoctor} onChange={(e) => setFormData({ ...formData, attendingDoctor: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Doctor Registration No</label>
                    <input type="text" className="form-input" placeholder="e.g., TN-MED-48291"
                      value={formData.doctorRegNo} onChange={(e) => setFormData({ ...formData, doctorRegNo: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Upload Documents (discharge summary, bills) *</label>
                    <input type="file" className="file-input" multiple onChange={(e) => setFiles(Array.from(e.target.files))} required />
                  </div>

                  {/* Billing Breakdown */}
                  <div className="form-group full">
                    <div className="section-divider">Billing Breakdown</div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Surgery Charges (ETH)</label>
                    <input type="number" step="0.0001" className="form-input" placeholder="e.g., 1.0000"
                      value={formData.surgeryCharges} onChange={(e) => setFormData({ ...formData, surgeryCharges: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">OT Charges (ETH)</label>
                    <input type="number" step="0.0001" className="form-input" placeholder="e.g., 0.2000"
                      value={formData.otCharges} onChange={(e) => setFormData({ ...formData, otCharges: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Anaesthesia Charges (ETH)</label>
                    <input type="number" step="0.0001" className="form-input" placeholder="e.g., 0.1000"
                      value={formData.anaesthesiaCharges} onChange={(e) => setFormData({ ...formData, anaesthesiaCharges: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Ward Charges (ETH)</label>
                    <input type="number" step="0.0001" className="form-input" placeholder="e.g., 0.1000"
                      value={formData.wardCharges} onChange={(e) => setFormData({ ...formData, wardCharges: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Medicines & Consumables (ETH)</label>
                    <input type="number" step="0.0001" className="form-input" placeholder="e.g., 0.0700"
                      value={formData.medicinesCharges} onChange={(e) => setFormData({ ...formData, medicinesCharges: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Lab Investigations (ETH)</label>
                    <input type="number" step="0.0001" className="form-input" placeholder="e.g., 0.0300"
                      value={formData.labCharges} onChange={(e) => setFormData({ ...formData, labCharges: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Total Claim Amount (ETH) *</label>
                    <input type="number" step="0.0001" className="form-input" placeholder="e.g., 1.5000"
                      value={formData.claimAmount} onChange={(e) => setFormData({ ...formData, claimAmount: e.target.value })}
                      required style={{ fontWeight: 700, fontSize: "1.125rem" }} />
                  </div>
                  <div className="form-group full">
                    <label className="form-label">Additional Notes / Discharge Instructions</label>
                    <textarea className="form-textarea" placeholder="Enter any additional medical notes, discharge instructions, or follow-up requirements..."
                      value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
                  </div>
                </div>

                {/* Verification Score */}
                {verificationStatus && (
                  <div style={{
                    background: verificationStatus.score >= 80 ? "#E8F5E9" : verificationStatus.score >= 60 ? "#FFFBEB" : "#FFEBEE",
                    border: `2px solid ${verificationStatus.score >= 80 ? "#22C55E" : verificationStatus.score >= 60 ? "#F59E0B" : "#EF4444"}`,
                    borderRadius: 12, padding: "1.5rem", marginTop: "1.5rem"
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
                      <span style={{ fontSize: "1.5rem" }}>
                        {verificationStatus.score >= 80 ? "✅" : verificationStatus.score >= 60 ? "⚠️" : "❌"}
                      </span>
                      <div>
                        <div style={{ fontSize: "1rem", fontWeight: 700, color: "#1E293B" }}>
                          Verification Score: {verificationStatus.score}%
                        </div>
                        <div style={{ fontSize: "0.875rem", color: "#475569", marginTop: "0.25rem" }}>
                          {verificationStatus.recommendation}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "0.5rem", fontSize: "0.875rem" }}>
                      {[
                        ["withinCoverage",    "Within Coverage Limit"],
                        ["amountMatches",     "Amount Breakdown Matches"],
                        ["hasDocumentation",  "Documents Uploaded"],
                        ["hasDiagnosis",      "Diagnosis Provided"],
                        ["hasDoctor",         "Doctor Information"],
                        ["hasICD",            "ICD Code Provided"],
                        ["validDates",        "Admission / Discharge Dates Valid"],
                        ["chargesConsistent", "Charges Match Claim Type"],
                      ].map(([key, label]) => (
                        <div key={key} style={{ color: verificationStatus.checks[key] ? "#22C55E" : "#EF4444" }}>
                          {verificationStatus.checks[key] ? "✅" : "❌"} {label}
                        </div>
                      ))}
                      <div style={{ color: verificationStatus.checks.notHighValue ? "#22C55E" : "#FBBF24" }}>
                        {verificationStatus.checks.notHighValue ? "✅" : "⚠️"}{" "}
                        {verificationStatus.isHighValue ? "High-Value Claim — Enhanced Review" : "Amount Within Normal Range"}
                      </div>
                    </div>
                  </div>
                )}

                {/* Fraud Detection */}
                {fraudFlags.length > 0 && (
                  <div style={{ background: "#FFF5F5", border: "2px solid #FC8181", borderRadius: 12, padding: "1.25rem 1.5rem", marginTop: "1rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
                      <span style={{ fontSize: "1.2rem" }}>🚨</span>
                      <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "#DC2626" }}>
                        Fraud Risk Indicators Detected ({fraudFlags.length})
                      </span>
                    </div>
                    {fraudFlags.map((f, i) => (
                      <div key={i} style={{
                        display: "flex", alignItems: "flex-start", gap: "0.5rem",
                        padding: "0.5rem 0.75rem", marginBottom: "0.4rem", borderRadius: 6,
                        background: f.level === "high" ? "#FEE2E2" : f.level === "medium" ? "#FEF3C7" : "#FEFCBF",
                        borderLeft: `3px solid ${f.level === "high" ? "#EF4444" : "#D97706"}`
                      }}>
                        <span style={{ fontSize: "0.75rem", fontWeight: 700, color: f.level === "high" ? "#DC2626" : f.level === "medium" ? "#B45309" : "#92400E", textTransform: "uppercase", flexShrink: 0 }}>
                          {f.level}
                        </span>
                        <span style={{ fontSize: "0.82rem", color: "#1E293B" }}>{f.text}</span>
                      </div>
                    ))}
                    <p style={{ fontSize: "0.75rem", color: "#64748B", margin: "0.5rem 0 0" }}>
                      These flags are advisory. The insurer will review them during claim assessment.
                    </p>
                  </div>
                )}

                {/* Payout Breakdown */}
                {payoutBreakdown && (
                  <div className="payout-box">
                    <div className="payout-title">💰 Payout Breakdown</div>
                    <div className="payout-row">
                      <span className="payout-label">Claim Amount</span>
                      <span className="payout-val">{payoutBreakdown.claimAmount.toFixed(4)} ETH</span>
                    </div>
                    <div className="payout-row">
                      <span className="payout-label">Deductible Applied</span>
                      <span className="payout-val">− {payoutBreakdown.deductible.toFixed(4)} ETH</span>
                    </div>
                    <div className="payout-row">
                      <span className="payout-label">Co-pay Applied</span>
                      <span className="payout-val">− {payoutBreakdown.copay.toFixed(4)} ETH</span>
                    </div>
                    <div className="payout-row">
                      <span className="payout-label">Patient Pays (Deductible + Co-pay)</span>
                      <span className="payout-val red">{payoutBreakdown.patientPays.toFixed(4)} ETH</span>
                    </div>
                    <div className="payout-row">
                      <span className="payout-label">Insurer Pays → Hospital</span>
                      <span className="payout-val green">{payoutBreakdown.insurerPays.toFixed(4)} ETH</span>
                    </div>
                  </div>
                )}

                <button type="submit" className="submit-btn" disabled={submitting || uploading}>
                  {submitting || uploading ? "⏳ Submitting..." : "🚀 Submit Claim"}
                </button>
              </div>
            </form>
          )}

        </div>
      </div>
    </>
  );
}

export default SubmitClaim;
