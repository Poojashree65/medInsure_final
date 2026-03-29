import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE = "http://localhost:5001/api";
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONTHS_FULL = ['January','February','March','April','May','June',
                     'July','August','September','October','November','December'];
const ETH_PRICE = 2000;

function exportPDF(forecast, rolling, currentMonth, currentYear, fmt, fmtM, toEth) {
  const MONTHS_FULL_LOCAL = ['January','February','March','April','May','June',
                             'July','August','September','October','November','December'];
  const totalAnnual = forecast.monthly.reduce((s,m) => s + m.total_reserve, 0);
  const curM = forecast.monthly[currentMonth] || forecast.monthly[0];

  const rows = forecast.monthly.map((m,i) => `
    <tr style="background:${i===currentMonth?'#eef4ff':i%2===0?'#fff':'#f8faff'}">
      <td>${m.month_name} ${currentYear}${i===currentMonth?' <span style="background:#1549d4;color:#fff;font-size:9px;padding:2px 6px;border-radius:4px;margin-left:6px">NOW</span>':''}</td>
      <td style="text-align:center"><span style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:6px;background:${i<currentMonth?'#d0fae8':i===currentMonth?'#dbeafe':'#f3f4f6'};color:${i<currentMonth?'#0ca870':i===currentMonth?'#1549d4':'#9ca3af'}">${i<currentMonth?'Past':i===currentMonth?'Current':'Upcoming'}</span></td>
      <td>${m.claim_count.toLocaleString()}</td>
      <td>${fmt(m.predicted_claims)}</td>
      <td>${fmt(m.ibnr_amount)}</td>
      <td>${fmt(m.rbns_amount)}</td>
      <td>${fmt(m.risk_buffer)}</td>
      <td style="font-weight:700;color:#1549d4">${fmt(m.total_reserve)}</td>
      <td style="font-weight:700;color:#0ca870">${toEth(m.total_reserve)} ETH</td>
    </tr>`).join('');

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
  <title>MedInsure — Fund Deposit Report FY ${currentYear}</title>
  <style>
    body{font-family:Arial,sans-serif;padding:32px;color:#060e1e;font-size:12px;}
    .header{display:flex;align-items:center;gap:14px;margin-bottom:24px;padding-bottom:16px;border-bottom:2px solid #dce6f5;}
    .logo{width:44px;height:44px;border-radius:10px;background:linear-gradient(135deg,#1549d4,#5ba6f5);display:flex;align-items:center;justify-content:center;color:#fff;font-size:20px;font-weight:900;}
    h1{font-size:20px;font-weight:800;margin:0;}
    .sub{font-size:11px;color:#7b96bb;margin-top:2px;}
    .rec-box{background:#eef4ff;border:1px solid #bfdbfe;border-left:4px solid #1549d4;border-radius:8px;padding:14px 18px;margin-bottom:20px;}
    .rec-title{font-size:13px;font-weight:800;color:#060e1e;margin-bottom:4px;}
    .rec-amount{font-size:22px;font-weight:900;color:#1549d4;font-family:monospace;}
    .rec-eth{font-size:14px;font-weight:700;color:#5ba6f5;margin-left:10px;}
    .kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:20px;}
    .kpi{background:#f8faff;border:1px solid #dce6f5;border-radius:8px;padding:12px 16px;}
    .kpi-label{font-size:10px;color:#7b96bb;text-transform:uppercase;letter-spacing:.5px;}
    .kpi-val{font-size:18px;font-weight:800;color:#060e1e;font-family:monospace;margin-top:4px;}
    table{width:100%;border-collapse:collapse;margin-top:8px;}
    thead tr{background:#060e1e;}
    thead th{padding:9px 12px;font-size:10px;font-weight:700;color:#c4dbff;text-transform:uppercase;letter-spacing:.5px;text-align:right;}
    thead th:first-child,thead th:nth-child(2){text-align:left;}
    tbody tr{border-bottom:1px solid #dce6f5;}
    td{padding:8px 12px;text-align:right;font-family:monospace;font-size:11px;}
    td:first-child,td:nth-child(2){text-align:left;font-family:Arial;}
    tfoot tr{background:#f0f5ff;font-weight:700;border-top:2px solid #dce6f5;}
    .footer{margin-top:20px;padding-top:12px;border-top:1px solid #dce6f5;font-size:10px;color:#9ca3af;display:flex;justify-content:space-between;}
    @media print{body{padding:16px;}}
  </style></head><body>
  <div class="header">
    <div class="logo">M</div>
    <div>
      <h1>MedInsure — Fund Deposit Report</h1>
      <div class="sub">FY ${currentYear} · Generated: ${new Date().toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'})} · AI-powered fund allocation</div>
    </div>
  </div>
  <div class="rec-box">
    <div class="rec-title">Recommended Deposit — ${MONTHS_FULL_LOCAL[currentMonth]} ${currentYear}</div>
    <span class="rec-amount">${fmt(curM.total_reserve)}</span>
    <span class="rec-eth">${toEth(curM.total_reserve)} ETH</span>
  </div>
  <div class="kpis">
    <div class="kpi"><div class="kpi-label">Annual Reserve Required</div><div class="kpi-val">${fmtM(totalAnnual)}</div></div>
    <div class="kpi"><div class="kpi-label">This Month Deposit</div><div class="kpi-val">${fmt(curM.total_reserve)}</div></div>
    <div class="kpi"><div class="kpi-label">ETH Equivalent</div><div class="kpi-val">${toEth(curM.total_reserve)} ETH</div></div>
  </div>
  <table>
    <thead><tr>
      <th>Month</th><th>Status</th><th>Claims</th><th>Predicted ($)</th>
      <th>IBNR ($)</th><th>RBNS ($)</th><th>Risk Buffer ($)</th><th>Total Reserve ($)</th><th>ETH</th>
    </tr></thead>
    <tbody>${rows}</tbody>
    <tfoot><tr>
      <td colspan="2">TOTAL — FY ${currentYear}</td>
      <td>${forecast.monthly.reduce((s,m)=>s+m.claim_count,0).toLocaleString()}</td>
      <td>${fmt(forecast.total_predicted)}</td>
      <td>${fmt(forecast.monthly.reduce((s,m)=>s+m.ibnr_amount,0))}</td>
      <td>${fmt(forecast.monthly.reduce((s,m)=>s+m.rbns_amount,0))}</td>
      <td>${fmt(forecast.monthly.reduce((s,m)=>s+m.risk_buffer,0))}</td>
      <td style="color:#1549d4">${fmt(totalAnnual)}</td>
      <td style="color:#0ca870">${toEth(totalAnnual)} ETH</td>
    </tr></tfoot>
  </table>
  <div class="footer">
    <span>MedInsure · Blockchain Health Insurance · Fund Allocation Report</span>
    <span>AI Model: XGBoost · Accuracy: ${forecast.r2_score}% R²</span>
  </div>
  </body></html>`;

  const win = window.open('', '_blank', 'width=1000,height=700');
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 500);
}

export default function FundPrediction({ account, web3 }) {
  const navigate = useNavigate();
  const [forecast, setForecast]     = useState(null);
  const [rolling, setRolling]       = useState(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");
  const [scenario, setScenario]     = useState(1);
  const [runMonth, setRunMonth]     = useState(0);
  const [alertDismissed, setAlertDismissed] = useState(false);
  const now          = new Date();
  const currentMonth = now.getMonth();
  const currentYear  = now.getFullYear();

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true); setError("");
    try {
      const [f, r] = await Promise.all([
        fetch(`${API_BASE}/forecast`).then(x => x.json()),
        fetch(`${API_BASE}/rolling`).then(x => x.json()),
      ]);
      setForecast(f); setRolling(r); setRunMonth(currentMonth);
    } catch { setError("ML API not running. Start it with: py ml/api.py"); }
    setLoading(false);
  };

  const fmt  = n => n == null ? '—' : '$' + Math.round(n).toLocaleString('en-US');
  const fmtM = n => n == null ? '—' : '$' + (n/1e6).toFixed(3) + 'M';
  const toEth = n => (n / ETH_PRICE).toFixed(4);

  if (loading) return (
    <div style={S.page}>
      <NavBar account={account} navigate={navigate} />
      <div style={S.centered}><div style={S.spinner}/><p style={{color:"#7b96bb",fontSize:"14px",marginTop:"16px"}}>Loading ML predictions...</p></div>
    </div>
  );

  if (error) return (
    <div style={S.page}>
      <NavBar account={account} navigate={navigate} />
      <div style={{padding:"60px",textAlign:"center"}}>
        <div style={{fontSize:"48px",marginBottom:"16px"}}>⚠️</div>
        <h2 style={{fontSize:"20px",fontWeight:"800",color:"#060e1e",marginBottom:"8px"}}>ML API Not Running</h2>
        <p style={{color:"#7b96bb",marginBottom:"20px"}}>{error}</p>
        <code style={{display:"block",background:"#f1f5fc",border:"1px solid #dce6f5",borderRadius:"8px",padding:"12px 20px",fontSize:"13px",color:"#1549d4",marginBottom:"16px",fontFamily:"monospace"}}>py ml/api.py</code>
        <button style={{background:"#1549d4",color:"#fff",border:"none",padding:"10px 24px",borderRadius:"7px",fontSize:"13px",fontWeight:"600",cursor:"pointer"}} onClick={fetchData}>Retry ←</button>
      </div>
    </div>
  );

  const curM      = forecast.monthly[currentMonth] || forecast.monthly[0];
  const maxR      = Math.max(...forecast.monthly.map(m => m.total_reserve));
  const totalAnnual = forecast.monthly.reduce((s,m) => s + m.total_reserve, 0);
  const totalIBNR   = forecast.monthly.reduce((s,m) => s + m.ibnr_amount, 0);
  const totalRBNS   = forecast.monthly.reduce((s,m) => s + m.rbns_amount, 0);
  const rollingEntry = rolling.retrain_summary.find(r => r.retrain_month === runMonth + 1);

  return (
    <div style={S.page}>
      <NavBar account={account} navigate={navigate} />

      {/* TOPBAR */}
      <div style={S.topbar}>
        <div>
          <div style={S.pgTitle}>Fund Deposit Recommendations — {currentYear}</div>
          <div style={S.pgSub}>{MONTHS_FULL[currentMonth]} {currentYear} · AI-powered monthly fund planning</div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
          <div style={S.liveBadge}><div style={S.liveDot}/>Systems Live</div>
          <button style={S.btnOutline} onClick={() => exportPDF(forecast, rolling, currentMonth, currentYear, fmt, fmtM, toEth)}>
            ⬇ Export PDF
          </button>
          <button style={S.btnOutline} onClick={() => navigate("/insurer/fund-management")}>Deposit Funds ←</button>
        </div>
      </div>

      <div style={S.pageBody}>
        {/* ML RECOMMENDATION CARD */}
        {!alertDismissed && (
          <div style={{background:"#fff",border:"1px solid #dce6f5",borderRadius:"12px",padding:"20px 24px",marginBottom:"20px",display:"flex",alignItems:"center",justifyContent:"space-between",boxShadow:"0 1px 10px rgba(8,18,40,.07)",gap:"16px",flexWrap:"wrap"}}>
            <div style={{display:"flex",alignItems:"center",gap:"14px"}}>
              <div style={{width:"44px",height:"44px",borderRadius:"10px",background:"linear-gradient(135deg,#1549d4,#5ba6f5)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"20px",flexShrink:0}}>🤖</div>
              <div>
                <div style={{fontSize:"13px",fontWeight:"800",color:"#060e1e",marginBottom:"3px"}}>Recommended Deposit — {MONTHS_FULL[currentMonth]} {currentYear}</div>
                <div style={{fontSize:"22px",fontWeight:"900",color:"#1549d4",fontFamily:"monospace",letterSpacing:"-0.5px",lineHeight:1}}>{fmt(curM.total_reserve)}</div>
                <div style={{fontSize:"13px",fontWeight:"700",color:"#5ba6f5",marginTop:"4px"}}>{toEth(curM.total_reserve)} ETH</div>
                <div style={{fontSize:"11px",color:"#7b96bb",marginTop:"3px"}}>AI-powered fund deposit recommendation</div>
              </div>
            </div>
            <div style={{display:"flex",gap:"8px",alignItems:"center"}}>
              <button style={{background:"#1549d4",color:"#fff",border:"none",padding:"10px 20px",borderRadius:"8px",fontSize:"13px",fontWeight:"700",cursor:"pointer",fontFamily:"inherit"}}
                onClick={() => navigate("/insurer/fund-management")}>Deposit Now ←</button>
              <button style={{background:"none",border:"none",color:"#9ca3af",fontSize:"18px",cursor:"pointer",padding:"4px 8px"}} onClick={() => setAlertDismissed(true)}>✕</button>
            </div>
          </div>
        )}

        {/* SCENARIO TABS */}
        <div style={S.scenarioTabs}>
          {[
            {n:1,icon:"📊",num:"Scenario 1",title:"Annual Reserve Plan",
             desc:`Full-year deposit plan set at the start of ${currentYear}`,
             badge:"Annual Budget Planning"},
            {n:2,icon:"🔄",num:"Scenario 2",title:"Monthly Rebalancing",
             desc:`Reserve updated each month based on latest claim data`,
             badge:"Monthly Rebalancing"},
          ].map(t => (
            <div key={t.n} style={{...S.stab,...(scenario===t.n?S.stabActive:{})}} onClick={()=>setScenario(t.n)}>
              <div style={{fontSize:"20px",marginBottom:"8px"}}>{t.icon}</div>
              <div style={{...S.stabNum,...(scenario===t.n?{color:"#c4dbff"}:{})}}>{t.num}</div>
              <div style={{...S.stabTitle,...(scenario===t.n?{color:"#fff"}:{})}}>{t.title}</div>
              <div style={{...S.stabDesc,...(scenario===t.n?{color:"#c4dbff"}:{})}}>{t.desc}</div>
              <div style={{...S.stabBadge,...(scenario===t.n?{background:"rgba(59,130,246,.2)",color:"#c4dbff"}:{background:"#eef4ff",color:"#1549d4"})}}>{t.badge}</div>
              {scenario===t.n && <div style={S.stabBar}/>}
            </div>
          ))}
        </div>


        {/* SCENARIO 1 */}
        {scenario === 1 && (
          <>
            <div style={S.kpiRow}>
              {[
                {label:"Annual Reserve Required", val:fmtM(totalAnnual),  sub:`Full-year ${currentYear}`,  color:"#1549d4", icon:"💰"},
                {label:"This Month Deposit",       val:fmtM(curM.total_reserve), sub:`${MONTHS_FULL[currentMonth]} ${currentYear}`, color:"#0ca870", icon:"📅"},
                {label:"IBNR Reserve",             val:fmtM(totalIBNR),   sub:"Unreported claims buffer", color:"#e5900a", icon:"⏱️"},
                {label:"RBNS Reserve",             val:fmtM(totalRBNS),   sub:"Unsettled claims buffer",  color:"#0891b2", icon:"📋"},
              ].map((k,i) => (
                <div key={i} style={S.kpi}>
                  <div style={{width:"38px",height:"38px",borderRadius:"9px",background:["#eef3ff","#eafaf3","#fff9ed","#e0f2fe"][i],display:"flex",alignItems:"center",justifyContent:"center",fontSize:"16px",marginBottom:"10px"}}>{k.icon}</div>
                  <div style={{fontSize:"11px",color:"#7b96bb",fontWeight:"500",marginBottom:"4px"}}>{k.label}</div>
                  <div style={{fontSize:"24px",fontWeight:"800",color:k.color,fontFamily:"monospace",letterSpacing:"-1px",lineHeight:1}}>{k.val}</div>
                  <div style={{fontSize:"10.5px",color:"#7b96bb",marginTop:"6px"}}>{k.sub}</div>
                </div>
              ))}
            </div>

            <div style={S.card}>
              <div style={S.cardHd}>
                <div><div style={S.cTitle}>Monthly Reserve Plan — {currentYear}</div><div style={S.cSub}>Recommended deposit per month</div></div>
                <div style={{display:"flex",gap:"12px",flexWrap:"wrap"}}>
                  {[["#1549d4","Forecast"],["#5ba6f5","IBNR"],["#e5900a","RBNS"],["#93c5fd","Risk Buffer"]].map(([c,l])=>(
                    <div key={l} style={{display:"flex",alignItems:"center",gap:"5px",fontSize:"11px",color:"#7b96bb"}}>
                      <div style={{width:"9px",height:"9px",borderRadius:"3px",background:c}}/>{l}
                    </div>
                  ))}
                </div>
              </div>
              <div style={{padding:"18px 20px"}}>
                {forecast.monthly.map((m,i) => (
                  <div key={i} style={{display:"flex",alignItems:"center",gap:"9px",marginBottom:"7px"}}>
                    <div style={{fontSize:"10.5px",fontWeight:"600",color:i===currentMonth?"#1549d4":"#7b96bb",width:"26px",flexShrink:0}}>{m.month_name}</div>
                    <div style={{flex:1,height:"24px",background:"#f1f5fc",borderRadius:"5px",overflow:"hidden",display:"flex"}}>
                      <div style={{height:"100%",background:"#1549d4",width:`${(m.predicted_claims/maxR*100).toFixed(1)}%`}}/>
                      <div style={{height:"100%",background:"#5ba6f5",opacity:.85,width:`${(m.ibnr_amount/maxR*100).toFixed(1)}%`}}/>
                      <div style={{height:"100%",background:"#e5900a",opacity:.9,width:`${(m.rbns_amount/maxR*100).toFixed(1)}%`}}/>
                      <div style={{height:"100%",background:"#93c5fd",opacity:.75,width:`${(m.risk_buffer/maxR*100).toFixed(1)}%`}}/>
                    </div>
                    <div style={{fontSize:"10.5px",fontFamily:"monospace",color:i===currentMonth?"#1549d4":"#060e1e",width:"70px",textAlign:"right",fontWeight:i===currentMonth?"700":"500"}}>{fmtM(m.total_reserve)}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={S.card}>
              <div style={S.cardHd}>
                <div><div style={S.cTitle}>Reserve Allocation — FY {currentYear}</div><div style={S.cSub}>Amounts in USD · Includes IBNR, RBNS and Risk Buffer</div></div>
              </div>
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse"}}>
                  <thead><tr style={{background:"#060e1e"}}>
                    {["Month","Status","Claims","Predicted ($)","IBNR ($)","RBNS ($)","Risk Buffer ($)","Total Reserve ($)"].map(h=>(
                      <th key={h} style={{padding:"11px 13px",fontSize:"10.5px",fontWeight:"700",color:"#c4dbff",textTransform:"uppercase",letterSpacing:".5px",textAlign:h==="Month"||h==="Status"?"left":"right",whiteSpace:"nowrap"}}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {forecast.monthly.map((m,i) => (
                      <tr key={i} style={{background:i===currentMonth?"#eef4ff":i%2===0?"#fff":"#f8faff",borderBottom:"1px solid rgba(220,230,245,.7)"}}>
                        <td style={{padding:"10px 13px",fontSize:"12.5px",fontWeight:"600",color:i===currentMonth?"#1549d4":"#060e1e"}}>
                          {m.month_name} {currentYear} {i===currentMonth&&<span style={{background:"#1549d4",color:"#fff",fontSize:"9px",fontWeight:"700",padding:"2px 6px",borderRadius:"4px",marginLeft:"6px"}}>NOW</span>}
                        </td>
                        <td style={{padding:"10px 13px"}}>
                          <span style={{fontSize:"10.5px",fontWeight:"700",padding:"2px 8px",borderRadius:"7px",background:i<currentMonth?"#d0fae8":i===currentMonth?"#dbeafe":"#f3f4f6",color:i<currentMonth?"#0ca870":i===currentMonth?"#1549d4":"#9ca3af"}}>
                            {i<currentMonth?"Past":i===currentMonth?"Current":"Upcoming"}
                          </span>
                        </td>
                        <td style={{padding:"10px 13px",textAlign:"right",fontFamily:"monospace",fontSize:"12px"}}>{m.claim_count.toLocaleString()}</td>
                        <td style={{padding:"10px 13px",textAlign:"right",fontFamily:"monospace",fontSize:"12px",color:"#1549d4",fontWeight:"600"}}>{fmt(m.predicted_claims)}</td>
                        <td style={{padding:"10px 13px",textAlign:"right",fontFamily:"monospace",fontSize:"12px",color:"#e5900a"}}>{fmt(m.ibnr_amount)}</td>
                        <td style={{padding:"10px 13px",textAlign:"right",fontFamily:"monospace",fontSize:"12px",color:"#0891b2"}}>{fmt(m.rbns_amount)}</td>
                        <td style={{padding:"10px 13px",textAlign:"right",fontFamily:"monospace",fontSize:"12px",color:"#7b96bb"}}>{fmt(m.risk_buffer)}</td>
                        <td style={{padding:"10px 13px",textAlign:"right",fontFamily:"monospace",fontSize:"12px",fontWeight:"700",color:i===currentMonth?"#1549d4":"#060e1e"}}>{fmt(m.total_reserve)}</td>
                      </tr>
                    ))}
                    <tr style={{background:"#f0f5ff",fontWeight:"700",borderTop:"2px solid #dce6f5"}}>
                      <td style={{padding:"10px 13px",fontSize:"12.5px",fontWeight:"700"}} colSpan="2">TOTAL — FY {currentYear}</td>
                      <td style={{padding:"10px 13px",textAlign:"right",fontFamily:"monospace",fontSize:"12px"}}>{forecast.monthly.reduce((s,m)=>s+m.claim_count,0).toLocaleString()}</td>
                      <td style={{padding:"10px 13px",textAlign:"right",fontFamily:"monospace",fontSize:"12px",color:"#1549d4",fontWeight:"700"}}>{fmt(forecast.total_predicted)}</td>
                      <td style={{padding:"10px 13px",textAlign:"right",fontFamily:"monospace",fontSize:"12px",color:"#e5900a",fontWeight:"700"}}>{fmt(totalIBNR)}</td>
                      <td style={{padding:"10px 13px",textAlign:"right",fontFamily:"monospace",fontSize:"12px",color:"#0891b2",fontWeight:"700"}}>{fmt(totalRBNS)}</td>
                      <td style={{padding:"10px 13px",textAlign:"right",fontFamily:"monospace",fontSize:"12px",fontWeight:"700"}}>{fmt(forecast.monthly.reduce((s,m)=>s+m.risk_buffer,0))}</td>
                      <td style={{padding:"10px 13px",textAlign:"right",fontFamily:"monospace",fontSize:"12px",fontWeight:"700",color:"#1549d4"}}>{fmt(totalAnnual)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}


        {/* SCENARIO 2 */}
        {scenario === 2 && (
          <>
            <div style={{marginBottom:"20px"}}>
              <div style={{fontSize:"11.5px",fontWeight:"700",color:"#7b96bb",textTransform:"uppercase",letterSpacing:".8px",marginBottom:"10px"}}>Select Run Month ←</div>
              <div style={{display:"flex",gap:"6px",flexWrap:"wrap"}}>
                {MONTHS.map((m,i) => {
                  const isActive=i===runMonth, isKnown=i<currentMonth;
                  return (
                    <div key={i} onClick={()=>setRunMonth(i)} style={{padding:"8px 13px",borderRadius:"8px",fontSize:"12px",fontWeight:"600",cursor:"pointer",minWidth:"58px",textAlign:"center",
                      border:`1.5px solid ${isActive?(isKnown?"#0ca870":"#1549d4"):isKnown?"#0ca870":"#dce6f5"}`,
                      background:isActive?(isKnown?"#0ca870":"#1549d4"):isKnown?"#f0fdf7":"#fff",
                      color:isActive?"#fff":isKnown?"#0ca870":"#7b96bb"}}>
                      <div>{m}</div><div style={{fontSize:"9px",opacity:.8,marginTop:"2px"}}>{m} Run</div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={S.card}>
              <div style={S.cardHd}>
                <div><div style={S.cTitle}>Monthly Deposit Schedule — {currentYear}</div><div style={S.cSub}>Select a month to view its deposit plan</div></div>
                <div style={{display:"flex",gap:"12px"}}>
                  {[["#0ca870","Completed"],["#1549d4","Active"],["#9ca3af","Scheduled"]].map(([c,l])=>(
                    <div key={l} style={{display:"flex",alignItems:"center",gap:"5px",fontSize:"11px",color:"#7b96bb"}}>
                      <div style={{width:"9px",height:"9px",borderRadius:"50%",background:c}}/>{l}
                    </div>
                  ))}
                </div>
              </div>
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse"}}>
                  <thead><tr style={{background:"#060e1e"}}>
                    {["Retrain Month","Status","Deposit Required","Action"].map(h=>(
                      <th key={h} style={{padding:"11px 13px",fontSize:"10.5px",fontWeight:"700",color:"#c4dbff",textTransform:"uppercase",letterSpacing:".5px",textAlign:h==="Retrain Month"||h==="Status"?"left":"right",whiteSpace:"nowrap"}}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {rolling.retrain_summary.map((r,i)=>{
                      const isKnown=r.retrain_month<=currentMonth, isCurrent=r.retrain_month===currentMonth+1, isSelected=r.retrain_month===runMonth+1;
                      return (
                        <tr key={i} onClick={()=>setRunMonth(r.retrain_month-1)} style={{background:isSelected?"#eef4ff":isKnown?"#f0fdf7":i%2===0?"#fff":"#f8faff",borderBottom:"1px solid rgba(220,230,245,.7)",cursor:"pointer"}}>
                          <td style={{padding:"10px 13px",fontSize:"12.5px",fontWeight:"600",color:isCurrent?"#1549d4":isKnown?"#0ca870":"#060e1e"}}>
                            {r.retrain_month_name} {currentYear}
                            {isCurrent&&<span style={{background:"#1549d4",color:"#fff",fontSize:"9px",fontWeight:"700",padding:"2px 6px",borderRadius:"4px",marginLeft:"6px"}}>NOW</span>}
                          </td>
                          <td style={{padding:"10px 13px"}}>
                            <span style={{fontSize:"10.5px",fontWeight:"700",padding:"2px 8px",borderRadius:"7px",background:isCurrent?"#dbeafe":isKnown?"#d0fae8":"#f3f4f6",color:isCurrent?"#1549d4":isKnown?"#0ca870":"#9ca3af"}}>
                              {isCurrent?"Active":isKnown?"Completed":"Scheduled"}
                            </span>
                          </td>
                          <td style={{padding:"10px 13px"}}>
                            <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
                              <div style={{flex:1,height:"10px",background:"#f1f5fc",borderRadius:"5px",overflow:"hidden"}}>
                                <div style={{
                                  height:"100%", borderRadius:"5px", transition:"width 0.4s",
                                  background: r.retrain_month < currentMonth+1
                                    ? "linear-gradient(90deg,#0ca870,#5ba6f5)"
                                    : r.retrain_month === currentMonth+1
                                    ? "linear-gradient(90deg,#1549d4,#5ba6f5)"
                                    : "linear-gradient(90deg,#93c5fd,#c4dbff)",
                                  width:`${(r.total_reserve / rolling.retrain_summary[0].total_reserve * 100).toFixed(1)}%`
                                }}/>
                              </div>
                              <span style={{fontSize:"11px",fontFamily:"monospace",fontWeight:"700",color:"#060e1e",flexShrink:0,minWidth:"80px",textAlign:"right"}}>{fmt(r.total_reserve)}</span>
                            </div>
                          </td>
                          <td style={{padding:"10px 13px",textAlign:"center"}}>
                            {r.retrain_month === currentMonth+1 ? (
                              <button onClick={() => navigate("/insurer/fund-management")} style={{
                                background:"#1549d4",color:"#fff",border:"none",padding:"5px 12px",
                                borderRadius:"6px",fontSize:"11px",fontWeight:"700",cursor:"pointer",fontFamily:"inherit"
                              }}>Deposit Now ←</button>
                            ) : r.retrain_month < currentMonth+1 ? (
                              <span style={{fontSize:"11px",color:"#0ca870",fontWeight:"700"}}>✓ Done</span>
                            ) : (
                              <span style={{fontSize:"11px",color:"#9ca3af"}}>Upcoming</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    <tr style={{background:"#f0f5ff",fontWeight:"700",borderTop:"2px solid #dce6f5"}}>
                      <td style={{padding:"10px 13px",fontSize:"12.5px",fontWeight:"700"}} colSpan="2">ROLLING AVG</td>
                      <td style={{padding:"10px 13px",fontSize:"11px",color:"#7b96bb"}}>Reserve decreases each month as fewer months remain to cover</td>
                      <td style={{padding:"10px 13px",textAlign:"right",fontFamily:"monospace",fontSize:"12px",fontWeight:"700"}}>—</td>                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

          </>
        )}

        <div style={{padding:"14px 0",borderTop:"1px solid #dce6f5",marginTop:"20px",textAlign:"center"}}>
          <span style={{fontSize:"10.5px",color:"#7b96bb"}}>MedInsure · Fund Allocation Prediction · FY {currentYear}</span>
        </div>
      </div>
    </div>
  );
}

function NavBar({ account, navigate }) {
  return (
    <div style={{background:"#060e1e",height:"56px",display:"flex",alignItems:"center",padding:"0 24px",gap:"12px",position:"sticky",top:0,zIndex:300}}>
      <div style={{width:"36px",height:"36px",borderRadius:"9px",background:"linear-gradient(135deg,#1549d4,#5ba6f5)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
        <span style={{color:"#fff",fontSize:"16px",fontWeight:"900"}}>M</span>
      </div>
      <div>
        <div style={{fontSize:"15px",fontWeight:"800",color:"#fff",letterSpacing:"-.3px"}}>MedInsure <span style={{color:"#5ba6f5"}}>Reserve</span></div>
        <div style={{fontSize:"10px",color:"#7b96bb",marginTop:"1px"}}>Insurance Operations Platform</div>
      </div>
      <div style={{flex:1}}/>
      <span style={{fontSize:"11px",fontWeight:"700",background:"rgba(21,73,212,.3)",color:"#c4dbff",padding:"4px 12px",borderRadius:"4px"}}>Insurer</span>
      <span style={{fontSize:"12px",color:"#7b96bb",background:"rgba(255,255,255,.05)",border:"1px solid rgba(255,255,255,.08)",padding:"5px 12px",borderRadius:"6px"}}>
        {account?.slice(0,6)}...{account?.slice(-4)}
      </span>
      <button style={{background:"transparent",color:"#7b96bb",border:"1.5px solid rgba(255,255,255,.12)",padding:"6px 14px",borderRadius:"6px",cursor:"pointer",fontSize:"12px",fontWeight:"600",fontFamily:"inherit"}}
        onClick={() => navigate("/insurer")}>← Dashboard</button>
    </div>
  );
}

const S = {
  page:        { minHeight:"100vh", background:"#f1f5fc", fontFamily:"'Arial',sans-serif", color:"#060e1e", display:"flex", flexDirection:"column" },
  centered:    { display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", flex:1, padding:"60px" },
  spinner:     { width:"36px", height:"36px", border:"3px solid #dce6f5", borderTop:"3px solid #1549d4", borderRadius:"50%", animation:"spin 0.8s linear infinite" },
  topbar:      { background:"#fff", borderBottom:"1px solid #dce6f5", padding:"0 28px", height:"60px", display:"flex", alignItems:"center", justifyContent:"space-between" },
  pgTitle:     { fontSize:"15px", fontWeight:"800", color:"#060e1e" },
  pgSub:       { fontSize:"11px", color:"#7b96bb", marginTop:"2px" },
  liveBadge:   { display:"flex", alignItems:"center", gap:"5px", background:"#eafaf3", color:"#0ca870", fontSize:"11px", fontWeight:"700", padding:"5px 11px", borderRadius:"20px", border:"1px solid #a5f3ce" },
  liveDot:     { width:"6px", height:"6px", borderRadius:"50%", background:"#0ca870" },
  btnOutline:  { background:"transparent", color:"#060e1e", border:"1.5px solid #dce6f5", padding:"7px 14px", borderRadius:"7px", fontSize:"12.5px", fontWeight:"600", cursor:"pointer", fontFamily:"inherit" },
  pageBody:    { padding:"22px 28px", flex:1 },
  alert:       { background:"#fffbf0", border:"1px solid #fde68a", borderLeft:"4px solid #e5900a", borderRadius:"10px", padding:"13px 18px", display:"flex", alignItems:"center", gap:"12px", marginBottom:"20px" },
  alertClose:  { marginLeft:"auto", background:"none", border:"none", color:"#b45309", fontSize:"17px", cursor:"pointer", padding:"2px 6px", borderRadius:"4px" },
  scenarioTabs:{ display:"flex", marginBottom:"22px", background:"#fff", borderRadius:"12px", border:"1px solid rgba(59,130,246,.13)", boxShadow:"0 1px 10px rgba(8,18,40,.07)", overflow:"hidden" },
  stab:        { flex:1, padding:"16px 20px", cursor:"pointer", borderRight:"1px solid #dce6f5", position:"relative", transition:"all .18s" },
  stabActive:  { background:"linear-gradient(135deg,#060e1e,#0b1a35)" },
  stabNum:     { fontSize:"10px", fontWeight:"700", letterSpacing:"1px", textTransform:"uppercase", color:"#7b96bb", marginBottom:"4px" },
  stabTitle:   { fontSize:"14px", fontWeight:"800", color:"#060e1e" },
  stabDesc:    { fontSize:"11px", color:"#7b96bb", marginTop:"3px", lineHeight:1.5 },
  stabBadge:   { display:"inline-block", marginTop:"8px", padding:"3px 9px", borderRadius:"7px", fontSize:"10.5px", fontWeight:"700" },
  stabBar:     { position:"absolute", bottom:0, left:0, right:0, height:"3px", background:"#5ba6f5" },
  ctxBanner:   { borderRadius:"10px", padding:"14px 20px", marginBottom:"20px", display:"flex", alignItems:"flex-start", gap:"16px" },
  cbTitle:     { fontSize:"13.5px", fontWeight:"800", color:"#060e1e" },
  cbDesc:      { fontSize:"11.5px", color:"#7b96bb", marginTop:"3px", lineHeight:1.6 },
  cbTags:      { display:"flex", gap:"8px", marginTop:"8px", flexWrap:"wrap" },
  cbTag:       { fontSize:"10.5px", fontWeight:"600", padding:"3px 9px", borderRadius:"6px" },
  kpiRow:      { display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"14px", marginBottom:"20px" },
  kpi:         { background:"#fff", borderRadius:"12px", padding:"18px 18px 16px", border:"1px solid rgba(59,130,246,.13)", boxShadow:"0 1px 10px rgba(8,18,40,.07)" },
  card:        { background:"#fff", borderRadius:"12px", border:"1px solid rgba(59,130,246,.13)", boxShadow:"0 1px 10px rgba(8,18,40,.07)", overflow:"hidden", marginBottom:"20px" },
  cardHd:      { padding:"15px 20px", borderBottom:"1px solid #dce6f5", display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:"8px" },
  cTitle:      { fontSize:"13.5px", fontWeight:"700", color:"#060e1e" },
  cSub:        { fontSize:"11px", color:"#7b96bb", marginTop:"2px" },
};
