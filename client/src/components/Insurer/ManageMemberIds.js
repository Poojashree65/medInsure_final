import React, { useState } from "react";

import { useNavigate } from "react-router-dom";

import UserRegistry from "../../contracts/UserRegistry.json";



const USER_REGISTRY_ADDRESS = "0xfAb58c1c5B6486aBb2324270948581D4E4C8322D";

const PINATA_API_KEY    = "58ef12624062ff40de68";

const PINATA_SECRET_KEY = "e0f01efdc5f42b628feab15e89cbfa32cdc32b6320e0046b7274629ea8b06922";



// Auto-generate Member ID from name+dob+mobile using SHA-256

async function deriveMemberId(name, dob, mobile) {

  if (!name || !dob || !mobile) return "";

  const raw = name.trim().toLowerCase() + dob.trim() + mobile.trim();

  const enc = new TextEncoder().encode(raw);

  const buf = await crypto.subtle.digest("SHA-256", enc);

  const hex = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,"0")).join("");

  return "MED-" + hex.substring(0, 8).toUpperCase();

}



function ManageMemberIds({ account, web3 }) {

  const navigate = useNavigate();



  const [form, setForm] = useState({ name: "", dob: "", mobile: "" });

  const [generatedId, setGeneratedId] = useState("");

  const [aadhaarFile, setAadhaarFile] = useState(null);

  const [aadhaarPreview, setAadhaarPreview] = useState(null);

  const [loading, setLoading]   = useState(false);

  const [error, setError]       = useState("");

  const [success, setSuccess]   = useState("");

  const [registered, setRegistered] = useState([]);



  const handleFormChange = async (e) => {

    const updated = { ...form, [e.target.name]: e.target.value };

    setForm(updated);

    const id = await deriveMemberId(updated.name, updated.dob, updated.mobile);

    setGeneratedId(id);

  };



  const handleAadhaarUpload = (e) => {

    const file = e.target.files[0];

    if (!file) return;

    setAadhaarFile(file);

    const reader = new FileReader();

    reader.onload = ev => setAadhaarPreview(ev.target.result);

    reader.readAsDataURL(file);

  };



  const uploadAadhaarToPinata = async () => {

    const fd = new FormData();

    fd.append("file", aadhaarFile);

    fd.append("pinataMetadata", JSON.stringify({ name: "Aadhaar_" + generatedId }));

    const res  = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {

      method: "POST",

      headers: { pinata_api_key: PINATA_API_KEY, pinata_secret_api_key: PINATA_SECRET_KEY },

      body: fd,

    });

    const data = await res.json();

    return data.IpfsHash || "QmTestAadhaar_" + Date.now();

  };



  const handleRegister = async (e) => {

    e.preventDefault();

    if (!generatedId) { setError("Fill all fields to generate Member ID."); return; }

    if (!aadhaarFile) { setError("Please upload the patient's Aadhaar card photo."); return; }

    setLoading(true); setError(""); setSuccess("");

    try {

      // Upload Aadhaar to IPFS

      const aadhaarCID = await uploadAadhaarToPinata();



      // Store on-chain

      const contract    = new web3.eth.Contract(UserRegistry.abi, USER_REGISTRY_ADDRESS);

      const idHash      = web3.utils.keccak256(generatedId);

      await contract.methods.addMemberIdWithAadhaar(idHash, aadhaarCID).send({ from: account });



      setSuccess(`Patient pre-registered. Member ID: ${generatedId} — give this to the patient.`);

      setRegistered(prev => [...prev, { id: generatedId, name: form.name, cid: aadhaarCID }]);

      setForm({ name: "", dob: "", mobile: "" });

      setGeneratedId(""); setAadhaarFile(null); setAadhaarPreview(null);

    } catch (err) { setError("Error: " + err.message); }

    setLoading(false);

  };



  return (

    <div style={S.page}>

      <div style={S.topbar}>

        <div style={S.brand}>

          <div style={S.logo}>M</div>

          <div><div style={S.brandName}>MedInsure</div><div style={S.brandSub}>Blockchain Health Insurance</div></div>

        </div>

        <div style={S.topbarCenter}><span style={S.pageLabel}>User Pre-Registration</span></div>

        <div style={S.topbarRight}>

          <span style={S.roleBadge}>Insurer</span>

          <span style={S.wallet}>{account?.slice(0,6)}...{account?.slice(-4)}</span>

          <button style={S.backBtn} onClick={() => navigate("/insurer")}>← Dashboard</button>

        </div>

      </div>



      <div style={S.main}>

        <div style={S.pageHead}>

          <div style={S.secLabel}>INSURER PANEL</div>

          <h1 style={S.pageTitle}>User Pre-Registration</h1>

          <p style={S.pageSub}>Register patient details and upload their Aadhaar card. A unique Member ID is auto-generated and used for identity verification during patient registration.</p>

        </div>



        {success && <div style={S.alertGreen}><span style={S.iconGreen}>✓</span>{success}</div>}

        {error   && <div style={S.alertRed}><span style={S.iconRed}>!</span>{error}</div>}



        <form onSubmit={handleRegister}>

          <div style={S.card}>

            <div style={S.cardHead}>

              <div style={S.badge}>01</div>

              <div><div style={S.cardTitle}>Patient Details</div><div style={S.cardSub}>Used to generate a unique Member ID</div></div>

            </div>

            <div style={S.cardBody}>

              <div style={S.grid3}>

                {[

                  {label:"Full Name",     name:"name",   type:"text", ph:"Patient full name"},

                  {label:"Date of Birth", name:"dob",    type:"date", ph:""},

                  {label:"Mobile Number", name:"mobile", type:"text", ph:"10-digit mobile"},

                ].map(f => (

                  <div key={f.name} style={S.fGroup}>

                    <label style={S.fLabel}>{f.label}</label>

                    <input style={S.fInput} type={f.type} name={f.name} placeholder={f.ph}

                      value={form[f.name]} onChange={handleFormChange} required/>

                  </div>

                ))}

              </div>



              {/* Generated Member ID */}

              <div style={S.fGroup}>

                <label style={S.fLabel}>Generated Member ID</label>

                <div style={{

                  padding:"12px 16px", borderRadius:"8px", fontSize:"18px", fontWeight:"900",

                  letterSpacing:"3px", fontFamily:"monospace",

                  background: generatedId ? "#e8f5e9" : "#f4f7fc",

                  border: `1.5px solid ${generatedId ? "#a5d6a7" : "#dde3ef"}`,

                  color: generatedId ? "#2e7d32" : "#a0b0c8",

                }}>

                  {generatedId || "Fill all fields above..."}

                </div>

                {generatedId && (

                  <span style={{fontSize:"11px",color:"#2e7d32",marginTop:"4px",display:"block",fontWeight:"600"}}>

                    ✓ Copy this ID and give it to the patient for registration.

                  </span>

                )}

                <span style={S.hint}>Member ID is derived from patient details using SHA-256. Same patient always gets the same ID.</span>

              </div>

            </div>

          </div>



          <div style={S.card}>

            <div style={S.cardHead}>

              <div style={S.badge}>02</div>

              <div><div style={S.cardTitle}>Aadhaar Card Upload</div><div style={S.cardSub}>Upload patient's Aadhaar card — used for face verification during registration</div></div>

            </div>

            <div style={S.cardBody}>

              <div style={{display:"flex",gap:"24px",alignItems:"flex-start",flexWrap:"wrap"}}>

                <div style={{flex:1}}>

                  <div style={S.fGroup}>

                    <label style={S.fLabel}>Aadhaar Card Photo</label>

                    <label style={{display:"flex",alignItems:"center",gap:"10px",cursor:"pointer"}}>

                      <input type="file" accept="image/*" style={{display:"none"}} onChange={handleAadhaarUpload}/>

                      <span style={{background:"#eef3fb",color:"#1565c0",border:"1px solid #c5d5e8",padding:"9px 16px",borderRadius:"6px",fontSize:"12px",fontWeight:"700"}}>

                        Choose Aadhaar Photo

                      </span>

                      <span style={S.hint}>{aadhaarFile ? aadhaarFile.name : "JPG, PNG — clear photo of Aadhaar card"}</span>

                    </label>

                  </div>

                  <div style={{background:"#fff8e1",border:"1px solid #ffe082",borderRadius:"8px",padding:"12px 14px",fontSize:"12px",color:"#e65100",lineHeight:1.6}}>

                    <strong>Important:</strong> The Aadhaar photo is stored on IPFS and its CID is recorded on the blockchain.

                    During patient registration, the patient's live selfie will be compared against this photo for identity verification.

                  </div>

                </div>

                {aadhaarPreview && (

                  <div style={{flexShrink:0,textAlign:"center"}}>

                    <img src={aadhaarPreview} alt="Aadhaar preview" style={{width:"200px",height:"130px",objectFit:"cover",borderRadius:"8px",border:"2px solid #dde3ef"}}/>

                    <div style={{fontSize:"11px",color:"#7a8aa8",marginTop:"6px",fontWeight:"700"}}>Aadhaar Preview</div>

                  </div>

                )}

              </div>

            </div>

          </div>



          <button

            type="submit"

            disabled={loading || !generatedId || !aadhaarFile}

            style={{...S.btn, background: loading||!generatedId||!aadhaarFile ? "#90a4ae" : "#1565c0", cursor: loading||!generatedId||!aadhaarFile ? "not-allowed" : "pointer"}}

          >

            {loading ? "Uploading Aadhaar & Storing on Blockchain..." : "Pre-Register Patient →"}

          </button>

        </form>



        {/* Registered this session */}

        {registered.length > 0 && (

          <div style={{...S.card, marginTop:"20px"}}>

            <div style={S.cardHead}>

              <div style={{...S.badge,background:"#2e7d32"}}>✓</div>

              <div><div style={S.cardTitle}>Pre-Registered This Session</div><div style={S.cardSub}>{registered.length} patient(s)</div></div>

            </div>

            <div style={S.cardBody}>

              {registered.map((r,i) => (

                <div key={i} style={{display:"flex",alignItems:"center",gap:"12px",padding:"10px 14px",background:"#f4f7fc",borderRadius:"8px",border:"1px solid #dde3ef",marginBottom:"8px"}}>

                  <span style={{width:"24px",height:"24px",borderRadius:"50%",background:"#1565c0",color:"#fff",fontSize:"11px",fontWeight:"900",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{i+1}</span>

                  <span style={{flex:1,fontSize:"13px",fontWeight:"700",color:"#0d1b35"}}>{r.name}</span>

                  <span style={{fontSize:"13px",fontWeight:"700",color:"#2e7d32",fontFamily:"monospace",letterSpacing:"1px"}}>{r.id}</span>

                  <span style={{fontSize:"11px",fontWeight:"700",color:"#2e7d32",background:"#e8f5e9",padding:"3px 10px",borderRadius:"20px",border:"1px solid #a5d6a7"}}>✓ On-chain</span>

                </div>

              ))}

            </div>

          </div>

        )}

      </div>



      <div style={S.footer}>

        <span>© 2026 MedInsure</span>

        <span>Powered by Ethereum Blockchain and IPFS</span>

        <span>Insurer Panel</span>

      </div>

    </div>

  );

}



const S = {

  page:        { minHeight:"100vh", background:"#f4f7fc", fontFamily:"'Arial',sans-serif", color:"#1a237e", display:"flex", flexDirection:"column" },

  topbar:      { background:"#fff", borderBottom:"1px solid #dde3ef", height:"68px", padding:"0 36px", display:"flex", alignItems:"center", gap:"16px", position:"sticky", top:0, zIndex:100 },

  brand:       { display:"flex", alignItems:"center", gap:"10px", flexShrink:0 },

  logo:        { width:"38px", height:"38px", background:"#1565c0", borderRadius:"9px", color:"#fff", fontSize:"19px", fontWeight:"900", display:"flex", alignItems:"center", justifyContent:"center" },

  brandName:   { fontSize:"16px", fontWeight:"800", color:"#1a237e", lineHeight:1.2 },

  brandSub:    { fontSize:"10px", color:"#8fa0c0" },

  topbarCenter:{ flex:1, display:"flex", justifyContent:"center" },

  pageLabel:   { fontSize:"13px", fontWeight:"700", color:"#3a4a6b", background:"#eef3fb", padding:"6px 16px", borderRadius:"5px" },

  topbarRight: { display:"flex", alignItems:"center", gap:"10px", flexShrink:0 },

  roleBadge:   { fontSize:"11px", fontWeight:"700", background:"#e3eaf5", color:"#1565c0", padding:"4px 12px", borderRadius:"4px" },

  wallet:      { fontSize:"12px", color:"#5a6a88", background:"#f4f7fc", border:"1px solid #dde3ef", padding:"6px 14px", borderRadius:"6px" },

  backBtn:     { background:"#fff", color:"#1565c0", border:"2px solid #1565c0", padding:"7px 16px", borderRadius:"6px", cursor:"pointer", fontSize:"12px", fontWeight:"700" },

  main:        { flex:1, maxWidth:"860px", width:"100%", margin:"0 auto", padding:"36px 20px 60px" },

  pageHead:    { marginBottom:"28px" },

  secLabel:    { display:"inline-block", background:"#e3eaf5", color:"#1565c0", padding:"4px 12px", borderRadius:"3px", fontSize:"11px", fontWeight:"800", letterSpacing:"1.2px", marginBottom:"10px" },

  pageTitle:   { fontSize:"28px", fontWeight:"700", color:"#0d1b35", margin:"0 0 6px", fontFamily:"'Georgia',serif" },

  pageSub:     { fontSize:"14px", color:"#7a8aa8" },

  alertGreen:  { display:"flex", alignItems:"center", gap:"10px", background:"#e8f5e9", border:"1px solid #a5d6a7", borderRadius:"8px", padding:"12px 16px", marginBottom:"20px", fontSize:"14px", color:"#2e7d32", fontWeight:"600" },

  alertRed:    { display:"flex", alignItems:"center", gap:"10px", background:"#ffebee", border:"1px solid #ef9a9a", borderRadius:"8px", padding:"12px 16px", marginBottom:"20px", fontSize:"14px", color:"#c62828", fontWeight:"600" },

  iconGreen:   { width:"22px", height:"22px", borderRadius:"50%", background:"#2e7d32", color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"12px", fontWeight:"900", flexShrink:0 },

  iconRed:     { width:"22px", height:"22px", borderRadius:"50%", background:"#c62828", color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"12px", fontWeight:"900", flexShrink:0 },

  card:        { background:"#fff", borderRadius:"14px", border:"1px solid #dde3ef", boxShadow:"0 2px 12px rgba(0,0,0,0.05)", overflow:"hidden", marginBottom:"20px" },

  cardHead:    { display:"flex", alignItems:"center", gap:"14px", padding:"20px 28px", borderBottom:"1px solid #eef1f8", background:"#fafbfe" },

  badge:       { width:"36px", height:"36px", borderRadius:"9px", background:"#1565c0", color:"#fff", fontSize:"14px", fontWeight:"900", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 },

  cardTitle:   { fontSize:"15px", fontWeight:"700", color:"#0d1b35", fontFamily:"'Georgia',serif" },

  cardSub:     { fontSize:"12px", color:"#8fa0c0" },

  cardBody:    { padding:"24px 28px" },

  grid3:       { display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"16px", marginBottom:"16px" },

  fGroup:      { marginBottom:"16px" },

  fLabel:      { display:"block", fontSize:"11px", fontWeight:"800", color:"#3a4a6b", textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:"6px" },

  fInput:      { width:"100%", padding:"11px 14px", border:"1.5px solid #dde3ef", borderRadius:"8px", fontSize:"14px", color:"#0d1b35", outline:"none", fontFamily:"inherit", background:"#fafbfe", boxSizing:"border-box" },

  hint:        { fontSize:"11px", color:"#a0b0c8", marginTop:"4px", display:"block" },

  btn:         { width:"100%", padding:"14px", color:"#fff", border:"none", borderRadius:"8px", fontSize:"15px", fontWeight:"700", fontFamily:"inherit" },

  footer:      { background:"#fff", borderTop:"1px solid #dde3ef", padding:"16px 36px", display:"flex", justifyContent:"space-between", fontSize:"11px", color:"#a0b0c8" },

};



export default ManageMemberIds;

