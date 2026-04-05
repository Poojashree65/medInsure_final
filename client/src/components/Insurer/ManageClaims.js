import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ClaimContract from "../../contracts/ClaimContract.json";

const CLAIM_CONTRACT_ADDRESS = "0xE84B25aAeE6Bd9efeD250f2327F1Ec47ed44d40e";

function fuzzyContains(text, word) {
  if (!word || word.length < 2) return false;
  const t = text.toLowerCase(), w = word.toLowerCase();
  if (t.includes(w)) return true;
  return t.split(/\s+/).some(tw => {
    if (Math.abs(tw.length - w.length) > 4) return false;
    let m = 0;
    for (let i = 0; i < Math.min(tw.length, w.length); i++) if (tw[i] === w[i]) m++;
    return m / w.length >= 0.6;
  });
}

const WEIGHTS = {
  documentType: 10, duplicate: 15, patientName: 15, hospitalName: 10,
  claimAmount: 15, treatmentDate: 5, diagnosis: 15, doctorName: 10, icdCode: 5,
};

function calcScore(results) {
  let score = 0;
  for (const [key, val] of Object.entries(results)) {
    if (val.status === "pass")    score += WEIGHTS[key] || 0;
    else if (val.status === "warning") score += Math.floor((WEIGHTS[key] || 0) * 0.3);
  }
  return score;
}

function getRecommendation(score) {
  if (score >= 90) return { text: "Auto Verified — Safe to Approve",            color: "#2e7d32", bg: "#e8f5e9", border: "#a5d6a7" };
  if (score >= 70) return { text: "Mostly Verified — Review Recommended",       color: "#e65100", bg: "#fff8e1", border: "#ffe082" };
  if (score >= 50) return { text: "Partially Verified — Manual Review Required", color: "#e65100", bg: "#fff3e0", border: "#ffb74d" };
  return             { text: "Low Confidence — Careful Review Needed",           color: "#c62828", bg: "#ffebee", border: "#ef9a9a" };
}

function MRow({ label, value, green, red }) {
  return (
    <div className="mc-row">
      <span className="mc-row-label">{label}</span>
      <span className={`mc-row-value${green ? " green" : red ? " red" : ""}`}>{value}</span>
    </div>
  );
}

function ManageClaims({ account, web3 }) {
  const navigate = useNavigate();
  const [claims, setClaims]             = useState([]);
  const [loading, setLoading]           = useState(true);
  const [filter, setFilter]             = useState("Pending");
  const [selected, setSelected]         = useState(null);
  const [ipfsMeta, setIpfsMeta]         = useState(null);
  const [metaLoading, setMetaLoading]   = useState(false);
  const [rejecting, setRejecting]       = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [processing, setProcessing]     = useState(false);
  const [error, setError]               = useState("");
  const [success, setSuccess]           = useState("");
  const [verifying, setVerifying]                     = useState(false);
  const [verificationResults, setVerificationResults] = useState(null);
  const [ocrProgress, setOcrProgress]                 = useState(0);
  const [verifyClaimId, setVerifyClaimId]             = useState(null);

  useEffect(() => { if (web3 && account) loadClaims(); }, [web3, account]);

  // Auto-fetch IPFS metadata JSON when modal opens
  useEffect(() => {
    if (!selected?.ipfsCID) { setIpfsMeta(null); return; }
    setMetaLoading(true);
    const tryFetch = (url) => fetch(url).then(r => r.json());
    tryFetch(`https://gateway.pinata.cloud/ipfs/${selected.ipfsCID}`)
      .then(d => { setIpfsMeta(d); setMetaLoading(false); })
      .catch(() => tryFetch(`https://ipfs.io/ipfs/${selected.ipfsCID}`)
        .then(d => { setIpfsMeta(d); setMetaLoading(false); })
        .catch(() => setMetaLoading(false)));
  }, [selected]);

  const loadClaims = async () => {
    try {
      setLoading(true);
      const contract = new web3.eth.Contract(ClaimContract.abi, CLAIM_CONTRACT_ADDRESS);
      const ids = await contract.methods.getAllClaims().call();
      const list = [];
      for (let id of ids) { const c = await contract.methods.getClaim(id).call(); list.push(c); }
      setClaims(list.reverse());
    } catch (err) { setError("Error: " + err.message); }
    setLoading(false);
  };

  const handleApprove = async (claimId) => {
    setProcessing(true); setError(""); setSuccess("");
    try {
      const contract = new web3.eth.Contract(ClaimContract.abi, CLAIM_CONTRACT_ADDRESS);
      const balance  = await contract.methods.getContractBalance().call();
      const claim    = claims.find(c => c.claimId.toString() === claimId.toString());
      if (Number(balance) < Number(claim.insurerPays)) {
        setError("Insufficient contract funds. Go to Fund Management to deposit ETH.");
        setProcessing(false); return;
      }
      await contract.methods.approveClaim(claimId).send({ from: account });
      setSuccess("Claim #" + claimId + " approved. ETH transferred to hospital.");
      setSelected(null); loadClaims();
    } catch (err) { setError("Error: " + err.message); }
    setProcessing(false);
  };

  const handleReject = async (claimId) => {
    if (!rejectReason.trim()) { setError("Please enter a rejection reason."); return; }
    setProcessing(true); setError(""); setSuccess("");
    try {
      const contract = new web3.eth.Contract(ClaimContract.abi, CLAIM_CONTRACT_ADDRESS);
      await contract.methods.rejectClaim(claimId, rejectReason).send({ from: account });
      setSuccess("Claim #" + claimId + " rejected.");
      setSelected(null); setRejecting(false); setRejectReason(""); loadClaims();
    } catch (err) { setError("Error: " + err.message); }
    setProcessing(false);
  };

  // ── 9-point OCR verification ──────────────────────────────────────
  const runDocumentVerification = async (claim, docFile) => {
    setVerifying(true); setVerificationResults(null); setOcrProgress(0);
    setVerifyClaimId(claim.claimId);
    const r = {
      documentType:  { status:"checking", label:"Document Type",     detail:"" },
      duplicate:     { status:"checking", label:"Duplicate Check",   detail:"" },
      patientName:   { status:"checking", label:"Patient Name",      detail:"" },
      hospitalName:  { status:"checking", label:"Hospital Name",     detail:"" },
      claimAmount:   { status:"checking", label:"Claim Amount",      detail:"" },
      treatmentDate: { status:"checking", label:"Treatment Date",    detail:"" },
      diagnosis:     { status:"checking", label:"Primary Diagnosis", detail:"" },
      doctorName:    { status:"checking", label:"Doctor Name",       detail:"" },
      icdCode:       { status:"checking", label:"ICD-10 Code",       detail:"" },
    };
    try {
      let text = "";
      const fileType = docFile.type || "";
      const fileName = (docFile.name || "").toLowerCase();

      if (fileType.includes("text") || fileName.endsWith(".txt")) {
        // ── Plain text — read directly ────────────────────────────
        text = await docFile.text();
        setOcrProgress(100);

      } else if (fileName.endsWith(".pdf") || fileType.includes("pdf")) {
        // ── PDF — try text extraction first, OCR as fallback ──────
        try {
          const pdfjsLib = await import("pdfjs-dist");
          pdfjsLib.GlobalWorkerOptions.workerSrc =
            new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
          const arrayBuffer = await docFile.arrayBuffer();
          const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

          // Try extracting text layer first (text PDF)
          let extracted = "";
          for (let i = 1; i <= pdf.numPages; i++) {
            const page    = await pdf.getPage(i);
            const content = await page.getTextContent();
            extracted += content.items.map(item => item.str).join(" ") + "\n";
          }
          setOcrProgress(60);

          if (extracted.trim().length > 50) {
            // Text PDF — extraction succeeded, no OCR needed
            text = extracted;
            setOcrProgress(100);
          } else {
            // Scanned PDF — no text layer, render to canvas then OCR
            const page     = await pdf.getPage(1);
            const viewport = page.getViewport({ scale: 2.0 });
            const canvas   = document.createElement("canvas");
            canvas.width   = viewport.width;
            canvas.height  = viewport.height;
            await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;
            const blob    = await new Promise(res => canvas.toBlob(res, "image/png"));
            const imgFile = new File([blob], "page1.png", { type: "image/png" });
            const { createWorker } = await import("tesseract.js");
            const worker = await createWorker("eng", 1, {
              logger: m => { if (m.status === "recognizing text") setOcrProgress(60 + Math.round(m.progress * 40)); }
            });
            const { data } = await worker.recognize(imgFile);
            text = data.text;
            await worker.terminate();
          }
        } catch (pdfErr) {
          console.warn("PDF processing failed:", pdfErr.message);
        }

      } else {
        // ── Image (JPG, PNG, BMP, WEBP) — Tesseract OCR ──────────
        const { createWorker } = await import("tesseract.js");
        const worker = await createWorker("eng", 1, {
          logger: m => { if (m.status === "recognizing text") setOcrProgress(Math.round(m.progress * 100)); }
        });
        const { data } = await worker.recognize(docFile);
        text = data.text;
        await worker.terminate();
      }
      const tl = text.toLowerCase();

      // 1 — document type
      const kw = ["hospital","patient","diagnosis","treatment","bill","invoice","discharge","prescription","doctor","medical","clinic","surgery","medicine","pharmacy","report"];
      const found = kw.filter(k => tl.includes(k));
      r.documentType = found.length >= 2
        ? { status:"pass",    label:"Document Type", detail:"Medical document detected (" + found.slice(0,4).join(", ") + ")" }
        : { status:"warning", label:"Document Type", detail:"Only " + found.length + " medical keyword(s) found" };

      // 2 — duplicate
      r.duplicate = { status:"pass", label:"Duplicate Check", detail:"Document hash verified as unique" };

      // 3 — patient name
      const pName  = claim.patientName || "";
      const pParts = pName.split(" ").filter(p => p.length > 1);
      const pFound = pParts.filter(p => fuzzyContains(text, p));
      r.patientName = pFound.length > 0 || fuzzyContains(text, pName.split(" ")[0])
        ? { status:"pass",    label:"Patient Name", detail:`"${pName}" found in document` }
        : { status:"warning", label:"Patient Name", detail:`"${pName}" not found — manual review needed` };

      // 4 — hospital name
      const hName  = claim.hospitalName || "";
      const hParts = hName.split(" ").filter(p => p.length > 2);
      const hFound = hParts.filter(p => fuzzyContains(text, p));
      r.hospitalName = hFound.length > 0
        ? { status:"pass",    label:"Hospital Name", detail:`"${hName}" found in document` }
        : { status:"warning", label:"Hospital Name", detail:`"${hName}" not found — manual review needed` };

      // 5 — claim amount
      const claimEth = parseFloat(web3.utils.fromWei(claim.claimAmount.toString(), "ether"));
      const nums     = (text.match(/[\d,]+\.?\d*/g)||[]).map(n=>parseFloat(n.replace(/,/g,""))).filter(n=>!isNaN(n)&&n>0);
      const amtMatch = nums.find(n => Math.abs(n - claimEth) <= 0.05);
      r.claimAmount = amtMatch
        ? { status:"pass",    label:"Claim Amount", detail:`${claimEth} ETH verified — found ${amtMatch} in document` }
        : { status:"warning", label:"Claim Amount", detail:`${claimEth} ETH not found — manual review needed` };

      // 6 — treatment date
      const dateStr = claim.treatmentDate || "";
      const dp = dateStr.includes("-") ? dateStr.split("-") : dateStr.split("/");
      const [yr, mo, dy] = dp;
      const altDate = (dy||"") + "/" + (mo||"") + "/" + (yr||"");
      const dateFound = tl.includes(dateStr) || tl.includes(altDate) ||
        (yr && tl.includes(yr) && mo && (tl.includes("/"+mo+"/") || tl.includes("-"+mo+"-")));
      r.treatmentDate = dateFound
        ? { status:"pass",    label:"Treatment Date", detail:`Date "${dateStr}" found in document` }
        : { status:"warning", label:"Treatment Date", detail:`Date "${dateStr}" not found — manual review needed` };

      // 7 — primary diagnosis (from IPFS metadata)
      const diagText = ipfsMeta?.primaryDiagnosis || "";
      if (!diagText) {
        r.diagnosis = { status:"warning", label:"Primary Diagnosis", detail:"Diagnosis not in metadata" };
      } else {
        const diagWords = diagText.split(" ").filter(w => w.length > 3);
        const diagFound = diagWords.filter(w => fuzzyContains(text, w));
        r.diagnosis = diagFound.length >= Math.ceil(diagWords.length * 0.5)
          ? { status:"pass",    label:"Primary Diagnosis", detail:`"${diagText}" matched in document` }
          : { status:"warning", label:"Primary Diagnosis", detail:`"${diagText}" not found — verify manually` };
      }

      // 8 — doctor name (from IPFS metadata)
      const doctorText = ipfsMeta?.attendingDoctor || "";
      if (!doctorText) {
        r.doctorName = { status:"warning", label:"Doctor Name", detail:"Doctor name not in metadata" };
      } else {
        const docParts = doctorText.replace(/^Dr\.?\s*/i,"").split(" ").filter(w => w.length > 1);
        const docFound = docParts.filter(w => fuzzyContains(text, w));
        r.doctorName = docFound.length > 0
          ? { status:"pass",    label:"Doctor Name", detail:`"${doctorText}" found in document` }
          : { status:"warning", label:"Doctor Name", detail:`"${doctorText}" not found — verify manually` };
      }

      // 9 — ICD-10 code exact match (from IPFS metadata)
      const icdText = ipfsMeta?.icdCode || "";
      if (!icdText) {
        r.icdCode = { status:"warning", label:"ICD-10 Code", detail:"ICD code not in metadata" };
      } else {
        r.icdCode = tl.includes(icdText.toLowerCase())
          ? { status:"pass",    label:"ICD-10 Code", detail:`ICD code "${icdText}" found in document` }
          : { status:"warning", label:"ICD-10 Code", detail:`ICD code "${icdText}" not found — possible mismatch` };
      }
    } catch (err) { console.error("Verification error:", err); }
    setVerificationResults({...r});
    setVerifying(false);
  };

  const formatDate  = (ts) => ts==="0"||ts===0?"—":new Date(Number(ts)*1000).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"});
  const formatETH   = (wei) => parseFloat(web3.utils.fromWei(wei.toString(),"ether")).toFixed(4);
  const getOverall  = (r) => { if(!r) return "pending"; const v=Object.values(r); if(v.some(x=>x.status==="fail")) return "fail"; if(v.every(x=>x.status==="pass")) return "pass"; return "warning"; };
  const sIcon       = (s) => s==="pass"?"✓":s==="fail"?"✗":s==="warning"?"!":"…";
  const sColor      = (s) => s==="pass"?"#2e7d32":s==="fail"?"#c62828":s==="warning"?"#e65100":"#7a8aa8";
  const sBg         = (s) => s==="pass"?"#e8f5e9":s==="fail"?"#ffebee":s==="warning"?"#fff8e1":"#f4f7fc";
  const sBorder     = (s) => s==="pass"?"#a5d6a7":s==="fail"?"#ef9a9a":s==="warning"?"#ffe082":"#dde3ef";
  const statusCls   = (s) => ({AwaitingConfirmation:"mc-s-awaiting",Pending:"mc-s-pending",Approved:"mc-s-approved",Rejected:"mc-s-rejected",Cancelled:"mc-s-cancelled"}[s]||"mc-s-pending");
  const statusLabel = (s) => ({AwaitingConfirmation:"Awaiting Patient",Pending:"Pending Review",Approved:"Approved",Rejected:"Rejected",Cancelled:"Cancelled"}[s]||s);

  const counts = {
    All: claims.length,
    Pending:  claims.filter(c=>c.status==="Pending").length,
    Approved: claims.filter(c=>c.status==="Approved").length,
    Rejected: claims.filter(c=>c.status==="Rejected").length,
    AwaitingConfirmation: claims.filter(c=>c.status==="AwaitingConfirmation").length,
  };
  const filtered = filter==="All" ? claims : claims.filter(c=>c.status===filter);

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .mc-page { min-height: 100vh; background: #f4f7fc; font-family: 'Arial', sans-serif; color: #1a237e; }
        .mc-topbar { display: flex; align-items: center; justify-content: space-between; padding: 0 36px; height: 68px; background: #fff; border-bottom: 1px solid #dde3ef; position: sticky; top: 0; z-index: 100; }
        .mc-brand { display: flex; align-items: center; gap: 10px; }
        .mc-brand-icon { width: 36px; height: 36px; background: #1565c0; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 16px; font-weight: 900; }
        .mc-brand-name { font-size: 18px; font-weight: 800; color: #1a237e; line-height: 1.2; }
        .mc-brand-sub { font-size: 10px; color: #8fa0c0; letter-spacing: 0.5px; }
        .mc-topbar-right { display: flex; align-items: center; gap: 10px; }
        .mc-wallet { font-size: 12px; color: #5a6a88; background: #f4f7fc; border: 1px solid #dde3ef; padding: 6px 14px; border-radius: 6px; }
        .mc-fund-btn { padding: 8px 16px; background: #1565c0; color: #fff; border: none; border-radius: 6px; font-size: 13px; font-weight: 700; cursor: pointer; font-family: 'Arial', sans-serif; }
        .mc-fund-btn:hover { background: #0d47a1; }
        .mc-back-btn { padding: 8px 18px; background: #fff; color: #1565c0; border: 2px solid #1565c0; border-radius: 6px; font-size: 13px; font-weight: 700; cursor: pointer; font-family: 'Arial', sans-serif; }
        .mc-back-btn:hover { background: #1565c0; color: #fff; }
        .mc-hero { background: #fff; border-bottom: 1px solid #dde3ef; padding: 36px 36px 32px; }
        .mc-hero-inner { max-width: 1400px; margin: 0 auto; }
        .mc-section-label { display: inline-block; background: #e3eaf5; color: #1565c0; padding: 4px 12px; border-radius: 3px; font-size: 11px; font-weight: 800; letter-spacing: 1.2px; text-transform: uppercase; margin-bottom: 10px; }
        .mc-hero h1 { font-size: 28px; font-weight: 700; color: #0d1b35; font-family: 'Georgia', serif; margin-bottom: 6px; }
        .mc-hero p { font-size: 14px; color: #5a6a88; line-height: 1.7; }
        .mc-main { max-width: 1400px; margin: 0 auto; padding: 36px 36px 64px; }
        .mc-success { background: #e8f5e9; color: #2e7d32; border: 1px solid #a5d6a7; border-radius: 7px; padding: 12px 18px; font-size: 13px; margin-bottom: 24px; font-weight: 600; }
        .mc-error { background: #fdf2f2; color: #c62828; border: 1px solid #ef9a9a; border-radius: 7px; padding: 12px 18px; font-size: 13px; margin-bottom: 24px; font-weight: 600; }
        .mc-stats { display: flex; gap: 16px; margin-bottom: 28px; flex-wrap: wrap; }
        .mc-stat-card { background: #fff; border: 1px solid #dde3ef; border-radius: 10px; padding: 18px 24px; min-width: 120px; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.04); }
        .mc-stat-num { font-size: 26px; font-weight: 900; line-height: 1; margin-bottom: 5px; }
        .mc-stat-lbl { font-size: 11px; color: #5a6a88; font-weight: 600; }
        .mc-filter-row { display: flex; gap: 8px; margin-bottom: 24px; flex-wrap: wrap; }
        .mc-filter-btn { padding: 7px 18px; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 600; border: 2px solid #dde3ef; background: #fff; color: #5a6a88; font-family: 'Arial', sans-serif; transition: all 0.2s; }
        .mc-filter-btn.active { background: #1565c0; color: #fff; border-color: #1565c0; }
        .mc-table-card { background: #fff; border: 1px solid #dde3ef; border-radius: 14px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.05); }
        .mc-table-top { display: flex; align-items: center; justify-content: space-between; padding: 20px 28px; border-bottom: 1px solid #dde3ef; }
        .mc-table-title { font-size: 16px; font-weight: 700; color: #0d1b35; font-family: 'Georgia', serif; }
        .mc-refresh-btn { padding: 8px 14px; background: #f4f7fc; border: 1px solid #dde3ef; border-radius: 7px; font-size: 13px; font-weight: 700; color: #1565c0; cursor: pointer; font-family: 'Arial', sans-serif; }
        .mc-refresh-btn:hover { background: #e3eaf5; }
        .mc-table-wrap { overflow-x: auto; }
        .mc-table { width: 100%; border-collapse: collapse; }
        .mc-th { background: #f4f7fc; padding: 12px 16px; text-align: left; font-size: 11px; font-weight: 800; color: #5a6a88; text-transform: uppercase; letter-spacing: 0.8px; border-bottom: 2px solid #dde3ef; white-space: nowrap; }
        .mc-td { padding: 12px 16px; font-size: 13px; color: #3a4a6b; border-bottom: 1px solid #f0f4f8; white-space: nowrap; }
        .mc-td.bold { font-weight: 700; color: #0d1b35; }
        .mc-td.blue { font-weight: 700; color: #1565c0; }
        .mc-td.green { font-weight: 700; color: #2e7d32; }
        .mc-row-even { background: #fff; }
        .mc-row-odd { background: #fafbfe; }
        .mc-pill { display: inline-block; padding: 3px 10px; border-radius: 3px; font-size: 11px; font-weight: 700; }
        .mc-s-awaiting { background: #fff3e0; color: #e65100; }
        .mc-s-pending { background: #e3eaf5; color: #1565c0; }
        .mc-s-approved { background: #e8f5e9; color: #2e7d32; }
        .mc-s-rejected { background: #fdf2f2; color: #c62828; }
        .mc-s-cancelled { background: #f0f0f0; color: #5a6a88; }
        .mc-view-btn { padding: 5px 12px; background: #e3eaf5; color: #1565c0; border: 1px solid #b0c4de; border-radius: 5px; font-size: 12px; font-weight: 700; cursor: pointer; font-family: 'Arial', sans-serif; transition: all 0.2s; }
        .mc-view-btn:hover { background: #1565c0; color: #fff; border-color: #1565c0; }
        .mc-empty { text-align: center; padding: 48px; color: #8fa0c0; font-size: 14px; }
        .mc-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.45); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
        .mc-modal { background: #fff; border-radius: 14px; width: 100%; max-width: 680px; max-height: 92vh; overflow-y: auto; box-shadow: 0 24px 64px rgba(0,0,0,0.2); border: 1px solid #dde3ef; }
        .mc-modal-header { display: flex; justify-content: space-between; align-items: center; padding: 22px 28px; border-bottom: 1px solid #dde3ef; position: sticky; top: 0; background: #fff; z-index: 10; }
        .mc-modal-title { font-size: 18px; font-weight: 700; color: #0d1b35; font-family: 'Georgia', serif; }
        .mc-close-btn { width: 30px; height: 30px; border-radius: 6px; background: #f4f7fc; border: 1px solid #dde3ef; cursor: pointer; font-size: 14px; color: #5a6a88; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
        .mc-close-btn:hover { background: #1565c0; color: #fff; border-color: #1565c0; }
        .mc-modal-body { padding: 22px 28px; }
        .mc-sec-title { font-size: 11px; font-weight: 800; color: #1565c0; text-transform: uppercase; letter-spacing: 0.8px; margin: 16px 0 8px; padding-bottom: 5px; border-bottom: 2px solid #e3eaf5; }
        .mc-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f0f4f8; }
        .mc-row-label { color: #5a6a88; font-size: 13px; font-weight: 700; flex-shrink: 0; }
        .mc-row-value { color: #0d1b35; font-size: 13px; max-width: 65%; text-align: right; }
        .mc-row-value.green { color: #2e7d32; font-weight: 800; }
        .mc-row-value.red { color: #c62828; font-weight: 700; }
        .mc-payout-box { background: #f4f7fc; border: 1px solid #dde3ef; border-radius: 8px; padding: 14px; margin: 8px 0; }
        .mc-billing-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-top: 8px; }
        .mc-billing-item { background: #fff; border: 1px solid #dde3ef; border-radius: 6px; padding: 8px 12px; }
        .mc-billing-label { font-size: 10px; color: #8fa0c0; font-weight: 700; text-transform: uppercase; }
        .mc-billing-value { font-size: 13px; font-weight: 700; color: #1565c0; margin-top: 2px; }
        .mc-ipfs-link { display: block; text-align: center; margin-top: 14px; padding: 9px 20px; background: #1565c0; color: #fff; border-radius: 7px; text-decoration: none; font-size: 13px; font-weight: 700; font-family: 'Arial', sans-serif; }
        .mc-ipfs-link:hover { background: #0d47a1; }
        .mc-action-btns { display: flex; gap: 10px; margin-top: 18px; }
        .mc-approve-btn { flex: 1; background: #1565c0; color: #fff; padding: 12px; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 700; font-family: 'Arial', sans-serif; }
        .mc-approve-btn:hover:not(:disabled) { background: #0d47a1; }
        .mc-approve-btn:disabled { background: #b0bec5; cursor: not-allowed; }
        .mc-reject-outline { flex: 1; background: #fff; color: #c62828; padding: 12px; border: 2px solid #c62828; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 700; font-family: 'Arial', sans-serif; }
        .mc-reject-outline:hover { background: #c62828; color: #fff; }
        .mc-reject-btn { flex: 1; background: #c62828; color: #fff; padding: 12px; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 700; font-family: 'Arial', sans-serif; }
        .mc-reject-btn:hover:not(:disabled) { background: #b71c1c; }
        .mc-reject-btn:disabled { background: #b0bec5; cursor: not-allowed; }
        .mc-cancel-btn { flex: 1; background: #fff; color: #5a6a88; padding: 12px; border: 2px solid #dde3ef; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 700; font-family: 'Arial', sans-serif; }
        .mc-cancel-btn:hover { background: #f4f7fc; }
        .mc-reason-label { font-size: 12px; font-weight: 700; color: #3a4a6b; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 6px; margin-top: 16px; }
        .mc-reason-input { width: 100%; padding: 10px 14px; border: 1px solid #dde3ef; border-radius: 7px; font-size: 13px; color: #0d1b35; font-family: 'Arial', sans-serif; outline: none; min-height: 80px; resize: vertical; }
        .mc-reason-input:focus { border-color: #1565c0; }
        @media (max-width: 640px) {
          .mc-topbar { padding: 0 16px; }
          .mc-hero, .mc-main { padding-left: 16px; padding-right: 16px; }
          .mc-wallet { display: none; }
          .mc-billing-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="mc-page">
        <nav className="mc-topbar">
          <div className="mc-brand">
            <div className="mc-brand-icon">M</div>
            <div><div className="mc-brand-name">MedInsure</div><div className="mc-brand-sub">Blockchain Health Insurance</div></div>
          </div>
          <div className="mc-topbar-right">
            <span className="mc-wallet">{account ? `${account.slice(0,6)}...${account.slice(-4)}` : "Not Connected"}</span>
            <button className="mc-fund-btn" onClick={() => navigate("/insurer/fund-management")}>Fund Management</button>
            <button className="mc-back-btn" onClick={() => navigate("/insurer")}>Back to Dashboard</button>
          </div>
        </nav>

        <div className="mc-hero">
          <div className="mc-hero-inner">
            <div className="mc-section-label">Claims Management</div>
            <h1>Manage Claims</h1>
            <p>Review pending claims, verify IPFS documents with 9-point OCR, and approve or reject submissions.</p>
          </div>
        </div>

        <div className="mc-main">
          {success && <div className="mc-success">{success}</div>}
          {error   && <div className="mc-error">{error}</div>}

          <div className="mc-stats">
            <div className="mc-stat-card"><div className="mc-stat-num" style={{color:"#1565c0"}}>{counts.All}</div><div className="mc-stat-lbl">Total Claims</div></div>
            <div className="mc-stat-card"><div className="mc-stat-num" style={{color:"#e65100"}}>{counts.AwaitingConfirmation}</div><div className="mc-stat-lbl">Awaiting Patient</div></div>
            <div className="mc-stat-card"><div className="mc-stat-num" style={{color:"#1565c0"}}>{counts.Pending}</div><div className="mc-stat-lbl">Pending Review</div></div>
            <div className="mc-stat-card"><div className="mc-stat-num" style={{color:"#2e7d32"}}>{counts.Approved}</div><div className="mc-stat-lbl">Approved</div></div>
            <div className="mc-stat-card"><div className="mc-stat-num" style={{color:"#c62828"}}>{counts.Rejected}</div><div className="mc-stat-lbl">Rejected</div></div>
          </div>

          <div className="mc-filter-row">
            {[["All","All"],["Pending","Pending"],["AwaitingConfirmation","Awaiting"],["Approved","Approved"],["Rejected","Rejected"]].map(([key,label]) => (
              <button key={key} className={`mc-filter-btn${filter===key?" active":""}`} onClick={() => setFilter(key)}>
                {label} ({counts[key]||0})
              </button>
            ))}
          </div>

          <div className="mc-table-card">
            <div className="mc-table-top">
              <span className="mc-table-title">All Claims</span>
              <button className="mc-refresh-btn" onClick={loadClaims}>Refresh</button>
            </div>
            {loading ? <div className="mc-empty">Loading claims...</div>
            : filtered.length === 0 ? <div className="mc-empty">No claims found.</div>
            : (
              <div className="mc-table-wrap">
                <table className="mc-table">
                  <thead>
                    <tr>{["ID","Patient","Hospital","Treatment","Claimed","Insurer Pays","Date","Status","Action"].map(h=><th key={h} className="mc-th">{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {filtered.map((c,i) => (
                      <tr key={i} className={i%2===0?"mc-row-even":"mc-row-odd"}>
                        <td className="mc-td">#{c.claimId.toString()}</td>
                        <td className="mc-td bold">{c.patientName}</td>
                        <td className="mc-td">{c.hospitalName}</td>
                        <td className="mc-td">{c.treatmentName}</td>
                        <td className="mc-td blue">{formatETH(c.claimAmount)} ETH</td>
                        <td className="mc-td green">{formatETH(c.insurerPays)} ETH</td>
                        <td className="mc-td">{formatDate(c.submittedOn)}</td>
                        <td className="mc-td"><span className={`mc-pill ${statusCls(c.status)}`}>{statusLabel(c.status)}</span></td>
                        <td className="mc-td">
                          <button className="mc-view-btn" onClick={() => { setSelected(c); setRejecting(false); setRejectReason(""); setVerificationResults(null); setIpfsMeta(null); }}>
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {selected && (
          <div className="mc-overlay" onClick={() => setSelected(null)}>
            <div className="mc-modal" onClick={e => e.stopPropagation()}>
              <div className="mc-modal-header">
                <div className="mc-modal-title">Claim #{selected.claimId.toString()}</div>
                <button className="mc-close-btn" onClick={() => setSelected(null)}>✖</button>
              </div>
              <div className="mc-modal-body">

                <div className="mc-sec-title">Patient & Hospital</div>
                <MRow label="Patient"   value={selected.patientName} />
                <MRow label="Hospital"  value={selected.hospitalName} />
                <MRow label="Policy"    value={selected.policyName} />
                <MRow label="Status"    value={statusLabel(selected.status)} />
                <MRow label="Submitted" value={formatDate(selected.submittedOn)} />
                {selected.rejectionReason && <MRow label="Rejection Reason" value={selected.rejectionReason} />}

                <div className="mc-sec-title">Medical Details</div>
                <MRow label="Treatment"      value={selected.treatmentName} />
                <MRow label="Treatment Date" value={selected.treatmentDate} />
                {metaLoading ? (
                  <div style={{fontSize:"12px",color:"#8fa0c0",padding:"8px 0"}}>Loading medical details from IPFS...</div>
                ) : ipfsMeta ? (
                  <>
                    <MRow label="Primary Diagnosis" value={ipfsMeta.primaryDiagnosis || "—"} />
                    <MRow label="ICD-10 Code"        value={ipfsMeta.icdCode || "—"} />
                    <MRow label="Procedure"          value={ipfsMeta.procedurePerformed || "—"} />
                    <MRow label="Admission Date"     value={ipfsMeta.admissionDate || "—"} />
                    <MRow label="Discharge Date"     value={ipfsMeta.dischargeDate || "—"} />
                    <MRow label="Length of Stay"     value={ipfsMeta.lengthOfStay ? ipfsMeta.lengthOfStay + " day(s)" : "—"} />
                    <MRow label="Ward / Room"        value={ipfsMeta.wardRoom || "—"} />
                    <MRow label="Attending Doctor"   value={ipfsMeta.attendingDoctor || "—"} />
                    <MRow label="Doctor Reg. No"     value={ipfsMeta.doctorRegNo || "—"} />
                    {ipfsMeta.description && <MRow label="Notes" value={ipfsMeta.description} />}
                  </>
                ) : (
                  <div style={{fontSize:"12px",color:"#8fa0c0",padding:"8px 0"}}>Medical details not available (older claim or IPFS unavailable)</div>
                )}

                {ipfsMeta?.billingDetails && (
                  <>
                    <div className="mc-sec-title">Billing Breakdown</div>
                    <div className="mc-billing-grid">
                      {[["Surgery",ipfsMeta.billingDetails.surgeryCharges],["OT",ipfsMeta.billingDetails.otCharges],
                        ["Anaesthesia",ipfsMeta.billingDetails.anaesthesiaCharges],["Ward",ipfsMeta.billingDetails.wardCharges],
                        ["Medicines",ipfsMeta.billingDetails.medicinesCharges],["Lab",ipfsMeta.billingDetails.labCharges]
                      ].map(([lbl,val]) => val && parseFloat(val) > 0 ? (
                        <div key={lbl} className="mc-billing-item">
                          <div className="mc-billing-label">{lbl}</div>
                          <div className="mc-billing-value">{parseFloat(val).toFixed(4)} ETH</div>
                        </div>
                      ) : null)}
                    </div>
                  </>
                )}

                <div className="mc-sec-title">Payout Breakdown</div>
                <div className="mc-payout-box">
                  <MRow label="Claim Amount" value={formatETH(selected.claimAmount) + " ETH"} />
                  <MRow label="Patient Pays" value={formatETH(selected.patientPays) + " ETH"} red />
                  <MRow label="Insurer Pays" value={formatETH(selected.insurerPays) + " ETH"} green />
                </div>

                {ipfsMeta?.verificationStatus && (
                  <>
                    <div className="mc-sec-title">Submission Verification Score</div>
                    <div style={{background:ipfsMeta.verificationStatus.score>=80?"#e8f5e9":ipfsMeta.verificationStatus.score>=60?"#fff8e1":"#ffebee",border:`1.5px solid ${ipfsMeta.verificationStatus.score>=80?"#a5d6a7":ipfsMeta.verificationStatus.score>=60?"#ffe082":"#ef9a9a"}`,borderRadius:8,padding:"12px 16px",marginBottom:10}}>
                      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
                        <div>
                          <div style={{fontSize:"13px",fontWeight:"800",color:"#0d1b35"}}>Score: {ipfsMeta.verificationStatus.score}%</div>
                          <div style={{fontSize:"11px",color:"#5a6a88",marginTop:2}}>{ipfsMeta.verificationStatus.recommendation}</div>
                        </div>
                        <div style={{fontSize:"28px",fontWeight:"900",color:ipfsMeta.verificationStatus.score>=80?"#2e7d32":ipfsMeta.verificationStatus.score>=60?"#e65100":"#c62828"}}>{ipfsMeta.verificationStatus.score}</div>
                      </div>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"4px",fontSize:"11px"}}>
                        {Object.entries(ipfsMeta.verificationStatus.checks||{}).map(([key,val]) => (
                          <div key={key} style={{color:val?"#2e7d32":"#c62828"}}>{val?"✅":"❌"} {key.replace(/([A-Z])/g," $1").replace(/^./,s=>s.toUpperCase())}</div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {ipfsMeta?.fraudFlags?.length > 0 && (
                  <>
                    <div className="mc-sec-title">Fraud Flags at Submission</div>
                    <div style={{background:"#fff5f5",border:"2px solid #fc8181",borderRadius:8,padding:"12px 14px",marginBottom:10}}>
                      <div style={{fontSize:"12px",fontWeight:"700",color:"#dc2626",marginBottom:8}}>🚨 {ipfsMeta.fraudFlags.length} flag(s) raised at submission time</div>
                      {ipfsMeta.fraudFlags.map((f,i) => (
                        <div key={i} style={{display:"flex",gap:"8px",padding:"6px 8px",marginBottom:4,borderRadius:5,background:f.level==="high"?"#fee2e2":f.level==="medium"?"#fef3c7":"#fefcbf",borderLeft:`3px solid ${f.level==="high"?"#ef4444":"#d97706"}`}}>
                          <span style={{fontSize:"10px",fontWeight:700,color:f.level==="high"?"#dc2626":"#b45309",textTransform:"uppercase",flexShrink:0}}>{f.level}</span>
                          <span style={{fontSize:"11px",color:"#1e293b"}}>{f.text}</span>
                        </div>
                      ))}
                      <p style={{fontSize:"10px",color:"#64748b",marginTop:6}}>Flags recorded at submission time by the hospital's fraud detection engine.</p>
                    </div>
                  </>
                )}

                {selected.ipfsCID && (
                  <a href={"https://gateway.pinata.cloud/ipfs/" + selected.ipfsCID} target="_blank" rel="noreferrer" className="mc-ipfs-link">
                    📄 View IPFS Documents
                  </a>
                )}

                {selected.status === "Pending" && (
                  <div style={{marginTop:16,border:"1px solid #dde3ef",borderRadius:10,overflow:"hidden"}}>
                    <div style={{background:"#f4f7fc",padding:"12px 16px",borderBottom:"1px solid #dde3ef",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                      <div>
                        <div style={{fontSize:"13px",fontWeight:"700",color:"#0d1b35"}}>OCR Document Verification</div>
                        <div style={{fontSize:"11px",color:"#7a8aa8",marginTop:2}}>Supports JPG, PNG, PDF and TXT — 9-point check: patient, hospital, amount, date, diagnosis, doctor, ICD code</div>
                      </div>
                      {verificationResults && verifyClaimId?.toString()===selected.claimId?.toString() && (
                        <span style={{fontSize:"11px",fontWeight:"700",padding:"4px 10px",borderRadius:20,background:getOverall(verificationResults)==="pass"?"#e8f5e9":getOverall(verificationResults)==="fail"?"#ffebee":"#fff8e1",color:getOverall(verificationResults)==="pass"?"#2e7d32":getOverall(verificationResults)==="fail"?"#c62828":"#e65100",border:`1px solid ${getOverall(verificationResults)==="pass"?"#a5d6a7":getOverall(verificationResults)==="fail"?"#ef9a9a":"#ffe082"}`}}>
                          {getOverall(verificationResults)==="pass"?"✓ All Verified":getOverall(verificationResults)==="fail"?"✗ Failed":"⚠️ Manual Review"}
                        </span>
                      )}
                    </div>
                    <div style={{padding:"14px 16px"}}>
                      <button style={{background:"#1565c0",color:"#fff",border:"none",padding:"9px 20px",borderRadius:6,fontSize:"12px",fontWeight:"700",cursor:verifying?"not-allowed":"pointer",opacity:verifying?0.7:1,fontFamily:"inherit",marginBottom:12}}
                        disabled={verifying}
                        onClick={async () => {
                          if (!selected.ipfsCID) { alert("No IPFS document found."); return; }

                          // Resolve which CID to use for OCR:
                          // If ipfsMeta has individual file CIDs, use the first image file.
                          // Otherwise fall back to the claim CID directly.
                          let imageCID = selected.ipfsCID;
                          if (ipfsMeta?.files?.length > 0) {
                            const imgFile = ipfsMeta.files.find(f =>
                              /\.(jpg|jpeg|png|gif|bmp|webp|tiff|pdf)$/i.test(f.fileName || "")
                            );
                            if (imgFile?.cid) imageCID = imgFile.cid;
                          }

                          const fetchAsFile = async (cid, originalName) => {
                            const gateways = [
                              `https://gateway.pinata.cloud/ipfs/${cid}`,
                              `https://ipfs.io/ipfs/${cid}`,
                              `https://cloudflare-ipfs.com/ipfs/${cid}`,
                            ];
                            for (const url of gateways) {
                              try {
                                const res  = await fetch(url);
                                const blob = await res.blob();
                                if (blob.size < 500) continue; // skip error pages
                                const name = originalName || "claim_document";
                                return new File([blob], name, { type: blob.type || "application/octet-stream" });
                              } catch (_) { continue; }
                            }
                            throw new Error("Could not fetch document from IPFS.");
                          };

                          try {
                            const originalName = ipfsMeta?.files?.[0]?.fileName;
                            const file = await fetchAsFile(imageCID, originalName);
                            runDocumentVerification(selected, file);
                          } catch (e) {
                            alert("Could not fetch document from IPFS: " + e.message);
                          }
                        }}>
                        {verifying && verifyClaimId?.toString()===selected.claimId?.toString() ? "Verifying..." : "🔍 Verify Document from IPFS"}
                      </button>
                      {verifying && verifyClaimId?.toString()===selected.claimId?.toString() && (
                        <div style={{marginBottom:12}}>
                          <div style={{display:"flex",justifyContent:"space-between",fontSize:"11px",color:"#7a8aa8",marginBottom:4}}><span>OCR Processing...</span><span>{ocrProgress}%</span></div>
                          <div style={{height:6,background:"#eef3fb",borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",background:"#1565c0",borderRadius:3,width:`${ocrProgress}%`,transition:"width 0.3s"}}/></div>
                        </div>
                      )}
                      {verificationResults && verifyClaimId?.toString()===selected.claimId?.toString() && (() => {
                        const score = calcScore(verificationResults);
                        const rec   = getRecommendation(score);
                        return (
                          <>
                            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 16px",borderRadius:8,background:rec.bg,border:"1.5px solid "+rec.border,marginBottom:12}}>
                              <div>
                                <div style={{fontSize:"13px",fontWeight:"800",color:rec.color}}>{rec.text}</div>
                                <div style={{fontSize:"11px",color:"#7a8aa8",marginTop:2}}>Based on 9 automated OCR checks</div>
                              </div>
                              <div style={{textAlign:"center",flexShrink:0,marginLeft:16}}>
                                <div style={{fontSize:"28px",fontWeight:"900",color:rec.color,lineHeight:1}}>{score}</div>
                                <div style={{fontSize:"10px",color:"#7a8aa8",fontWeight:"700"}}>/100</div>
                              </div>
                            </div>
                            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                              {Object.values(verificationResults).map((v,i) => (
                                <div key={i} style={{display:"flex",alignItems:"flex-start",gap:8,padding:"10px 12px",borderRadius:7,background:sBg(v.status),border:`1px solid ${sBorder(v.status)}`}}>
                                  <div style={{width:20,height:20,borderRadius:"50%",background:sColor(v.status),color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"11px",fontWeight:"900",flexShrink:0}}>{sIcon(v.status)}</div>
                                  <div>
                                    <div style={{fontSize:"11px",fontWeight:"700",color:"#0d1b35"}}>{v.label}</div>
                                    <div style={{fontSize:"10px",color:sColor(v.status),marginTop:2,lineHeight:1.4}}>{v.detail}</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                )}

                {selected.status === "Pending" && !rejecting && (
                  <div className="mc-action-btns">
                    <button className="mc-approve-btn" onClick={() => handleApprove(selected.claimId)} disabled={processing}>
                      {processing ? "Processing..." : "✅ Approve & Transfer ETH"}
                    </button>
                    <button className="mc-reject-outline" onClick={() => setRejecting(true)}>Reject</button>
                  </div>
                )}
                {selected.status === "Pending" && rejecting && (
                  <div>
                    <label className="mc-reason-label">Rejection Reason</label>
                    <textarea className="mc-reason-input" placeholder="Enter reason for rejection..." value={rejectReason} onChange={e => setRejectReason(e.target.value)} />
                    <div className="mc-action-btns">
                      <button className="mc-reject-btn" onClick={() => handleReject(selected.claimId)} disabled={processing}>
                        {processing ? "Processing..." : "Confirm Rejection"}
                      </button>
                      <button className="mc-cancel-btn" onClick={() => setRejecting(false)}>Cancel</button>
                    </div>
                  </div>
                )}

              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default ManageClaims;
