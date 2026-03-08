import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Web3 from "web3";

// Insurer Pages
import InsurerDashboard  from "./components/Insurer/InsurerDashboard";
import RegisterHospital  from "./components/Insurer/RegisterHospital";
import ApprovePatient    from "./components/Insurer/ApprovePatient";
import CreatePolicy      from "./components/Insurer/CreatePolicy";
import ViewSubscriptions from "./components/Insurer/ViewSubscriptions";
import ManageClaims      from "./components/Insurer/ManageClaims";
import FundManagement    from "./components/Insurer/FundManagement";

// Patient Pages
import PatientDashboard  from "./components/Patient/PatientDashboard";
import PatientRegister   from "./components/Patient/PatientRegister";
import SubscribePolicy   from "./components/Patient/SubscribePolicy";

// Hospital Pages
import HospitalDashboard from "./components/Hospital/HospitalDashboard";
import SubmitClaim       from "./components/Hospital/SubmitClaim";
import HospitalClaims    from "./components/Hospital/HospitalClaims";

// Home
import Home              from "./components/Home";

// Contracts
import UserRegistry      from "./contracts/UserRegistry.json";
import HospitalRegistry  from "./contracts/HospitalRegistry.json";

const USER_REGISTRY_ADDRESS     = "0xd9dce72Ad47519b83Bc8a65a8D2E442dA7a50851";
const HOSPITAL_REGISTRY_ADDRESS = "0x7B13E94a2f62D998CBD0e9471a5b750c1FDE2DF6";
const INSURER_ADDRESS           = "0x7aeb3B8Be43D2fCB48216B08ce8115252968A99E";

function App() {
  const [web3, setWeb3]       = useState(null);
  const [account, setAccount] = useState(null);
  const [role, setRole]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { initWeb3(); }, []);

  const initWeb3 = async () => {
    try {
      if (!window.ethereum) { alert("Please install MetaMask!"); setLoading(false); return; }
      const w3 = new Web3(window.ethereum);
      await window.ethereum.request({ method: "eth_requestAccounts" });
      const accounts = await w3.eth.getAccounts();
      const current  = accounts[0];
      setWeb3(w3); setAccount(current);
      const detectedRole = await detectRole(w3, current);
      setRole(detectedRole);
      setLoading(false);
      window.ethereum.on("accountsChanged", async (newAccounts) => {
        const newAccount = newAccounts[0];
        setAccount(newAccount); setRole(null); setLoading(true);
        const newRole = await detectRole(w3, newAccount);
        setRole(newRole); setLoading(false);
      });
    } catch (err) { console.error("Web3 init error:", err); setLoading(false); }
  };

  const detectRole = async (w3, currentAccount) => {
    try {
      if (INSURER_ADDRESS && currentAccount.toLowerCase() === INSURER_ADDRESS.toLowerCase()) return "insurer";
      const hospitalContract = new w3.eth.Contract(HospitalRegistry.abi, HOSPITAL_REGISTRY_ADDRESS);
      const isHospital = await hospitalContract.methods.checkHospital(currentAccount).call();
      if (isHospital) return "hospital";
      const userContract = new w3.eth.Contract(UserRegistry.abi, USER_REGISTRY_ADDRESS);
      const isPatient = await userContract.methods.checkPatientRegistered(currentAccount).call();
      if (isPatient) return "patient";
      return "patient";
    } catch (err) { console.error("Role detection error:", err); return "patient"; }
  };

  if (loading) {
    return (
      <div style={loadingStyle}>
        <div style={logoBox}>M</div>
        <h2 style={{ color: "#fff", marginBottom: "8px", fontSize: "24px", fontWeight: "800", fontFamily: "Arial, sans-serif" }}>MedInsure</h2>
        <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "14px", marginBottom: "28px", fontFamily: "Arial, sans-serif" }}>Connecting to blockchain...</p>
        <div style={spinner} />
      </div>
    );
  }

  return (
    <Router>
      <Routes>

        {/* HOME */}
        <Route path="/" element={<Home account={account} web3={web3} role={role} />} />

        {/* ── INSURER ROUTES ── */}
        <Route path="/insurer"                   element={role === "insurer" ? <InsurerDashboard  account={account} web3={web3} /> : <Navigate to="/" />} />
        <Route path="/insurer/register-hospital" element={role === "insurer" ? <RegisterHospital  account={account} web3={web3} /> : <Navigate to="/" />} />
        <Route path="/insurer/approve-patient"   element={role === "insurer" ? <ApprovePatient    account={account} web3={web3} /> : <Navigate to="/" />} />
        <Route path="/insurer/create-policy"     element={role === "insurer" ? <CreatePolicy      account={account} web3={web3} /> : <Navigate to="/" />} />
        <Route path="/insurer/subscriptions"     element={role === "insurer" ? <ViewSubscriptions account={account} web3={web3} /> : <Navigate to="/" />} />
        <Route path="/insurer/manage-claims"     element={role === "insurer" ? <ManageClaims      account={account} web3={web3} /> : <Navigate to="/" />} />
        <Route path="/insurer/fund-management"   element={role === "insurer" ? <FundManagement    account={account} web3={web3} /> : <Navigate to="/" />} />

        {/* ── PATIENT ROUTES ── */}
        {/* ✅ FIXED: routes now use /patient/* to match Home.jsx navigation */}
        <Route path="/patient/dashboard"        element={role === "patient" ? <PatientDashboard  account={account} web3={web3} /> : <Navigate to="/" />} />
        <Route path="/patient/register"         element={role === "patient" ? <PatientRegister   account={account} web3={web3} /> : <Navigate to="/" />} />
        <Route path="/patient/subscribe-policy" element={role === "patient" ? <SubscribePolicy   account={account} web3={web3} /> : <Navigate to="/" />} />

        {/* ── HOSPITAL ROUTES ── */}
        <Route path="/hospital/dashboard"       element={role === "hospital" ? <HospitalDashboard account={account} web3={web3} /> : <Navigate to="/" />} />
        <Route path="/hospital/submit-claim"    element={role === "hospital" ? <SubmitClaim       account={account} web3={web3} /> : <Navigate to="/" />} />
        <Route path="/hospital/claims"          element={role === "hospital" ? <HospitalClaims    account={account} web3={web3} /> : <Navigate to="/" />} />

        {/* FALLBACK */}
        <Route path="*" element={<Navigate to="/" />} />

      </Routes>
    </Router>
  );
}

const loadingStyle = {
  display: "flex", flexDirection: "column", alignItems: "center",
  justifyContent: "center", minHeight: "100vh",
  backgroundColor: "#0a1628", fontFamily: "Arial, sans-serif",
};

const logoBox = {
  width: "56px", height: "56px", background: "#1565c0", borderRadius: "14px",
  display: "flex", alignItems: "center", justifyContent: "center",
  color: "#fff", fontSize: "28px", fontWeight: "900", marginBottom: "16px",
};

const spinner = {
  width: "36px", height: "36px",
  border: "3px solid rgba(255,255,255,0.1)",
  borderTop: "3px solid #1565c0",
  borderRadius: "50%",
  animation: "spin 0.8s linear infinite",
};

export default App;