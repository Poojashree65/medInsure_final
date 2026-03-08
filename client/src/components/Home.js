import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function Home({ account, web3, role }) {
  const navigate = useNavigate();
  const [scrollY, setScrollY] = useState(0);
  const [activeTab, setActiveTab] = useState("inclusions");
  const [activeFaq, setActiveFaq] = useState(null);
  const [selectedRole, setSelectedRole] = useState("");
  const [loginHovered, setLoginHovered] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleLogin = () => {
    if (!selectedRole) return;
    if (selectedRole === "insurer") navigate("/insurer");
    else if (selectedRole === "hospital") navigate("/hospital/dashboard");
    else navigate("/patient/dashboard");
  };

  const handleRegister = () => navigate("/patient/register");

  const stats = [
    { value: "14,000+", label: "Network Hospitals" },
    { value: "Under 1 Minute", label: "Claim Settlement" },
    { value: "Zero", label: "TPA Commission" },
    { value: "99%", label: "Claim Approval Rate" },
  ];

  const plans = [
    {
      name: "Individual Health Plan",
      premium: "0.1 ETH / month",
      coverage: "5 ETH",
      copay: "10%",
      deductible: "0.05 ETH",
      tag: "Most Popular",
      highlight: false,
      features: [
        "Hospitalization Cover",
        "Pre & Post Hospitalization",
        "Day Care Treatment",
        "Emergency Care",
        "Lab Tests & Diagnostics",
      ],
    },
    {
      name: "Family Health Plan",
      premium: "0.35 ETH / month",
      coverage: "20 ETH",
      copay: "5%",
      deductible: "0.01 ETH",
      tag: "Best Value",
      highlight: true,
      features: [
        "All Individual Features",
        "Maternity & Newborn Cover",
        "Pediatric Care",
        "Annual Health Checkup",
        "Dental Emergencies",
      ],
    },
    {
      name: "Senior Citizen Plan",
      premium: "0.25 ETH / month",
      coverage: "10 ETH",
      copay: "5%",
      deductible: "0.02 ETH",
      tag: "Senior Care",
      highlight: false,
      features: [
        "Pre-existing Disease Cover",
        "Domiciliary Treatment",
        "Organ Donor Expenses",
        "AYUSH Cover",
        "Free Annual Checkup",
      ],
    },
  ];

  const whyUs = [
    {
      title: "Instant Claim Settlement",
      desc: "Claims are validated and settled in under one minute through Ethereum smart contracts, eliminating manual processing entirely.",
    },
    {
      title: "Blockchain Secured Records",
      desc: "Every transaction, policy and claim is recorded on an immutable Ethereum blockchain — transparent and tamper-proof by design.",
    },
    {
      title: "Three-Layer KYC Verification",
      desc: "Face Recognition, Aadhaar OTP and MetaMask wallet authentication ensure only genuine individuals access the platform.",
    },
    {
      title: "IPFS Document Storage",
      desc: "Medical documents are stored on IPFS with on-chain hash verification. Any tampering is automatically detected and rejected.",
    },
    {
      title: "Zero Commission Overhead",
      desc: "Smart contracts replace TPA intermediaries completely, eliminating the 3–5% commission charged on every claim settlement.",
    },
    {
      title: "ML-Powered Fund Allocation",
      desc: "An XGBoost machine learning model analyzes claim history and risk factors to predict optimal fund allocation for insurers.",
    },
  ];

  const inclusions = [
    { title: "Hospitalization Expenses", desc: "Covers room rent, ICU charges, surgery expenses, doctor consultations and nursing charges incurred during hospitalization." },
    { title: "Pre & Post Hospitalization", desc: "Medical expenses incurred before and after hospitalization related to the primary treatment are fully covered." },
    { title: "Day Care Treatment", desc: "Treatments and surgeries that do not require 24-hour hospitalization are covered under all plans." },
    { title: "Emergency Care", desc: "All emergency medical treatments at any of the 14,000+ networked hospitals are covered from day one." },
    { title: "Ambulance Charges", desc: "Transportation expenses to the hospital during a health emergency are included in the coverage." },
    { title: "Annual Health Checkup", desc: "Periodic health checkups are covered annually to support preventive care and early detection." },
  ];

  const exclusions = [
    { title: "Cosmetic Procedures", desc: "Treatments undertaken for cosmetic purposes that are not medically necessary are excluded from all plans." },
    { title: "Self-Inflicted Injuries", desc: "Any injuries caused intentionally by the insured individual are not covered under the policy terms." },
    { title: "War & Terrorism", desc: "Injuries or illnesses arising from war, acts of terrorism or nuclear activities are excluded." },
    { title: "Substance Abuse Treatment", desc: "Medical treatment for drug addiction, alcoholism or any substance dependency is not covered." },
    { title: "Experimental Treatments", desc: "Unproven or experimental medical procedures not approved by recognized medical authorities are excluded." },
    { title: "Routine Dental Procedures", desc: "Routine dental care is excluded unless the treatment arises directly from an accidental injury." },
  ];

  const waitingPeriods = [
    { period: "0 Days", title: "Accidents & Emergencies", desc: "Immediate coverage for accidental injuries and all emergency treatments from the first day of the policy." },
    { period: "30 Days", title: "General Illnesses", desc: "A standard 30-day waiting period applies for general illness claims after the policy subscription date." },
    { period: "2 Years", title: "Pre-existing Diseases", desc: "Conditions diagnosed before the policy was purchased are covered after a mandatory 2-year waiting period." },
    { period: "9 Months", title: "Maternity Benefits", desc: "Maternity-related expenses and newborn cover become active after a 9-month waiting period." },
  ];

  const faqs = [
    {
      q: "What is MedInsure and how is it different from traditional insurance?",
      a: "MedInsure is India's first blockchain-based health insurance platform that eliminates Third Party Administrator intermediaries entirely. Traditional insurance takes 7–30 days to settle claims and charges 3–5% commission. MedInsure settles claims in under one minute through Ethereum smart contracts with zero commission overhead.",
    },
    {
      q: "How does the claim settlement process work?",
      a: "The hospital submits a claim with IPFS-secured documents. The insured individual receives a notification and confirms the claim. The insurer reviews the submission. Once approved, the smart contract automatically transfers the calculated payment to the hospital — the entire process takes minutes, not days.",
    },
    {
      q: "Is personal and medical data secure on the blockchain?",
      a: "Yes. All records are stored on the Ethereum blockchain, which is immutable and tamper-proof. Medical documents are stored on IPFS, and a unique cryptographic hash is recorded on-chain. Any tampering with the original document is instantly detectable.",
    },
    {
      q: "What does the three-layer KYC process involve?",
      a: "MedInsure uses mobile OTP verification for contact authentication, Aadhaar hash verification for government identity confirmation, and face recognition for biometric verification. This three-layer approach makes identity fraud virtually impossible.",
    },
    {
      q: "Can a claim be filed before completing one full year of premium payments?",
      a: "Yes. As long as the policy is active on the day of treatment, a claim will be processed immediately. There is no requirement to complete 12 months of payments before filing a claim. However, monthly premiums must continue to be paid to maintain active coverage.",
    },
    {
      q: "What happens if a monthly premium payment is missed?",
      a: "A seven-day grace period is available after the payment due date. If the premium is not received within this period, the smart contract automatically suspends the policy. Coverage can be reinstated by paying the outstanding premium amount.",
    },
  ];

  const steps = [
    { num: "01", title: "Register & KYC", desc: "Complete registration with Aadhaar OTP and face recognition biometric verification." },
    { num: "02", title: "Choose Your Plan", desc: "Browse available health plans and subscribe to the one that meets your coverage needs." },
    { num: "03", title: "Pay Premium", desc: "Pay your monthly premium securely via your connected blockchain wallet." },
    { num: "04", title: "Receive Treatment", desc: "Visit any of 14,000+ networked hospitals for your medical treatment." },
    { num: "05", title: "Claim Submitted", desc: "The hospital submits IPFS-secured claim documents automatically on the blockchain." },
    { num: "06", title: "Instant Settlement", desc: "The smart contract approves and transfers payment to the hospital within seconds." },
  ];

  const roleOptions = [
    { value: "insurer", label: "Insurer", desc: "Insurance Company Administrator" },
    { value: "hospital", label: "Hospital", desc: "Healthcare Provider" },
    { value: "user", label: "Policy Holder", desc: "Insured Individual" },
  ];

  const tabData = { inclusions, exclusions, waitingPeriods };
  const tabLabels = {
    inclusions: "Inclusions",
    exclusions: "Exclusions",
    waitingPeriods: "Waiting Period",
  };

  return (
    <div style={S.page}>

      {/* NAVBAR */}
      <nav style={{
        ...S.navbar,
        boxShadow: scrollY > 40 ? "0 2px 20px rgba(0,0,0,0.10)" : "0 1px 0 #dde3ef",
        background: scrollY > 40 ? "rgba(255,255,255,0.98)" : "#fff",
      }}>
        <div style={S.navInner}>
          <div style={S.navBrand}>
            <div style={S.navLogo}>M</div>
            <div>
              <div style={S.navBrandName}>MedInsure</div>
              <div style={S.navBrandSub}>Blockchain Health Insurance</div>
            </div>
          </div>
          <div style={S.navLinks}>
            {[["#plans","Health Plans"],["#whyus","Why MedInsure"],["#howitworks","How It Works"],["#coverage","Coverage"],["#login","Login"],["#faq","FAQs"]].map(([href, label]) => (
              <a key={href} href={href} style={S.navLink}>{label}</a>
            ))}
          </div>
          <a href="#login" style={S.navCta}>Access Dashboard</a>
        </div>
      </nav>

      {/* HERO */}
      <section style={S.hero}>
        <div style={S.heroBgStripe} />
        <div style={S.heroInner}>
          <div style={S.heroLeft}>
            <div style={S.heroPill}>India's First Blockchain Health Insurance Platform</div>
            <h1 style={S.heroH1}>
              Health Insurance<br />
              <span style={S.heroAccent}>Reimagined</span> for the<br />
              Digital Era
            </h1>
            <p style={S.heroP}>
              No TPA intermediaries. No settlement delays. No hidden charges.
              Instant, transparent and fraud-proof health insurance powered
              by Ethereum smart contracts.
            </p>
            <div style={S.heroStatRow}>
              {stats.map((s, i) => (
                <div key={i} style={S.heroStat}>
                  <div style={S.heroStatVal}>{s.value}</div>
                  <div style={S.heroStatLbl}>{s.label}</div>
                </div>
              ))}
            </div>
            <div style={S.heroBtns}>
              <a href="#login" style={S.heroBtnPrimary}>Access Your Dashboard</a>
              <a href="#plans" style={S.heroBtnSecondary}>View Health Plans</a>
            </div>
          </div>
          <div style={S.heroRight}>
            <div style={S.heroCard}>
              <div style={S.heroCardHeader}>
                <div style={S.heroCardLogo}>M</div>
                <div>
                  <div style={S.heroCardTitle}>MedInsure Platform</div>
                  <div style={S.heroCardSub}>Blockchain Health Insurance</div>
                </div>
              </div>
              <div style={S.heroCardDivider} />
              <div style={S.heroCardFeatures}>
                {[
                  "Ethereum blockchain security",
                  "Three-layer KYC verification",
                  "IPFS tamper-proof documents",
                  "Smart contract automation",
                  "ML-powered fund allocation",
                  "Real-time claim transparency",
                ].map((f, i) => (
                  <div key={i} style={S.heroCardFeature}>
                    <div style={S.heroCardFeatureDot} />
                    <span>{f}</span>
                  </div>
                ))}
              </div>
              <div style={S.heroCardDivider} />
              <div style={S.heroCardFooter}>Secured by Ethereum Blockchain</div>
            </div>
          </div>
        </div>
      </section>

      {/* STATS BAR */}
      <div style={S.statsBar}>
        <div style={S.statsInner}>
          {stats.map((s, i) => (
            <div key={i} style={S.statItem}>
              <div style={S.statVal}>{s.value}</div>
              <div style={S.statLbl}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* PLANS */}
      <section id="plans" style={S.sec}>
        <div style={S.secInner}>
          <div style={S.secLabel}>HEALTH INSURANCE PLANS</div>
          <h2 style={S.secH2}>Health Plans Designed for Every Stage of Life</h2>
          <p style={S.secP}>Transparent pricing, zero hidden charges and blockchain-verified coverage for individuals, families and senior citizens.</p>
          <div style={S.plansGrid}>
            {plans.map((p, i) => (
              <div key={i} style={{
                ...S.planCard,
                border: p.highlight ? "2px solid #1565c0" : "1px solid #dde3ef",
                transform: p.highlight ? "translateY(-6px)" : "none",
                boxShadow: p.highlight ? "0 12px 40px rgba(21,101,192,0.15)" : "0 2px 12px rgba(0,0,0,0.05)",
              }}>
                {p.tag && (
                  <div style={{
                    ...S.planTag,
                    background: p.highlight ? "#1565c0" : "#e3eaf5",
                    color: p.highlight ? "#fff" : "#1565c0",
                  }}>{p.tag}</div>
                )}
                <h3 style={S.planName}>{p.name}</h3>
                <div style={S.planPrice}>{p.premium}</div>
                <div style={S.planCoverage}>Sum Insured: <strong>{p.coverage}</strong></div>
                <div style={S.planMetaRow}>
                  <div style={S.planMeta}><span style={S.planMetaLbl}>Co-pay</span><span style={S.planMetaVal}>{p.copay}</span></div>
                  <div style={S.planMeta}><span style={S.planMetaLbl}>Deductible</span><span style={S.planMetaVal}>{p.deductible}</span></div>
                </div>
                <div style={S.planDivider} />
                <ul style={S.planList}>
                  {p.features.map((f, j) => (
                    <li key={j} style={S.planItem}>
                      <div style={{ ...S.planTick, background: p.highlight ? "#1565c0" : "#1976d2" }} />
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={handleRegister}
                  style={{
                    ...S.planBtn,
                    background: p.highlight ? "#1565c0" : "#fff",
                    color: p.highlight ? "#fff" : "#1565c0",
                    border: "2px solid #1565c0",
                  }}
                >
                  Subscribe Now
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHY US */}
      <section id="whyus" style={{ ...S.sec, background: "#f4f7fc" }}>
        <div style={S.secInner}>
          <div style={S.secLabel}>WHY MEDINSURE</div>
          <h2 style={S.secH2}>Why MedInsure Outperforms Traditional Insurance</h2>
          <p style={S.secP}>Built on Ethereum blockchain with IPFS document storage, AI-powered KYC and machine learning fund prediction.</p>
          <div style={S.whyGrid}>
            {whyUs.map((w, i) => (
              <div key={i} style={S.whyCard}>
                <div style={S.whyNum}>{String(i + 1).padStart(2, "0")}</div>
                <h3 style={S.whyTitle}>{w.title}</h3>
                <p style={S.whyDesc}>{w.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="howitworks" style={S.sec}>
        <div style={S.secInner}>
          <div style={S.secLabel}>HOW IT WORKS</div>
          <h2 style={S.secH2}>From Registration to Settlement in Six Steps</h2>
          <p style={S.secP}>A fully automated, zero-paperwork process with no intermediaries involved at any stage.</p>
          <div style={S.stepsGrid}>
            {steps.map((s, i) => (
              <div key={i} style={S.stepCard}>
                <div style={S.stepNum}>{s.num}</div>
                <h3 style={S.stepTitle}>{s.title}</h3>
                <p style={S.stepDesc}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* COVERAGE */}
      <section id="coverage" style={{ ...S.sec, background: "#f4f7fc" }}>
        <div style={S.secInner}>
          <div style={S.secLabel}>POLICY COVERAGE</div>
          <h2 style={S.secH2}>Understand Your Coverage Before You Choose</h2>
          <p style={S.secP}>Review what is covered, what is excluded and the applicable waiting periods for each plan.</p>
          <div style={S.tabRow}>
            {Object.keys(tabLabels).map(key => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                style={{
                  ...S.tabBtn,
                  background: activeTab === key ? "#1565c0" : "#fff",
                  color: activeTab === key ? "#fff" : "#1565c0",
                  border: "2px solid #1565c0",
                  fontWeight: activeTab === key ? "700" : "600",
                }}
              >
                {tabLabels[key]}
              </button>
            ))}
          </div>

          {activeTab === "waitingPeriods" ? (
            <div style={S.waitGrid}>
              {waitingPeriods.map((w, i) => (
                <div key={i} style={S.waitCard}>
                  <div style={S.waitPeriod}>{w.period}</div>
                  <div style={S.waitTitle}>{w.title}</div>
                  <p style={S.waitDesc}>{w.desc}</p>
                </div>
              ))}
            </div>
          ) : (
            <div style={S.covGrid}>
              {tabData[activeTab].map((item, i) => (
                <div key={i} style={S.covCard}>
                  <div style={{ ...S.covDot, background: activeTab === "inclusions" ? "#1565c0" : "#c62828" }} />
                  <div>
                    <div style={S.covTitle}>{item.title}</div>
                    <p style={S.covDesc}>{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* LOGIN */}
      <section id="login" style={S.sec}>
        <div style={S.secInner}>
          <div style={S.loginWrap}>
            <div style={S.loginLeft}>
              <div style={S.secLabel}>SECURE ACCESS</div>
              <h2 style={S.secH2}>Access Your Dashboard</h2>
              <p style={S.loginDesc}>
                MedInsure provides role-based access to insurers, hospitals and policy holders.
                Select your role, connect your MetaMask wallet and access your personalized dashboard securely.
              </p>
              <div style={S.loginFeatures}>
                {[
                  ["End-to-end blockchain encryption", "Every action is recorded and immutable on Ethereum."],
                  ["MetaMask wallet authentication", "Your wallet address is your unique identity on the platform."],
                  ["Role-based access control", "Each role has a dedicated dashboard with specific permissions."],
                  ["Complete audit trail", "Every transaction and approval is traceable on the blockchain."],
                ].map(([title, desc], i) => (
                  <div key={i} style={S.loginFeature}>
                    <div style={S.loginFeatureDot} />
                    <div>
                      <div style={S.loginFeatureTitle}>{title}</div>
                      <div style={S.loginFeatureDesc}>{desc}</div>
                    </div>
                  </div>
                ))}
              </div>

              {account && (
                <div style={S.walletBox}>
                  <div style={S.walletDot} />
                  <div style={S.walletText}>
                    <span style={{ color: "#555", fontSize: "12px" }}>Connected Wallet</span>
                    <span style={{ fontWeight: "700", color: "#1a237e", fontSize: "13px" }}>
                      {account.slice(0, 8)}...{account.slice(-6)}
                    </span>
                  </div>
                  {role && <div style={S.walletBadge}>{role}</div>}
                </div>
              )}
            </div>

            <div style={S.loginRight}>
              <div style={S.loginCard}>
                <div style={S.loginCardTitle}>Select Your Role</div>
                <div style={S.loginCardSub}>Choose how you access the MedInsure platform</div>

                <div style={S.roleList}>
                  {roleOptions.map((r) => (
                    <label
                      key={r.value}
                      style={{
                        ...S.roleOption,
                        border: selectedRole === r.value ? "2px solid #1565c0" : "2px solid #dde3ef",
                        background: selectedRole === r.value ? "#eef3fb" : "#fff",
                      }}
                    >
                      <input
                        type="radio"
                        name="role"
                        value={r.value}
                        checked={selectedRole === r.value}
                        onChange={() => setSelectedRole(r.value)}
                        style={{ display: "none" }}
                      />
                      <div style={{
                        ...S.roleRadio,
                        border: selectedRole === r.value ? "2px solid #1565c0" : "2px solid #ccc",
                      }}>
                        {selectedRole === r.value && <div style={S.roleRadioFill} />}
                      </div>
                      <div>
                        <div style={{ ...S.roleLabel, color: selectedRole === r.value ? "#1565c0" : "#1a237e" }}>{r.label}</div>
                        <div style={S.roleDesc}>{r.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>

                <button
                  onClick={handleLogin}
                  disabled={!selectedRole}
                  onMouseEnter={() => setLoginHovered(true)}
                  onMouseLeave={() => setLoginHovered(false)}
                  style={{
                    ...S.loginBtn,
                    background: selectedRole ? (loginHovered ? "#0d47a1" : "#1565c0") : "#b0bec5",
                    cursor: selectedRole ? "pointer" : "not-allowed",
                  }}
                >
                  {selectedRole
                    ? `Login as ${roleOptions.find(r => r.value === selectedRole)?.label}`
                    : "Select a Role to Continue"}
                </button>

                <div style={S.registerRow}>
                  <span style={S.registerText}>New to MedInsure?</span>
                  <button onClick={handleRegister} style={S.registerLink}>Register as Policy Holder</button>
                </div>

                <div style={S.loginSecureNote}>
                  Access is secured through MetaMask wallet authentication and Ethereum blockchain verification.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" style={{ ...S.sec, background: "#f4f7fc" }}>
        <div style={S.secInner}>
          <div style={S.secLabel}>FREQUENTLY ASKED QUESTIONS</div>
          <h2 style={S.secH2}>Common Questions, Clear Answers</h2>
          <p style={S.secP}>Everything you need to know about the MedInsure platform and how it works.</p>
          <div style={S.faqList}>
            {faqs.map((f, i) => (
              <div key={i} style={S.faqItem}>
                <button
                  onClick={() => setActiveFaq(activeFaq === i ? null : i)}
                  style={S.faqQ}
                >
                  <span style={S.faqQText}>{f.q}</span>
                  <span style={{ ...S.faqToggle, color: "#1565c0" }}>
                    {activeFaq === i ? "−" : "+"}
                  </span>
                </button>
                {activeFaq === i && <div style={S.faqA}>{f.a}</div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ABOUT */}
      <section style={S.sec}>
        <div style={S.secInner}>
          <div style={S.aboutGrid}>
            <div>
              <div style={S.secLabel}>ABOUT MEDINSURE</div>
              <h2 style={S.secH2}>What is MedInsure?</h2>
              <p style={S.aboutP}>
                MedInsure is India's first blockchain-based health insurance management system built
                on the Ethereum network. It eliminates Third Party Administrator intermediaries entirely
                by automating claim validation, payout calculation and fund disbursement through
                Ethereum smart contracts.
              </p>
              <p style={S.aboutP}>
                Unlike traditional health insurance systems that depend on multiple independent platforms
                — maintained separately by hospitals, TPAs, insurers and banks — MedInsure operates as a
                single, unified blockchain. This eliminates data mismatches, settlement delays and the
                commission overhead that increases the cost of every claim.
              </p>
              <p style={S.aboutP}>
                Identity verification is handled through a mandatory three-layer KYC process combining
                Face Recognition, Aadhaar OTP and MetaMask wallet authentication. Medical documents are
                stored on IPFS with cryptographic hash verification recorded on-chain, making document
                forgery technically impossible.
              </p>
              <button onClick={() => document.getElementById("login").scrollIntoView({ behavior: "smooth" })} style={S.aboutBtn}>
                Access the Platform
              </button>
            </div>
            <div style={S.compareBox}>
              <div style={S.compareTitle}>Traditional Insurance vs MedInsure</div>
              <div style={S.compareGrid}>
                <div style={S.compareCol}>
                  <div style={{ ...S.compareColHead, color: "#c62828" }}>Traditional System</div>
                  {["7–30 days claim settlement","3–5% TPA commission per claim","Four separate systems","Central servers vulnerable to breach","Manual identity verification","No patient visibility into process","No data-driven fund planning"].map((item, i) => (
                    <div key={i} style={S.compareRow}>
                      <div style={{ ...S.compareDot, background: "#ef9a9a" }} />
                      <span style={S.compareText}>{item}</span>
                    </div>
                  ))}
                </div>
                <div style={{ ...S.compareCol, borderLeft: "1px solid #dde3ef", paddingLeft: "24px" }}>
                  <div style={{ ...S.compareColHead, color: "#1b5e20" }}>MedInsure</div>
                  {["Under one minute","Zero commission","Single blockchain","IPFS with hash verification","Three-layer biometric KYC","Real-time dashboard for all roles","XGBoost ML fund prediction"].map((item, i) => (
                    <div key={i} style={S.compareRow}>
                      <div style={{ ...S.compareDot, background: "#81c784" }} />
                      <span style={{ ...S.compareText, color: "#2e7d32" }}>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={S.ctaSec}>
        <div style={S.ctaInner}>
          <div>
            <h2 style={S.ctaH2}>Ready to Experience the Future of Health Insurance?</h2>
            <p style={S.ctaP}>Join thousands of individuals already protected by blockchain-powered MedInsure.</p>
          </div>
          <button onClick={() => document.getElementById("login").scrollIntoView({ behavior: "smooth" })} style={S.ctaBtn}>
            Access Your Dashboard
          </button>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={S.footer}>
        <div style={S.footerInner}>
          <div style={S.footerTop}>
            <div style={S.footerBrand}>
              <div style={S.footerLogo}>
                <div style={S.footerLogoIcon}>M</div>
                <div style={S.footerLogoName}>MedInsure</div>
              </div>
              <p style={S.footerAbout}>
                India's first blockchain-powered health insurance management platform.
                Transparent, instant and fraud-proof claim settlement for everyone.
              </p>
              <div style={S.footerContact}>
                <div>1800-425-MEDI (Toll Free)</div>
                <div>support@medinsure.in</div>
                <div>24 x 7 Customer Support</div>
              </div>
            </div>
            {[
              { title: "Health Plans", links: ["Individual Health Plan", "Family Health Plan", "Senior Citizen Plan"] },
              { title: "Platform", links: ["Insurer Dashboard", "Hospital Dashboard", "Policy Holder Dashboard"] },
              { title: "Information", links: ["About MedInsure", "How It Works", "Coverage Details", "FAQs"] },
              { title: "Technology", links: ["Ethereum Blockchain", "IPFS Documents", "Face Recognition KYC", "ML Fund Allocation"] },
            ].map((col, i) => (
              <div key={i} style={S.footerCol}>
                <div style={S.footerColTitle}>{col.title}</div>
                {col.links.map((l, j) => <a key={j} href="#" style={S.footerLink}>{l}</a>)}
              </div>
            ))}
          </div>
          <div style={S.footerBottom}>
            <span>© 2026 MedInsure. All rights reserved.</span>
            <span>Powered by Ethereum Blockchain and IPFS</span>
            <span>Built for better healthcare in India</span>
          </div>
        </div>
      </footer>

    </div>
  );
}

// ─── STYLES ────────────────────────────────────────────────────────────────────
const S = {
  page: { fontFamily: "'Georgia', 'Times New Roman', serif", color: "#1a237e", background: "#fff", overflowX: "hidden" },

  // NAVBAR
  navbar: { position: "fixed", top: 0, left: 0, right: 0, zIndex: 1000, transition: "all 0.3s" },
  navInner: { maxWidth: "1320px", margin: "0 auto", padding: "0 36px", display: "flex", alignItems: "center", gap: "40px", height: "72px" },
  navBrand: { display: "flex", alignItems: "center", gap: "12px", flexShrink: 0 },
  navLogo: { width: "40px", height: "40px", borderRadius: "10px", background: "#1565c0", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", fontWeight: "900", fontFamily: "'Arial', sans-serif" },
  navBrandName: { fontWeight: "800", fontSize: "18px", color: "#1a237e", fontFamily: "'Arial', sans-serif", lineHeight: 1.2 },
  navBrandSub: { fontSize: "10px", color: "#8fa0c0", letterSpacing: "0.5px", fontFamily: "'Arial', sans-serif" },
  navLinks: { flex: 1, display: "flex", gap: "28px", justifyContent: "center" },
  navLink: { color: "#3a4a6b", textDecoration: "none", fontSize: "14px", fontFamily: "'Arial', sans-serif", fontWeight: "500", letterSpacing: "0.2px" },
  navCta: { background: "#1565c0", color: "#fff", padding: "10px 22px", borderRadius: "6px", textDecoration: "none", fontSize: "13px", fontWeight: "700", fontFamily: "'Arial', sans-serif", flexShrink: 0, letterSpacing: "0.3px" },

  // HERO
  hero: { minHeight: "100vh", display: "flex", alignItems: "center", padding: "100px 36px 64px", background: "#f4f7fc", position: "relative", overflow: "hidden" },
  heroBgStripe: { position: "absolute", right: 0, top: 0, bottom: 0, width: "42%", background: "linear-gradient(160deg, #1565c0 0%, #0d47a1 100%)", clipPath: "polygon(12% 0, 100% 0, 100% 100%, 0% 100%)", zIndex: 0 },
  heroInner: { maxWidth: "1320px", margin: "0 auto", width: "100%", display: "flex", alignItems: "center", gap: "80px", position: "relative", zIndex: 1 },
  heroLeft: { flex: 1.1 },
  heroPill: { display: "inline-block", background: "#1565c0", color: "#fff", fontSize: "12px", fontWeight: "700", padding: "5px 14px", borderRadius: "3px", marginBottom: "24px", letterSpacing: "0.8px", fontFamily: "'Arial', sans-serif" },
  heroH1: { fontSize: "clamp(32px, 4vw, 52px)", fontWeight: "700", color: "#0d1b35", lineHeight: 1.2, margin: "0 0 20px", fontFamily: "'Georgia', serif" },
  heroAccent: { color: "#1565c0" },
  heroP: { fontSize: "16px", color: "#4a5a7a", lineHeight: 1.8, margin: "0 0 36px", fontFamily: "'Arial', sans-serif" },
  heroStatRow: { display: "flex", gap: "0", marginBottom: "36px", borderLeft: "3px solid #1565c0" },
  heroStat: { padding: "8px 28px 8px 20px", borderRight: "1px solid #dde3ef" },
  heroStatVal: { fontSize: "20px", fontWeight: "800", color: "#1565c0", fontFamily: "'Arial', sans-serif" },
  heroStatLbl: { fontSize: "11px", color: "#7a8aa8", marginTop: "2px", fontFamily: "'Arial', sans-serif" },
  heroBtns: { display: "flex", gap: "14px" },
  heroBtnPrimary: { background: "#1565c0", color: "#fff", padding: "14px 28px", borderRadius: "6px", textDecoration: "none", fontSize: "14px", fontWeight: "700", fontFamily: "'Arial', sans-serif" },
  heroBtnSecondary: { background: "#fff", color: "#1565c0", padding: "14px 28px", borderRadius: "6px", textDecoration: "none", fontSize: "14px", fontWeight: "700", fontFamily: "'Arial', sans-serif", border: "2px solid #1565c0" },
  heroRight: { flex: 0.9, display: "flex", justifyContent: "center" },
  heroCard: { background: "#fff", borderRadius: "16px", padding: "32px", width: "320px", boxShadow: "0 24px 64px rgba(0,0,0,0.18)", border: "1px solid rgba(255,255,255,0.3)" },
  heroCardHeader: { display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" },
  heroCardLogo: { width: "44px", height: "44px", background: "#1565c0", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "22px", fontWeight: "900", fontFamily: "'Arial', sans-serif", flexShrink: 0 },
  heroCardTitle: { fontWeight: "700", color: "#1a237e", fontSize: "15px", fontFamily: "'Arial', sans-serif" },
  heroCardSub: { fontSize: "11px", color: "#8fa0c0", fontFamily: "'Arial', sans-serif" },
  heroCardDivider: { height: "1px", background: "#eef1f8", margin: "16px 0" },
  heroCardFeatures: { display: "flex", flexDirection: "column", gap: "10px" },
  heroCardFeature: { display: "flex", alignItems: "center", gap: "10px", fontSize: "13px", color: "#3a4a6b", fontFamily: "'Arial', sans-serif" },
  heroCardFeatureDot: { width: "6px", height: "6px", borderRadius: "50%", background: "#1565c0", flexShrink: 0 },
  heroCardFooter: { fontSize: "11px", color: "#1565c0", fontWeight: "600", textAlign: "center", letterSpacing: "0.5px", fontFamily: "'Arial', sans-serif" },

  // STATS BAR
  statsBar: { background: "#1565c0", padding: "28px 36px" },
  statsInner: { maxWidth: "1320px", margin: "0 auto", display: "flex", justifyContent: "space-around", flexWrap: "wrap", gap: "20px" },
  statItem: { textAlign: "center" },
  statVal: { fontSize: "30px", fontWeight: "900", color: "#fff", fontFamily: "'Arial', sans-serif" },
  statLbl: { fontSize: "12px", color: "rgba(255,255,255,0.65)", marginTop: "4px", fontFamily: "'Arial', sans-serif" },

  // SECTIONS
  sec: { padding: "80px 36px" },
  secInner: { maxWidth: "1320px", margin: "0 auto" },
  secLabel: { display: "inline-block", background: "#e3eaf5", color: "#1565c0", padding: "4px 12px", borderRadius: "3px", fontSize: "11px", fontWeight: "800", letterSpacing: "1.2px", marginBottom: "14px", fontFamily: "'Arial', sans-serif" },
  secH2: { fontSize: "clamp(24px, 3vw, 36px)", fontWeight: "700", color: "#0d1b35", margin: "0 0 12px", lineHeight: 1.3, fontFamily: "'Georgia', serif" },
  secP: { fontSize: "15px", color: "#5a6a88", marginBottom: "48px", maxWidth: "640px", lineHeight: 1.8, fontFamily: "'Arial', sans-serif" },

  // PLANS
  plansGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "28px", alignItems: "start" },
  planCard: { background: "#fff", borderRadius: "14px", padding: "32px", position: "relative" },
  planTag: { position: "absolute", top: "-11px", left: "24px", fontSize: "11px", fontWeight: "800", padding: "4px 14px", borderRadius: "3px", letterSpacing: "0.5px", fontFamily: "'Arial', sans-serif" },
  planName: { fontSize: "18px", fontWeight: "700", color: "#1a237e", margin: "0 0 10px", fontFamily: "'Georgia', serif" },
  planPrice: { fontSize: "22px", fontWeight: "800", color: "#1565c0", margin: "0 0 4px", fontFamily: "'Arial', sans-serif" },
  planCoverage: { fontSize: "13px", color: "#7a8aa8", margin: "0 0 16px", fontFamily: "'Arial', sans-serif" },
  planMetaRow: { display: "flex", gap: "24px", marginBottom: "4px" },
  planMeta: { display: "flex", flexDirection: "column", gap: "2px" },
  planMetaLbl: { fontSize: "11px", color: "#a0b0c8", fontFamily: "'Arial', sans-serif", textTransform: "uppercase", letterSpacing: "0.5px" },
  planMetaVal: { fontSize: "15px", fontWeight: "700", color: "#1a237e", fontFamily: "'Arial', sans-serif" },
  planDivider: { height: "1px", background: "#eef1f8", margin: "18px 0" },
  planList: { listStyle: "none", padding: 0, margin: "0 0 24px" },
  planItem: { display: "flex", alignItems: "center", gap: "10px", fontSize: "14px", color: "#3a4a6b", padding: "7px 0", borderBottom: "1px solid #f6f8fc", fontFamily: "'Arial', sans-serif" },
  planTick: { width: "6px", height: "6px", borderRadius: "50%", flexShrink: 0 },
  planBtn: { width: "100%", padding: "13px", borderRadius: "7px", fontSize: "14px", fontWeight: "700", cursor: "pointer", fontFamily: "'Arial', sans-serif", letterSpacing: "0.3px" },

  // WHY US
  whyGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(290px, 1fr))", gap: "24px" },
  whyCard: { background: "#fff", borderRadius: "12px", padding: "28px", border: "1px solid #dde3ef" },
  whyNum: { fontSize: "36px", fontWeight: "900", color: "#1565c0", opacity: 0.15, marginBottom: "10px", fontFamily: "'Arial', sans-serif", lineHeight: 1 },
  whyTitle: { fontSize: "16px", fontWeight: "700", color: "#1a237e", margin: "0 0 8px", fontFamily: "'Georgia', serif" },
  whyDesc: { fontSize: "14px", color: "#5a6a88", lineHeight: 1.75, margin: 0, fontFamily: "'Arial', sans-serif" },

  // HOW IT WORKS
  stepsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: "24px" },
  stepCard: { padding: "28px 20px", background: "#f4f7fc", borderRadius: "12px", border: "1px solid #dde3ef" },
  stepNum: { fontSize: "42px", fontWeight: "900", color: "#1565c0", opacity: 0.18, marginBottom: "6px", fontFamily: "'Arial', sans-serif", lineHeight: 1 },
  stepTitle: { fontSize: "15px", fontWeight: "700", color: "#1a237e", margin: "0 0 8px", fontFamily: "'Georgia', serif" },
  stepDesc: { fontSize: "13px", color: "#5a6a88", lineHeight: 1.7, margin: 0, fontFamily: "'Arial', sans-serif" },

  // COVERAGE TABS
  tabRow: { display: "flex", gap: "12px", marginBottom: "32px", flexWrap: "wrap" },
  tabBtn: { padding: "10px 24px", borderRadius: "6px", fontSize: "14px", cursor: "pointer", fontFamily: "'Arial', sans-serif" },
  covGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "16px" },
  covCard: { display: "flex", gap: "14px", background: "#fff", border: "1px solid #dde3ef", borderRadius: "10px", padding: "20px", alignItems: "flex-start" },
  covDot: { width: "8px", height: "8px", borderRadius: "50%", flexShrink: 0, marginTop: "5px" },
  covTitle: { fontSize: "14px", fontWeight: "700", color: "#1a237e", marginBottom: "5px", fontFamily: "'Georgia', serif" },
  covDesc: { fontSize: "13px", color: "#5a6a88", lineHeight: 1.7, margin: 0, fontFamily: "'Arial', sans-serif" },
  waitGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "20px" },
  waitCard: { background: "#fff", border: "1px solid #dde3ef", borderRadius: "12px", padding: "28px", textAlign: "center" },
  waitPeriod: { fontSize: "28px", fontWeight: "900", color: "#1565c0", marginBottom: "8px", fontFamily: "'Arial', sans-serif" },
  waitTitle: { fontSize: "15px", fontWeight: "700", color: "#1a237e", marginBottom: "8px", fontFamily: "'Georgia', serif" },
  waitDesc: { fontSize: "13px", color: "#5a6a88", lineHeight: 1.7, margin: 0, fontFamily: "'Arial', sans-serif" },

  // LOGIN SECTION
  loginWrap: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "72px", alignItems: "start" },
  loginLeft: {},
  loginDesc: { fontSize: "15px", color: "#5a6a88", lineHeight: 1.8, margin: "0 0 32px", fontFamily: "'Arial', sans-serif" },
  loginFeatures: { display: "flex", flexDirection: "column", gap: "18px", marginBottom: "32px" },
  loginFeature: { display: "flex", gap: "14px", alignItems: "flex-start" },
  loginFeatureDot: { width: "8px", height: "8px", borderRadius: "50%", background: "#1565c0", flexShrink: 0, marginTop: "5px" },
  loginFeatureTitle: { fontSize: "14px", fontWeight: "700", color: "#1a237e", marginBottom: "3px", fontFamily: "'Georgia', serif" },
  loginFeatureDesc: { fontSize: "13px", color: "#7a8aa8", lineHeight: 1.6, fontFamily: "'Arial', sans-serif" },
  walletBox: { display: "flex", alignItems: "center", gap: "12px", background: "#eef3fb", border: "1px solid #c5d5e8", borderRadius: "8px", padding: "12px 16px" },
  walletDot: { width: "10px", height: "10px", borderRadius: "50%", background: "#2e7d32", flexShrink: 0 },
  walletText: { display: "flex", flexDirection: "column", gap: "2px", flex: 1 },
  walletBadge: { background: "#1565c0", color: "#fff", fontSize: "11px", fontWeight: "700", padding: "3px 10px", borderRadius: "4px", textTransform: "capitalize", fontFamily: "'Arial', sans-serif" },
  loginRight: {},
  loginCard: { background: "#fff", border: "1px solid #dde3ef", borderRadius: "16px", padding: "36px", boxShadow: "0 8px 32px rgba(21,101,192,0.08)" },
  loginCardTitle: { fontSize: "22px", fontWeight: "700", color: "#0d1b35", marginBottom: "6px", fontFamily: "'Georgia', serif" },
  loginCardSub: { fontSize: "14px", color: "#8fa0c0", marginBottom: "28px", fontFamily: "'Arial', sans-serif" },
  roleList: { display: "flex", flexDirection: "column", gap: "12px", marginBottom: "24px" },
  roleOption: { display: "flex", alignItems: "center", gap: "14px", padding: "16px 18px", borderRadius: "10px", cursor: "pointer", transition: "all 0.2s" },
  roleRadio: { width: "20px", height: "20px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.2s" },
  roleRadioFill: { width: "8px", height: "8px", borderRadius: "50%", background: "#1565c0" },
  roleLabel: { fontSize: "15px", fontWeight: "700", marginBottom: "2px", fontFamily: "'Georgia', serif" },
  roleDesc: { fontSize: "12px", color: "#8fa0c0", fontFamily: "'Arial', sans-serif" },
  loginBtn: { width: "100%", padding: "15px", borderRadius: "8px", border: "none", color: "#fff", fontSize: "15px", fontWeight: "700", marginBottom: "16px", transition: "background 0.2s", fontFamily: "'Arial', sans-serif", letterSpacing: "0.3px" },
  registerRow: { display: "flex", alignItems: "center", gap: "6px", justifyContent: "center", marginBottom: "20px" },
  registerText: { fontSize: "14px", color: "#8fa0c0", fontFamily: "'Arial', sans-serif" },
  registerLink: { background: "none", border: "none", color: "#1565c0", fontSize: "14px", fontWeight: "700", cursor: "pointer", fontFamily: "'Arial', sans-serif", textDecoration: "underline" },
  loginSecureNote: { fontSize: "12px", color: "#a0b0c8", lineHeight: 1.6, textAlign: "center", paddingTop: "16px", borderTop: "1px solid #eef1f8", fontFamily: "'Arial', sans-serif" },

  // FAQ
  faqList: { maxWidth: "860px" },
  faqItem: { border: "1px solid #dde3ef", borderRadius: "10px", marginBottom: "10px", overflow: "hidden" },
  faqQ: { width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 24px", background: "#fff", border: "none", cursor: "pointer", gap: "20px" },
  faqQText: { fontSize: "15px", fontWeight: "700", color: "#1a237e", textAlign: "left", fontFamily: "'Georgia', serif" },
  faqToggle: { fontSize: "22px", fontWeight: "700", flexShrink: 0, fontFamily: "'Arial', sans-serif" },
  faqA: { padding: "4px 24px 20px", fontSize: "14px", color: "#5a6a88", lineHeight: 1.8, background: "#fafbfe", fontFamily: "'Arial', sans-serif" },

  // ABOUT
  aboutGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "72px", alignItems: "start" },
  aboutP: { fontSize: "15px", color: "#5a6a88", lineHeight: 1.8, margin: "0 0 16px", fontFamily: "'Arial', sans-serif" },
  aboutBtn: { background: "#1565c0", color: "#fff", border: "none", padding: "14px 28px", borderRadius: "7px", fontSize: "14px", fontWeight: "700", cursor: "pointer", marginTop: "8px", fontFamily: "'Arial', sans-serif" },
  compareBox: { background: "#f4f7fc", borderRadius: "14px", padding: "32px", border: "1px solid #dde3ef" },
  compareTitle: { fontSize: "17px", fontWeight: "700", color: "#1a237e", marginBottom: "24px", fontFamily: "'Georgia', serif" },
  compareGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0" },
  compareCol: { paddingRight: "24px" },
  compareColHead: { fontSize: "13px", fontWeight: "800", marginBottom: "14px", fontFamily: "'Arial', sans-serif", letterSpacing: "0.3px" },
  compareRow: { display: "flex", alignItems: "center", gap: "8px", padding: "6px 0", borderBottom: "1px solid #eef1f8" },
  compareDot: { width: "6px", height: "6px", borderRadius: "50%", flexShrink: 0 },
  compareText: { fontSize: "13px", color: "#5a6a88", fontFamily: "'Arial', sans-serif" },

  // CTA
  ctaSec: { background: "linear-gradient(135deg, #0d47a1 0%, #1565c0 100%)", padding: "64px 36px" },
  ctaInner: { maxWidth: "1320px", margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "32px", flexWrap: "wrap" },
  ctaH2: { fontSize: "clamp(22px, 3vw, 30px)", fontWeight: "700", color: "#fff", margin: "0 0 8px", fontFamily: "'Georgia', serif" },
  ctaP: { fontSize: "15px", color: "rgba(255,255,255,0.75)", margin: 0, fontFamily: "'Arial', sans-serif" },
  ctaBtn: { background: "#fff", color: "#1565c0", border: "none", padding: "15px 36px", borderRadius: "7px", fontSize: "15px", fontWeight: "700", cursor: "pointer", whiteSpace: "nowrap", fontFamily: "'Arial', sans-serif" },

  // FOOTER
  footer: { background: "#0a1628", padding: "60px 36px 28px" },
  footerInner: { maxWidth: "1320px", margin: "0 auto" },
  footerTop: { display: "flex", gap: "48px", flexWrap: "wrap", marginBottom: "48px" },
  footerBrand: { flex: 1.4, minWidth: "220px" },
  footerLogo: { display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" },
  footerLogoIcon: { width: "36px", height: "36px", background: "#1565c0", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "18px", fontWeight: "900", fontFamily: "'Arial', sans-serif" },
  footerLogoName: { fontSize: "20px", fontWeight: "800", color: "#fff", fontFamily: "'Arial', sans-serif" },
  footerAbout: { fontSize: "13px", color: "rgba(255,255,255,0.5)", lineHeight: 1.8, margin: "0 0 20px", maxWidth: "280px", fontFamily: "'Arial', sans-serif" },
  footerContact: { display: "flex", flexDirection: "column", gap: "8px", fontSize: "13px", color: "rgba(255,255,255,0.5)", fontFamily: "'Arial', sans-serif" },
  footerCol: { display: "flex", flexDirection: "column", gap: "12px", minWidth: "140px" },
  footerColTitle: { fontSize: "12px", fontWeight: "800", color: "#fff", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "4px", fontFamily: "'Arial', sans-serif" },
  footerLink: { fontSize: "13px", color: "rgba(255,255,255,0.5)", textDecoration: "none", fontFamily: "'Arial', sans-serif" },
  footerBottom: { display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "8px", paddingTop: "24px", borderTop: "1px solid rgba(255,255,255,0.08)", fontSize: "12px", color: "rgba(255,255,255,0.3)", fontFamily: "'Arial', sans-serif" },
};