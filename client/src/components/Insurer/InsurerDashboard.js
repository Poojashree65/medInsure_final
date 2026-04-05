import React, { useState, useEffect } from "react";

import { useNavigate } from "react-router-dom";

import ClaimContract from "../../contracts/ClaimContract.json";



const CLAIM_CONTRACT_ADDRESS = "0xE84B25aAeE6Bd9efeD250f2327F1Ec47ed44d40e";



function InsurerDashboard({ account, web3 }) {

  const navigate = useNavigate();

  const [pendingClaims, setPendingClaims] = useState(0);

  const [contractBal, setContractBal]     = useState("0");



  useEffect(() => { if (web3 && account) loadStats(); }, [web3, account]);



  const loadStats = async () => {

    try {

      const contract = new web3.eth.Contract(ClaimContract.abi, CLAIM_CONTRACT_ADDRESS);

      const ids = await contract.methods.getAllClaims().call();

      let pending = 0;

      for (let id of ids) {

        const c = await contract.methods.getClaim(id).call();

        if (c.status === "Pending") pending++;

      }

      setPendingClaims(pending);

      const bal = await contract.methods.getContractBalance().call();

      setContractBal(parseFloat(web3.utils.fromWei(bal.toString(),"ether")).toFixed(3));

    } catch (err) { console.error(err); }

  };



  const cards = [

    {

      short: "HM",

      title: "Hospital Management",

      description: "Register and view all hospitals in the MedInsure network.",

      buttonText: "Manage Hospitals",

      route: "/insurer/register-hospital",

    },

    {

      short: "PA",

      title: "Patient Approval",

      description: "Review KYC submissions and approve or reject patient registrations.",

      buttonText: "Approve Patients",

      route: "/insurer/approve-patient",

    },

    {

      short: "PM",

      title: "Policy Management",

      description: "Create new insurance plans and view all existing policies.",

      buttonText: "Manage Policies",

      route: "/insurer/create-policy",

    },

    {

      short: "SB",

      title: "Subscriptions",

      description: "View all patients who subscribed to policies with payment details.",

      buttonText: "View Subscriptions",

      route: "/insurer/subscriptions",

    },

    {

      short: "MC",

      title: "Manage Claims",

      description: "Review pending claims, view IPFS documents, approve or reject.",

      buttonText: pendingClaims > 0 ? `View Claims (${pendingClaims} Pending)` : "View Claims",

      route: "/insurer/manage-claims",

      badge: pendingClaims,

    },

    {

      short: "FM",

      title: "Fund Management",

      description: "Deposit ETH into the contract pool for automated claim payments and monitor balance.",

      buttonText: `Manage Funds (${contractBal} ETH)`,

      route: "/insurer/fund-management",

    },

    {

      short: "MI",

      title: "User Pre-Registration",

      description: "Issue Member IDs to patients. Only patients with a valid Member ID can register.",

      buttonText: "Pre-Register Users",

      route: "/insurer/member-ids",

    },

    {

      short: "FP",

      title: "Fund Allocation Prediction",

      description: "ML-powered 2026 fund deposit recommendations based on predicted claim amounts.",

      buttonText: "View Predictions",

      route: "/insurer/fund-prediction",

    },

  ];



  return (

    <>

      <style>{`

        @import url('https://fonts.googleapis.com/css2?family=Georgia&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }



        .ins-page {

          min-height: 100vh;

          background: #f4f7fc;

          font-family: 'Arial', sans-serif;

          color: #1a237e;

        }



        /* TOPBAR */

        .ins-topbar {

          display: flex;

          align-items: center;

          justify-content: space-between;

          padding: 0 36px;

          height: 68px;

          background: #fff;

          border-bottom: 1px solid #dde3ef;

          position: sticky;

          top: 0;

          z-index: 100;

        }

        .ins-brand {

          display: flex;

          align-items: center;

          gap: 10px;

        }

        .ins-brand-icon {

          width: 36px;

          height: 36px;

          background: #1565c0;

          border-radius: 8px;

          display: flex;

          align-items: center;

          justify-content: center;

          color: #fff;

          font-size: 16px;

          font-weight: 900;

          font-family: 'Arial', sans-serif;

          flex-shrink: 0;

        }

        .ins-brand-name {

          font-size: 18px;

          font-weight: 800;

          color: #1a237e;

          font-family: 'Arial', sans-serif;

          line-height: 1.2;

        }

        .ins-brand-sub {

          font-size: 10px;

          color: #8fa0c0;

          letter-spacing: 0.5px;

          font-family: 'Arial', sans-serif;

        }

        .ins-topbar-right {

          display: flex;

          align-items: center;

          gap: 12px;

        }

        .ins-role-badge {

          font-size: 11px;

          font-weight: 700;

          letter-spacing: 0.8px;

          text-transform: uppercase;

          padding: 4px 12px;

          border-radius: 4px;

          background: #e3eaf5;

          color: #1565c0;

          font-family: 'Arial', sans-serif;

        }

        .ins-wallet {

          font-size: 12px;

          color: #5a6a88;

          background: #f4f7fc;

          border: 1px solid #dde3ef;

          padding: 6px 14px;

          border-radius: 6px;

          font-family: 'Arial', sans-serif;

        }



        /* HERO */

        .ins-hero {

          background: #fff;

          border-bottom: 1px solid #dde3ef;

          padding: 48px 36px 40px;

        }

        .ins-hero-inner {

          max-width: 1320px;

          margin: 0 auto;

        }

        .ins-section-label {

          display: inline-block;

          background: #e3eaf5;

          color: #1565c0;

          padding: 4px 12px;

          border-radius: 3px;

          font-size: 11px;

          font-weight: 800;

          letter-spacing: 1.2px;

          text-transform: uppercase;

          margin-bottom: 14px;

          font-family: 'Arial', sans-serif;

        }

        .ins-hero h1 {

          font-size: clamp(26px, 3vw, 36px);

          font-weight: 700;

          color: #0d1b35;

          line-height: 1.3;

          margin-bottom: 10px;

          font-family: 'Georgia', serif;

        }

        .ins-hero p {

          font-size: 15px;

          color: #5a6a88;

          line-height: 1.8;

          max-width: 600px;

          font-family: 'Arial', sans-serif;

        }



        /* STATS ROW */

        .ins-stats {

          background: #1565c0;

          padding: 0 36px;

        }

        .ins-stats-inner {

          max-width: 1320px;

          margin: 0 auto;

          display: flex;

          align-items: stretch;

        }

        .ins-stat {

          padding: 20px 40px 20px 0;

          margin-right: 40px;

          border-right: 1px solid rgba(255,255,255,0.15);

        }

        .ins-stat:last-child {

          border-right: none;

        }

        .ins-stat-val {

          font-size: 22px;

          font-weight: 900;
                  <div className="ins-card-arrow">↗</div>
          color: #fff;

          font-family: 'Arial', sans-serif;

          line-height: 1;

          margin-bottom: 4px;

        }

        .ins-stat-lbl {

          font-size: 11px;

          color: rgba(255,255,255,0.65);

          font-family: 'Arial', sans-serif;

          letter-spacing: 0.3px;

        }



        /* MAIN CONTENT */

        .ins-main {

          max-width: 1320px;

          margin: 0 auto;

          padding: 48px 36px 64px;

        }

        .ins-grid-label {

          font-size: 11px;

          font-weight: 800;

          letter-spacing: 1.2px;

          text-transform: uppercase;

          color: #8fa0c0;

          font-family: 'Arial', sans-serif;

          margin-bottom: 20px;

        }

        .ins-cards {

          display: grid;

          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));

          gap: 24px;

        }



        /* CARD */

        .ins-card {

          background: #fff;

          border: 1px solid #dde3ef;

          border-radius: 14px;

          padding: 32px;

          cursor: pointer;

          transition: all 0.25s ease;

          position: relative;

          display: flex;

          flex-direction: column;

        }

        .ins-card:hover {

          transform: translateY(-4px);

          box-shadow: 0 12px 32px rgba(21,101,192,0.12);

          border-color: #b0c4de;

        }

        .ins-card-header {

          display: flex;

          align-items: flex-start;

          justify-content: space-between;

          margin-bottom: 16px;

        }

        .ins-card-icon-box {

          width: 48px;

          height: 48px;

          background: #e3eaf5;

          border-radius: 10px;

          display: flex;

          align-items: center;

          justify-content: center;

          font-size: 14px;

          font-weight: 800;

          color: #1565c0;

          font-family: 'Arial', sans-serif;

          letter-spacing: 0.5px;

          flex-shrink: 0;

        }

        .ins-card-arrow {

          width: 32px;

          height: 32px;

          border: 1px solid #dde3ef;

          border-radius: 8px;

          display: flex;

          align-items: center;

          justify-content: center;

          font-size: 14px;

          color: #8fa0c0;

          font-family: 'Arial', sans-serif;

          transition: all 0.2s;

          flex-shrink: 0;

        }

        .ins-card:hover .ins-card-arrow {

          background: #1565c0;

          border-color: #1565c0;

          color: #fff;

        }

        .ins-card-title {

          font-size: 17px;

          font-weight: 700;

          color: #0d1b35;

          margin-bottom: 8px;

          font-family: 'Georgia', serif;

        }

        .ins-card-desc {

          font-size: 13px;

          color: #5a6a88;

          line-height: 1.7;

          margin-bottom: 24px;

          flex: 1;

          font-family: 'Arial', sans-serif;

        }

        .ins-card-btn {

          width: 100%;

          padding: 12px 16px;

          background: #fff;

          color: #1565c0;

          border: 2px solid #1565c0;

          border-radius: 8px;

          font-size: 13px;

          font-weight: 700;

          cursor: pointer;

          font-family: 'Arial', sans-serif;

          letter-spacing: 0.3px;

          transition: all 0.2s;

          text-align: center;

        }

        .ins-card-btn:hover {

          background: #1565c0;

          color: #fff;

        }

        .ins-card-btn.primary {

          background: #1565c0;

          color: #fff;

        }

        .ins-card-btn.primary:hover {

          background: #0d47a1;

        }



        /* PENDING BADGE */

        .ins-pending-badge {

          position: absolute;

          top: -8px;

          right: 20px;

          background: #c62828;

          color: #fff;

          font-size: 11px;

          font-weight: 800;

          padding: 3px 10px;

          border-radius: 3px;

          font-family: 'Arial', sans-serif;

          letter-spacing: 0.3px;

        }



        /* FOOTER */

        .ins-footer {

          text-align: center;

          padding: 24px 36px;

          border-top: 1px solid #dde3ef;

          font-size: 12px;

          color: #8fa0c0;

          font-family: 'Arial', sans-serif;

          background: #fff;

        }



        @media (max-width: 640px) {

          .ins-topbar { padding: 0 16px; }

          .ins-hero { padding: 32px 16px; }

          .ins-main { padding: 32px 16px 48px; }

          .ins-wallet { display: none; }

          .ins-stats { padding: 0 16px; }

        }

      `}</style>



      <div className="ins-page">



        {/* TOPBAR */}

        <nav className="ins-topbar">

          <div className="ins-brand">

            <div className="ins-brand-icon">M</div>

            <div>

              <div className="ins-brand-name">MedInsure</div>

              <div className="ins-brand-sub">Blockchain Health Insurance</div>

            </div>

          </div>

          <div className="ins-topbar-right">

            <span className="ins-role-badge">Insurer</span>

            <span className="ins-wallet">

              {account ? `${account.slice(0, 6)}...${account.slice(-4)}` : "Not Connected"}

            </span>

          </div>

        </nav>



        {/* HERO */}

        <div className="ins-hero">

          <div className="ins-hero-inner">

            <div className="ins-section-label">Insurer Control Panel</div>

            <h1>Manage Your Insurance Network</h1>

            <p>

              Register hospitals, approve patients, create blockchain-verified policies,

              manage claims and fund the contract pool from a single dashboard.

            </p>

          </div>

        </div>



        {/* STATS BAR */}

        <div className="ins-stats">

          <div className="ins-stats-inner">

            {[

              { val: `${contractBal} ETH`, lbl: "Contract Balance" },

              { val: pendingClaims, lbl: "Pending Claims" },

              { val: "Ethereum", lbl: "Network" },

              { val: "Active", lbl: "System Status" },

            ].map((s, i) => (

              <div key={i} className="ins-stat">

                <div className="ins-stat-val">{s.val}</div>

                <div className="ins-stat-lbl">{s.lbl}</div>

              </div>

            ))}

          </div>

        </div>



        {/* CARDS */}

        <div className="ins-main">

          <div className="ins-grid-label">Management Modules</div>

          <div className="ins-cards">

            {cards.map((card, i) => (

              <div

                key={i}

                className="ins-card"

                onClick={() => navigate(card.route)}

              >

                {card.badge > 0 && (

                  <div className="ins-pending-badge">{card.badge} Pending</div>

                )}

                <div className="ins-card-header">

                  <div className="ins-card-icon-box">

                    {card.short}

                  </div>

                  <div className="ins-card-arrow">↗</div>

                </div>

                <div className="ins-card-title">{card.title}</div>

                <div className="ins-card-desc">{card.description}</div>

                <button

                  className={`ins-card-btn${card.badge > 0 ? " primary" : ""}`}

                  onClick={(e) => { e.stopPropagation(); navigate(card.route); }}

                >

                  {card.buttonText} →

                </button>

              </div>

            ))}

          </div>

        </div>



        {/* FOOTER */}

        <div className="ins-footer">

          MedInsure &nbsp;&middot;&nbsp; Ethereum Blockchain &nbsp;&middot;&nbsp; Ganache Local Network

        </div>



      </div>

    </>

  );

}



export default InsurerDashboard;