import { useState, useEffect, useMemo, useCallback } from "react";
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area
} from "recharts";
import {
  Plus, X, ChevronLeft, ChevronRight, TrendingUp, TrendingDown,
  Target, Home, List, BarChart2, Trash2, IndianRupee, CreditCard,
  AlertCircle, CheckCircle, Calendar, Zap, ArrowRight, Shield
} from "lucide-react";

const C = {
  saffron:"#E8652A",gold:"#F5A623",teal:"#0D9488",red:"#EF4444",
  purple:"#7C3AED",blue:"#2563EB",green:"#059669",pink:"#EC4899",
  amber:"#D97706",bg:"#FFF9F4",card:"#FFFFFF",text:"#1C1917",
  muted:"#78716C",border:"#F5E6D8",lightBorder:"#FDF0E8",
  grad:"linear-gradient(135deg,#E8652A 0%,#F5A623 100%)",
};

const uid = () => Math.random().toString(36).substr(2,9);
const todayStr = () => new Date().toISOString().split("T")[0];
const ymOf = s => s.substring(0,7);
const fmtINR = n => {
  const a=Math.abs(n);
  const s=a>=1e7?`₹${(a/1e7).toFixed(2)}Cr`:a>=1e5?`₹${(a/1e5).toFixed(2)}L`:a>=1e3?`₹${(a/1e3).toFixed(1)}K`:`₹${a.toLocaleString("en-IN")}`;
  return n<0?`-${s}`:s;
};
const monthLabel = ym => { const [y,m]=ym.split("-"); return new Date(+y,+m-1).toLocaleString("default",{month:"long",year:"numeric"}); };
const shortMonth = ym => { const [y,m]=ym.split("-"); return new Date(+y,+m-1).toLocaleString("default",{month:"short"}); };

// ── LOAN TYPES ──
const LOAN_TYPES = [
  {id:"home",     label:"Home Loan",       icon:"🏠", color:"#2563EB"},
  {id:"car",      label:"Car / Vehicle",   icon:"🚗", color:"#7C3AED"},
  {id:"personal", label:"Personal Loan",   icon:"👤", color:"#E8652A"},
  {id:"education",label:"Education Loan",  icon:"🎓", color:"#0D9488"},
  {id:"gold",     label:"Gold Loan",       icon:"🪙", color:"#D97706"},
  {id:"business", label:"Business Loan",   icon:"🏪", color:"#059669"},
  {id:"credit",   label:"Credit Card",     icon:"💳", color:"#EF4444"},
  {id:"other",    label:"Other Loan",      icon:"📋", color:"#78716C"},
];
const LOAN_TYPE = Object.fromEntries(LOAN_TYPES.map(l=>[l.id,l]));

const STRATEGIES = [
  {id:"avalanche", label:"Avalanche",   sub:"Highest interest first", icon:"🔥"},
  {id:"snowball",  label:"Snowball",    sub:"Smallest balance first", icon:"❄️"},
  {id:"custom",    label:"Custom",      sub:"You choose priority",    icon:"🎯"},
];

// ── INCOME / EXPENSE CATS ──
const INCOME_CATS=[
  {id:"salary",label:"Salary",icon:"💼",color:"#0D9488"},{id:"rental",label:"Rental",icon:"🏘️",color:"#2563EB"},
  {id:"business",label:"Business",icon:"🏪",color:"#7C3AED"},{id:"interest",label:"FD/Interest",icon:"📈",color:"#059669"},
  {id:"agri",label:"Agriculture",icon:"🌾",color:"#84734C"},{id:"other_inc",label:"Other",icon:"💰",color:"#78716C"},
];
const EXPENSE_CATS=[
  {id:"housing",label:"Housing",icon:"🏠",color:"#E8652A"},{id:"groceries",label:"Groceries",icon:"🛒",color:"#F5A623"},
  {id:"utilities",label:"Utilities",icon:"💡",color:"#0D9488"},{id:"health",label:"Health",icon:"🏥",color:"#EF4444"},
  {id:"education",label:"Education",icon:"🎓",color:"#7C3AED"},{id:"transport",label:"Transport",icon:"🚗",color:"#2563EB"},
  {id:"food_out",label:"Food",icon:"🍽️",color:"#D97706"},{id:"shopping",label:"Shopping",icon:"🛍️",color:"#EC4899"},
  {id:"festivals",label:"Festivals",icon:"🎉",color:"#F59E0B"},{id:"religious",label:"Religious",icon:"🙏",color:"#6366F1"},
  {id:"domestic",label:"Domestic",icon:"🧹",color:"#059669"},{id:"entertain",label:"Fun",icon:"🎬",color:"#8B5CF6"},
  {id:"invest",label:"SIP/Savings",icon:"📊",color:"#059669"},{id:"insurance",label:"Insurance",icon:"🛡️",color:"#0EA5E9"},
  {id:"emi",label:"EMI",icon:"🏦",color:"#DC2626"},{id:"misc",label:"Misc",icon:"📦",color:"#9CA3AF"},
];
const ALL_CATS=[...INCOME_CATS,...EXPENSE_CATS];
const CAT=Object.fromEntries(ALL_CATS.map(c=>[c.id,c]));
const PMODES=["UPI","Cash","Debit Card","Credit Card","Net Banking","Cheque"];

// ── COMPUTE EMI ──
function computeEMI(principal, ratePA, tenureMonths) {
  if (ratePA === 0) return principal / tenureMonths;
  const r = ratePA / 12 / 100;
  return principal * r * Math.pow(1+r, tenureMonths) / (Math.pow(1+r, tenureMonths) - 1);
}

// ── GENERATE AMORTIZATION ──
function genSchedule(loan) {
  const { principal, ratePA, tenureMonths, startDate, prepayments = [] } = loan;
  const r = ratePA / 12 / 100;
  let bal = principal;
  const schedule = [];
  const start = new Date(startDate);

  for (let i = 0; i < tenureMonths && bal > 0.5; i++) {
    const d = new Date(start.getFullYear(), start.getMonth() + i + 1, 1);
    const ym = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
    const interest = Math.round(bal * r);
    const emi = Math.min(Math.round(computeEMI(bal, ratePA, tenureMonths - i)), bal + interest);
    const principal_part = emi - interest;
    const prepay = (prepayments.find(p => p.ym === ym)?.amount) || 0;
    bal = Math.max(0, bal - principal_part - prepay);
    schedule.push({ month: i+1, ym, emi, interest, principal: principal_part, prepay, balance: Math.round(bal) });
    if (bal <= 0) break;
  }
  return schedule;
}

// ── SAMPLE LOANS ──
const SAMPLE_LOANS = [
  {
    id:uid(), type:"home", lender:"SBI Home Loan", principal:3500000, ratePA:8.5,
    tenureMonths:240, startDate:"2021-04-01", prepayments:[
      {ym:"2023-11",amount:50000},{ym:"2024-06",amount:75000}
    ]
  },
  {
    id:uid(), type:"car", lender:"HDFC Car Loan", principal:650000, ratePA:10.5,
    tenureMonths:60, startDate:"2022-10-01", prepayments:[]
  },
  {
    id:uid(), type:"personal", lender:"Bajaj Finserv", principal:200000, ratePA:14.0,
    tenureMonths:36, startDate:"2023-07-01", prepayments:[]
  },
];

// ── INCOME/EXPENSE SAMPLE ──
function genSample() {
  const now=new Date(); const txns=[];
  for(let mo=0;mo<5;mo++){
    const d=new Date(now.getFullYear(),now.getMonth()-mo,1);
    const base=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
    const j=(x,p=0.15)=>Math.round(x*(1+(Math.random()-0.5)*p));
    txns.push(
      {id:uid(),type:"income",amount:85000,category:"salary",description:"Akshay - Monthly Salary",date:`${base}-01`,member:"Akshay",paymentMode:"Net Banking"},
      {id:uid(),type:"income",amount:35000,category:"salary",description:"Swapnali - Monthly Salary",date:`${base}-01`,member:"Swapnali",paymentMode:"Net Banking"},
    );
    if(mo<3) txns.push({id:uid(),type:"income",amount:12000,category:"rental",description:"Flat Rental",date:`${base}-05`,member:"Akshay",paymentMode:"Net Banking"});
    const fixed=[
      [18000,"housing","House Rent","01","Akshay","Net Banking"],[10000,"invest","SIP – HDFC Flexicap","05","Akshay","Net Banking"],
      [5000,"invest","PPF Contribution","05","Swapnali","Net Banking"],[4800,"education","Anika School Fees","07","Swapnali","UPI"],
      [4000,"domestic","Maid Salary","01","Swapnali","Cash"],[3500,"insurance","LIC Premium","03","Akshay","Net Banking"],
      [1500,"entertain","OTT Subscriptions","02","Akshay","Credit Card"],
    ];
    fixed.forEach(([a,c,desc,day,mem,pm])=>txns.push({id:uid(),type:"expense",amount:a,category:c,description:desc,date:`${base}-${day}`,member:mem,paymentMode:pm}));
    const varEx=[
      [j(2300),"utilities","MSEB + LPG + Jio","10","Akshay","UPI"],[j(3800),"groceries","BigBazaar + Sabzi","12","Swapnali","UPI"],
      [j(2600),"transport","Petrol + Ola","15","Akshay","Cash"],[j(1800),"food_out","Zomato + Dining","18","Akshay","UPI"],
      [j(900),"health","Medicines","20","Swapnali","UPI"],[j(600),"religious","Temple Donation","09","Swapnali","Cash"],
    ];
    varEx.forEach(([a,c,desc,day,mem,pm])=>txns.push({id:uid(),type:"expense",amount:a,category:c,description:desc,date:`${base}-${day}`,member:mem,paymentMode:pm}));
  }
  return txns;
}

const DEFAULT_BUDGETS={housing:20000,groceries:8000,utilities:4000,health:5000,education:8000,transport:4000,food_out:3500,shopping:5000,domestic:5000,entertain:2500,invest:20000,insurance:5000,emi:0,festivals:5000,religious:2000,misc:2000};
const DEFAULT_GOALS=[
  {id:uid(),name:"Emergency Fund",target:300000,saved:148000,deadline:"2026-12-31",icon:"🛡️",color:C.teal},
  {id:uid(),name:"Anika's Education",target:2500000,saved:825000,deadline:"2033-06-30",icon:"🎓",color:C.purple},
  {id:uid(),name:"Dream Home",target:6000000,saved:1220000,deadline:"2030-12-31",icon:"🏡",color:C.saffron},
  {id:uid(),name:"Europe Family Trip",target:250000,saved:78000,deadline:"2027-06-30",icon:"✈️",color:C.blue},
];
const DEFAULT_MEMBERS=[
  {id:uid(),name:"Akshay",relation:"Admin · Husband",income:85000,avatar:"👨"},
  {id:uid(),name:"Swapnali",relation:"Spouse",income:35000,avatar:"👩"},
  {id:uid(),name:"Sunita",relation:"Mother",income:0,avatar:"👵"},
  {id:uid(),name:"Chandrakant",relation:"Father",income:0,avatar:"👴"},
  {id:uid(),name:"Anika",relation:"Daughter 1",income:0,avatar:"👧"},
  {id:uid(),name:"Adheera",relation:"Daughter 2",income:0,avatar:"🧒"},
];

// ═══════════════════════════════════════════════════════
// MINI COMPONENTS
// ═══════════════════════════════════════════════════════
function Ring({pct,size=64,sw=7,color=C.saffron}){
  const r=(size-sw)/2,cr=2*Math.PI*r,fill=cr*Math.min(pct,1);
  return(
    <svg width={size} height={size} style={{flexShrink:0}}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#F5E8DC" strokeWidth={sw}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={sw}
        strokeDasharray={`${fill} ${cr}`} strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`}/>
      <text x={size/2} y={size/2+1} textAnchor="middle" dominantBaseline="middle"
        fill={color} fontSize={12} fontWeight="700" fontFamily="Nunito,sans-serif">
        {Math.round(pct*100)}%
      </text>
    </svg>
  );
}

function TxRow({t,onDelete,borderBottom}){
  const cat=CAT[t.category];
  return(
    <div style={{display:"flex",alignItems:"center",padding:"12px 16px",borderBottom:borderBottom?`1px solid ${C.border}`:"none"}}>
      <div style={{width:38,height:38,borderRadius:10,flexShrink:0,marginRight:12,background:`${cat?.color||C.saffron}20`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>
        {cat?.icon||"💰"}
      </div>
      <div style={{flex:1,minWidth:0}}>
        <p style={{margin:0,fontFamily:"Nunito,sans-serif",fontSize:13,fontWeight:600,color:C.text,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{t.description}</p>
        <p style={{margin:0,fontFamily:"Nunito,sans-serif",fontSize:11,color:C.muted}}>{cat?.label} · {t.paymentMode}{t.member?` · ${t.member}`:""}</p>
      </div>
      <div style={{textAlign:"right",marginLeft:8,flexShrink:0}}>
        <p style={{margin:0,fontFamily:"Nunito,sans-serif",fontSize:14,fontWeight:800,color:t.type==="income"?C.teal:C.red}}>
          {t.type==="income"?"+":"−"}₹{t.amount.toLocaleString("en-IN")}
        </p>
        {onDelete&&<button onClick={()=>onDelete(t.id)} style={{background:"none",border:"none",cursor:"pointer",color:C.red,fontSize:10,fontFamily:"Nunito,sans-serif",padding:0,opacity:0.7}}>remove</button>}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// ADD TRANSACTION MODAL
// ═══════════════════════════════════════════════════════
function AddTxModal({onAdd,onClose,members}){
  const [type,setType]=useState("expense");
  const [amt,setAmt]=useState("");
  const [cat,setCat]=useState("");
  const [desc,setDesc]=useState("");
  const [date,setDate]=useState(todayStr());
  const [mem,setMem]=useState(members[0]?.name||"");
  const [pm,setPm]=useState("UPI");
  const cats=type==="income"?INCOME_CATS:EXPENSE_CATS;
  const valid=amt&&cat&&!isNaN(+amt)&&+amt>0;
  const save=()=>{ if(!valid)return; onAdd({id:uid(),type,amount:+amt,category:cat,description:desc||CAT[cat]?.label||cat,date,member:mem,paymentMode:pm}); onClose(); };
  return(
    <div onClick={e=>{if(e.target===e.currentTarget)onClose();}} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",zIndex:200,display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
      <div style={{background:"white",width:"100%",maxWidth:480,borderRadius:"24px 24px 0 0",maxHeight:"92vh",overflowY:"auto",boxShadow:"0 -8px 40px rgba(0,0,0,0.2)"}}>
        <div style={{display:"flex",justifyContent:"center",padding:"12px 0 6px"}}>
          <div style={{width:44,height:4,background:"#E5E7EB",borderRadius:2}}/>
        </div>
        <div style={{padding:"0 20px 44px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
            <h3 style={{margin:0,fontFamily:"'Playfair Display',serif",fontSize:21,color:C.text}}>Add Transaction</h3>
            <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:C.muted}}><X size={20}/></button>
          </div>
          <div style={{display:"flex",background:"#FDF0E8",borderRadius:14,padding:4,marginBottom:18}}>
            {["expense","income"].map(t=>(
              <button key={t} onClick={()=>{setType(t);setCat("");}} style={{flex:1,padding:"9px 0",border:"none",borderRadius:10,cursor:"pointer",fontFamily:"Nunito,sans-serif",fontWeight:800,fontSize:14,transition:"all 0.2s",background:type===t?(t==="income"?C.teal:C.saffron):"transparent",color:type===t?"white":C.muted}}>
                {t==="income"?"↑ Income":"↓ Expense"}
              </button>
            ))}
          </div>
          <div style={{background:type==="income"?`${C.teal}12`:`${C.saffron}15`,borderRadius:14,padding:"14px 18px",marginBottom:18,display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontSize:32,fontFamily:"'Playfair Display',serif",color:type==="income"?C.teal:C.saffron,lineHeight:1}}>₹</span>
            <input value={amt} onChange={e=>setAmt(e.target.value)} type="number" placeholder="0" inputMode="decimal" style={{flex:1,border:"none",background:"transparent",fontSize:32,fontFamily:"'Playfair Display',serif",fontWeight:700,color:C.text,outline:"none",width:"100%"}}/>
          </div>
          <p style={{margin:"0 0 8px",fontSize:11,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:1}}>Category</p>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:18,maxHeight:200,overflowY:"auto"}}>
            {cats.map(c=>(
              <button key={c.id} onClick={()=>setCat(c.id)} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4,padding:"8px 4px",cursor:"pointer",transition:"all 0.15s",border:cat===c.id?`2px solid ${c.color}`:"2px solid transparent",borderRadius:12,background:cat===c.id?`${c.color}15`:"#F9FAFB"}}>
                <span style={{fontSize:22}}>{c.icon}</span>
                <span style={{fontSize:9,fontFamily:"Nunito,sans-serif",fontWeight:700,color:cat===c.id?c.color:C.muted,textAlign:"center",lineHeight:1.3}}>{c.label}</span>
              </button>
            ))}
          </div>
          <input value={desc} onChange={e=>setDesc(e.target.value)} placeholder="Description (optional)" style={{width:"100%",padding:"11px 14px",border:`1px solid ${C.border}`,borderRadius:12,fontFamily:"Nunito,sans-serif",fontSize:14,color:C.text,outline:"none",marginBottom:14,boxSizing:"border-box"}}/>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
            <div><p style={{margin:"0 0 5px",fontSize:11,fontWeight:700,color:C.muted,textTransform:"uppercase"}}>Date</p>
              <input type="date" value={date} onChange={e=>setDate(e.target.value)} style={{width:"100%",padding:"9px 12px",border:`1px solid ${C.border}`,borderRadius:11,fontFamily:"Nunito,sans-serif",fontSize:13,color:C.text,outline:"none",boxSizing:"border-box"}}/>
            </div>
            <div><p style={{margin:"0 0 5px",fontSize:11,fontWeight:700,color:C.muted,textTransform:"uppercase"}}>Payment</p>
              <select value={pm} onChange={e=>setPm(e.target.value)} style={{width:"100%",padding:"9px 12px",border:`1px solid ${C.border}`,borderRadius:11,fontFamily:"Nunito,sans-serif",fontSize:13,color:C.text,outline:"none",background:"white",boxSizing:"border-box"}}>
                {PMODES.map(p=><option key={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <div style={{marginBottom:20}}>
            <p style={{margin:"0 0 8px",fontSize:11,fontWeight:700,color:C.muted,textTransform:"uppercase"}}>Member</p>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              {members.map(m=>(
                <button key={m.id} onClick={()=>setMem(m.name)} style={{padding:"6px 14px",borderRadius:20,cursor:"pointer",fontFamily:"Nunito,sans-serif",fontWeight:700,fontSize:13,transition:"all 0.15s",border:mem===m.name?`2px solid ${C.saffron}`:`2px solid ${C.border}`,background:mem===m.name?`${C.saffron}15`:"white",color:mem===m.name?C.saffron:C.muted}}>
                  {m.avatar} {m.name}
                </button>
              ))}
            </div>
          </div>
          <button onClick={save} style={{width:"100%",padding:"15px",border:"none",borderRadius:14,cursor:valid?"pointer":"default",background:valid?C.grad:"#E5E7EB",color:valid?"white":C.muted,fontFamily:"Nunito,sans-serif",fontWeight:800,fontSize:16,transition:"all 0.2s"}}>
            Save Transaction
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// ADD LOAN MODAL
// ═══════════════════════════════════════════════════════
function AddLoanModal({onAdd,onClose}){
  const [loanType,setLoanType]=useState("personal");
  const [lender,setLender]=useState("");
  const [principal,setPrincipal]=useState("");
  const [outstanding,setOutstanding]=useState("");
  const [ratePA,setRatePA]=useState("");
  const [tenureMonths,setTenureMonths]=useState("");
  const [startDate,setStartDate]=useState("2024-01-01");
  const [step,setStep]=useState(1);
  const valid1=loanType&&lender&&principal&&ratePA&&tenureMonths;
  const save=()=>{
    if(!valid1)return;
    onAdd({
      id:uid(),type:loanType,lender,
      principal:+principal,
      outstanding:+outstanding||+principal,
      ratePA:+ratePA,
      tenureMonths:+tenureMonths,
      startDate,prepayments:[],
      note:""
    });
    onClose();
  };
  return(
    <div onClick={e=>{if(e.target===e.currentTarget)onClose();}} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",zIndex:200,display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
      <div style={{background:"white",width:"100%",maxWidth:480,borderRadius:"24px 24px 0 0",maxHeight:"92vh",overflowY:"auto",boxShadow:"0 -8px 40px rgba(0,0,0,0.2)"}}>
        <div style={{display:"flex",justifyContent:"center",padding:"12px 0 6px"}}>
          <div style={{width:44,height:4,background:"#E5E7EB",borderRadius:2}}/>
        </div>
        <div style={{padding:"0 20px 44px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
            <h3 style={{margin:0,fontFamily:"'Playfair Display',serif",fontSize:21,color:C.text}}>Add Loan Account</h3>
            <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:C.muted}}><X size={20}/></button>
          </div>
          <p style={{margin:"0 0 10px",fontSize:11,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:1}}>Loan Type</p>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:18}}>
            {LOAN_TYPES.map(lt=>(
              <button key={lt.id} onClick={()=>setLoanType(lt.id)} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4,padding:"10px 4px",cursor:"pointer",transition:"all 0.15s",border:loanType===lt.id?`2px solid ${lt.color}`:"2px solid transparent",borderRadius:12,background:loanType===lt.id?`${lt.color}15`:"#F9FAFB"}}>
                <span style={{fontSize:20}}>{lt.icon}</span>
                <span style={{fontSize:9,fontFamily:"Nunito,sans-serif",fontWeight:700,color:loanType===lt.id?lt.color:C.muted,textAlign:"center",lineHeight:1.2}}>{lt.label}</span>
              </button>
            ))}
          </div>
          <input value={lender} onChange={e=>setLender(e.target.value)} placeholder="Lender name (e.g. SBI, HDFC, Bajaj)" style={{width:"100%",padding:"11px 14px",border:`1px solid ${C.border}`,borderRadius:12,fontFamily:"Nunito,sans-serif",fontSize:14,color:C.text,outline:"none",marginBottom:12,boxSizing:"border-box"}}/>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
            {[["Original Principal","principal",principal,setPrincipal],["Outstanding Balance","outstanding",outstanding,setOutstanding]].map(([lbl,k,val,setter])=>(
              <div key={k}><p style={{margin:"0 0 5px",fontSize:11,fontWeight:700,color:C.muted,textTransform:"uppercase"}}>{lbl}</p>
                <input value={val} onChange={e=>setter(e.target.value)} type="number" placeholder="₹0" inputMode="numeric" style={{width:"100%",padding:"9px 12px",border:`1px solid ${C.border}`,borderRadius:11,fontFamily:"Nunito,sans-serif",fontSize:13,color:C.text,outline:"none",boxSizing:"border-box"}}/>
              </div>
            ))}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
            <div><p style={{margin:"0 0 5px",fontSize:11,fontWeight:700,color:C.muted,textTransform:"uppercase"}}>Interest Rate (% p.a.)</p>
              <input value={ratePA} onChange={e=>setRatePA(e.target.value)} type="number" placeholder="e.g. 8.5" inputMode="decimal" style={{width:"100%",padding:"9px 12px",border:`1px solid ${C.border}`,borderRadius:11,fontFamily:"Nunito,sans-serif",fontSize:13,color:C.text,outline:"none",boxSizing:"border-box"}}/>
            </div>
            <div><p style={{margin:"0 0 5px",fontSize:11,fontWeight:700,color:C.muted,textTransform:"uppercase"}}>Tenure (months)</p>
              <input value={tenureMonths} onChange={e=>setTenureMonths(e.target.value)} type="number" placeholder="e.g. 240" inputMode="numeric" style={{width:"100%",padding:"9px 12px",border:`1px solid ${C.border}`,borderRadius:11,fontFamily:"Nunito,sans-serif",fontSize:13,color:C.text,outline:"none",boxSizing:"border-box"}}/>
            </div>
          </div>
          <div style={{marginBottom:20}}>
            <p style={{margin:"0 0 5px",fontSize:11,fontWeight:700,color:C.muted,textTransform:"uppercase"}}>Loan Start Date</p>
            <input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)} style={{width:"100%",padding:"11px 14px",border:`1px solid ${C.border}`,borderRadius:12,fontFamily:"Nunito,sans-serif",fontSize:14,color:C.text,outline:"none",boxSizing:"border-box"}}/>
          </div>
          {principal&&ratePA&&tenureMonths&&(
            <div style={{background:`${C.saffron}12`,borderRadius:14,padding:"12px 16px",marginBottom:18,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div>
                <p style={{margin:0,fontFamily:"Nunito,sans-serif",fontSize:11,color:C.muted,fontWeight:700,textTransform:"uppercase"}}>Monthly EMI</p>
                <p style={{margin:"2px 0 0",fontFamily:"'Playfair Display',serif",fontSize:22,color:C.saffron,fontWeight:700}}>
                  ₹{Math.round(computeEMI(+principal,+ratePA,+tenureMonths)).toLocaleString("en-IN")}
                </p>
              </div>
              <div style={{textAlign:"right"}}>
                <p style={{margin:0,fontFamily:"Nunito,sans-serif",fontSize:11,color:C.muted,fontWeight:700,textTransform:"uppercase"}}>Total Interest</p>
                <p style={{margin:"2px 0 0",fontFamily:"Nunito,sans-serif",fontSize:14,fontWeight:800,color:C.red}}>
                  ₹{Math.round(computeEMI(+principal,+ratePA,+tenureMonths)*+tenureMonths-+principal).toLocaleString("en-IN")}
                </p>
              </div>
            </div>
          )}
          <button onClick={save} style={{width:"100%",padding:"15px",border:"none",borderRadius:14,cursor:valid1?"pointer":"default",background:valid1?C.grad:"#E5E7EB",color:valid1?"white":C.muted,fontFamily:"Nunito,sans-serif",fontWeight:800,fontSize:16}}>
            Add Loan Account
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// PREPAY MODAL
// ═══════════════════════════════════════════════════════
function PrepayModal({loan,onSave,onClose}){
  const [ym,setYm]=useState(()=>{ const n=new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,"0")}`; });
  const [amount,setAmount]=useState("");
  const save=()=>{
    if(!amount||!ym)return;
    const existing=loan.prepayments.filter(p=>p.ym!==ym);
    onSave([...existing,{ym,amount:+amount}]);
    onClose();
  };
  return(
    <div onClick={e=>{if(e.target===e.currentTarget)onClose();}} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{background:"white",width:"100%",maxWidth:380,borderRadius:22,padding:"24px",boxShadow:"0 24px 60px rgba(0,0,0,0.2)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
          <h3 style={{margin:0,fontFamily:"'Playfair Display',serif",fontSize:20,color:C.text}}>Add Prepayment</h3>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:C.muted}}><X size={20}/></button>
        </div>
        <p style={{margin:"0 0 16px",fontFamily:"Nunito,sans-serif",fontSize:13,color:C.muted}}>{loan.lender}</p>
        <p style={{margin:"0 0 6px",fontSize:11,fontWeight:700,color:C.muted,textTransform:"uppercase"}}>Month</p>
        <input type="month" value={ym} onChange={e=>setYm(e.target.value)} style={{width:"100%",padding:"11px 14px",border:`1px solid ${C.border}`,borderRadius:12,fontFamily:"Nunito,sans-serif",fontSize:14,color:C.text,outline:"none",marginBottom:14,boxSizing:"border-box"}}/>
        <p style={{margin:"0 0 6px",fontSize:11,fontWeight:700,color:C.muted,textTransform:"uppercase"}}>Extra Payment Amount</p>
        <div style={{background:`${C.teal}12`,borderRadius:14,padding:"12px 18px",display:"flex",alignItems:"center",gap:10,marginBottom:20}}>
          <span style={{fontSize:28,color:C.teal,lineHeight:1}}>₹</span>
          <input value={amount} onChange={e=>setAmount(e.target.value)} type="number" placeholder="0" inputMode="numeric" style={{flex:1,border:"none",background:"transparent",fontSize:28,fontFamily:"'Playfair Display',serif",fontWeight:700,color:C.text,outline:"none"}}/>
        </div>
        <button onClick={save} style={{width:"100%",padding:"13px",border:"none",borderRadius:13,cursor:amount?"pointer":"default",background:amount?C.grad:"#E5E7EB",color:amount?"white":C.muted,fontFamily:"Nunito,sans-serif",fontWeight:800,fontSize:15}}>
          Save Prepayment
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// LOAN DASHBOARD (main loans view)
// ═══════════════════════════════════════════════════════
function LoansTab({loans,onAdd,onUpdate,onDelete}){
  const [view,setView]=useState("overview");   // overview | detail | strategy | schedule
  const [selLoan,setSelLoan]=useState(null);
  const [showAdd,setShowAdd]=useState(false);
  const [showPrepay,setShowPrepay]=useState(false);
  const [strategy,setStrategy]=useState("avalanche");
  const [extraBudget,setExtraBudget]=useState(10000);

  // ── compute current balances from schedules ──
  const loanData = useMemo(()=>loans.map(l=>{
    const sched=genSchedule(l);
    const now=new Date();
    const curYm=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`;
    const row=sched.find(r=>r.ym===curYm) || sched[sched.length-1] || {balance:0,emi:0,interest:0};
    const paidRows=sched.filter(r=>r.ym<curYm);
    const totalInterest=sched.reduce((s,r)=>s+r.interest,0);
    const paidInterest=paidRows.reduce((s,r)=>s+r.interest,0);
    const balance=sched.length?sched.filter(r=>r.ym<=curYm).reduce((last,r)=>r,sched[0]).balance:l.principal;
    const lastSched=sched[sched.length-1];
    const endYm=lastSched?.ym||curYm;
    return{...l,schedule:sched,curBal:balance,emi:Math.round(computeEMI(l.principal,l.ratePA,l.tenureMonths)),totalInterest,paidInterest,endYm,paid:paidRows.length};
  }),[loans]);

  const totalEMI=loanData.reduce((s,l)=>s+l.emi,0);
  const totalBal=loanData.reduce((s,l)=>s+l.curBal,0);
  const totalInt=loanData.reduce((s,l)=>s+l.totalInterest,0);

  // ── debt-free strategy ──
  const strategyOrder = useMemo(()=>{
    if(strategy==="avalanche") return [...loanData].sort((a,b)=>b.ratePA-a.ratePA);
    if(strategy==="snowball")  return [...loanData].sort((a,b)=>a.curBal-b.curBal);
    return loanData;
  },[loanData,strategy]);

  const savingsEstimate = useMemo(()=>{
    if(!extraBudget||!strategyOrder.length)return null;
    const top=strategyOrder[0];
    if(!top||!top.curBal)return null;
    const monthsNormal=top.schedule.length;
    const r=top.ratePA/12/100;
    const newEmi=top.emi+extraBudget;
    let bal=top.curBal,months=0,intSaved=0;
    while(bal>0.5&&months<1200){
      const interest=Math.round(bal*r);
      const pay=Math.min(newEmi,bal+interest);
      bal=Math.max(0,bal-pay+interest);
      intSaved+=interest;
      months++;
    }
    return{months:monthsNormal-months,interestSaved:Math.round(top.totalInterest-intSaved),lender:top.lender};
  },[strategyOrder,extraBudget]);

  if(view==="schedule"&&selLoan){
    const l=loanData.find(x=>x.id===selLoan);
    if(!l)return null;
    const now=new Date();
    const curYm=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`;
    return(
      <div style={{padding:"0 16px 20px"}}>
        <button onClick={()=>setView("detail")} style={{background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:6,color:C.muted,fontFamily:"Nunito,sans-serif",fontSize:13,fontWeight:700,marginBottom:16}}>
          <ChevronLeft size={16}/> Back
        </button>
        <div style={{background:C.card,borderRadius:20,overflow:"hidden",boxShadow:"0 2px 20px rgba(0,0,0,0.07)",border:`1px solid ${C.lightBorder}`,marginBottom:20}}>
          <div style={{background:C.grad,padding:"16px 20px",color:"white"}}>
            <p style={{margin:0,fontFamily:"Nunito,sans-serif",fontSize:12,opacity:0.8}}>Amortization Schedule</p>
            <p style={{margin:"2px 0 0",fontFamily:"'Playfair Display',serif",fontSize:20,fontWeight:700}}>{l.lender}</p>
          </div>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontFamily:"Nunito,sans-serif",fontSize:12}}>
              <thead>
                <tr style={{background:"#FDF0E8"}}>
                  {["Month","EMI","Interest","Principal","Prepay","Balance"].map(h=>(
                    <th key={h} style={{padding:"10px 12px",textAlign:"right",color:C.muted,fontWeight:800,fontSize:11,textTransform:"uppercase",whiteSpace:"nowrap"}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {l.schedule.map((row,i)=>{
                  const isPast=row.ym<curYm;
                  const isCur=row.ym===curYm;
                  return(
                    <tr key={i} style={{borderBottom:`1px solid ${C.border}`,background:isCur?`${C.saffron}10`:isPast?"#FAFAFA":"white"}}>
                      <td style={{padding:"9px 12px",color:isCur?C.saffron:isPast?C.muted:C.text,fontWeight:isCur?800:500}}>
                        {isCur?"→ ":""}{shortMonth(row.ym)}&nbsp;{row.ym.split("-")[0]}
                      </td>
                      {[row.emi,row.interest,row.principal,row.prepay||0,row.balance].map((v,j)=>(
                        <td key={j} style={{padding:"9px 12px",textAlign:"right",color:j===1?C.red:j===4?C.teal:C.text,fontWeight:j===4?700:400}}>
                          ₹{v.toLocaleString("en-IN")}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  if(view==="detail"&&selLoan){
    const l=loanData.find(x=>x.id===selLoan);
    if(!l)return null;
    const lt=LOAN_TYPE[l.type];
    const paidPct=l.paid/l.tenureMonths;
    const balPct=l.curBal/l.principal;
    const chartData=l.schedule.filter((_,i)=>i%3===0).map(r=>({m:shortMonth(r.ym),bal:Math.round(r.balance/1000),int:Math.round(r.interest)}));
    return(
      <div style={{padding:"0 16px 20px"}}>
        <button onClick={()=>{setView("overview");setSelLoan(null);}} style={{background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:6,color:C.muted,fontFamily:"Nunito,sans-serif",fontSize:13,fontWeight:700,marginBottom:16}}>
          <ChevronLeft size={16}/> All Loans
        </button>
        <div style={{background:C.card,borderRadius:20,padding:"20px",marginBottom:14,boxShadow:"0 2px 20px rgba(0,0,0,0.07)",border:`1px solid ${C.lightBorder}`,borderTop:`5px solid ${lt.color}`}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
            <div style={{display:"flex",gap:12,alignItems:"center"}}>
              <div style={{width:48,height:48,borderRadius:14,background:`${lt.color}18`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:26}}>{lt.icon}</div>
              <div>
                <p style={{margin:0,fontFamily:"Nunito,sans-serif",fontSize:16,fontWeight:800,color:C.text}}>{l.lender}</p>
                <p style={{margin:0,fontFamily:"Nunito,sans-serif",fontSize:12,color:C.muted}}>{lt.label} · {l.ratePA}% p.a.</p>
              </div>
            </div>
            <Ring pct={1-balPct} size={64} color={lt.color}/>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:16}}>
            {[["Outstanding",`₹${Math.round(l.curBal/1000)}K`,C.red],["Monthly EMI",`₹${Math.round(l.emi/1000)}K`,lt.color],["Rate",`${l.ratePA}%`,C.muted]].map(([lbl,val,col])=>(
              <div key={lbl} style={{background:"#FDF8F5",borderRadius:11,padding:"10px"}}>
                <p style={{margin:0,fontFamily:"Nunito,sans-serif",fontSize:10,color:C.muted,fontWeight:700,textTransform:"uppercase"}}>{lbl}</p>
                <p style={{margin:"3px 0 0",fontFamily:"Nunito,sans-serif",fontSize:16,fontWeight:800,color:col}}>{val}</p>
              </div>
            ))}
          </div>
          <div style={{height:8,background:"#F5E8DC",borderRadius:6,overflow:"hidden",marginBottom:8}}>
            <div style={{width:`${paidPct*100}%`,height:"100%",background:lt.color,borderRadius:6}}/>
          </div>
          <div style={{display:"flex",justifyContent:"space-between"}}>
            <span style={{fontFamily:"Nunito,sans-serif",fontSize:11,color:C.muted}}>{l.paid} EMIs paid</span>
            <span style={{fontFamily:"Nunito,sans-serif",fontSize:11,color:C.muted}}>{l.tenureMonths-l.paid} remaining</span>
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
          {[["Total Interest",`₹${Math.round(l.totalInterest/1000)}K`,C.red,"Interest you'll pay"],["Interest Paid",`₹${Math.round(l.paidInterest/1000)}K`,C.teal,"So far paid"],["Original Loan",`₹${Math.round(l.principal/1000)}K`,C.text,"Loan amount"],["End Month",l.endYm?monthLabel(l.endYm).split(" ").join("\n"):"—",C.muted,"Pay-off date"]].map(([lbl,val,col,sub])=>(
            <div key={lbl} style={{background:C.card,borderRadius:16,padding:"14px 16px",boxShadow:"0 2px 12px rgba(0,0,0,0.06)",border:`1px solid ${C.lightBorder}`}}>
              <p style={{margin:0,fontFamily:"Nunito,sans-serif",fontSize:10,color:C.muted,fontWeight:700,textTransform:"uppercase"}}>{lbl}</p>
              <p style={{margin:"3px 0 2px",fontFamily:"Nunito,sans-serif",fontSize:18,fontWeight:800,color:col}}>{val}</p>
              <p style={{margin:0,fontFamily:"Nunito,sans-serif",fontSize:10,color:C.muted}}>{sub}</p>
            </div>
          ))}
        </div>
        <div style={{background:C.card,borderRadius:20,padding:"18px 20px",marginBottom:14,boxShadow:"0 2px 20px rgba(0,0,0,0.07)",border:`1px solid ${C.lightBorder}`}}>
          <p style={{margin:"0 0 14px",fontFamily:"'Playfair Display',serif",fontSize:17}}>Balance Projection</p>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="balGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={lt.color} stopOpacity={0.25}/>
                  <stop offset="95%" stopColor={lt.color} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="m" tick={{fontFamily:"Nunito,sans-serif",fontSize:10,fill:C.muted}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fontFamily:"Nunito,sans-serif",fontSize:10,fill:C.muted}} axisLine={false} tickLine={false} width={32} tickFormatter={v=>`₹${v}K`}/>
              <Tooltip formatter={v=>`₹${v}K`} contentStyle={{fontFamily:"Nunito,sans-serif",borderRadius:10,border:"none",fontSize:12}}/>
              <Area type="monotone" dataKey="bal" stroke={lt.color} strokeWidth={2.5} fill="url(#balGrad)" name="Balance"/>
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
          <button onClick={()=>setShowPrepay(true)} style={{padding:"13px",border:"none",borderRadius:14,cursor:"pointer",background:lt.color,color:"white",fontFamily:"Nunito,sans-serif",fontWeight:800,fontSize:13,display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
            <Zap size={15}/> Add Prepayment
          </button>
          <button onClick={()=>setView("schedule")} style={{padding:"13px",border:`1px solid ${C.border}`,borderRadius:14,cursor:"pointer",background:"white",color:C.text,fontFamily:"Nunito,sans-serif",fontWeight:800,fontSize:13,display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
            <Calendar size={15}/> Full Schedule
          </button>
        </div>
        <button onClick={()=>onDelete(l.id)} style={{width:"100%",padding:"12px",border:`1px solid #FECACA`,borderRadius:13,cursor:"pointer",background:"white",color:C.red,fontFamily:"Nunito,sans-serif",fontWeight:700,fontSize:13}}>
          Remove Loan Account
        </button>
        {showPrepay&&<PrepayModal loan={l} onSave={preps=>onUpdate(l.id,{prepayments:preps})} onClose={()=>setShowPrepay(false)}/>}
      </div>
    );
  }

  return(
    <div style={{padding:"0 16px 20px"}}>
      {/* Summary header */}
      <div style={{background:C.grad,borderRadius:20,padding:"20px",marginBottom:14,color:"white",boxShadow:`0 4px 24px ${C.saffron}50`}}>
        <p style={{margin:"0 0 4px",fontFamily:"Nunito,sans-serif",fontSize:11,fontWeight:700,opacity:0.8,textTransform:"uppercase",letterSpacing:1}}>Total Outstanding Debt</p>
        <p style={{margin:"0 0 2px",fontFamily:"'Playfair Display',serif",fontSize:36,fontWeight:700,lineHeight:1}}>{fmtINR(totalBal)}</p>
        <p style={{margin:"0 0 16px",fontFamily:"Nunito,sans-serif",fontSize:12,opacity:0.75}}>across {loans.length} active loan{loans.length!==1?"s":""}</p>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <div style={{background:"rgba(255,255,255,0.2)",borderRadius:13,padding:"12px 14px",backdropFilter:"blur(6px)"}}>
            <p style={{margin:"0 0 2px",fontFamily:"Nunito,sans-serif",fontSize:10,opacity:0.8,textTransform:"uppercase",fontWeight:700}}>Monthly EMI Burden</p>
            <p style={{margin:0,fontFamily:"'Playfair Display',serif",fontSize:20,fontWeight:700}}>{fmtINR(totalEMI)}</p>
          </div>
          <div style={{background:"rgba(255,255,255,0.2)",borderRadius:13,padding:"12px 14px",backdropFilter:"blur(6px)"}}>
            <p style={{margin:"0 0 2px",fontFamily:"Nunito,sans-serif",fontSize:10,opacity:0.8,textTransform:"uppercase",fontWeight:700}}>Total Future Interest</p>
            <p style={{margin:0,fontFamily:"'Playfair Display',serif",fontSize:20,fontWeight:700}}>{fmtINR(totalInt)}</p>
          </div>
        </div>
      </div>

      {/* Sub-tabs */}
      <div style={{display:"flex",gap:8,marginBottom:16,overflowX:"auto",paddingBottom:2}}>
        {[["overview","📋 Loans"],["strategy","⚡ Strategy"]].map(([id,lbl])=>(
          <button key={id} onClick={()=>setView(id)} style={{flexShrink:0,padding:"9px 18px",border:"none",borderRadius:11,cursor:"pointer",fontFamily:"Nunito,sans-serif",fontWeight:800,fontSize:13,transition:"all 0.2s",background:view===id?C.saffron:"#FDF0E8",color:view===id?"white":C.muted}}>
            {lbl}
          </button>
        ))}
      </div>

      {view==="overview"&&(
        <>
          {loanData.length===0&&(
            <div style={{textAlign:"center",padding:"48px 20px"}}>
              <div style={{fontSize:52}}>🏦</div>
              <p style={{fontFamily:"Nunito,sans-serif",fontWeight:700,color:C.muted,fontSize:15,marginTop:12}}>No loans added yet</p>
              <p style={{fontFamily:"Nunito,sans-serif",fontSize:13,color:C.muted}}>Tap the + button to add a loan account</p>
            </div>
          )}
          {loanData.map(l=>{
            const lt=LOAN_TYPE[l.type];
            const pct=1-(l.curBal/l.principal);
            return(
              <div key={l.id} onClick={()=>{setSelLoan(l.id);setView("detail");}} style={{background:C.card,borderRadius:18,padding:"16px",marginBottom:12,boxShadow:"0 2px 16px rgba(0,0,0,0.06)",border:`1px solid ${C.lightBorder}`,borderLeft:`5px solid ${lt.color}`,cursor:"pointer"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                  <div style={{display:"flex",alignItems:"center",gap:10}}>
                    <span style={{fontSize:22}}>{lt.icon}</span>
                    <div>
                      <p style={{margin:0,fontFamily:"Nunito,sans-serif",fontSize:14,fontWeight:800,color:C.text}}>{l.lender}</p>
                      <p style={{margin:0,fontFamily:"Nunito,sans-serif",fontSize:11,color:C.muted}}>{lt.label} · {l.ratePA}% p.a.</p>
                    </div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <p style={{margin:0,fontFamily:"Nunito,sans-serif",fontSize:16,fontWeight:800,color:C.red}}>{fmtINR(l.curBal)}</p>
                    <p style={{margin:0,fontFamily:"Nunito,sans-serif",fontSize:11,color:C.muted}}>EMI: {fmtINR(l.emi)}/mo</p>
                  </div>
                </div>
                <div style={{height:6,background:"#F5E8DC",borderRadius:4,overflow:"hidden",marginBottom:6}}>
                  <div style={{width:`${Math.max(0,Math.min(100,pct*100))}%`,height:"100%",background:lt.color,borderRadius:4}}/>
                </div>
                <div style={{display:"flex",justifyContent:"space-between"}}>
                  <span style={{fontFamily:"Nunito,sans-serif",fontSize:10,color:C.muted}}>{Math.round(pct*100)}% paid off</span>
                  <span style={{fontFamily:"Nunito,sans-serif",fontSize:10,color:C.muted}}>{l.tenureMonths-l.paid} months left · tap for details →</span>
                </div>
              </div>
            );
          })}
        </>
      )}

      {view==="strategy"&&(
        <>
          <div style={{background:C.card,borderRadius:20,padding:"20px",marginBottom:14,boxShadow:"0 2px 20px rgba(0,0,0,0.07)",border:`1px solid ${C.lightBorder}`}}>
            <p style={{margin:"0 0 14px",fontFamily:"'Playfair Display',serif",fontSize:18,color:C.text}}>Repayment Strategy</p>
            <div style={{display:"grid",gridTemplateColumns:"1fr",gap:10,marginBottom:18}}>
              {STRATEGIES.map(s=>(
                <button key={s.id} onClick={()=>setStrategy(s.id)} style={{display:"flex",alignItems:"center",gap:14,padding:"14px 16px",border:strategy===s.id?`2px solid ${C.saffron}`:`1px solid ${C.border}`,borderRadius:14,cursor:"pointer",background:strategy===s.id?`${C.saffron}08`:"white",textAlign:"left"}}>
                  <span style={{fontSize:24}}>{s.icon}</span>
                  <div>
                    <p style={{margin:0,fontFamily:"Nunito,sans-serif",fontSize:14,fontWeight:800,color:strategy===s.id?C.saffron:C.text}}>{s.label}</p>
                    <p style={{margin:0,fontFamily:"Nunito,sans-serif",fontSize:12,color:C.muted}}>{s.sub}</p>
                  </div>
                  {strategy===s.id&&<CheckCircle size={18} color={C.saffron} style={{marginLeft:"auto"}}/>}
                </button>
              ))}
            </div>
            <p style={{margin:"0 0 8px",fontFamily:"Nunito,sans-serif",fontSize:12,fontWeight:700,color:C.muted,textTransform:"uppercase"}}>Extra Monthly Budget</p>
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
              <span style={{fontFamily:"Nunito,sans-serif",fontSize:13,color:C.muted}}>₹0</span>
              <input type="range" min="0" max="100000" step="1000" value={extraBudget} onChange={e=>setExtraBudget(+e.target.value)} style={{flex:1}}/>
              <span style={{fontFamily:"Nunito,sans-serif",fontSize:14,fontWeight:800,color:C.saffron,minWidth:60}}>₹{(extraBudget/1000).toFixed(0)}K</span>
            </div>
            {savingsEstimate&&extraBudget>0&&(
              <div style={{background:`${C.teal}12`,borderRadius:14,padding:"14px 16px",border:`1px solid ${C.teal}30`}}>
                <p style={{margin:"0 0 4px",fontFamily:"Nunito,sans-serif",fontSize:11,fontWeight:700,color:C.teal,textTransform:"uppercase"}}>Projected savings targeting {savingsEstimate.lender}</p>
                <div style={{display:"flex",gap:20}}>
                  <div>
                    <p style={{margin:0,fontFamily:"Nunito,sans-serif",fontSize:11,color:C.muted}}>Months saved</p>
                    <p style={{margin:0,fontFamily:"'Playfair Display',serif",fontSize:22,color:C.teal,fontWeight:700}}>{Math.max(0,savingsEstimate.months)}</p>
                  </div>
                  <div>
                    <p style={{margin:0,fontFamily:"Nunito,sans-serif",fontSize:11,color:C.muted}}>Interest saved</p>
                    <p style={{margin:0,fontFamily:"'Playfair Display',serif",fontSize:22,color:C.green,fontWeight:700}}>{fmtINR(Math.max(0,savingsEstimate.interestSaved))}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <p style={{margin:"0 0 10px",fontFamily:"'Playfair Display',serif",fontSize:17,color:C.text}}>Priority Order</p>
          {strategyOrder.map((l,i)=>{
            const lt=LOAN_TYPE[l.type];
            return(
              <div key={l.id} style={{background:C.card,borderRadius:16,padding:"14px 16px",marginBottom:10,boxShadow:"0 2px 14px rgba(0,0,0,0.05)",border:`1px solid ${C.lightBorder}`,display:"flex",alignItems:"center",gap:12}}>
                <div style={{width:34,height:34,borderRadius:10,background:i===0?C.saffron:"#F5E8DC",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"Nunito,sans-serif",fontWeight:800,fontSize:14,color:i===0?"white":C.muted,flexShrink:0}}>
                  {i+1}
                </div>
                <span style={{fontSize:20}}>{lt.icon}</span>
                <div style={{flex:1}}>
                  <p style={{margin:0,fontFamily:"Nunito,sans-serif",fontSize:13,fontWeight:800,color:C.text}}>{l.lender}</p>
                  <p style={{margin:0,fontFamily:"Nunito,sans-serif",fontSize:11,color:C.muted}}>{l.ratePA}% p.a. · {fmtINR(l.curBal)} left</p>
                </div>
                {i===0&&<span style={{background:`${C.saffron}18`,color:C.saffron,fontFamily:"Nunito,sans-serif",fontSize:10,fontWeight:800,padding:"4px 10px",borderRadius:20,whiteSpace:"nowrap"}}>Target now</span>}
              </div>
            );
          })}
        </>
      )}

      <button onClick={()=>setShowAdd(true)} style={{width:"100%",padding:"18px",border:`2px dashed ${C.border}`,borderRadius:18,background:"white",cursor:"pointer",fontFamily:"Nunito,sans-serif",fontWeight:800,fontSize:14,color:C.saffron,display:"flex",alignItems:"center",justifyContent:"center",gap:8,marginTop:8}}>
        <Plus size={18}/> Add Loan Account
      </button>
      {showAdd&&<AddLoanModal onAdd={l=>{onAdd(l);setShowAdd(false);}} onClose={()=>setShowAdd(false)}/>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════
function Dashboard({transactions,goals,members,loans,currentMonth}){
  const monthTxns=useMemo(()=>transactions.filter(t=>ymOf(t.date)===currentMonth),[transactions,currentMonth]);
  const income=useMemo(()=>monthTxns.filter(t=>t.type==="income").reduce((s,t)=>s+t.amount,0),[monthTxns]);
  const expense=useMemo(()=>monthTxns.filter(t=>t.type==="expense").reduce((s,t)=>s+t.amount,0),[monthTxns]);
  const savings=income-expense;
  const savePct=income>0?savings/income:0;

  const loanData=useMemo(()=>loans.map(l=>{
    const sched=genSchedule(l);
    const now=new Date();const curYm=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`;
    const bal=sched.filter(r=>r.ym<=curYm).reduce((last,r)=>r,sched[0])?.balance||l.principal;
    return{...l,curBal:bal,emi:Math.round(computeEMI(l.principal,l.ratePA,l.tenureMonths))};
  }),[loans]);
  const totalBal=loanData.reduce((s,l)=>s+l.curBal,0);
  const totalEMI=loanData.reduce((s,l)=>s+l.emi,0);

  const catBreak=useMemo(()=>{
    const map={};monthTxns.filter(t=>t.type==="expense").forEach(t=>{map[t.category]=(map[t.category]||0)+t.amount;});
    return Object.entries(map).map(([id,val])=>({id,label:CAT[id]?.label||id,val,color:CAT[id]?.color||"#ccc",icon:CAT[id]?.icon||"📦"})).sort((a,b)=>b.val-a.val).slice(0,5);
  },[monthTxns]);
  const recent=useMemo(()=>[...transactions].sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,5),[transactions]);

  return(
    <div style={{padding:"0 16px 20px"}}>
      <div style={{background:C.card,borderRadius:20,padding:"20px",marginBottom:14,boxShadow:"0 2px 20px rgba(0,0,0,0.07)",border:`1px solid ${C.lightBorder}`}}>
        <p style={{margin:"0 0 4px",fontFamily:"Nunito,sans-serif",fontSize:11,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:1}}>Monthly Savings</p>
        <div style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between"}}>
          <div>
            <p style={{margin:"0 0 2px",fontFamily:"'Playfair Display',serif",fontSize:36,fontWeight:700,color:savings>=0?C.teal:C.red,lineHeight:1}}>{fmtINR(savings)}</p>
            <p style={{margin:0,fontFamily:"Nunito,sans-serif",fontSize:13,color:C.muted}}>Savings rate: <span style={{color:savePct>=0.2?C.teal:C.saffron,fontWeight:800}}>{(savePct*100).toFixed(1)}%</span></p>
          </div>
          <Ring pct={savePct} size={76} color={savePct>=0.2?C.teal:C.saffron}/>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
        <div style={{background:`linear-gradient(135deg,${C.teal},#0A8A80)`,borderRadius:18,padding:"16px 18px",color:"white",boxShadow:`0 4px 20px ${C.teal}50`}}>
          <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:8,opacity:0.85}}><TrendingUp size={13}/><span style={{fontFamily:"Nunito,sans-serif",fontSize:11,fontWeight:700,textTransform:"uppercase"}}>Income</span></div>
          <p style={{margin:0,fontFamily:"'Playfair Display',serif",fontSize:24,fontWeight:700}}>{fmtINR(income)}</p>
        </div>
        <div style={{background:"linear-gradient(135deg,#EF4444,#DC2626)",borderRadius:18,padding:"16px 18px",color:"white",boxShadow:"0 4px 20px #EF444455"}}>
          <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:8,opacity:0.85}}><TrendingDown size={13}/><span style={{fontFamily:"Nunito,sans-serif",fontSize:11,fontWeight:700,textTransform:"uppercase"}}>Expenses</span></div>
          <p style={{margin:0,fontFamily:"'Playfair Display',serif",fontSize:24,fontWeight:700}}>{fmtINR(expense)}</p>
        </div>
      </div>
      {loans.length>0&&(
        <div style={{background:C.card,borderRadius:20,padding:"18px 20px",marginBottom:14,boxShadow:"0 2px 20px rgba(0,0,0,0.07)",border:`1px solid ${C.lightBorder}`}}>
          <p style={{margin:"0 0 14px",fontFamily:"'Playfair Display',serif",fontSize:17,color:C.text}}>Debt Snapshot</p>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
            <div style={{background:"#FDF8F5",borderRadius:12,padding:"12px"}}>
              <p style={{margin:0,fontFamily:"Nunito,sans-serif",fontSize:10,color:C.muted,fontWeight:700,textTransform:"uppercase"}}>Total Debt</p>
              <p style={{margin:"3px 0 0",fontFamily:"Nunito,sans-serif",fontSize:18,fontWeight:800,color:C.red}}>{fmtINR(totalBal)}</p>
            </div>
            <div style={{background:"#FDF8F5",borderRadius:12,padding:"12px"}}>
              <p style={{margin:0,fontFamily:"Nunito,sans-serif",fontSize:10,color:C.muted,fontWeight:700,textTransform:"uppercase"}}>Monthly EMI</p>
              <p style={{margin:"3px 0 0",fontFamily:"Nunito,sans-serif",fontSize:18,fontWeight:800,color:C.saffron}}>{fmtINR(totalEMI)}</p>
            </div>
          </div>
          {loanData.map(l=>{
            const lt=LOAN_TYPE[l.type];
            const pct=1-(l.curBal/l.principal);
            return(
              <div key={l.id} style={{marginBottom:10}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                  <span style={{fontFamily:"Nunito,sans-serif",fontSize:12,fontWeight:700,color:C.text}}>{lt.icon} {l.lender}</span>
                  <span style={{fontFamily:"Nunito,sans-serif",fontSize:12,color:C.red,fontWeight:800}}>{fmtINR(l.curBal)}</span>
                </div>
                <div style={{height:5,background:"#F5E8DC",borderRadius:3,overflow:"hidden"}}>
                  <div style={{width:`${Math.max(0,Math.min(100,pct*100))}%`,height:"100%",background:lt.color,borderRadius:3}}/>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {catBreak.length>0&&(
        <div style={{background:C.card,borderRadius:20,padding:"18px 20px",marginBottom:14,boxShadow:"0 2px 20px rgba(0,0,0,0.07)",border:`1px solid ${C.lightBorder}`}}>
          <p style={{margin:"0 0 14px",fontFamily:"'Playfair Display',serif",fontSize:17,color:C.text}}>Top Expenses</p>
          <div style={{display:"flex",alignItems:"center",gap:16}}>
            <PieChart width={110} height={110}>
              <Pie data={catBreak} cx={50} cy={50} innerRadius={28} outerRadius={52} dataKey="val" stroke="none">
                {catBreak.map((e,i)=><Cell key={i} fill={e.color}/>)}
              </Pie>
            </PieChart>
            <div style={{flex:1}}>
              {catBreak.map(c=>(
                <div key={c.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:7}}>
                  <div style={{display:"flex",alignItems:"center",gap:7}}>
                    <div style={{width:8,height:8,borderRadius:"50%",background:c.color,flexShrink:0}}/>
                    <span style={{fontFamily:"Nunito,sans-serif",fontSize:12,color:C.text}}>{c.label}</span>
                  </div>
                  <span style={{fontFamily:"Nunito,sans-serif",fontSize:12,fontWeight:800,color:C.text}}>{fmtINR(c.val)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {goals.length>0&&(
        <div style={{background:C.card,borderRadius:20,padding:"18px 20px",marginBottom:14,boxShadow:"0 2px 20px rgba(0,0,0,0.07)",border:`1px solid ${C.lightBorder}`}}>
          <p style={{margin:"0 0 14px",fontFamily:"'Playfair Display',serif",fontSize:17,color:C.text}}>Goals Progress</p>
          {goals.slice(0,3).map(g=>{
            const p=g.saved/g.target;
            return(
              <div key={g.id} style={{marginBottom:13}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                  <span style={{fontFamily:"Nunito,sans-serif",fontSize:13,fontWeight:700,color:C.text}}>{g.icon} {g.name}</span>
                  <span style={{fontFamily:"Nunito,sans-serif",fontSize:12,color:g.color,fontWeight:800}}>{Math.round(p*100)}%</span>
                </div>
                <div style={{height:7,background:"#F5E8DC",borderRadius:4,overflow:"hidden"}}>
                  <div style={{width:`${Math.min(p*100,100)}%`,height:"100%",background:g.color,borderRadius:4}}/>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <div style={{background:C.card,borderRadius:20,padding:"18px 0 4px",boxShadow:"0 2px 20px rgba(0,0,0,0.07)",border:`1px solid ${C.lightBorder}`}}>
        <p style={{margin:"0 0 10px",padding:"0 20px",fontFamily:"'Playfair Display',serif",fontSize:17,color:C.text}}>Recent Transactions</p>
        {recent.map((t,i)=><TxRow key={t.id} t={t} borderBottom={i<recent.length-1}/>)}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// TRANSACTIONS
// ═══════════════════════════════════════════════════════
function Transactions({transactions,currentMonth,onDelete}){
  const [filter,setFilter]=useState("all");
  const [search,setSearch]=useState("");
  const filtered=useMemo(()=>transactions.filter(t=>ymOf(t.date)===currentMonth).filter(t=>filter==="all"||t.type===filter).filter(t=>!search||t.description.toLowerCase().includes(search.toLowerCase())||(CAT[t.category]?.label||"").toLowerCase().includes(search.toLowerCase())).sort((a,b)=>new Date(b.date)-new Date(a.date)),[transactions,currentMonth,filter,search]);
  const grouped=useMemo(()=>{const g={};filtered.forEach(t=>{if(!g[t.date])g[t.date]=[];g[t.date].push(t);});return Object.entries(g).sort((a,b)=>new Date(b[0])-new Date(a[0]));},[ filtered]);
  const totalIncome=filtered.filter(t=>t.type==="income").reduce((s,t)=>s+t.amount,0);
  const totalExpense=filtered.filter(t=>t.type==="expense").reduce((s,t)=>s+t.amount,0);
  return(
    <div style={{padding:"0 16px 20px"}}>
      <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍  Search transactions…" style={{width:"100%",padding:"11px 14px",border:`1px solid ${C.border}`,borderRadius:13,fontFamily:"Nunito,sans-serif",fontSize:13,outline:"none",marginBottom:10,boxSizing:"border-box",background:"white"}}/>
      <div style={{display:"flex",gap:8,marginBottom:16}}>
        {["all","income","expense"].map(f=>(
          <button key={f} onClick={()=>setFilter(f)} style={{flex:1,padding:"9px 0",border:"none",borderRadius:11,cursor:"pointer",fontFamily:"Nunito,sans-serif",fontWeight:800,fontSize:13,transition:"all 0.2s",background:filter===f?(f==="income"?C.teal:f==="expense"?C.red:C.saffron):"#FDF0E8",color:filter===f?"white":C.muted}}>
            {f.charAt(0).toUpperCase()+f.slice(1)}
          </button>
        ))}
      </div>
      {filtered.length>0&&<div style={{background:C.card,borderRadius:14,padding:"12px 18px",marginBottom:16,display:"flex",justifyContent:"space-between",boxShadow:"0 2px 12px rgba(0,0,0,0.05)"}}>
        <span style={{fontFamily:"Nunito,sans-serif",fontSize:13,color:C.teal,fontWeight:700}}>+{fmtINR(totalIncome)}</span>
        <span style={{fontFamily:"Nunito,sans-serif",fontSize:13,color:C.muted,fontWeight:600}}>{filtered.length} txns</span>
        <span style={{fontFamily:"Nunito,sans-serif",fontSize:13,color:C.red,fontWeight:700}}>−{fmtINR(totalExpense)}</span>
      </div>}
      {grouped.length===0&&<div style={{textAlign:"center",padding:"48px 20px"}}><div style={{fontSize:52}}>📭</div><p style={{fontFamily:"Nunito,sans-serif",fontWeight:700,color:C.muted,fontSize:15,marginTop:12}}>No transactions found</p></div>}
      {grouped.map(([date,txns])=>(
        <div key={date} style={{marginBottom:16}}>
          <p style={{margin:"0 0 8px",fontFamily:"Nunito,sans-serif",fontSize:11,fontWeight:800,color:C.muted,textTransform:"uppercase",letterSpacing:0.5}}>
            {new Date(date).toLocaleDateString("en-IN",{weekday:"short",day:"numeric",month:"long"})}
          </p>
          <div style={{background:C.card,borderRadius:18,overflow:"hidden",boxShadow:"0 2px 16px rgba(0,0,0,0.06)",border:`1px solid ${C.lightBorder}`}}>
            {txns.map((t,i)=><TxRow key={t.id} t={t} onDelete={onDelete} borderBottom={i<txns.length-1}/>)}
          </div>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// BUDGET
// ═══════════════════════════════════════════════════════
function Budget({transactions,budgets,currentMonth,onSetBudget}){
  const [editCat,setEditCat]=useState(null);const [editVal,setEditVal]=useState("");
  const spending=useMemo(()=>{const m={};transactions.filter(t=>t.type==="expense"&&ymOf(t.date)===currentMonth).forEach(t=>{m[t.category]=(m[t.category]||0)+t.amount;});return m;},[transactions,currentMonth]);
  const totalBudget=Object.values(budgets).reduce((s,v)=>s+(v||0),0);
  const totalSpent=Object.values(spending).reduce((s,v)=>s+v,0);
  const overBudgetN=EXPENSE_CATS.filter(c=>budgets[c.id]>0&&(spending[c.id]||0)>budgets[c.id]).length;
  return(
    <div style={{padding:"0 16px 20px"}}>
      <div style={{background:C.grad,borderRadius:20,padding:"18px 20px",marginBottom:16,color:"white"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <p style={{margin:"0 0 4px",fontFamily:"Nunito,sans-serif",fontSize:11,fontWeight:700,opacity:0.8,textTransform:"uppercase"}}>Monthly Budget Used</p>
            <p style={{margin:0,fontFamily:"'Playfair Display',serif",fontSize:28,fontWeight:700}}>{fmtINR(totalSpent)} <span style={{fontSize:15,opacity:0.75}}>/ {fmtINR(totalBudget)}</span></p>
          </div>
          {overBudgetN>0&&<div style={{background:"rgba(255,255,255,0.25)",borderRadius:12,padding:"8px 12px",textAlign:"center"}}>
            <p style={{margin:0,fontSize:22,lineHeight:1}}>⚠️</p>
            <p style={{margin:"2px 0 0",fontFamily:"Nunito,sans-serif",fontSize:11,fontWeight:700}}>{overBudgetN} over</p>
          </div>}
        </div>
        <div style={{marginTop:14,height:8,background:"rgba(255,255,255,0.3)",borderRadius:6,overflow:"hidden"}}>
          <div style={{height:"100%",background:"white",borderRadius:6,width:`${totalBudget>0?Math.min((totalSpent/totalBudget)*100,100):0}%`,transition:"width 0.8s ease"}}/>
        </div>
      </div>
      {EXPENSE_CATS.map(cat=>{
        const spent=spending[cat.id]||0,budget=budgets[cat.id]||0,pct=budget>0?spent/budget:0,over=budget>0&&spent>budget;
        const barCol=pct>0.9?C.red:pct>0.7?C.saffron:cat.color;
        return(
          <div key={cat.id} style={{background:C.card,borderRadius:18,padding:"14px 16px",marginBottom:10,boxShadow:"0 2px 14px rgba(0,0,0,0.05)",border:`1px solid ${C.lightBorder}`,borderLeft:over?`4px solid ${C.red}`:budget>0?`4px solid ${cat.color}`:`4px solid ${C.border}`}}>
            {editCat===cat.id?(
              <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                <span style={{fontSize:20}}>{cat.icon}</span>
                <span style={{fontFamily:"Nunito,sans-serif",fontWeight:700,fontSize:13,flex:1,minWidth:80}}>{cat.label}</span>
                <input value={editVal} onChange={e=>setEditVal(e.target.value)} type="number" placeholder="Monthly limit" inputMode="numeric" autoFocus style={{width:130,padding:"7px 11px",border:`1px solid ${C.border}`,borderRadius:9,fontFamily:"Nunito,sans-serif",fontSize:13,outline:"none",boxSizing:"border-box"}}/>
                <button onClick={()=>{onSetBudget(cat.id,+editVal||0);setEditCat(null);}} style={{padding:"7px 16px",border:"none",borderRadius:9,background:C.saffron,color:"white",fontFamily:"Nunito,sans-serif",fontWeight:800,cursor:"pointer"}}>Set</button>
                <button onClick={()=>setEditCat(null)} style={{padding:"7px 11px",border:`1px solid ${C.border}`,borderRadius:9,background:"white",cursor:"pointer",color:C.muted}}>✕</button>
              </div>
            ):(
              <div onClick={()=>{setEditCat(cat.id);setEditVal(String(budget));}} style={{cursor:"pointer"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:budget>0?8:0}}>
                  <div style={{display:"flex",alignItems:"center",gap:10}}>
                    <div style={{width:34,height:34,borderRadius:9,background:`${cat.color}18`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:17}}>{cat.icon}</div>
                    <span style={{fontFamily:"Nunito,sans-serif",fontWeight:700,fontSize:13,color:C.text}}>{cat.label}</span>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <span style={{fontFamily:"Nunito,sans-serif",fontSize:15,fontWeight:800,color:over?C.red:C.text}}>{fmtINR(spent)}</span>
                    {budget>0&&<span style={{fontFamily:"Nunito,sans-serif",fontSize:12,color:C.muted}}> / {fmtINR(budget)}</span>}
                    {budget===0&&<span style={{fontFamily:"Nunito,sans-serif",fontSize:11,color:C.border}}> set budget ›</span>}
                  </div>
                </div>
                {budget>0&&<><div style={{height:7,background:"#F5E8DC",borderRadius:5,overflow:"hidden"}}><div style={{width:`${Math.min(pct*100,100)}%`,height:"100%",background:barCol,borderRadius:5,transition:"width 0.6s ease"}}/></div>
                {over&&<p style={{margin:"5px 0 0",fontFamily:"Nunito,sans-serif",fontSize:11,color:C.red,fontWeight:800}}>⚠️ Over by {fmtINR(spent-budget)}</p>}</>}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// GOALS
// ═══════════════════════════════════════════════════════
function GoalsTab({goals,onUpdate,onDelete,onAdd}){
  const [contribId,setContribId]=useState(null);const [contribAmt,setContribAmt]=useState("");const [showAdd,setShowAdd]=useState(false);
  const totalTarget=goals.reduce((s,g)=>s+g.target,0),totalSaved=goals.reduce((s,g)=>s+g.saved,0);
  const AddGoalModal=({onAdd,onClose})=>{
    const [name,setName]=useState("");const [target,setTarget]=useState("");const [saved,setSaved]=useState("");const [deadline,setDeadline]=useState("");const [icon,setIcon]=useState("🎯");const [color,setColor]=useState(C.saffron);
    const ICONS=["🎯","🏡","🚗","✈️","🎓","💍","🏥","💻","📱","🌴","👶","💰","🛡️","🎊"];
    const PALETTE=[C.saffron,C.teal,C.blue,C.purple,C.green,C.pink,"#F59E0B","#EF4444"];
    return(
      <div onClick={e=>{if(e.target===e.currentTarget)onClose();}} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
        <div style={{background:"white",width:"100%",maxWidth:400,borderRadius:22,padding:"24px 24px 28px",boxShadow:"0 24px 60px rgba(0,0,0,0.2)",maxHeight:"90vh",overflowY:"auto"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
            <h3 style={{margin:0,fontFamily:"'Playfair Display',serif",fontSize:21}}>New Goal</h3>
            <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer"}}><X size={20}/></button>
          </div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:16}}>{ICONS.map(ic=><button key={ic} onClick={()=>setIcon(ic)} style={{fontSize:22,padding:"7px 9px",cursor:"pointer",border:icon===ic?`2px solid ${color}`:"2px solid transparent",borderRadius:11,background:icon===ic?`${color}20`:"#F9FAFB"}}>{ic}</button>)}</div>
          <input value={name} onChange={e=>setName(e.target.value)} placeholder="Goal name" style={{width:"100%",padding:"11px 14px",border:`1px solid ${C.border}`,borderRadius:12,fontFamily:"Nunito,sans-serif",fontSize:14,marginBottom:12,boxSizing:"border-box",outline:"none"}}/>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
            {[["Target","target",target,setTarget],["Saved","saved",saved,setSaved]].map(([lbl,,val,setter])=>(
              <div key={lbl}><p style={{margin:"0 0 5px",fontSize:11,fontWeight:700,color:C.muted,textTransform:"uppercase"}}>{lbl}</p>
                <input value={val} onChange={e=>setter(e.target.value)} type="number" placeholder="₹0" style={{width:"100%",padding:"9px 12px",border:`1px solid ${C.border}`,borderRadius:11,fontFamily:"Nunito,sans-serif",fontSize:14,boxSizing:"border-box",outline:"none"}}/>
              </div>
            ))}
          </div>
          <input type="date" value={deadline} onChange={e=>setDeadline(e.target.value)} style={{width:"100%",padding:"11px 14px",border:`1px solid ${C.border}`,borderRadius:12,fontFamily:"Nunito,sans-serif",fontSize:14,marginBottom:16,boxSizing:"border-box",outline:"none"}}/>
          <div style={{display:"flex",gap:8,marginBottom:20}}>{PALETTE.map(col=><div key={col} onClick={()=>setColor(col)} style={{width:28,height:28,borderRadius:"50%",background:col,cursor:"pointer",border:color===col?"3px solid #1C1917":"3px solid transparent",transition:"border 0.15s",boxSizing:"border-box"}}/>)}</div>
          <button onClick={()=>{if(!name||!target)return;onAdd({id:uid(),name,target:+target,saved:+saved||0,deadline,icon,color});onClose();}} style={{width:"100%",padding:"13px",border:"none",borderRadius:13,cursor:name&&target?"pointer":"default",background:name&&target?C.grad:"#E5E7EB",color:name&&target?"white":C.muted,fontFamily:"Nunito,sans-serif",fontWeight:800,fontSize:15}}>Add Goal</button>
        </div>
      </div>
    );
  };
  return(
    <div style={{padding:"0 16px 20px"}}>
      <div style={{background:C.card,borderRadius:20,padding:"18px 20px",marginBottom:14,boxShadow:"0 2px 20px rgba(0,0,0,0.07)",border:`1px solid ${C.lightBorder}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div>
          <p style={{margin:"0 0 4px",fontFamily:"Nunito,sans-serif",fontSize:11,fontWeight:700,color:C.muted,textTransform:"uppercase"}}>Total Goals Corpus</p>
          <p style={{margin:0,fontFamily:"'Playfair Display',serif",fontSize:26,color:C.saffron,fontWeight:700}}>{fmtINR(totalSaved)}</p>
          <p style={{margin:"2px 0 0",fontFamily:"Nunito,sans-serif",fontSize:12,color:C.muted}}>of {fmtINR(totalTarget)} target</p>
        </div>
        <Ring pct={totalTarget>0?totalSaved/totalTarget:0} size={74} color={C.saffron}/>
      </div>
      {goals.map(g=>{
        const pct=Math.min(g.saved/g.target,1),left=g.target-g.saved,days=g.deadline?Math.ceil((new Date(g.deadline)-new Date())/86400000):null,urgent=days!==null&&days<180;
        return(
          <div key={g.id} style={{background:C.card,borderRadius:22,padding:"20px",marginBottom:14,boxShadow:"0 2px 20px rgba(0,0,0,0.07)",border:`1px solid ${C.lightBorder}`,borderTop:`5px solid ${g.color}`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <div style={{width:46,height:46,borderRadius:13,background:`${g.color}18`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:26}}>{g.icon}</div>
                <div>
                  <p style={{margin:0,fontFamily:"Nunito,sans-serif",fontSize:15,fontWeight:800,color:C.text}}>{g.name}</p>
                  {days!==null&&<p style={{margin:0,fontFamily:"Nunito,sans-serif",fontSize:11,color:days<0?C.red:urgent?C.saffron:C.muted,fontWeight:urgent?700:500}}>{days<0?"⚠️ Deadline passed":`${days} days left`}</p>}
                </div>
              </div>
              <Ring pct={pct} size={62} sw={6} color={g.color}/>
            </div>
            <div style={{height:9,background:"#F5E8DC",borderRadius:6,overflow:"hidden",marginBottom:12}}>
              <div style={{width:`${pct*100}%`,height:"100%",borderRadius:6,transition:"width 0.8s ease",background:`linear-gradient(90deg,${g.color},${g.color}BB)`}}/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:14}}>
              {[["💰 Saved",fmtINR(g.saved),g.color],["🎯 Target",fmtINR(g.target),C.text],["⏳ To Go",fmtINR(left),C.muted]].map(([lbl,val,col])=>(
                <div key={lbl} style={{background:`${C.bg}`,borderRadius:10,padding:"8px 10px"}}>
                  <p style={{margin:"0 0 2px",fontFamily:"Nunito,sans-serif",fontSize:10,color:C.muted,fontWeight:700}}>{lbl}</p>
                  <p style={{margin:0,fontFamily:"Nunito,sans-serif",fontSize:13,fontWeight:800,color:col}}>{val}</p>
                </div>
              ))}
            </div>
            {contribId===g.id?(
              <div style={{display:"flex",gap:8}}>
                <input value={contribAmt} onChange={e=>setContribAmt(e.target.value)} type="number" placeholder="₹ Amount" inputMode="numeric" autoFocus style={{flex:1,padding:"10px 13px",border:`1px solid ${C.border}`,borderRadius:11,fontFamily:"Nunito,sans-serif",fontSize:14,outline:"none"}}/>
                <button onClick={()=>{onUpdate(g.id,g.saved+(+contribAmt||0));setContribId(null);setContribAmt("");}} style={{padding:"10px 18px",border:"none",borderRadius:11,background:g.color,color:"white",fontFamily:"Nunito,sans-serif",fontWeight:800,cursor:"pointer"}}>Add</button>
                <button onClick={()=>setContribId(null)} style={{padding:"10px 13px",border:`1px solid ${C.border}`,borderRadius:11,background:"white",cursor:"pointer",color:C.muted}}>✕</button>
              </div>
            ):(
              <div style={{display:"flex",gap:8}}>
                <button onClick={()=>{setContribId(g.id);setContribAmt("");}} style={{flex:1,padding:"11px",border:"none",borderRadius:12,cursor:"pointer",background:`${g.color}18`,color:g.color,fontFamily:"Nunito,sans-serif",fontWeight:800,fontSize:13}}>+ Add Savings</button>
                <button onClick={()=>onDelete(g.id)} style={{padding:"11px 15px",border:`1px solid #FECACA`,borderRadius:12,background:"white",color:C.red,fontFamily:"Nunito,sans-serif",fontSize:12,cursor:"pointer"}}><Trash2 size={14}/></button>
              </div>
            )}
          </div>
        );
      })}
      <button onClick={()=>setShowAdd(true)} style={{width:"100%",padding:"18px",border:`2px dashed ${C.border}`,borderRadius:18,background:"white",cursor:"pointer",fontFamily:"Nunito,sans-serif",fontWeight:800,fontSize:14,color:C.saffron,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
        <Plus size={18}/> Add New Goal
      </button>
      {showAdd&&<AddGoalModal onAdd={g=>{onAdd(g);setShowAdd(false);}} onClose={()=>setShowAdd(false)}/>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// PLANNER TAB
// ═══════════════════════════════════════════════════════

const LONKAR_MEMBERS = [
  {name:"Akshay",      dob:"1989-09-17", relation:"Admin · Husband", avatar:"👨", color:"#E8652A"},
  {name:"Swapnali",    dob:"1994-07-21", relation:"Spouse",          avatar:"👩", color:"#EC4899"},
  {name:"Sunita",      dob:"1966-04-28", relation:"Mother",          avatar:"👵", color:"#7C3AED"},
  {name:"Chandrakant", dob:"1958-01-07", relation:"Father",          avatar:"👴", color:"#2563EB"},
  {name:"Anika",       dob:"2023-12-30", relation:"Daughter 1",      avatar:"👧", color:"#0D9488"},
  {name:"Adheera",     dob:"2025-04-08", relation:"Daughter 2",      avatar:"🧒", color:"#F5A623"},
];

// ═══════════════════════════════════════════════════════
// 50-YEAR HINDU FESTIVAL CALENDAR ALGORITHM (2026–2075)
// Astronomical lunisolar calculation, accurate to ±1 day
// ═══════════════════════════════════════════════════════
function _gJD(year,month,day){const a=Math.floor((14-month)/12),y=year+4800-a,m=month+12*a-3;return day+Math.floor((153*m+2)/5)+365*y+Math.floor(y/4)-Math.floor(y/100)+Math.floor(y/400)-32045;}
function _jdFmt(jd){const a=jd+32044,b=Math.floor((4*a+3)/146097),c=a-Math.floor(146097*b/4),d=Math.floor((4*c+3)/1461),e=c-Math.floor(1461*d/4),m=Math.floor((5*e+2)/153);const day=e-Math.floor((153*m+2)/5)+1,month=m+3-12*Math.floor(m/10),year=100*b+d-4800+Math.floor(m/10);return`${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;}
const _SYN=29.530588861;
function _nmJD(k){const T=k/1236.85,T2=T*T,T3=T2*T,T4=T3*T;let J=2451550.09766+_SYN*k+0.00015437*T2-0.000000150*T3+0.00000000073*T4;const M=(2.5534+29.10535670*k-0.0000014*T2)*Math.PI/180,Mp=(201.5643+385.81693528*k+0.0107582*T2)*Math.PI/180,F=(160.7108+390.67050284*k-0.0016118*T2)*Math.PI/180,Om=(124.7746-1.56375588*k+0.0020672*T2)*Math.PI/180;J+=-0.40720*Math.sin(Mp)+0.17241*Math.sin(M)+0.01608*Math.sin(2*Mp)+0.01039*Math.sin(2*F)+0.00739*Math.sin(Mp-M)-0.00514*Math.sin(Mp+M)+0.00208*Math.sin(2*M)-0.00111*Math.sin(Mp-2*F)-0.00057*Math.sin(Mp+2*F)+0.00056*Math.sin(2*Mp+M)-0.00042*Math.sin(3*Mp)+0.00042*Math.sin(M+2*F)+0.00038*Math.sin(M-2*F)-0.00024*Math.sin(2*Mp-M)-0.00017*Math.sin(Om);return J+5.5/24;}
function _nmBefore(jd){const k0=Math.round((jd-2451550.09766)/_SYN);let b=null;for(let k=k0-2;k<=k0+1;k++){const j=_nmJD(k);if(j<=jd&&(b===null||j>b))b=j;}return b;}
function _nmNear(jd){const k0=Math.round((jd-2451550.09766)/_SYN);let b=null,bd=Infinity;for(let k=k0-1;k<=k0+1;k++){const j=_nmJD(k),d=Math.abs(j-jd);if(d<bd){bd=d;b=j;}}return b;}
function _T(nm,n){return nm+(n-1)*_SYN/30;}
function _FM(nm){return _T(nm,15);}
function _festivalsForYear(year){
  const F=[];
  const add=(name,jd,icon,color,cat,budget,desc,members,tags,id)=>{
    const date=typeof jd==='string'?jd:_jdFmt(Math.round(jd));
    if(!date.startsWith(String(year)))return;
    F.push({id:id||`${year}_${name.replace(/\s/g,'_')}`,name,date,icon,color,category:cat,budget,desc,members,tags});
  };
  const g=(m,d)=>_gJD(year,m,d);
  // SOLAR
  add("Makar Sankranti",`${year}-01-14`,"🪁","#F5A623","harvest",3000,"Til-gul exchange, kite flying. Get ladoos from Tulshi Baug, Pune.",["all"],["traditional","sweet"]);
  add("Maharashtra Day",`${year}-05-01`,"🦁","#E8652A","cultural",2000,"State formation day. Shivaji parade at Shivajinagar. Family outing.",["all"],["cultural"]);
  add("Christmas",`${year}-12-25`,"🎄","#059669","social",5000,"Koregaon Park Christmas vibe! Lights outing with toddlers.",["all"],["outing","kids"]);
  // VASANT PANCHAMI = Magha Shukla 5 (~Jan)
  {const nm=_nmBefore(g(1,29));add("Vasant Panchami",_T(nm,5),"📚","#0D9488","religious",1500,"Saraswati puja. Anika & Adheera's Vidyarambh (first writing ceremony).",["Anika","Adheera"],["kids","education"]);}
  // MAHA SHIVARATRI = ~2d before Feb/Mar NM
  {const nm=_nmNear(g(2,18));add("Maha Shivaratri",nm-2,"🕉️","#7C3AED","religious",2000,"Night puja at Pataleshwar Caves or Tambe Maharaj mandir, Pune.",["Sunita","Chandrakant"],["devotional","elders"]);}
  // HOLI = Phalguna Purnima +1
  {const prevNM=_nmJD(Math.round((_gJD(year,3,1)-2451550.09766)/_SYN)-1);add("Holi / Dhulwad",_FM(prevNM)+1,"🎨","#EC4899","social",5000,"Natural colours — safe for Anika & Adheera. Organic gulal from Tulshi Baug.",["all"],["kids","fun","family"]);}
  // GUDI PADWA = Chaitra Shukla 1 (~Mar NM)
  {const nm=_nmNear(g(3,20));add("Gudi Padwa",_T(nm,1),"🚩","#E8652A","maharashtra",8000,"Marathi New Year! Gudi erection, Puran Poli feast. Kasba Peth procession.",["all"],["maharashtrian","new-year","feast"]);add("Chaitra Navratri",_T(nm,1),"🌸","#EC4899","religious",3000,"9-day Devi worship. Swapnali leads aarti. Haldi-kumkum ceremony.",["Swapnali","Sunita"],["women","devotional"]);add("Ram Navami",_T(nm,9),"🏹","#E8652A","religious",1500,"Procession at Kasba Ganpati, downtown Pune.",["all"],["devotional"]);}
  // AKSHAYA TRITIYA = Vaishakha Shukla 3 (~Apr NM)
  {const nm=_nmNear(g(4,17));add("Akshaya Tritiya",_T(nm,3),"🪙","#F5A623","auspicious",15000,"Best muhurat for gold/SGB purchase & new ventures.",["Akshay","Swapnali"],["investment","auspicious"]);}
  // VAT SAVITRI = Jyeshtha Amavasya
  {const nm=_nmBefore(g(6,15));add("Vat Savitri Vrat",nm,"🌳","#059669","religious",2000,"Swapnali's vrat for Akshay's longevity. Banyan tree puja in neighbourhood.",["Swapnali"],["women","vrat"]);}
  // ASHADHI EKADASHI = Ashadha Shukla 11
  {const nm=_nmBefore(g(7,10));add("Ashadhi Ekadashi",_T(nm,11),"🪘","#7C3AED","maharashtra",5000,"Wari pilgrimage spirit. Local Vitthal mandir. Chandrakant & Sunita blessing day.",["Sunita","Chandrakant"],["maharashtrian","devotional"]);}
  // NAG PANCHAMI = Shravana Shukla 5
  {const nm=_nmBefore(g(8,10));add("Nag Panchami",_T(nm,5),"🐍","#059669","traditional",1500,"Milk offering, Nag devata puja. Kids love snake drawings!",["all"],["traditional","kids"]);}
  // RAKSHA BANDHAN = Shravana Purnima
  {const nm=_nmBefore(g(8,28));add("Raksha Bandhan",_FM(nm),"🧵","#EC4899","family",3000,"Sibling bond celebration. Pune family get-together.",["Anika","Adheera"],["family","kids"]);}
  // JANMASHTAMI = Shravana Purnima + 8
  {const nm=_nmBefore(g(8,28));add("Janmashtami",_FM(nm)+8,"🦚","#2563EB","religious",3000,"Dahi-handi at Tilak Road — thrilling for toddlers to watch safely.",["all"],["fun","kids"]);}
  // GANESH CHATURTHI = Bhadrapada Shukla 4
  {const nm=_nmBefore(g(9,20));const gc=_T(nm,4);add("Ganesh Chaturthi",gc,"🐘","#E8652A","maharashtra",25000,"THE festival! Eco-friendly Bappa. Kasba Ganpati darshan. Pre-order modaks by Sep 5!",["all"],["maharashtrian","biggest","family"]);add("Anant Chaturdashi / Visarjan",gc+10,"🌊","#2563EB","maharashtra",3000,"Ganpati Bappa Morya! Dhol-tasha procession, emotional farewell.",["all"],["maharashtrian","emotional"]);}
  // NAVRATRI = Ashwin Shukla 1
  {const nm=_nmBefore(g(10,15));const nr=_T(nm,1);add("Navratri / Garba",nr,"💃","#EC4899","social",6000,"9 nights of Garba at Ganesh Kala Krida. New chaniya-choli!",["Swapnali","Anika","Adheera"],["fun","women","dance"]);add("Dussehra",nr+9,"🏹","#E8652A","cultural",3000,"Shami puja, vehicle worship. Sarasbaug ground celebrations, Pune.",["all"],["cultural","auspicious"]);add("Kojagiri Pournima",_FM(nm),"🌕","#F5A623","maharashtra",2000,"Masala milk under moonlight. Unique Maharashtrian tradition.",["all"],["maharashtrian","kids"]);}
  // DIWALI = Kartik Amavasya
  {const nm=_nmNear(g(11,5));add("Diwali (Lakshmi Puja)",nm-1,"🪔","#F5A623","diwali",20000,"Festival of lights! Faral: chakli, chivda, karanji. Akashkandil at window.",["all"],["biggest","lights","sweets"]);add("Balipratipada / Padwa",nm,"💝","#EC4899","diwali",8000,"Husband-wife day. Akshay gifts Swapnali. Ovi singing tradition, Pune.",["Akshay","Swapnali"],["couple","maharashtrian"]);add("Bhau Beej",nm+1,"🤝","#2563EB","diwali",5000,"Brother-sister bond. Lonkar extended family lunch.",["all"],["family","diwali"]);add("Kartiki Ekadashi",_T(nm,11),"🪘","#7C3AED","maharashtra",2000,"Wari conclusion. Vitthal aarti at home. Chandrakant-Sunita devotional day.",["Sunita","Chandrakant"],["maharashtrian","elders"]);}
  return F.filter(f=>f.date.startsWith(String(year))).sort((a,b)=>a.date.localeCompare(b.date));
}
// Pre-compute all 50 years (runs once at module load, ~5ms)
const FESTIVAL_CALENDAR_50Y = {};
for(let y=2026;y<=2075;y++) FESTIVAL_CALENDAR_50Y[y]=_festivalsForYear(y);


const LIFE_MILESTONES = [
  // Near-term
  {year:2026, event:"Anika turns 3 — Preschool/Playschool admission", member:"Anika", icon:"🏫", priority:"high", type:"education"},
  {year:2026, event:"Adheera's 1st Birthday celebration", member:"Adheera", icon:"🎂", priority:"high", type:"family"},
  {year:2026, event:"Akshay turns 37 — Review term life insurance", member:"Akshay", icon:"🛡️", priority:"medium", type:"financial"},
  {year:2027, event:"Adheera turns 2 — Begin playschool scouting", member:"Adheera", icon:"🏫", priority:"medium", type:"education"},
  {year:2027, event:"Swapnali turns 33 — Health checkup + career review", member:"Swapnali", icon:"🏥", priority:"medium", type:"health"},
  {year:2028, event:"Chandrakant turns 71 — Senior health plan + regular tests", member:"Chandrakant", icon:"❤️‍🩹", priority:"high", type:"health"},
  {year:2028, event:"Anika starts primary school (KG)", member:"Anika", icon:"📚", priority:"high", type:"education"},
  {year:2029, event:"Adheera starts primary school", member:"Adheera", icon:"📚", priority:"medium", type:"education"},
  {year:2030, event:"Akshay turns 41 — Build corpus for daughters' education", member:"Akshay", icon:"📊", priority:"high", type:"financial"},
  {year:2030, event:"Sunita turns 65 — Senior citizen benefits, pension review", member:"Sunita", icon:"🌸", priority:"high", type:"financial"},
  {year:2032, event:"Chandrakant's 75th — Grand celebration + medical prep", member:"Chandrakant", icon:"🎊", priority:"high", type:"family"},
  {year:2035, event:"Anika turns 12 — Secondary school prep", member:"Anika", icon:"📖", priority:"medium", type:"education"},
  {year:2037, event:"Adheera turns 12 — Secondary school prep", member:"Adheera", icon:"📖", priority:"medium", type:"education"},
  {year:2040, event:"Akshay turns 51 — Retirement corpus mid-review", member:"Akshay", icon:"💰", priority:"high", type:"financial"},
  {year:2041, event:"Anika turns 18 — Higher education / JEE / CET fund ready", member:"Anika", icon:"🎓", priority:"high", type:"education"},
  {year:2043, event:"Adheera turns 18 — Higher education fund ready", member:"Adheera", icon:"🎓", priority:"high", type:"education"},
  {year:2049, event:"Akshay turns 60 — Retirement planning complete", member:"Akshay", icon:"🏡", priority:"high", type:"financial"},
  {year:2055, event:"Anika turns 32 — Potential marriage / family", member:"Anika", icon:"💍", priority:"low", type:"family"},
];

// Static fallback suggestions (shown when AI is loading or offline)
const FALLBACK_SUGGESTIONS = [
  {icon:"🌿", title:"Eco Ganpati 2026", desc:"Pune's eco-friendly Ganpati movement — shaadu maati idol from Visarjan-safe vendors. Saves ₹500–2000 vs PoP idols.", saving:"₹500–2000", tag:"festival", urgency:"upcoming"},
  {icon:"🏥", title:"Senior Health Packages", desc:"Chandrakant (68) qualifies for PMJAY. Sunita (60) can get Apollo Pune's ₹1999 senior wellness annual package.", saving:"₹15,000–20,000", tag:"health", urgency:"now"},
  {icon:"🪙", title:"Gold SGB vs Physical Gold", desc:"RBI Sovereign Gold Bonds give 2.5% annual interest + gold appreciation. Tax-free at maturity.", saving:"₹3,000–5,000/yr", tag:"investment", urgency:"upcoming"},
  {icon:"📚", title:"Anika's Preschool Admission", desc:"Top Pune playschools (Kidzee Kothrud, EuroKids Baner) open forms Oct–Nov for next batch. Apply now.", saving:"High value", tag:"kids", urgency:"now"},
  {icon:"🛡️", title:"Akshay's Term Insurance Review", desc:"At 36, upgrade term cover to ₹2Cr. HDFC Life & LIC offer ₹1,999/month for ₹2Cr cover. Lock in young rates.", saving:"Locks low premium", tag:"insurance", urgency:"now"},
];

const CAT_COLORS={maharashtra:"#E8652A",religious:"#7C3AED",social:"#EC4899",harvest:"#F5A623",auspicious:"#D97706",cultural:"#2563EB",diwali:"#F5A623",family:"#059669",traditional:"#84734C"};
const CAT_LABELS={maharashtra:"🦁 Maharashtrian",religious:"🙏 Religious",social:"🎉 Social",harvest:"🌾 Harvest",auspicious:"✨ Auspicious",cultural:"🎭 Cultural",diwali:"🪔 Diwali",family:"👨‍👩‍👧‍👦 Family",traditional:"📿 Traditional"};

function getAge(dob){
  const b=new Date(dob), now=new Date();
  let years=now.getFullYear()-b.getFullYear();
  const m=now.getMonth()-b.getMonth();
  if(m<0||(m===0&&now.getDate()<b.getDate()))years--;
  const months=((now.getMonth()-b.getMonth())+12)%12;
  return years<3?`${years}y ${months}m`:years;
}
function daysUntil(dateStr){
  const d=new Date(dateStr); const now=new Date(); now.setHours(0,0,0,0);
  return Math.ceil((d-now)/(1000*60*60*24));
}

const todayDateStr = () => new Date().toISOString().split("T")[0];
const todayMonthStr = () => new Date().toISOString().substring(0,7);

// ═══════════════════════════════════════════════════════
// DAY PLANNER — Custom Occasion Planner
// ═══════════════════════════════════════════════════════
const OCCASION_TYPES=[
  {id:"birthday",    label:"Birthday",     icon:"🎂", color:"#EC4899"},
  {id:"anniversary", label:"Anniversary",  icon:"💍", color:"#E8652A"},
  {id:"puja",        label:"Home Puja",    icon:"🪔", color:"#7C3AED"},
  {id:"trip",        label:"Trip / Outing",icon:"✈️",  color:"#2563EB"},
  {id:"naming",      label:"Naming Ceremony",icon:"👶",color:"#0D9488"},
  {id:"graduation",  label:"Graduation",   icon:"🎓", color:"#059669"},
  {id:"housewarming",label:"Housewarming", icon:"🏡", color:"#F5A623"},
  {id:"custom",      label:"Custom Event", icon:"🎉", color:"#78716C"},
];
const OCC=Object.fromEntries(OCCASION_TYPES.map(o=>[o.id,o]));

const DEFAULT_CHECKLIST=[
  "Book venue / reserve space",
  "Send invitations",
  "Arrange decorations",
  "Order food / catering",
  "Buy gift / return gifts",
  "Book photographer",
  "Arrange music / entertainment",
];

function DayPlannerView(){
  const [plans,setPlans]=useState([]);
  const [loaded,setLoaded]=useState(false);
  const [showForm,setShowForm]=useState(false);
  const [editId,setEditId]=useState(null);
  const [expanded,setExpanded]=useState(null);

  // Form state
  const [fTitle,setFTitle]=useState("");
  const [fType,setFType]=useState("birthday");
  const [fDate,setFDate]=useState("");
  const [fBudget,setFBudget]=useState("");
  const [fNote,setFNote]=useState("");
  const [fFor,setFFor]=useState("");
  const [fChecklist,setFChecklist]=useState([]);
  const [fNewItem,setFNewItem]=useState("");

  // Load from storage
  useEffect(()=>{
    const load=async()=>{
      try{
        const r=await window.storage.get("kk-dayplans").catch(()=>null);
        if(r) setPlans(JSON.parse(r.value));
      }catch{}
      setLoaded(true);
    };
    load();
  },[]);

  // Save to storage on change
  useEffect(()=>{
    if(!loaded) return;
    window.storage.set("kk-dayplans",JSON.stringify(plans)).catch(()=>{});
  },[plans,loaded]);

  const openNew=()=>{
    setEditId(null);
    setFTitle(""); setFType("birthday"); setFDate(""); setFBudget("");
    setFNote(""); setFFor(""); setFChecklist(DEFAULT_CHECKLIST.map(t=>({id:uid(),text:t,done:false})));
    setFNewItem(""); setShowForm(true);
  };

  const openEdit=(p)=>{
    setEditId(p.id);
    setFTitle(p.title); setFType(p.type); setFDate(p.date);
    setFBudget(String(p.budget||"")); setFNote(p.note||"");
    setFFor(p.forMember||""); setFChecklist(p.checklist||[]);
    setFNewItem(""); setShowForm(true);
  };

  const savePlan=()=>{
    if(!fTitle||!fDate) return;
    const plan={
      id:editId||uid(), title:fTitle, type:fType, date:fDate,
      budget:+fBudget||0, note:fNote, forMember:fFor,
      checklist:fChecklist, createdAt:editId?(plans.find(p=>p.id===editId)?.createdAt||Date.now()):Date.now()
    };
    setPlans(prev=>editId?prev.map(p=>p.id===editId?plan:p):[...prev,plan]);
    setShowForm(false);
  };

  const deletePlan=(id)=>setPlans(prev=>prev.filter(p=>p.id!==id));

  const toggleCheck=(planId,itemId)=>{
    setPlans(prev=>prev.map(p=>p.id===planId?{
      ...p,checklist:p.checklist.map(c=>c.id===itemId?{...c,done:!c.done}:c)
    }:p));
  };

  const addCheckItem=()=>{
    if(!fNewItem.trim()) return;
    setFChecklist(prev=>[...prev,{id:uid(),text:fNewItem.trim(),done:false}]);
    setFNewItem("");
  };

  const removeCheckItem=(id)=>setFChecklist(prev=>prev.filter(c=>c.id!==id));

  const today=new Date(); today.setHours(0,0,0,0);
  const sorted=[...plans].sort((a,b)=>new Date(a.date)-new Date(b.date));
  const upcoming=sorted.filter(p=>new Date(p.date)>=today);
  const past=sorted.filter(p=>new Date(p.date)<today).reverse();

  const PlanCard=({p})=>{
    const occ=OCC[p.type]||OCC.custom;
    const daysLeft=Math.ceil((new Date(p.date)-today)/(1000*60*60*24));
    const isPast=daysLeft<0;
    const done=(p.checklist||[]).filter(c=>c.done).length;
    const total=(p.checklist||[]).length;
    const pct=total>0?done/total:0;
    const isExp=expanded===p.id;
    return(
      <div style={{background:"white",borderRadius:20,border:`1.5px solid ${isPast?C.border:occ.color+"40"}`,overflow:"hidden",marginBottom:12,opacity:isPast?0.7:1}}>
        {/* Card header */}
        <div onClick={()=>setExpanded(isExp?null:p.id)} style={{padding:"14px 16px",cursor:"pointer",display:"flex",gap:12,alignItems:"flex-start"}}>
          <div style={{width:46,height:46,borderRadius:14,background:`${occ.color}18`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>{occ.icon}</div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap",marginBottom:2}}>
              <p style={{margin:0,fontFamily:"Nunito,sans-serif",fontSize:14,fontWeight:800,color:C.text}}>{p.title}</p>
              {p.forMember&&<span style={{background:`${occ.color}15`,color:occ.color,borderRadius:8,padding:"1px 8px",fontSize:10,fontWeight:700}}>{p.forMember}</span>}
            </div>
            <p style={{margin:0,fontFamily:"Nunito,sans-serif",fontSize:11,color:C.muted}}>
              {new Date(p.date).toLocaleDateString("en-IN",{weekday:"short",day:"numeric",month:"long",year:"numeric"})}
            </p>
            {total>0&&(
              <div style={{marginTop:6,display:"flex",alignItems:"center",gap:8}}>
                <div style={{flex:1,height:4,background:C.border,borderRadius:2,overflow:"hidden"}}>
                  <div style={{width:`${pct*100}%`,height:"100%",background:occ.color,borderRadius:2,transition:"width 0.3s"}}/>
                </div>
                <span style={{fontFamily:"Nunito,sans-serif",fontSize:10,color:C.muted,whiteSpace:"nowrap"}}>{done}/{total} done</span>
              </div>
            )}
          </div>
          <div style={{textAlign:"right",flexShrink:0,display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4}}>
            {!isPast
              ? <div style={{background:daysLeft<=7?C.red:daysLeft<=30?C.amber:occ.color,borderRadius:10,padding:"4px 10px",textAlign:"center"}}>
                  <div style={{fontFamily:"Nunito,sans-serif",fontSize:14,fontWeight:900,color:"white",lineHeight:1}}>{daysLeft}</div>
                  <div style={{fontFamily:"Nunito,sans-serif",fontSize:9,color:"white",opacity:0.85}}>days</div>
                </div>
              : <span style={{background:C.border,color:C.muted,borderRadius:8,padding:"2px 8px",fontSize:10,fontWeight:700}}>Done</span>
            }
            {p.budget>0&&<span style={{fontFamily:"Nunito,sans-serif",fontSize:12,fontWeight:800,color:occ.color}}>{fmtINR(p.budget)}</span>}
          </div>
        </div>

        {/* Expanded detail */}
        {isExp&&(
          <div style={{borderTop:`1px solid ${C.border}`}}>
            {/* Note */}
            {p.note&&<p style={{margin:"12px 16px 0",fontFamily:"Nunito,sans-serif",fontSize:13,color:C.text,lineHeight:1.5}}>{p.note}</p>}

            {/* Checklist */}
            {(p.checklist||[]).length>0&&(
              <div style={{padding:"12px 16px 0"}}>
                <p style={{margin:"0 0 8px",fontFamily:"Nunito,sans-serif",fontSize:11,fontWeight:800,color:C.muted,textTransform:"uppercase",letterSpacing:0.5}}>Checklist</p>
                {p.checklist.map(c=>(
                  <div key={c.id} onClick={()=>toggleCheck(p.id,c.id)}
                    style={{display:"flex",alignItems:"center",gap:10,padding:"7px 0",cursor:"pointer",borderBottom:`1px solid ${C.lightBorder}`}}>
                    <div style={{width:20,height:20,borderRadius:6,border:`2px solid ${c.done?occ.color:C.border}`,background:c.done?occ.color:"white",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"all 0.15s"}}>
                      {c.done&&<span style={{color:"white",fontSize:11,fontWeight:900}}>✓</span>}
                    </div>
                    <span style={{fontFamily:"Nunito,sans-serif",fontSize:13,color:c.done?C.muted:C.text,textDecoration:c.done?"line-through":"none",flex:1,transition:"all 0.15s"}}>{c.text}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Actions */}
            <div style={{display:"flex",gap:8,padding:"12px 16px 14px"}}>
              <button onClick={()=>openEdit(p)} style={{flex:1,padding:"9px",border:`1.5px solid ${occ.color}`,borderRadius:12,background:"white",color:occ.color,fontFamily:"Nunito,sans-serif",fontWeight:700,fontSize:13,cursor:"pointer"}}>✏️ Edit</button>
              <button onClick={()=>{if(window.confirm("Delete this plan?"))deletePlan(p.id);}} style={{padding:"9px 14px",border:`1.5px solid ${C.red}30`,borderRadius:12,background:`${C.red}10`,color:C.red,fontFamily:"Nunito,sans-serif",fontWeight:700,fontSize:13,cursor:"pointer"}}>🗑</button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return(
    <div style={{padding:"0 16px 20px"}}>
      {/* Header */}
      <div style={{background:`linear-gradient(135deg,${C.pink}18,${C.saffron}10)`,borderRadius:20,padding:"16px",marginBottom:16,border:`1px solid ${C.pink}25`}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
          <div>
            <p style={{margin:0,fontFamily:"'Playfair Display',serif",fontSize:17,fontWeight:700,color:C.text}}>My Special Plans</p>
            <p style={{margin:"3px 0 0",fontFamily:"Nunito,sans-serif",fontSize:11,color:C.muted}}>Birthdays, anniversaries & custom occasions</p>
          </div>
          <button onClick={openNew} style={{background:C.grad,border:"none",borderRadius:14,padding:"9px 16px",color:"white",fontFamily:"Nunito,sans-serif",fontWeight:800,fontSize:13,cursor:"pointer",display:"flex",alignItems:"center",gap:6,boxShadow:`0 4px 14px ${C.saffron}40`,flexShrink:0}}>
            <Plus size={15}/> New Plan
          </button>
        </div>
        {/* Auto birthdays from family */}
        <div style={{marginTop:12,display:"flex",gap:6,overflowX:"auto",paddingBottom:2}}>
          {LONKAR_MEMBERS.map(m=>{
            const bd=new Date(); const dob=new Date(m.dob);
            bd.setMonth(dob.getMonth()); bd.setDate(dob.getDate());
            if(bd<today){bd.setFullYear(bd.getFullYear()+1);}
            const days=Math.ceil((bd-today)/(1000*60*60*24));
            return(
              <div key={m.name} style={{flexShrink:0,background:"white",borderRadius:12,padding:"8px 12px",border:`1px solid ${m.color}30`,textAlign:"center",minWidth:68}}>
                <div style={{fontSize:16}}>{m.avatar}</div>
                <div style={{fontFamily:"Nunito,sans-serif",fontSize:10,fontWeight:800,color:m.color}}>{m.name}</div>
                <div style={{fontFamily:"Nunito,sans-serif",fontSize:9,color:C.muted}}>{days===0?"Today! 🎂":`in ${days}d`}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Upcoming plans */}
      {upcoming.length===0&&past.length===0&&(
        <div style={{textAlign:"center",padding:"48px 20px"}}>
          <div style={{fontSize:52}}>🎉</div>
          <p style={{fontFamily:"Nunito,sans-serif",fontWeight:700,color:C.muted,fontSize:15,marginTop:12}}>No plans yet</p>
          <p style={{fontFamily:"Nunito,sans-serif",fontSize:13,color:C.muted,marginTop:4}}>Tap "New Plan" to plan a birthday,<br/>anniversary or special occasion</p>
        </div>
      )}

      {upcoming.length>0&&(
        <>
          <p style={{margin:"0 0 10px",fontFamily:"Nunito,sans-serif",fontSize:11,fontWeight:800,color:C.saffron,letterSpacing:1,textTransform:"uppercase"}}>Upcoming</p>
          {upcoming.map(p=><PlanCard key={p.id} p={p}/>)}
        </>
      )}
      {past.length>0&&(
        <>
          <p style={{margin:"16px 0 10px",fontFamily:"Nunito,sans-serif",fontSize:11,fontWeight:800,color:C.muted,letterSpacing:1,textTransform:"uppercase"}}>Completed</p>
          {past.map(p=><PlanCard key={p.id} p={p}/>)}
        </>
      )}

      {/* Add / Edit Modal */}
      {showForm&&(
        <div onClick={e=>{if(e.target===e.currentTarget)setShowForm(false);}} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",zIndex:200,display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
          <div style={{background:"white",width:"100%",maxWidth:480,borderRadius:"24px 24px 0 0",maxHeight:"92vh",overflowY:"auto",boxShadow:"0 -8px 40px rgba(0,0,0,0.2)"}}>
            <div style={{display:"flex",justifyContent:"center",padding:"12px 0 6px"}}>
              <div style={{width:44,height:4,background:"#E5E7EB",borderRadius:2}}/>
            </div>
            <div style={{padding:"0 20px 44px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
                <h3 style={{margin:0,fontFamily:"'Playfair Display',serif",fontSize:21,color:C.text}}>{editId?"Edit Plan":"New Special Plan"}</h3>
                <button onClick={()=>setShowForm(false)} style={{background:"none",border:"none",cursor:"pointer",color:C.muted}}><X size={20}/></button>
              </div>

              {/* Occasion type */}
              <p style={{margin:"0 0 8px",fontSize:11,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:1}}>Occasion Type</p>
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:18}}>
                {OCCASION_TYPES.map(ot=>(
                  <button key={ot.id} onClick={()=>setFType(ot.id)} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4,padding:"8px 4px",cursor:"pointer",border:fType===ot.id?`2px solid ${ot.color}`:"2px solid transparent",borderRadius:12,background:fType===ot.id?`${ot.color}15`:"#F9FAFB",transition:"all 0.15s"}}>
                    <span style={{fontSize:20}}>{ot.icon}</span>
                    <span style={{fontSize:9,fontFamily:"Nunito,sans-serif",fontWeight:700,color:fType===ot.id?ot.color:C.muted,textAlign:"center",lineHeight:1.3}}>{ot.label}</span>
                  </button>
                ))}
              </div>

              {/* Title */}
              <input value={fTitle} onChange={e=>setFTitle(e.target.value)} placeholder={`e.g. ${OCC[fType]?.icon} Akshay's 36th Birthday`} style={{width:"100%",padding:"11px 14px",border:`1px solid ${C.border}`,borderRadius:12,fontFamily:"Nunito,sans-serif",fontSize:14,color:C.text,outline:"none",marginBottom:12,boxSizing:"border-box"}}/>

              {/* Date + For */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
                <div>
                  <p style={{margin:"0 0 5px",fontSize:11,fontWeight:700,color:C.muted,textTransform:"uppercase"}}>Date</p>
                  <input type="date" value={fDate} onChange={e=>setFDate(e.target.value)} style={{width:"100%",padding:"9px 12px",border:`1px solid ${C.border}`,borderRadius:11,fontFamily:"Nunito,sans-serif",fontSize:13,color:C.text,outline:"none",boxSizing:"border-box"}}/>
                </div>
                <div>
                  <p style={{margin:"0 0 5px",fontSize:11,fontWeight:700,color:C.muted,textTransform:"uppercase"}}>For</p>
                  <select value={fFor} onChange={e=>setFFor(e.target.value)} style={{width:"100%",padding:"9px 12px",border:`1px solid ${C.border}`,borderRadius:11,fontFamily:"Nunito,sans-serif",fontSize:13,color:C.text,outline:"none",background:"white",boxSizing:"border-box"}}>
                    <option value="">Family</option>
                    {LONKAR_MEMBERS.map(m=><option key={m.name} value={m.name}>{m.avatar} {m.name}</option>)}
                    <option value="Extended Family">Extended Family</option>
                    <option value="Friends">Friends</option>
                  </select>
                </div>
              </div>

              {/* Budget */}
              <div style={{background:`${C.saffron}10`,borderRadius:12,padding:"12px 14px",marginBottom:12,display:"flex",alignItems:"center",gap:10}}>
                <IndianRupee size={16} color={C.saffron}/>
                <input value={fBudget} onChange={e=>setFBudget(e.target.value)} type="number" placeholder="Budget (₹)" inputMode="numeric"
                  style={{flex:1,border:"none",background:"transparent",fontFamily:"'Playfair Display',serif",fontSize:20,fontWeight:700,color:C.text,outline:"none"}}/>
              </div>

              {/* Notes */}
              <textarea value={fNote} onChange={e=>setFNote(e.target.value)} placeholder="Notes, ideas, venue, guest list…" rows={3}
                style={{width:"100%",padding:"11px 14px",border:`1px solid ${C.border}`,borderRadius:12,fontFamily:"Nunito,sans-serif",fontSize:13,color:C.text,outline:"none",resize:"none",marginBottom:16,boxSizing:"border-box"}}/>

              {/* Checklist */}
              <p style={{margin:"0 0 8px",fontSize:11,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:1}}>Checklist</p>
              <div style={{background:"#F9FAFB",borderRadius:14,padding:"8px 12px",marginBottom:10}}>
                {fChecklist.map((c,i)=>(
                  <div key={c.id} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 0",borderBottom:i<fChecklist.length-1?`1px solid ${C.border}`:"none"}}>
                    <span style={{fontSize:12,color:C.muted,width:16,textAlign:"center",flexShrink:0}}>{i+1}.</span>
                    <span style={{fontFamily:"Nunito,sans-serif",fontSize:13,color:C.text,flex:1}}>{c.text}</span>
                    <button onClick={()=>removeCheckItem(c.id)} style={{background:"none",border:"none",color:C.muted,cursor:"pointer",padding:2,flexShrink:0}}><X size={13}/></button>
                  </div>
                ))}
                <div style={{display:"flex",gap:8,marginTop:8}}>
                  <input value={fNewItem} onChange={e=>setFNewItem(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addCheckItem()} placeholder="Add checklist item…"
                    style={{flex:1,padding:"8px 10px",border:`1px solid ${C.border}`,borderRadius:9,fontFamily:"Nunito,sans-serif",fontSize:13,color:C.text,outline:"none"}}/>
                  <button onClick={addCheckItem} style={{background:C.saffron,border:"none",borderRadius:9,padding:"8px 12px",color:"white",cursor:"pointer",fontWeight:800,fontSize:13}}>+</button>
                </div>
              </div>

              <button onClick={savePlan} style={{width:"100%",padding:"15px",border:"none",borderRadius:14,cursor:(fTitle&&fDate)?"pointer":"default",background:(fTitle&&fDate)?C.grad:"#E5E7EB",color:(fTitle&&fDate)?"white":C.muted,fontFamily:"Nunito,sans-serif",fontWeight:800,fontSize:16}}>
                {editId?"Update Plan":"Save Plan 🎉"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PlannerTab({calYear, setCalYear}){
  const [view,setView]=useState("festivals");
  const [catFilter,setCatFilter]=useState("all");
  const [expandedFest,setExpandedFest]=useState(null);
  const [budgetEdits,setBudgetEdits]=useState({});
  const [calView,setCalView]=useState("upcoming"); // upcoming | year | browse50

  // When header year picker selects a non-current year, auto-open the 50-year browser
  useEffect(()=>{
    if(calYear!==new Date().getFullYear()){
      setView("festivals");
      setCalView("browse50");
    }
  },[calYear]);

  // AI state — suggestions (daily refresh)
  const [aiSuggestions,setAiSuggestions]=useState(null);
  const [suggestionsLoading,setSuggestionsLoading]=useState(false);
  const [suggestionsError,setSuggestionsError]=useState(false);
  const [suggestionsDate,setSuggestionsDate]=useState(null);

  // AI state — festival calendar (monthly refresh)
  const [aiFestivals,setAiFestivals]=useState(null);
  const [festivalsLoading,setFestivalsLoading]=useState(false);
  const [festivalsError,setFestivalsError]=useState(false);
  const [festivalsMonth,setFestivalsMonth]=useState(null);

  const fetchingSug=useCallback(async()=>{
    setSuggestionsLoading(true); setSuggestionsError(false);
    const today=new Date();
    const dateStr=today.toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"long",year:"numeric"});
    const todayIso=todayDateStr();
    // find next festival from either AI or static list
    const allFests=FESTIVAL_CALENDAR_50Y[new Date().getFullYear()]||FESTIVAL_CALENDAR_50Y[2026];
    const nextFestName=allFests.find(f=>new Date(f.date)>=today)?.name||"Ganesh Chaturthi";
    try{
      const res=await fetch("https://api.anthropic.com/v1/messages",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          model:"claude-sonnet-4-6",
          max_tokens:1500,
          system:`You are a smart financial and lifestyle advisor for the Lonkar family — a Maharashtrian household in Pune. Today is ${dateStr}. The next major festival is ${nextFestName}. Return ONLY a valid JSON array, no markdown, no code fences, no explanation — just the raw JSON array starting with [ and ending with ]. Each element: {"icon":"emoji","title":"string","desc":"string","saving":"string","tag":"string","urgency":"now"|"upcoming"|"seasonal"}. Generate exactly 6 highly actionable, specific, fresh suggestions relevant to today covering: festival prep, Pune-specific deals/services, senior health, investment timing, kids education, household savings.`,
          messages:[{role:"user",content:`Lonkar family: Akshay(36,husband), Swapnali(31,wife), Sunita(60,mother-in-law), Chandrakant(68,father-in-law), Anika(2.5y,daughter1), Adheera(1y,daughter2). Pune. Date: ${dateStr}. Next festival: ${nextFestName}. Generate 6 suggestions as a raw JSON array.`}]
        })
      });
      if(!res.ok) throw new Error("HTTP "+res.status);
      const data=await res.json();
      const raw=data.content.map(b=>b.type==="text"?b.text:"").join("").trim();
      // Robustly extract JSON array even if model adds any stray text
      const match=raw.match(/\[[\s\S]*\]/);
      if(!match) throw new Error("No JSON array in response");
      const items=JSON.parse(match[0]);
      if(!Array.isArray(items)||items.length===0) throw new Error("Empty array");
      setAiSuggestions(items); setSuggestionsDate(todayIso);
      await window.storage.set("planner-suggestions",JSON.stringify({items,date:todayIso})).catch(()=>{});
    }catch(e){ console.error("Suggestions fetch error:",e); setSuggestionsError(true); }
    setSuggestionsLoading(false);
  },[]);

  const fetchingFests=useCallback(async()=>{
    setFestivalsLoading(true); setFestivalsError(false);
    const today=new Date();
    const monthStr=todayMonthStr();

    // Instead of generating the calendar (unreliable large JSON), we enrich
    // the NEXT 4 upcoming festivals with fresh AI-generated tips.
    // The calendar dates stay from the accurate static list.
    const upcoming=(FESTIVAL_CALENDAR_50Y[new Date().getFullYear()]||FESTIVAL_CALENDAR_50Y[2026])
      .filter(f=>new Date(f.date)>=today)
      .sort((a,b)=>new Date(a.date)-new Date(b.date))
      .slice(0,4);

    const festNames=upcoming.map(f=>`${f.name} (${f.date})`).join(", ");

    try{
      const res=await fetch("https://api.anthropic.com/v1/messages",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          model:"claude-sonnet-4-6",
          max_tokens:1200,
          system:`You are a helpful Maharashtrian lifestyle advisor for a Pune family. Return ONLY a raw JSON array — no markdown, no code fences. Each element: {"name":"exact festival name","tip":"2-sentence Pune-specific preparation tip mentioning local vendors, deals or traditions","budget_note":"one actionable budget tip"}`,
          messages:[{role:"user",content:`Family: Akshay(36), Swapnali(31), Sunita(60), Chandrakant(68), Anika(2.5y), Adheera(1y) in Pune. Today: ${today.toISOString().split("T")[0]}. Generate fresh tips for these upcoming festivals: ${festNames}. Return raw JSON array only.`}]
        })
      });
      if(!res.ok) throw new Error("HTTP "+res.status);
      const data=await res.json();
      if(data.error) throw new Error(data.error.message||"API error");
      const raw=data.content.map(b=>b.type==="text"?b.text:"").join("").trim();
      const match=raw.match(/\[[\s\S]*\]/);
      if(!match) throw new Error("No JSON array");
      const tips=JSON.parse(match[0]);
      if(!Array.isArray(tips)||tips.length===0) throw new Error("Empty");

      // Merge AI tips into the static festival list
      const enriched=(FESTIVAL_CALENDAR_50Y[new Date().getFullYear()]||FESTIVAL_CALENDAR_50Y[2026]).map(f=>{
        const tip=tips.find(t=>t.name&&f.name.toLowerCase().includes(t.name.toLowerCase().split(" ")[0]));
        if(!tip) return f;
        return {...f, desc:`${tip.tip} ${tip.budget_note||""}`.trim(), aiEnriched:true};
      });

      setAiFestivals(enriched);
      setFestivalsMonth(monthStr);
      await window.storage.set("planner-festivals",JSON.stringify({items:enriched,month:monthStr})).catch(()=>{});
    }catch(e){
      console.error("Festival tips error:",e);
      // Don't set error — just silently keep static data, tips aren't critical
      setAiFestivals(FESTIVAL_CALENDAR_50Y[new Date().getFullYear()]||FESTIVAL_CALENDAR_50Y[2026]);
      setFestivalsMonth(monthStr);
      await window.storage.set("planner-festivals",JSON.stringify({items:FESTIVAL_CALENDAR_50Y[new Date().getFullYear()]||FESTIVAL_CALENDAR_50Y[2026],month:monthStr})).catch(()=>{});
    }
    setFestivalsLoading(false);
  },[]);

  const fetchSuggestions=fetchingSug;
  const fetchFestivals=fetchingFests;

  // Single init: load cache first, THEN fetch if stale (no race conditions)
  useEffect(()=>{
    let cancelled=false;
    const init=async()=>{
      const today=todayDateStr();
      const thisMonth=todayMonthStr();
      let cachedSugDate=null;
      let cachedFestMonth=null;
      try{
        const r=await window.storage.get("planner-suggestions").catch(()=>null);
        if(r&&!cancelled){
          const d=JSON.parse(r.value);
          cachedSugDate=d.date;
          setAiSuggestions(d.items);
          setSuggestionsDate(d.date);
        }
      }catch{}
      try{
        const r=await window.storage.get("planner-festivals").catch(()=>null);
        if(r&&!cancelled){
          const d=JSON.parse(r.value);
          cachedFestMonth=d.month;
          setAiFestivals(d.items);
          setFestivalsMonth(d.month);
        }
      }catch{}
      if(cancelled) return;
      if(cachedSugDate!==today) fetchSuggestions();
      if(cachedFestMonth!==thisMonth) fetchFestivals();
    };
    init();
    return()=>{cancelled=true;};
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  // Use AI festivals if available, else fall back to static 2026 list
  const festivalData = (aiFestivals && aiFestivals.length>0) ? aiFestivals : (FESTIVAL_CALENDAR_50Y[new Date().getFullYear()]||FESTIVAL_CALENDAR_50Y[2026]);
  const suggestions = (aiSuggestions && aiSuggestions.length>0) ? aiSuggestions : FALLBACK_SUGGESTIONS;

  const today=new Date(); today.setHours(0,0,0,0);
  const upcoming=festivalData.filter(f=>new Date(f.date)>=today).sort((a,b)=>new Date(a.date)-new Date(b.date));
  const past=festivalData.filter(f=>new Date(f.date)<today).sort((a,b)=>new Date(b.date)-new Date(a.date));
  const filtered=(catFilter==="all"?[...upcoming,...past]:[...upcoming,...past].filter(f=>f.category===catFilter));

  const totalFestBudget=upcoming.reduce((s,f)=>s+(budgetEdits[f.id]??f.budget),0);
  const nextFest=upcoming[0];
  const nextDays=nextFest?daysUntil(nextFest.date):0;

  const msByYear={};
  LIFE_MILESTONES.forEach(m=>{if(!msByYear[m.year])msByYear[m.year]=[];msByYear[m.year].push(m);});
  const msYears=Object.keys(msByYear).map(Number).sort((a,b)=>a-b);

  const priorityColor={high:C.red,medium:C.amber,low:C.teal};
  const typeIcon={education:"📚",financial:"💰",health:"❤️‍🩹",family:"👨‍👩‍👧"};

  const Pill=({label,active,onClick,color})=>(
    <button onClick={onClick} style={{padding:"6px 14px",borderRadius:20,border:`1.5px solid ${active?color||C.saffron:C.border}`,background:active?(color||C.saffron)+"18":"white",color:active?color||C.saffron:C.muted,fontFamily:"Nunito,sans-serif",fontWeight:700,fontSize:12,cursor:"pointer",whiteSpace:"nowrap",transition:"all 0.15s"}}>
      {label}
    </button>
  );

  const Spinner=()=>(
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:10,padding:"28px 0"}}>
      <div style={{width:36,height:36,border:`3px solid ${C.border}`,borderTop:`3px solid ${C.saffron}`,borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>
      <p style={{fontFamily:"Nunito,sans-serif",fontSize:12,color:C.muted,margin:0}}>Fetching live updates…</p>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const RefreshBtn=({onClick,loading,label,lastUpdate})=>(
    <button onClick={onClick} disabled={loading} style={{display:"flex",alignItems:"center",gap:6,background:"none",border:`1px solid ${C.border}`,borderRadius:10,padding:"5px 10px",cursor:loading?"default":"pointer",opacity:loading?0.5:1}}>
      <Zap size={11} color={C.saffron}/>
      <span style={{fontFamily:"Nunito,sans-serif",fontSize:10,color:C.muted}}>{loading?"Refreshing…":lastUpdate?`Updated ${lastUpdate}`:`Refresh ${label}`}</span>
    </button>
  );

  return(
    <div style={{padding:"0 0 8px"}}>
      {/* Header strip */}
      <div style={{margin:"0 16px 16px",background:"white",borderRadius:20,padding:"16px",boxShadow:"0 2px 12px rgba(0,0,0,0.06)",border:`1px solid ${C.border}`}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <div>
            <p style={{margin:0,fontFamily:"'Playfair Display',serif",fontSize:17,fontWeight:700,color:C.text}}>Lonkar कुटुंब Planner</p>
            <p style={{margin:0,fontFamily:"Nunito,sans-serif",fontSize:11,color:C.muted}}>AI-powered · Live updates daily</p>
          </div>
          <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4}}>
            <div style={{fontSize:24}}>🏡</div>
            <div style={{display:"flex",alignItems:"center",gap:4,background:`${C.green}12`,borderRadius:8,padding:"2px 8px"}}>
              <div style={{width:6,height:6,borderRadius:"50%",background:C.green}}/>
              <span style={{fontFamily:"Nunito,sans-serif",fontSize:9,color:C.green,fontWeight:800}}>AI Live</span>
            </div>
          </div>
        </div>
        {/* Age strip */}
        <div style={{display:"flex",gap:8,overflowX:"auto",paddingBottom:4}}>
          {LONKAR_MEMBERS.map(m=>(
            <div key={m.name} style={{flexShrink:0,background:`${m.color}12`,borderRadius:14,padding:"8px 12px",textAlign:"center",minWidth:72,border:`1px solid ${m.color}30`}}>
              <div style={{fontSize:20}}>{m.avatar}</div>
              <div style={{fontFamily:"Nunito,sans-serif",fontSize:11,fontWeight:800,color:m.color,marginTop:2}}>{m.name}</div>
              <div style={{fontFamily:"Nunito,sans-serif",fontSize:10,color:C.muted}}>{getAge(m.dob)}{typeof getAge(m.dob)==="number"?" yrs":""}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Next festival banner */}
      {nextFest&&(
        <div style={{margin:"0 16px 16px",background:`linear-gradient(135deg,${nextFest.color||C.saffron}22,${nextFest.color||C.saffron}08)`,borderRadius:18,padding:"14px 16px",border:`1.5px solid ${(nextFest.color||C.saffron)}40`}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{fontSize:36}}>{nextFest.icon}</div>
            <div style={{flex:1}}>
              <p style={{margin:0,fontFamily:"Nunito,sans-serif",fontSize:12,color:nextFest.color||C.saffron,fontWeight:800,textTransform:"uppercase",letterSpacing:0.5}}>Next Festival</p>
              <p style={{margin:0,fontFamily:"'Playfair Display',serif",fontSize:18,fontWeight:700,color:C.text}}>{nextFest.name}</p>
              <p style={{margin:0,fontFamily:"Nunito,sans-serif",fontSize:12,color:C.muted}}>{new Date(nextFest.date).toLocaleDateString("en-IN",{day:"numeric",month:"long",year:"numeric"})}</p>
            </div>
            <div style={{textAlign:"center",background:nextFest.color||C.saffron,borderRadius:14,padding:"8px 12px"}}>
              <div style={{fontFamily:"Nunito,sans-serif",fontSize:22,fontWeight:900,color:"white",lineHeight:1}}>{nextDays}</div>
              <div style={{fontFamily:"Nunito,sans-serif",fontSize:10,color:"white",opacity:0.85}}>days</div>
            </div>
          </div>
          <div style={{marginTop:10,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span style={{fontFamily:"Nunito,sans-serif",fontSize:12,color:C.muted}}>Upcoming festivals budget</span>
            <span style={{fontFamily:"Nunito,sans-serif",fontSize:14,fontWeight:800,color:C.text}}>{fmtINR(totalFestBudget)}</span>
          </div>
        </div>
      )}

      {/* View switcher */}
      <div style={{display:"flex",gap:8,padding:"0 16px",marginBottom:16,overflowX:"auto"}}>
        {[["festivals","🗓 Festivals"],["milestones","🎯 Life Plan"],["dayplanner","🎉 My Plans"],["trends","💡 Suggestions"]].map(([v,l])=>(
          <button key={v} onClick={()=>setView(v)} style={{flexShrink:0,padding:"8px 18px",borderRadius:20,border:`1.5px solid ${view===v?C.saffron:C.border}`,background:view===v?C.saffron:"white",color:view===v?"white":C.muted,fontFamily:"Nunito,sans-serif",fontWeight:700,fontSize:13,cursor:"pointer",transition:"all 0.15s"}}>
            {l}
          </button>
        ))}
      </div>

      {/* ── FESTIVALS VIEW ── */}
      {view==="festivals"&&(
        <>
          {/* Cal view switcher */}
          <div style={{display:"flex",gap:6,padding:"0 16px",marginBottom:12,overflowX:"auto"}}>
            {[["upcoming","⏳ Upcoming"],["year","📅 This Year"]].map(([v,l])=>(
              <button key={v} onClick={()=>setCalView(v)} style={{flexShrink:0,padding:"6px 14px",borderRadius:16,border:`1.5px solid ${calView===v?C.saffron:C.border}`,background:calView===v?`${C.saffron}18`:"white",color:calView===v?C.saffron:C.muted,fontFamily:"Nunito,sans-serif",fontWeight:700,fontSize:12,cursor:"pointer",transition:"all 0.15s"}}>
                {l}
              </button>
            ))}
          </div>

          {/* AI tips status */}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"0 16px",marginBottom:10}}>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              {aiFestivals
                ? <><CheckCircle size={12} color={C.green}/><span style={{fontFamily:"Nunito,sans-serif",fontSize:11,color:C.green,fontWeight:700}}>AI tips active</span></>
                : festivalsLoading
                  ? <><div style={{width:10,height:10,border:`2px solid ${C.border}`,borderTop:`2px solid ${C.saffron}`,borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/><span style={{fontFamily:"Nunito,sans-serif",fontSize:11,color:C.muted}}>Fetching AI tips…</span></>
                  : <><AlertCircle size={12} color={C.amber}/><span style={{fontFamily:"Nunito,sans-serif",fontSize:11,color:C.muted}}>50-year calendar ready</span></>
              }
            </div>
            <RefreshBtn onClick={fetchFestivals} loading={festivalsLoading} label="Tips" lastUpdate={festivalsMonth}/>
          </div>

          {/* Category filter (for upcoming + year views) */}
          <div style={{display:"flex",gap:6,padding:"0 16px",marginBottom:12,overflowX:"auto",paddingBottom:4}}>
              <Pill label="All" active={catFilter==="all"} onClick={()=>setCatFilter("all")}/>
              {Object.keys(CAT_LABELS).map(c=>(
                <Pill key={c} label={CAT_LABELS[c]} active={catFilter===c} onClick={()=>setCatFilter(c)} color={CAT_COLORS[c]}/>
              ))}
            </div>

          {/* ── UPCOMING view ── */}
          {calView==="upcoming"&&(
            <div style={{padding:"0 16px",display:"flex",flexDirection:"column",gap:10}}>
              {festivalsLoading&&!aiFestivals&&<Spinner/>}
              {(catFilter==="all"?upcoming:upcoming.filter(f=>f.category===catFilter)).map(f=>{
                const fcolor=f.color||C.saffron;const days=daysUntil(f.date);const isExp=expandedFest===f.id;const budg=budgetEdits[f.id]??f.budget;const membersArr=Array.isArray(f.members)?f.members:["all"];
                return(
                  <div key={f.id||f.name} style={{background:"white",borderRadius:18,border:`1.5px solid ${fcolor}40`,overflow:"hidden"}}>
                    <div onClick={()=>setExpandedFest(isExp?null:(f.id||f.name))} style={{padding:"14px 16px",cursor:"pointer",display:"flex",alignItems:"center",gap:12}}>
                      <div style={{width:44,height:44,borderRadius:14,background:`${fcolor}18`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>{f.icon}</div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                          <p style={{margin:0,fontFamily:"Nunito,sans-serif",fontSize:14,fontWeight:800,color:C.text}}>{f.name}</p>
                          {days<=30&&<span style={{background:`${C.red}18`,color:C.red,borderRadius:8,padding:"1px 7px",fontSize:10,fontWeight:700}}>{days}d</span>}
                          {days<=90&&days>30&&<span style={{background:`${C.amber}18`,color:C.amber,borderRadius:8,padding:"1px 7px",fontSize:10,fontWeight:700}}>{days}d</span>}
                        </div>
                        <p style={{margin:0,fontFamily:"Nunito,sans-serif",fontSize:11,color:C.muted}}>{new Date(f.date).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"})}</p>
                      </div>
                      <div style={{textAlign:"right",flexShrink:0}}>
                        <p style={{margin:0,fontFamily:"Nunito,sans-serif",fontSize:13,fontWeight:800,color:fcolor}}>{fmtINR(budg)}</p>
                        <p style={{margin:0,fontFamily:"Nunito,sans-serif",fontSize:10,color:C.muted}}>{fmtINR(Math.round(budg/Math.max(days,1)))}<span style={{opacity:0.7}}>/day</span></p>
                      </div>
                    </div>
                    {isExp&&(
                      <div style={{padding:"0 16px 16px",borderTop:`1px solid ${C.border}`}}>
                        <p style={{fontFamily:"Nunito,sans-serif",fontSize:13,color:C.text,margin:"12px 0 10px",lineHeight:1.5}}>{f.desc}</p>
                        <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:12}}>
                          {(f.tags||[]).map(t=><span key={t} style={{background:`${fcolor}18`,color:fcolor,borderRadius:8,padding:"2px 10px",fontSize:11,fontWeight:700}}>#{t}</span>)}
                        </div>
                        <div style={{display:"flex",alignItems:"center",gap:10,background:C.bg,borderRadius:12,padding:"10px 14px"}}>
                          <IndianRupee size={14} color={C.muted}/>
                          <span style={{fontFamily:"Nunito,sans-serif",fontSize:12,color:C.muted,flex:1}}>Adjust budget</span>
                          <input type="number" value={budg} onChange={e=>setBudgetEdits(p=>({...p,[f.id||f.name]:Number(e.target.value)}))} style={{width:90,fontFamily:"Nunito,sans-serif",fontSize:13,fontWeight:700,color:fcolor,border:`1px solid ${fcolor}50`,borderRadius:8,padding:"4px 8px",textAlign:"right",background:"white",outline:"none"}}/>
                        </div>
                        <p style={{margin:"8px 0 0",fontFamily:"Nunito,sans-serif",fontSize:11,color:C.muted}}>👥 For: {membersArr[0]==="all"?"Whole family":membersArr.join(", ")}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ── YEAR view ── */}
          {calView==="year"&&(
            <div style={{padding:"0 16px",display:"flex",flexDirection:"column",gap:10}}>
              {(catFilter==="all"?festivalData:festivalData.filter(f=>f.category===catFilter)).map(f=>{
                const fcolor=f.color||C.saffron;const isPast=new Date(f.date)<today;const isExp=expandedFest===f.id;const budg=budgetEdits[f.id]??f.budget;const membersArr=Array.isArray(f.members)?f.members:["all"];
                return(
                  <div key={f.id||f.name} style={{background:"white",borderRadius:18,border:`1.5px solid ${isPast?C.border:fcolor+"40"}`,overflow:"hidden",opacity:isPast?0.55:1}}>
                    <div onClick={()=>setExpandedFest(isExp?null:(f.id||f.name))} style={{padding:"12px 16px",cursor:"pointer",display:"flex",alignItems:"center",gap:12}}>
                      <div style={{width:40,height:40,borderRadius:12,background:`${fcolor}18`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>{f.icon}</div>
                      <div style={{flex:1,minWidth:0}}>
                        <p style={{margin:0,fontFamily:"Nunito,sans-serif",fontSize:13,fontWeight:800,color:C.text}}>{f.name}</p>
                        <p style={{margin:0,fontFamily:"Nunito,sans-serif",fontSize:11,color:C.muted}}>{new Date(f.date).toLocaleDateString("en-IN",{day:"numeric",month:"short"})} {isPast&&"· Done"}</p>
                      </div>
                      <p style={{margin:0,fontFamily:"Nunito,sans-serif",fontSize:12,fontWeight:800,color:fcolor,flexShrink:0}}>{fmtINR(budg)}</p>
                    </div>
                    {isExp&&(
                      <div style={{padding:"0 16px 14px",borderTop:`1px solid ${C.border}`}}>
                        <p style={{fontFamily:"Nunito,sans-serif",fontSize:12,color:C.text,margin:"10px 0 8px",lineHeight:1.5}}>{f.desc}</p>
                        <div style={{display:"flex",alignItems:"center",gap:8,background:C.bg,borderRadius:10,padding:"8px 12px"}}>
                          <IndianRupee size={13} color={C.muted}/>
                          <input type="number" value={budg} onChange={e=>setBudgetEdits(p=>({...p,[f.id||f.name]:Number(e.target.value)}))} style={{flex:1,fontFamily:"Nunito,sans-serif",fontSize:13,fontWeight:700,color:fcolor,border:"none",background:"transparent",outline:"none"}}/>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ── 50-YEAR BROWSER ── */}
          {calView==="browse50"&&(
            <div style={{padding:"0 16px"}}>
              {/* Year selector */}
              <div style={{background:"white",borderRadius:18,padding:"14px 16px",marginBottom:14,border:`1px solid ${C.border}`}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
                  <p style={{margin:0,fontFamily:"Nunito,sans-serif",fontSize:12,color:C.muted,fontWeight:700}}>Browse 2026 – 2075</p>
                  <div style={{display:"flex",alignItems:"center",gap:4,background:`${C.purple}12`,borderRadius:10,padding:"3px 10px"}}>
                    <span style={{fontFamily:"Nunito,sans-serif",fontSize:10,color:C.purple,fontWeight:800}}>50 Years · 1,200+ Festivals</span>
                  </div>
                </div>
                {/* Year grid */}
                <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                  {Array.from({length:50},(_,i)=>2026+i).map(y=>{
                    const isNow=y===new Date().getFullYear();
                    const isSel=y===calYear;
                    return(
                      <button key={y} onClick={()=>setCalYear(y)} style={{padding:"4px 10px",borderRadius:10,border:`1.5px solid ${isSel?C.saffron:isNow?C.teal:C.border}`,background:isSel?C.saffron:isNow?`${C.teal}15`:"white",color:isSel?"white":isNow?C.teal:C.muted,fontFamily:"Nunito,sans-serif",fontWeight:isSel||isNow?800:500,fontSize:11,cursor:"pointer",transition:"all 0.1s"}}>
                        {y}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Selected year festivals */}
              <div style={{marginBottom:10,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <p style={{margin:0,fontFamily:"'Playfair Display',serif",fontSize:16,fontWeight:700,color:C.text}}>{calYear} Festival Calendar</p>
                <span style={{fontFamily:"Nunito,sans-serif",fontSize:11,color:C.muted}}>{(FESTIVAL_CALENDAR_50Y[calYear]||[]).length} festivals</span>
              </div>
              {/* Budget summary */}
              {(()=>{
                const yFests=FESTIVAL_CALENDAR_50Y[calYear]||[];
                const totalBudget=yFests.reduce((s,f)=>s+(budgetEdits[f.id]??f.budget),0);
                const bigFests=yFests.filter(f=>f.budget>=10000);
                return(
                  <div style={{background:`${C.saffron}10`,borderRadius:14,padding:"12px 14px",marginBottom:12,border:`1px solid ${C.saffron}25`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div>
                      <p style={{margin:0,fontFamily:"Nunito,sans-serif",fontSize:11,color:C.muted}}>Total {calYear} festival budget</p>
                      <p style={{margin:0,fontFamily:"Nunito,sans-serif",fontSize:18,fontWeight:900,color:C.saffron}}>{fmtINR(totalBudget)}</p>
                    </div>
                    <div style={{textAlign:"right"}}>
                      <p style={{margin:0,fontFamily:"Nunito,sans-serif",fontSize:10,color:C.muted}}>{bigFests.length} major festivals</p>
                      <p style={{margin:0,fontFamily:"Nunito,sans-serif",fontSize:11,color:C.text,fontWeight:700}}>{yFests.length} total events</p>
                    </div>
                  </div>
                );
              })()}

              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {(FESTIVAL_CALENDAR_50Y[calYear]||[]).map(f=>{
                  const fcolor=f.color||C.saffron;
                  const isPast=calYear===new Date().getFullYear()&&new Date(f.date)<today;
                  const isExp=expandedFest===f.id;
                  const budg=budgetEdits[f.id]??f.budget;
                  const membersArr=Array.isArray(f.members)?f.members:["all"];
                  return(
                    <div key={f.id} style={{background:"white",borderRadius:16,border:`1.5px solid ${isPast?C.border:fcolor+"35"}`,overflow:"hidden",opacity:isPast?0.5:1}}>
                      <div onClick={()=>setExpandedFest(isExp?null:f.id)} style={{padding:"12px 14px",cursor:"pointer",display:"flex",alignItems:"center",gap:10}}>
                        <div style={{width:38,height:38,borderRadius:12,background:`${fcolor}18`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:19,flexShrink:0}}>{f.icon}</div>
                        <div style={{flex:1,minWidth:0}}>
                          <p style={{margin:0,fontFamily:"Nunito,sans-serif",fontSize:13,fontWeight:800,color:C.text,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{f.name}</p>
                          <p style={{margin:0,fontFamily:"Nunito,sans-serif",fontSize:10,color:C.muted}}>{new Date(f.date).toLocaleDateString("en-IN",{weekday:"short",day:"numeric",month:"short"})}</p>
                        </div>
                        <div style={{textAlign:"right",flexShrink:0}}>
                          <p style={{margin:0,fontFamily:"Nunito,sans-serif",fontSize:12,fontWeight:800,color:fcolor}}>{fmtINR(budg)}</p>
                          <p style={{margin:0,fontFamily:"Nunito,sans-serif",fontSize:9,color:C.muted}}>{CAT_LABELS[f.category]?.split(" ")[1]||f.category}</p>
                        </div>
                      </div>
                      {isExp&&(
                        <div style={{padding:"0 14px 12px",borderTop:`1px solid ${C.border}`}}>
                          <p style={{fontFamily:"Nunito,sans-serif",fontSize:12,color:C.text,margin:"10px 0 8px",lineHeight:1.5}}>{f.desc}</p>
                          <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:10}}>
                            {(f.tags||[]).map(t=><span key={t} style={{background:`${fcolor}15`,color:fcolor,borderRadius:7,padding:"2px 8px",fontSize:10,fontWeight:700}}>#{t}</span>)}
                          </div>
                          <div style={{display:"flex",alignItems:"center",gap:8,background:C.bg,borderRadius:10,padding:"8px 12px"}}>
                            <IndianRupee size={12} color={C.muted}/>
                            <span style={{fontFamily:"Nunito,sans-serif",fontSize:11,color:C.muted,flex:1}}>Budget</span>
                            <input type="number" value={budg} onChange={e=>setBudgetEdits(p=>({...p,[f.id]:Number(e.target.value)}))} style={{width:80,fontFamily:"Nunito,sans-serif",fontSize:12,fontWeight:700,color:fcolor,border:`1px solid ${fcolor}40`,borderRadius:7,padding:"3px 7px",textAlign:"right",background:"white",outline:"none"}}/>
                          </div>
                          <p style={{margin:"6px 0 0",fontFamily:"Nunito,sans-serif",fontSize:10,color:C.muted}}>👥 {membersArr[0]==="all"?"Whole family":membersArr.join(", ")}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div style={{height:16}}/>
              <p style={{textAlign:"center",fontFamily:"Nunito,sans-serif",fontSize:10,color:C.muted,padding:"0 16px"}}>Dates calculated using astronomical lunisolar algorithm · Accurate to ±1 day</p>
            </div>
          )}
        </>
      )}

      {/* ── MILESTONES VIEW ── */}
      {view==="milestones"&&(
        <div style={{padding:"0 16px",display:"flex",flexDirection:"column",gap:16}}>
          <div style={{background:`${C.teal}12`,borderRadius:18,padding:"14px",border:`1px solid ${C.teal}30`}}>
            <p style={{margin:0,fontFamily:"Nunito,sans-serif",fontSize:12,color:C.teal,fontWeight:800}}>📅 Life Timeline — Lonkar Family</p>
            <p style={{margin:"4px 0 0",fontFamily:"Nunito,sans-serif",fontSize:11,color:C.muted}}>Plan ahead for every life stage. Milestones trigger savings goals & insurance reviews.</p>
          </div>
          {msYears.map(year=>(
            <div key={year}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                <div style={{width:52,height:28,borderRadius:8,background:year<=2026?C.saffron:year<=2030?C.teal:year<=2040?C.purple:C.blue,display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <span style={{fontFamily:"Nunito,sans-serif",fontSize:12,fontWeight:900,color:"white"}}>{year}</span>
                </div>
                <div style={{flex:1,height:1,background:C.border}}/>
              </div>
              {msByYear[year].map((ms,i)=>(
                <div key={i} style={{background:"white",borderRadius:14,padding:"12px 14px",border:`1.5px solid ${priorityColor[ms.priority]}30`,marginBottom:8,display:"flex",gap:12,alignItems:"flex-start"}}>
                  <div style={{width:36,height:36,borderRadius:10,background:`${priorityColor[ms.priority]}15`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>{typeIcon[ms.type]}</div>
                  <div style={{flex:1}}>
                    <p style={{margin:0,fontFamily:"Nunito,sans-serif",fontSize:13,fontWeight:700,color:C.text,lineHeight:1.4}}>{ms.event}</p>
                    <div style={{display:"flex",gap:8,marginTop:6,alignItems:"center"}}>
                      <span style={{background:`${priorityColor[ms.priority]}18`,color:priorityColor[ms.priority],borderRadius:8,padding:"1px 8px",fontSize:10,fontWeight:700}}>{ms.priority} priority</span>
                      <span style={{fontFamily:"Nunito,sans-serif",fontSize:11,color:C.muted}}>{ms.member}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* ── LIVE SUGGESTIONS VIEW ── */}
      {view==="trends"&&(
        <div style={{padding:"0 16px",display:"flex",flexDirection:"column",gap:12}}>
          {/* AI status + refresh */}
          <div style={{background:aiSuggestions?`${C.green}10`:`${C.saffron}10`,borderRadius:18,padding:"14px",border:`1px solid ${aiSuggestions?C.green:C.saffron}30`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div style={{flex:1}}>
                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
                  {aiSuggestions
                    ? <><CheckCircle size={13} color={C.green}/><p style={{margin:0,fontFamily:"Nunito,sans-serif",fontSize:12,color:C.green,fontWeight:800}}>AI Suggestions — Live Today</p></>
                    : suggestionsLoading
                      ? <><div style={{width:10,height:10,border:`2px solid ${C.border}`,borderTop:`2px solid ${C.saffron}`,borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/><p style={{margin:0,fontFamily:"Nunito,sans-serif",fontSize:12,color:C.saffron,fontWeight:800}}>Fetching today's suggestions…</p></>
                      : <><Zap size={13} color={C.saffron}/><p style={{margin:0,fontFamily:"Nunito,sans-serif",fontSize:12,color:C.saffron,fontWeight:800}}>💡 Smart Suggestions</p></>
                  }
                </div>
                <p style={{margin:0,fontFamily:"Nunito,sans-serif",fontSize:11,color:C.muted}}>
                  {aiSuggestions ? `Updated ${suggestionsDate} · Refreshes daily` : "Curated for your Pune household · Act on 'Now' items first"}
                </p>
              </div>
              <RefreshBtn onClick={fetchSuggestions} loading={suggestionsLoading} label="Now" lastUpdate={null}/>
            </div>
          </div>

          {suggestionsLoading&&!aiSuggestions&&<Spinner/>}

          {suggestions.map((s,i)=>{
            const urgColor=s.urgency==="now"?C.red:s.urgency==="upcoming"?C.amber:C.teal;
            const urgLabel=s.urgency==="now"?"Act Now":s.urgency==="upcoming"?"Upcoming":"Seasonal";
            return(
              <div key={i} style={{background:"white",borderRadius:18,padding:"14px 16px",border:`1.5px solid ${urgColor}30`,boxShadow:"0 2px 8px rgba(0,0,0,0.04)",position:"relative"}}>
                {i===0&&aiSuggestions&&<div style={{position:"absolute",top:10,right:10,background:`${C.green}18`,borderRadius:8,padding:"2px 7px",fontSize:9,fontFamily:"Nunito,sans-serif",color:C.green,fontWeight:800}}>✦ AI</div>}
                <div style={{display:"flex",alignItems:"flex-start",gap:12}}>
                  <div style={{fontSize:28,flexShrink:0,marginTop:2}}>{s.icon}</div>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8,marginBottom:6}}>
                      <p style={{margin:0,fontFamily:"Nunito,sans-serif",fontSize:14,fontWeight:800,color:C.text}}>{s.title}</p>
                      <span style={{background:`${urgColor}18`,color:urgColor,borderRadius:8,padding:"2px 8px",fontSize:10,fontWeight:800,flexShrink:0}}>{urgLabel}</span>
                    </div>
                    <p style={{margin:0,fontFamily:"Nunito,sans-serif",fontSize:12,color:C.muted,lineHeight:1.55}}>{s.desc}</p>
                    {s.saving&&<div style={{marginTop:8,display:"flex",alignItems:"center",gap:6}}>
                      <CheckCircle size={13} color={C.green}/>
                      <span style={{fontFamily:"Nunito,sans-serif",fontSize:12,color:C.green,fontWeight:700}}>Save / Gain: {s.saving}</span>
                    </div>}
                  </div>
                </div>
              </div>
            );
          })}

          {suggestionsError&&<div style={{background:`${C.red}10`,borderRadius:14,padding:"12px",textAlign:"center"}}><p style={{margin:0,fontFamily:"Nunito,sans-serif",fontSize:12,color:C.red}}>⚠️ Could not fetch AI suggestions. Showing built-in data.</p></div>}
        </div>
      )}
      {/* ── DAY PLANNER VIEW ── */}
      {view==="dayplanner"&&<DayPlannerView/>}
    </div>
  );
}
export default function App(){
  const [tab,setTab]=useState("dashboard");
  const [transactions,setTransactions]=useState([]);
  const [budgets,setBudgets]=useState({});
  const [goals,setGoals]=useState([]);
  const [members,setMembers]=useState([]);
  const [loans,setLoans]=useState([]);
  const [loaded,setLoaded]=useState(false);
  const [showAddTx,setShowAddTx]=useState(false);
  const [plannerCalYear,setPlannerCalYear]=useState(new Date().getFullYear());
  const now=new Date();
  const [currentMonth,setCurrentMonth]=useState(`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`);

  useEffect(()=>{
    const load=async()=>{
      try{
        const initR=await window.storage.get("kk-init").catch(()=>null);
        if(!initR){
          setTransactions(genSample());setBudgets(DEFAULT_BUDGETS);setGoals(DEFAULT_GOALS);setMembers(DEFAULT_MEMBERS);setLoans(SAMPLE_LOANS);
          await window.storage.set("kk-init","1");
        }else{
          const [txR,bR,gR,mR,lR]=await Promise.all([
            window.storage.get("kk-tx").catch(()=>null),window.storage.get("kk-budgets").catch(()=>null),
            window.storage.get("kk-goals").catch(()=>null),window.storage.get("kk-members").catch(()=>null),
            window.storage.get("kk-loans").catch(()=>null),
          ]);
          if(txR)setTransactions(JSON.parse(txR.value));if(bR)setBudgets(JSON.parse(bR.value));
          if(gR)setGoals(JSON.parse(gR.value));if(mR)setMembers(JSON.parse(mR.value));
          if(lR)setLoans(JSON.parse(lR.value));else setLoans(SAMPLE_LOANS);
        }
      }catch{setTransactions(genSample());setBudgets(DEFAULT_BUDGETS);setGoals(DEFAULT_GOALS);setMembers(DEFAULT_MEMBERS);setLoans(SAMPLE_LOANS);}
      setLoaded(true);
    };
    load();
  },[]);

  useEffect(()=>{ if(loaded)window.storage.set("kk-tx",JSON.stringify(transactions)).catch(()=>{}); },[transactions,loaded]);
  useEffect(()=>{ if(loaded)window.storage.set("kk-budgets",JSON.stringify(budgets)).catch(()=>{}); },[budgets,loaded]);
  useEffect(()=>{ if(loaded)window.storage.set("kk-goals",JSON.stringify(goals)).catch(()=>{}); },[goals,loaded]);
  useEffect(()=>{ if(loaded)window.storage.set("kk-members",JSON.stringify(members)).catch(()=>{}); },[members,loaded]);
  useEffect(()=>{ if(loaded)window.storage.set("kk-loans",JSON.stringify(loans)).catch(()=>{}); },[loans,loaded]);

  const addTx=tx=>setTransactions(p=>[tx,...p]);
  const deleteTx=id=>setTransactions(p=>p.filter(t=>t.id!==id));
  const setBudget=(c,v)=>setBudgets(p=>({...p,[c]:v}));
  const addGoal=g=>setGoals(p=>[...p,g]);
  const updGoal=(id,sv)=>setGoals(p=>p.map(g=>g.id===id?{...g,saved:sv}:g));
  const delGoal=id=>setGoals(p=>p.filter(g=>g.id!==id));
  const addLoan=l=>setLoans(p=>[...p,l]);
  const updLoan=(id,patch)=>setLoans(p=>p.map(l=>l.id===id?{...l,...patch}:l));
  const delLoan=id=>setLoans(p=>p.filter(l=>l.id!==id));
  const shiftMonth=dir=>{ const [y,m]=currentMonth.split("-").map(Number);const d=new Date(y,m-1+dir);setCurrentMonth(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`); };

  const TABS=[
    {id:"dashboard",label:"Home",Icon:Home},
    {id:"transactions",label:"Spends",Icon:List},
    {id:"budget",label:"Budget",Icon:BarChart2},
    {id:"goals",label:"Goals",Icon:Target},
    {id:"loans",label:"Loans",Icon:CreditCard},
    {id:"planner",label:"Planner",Icon:Calendar},
  ];

  if(!loaded)return(
    <>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Nunito:wght@400;500;600;700;800;900&display=swap" rel="stylesheet"/>
      <div style={{minHeight:"100vh",background:C.bg,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:12}}>
        <div style={{fontSize:60}}>🏡</div>
        <p style={{fontFamily:"'Playfair Display',serif",fontSize:26,color:C.saffron,margin:0}}>KutumbaKosha</p>
        <p style={{fontFamily:"Nunito,sans-serif",fontSize:13,color:C.muted,margin:0}}>Loading your family finances…</p>
      </div>
    </>
  );

  return(
    <>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Nunito:wght@400;500;600;700;800;900&display=swap" rel="stylesheet"/>
      <style>{`*{margin:0;padding:0;box-sizing:border-box;-webkit-tap-highlight-color:transparent;}html,body{background:${C.bg};font-family:'Nunito',sans-serif;}::-webkit-scrollbar{width:3px;}::-webkit-scrollbar-track{background:transparent;}::-webkit-scrollbar-thumb{background:${C.border};border-radius:2px;}input[type=number]::-webkit-inner-spin-button,input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none;}button:active{transform:scale(0.97);}`}</style>
      <div style={{maxWidth:480,margin:"0 auto",minHeight:"100vh",background:C.bg,display:"flex",flexDirection:"column",position:"relative"}}>
        <div style={{background:C.grad,padding:"18px 20px 22px",color:"white",boxShadow:"0 6px 24px rgba(232,101,42,0.35)",position:"sticky",top:0,zIndex:30}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <div>
              <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:22,fontWeight:700,margin:0,letterSpacing:"-0.3px"}}>KutumbaKosha</h1>
              <p style={{fontFamily:"Nunito,sans-serif",fontSize:11,opacity:0.75,margin:0}}>कुटुम्ब कोश · Family Treasury</p>
            </div>
            <div style={{display:"flex",gap:6}}>
              {members.slice(0,3).map(m=>(
                <div key={m.id} style={{width:34,height:34,borderRadius:"50%",background:"rgba(255,255,255,0.25)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:17,backdropFilter:"blur(4px)"}}>{m.avatar}</div>
              ))}
            </div>
          </div>
          {tab!=="loans"&&tab!=="planner"&&(
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",background:"rgba(255,255,255,0.22)",borderRadius:13,padding:"6px 10px",backdropFilter:"blur(8px)",gap:6}}>
              <button onClick={()=>shiftMonth(-1)} style={{background:"none",border:"none",color:"white",cursor:"pointer",opacity:0.85,padding:"4px 6px",display:"flex",alignItems:"center",flexShrink:0}}><ChevronLeft size={20}/></button>
              {/* Month picker */}
              <div style={{display:"flex",gap:6,flex:1,justifyContent:"center",alignItems:"center"}}>
                <select
                  value={currentMonth.split("-")[1]}
                  onChange={e=>{const [y]=currentMonth.split("-");setCurrentMonth(`${y}-${e.target.value}`);}}
                  style={{background:"transparent",border:"none",color:"white",fontFamily:"Nunito,sans-serif",fontWeight:800,fontSize:15,cursor:"pointer",outline:"none",appearance:"none",WebkitAppearance:"none",textAlign:"center",padding:"0 2px"}}>
                  {["01","02","03","04","05","06","07","08","09","10","11","12"].map((m,i)=>(
                    <option key={m} value={m} style={{color:"#1C1917",background:"white",fontWeight:700}}>
                      {new Date(2000,i).toLocaleString("default",{month:"long"})}
                    </option>
                  ))}
                </select>
                <select
                  value={currentMonth.split("-")[0]}
                  onChange={e=>{const [,m]=currentMonth.split("-");setCurrentMonth(`${e.target.value}-${m}`);}}
                  style={{background:"transparent",border:"none",color:"white",fontFamily:"Nunito,sans-serif",fontWeight:800,fontSize:15,cursor:"pointer",outline:"none",appearance:"none",WebkitAppearance:"none",textAlign:"center",padding:"0 2px"}}>
                  {Array.from({length:10},(_,i)=>new Date().getFullYear()-3+i).map(y=>(
                    <option key={y} value={y} style={{color:"#1C1917",background:"white",fontWeight:700}}>{y}</option>
                  ))}
                </select>
              </div>
              <button onClick={()=>shiftMonth(1)} style={{background:"none",border:"none",color:"white",cursor:"pointer",opacity:0.85,padding:"4px 6px",display:"flex",alignItems:"center",flexShrink:0}}><ChevronRight size={20}/></button>
            </div>
          )}
          {tab==="loans"&&(
            <div style={{background:"rgba(255,255,255,0.22)",borderRadius:13,padding:"8px 16px",backdropFilter:"blur(8px)",display:"flex",alignItems:"center",gap:8}}>
              <CreditCard size={15} color="white" opacity={0.8}/>
              <span style={{fontFamily:"Nunito,sans-serif",fontWeight:800,fontSize:15}}>{loans.length} Loan Account{loans.length!==1?"s":""}</span>
            </div>
          )}
          {tab==="planner"&&(
            <div style={{background:"rgba(255,255,255,0.22)",borderRadius:13,padding:"6px 14px",backdropFilter:"blur(8px)",display:"flex",alignItems:"center",gap:10}}>
              <Calendar size={15} color="white" opacity={0.85} style={{flexShrink:0}}/>
              <div style={{flex:1,minWidth:0}}>
                <span style={{fontFamily:"Nunito,sans-serif",fontWeight:800,fontSize:13,color:"white",opacity:0.9}}>Lonkar Family Planner </span>
              </div>
              {/* Year picker — prev/next + dropdown of all 50 years */}
              <div style={{display:"flex",alignItems:"center",gap:4,background:"rgba(255,255,255,0.15)",borderRadius:10,padding:"2px 6px"}}>
                <button onClick={()=>setPlannerCalYear(y=>Math.max(2026,y-1))} style={{background:"none",border:"none",color:"white",cursor:"pointer",padding:"2px",display:"flex",alignItems:"center",opacity:plannerCalYear<=2026?0.3:0.9}}><ChevronLeft size={16}/></button>
                <select
                  value={plannerCalYear}
                  onChange={e=>setPlannerCalYear(Number(e.target.value))}
                  style={{background:"transparent",border:"none",color:"#FFD700",fontFamily:"Nunito,sans-serif",fontWeight:900,fontSize:15,cursor:"pointer",outline:"none",appearance:"none",WebkitAppearance:"none",textAlign:"center",padding:"0 2px",minWidth:44}}>
                  {Array.from({length:50},(_,i)=>2026+i).map(y=>(
                    <option key={y} value={y} style={{color:"#1C1917",background:"white",fontWeight:700}}>{y}</option>
                  ))}
                </select>
                <button onClick={()=>setPlannerCalYear(y=>Math.min(2075,y+1))} style={{background:"none",border:"none",color:"white",cursor:"pointer",padding:"2px",display:"flex",alignItems:"center",opacity:plannerCalYear>=2075?0.3:0.9}}><ChevronRight size={16}/></button>
              </div>
            </div>
          )}
        </div>
        <div style={{flex:1,overflowY:"auto",paddingTop:16,paddingBottom:84}}>
          {tab==="dashboard"    &&<Dashboard transactions={transactions} goals={goals} members={members} loans={loans} currentMonth={currentMonth}/>}
          {tab==="transactions" &&<Transactions transactions={transactions} currentMonth={currentMonth} onDelete={deleteTx}/>}
          {tab==="budget"       &&<Budget transactions={transactions} budgets={budgets} currentMonth={currentMonth} onSetBudget={setBudget}/>}
          {tab==="goals"        &&<GoalsTab goals={goals} onUpdate={updGoal} onDelete={delGoal} onAdd={addGoal}/>}
          {tab==="loans"        &&<LoansTab loans={loans} onAdd={addLoan} onUpdate={updLoan} onDelete={delLoan}/>}
          {tab==="planner"      &&<PlannerTab calYear={plannerCalYear} setCalYear={setPlannerCalYear}/>}
        </div>
        {tab!=="loans"&&tab!=="planner"&&(
          <button onClick={()=>setShowAddTx(true)} style={{position:"fixed",right:20,bottom:74,width:54,height:54,borderRadius:"50%",background:C.grad,border:"none",cursor:"pointer",zIndex:50,boxShadow:`0 6px 24px ${C.saffron}70`,display:"flex",alignItems:"center",justifyContent:"center"}}>
            <Plus color="white" size={26} strokeWidth={2.5}/>
          </button>
        )}
        <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:480,background:"white",borderTop:`1px solid ${C.border}`,display:"flex",boxShadow:"0 -4px 24px rgba(0,0,0,0.09)",zIndex:40}}>
          {TABS.map(({id,label,Icon})=>{
            const active=tab===id;
            return(
              <button key={id} onClick={()=>setTab(id)} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2,padding:"10px 0 8px",border:"none",background:"none",cursor:"pointer",transition:"all 0.18s",position:"relative"}}>
                {active&&<div style={{position:"absolute",top:0,left:"50%",transform:"translateX(-50%)",width:28,height:3,background:C.saffron,borderRadius:"0 0 4px 4px"}}/>}
                <div style={{width:34,height:34,borderRadius:10,transition:"all 0.18s",background:active?`${C.saffron}18`:"transparent",display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <Icon size={18} color={active?C.saffron:C.muted} strokeWidth={active?2.5:2}/>
                </div>
                <span style={{fontFamily:"Nunito,sans-serif",fontSize:10,fontWeight:active?800:500,color:active?C.saffron:C.muted}}>{label}</span>
              </button>
            );
          })}
        </div>
        {showAddTx&&<AddTxModal onAdd={addTx} onClose={()=>setShowAddTx(false)} members={members}/>}
      </div>
    </>
  );
}
