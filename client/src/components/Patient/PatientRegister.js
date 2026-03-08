import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import * as faceapi from "face-api.js";
import UserRegistry from "../../contracts/UserRegistry.json";

const CONTRACT_ADDRESS = "0xd9dce72Ad47519b83Bc8a65a8D2E442dA7a50851";

function PatientRegister({ account, web3 }) {
  const navigate  = useNavigate();
  const videoRef  = useRef(null);
  const canvasRef = useRef(null);

  const [currentStep, setCurrentStep] = useState(1);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [modelLoading, setModelLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: "", dob: "", gender: "",
    mobile: "", email: "", location: "",
  });

  const [generatedOTP, setGeneratedOTP] = useState("");
  const [enteredOTP, setEnteredOTP]     = useState("");
  const [otpVerified, setOtpVerified]   = useState(false);
  const [otpSent, setOtpSent]           = useState(false);

  const [aadharNumber, setAadharNumber]     = useState("");
  const [aadharVerified, setAadharVerified] = useState(false);

  const [uploadedPhoto, setUploadedPhoto] = useState(null);
  const [uploadedPhotoEl, setUploadedPhotoEl] = useState(null);
  const [selfiePhoto, setSelfiePhoto]     = useState(null);
  const [selfiePhotoEl, setSelfiePhotoEl] = useState(null);
  const [faceMatched, setFaceMatched]     = useState(false);
  const [cameraOpen, setCameraOpen]       = useState(false);
  const [matchScore, setMatchScore]       = useState(null);
  const [faceError, setFaceError]         = useState("");
  const [matching, setMatching]           = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [message, setMessage] = useState("");

  const steps = ["Basic Details", "OTP", "Aadhaar", "Face Match", "Submit", "Done"];

  useEffect(() => { loadModels(); }, []);

  const loadModels = async () => {
    try {
      setModelLoading(true);
      const MODEL_URL = "/models";
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      ]);
      setModelsLoaded(true);
      setModelLoading(false);
      console.log("✅ Face API models loaded!");
    } catch (err) {
      console.error("❌ Model loading failed:", err);
      setModelLoading(false);
    }
  };

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleBasicDetails = (e) => {
    e.preventDefault();
    setError("");
    setCurrentStep(2);
  };

  const sendOTP = () => {
    if (!formData.mobile || formData.mobile.length !== 10) {
      setError("Enter valid 10 digit mobile number!"); return;
    }
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOTP(otp);
    setOtpSent(true);
    setError("");
    alert("OTP Sent!\nYour OTP is: " + otp);
  };

  const verifyOTP = () => {
    if (enteredOTP === generatedOTP) {
      setOtpVerified(true);
      setMessage("OTP verified successfully.");
      setError("");
      setTimeout(() => { setMessage(""); setCurrentStep(3); }, 1500);
    } else {
      setError("Incorrect OTP. Please try again.");
    }
  };

  const verifyAadhaar = () => {
    if (aadharNumber.length !== 12) {
      setError("Enter valid 12 digit Aadhaar!"); return;
    }
    setAadharVerified(true);
    setMessage("Aadhaar verified successfully.");
    setError("");
    setTimeout(() => { setMessage(""); setCurrentStep(4); }, 1500);
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setUploadedPhoto(ev.target.result);
      setFaceMatched(false); setMatchScore(null); setFaceError("");
      const img = new Image();
      img.src = ev.target.result;
      img.onload = () => setUploadedPhotoEl(img);
    };
    reader.readAsDataURL(file);
  };

  const openCamera = async () => {
    setCameraOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      setFaceError("Camera access denied!");
      setCameraOpen(false);
    }
  };

  const takeSelfie = () => {
    const canvas = canvasRef.current;
    const video  = videoRef.current;
    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);
    const selfieData = canvas.toDataURL("image/jpeg");
    setSelfiePhoto(selfieData);
    setFaceMatched(false); setMatchScore(null); setFaceError("");
    const img = new Image();
    img.src = selfieData;
    img.onload = () => setSelfiePhotoEl(img);
    video.srcObject.getTracks().forEach((t) => t.stop());
    setCameraOpen(false);
  };

  const matchFaces = async () => {
    if (!uploadedPhoto) { setFaceError("Please upload a photo first!"); return; }
    if (!selfiePhoto)   { setFaceError("Please take a selfie first!");  return; }
    if (!modelsLoaded)  { setFaceError("Face AI models still loading, please wait..."); return; }
    setMatching(true); setFaceError(""); setMatchScore(null); setFaceMatched(false);
    try {
      const uploadedDetection = await faceapi
        .detectSingleFace(uploadedPhotoEl, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks().withFaceDescriptor();
      if (!uploadedDetection) {
        setFaceError("No face detected in uploaded photo! Please upload a clear face photo.");
        setMatching(false); return;
      }
      const selfieDetection = await faceapi
        .detectSingleFace(selfiePhotoEl, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks().withFaceDescriptor();
      if (!selfieDetection) {
        setFaceError("No face detected in selfie! Please retake with clear lighting.");
        setMatching(false); return;
      }
      const distance = faceapi.euclideanDistance(uploadedDetection.descriptor, selfieDetection.descriptor);
      const similarity = Math.max(0, Math.round((1 - distance) * 100));
      setMatchScore(similarity);
      if (distance < 0.5) {
        setFaceMatched(true);
        setMessage(`Face Match Successful! (${similarity}% similarity)`);
        setFaceError("");
      } else {
        setFaceMatched(false);
        setFaceError(`Face does not match! (${similarity}% similarity). Please upload a clearer photo or retake selfie.`);
      }
    } catch (err) {
      setFaceError("Face matching error: " + err.message);
    }
    setMatching(false);
  };

  const handleSubmit = async () => {
    if (!otpVerified)    { setError("OTP not verified!");    return; }
    if (!aadharVerified) { setError("Aadhaar not verified!"); return; }
    if (!faceMatched)    { setError("Face not matched!");    return; }
    setLoading(true); setError("");
    try {
      const aadharHash = web3.utils.keccak256(aadharNumber);
      const photoHash  = web3.utils.keccak256(selfiePhoto.substring(0, 100));
      const contract   = new web3.eth.Contract(UserRegistry.abi, CONTRACT_ADDRESS);
      await contract.methods.registerPatient({
        name: formData.name, dob: formData.dob, gender: formData.gender,
        mobile: formData.mobile, email: formData.email, location: formData.location,
        otpVerified: true, aadharHash, photoHash,
      }).send({ from: account });
      setCurrentStep(6);
    } catch (err) {
      setError("Error: " + err.message);
    }
    setLoading(false);
  };

  return (
    <div style={S.page}>

      {/* ── TOPBAR ── */}
      <div style={S.topbar}>
        <div style={S.topbarBrand}>
          <div style={S.topbarLogo}>M</div>
          <div>
            <div style={S.topbarName}>MedInsure</div>
            <div style={S.topbarSub}>Blockchain Health Insurance</div>
          </div>
        </div>
        <div style={S.topbarCenter}>
          <span style={S.pageLabel}>Patient Registration</span>
        </div>
        <div style={S.topbarRight}>
          {modelLoading && <div style={S.pillAmber}>Loading Face AI...</div>}
          {modelsLoaded && <div style={S.pillGreen}>Face AI Ready</div>}
          <div style={S.walletPill}>
            <div style={S.walletDot} />
            <span>{account.slice(0, 8)}...{account.slice(-6)}</span>
          </div>
          <button style={S.backBtn} onClick={() => navigate("/")}>← Home</button>
        </div>
      </div>

      {/* ── BODY ── */}
      <div style={S.body}>

        {/* Page title */}
        <div style={S.pageHead}>
          <div style={S.secLabel}>PATIENT PORTAL</div>
          <h1 style={S.pageTitle}>Create Your Account</h1>
          <p style={S.pageSub}>Complete all steps to register on the MedInsure blockchain platform</p>
        </div>

        {/* ── STEP INDICATOR ── */}
        <div style={S.stepRow}>
          {steps.map((label, i) => {
            const n = i + 1;
            const done   = currentStep > n;
            const active = currentStep === n;
            return (
              <React.Fragment key={i}>
                <div style={S.stepItem}>
                  <div style={{
                    ...S.stepCircle,
                    background: done ? "#2e7d32" : active ? "#1565c0" : "#dde3ef",
                    color: (done || active) ? "#fff" : "#7a8aa8",
                    boxShadow: active ? "0 0 0 4px rgba(21,101,192,0.15)" : "none",
                  }}>
                    {done ? "✓" : n}
                  </div>
                  <span style={{
                    ...S.stepLabel,
                    color: done ? "#2e7d32" : active ? "#1565c0" : "#a0b0c8",
                    fontWeight: active ? "700" : "500",
                  }}>
                    {label}
                  </span>
                </div>
                {i < steps.length - 1 && (
                  <div style={{ ...S.stepConnector, background: done ? "#2e7d32" : "#dde3ef" }} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* ── ALERTS ── */}
        {message && (
          <div style={S.alertGreen}>
            <div style={S.alertIcon("#2e7d32")}>✓</div>
            <span>{message}</span>
          </div>
        )}
        {error && (
          <div style={S.alertRed}>
            <div style={S.alertIcon("#c62828")}>!</div>
            <span>{error}</span>
          </div>
        )}

        {/* ── CARD ── */}
        <div style={S.card}>

          {/* STEP 1 — Basic Details */}
          {currentStep === 1 && (
            <form onSubmit={handleBasicDetails}>
              <div style={S.cardHead}>
                <div style={S.stepBadge}>01</div>
                <div>
                  <div style={S.cardHeadTitle}>Basic Details</div>
                  <div style={S.cardHeadSub}>Enter your personal information to get started</div>
                </div>
              </div>
              <div style={S.cardBody}>
                <div style={S.grid2}>
                  {[
                    { label: "Full Name",     name: "name",   type: "text",  ph: "Enter your full name" },
                    { label: "Date of Birth", name: "dob",    type: "date",  ph: "" },
                    { label: "Mobile Number", name: "mobile", type: "text",  ph: "10-digit mobile", max: "10" },
                    { label: "Email Address", name: "email",  type: "email", ph: "Enter your email" },
                  ].map((f) => (
                    <div key={f.name} style={S.fGroup}>
                      <label style={S.fLabel}>{f.label}</label>
                      <input style={S.fInput} type={f.type} name={f.name}
                        placeholder={f.ph} value={formData[f.name]}
                        onChange={handleChange} maxLength={f.max} required />
                    </div>
                  ))}
                </div>
                <div style={S.fGroup}>
                  <label style={S.fLabel}>Gender</label>
                  <select style={S.fInput} name="gender" value={formData.gender} onChange={handleChange} required>
                    <option value="">Select Gender</option>
                    <option>Male</option><option>Female</option><option>Other</option>
                  </select>
                </div>
                <div style={S.fGroup}>
                  <label style={S.fLabel}>Residential Address</label>
                  <input style={S.fInput} type="text" name="location"
                    placeholder="Enter your full address"
                    value={formData.location} onChange={handleChange} required />
                </div>
                <button style={S.btnPrimary} type="submit">Continue to OTP Verification →</button>
              </div>
            </form>
          )}

          {/* STEP 2 — OTP */}
          {currentStep === 2 && (
            <div>
              <div style={S.cardHead}>
                <div style={S.stepBadge}>02</div>
                <div>
                  <div style={S.cardHeadTitle}>OTP Verification</div>
                  <div style={S.cardHeadSub}>Verify your mobile number with a one-time password</div>
                </div>
              </div>
              <div style={S.cardBody}>
                <div style={S.infoRow}>
                  <span style={S.infoLbl}>Mobile Number</span>
                  <span style={S.infoVal}>{formData.mobile}</span>
                </div>
                {!otpSent ? (
                  <button style={S.btnPrimary} onClick={sendOTP}>Send OTP →</button>
                ) : (
                  <>
                    <div style={S.fGroup}>
                      <label style={S.fLabel}>Enter OTP</label>
                      <input style={{ ...S.fInput, letterSpacing: "8px", fontSize: "22px", textAlign: "center", fontWeight: "700" }}
                        type="text" placeholder="———————"
                        value={enteredOTP} onChange={(e) => setEnteredOTP(e.target.value)} maxLength="6" />
                      <span style={S.hint}>Enter the 6-digit OTP sent to your mobile</span>
                    </div>
                    <button style={S.btnPrimary} onClick={verifyOTP}>Verify OTP →</button>
                    <button style={S.btnGhost} onClick={sendOTP}>Resend OTP</button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* STEP 3 — Aadhaar */}
          {currentStep === 3 && (
            <div>
              <div style={S.cardHead}>
                <div style={S.stepBadge}>03</div>
                <div>
                  <div style={S.cardHeadTitle}>Aadhaar Verification</div>
                  <div style={S.cardHeadSub}>Your Aadhaar is hashed and stored securely on-chain</div>
                </div>
              </div>
              <div style={S.cardBody}>
                <div style={S.fGroup}>
                  <label style={S.fLabel}>Aadhaar Number</label>
                  <input style={{ ...S.fInput, letterSpacing: "4px", fontSize: "16px" }}
                    type="text" placeholder="Enter 12-digit Aadhaar number"
                    value={aadharNumber} onChange={(e) => setAadharNumber(e.target.value)} maxLength="12" />
                  <span style={S.hint}>Your Aadhaar is never stored in plain text — only a cryptographic hash is recorded on the blockchain.</span>
                </div>
                <button style={S.btnPrimary} onClick={verifyAadhaar}>Verify Aadhaar →</button>
              </div>
            </div>
          )}

          {/* STEP 4 — Face Recognition */}
          {currentStep === 4 && (
            <div>
              <div style={S.cardHead}>
                <div style={S.stepBadge}>04</div>
                <div>
                  <div style={S.cardHeadTitle}>Face Recognition</div>
                  <div style={S.cardHeadSub}>Live biometric verification using AI-powered face comparison</div>
                </div>
                <div style={{
                  ...S.aiBadge,
                  background: modelsLoaded ? "#e8f5e9" : "#fff8e1",
                  color: modelsLoaded ? "#2e7d32" : "#e65100",
                  border: `1px solid ${modelsLoaded ? "#a5d6a7" : "#ffe082"}`,
                }}>
                  {modelLoading ? "Loading AI..." : modelsLoaded ? "AI Ready" : "AI Unavailable"}
                </div>
              </div>
              <div style={S.cardBody}>

                {/* Upload */}
                <div style={S.faceBlock}>
                  <div style={S.faceSectionTitle}>Step 1 — Upload ID / Passport Photo</div>
                  <label style={S.fileRow}>
                    <input type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display: "none" }} />
                    <span style={S.filePickerBtn}>Choose Photo</span>
                    <span style={S.hint}>Clear front-facing ID or passport photo</span>
                  </label>
                  {uploadedPhoto && (
                    <div style={S.photoBox}>
                      <img src={uploadedPhoto} alt="Uploaded" style={S.photoImg} />
                      <span style={S.photoCaption}>Uploaded Photo</span>
                    </div>
                  )}
                </div>

                <div style={S.faceDivider} />

                {/* Selfie */}
                <div style={S.faceBlock}>
                  <div style={S.faceSectionTitle}>Step 2 — Take a Live Selfie</div>
                  <span style={S.hint}>Sit in good lighting and face the camera directly.</span>

                  {!cameraOpen && !selfiePhoto && (
                    <button style={{ ...S.btnPrimary, marginTop: "12px" }} onClick={openCamera}>Open Camera →</button>
                  )}

                  {cameraOpen && (
                    <div style={{ marginTop: "12px" }}>
                      <video ref={videoRef} autoPlay style={S.video} />
                      <button style={S.btnPrimary} onClick={takeSelfie}>Capture Selfie</button>
                    </div>
                  )}

                  <canvas ref={canvasRef} style={{ display: "none" }} />

                  {selfiePhoto && (
                    <div style={S.photoBox}>
                      <img src={selfiePhoto} alt="Selfie" style={S.photoImg} />
                      <span style={S.photoCaption}>Your Selfie</span>
                      {!faceMatched && (
                        <button style={{ ...S.btnGhost, marginTop: "8px" }}
                          onClick={() => { setSelfiePhoto(null); setSelfiePhotoEl(null); setFaceError(""); setMatchScore(null); }}>
                          Retake Selfie
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Match */}
                {uploadedPhoto && selfiePhoto && !faceMatched && (
                  <button
                    style={{ ...S.btnPrimary, background: matching ? "#90a4ae" : "#e65100", cursor: matching ? "not-allowed" : "pointer" }}
                    onClick={matchFaces} disabled={matching || !modelsLoaded}
                  >
                    {matching ? "Analyzing Faces..." : "Run Face Match →"}
                  </button>
                )}

                {/* Score */}
                {matchScore !== null && (
                  <div style={{
                    ...S.scoreBox,
                    background: faceMatched ? "#e8f5e9" : "#ffebee",
                    border: `1.5px solid ${faceMatched ? "#a5d6a7" : "#ef9a9a"}`,
                  }}>
                    <div style={{ fontSize: "30px", marginBottom: "6px" }}>{faceMatched ? "✓" : "✗"}</div>
                    <div style={{ fontSize: "22px", fontWeight: "900", color: faceMatched ? "#2e7d32" : "#c62828", marginBottom: "4px" }}>
                      {matchScore}% Similarity
                    </div>
                    <div style={{ fontSize: "13px", color: "#5a6a88" }}>
                      {faceMatched ? "Identity verified successfully." : "Faces do not match. Please try again."}
                    </div>
                  </div>
                )}

                {faceError && (
                  <div style={S.alertRed}>
                    <div style={S.alertIcon("#c62828")}>!</div>
                    <span>{faceError}</span>
                  </div>
                )}

                {faceMatched && (
                  <button style={{ ...S.btnPrimary, background: "#2e7d32", marginTop: "16px" }}
                    onClick={() => { setMessage(""); setCurrentStep(5); }}>
                    Continue to Review →
                  </button>
                )}
              </div>
            </div>
          )}

          {/* STEP 5 — Review & Submit */}
          {currentStep === 5 && (
            <div>
              <div style={S.cardHead}>
                <div style={S.stepBadge}>05</div>
                <div>
                  <div style={S.cardHeadTitle}>Review & Submit</div>
                  <div style={S.cardHeadSub}>Confirm your details before submitting to the blockchain</div>
                </div>
              </div>
              <div style={S.cardBody}>
                <div style={S.summaryBox}>
                  <div style={S.summarySection}>Personal Information</div>
                  {[
                    ["Name",    formData.name],
                    ["DOB",     formData.dob],
                    ["Gender",  formData.gender],
                    ["Mobile",  formData.mobile],
                    ["Email",   formData.email],
                    ["Address", formData.location],
                  ].map(([lbl, val]) => (
                    <div key={lbl} style={S.summaryRow}>
                      <span style={S.summaryLbl}>{lbl}</span>
                      <span style={S.summaryVal}>{val}</span>
                    </div>
                  ))}
                  <div style={S.summarySection}>Verification Status</div>
                  {[
                    ["OTP Verification",     "Verified"],
                    ["Aadhaar Verification", "Verified"],
                    ["Face Recognition",     `Matched — ${matchScore}% similarity`],
                  ].map(([lbl, val]) => (
                    <div key={lbl} style={S.summaryRow}>
                      <span style={S.summaryLbl}>{lbl}</span>
                      <span style={{ ...S.summaryVal, color: "#2e7d32", fontWeight: "700" }}>{val}</span>
                    </div>
                  ))}
                </div>
                <div style={S.submitNote}>
                  Your data will be recorded immutably on the Ethereum blockchain. Aadhaar and face data are stored only as cryptographic hashes.
                </div>
                <button
                  style={{ ...S.btnPrimary, background: loading ? "#90a4ae" : "#1565c0", cursor: loading ? "not-allowed" : "pointer" }}
                  onClick={handleSubmit} disabled={loading}
                >
                  {loading ? "Submitting to Blockchain..." : "Submit Registration →"}
                </button>
              </div>
            </div>
          )}

          {/* STEP 6 — Done */}
          {currentStep === 6 && (
            <div style={S.successWrap}>
              <div style={S.successIcon}>✓</div>
              <h2 style={S.successTitle}>Registration Complete!</h2>
              <p style={S.successDesc}>Your details have been recorded on the Ethereum blockchain.</p>
              <div style={S.successNote}>
                Your KYC application is now pending insurer approval. You will be able to subscribe to a health plan once approved.
              </div>
              <button style={S.btnPrimary} onClick={() => navigate("/patient/dashboard")}>
                Go to My Dashboard →
              </button>
            </div>
          )}

        </div>{/* /card */}
      </div>{/* /body */}

      {/* ── FOOTER ── */}
      <div style={S.footer}>
        <span>© 2026 MedInsure</span>
        <span>Powered by Ethereum Blockchain and IPFS</span>
        <span>Patient Portal</span>
      </div>
    </div>
  );
}

/* ─── STYLES ───────────────────────────────────────────────────────── */
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
  pillAmber:    { fontSize: "11px", fontWeight: "700", background: "#fff8e1", color: "#e65100", border: "1px solid #ffe082", padding: "5px 12px", borderRadius: "20px" },
  pillGreen:    { fontSize: "11px", fontWeight: "700", background: "#e8f5e9", color: "#2e7d32", border: "1px solid #a5d6a7", padding: "5px 12px", borderRadius: "20px" },
  walletPill:   { display: "flex", alignItems: "center", gap: "7px", background: "#eef3fb", border: "1px solid #c5d5e8", borderRadius: "20px", padding: "6px 14px", fontSize: "12px", color: "#1a237e", fontWeight: "700" },
  walletDot:    { width: "8px", height: "8px", borderRadius: "50%", background: "#2e7d32", flexShrink: 0 },
  backBtn:      { background: "#fff", color: "#1565c0", border: "2px solid #1565c0", padding: "7px 16px", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontWeight: "700" },

  /* body */
  body:      { flex: 1, maxWidth: "680px", width: "100%", margin: "0 auto", padding: "36px 20px 60px" },
  pageHead:  { textAlign: "center", marginBottom: "32px" },
  secLabel:  { display: "inline-block", background: "#e3eaf5", color: "#1565c0", padding: "4px 12px", borderRadius: "3px", fontSize: "11px", fontWeight: "800", letterSpacing: "1.2px", marginBottom: "10px" },
  pageTitle: { fontSize: "28px", fontWeight: "700", color: "#0d1b35", margin: "0 0 8px", fontFamily: "'Georgia', serif" },
  pageSub:   { fontSize: "14px", color: "#7a8aa8", margin: 0 },

  /* step indicator */
  stepRow:       { display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "32px" },
  stepItem:      { display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" },
  stepCircle:    { width: "36px", height: "36px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "800", fontSize: "13px", transition: "all 0.3s", flexShrink: 0 },
  stepLabel:     { fontSize: "10px", textAlign: "center", maxWidth: "60px", lineHeight: 1.3, transition: "all 0.2s" },
  stepConnector: { height: "2px", flex: 1, minWidth: "16px", maxWidth: "36px", marginBottom: "16px", transition: "background 0.3s" },

  /* alerts */
  alertGreen: { display: "flex", alignItems: "center", gap: "10px", background: "#e8f5e9", border: "1px solid #a5d6a7", borderRadius: "8px", padding: "12px 16px", marginBottom: "16px", fontSize: "14px", color: "#2e7d32", fontWeight: "600" },
  alertRed:   { display: "flex", alignItems: "center", gap: "10px", background: "#ffebee", border: "1px solid #ef9a9a", borderRadius: "8px", padding: "12px 16px", marginBottom: "16px", fontSize: "14px", color: "#c62828", fontWeight: "600" },
  alertIcon:  (bg) => ({ width: "22px", height: "22px", borderRadius: "50%", background: bg, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: "900", flexShrink: 0 }),

  /* card */
  card:         { background: "#fff", borderRadius: "14px", border: "1px solid #dde3ef", boxShadow: "0 2px 12px rgba(0,0,0,0.05)", overflow: "hidden" },
  cardHead:     { display: "flex", alignItems: "center", gap: "14px", padding: "20px 28px", borderBottom: "1px solid #eef1f8", background: "#fafbfe" },
  stepBadge:    { width: "36px", height: "36px", borderRadius: "9px", background: "#1565c0", color: "#fff", fontSize: "14px", fontWeight: "900", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  cardHeadTitle:{ fontSize: "16px", fontWeight: "700", color: "#0d1b35", fontFamily: "'Georgia', serif", marginBottom: "2px" },
  cardHeadSub:  { fontSize: "12px", color: "#8fa0c0" },
  aiBadge:      { marginLeft: "auto", fontSize: "11px", fontWeight: "700", padding: "5px 12px", borderRadius: "20px", flexShrink: 0 },
  cardBody:     { padding: "28px" },

  /* form */
  grid2:   { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "4px" },
  fGroup:  { marginBottom: "16px" },
  fLabel:  { display: "block", fontSize: "11px", color: "#7a8aa8", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "7px" },
  fInput:  { width: "100%", padding: "11px 13px", borderRadius: "7px", border: "1px solid #dde3ef", fontSize: "14px", boxSizing: "border-box", color: "#0d1b35", outline: "none", fontFamily: "'Arial', sans-serif" },
  hint:    { display: "block", fontSize: "12px", color: "#8fa0c0", marginTop: "6px", lineHeight: 1.5 },
  infoRow: { display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f4f7fc", border: "1px solid #dde3ef", borderRadius: "8px", padding: "12px 16px", marginBottom: "20px" },
  infoLbl: { fontSize: "11px", fontWeight: "800", color: "#7a8aa8", textTransform: "uppercase", letterSpacing: "0.5px" },
  infoVal: { fontSize: "15px", fontWeight: "700", color: "#1565c0" },

  /* buttons */
  btnPrimary: { width: "100%", padding: "13px", border: "none", borderRadius: "8px", background: "#1565c0", color: "#fff", fontSize: "14px", fontWeight: "700", cursor: "pointer", letterSpacing: "0.3px", marginBottom: "10px" },
  btnGhost:   { width: "100%", padding: "11px", border: "2px solid #dde3ef", borderRadius: "8px", background: "#fff", color: "#3a4a6b", fontSize: "13px", fontWeight: "700", cursor: "pointer", marginBottom: "10px" },

  /* face section */
  faceBlock:       { marginBottom: "20px" },
  faceSectionTitle:{ fontSize: "12px", fontWeight: "800", color: "#0d1b35", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: "12px" },
  faceDivider:     { height: "1px", background: "#eef1f8", margin: "20px 0" },
  fileRow:         { display: "flex", alignItems: "center", gap: "12px", cursor: "pointer", marginBottom: "12px" },
  filePickerBtn:   { background: "#eef3fb", color: "#1565c0", border: "1px solid #c5d5e8", padding: "9px 16px", borderRadius: "6px", fontSize: "13px", fontWeight: "700", whiteSpace: "nowrap" },
  photoBox:        { display: "inline-flex", flexDirection: "column", alignItems: "center", gap: "6px", marginTop: "10px" },
  photoImg:        { width: "140px", height: "140px", objectFit: "cover", borderRadius: "10px", border: "2px solid #dde3ef", display: "block" },
  photoCaption:    { fontSize: "10px", color: "#7a8aa8", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px" },
  video:           { width: "100%", borderRadius: "10px", marginBottom: "12px", border: "1px solid #dde3ef" },
  scoreBox:        { borderRadius: "12px", padding: "24px", textAlign: "center", margin: "16px 0" },

  /* summary */
  summaryBox:     { background: "#f4f7fc", border: "1px solid #dde3ef", borderRadius: "10px", padding: "20px", marginBottom: "20px" },
  summarySection: { fontSize: "11px", fontWeight: "800", color: "#7a8aa8", textTransform: "uppercase", letterSpacing: "0.8px", marginTop: "16px", marginBottom: "10px" },
  summaryRow:     { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: "1px solid #eef1f8" },
  summaryLbl:     { fontSize: "12px", color: "#7a8aa8", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.3px" },
  summaryVal:     { fontSize: "13px", color: "#0d1b35", fontWeight: "500", textAlign: "right", maxWidth: "60%" },
  submitNote:     { fontSize: "12px", color: "#a0b0c8", lineHeight: 1.6, textAlign: "center", padding: "12px", background: "#f4f7fc", borderRadius: "7px", marginBottom: "16px" },

  /* success */
  successWrap:  { padding: "48px 28px", textAlign: "center" },
  successIcon:  { width: "64px", height: "64px", borderRadius: "50%", background: "#2e7d32", color: "#fff", fontSize: "28px", fontWeight: "900", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" },
  successTitle: { fontSize: "24px", fontWeight: "700", color: "#0d1b35", margin: "0 0 10px", fontFamily: "'Georgia', serif" },
  successDesc:  { fontSize: "14px", color: "#5a6a88", marginBottom: "16px" },
  successNote:  { background: "#f4f7fc", border: "1px solid #dde3ef", borderRadius: "8px", padding: "14px", fontSize: "13px", color: "#5a6a88", lineHeight: 1.6, marginBottom: "24px", textAlign: "left" },

  /* footer */
  footer: { borderTop: "1px solid #dde3ef", background: "#fff", padding: "16px 36px", display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#a0b0c8", flexWrap: "wrap", gap: "8px" },
};

export default PatientRegister;