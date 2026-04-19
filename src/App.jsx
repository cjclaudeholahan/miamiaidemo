import { useState } from "react";
const DEFAULT_WACC=10,DEFAULT_PGR=5,DCF_YEARS=10,LBO_HOLD=5,LBO_HOLD_YRS=4.5,LBO_LEV=7,LBO_INT_RATE=0.08,LBO_PREM=1.30,LBO_MAX_EXIT=20,TAX_RATE=0.25;
const IRR_GREAT=25,IRR_GOOD=20,IRR_OK=15;
function growthAtYear(base,yr){
  const g=base/100,f=0.10;
  if(g<=f)return g;
  return g+(f-g)*((yr-1)/(DCF_YEARS-1));
}
function runDCF(companyName,cagrPct,g2027Rate,baseCAGR,ebitdaPct,endMarginPct,wacc,pgr,ntmRev){
  const fin=COMPANY_FINANCIALS[companyName];
  const endM=endMarginPct/100,wD=wacc/100,pD=pgr/100;
  let rows=[],pvSum=0;
  // Ratios from 2027 consensus for SBC/D&A; Other CF held as UFCF pre-tax conversion % of EBITDA
  const y2SbcPct=fin?(fin.sbc27/fin.rev27):0;
  const y2DaPct=fin?(fin.da27/fin.rev27):0;
  const y2OtherConv=fin?(fin.other27/fin.ebitda27):0; // UFCF(pre-tax) conversion: Other CF = EBITDA × this ratio
  const y2Margin=fin?(fin.ebitda27/fin.rev27):(ebitdaPct/100);
  // 2026-2027 = consensus (locked). 2028+ = linear convergence from 2027 growth toward 10% (high-growth cos) or flat at 2027 rate (sub-10% cos), shifted by CAGR delta.
  const delta=(cagrPct-baseCAGR)/100;
  const tG=Math.min(g2027Rate,0.10);
  const dcfGrowth=(yr)=>g2027Rate+(tG-g2027Rate)*((yr-3)/7)+delta;
  let prevRev=fin?fin.rev27:ntmRev;
  for(let yr=1;yr<=DCF_YEARS;yr++){
    const label=String(2025+yr);
    let rev,ebitda,sbc,da,otherCF;
    if(yr===1&&fin){
      rev=fin.rev26;ebitda=fin.ebitda26;sbc=fin.sbc26;da=fin.da26;otherCF=fin.other26;
    }else if(yr===2&&fin){
      rev=fin.rev27;ebitda=fin.ebitda27;sbc=fin.sbc27;da=fin.da27;otherCF=fin.other27;
    }else{
      const g=dcfGrowth(yr);
      rev=prevRev*(1+g);
      const margin=y2Margin+(endM-y2Margin)*((yr-2)/(DCF_YEARS-2));
      ebitda=rev*margin;
      sbc=rev*y2SbcPct;
      da=rev*y2DaPct;
      otherCF=ebitda*y2OtherConv;
    }
    if(yr>=3)prevRev=rev;
    const revGrowth=yr===1&&fin&&fin.rev25?((fin.rev26/fin.rev25-1)*100):(yr===1?0:(yr===2&&fin?((fin.rev27/fin.rev26-1)*100):dcfGrowth(yr)*100));
    const ebitdaMargin=(ebitda/rev)*100;
    const sbcPctRev=(sbc/rev)*100;
    const ebitdaPostSBC=ebitda-sbc;
    const ebitdaPostSBCMargin=(ebitdaPostSBC/rev)*100;
    const daPctRev=(da/rev)*100;
    const ebit=ebitdaPostSBC-da;
    const taxes=Math.max(ebit*0.25,0);
    const nopat=ebit-taxes;
    const nopatMargin=(nopat/rev)*100;
    const otherCFPctRev=(otherCF/rev)*100;
    const ufcf=nopat+da+otherCF;
    const stubFactor=yr===1?0.5:1; // 2026 stub: 50% credit (as of 6/30/2026)
    const ufcfForPV=ufcf*stubFactor;
    const pv=ufcfForPV/Math.pow(1+wD,yr-0.5);
    pvSum+=pv;
    rows.push({yr,label,rev:Math.round(rev),revGrowth:Math.round(revGrowth*10)/10,
      ebitda:Math.round(ebitda),ebitdaMargin:Math.round(ebitdaMargin*10)/10,
      sbc:Math.round(sbc),sbcPctRev:Math.round(sbcPctRev*10)/10,
      ebitdaPostSBC:Math.round(ebitdaPostSBC),ebitdaPostSBCMargin:Math.round(ebitdaPostSBCMargin*10)/10,
      da:Math.round(da),daPctRev:Math.round(daPctRev*10)/10,
      ebit:Math.round(ebit),ebitMargin:Math.round((ebit/rev)*1000)/10,taxes:Math.round(taxes),taxRate:25,
      nopat:Math.round(nopat),nopatMargin:Math.round(nopatMargin*10)/10,
      otherCF:Math.round(otherCF),otherCFPctRev:Math.round(otherCFPctRev*10)/10,ufcfPretaxConv:Math.round(((ebitda+otherCF)/ebitda)*1000)/10,
      ufcf:Math.round(ufcf),ufcfStub:Math.round(ufcfForPV),stubbed:yr===1,ufcfMargin:Math.round((ufcf/rev)*1000)/10,ufcfConv:Math.round((ufcf/ebitdaPostSBC)*1000)/10,pv:Math.round(pv)});
  }
  // Build 2025A historical row (not included in DCF calc)
  let hist=null;
  if(fin&&fin.rev25){
    const h={yr:0,label:"2025A",rev:Math.round(fin.rev25),revGrowth:fin.rev24?Math.round((fin.rev25/fin.rev24-1)*1000)/10:0,ebitda:Math.round(fin.ebitda25),ebitdaMargin:Math.round((fin.ebitda25/fin.rev25)*1000)/10,sbc:Math.round(fin.sbc25),sbcPctRev:Math.round((fin.sbc25/fin.rev25)*1000)/10};
    const hPostSBC=fin.ebitda25-fin.sbc25;
    h.ebitdaPostSBC=Math.round(hPostSBC);h.ebitdaPostSBCMargin=Math.round((hPostSBC/fin.rev25)*1000)/10;
    h.da=Math.round(fin.da25);h.daPctRev=Math.round((fin.da25/fin.rev25)*1000)/10;
    const hEbit=hPostSBC-fin.da25;h.ebit=Math.round(hEbit);h.ebitMargin=Math.round((hEbit/fin.rev25)*1000)/10;
    const hTax=Math.max(hEbit*0.25,0);h.taxes=Math.round(hTax);h.taxRate=25;
    const hNopat=hEbit-hTax;h.nopat=Math.round(hNopat);h.nopatMargin=Math.round((hNopat/fin.rev25)*1000)/10;
    h.otherCF=Math.round(fin.other25);h.otherCFPctRev=Math.round((fin.other25/fin.rev25)*1000)/10;h.ufcfPretaxConv=Math.round(((fin.ebitda25+fin.other25)/fin.ebitda25)*1000)/10;
    const hUfcf=hNopat+fin.da25+fin.other25;h.ufcf=Math.round(hUfcf);h.ufcfStub=Math.round(hUfcf);h.stubbed=false;
    h.ufcfMargin=Math.round((hUfcf/fin.rev25)*1000)/10;h.ufcfConv=Math.round((hUfcf/hPostSBC)*1000)/10;
    h.pv=null;hist=h;
  }
  const last=rows[DCF_YEARS-1],tvUFCF=last.ufcf*(1+pD),tv=tvUFCF/(wD-pD),pvTV=tv/Math.pow(1+wD,DCF_YEARS-0.5);
  return{rows,hist,pvSum:Math.round(pvSum),tv:Math.round(tv),pvTV:Math.round(pvTV),intrinsic:Math.round(pvSum+pvTV),lastUFCF:last.ufcf,tvUFCF:Math.round(tvUFCF),wacc:wD,pgr:pD};
}
function runLBO(ntmRev,ntmRevX,ebitdaPct,growthPct,endMarginPct,exitMultOverride,entryTEVOverride,ltmEBITDAOv,otherConv,companyName,g2027Rate,baseCAGR){
  const startM=ebitdaPct/100,endM=endMarginPct/100;
  const conv=otherConv||0;
  const fin=COMPANY_FINANCIALS[companyName];
  const y2Margin=fin?(fin.ebitda27/fin.rev27):startM;
  const delta=(growthPct-baseCAGR)/100;
  const tGl=Math.min(g2027Rate,0.10);
  const dcfGrowth=(yr)=>g2027Rate+(tGl-g2027Rate)*((yr-3)/7)+delta;
  const entryEBITDA=fin&&fin.ebitda26&&fin.ebitda27?(fin.ebitda26*0.5+fin.ebitda27*0.5):(ntmRev*startM);
  const levEBITDA=fin&&fin.ebitda25&&fin.ebitda26?(fin.ebitda25*0.5+fin.ebitda26*0.5):(ltmEBITDAOv??entryEBITDA);
  const entryTEV=entryTEVOverride??(ntmRev*ntmRevX*LBO_PREM);
  const entryEBITDAMult=entryTEV/entryEBITDA;
  const grossDebt=Math.min(levEBITDA*LBO_LEV,entryTEV*0.75);
  const rev2026=fin&&fin.rev26?fin.rev26:ntmRev;
  const cashToBS=Math.round(rev2026*0.10);
  const financingFees=Math.round(grossDebt*0.03);
  const txnFees=Math.round(entryTEV*0.0175);
  const totalUses=entryTEV+cashToBS+financingFees+txnFees;
  const equityIn=Math.max(totalUses-grossDebt,1);
  let rev=ntmRev,prevRev=fin?fin.rev25:ntmRev,cashBal=cashToBS,lboRows=[];
  // 2025A historical row
  let hist=null;
  if(fin&&fin.rev25){
    const hEbitda=fin.ebitda25,hOther=fin.other25,hUfcfPretax=hEbitda+hOther;
    hist={yr:0,label:"2025A",rev:Math.round(fin.rev25),revGrowth:fin.rev24?Math.round((fin.rev25/fin.rev24-1)*1000)/10:0,margin:Math.round((hEbitda/fin.rev25)*1000)/10,ebitda:Math.round(hEbitda),otherCF:Math.round(hOther),ufcfPretax:Math.round(hUfcfPretax),ufcfPretaxConv:Math.round((hUfcfPretax/hEbitda)*1000)/10,isHist:true};
  }
  let lboPrevRev=fin?fin.rev27:ntmRev;
  for(let yr=1;yr<=LBO_HOLD;yr++){
    const g=dcfGrowth(yr);
    if(yr===1&&fin){rev=fin.rev26;}else if(yr===2&&fin){rev=fin.rev27;}else{rev=lboPrevRev*(1+g);}
    if(yr>=3)lboPrevRev=rev;
    const revGrowth=yr===1&&fin&&fin.rev25?Math.round((rev/fin.rev25-1)*1000)/10:(yr===1?0:yr===2&&fin?Math.round(((fin.rev27/fin.rev26)-1)*1000)/10:Math.round(g*1000)/10);
    const margin=yr===1&&fin?(fin.ebitda26/fin.rev26):yr===2&&fin?(fin.ebitda27/fin.rev27):y2Margin+(endM-y2Margin)*((yr-2)/(DCF_YEARS-2));
    const ebitda=rev*margin,otherCF=ebitda*conv,ufcfPretax=ebitda+otherCF,interest=grossDebt*LBO_INT_RATE;
    const stub=yr===1?0.5:1; // 2026 stub: entry 6/30, only H2 cash flows
    const cashUfcf=ufcfPretax*stub,cashInterest=interest*stub;
    const tax=cashUfcf*TAX_RATE;
    const bopCash=cashBal;
    const eopCash=bopCash+cashUfcf-tax-cashInterest;
    cashBal=eopCash;
    lboRows.push({yr,label:String(2025+yr)+(yr===1?" ⁵":""),rev:Math.round(rev),revGrowth,margin:Math.round(margin*1000)/10,ebitda:Math.round(ebitda),otherCF:Math.round(otherCF),ufcfPretax:Math.round(ufcfPretax),ufcfPretaxConv:Math.round(((ebitda+otherCF)/ebitda)*1000)/10,interest:Math.round(cashInterest),tax:Math.round(tax),cashUfcf:Math.round(cashUfcf),bopCash:Math.round(bopCash),eopCash:Math.round(eopCash)});
    prevRev=rev;
  }
  // Yr 6 = NTM at exit
  const g6=dcfGrowth(6),yr6Rev=lboPrevRev*(1+g6),yr6Margin=y2Margin+(endM-y2Margin)*((6-2)/(DCF_YEARS-2)),yr6EBITDA=yr6Rev*yr6Margin;
  lboRows.push({yr:6,label:"2031E (NTM)",rev:Math.round(yr6Rev),revGrowth:Math.round(g6*1000)/10,margin:Math.round(yr6Margin*1000)/10,ebitda:Math.round(yr6EBITDA),isNTM:true});
  const exitEBITDA=Math.round(yr6EBITDA);
  const exitEBITDAMult=Math.min(exitMultOverride??Math.min(entryEBITDAMult,LBO_MAX_EXIT),LBO_MAX_EXIT);
  const exitTEV=exitEBITDA*exitEBITDAMult;
  const grossExitEquity=Math.max(exitTEV-grossDebt+cashBal,0);
  const optionsDilution=Math.max(Math.round((grossExitEquity-equityIn)*0.10),0);
  const exitEquity=Math.max(grossExitEquity-optionsDilution,0);
  const moic=exitEquity/equityIn,irr=(Math.pow(Math.max(moic,0),1/LBO_HOLD_YRS)-1)*100;
  return{entryTEV:Math.round(entryTEV),entryEBITDA:Math.round(entryEBITDA),levEBITDA:Math.round(levEBITDA),entryEBITDAMult:Math.round(entryEBITDAMult*10)/10,grossDebt:Math.round(grossDebt),equityIn:Math.round(equityIn),exitTEV:Math.round(exitTEV),exitEBITDA,exitEBITDAMult:Math.round(exitEBITDAMult*10)/10,eopCashFinal:Math.round(cashBal),grossExitEquity:Math.round(grossExitEquity),optionsDilution,exitEquity:Math.round(exitEquity),moic:Math.round(moic*10)/10,irr:Math.round(irr*10)/10,cashToBS,financingFees,txnFees,totalUses:Math.round(totalUses),lboRows,hist};
}
function scoreCompany(co,dcf,lbo){
  const evE=co.tev/(co.ntmRev*co.ebitda/100),evR=co.ntmRevX;
  const valScore=Math.min(Math.max(0,2*(1-(evE-5)/25))+Math.max(0,1*(1-(evR-2)/12)),3);
  const mktPos=co.sor?1.0:0.35;
  const revMoat=(co.pricing==="Usage-Based"?0.35:0.10)+(!co.seat?0.20:0);
  const pricingPwr=Math.min((Math.min(co.ebitda,50)/50)*0.75,0.75);
  const mktLead=(Math.min(Math.max(co.cagr,0),25)/25)*0.40;
  const investGrade={"High":0.30,"Medium-High":0.225,"Medium":0.15,"Low-Medium":0.075,"Low":0}[co.peFit]||0.15;
  const qualScore=Math.min(mktPos+revMoat+pricingPwr+mktLead+investGrade,3);
  const aiBase={"Low":2.6,"Medium":1.4,"High":0.1}[co.aiRisk]||1.4;
  const aiScore=Math.min(Math.max(aiBase+(co.sor?0.2:0)+(co.pricing==="Usage-Based"?0.2:-0.2)+(co.peOwned?0.2:0),0),3);
  const lboScore=lbo.irr>=IRR_GREAT?3:lbo.irr>=IRR_GOOD?2.2:lbo.irr>=IRR_OK?1.4:Math.max(0,lbo.irr/IRR_OK*1.4);
  const dcfScore=Math.min(Math.max(1+(dcf.intrinsic-co.tev)/co.tev*1.5,0),2);
  const peScore={"High":1,"Medium-High":0.75,"Medium":0.5,"Low-Medium":0.25,"Low":0.1}[co.peFit]||0.5;
  const raw=valScore+qualScore+aiScore+lboScore+dcfScore+peScore;
  const total=Math.round((raw/15)*10*10)/10;
  return{total:co.avoid?Math.min(total,5.5):total,valScore:Math.round(valScore*10)/10,qualScore:Math.round(qualScore*10)/10,aiScore:Math.round(aiScore*10)/10,lboScore:Math.round(lboScore*10)/10,dcfScore:Math.round(dcfScore*10)/10,peScore:Math.round(peScore*10)/10,evEbitda:Math.round(evE*10)/10,evRev:evR};
}
// ─── DATA ─────────────────────────────────────────────────────────────────────
const RAW=[
  // ── PURE-PLAY VSaaS ──
  {name:"Bentley Systems",vertical:"Construction & Design SW",bucket:"Pure-Play VSaaS",hq:"US",sor:true,seat:true,pricing:"Seat-Based",peOwned:false,tev:11842.9,ntmRev:1756.8,growth:13,gm:82,ebitda:36,cagr:11.75,ntmRevX:6.74,peFit:"Medium",aiRisk:"Low",avoid:false,ltmEbitda:552.4,pct52w:0.597,
   desc:"Engineering software for large-scale infrastructure design (roads, bridges, rail, utilities) serving civil engineers and infrastructure owners globally. The dominant SoR for civil and industrial infrastructure workflows with no credible direct competitor. Seat-based E365 subscription with strong recurring revenue from cloud transition.",
   sd:{sharePrice:35.08,sharesOut:306.3,marketCap:10745.1,netDebt:1097.8},
   thesis:["Moat is not just 'infrastructure SoR' — it is the accumulated library of engineering standards, simulation templates, and project data inside each client's Bentley environment; switching means re-certifying years of design models against AASHTO/Eurocode standards","Bentley family controls ~55% of voting power via dual-class structure, making hostile take-private impossible — any negotiated deal pays a governance premium on top of 7.8x NTM Rev, and the family has shown no urgency to sell","Real competitive risk is Hexagon acquiring Bricsys + Iesve to build a vertically-integrated civil/energy design stack; Autodesk Infraworks remains subscale but could bundle aggressively against Bentley's standalone pricing","At B TEV the realistic exit is strategic to Siemens, Dassault, or Hexagon — financial sponsor returns depend on multiple expansion from current trough, not operational improvement on already-36% EBITDA margins","Weakness: E365 subscription transition flatters NRR metrics; underlying seat growth in civil infrastructure is mid-single-digit at best, and the customer base (DOTs, utilities, public agencies) is inherently cyclical with government budget exposure"],
   aiRationale:["Protected workflows: finite element analysis, hydraulic simulation, geotechnical modeling — these require physics engines and regulatory certification (e.g., PE stamp requirements) that generative AI does not address","Threatened workflow: 2D drafting and basic alignment design within OpenRoads/OpenRail could see 40-60% productivity gains from AI copilots, compressing seats at smaller engineering firms within 3-5 years","Second-order risk: if AI makes a 10-person civil engineering team as productive as 15, Bentley's seat-based pricing directly loses 33% of revenue per firm — usage-based repricing on iTwin is the obvious hedge but adoption is nascent","Specific AI competitors: Autodesk's AI-assisted InfraWorks, Trimble's AI-enabled Tekla for structural, and startups like Cala (generative building design) and TestFit (generative site planning) are encroaching on adjacent workflows","3-year view: minimal impact on core simulation/analysis revenue; 10-year view: material seat compression risk in design-phase workflows, partially offset only if Bentley successfully shifts to consumption-based iTwin pricing at scale"]},
  {name:"Nemetschek",vertical:"Construction & Design SW",bucket:"Pure-Play VSaaS",hq:"DE",sor:true,seat:false,pricing:"Usage-Based",peOwned:false,tev:9660.0,ntmRev:1659.4,growth:13,gm:97,ebitda:33,cagr:13.44,ntmRevX:5.82,peFit:"Medium-High",aiRisk:"Low",avoid:false,ltmEbitda:463.1,pct52w:0.503,
   desc:"Portfolio of AEC software brands (Allplan, Vectorworks, Bluebeam, dRofus) covering architecture, engineering, and construction design workflows. Particularly dominant across European markets with near-100% gross margins reflecting pure software delivery. Usage-based subscription with revenue tied to project activity.",
   sd:{sharePrice:81.81,sharesOut:116.28,marketCap:9513.1,netDebt:146.9},
   thesis:["97% GM is real but misleading — Nemetschek is a holding company of semi-autonomous brands (Allplan, Vectorworks, Bluebeam, Graphisoft) with separate codebases, sales teams, and product roadmaps; a PE buyer's operational thesis must center on consolidating this fragmented portfolio, which prior management has resisted","The actual moat varies dramatically by brand: Bluebeam owns PDF markup for construction (near-monopoly), Graphisoft's ArchiCAD is the #2 BIM tool behind Revit, but Allplan is a distant third in structural — a buyer is really underwriting Bluebeam's dominance and ArchiCAD's European installed base","5.8x NTM Rev at 50% off highs is the most attractive entry multiple for a 97% GM business in the screen — but Nemetschek is German-listed with a concentrated shareholder base (Nemetschek family foundation holds ~52%), making take-private governance complex and requiring German takeover law compliance","Consolidation upside is the real prize: unifying Allplan, Vectorworks, and Graphisoft onto a shared platform could unlock 500-800bps of EBITDA improvement from eliminating duplicate R&D and go-to-market — but execution risk is high given brand loyalty and cultural resistance across subsidiaries","Weakness: Autodesk's AEC Collection bundles Revit + Civil 3D + Navisworks at aggressive pricing; Nemetschek's individual brands cannot match this bundling power, and Autodesk's 2024 Forma launch directly targets the generative design space where Nemetschek is underinvested"],
   aiRationale:["Protected workflows: BIM model authoring in ArchiCAD/Allplan requires deep parametric modeling expertise tied to local building codes (Eurocode, DIN standards) — generative AI cannot produce code-compliant structural models without human validation","Threatened workflow: Bluebeam's PDF markup and document review is directly exposed to AI-powered document analysis tools — Procore's AI document management, PlanGrid (Autodesk), and startups like Pypestream could automate 60%+ of punch list and RFI review within 5 years","Second-order effect: usage-based pricing actually cuts both ways — if AI makes architects complete BIM models 2x faster, project-based usage billing captures the same project value, but if AI reduces total project count by enabling faster iteration, usage volume drops","Specific AI competitors: Autodesk Forma (generative site design), Spacemaker (now Autodesk), Hypar (parametric building design), and TestFit are all targeting the early-stage design workflows where Nemetschek brands have historically upsold from concept to detailed design","3-year view: core BIM authoring safe; Bluebeam's document workflow faces near-term AI pressure. 10-year view: if generative design tools can produce code-compliant BIM models, the value shifts from model authoring to model validation — Nemetschek must own the validation layer or risk commoditization"]},
  {name:"Waystar",vertical:"Healthcare",bucket:"Pure-Play VSaaS",hq:"US",sor:false,seat:false,pricing:"Usage-Based",peOwned:false,tev:6535,ntmRev:1328,growth:17,gm:69,ebitda:42,cagr:14,ntmRevX:4.92,peFit:"High",aiRisk:"Low",avoid:false,ltmEbitda:486,pct52w:0.627,
   desc:"Revenue cycle management (RCM) platform automating claims submission, eligibility verification, and payment posting for healthcare providers. Mission-critical workflow embedded across hospitals and physician groups with multi-year contracts and extreme switching costs. Usage-based fees on claims processed, creating revenue tied to patient visit volumes.",
   sd:{sharePrice:25.80,sharesOut:200.1,marketCap:5164,netDebt:1371},
   thesis:["Post-EQT/CPPIB take-private at .75 and re-IPO at .50, Waystar trades at 4.7x NTM with 42% EBITDA — a secondary buyout repricing the same asset EQT bought from Bain","Real moat is payer connectivity: Waystar processes claims across 1,500+ payers with individually negotiated EDI connections — recreating this integration layer is a 5-7 year effort, not a technology problem","Usage-based on claims volume means revenue scales with healthcare utilization inflation (~5-6% annually) independent of customer headcount decisions","Kill-the-deal risk: R1 RCM (now private under TowerBrook/CD&R) is consolidating end-to-end RCM with physician staffing, creating a bundled competitor Waystar cannot match as pure software","Exit path narrows post-EQT: strategic buyers (UHG/Optum, Change Healthcare) face antitrust issues, leaving you selling to another sponsor at cycle-peak healthcare multiples"],
   aiRationale:["AI actually strengthens Waystar near-term: automated prior authorization, denial prediction, and coding suggestions are features Waystar sells, not threats to its position","Real AI risk is indirect — if AI coding tools (Codify, Nym Health) achieve >95% first-pass clean claim rates, Waystar's denial management and appeals workflow becomes less critical","The payer-provider data exchange layer is regulatory infrastructure, not intelligence — AI cannot displace the EDI/X12 transaction backbone Waystar operates on","Ambient clinical documentation (Nuance DAX, Abridge) could reduce coding errors upstream, shrinking the denial-and-rework volume that drives ~30% of RCM platform value","Net assessment: AI is a product tailwind for 3-5 years but the long-term risk is that cleaner upstream data reduces the complexity that justifies RCM platform pricing"]},
  {hidden:true,name:"AppFolio",vertical:"Real Estate / Prop Tech",bucket:"Pure-Play VSaaS",hq:"US",sor:true,seat:false,pricing:"Usage-Based",peOwned:false,tev:5531,ntmRev:1160,growth:17,gm:64,ebitda:29,cagr:17,ntmRevX:4.8,peFit:"High",aiRisk:"Low",avoid:false,ltmEbitda:265,pct52w:0.49,
   desc:"Property management software for residential and commercial real estate operators covering leasing, maintenance, accounting, screening, and payments. The SoR for SMB property managers with a payments flywheel that grows as portfolios scale. Usage-based model with fees tied to units under management and payment volumes.",
   sd:{sharePrice:157.82,sharesOut:36.6,marketCap:5782,netDebt:-251},
   thesis:["AppFolio's real business is a payments company dressed as software — tenant rent payments, screening fees, and insurance premiums flow through AppFolio's ledger, creating ~$400M of payments revenue growing 25%+ that is completely decoupled from property manager headcount or AI productivity","The screening fee monopoly is underappreciated: AppFolio charges tenants $40-50 per application (not the property manager); this is a per-transaction tax on America's rental market that grows with rent prices and application volume, not software seats","At \.2B TEV, the real question is whether this is a 15x payments multiple or a 5.5x software multiple — if you value the payments stream at payments-company multiples (8-12x revenue) and back into the software for free, the upside is significant","Competitive risk from Yardi, RealPage (now Thoma Bravo-owned), and Entrata is concentrated in mid-market/enterprise; AppFolio owns the sub-500 unit SMB segment where implementation simplicity matters more than configurability — this segment is hard to attack from above","Key risk: regulatory scrutiny of tenant screening fees (several state bills proposed) could cap the highest-margin revenue line; also, RealPage's antitrust issues around algorithmic rent-setting create headline risk for the entire PropTech sector"],
   aiRationale:["Payments-as-revenue is the AI-proof core: tenants paying rent through AppFolio generates transaction fees regardless of how many property managers are needed or how productive AI makes them — this is a toll booth, not a productivity tool","The AI-vulnerable surface area is narrow but real: AI-powered leasing assistants (ShowMojo, Elise AI) could reduce the need for leasing agents, compressing AppFolio's per-unit-managed pricing if property managers push back on fees as headcount declines","Counter-argument: AppFolio is already building AI leasing into the platform (AI-powered showing scheduling, tenant communications); the incumbency advantage means AppFolio captures the AI upside rather than being disrupted by it","Second-order benefit: if AI enables a single property manager to manage 200 units instead of 100, AppFolio's revenue per customer doubles (more units = more payments, screening fees, and insurance premiums per account) — AI is actually a growth driver","Low risk: the payments toll-booth model is structurally the most AI-resilient business model in this screen; the only risk is regulatory, not technological"]},
  {name:"CCC Intelligent Solutions",vertical:"Financial Services",bucket:"Pure-Play VSaaS",hq:"US",sor:true,seat:false,pricing:"Usage-Based",peOwned:false,tev:4747.6,ntmRev:1186.1,growth:9,gm:78,ebitda:42,cagr:8.89,ntmRevX:4.0,peFit:"High",aiRisk:"Low",avoid:false,ltmEbitda:450.6,pct52w:0.562,
   desc:"AI-native platform connecting the entire auto insurance claims ecosystem — insurers, repairers, OEMs, and parts suppliers — across 35,000+ connected businesses. The SoR for collision repair estimates and claims processing with deep network effects that took decades to build. Usage-based transaction fees scaling with auto claims volume.",
   sd:{sharePrice:5.64,sharesOut:636.71,marketCap:3591.0,netDebt:1156.5},
   thesis:["The network is the moat: CCC connects insurers, body shops, OEMs, and parts suppliers in a single data exchange — switching any one node requires coordinating all counterparties, which never happens","9% topline growth masks the real story: ARPU expansion via Casualty (injury claims), Emerging Solutions (subrogation, total loss), and AI upsell modules drive revenue per claim higher each year","\.4B net debt from Advent's 2017 LBO still on the balance sheet — a secondary buyout must underwrite deleveraging from ~5x, which constrains entry price and return math","Kill-the-deal risk: Tractable (AI photo-based damage estimation) has signed Tokio Marine, Covea, and US insurers — if Tractable cracks the network effect by going insurer-first, CCC's body shop lock-in weakens","Exit buyer universe is narrow: Verisk and Guidewire are logical strategics but both have antitrust overlap in P&C claims; likely another sponsor exit at 12-14x EBITDA"],
   aiRationale:["CCC already monetizes AI — its AI gateway for damage estimation and claims triage is a revenue driver, not a cost center, making it one of few companies where AI directly accretes to topline","Tractable is the real AI threat: computer vision-based damage estimation that bypasses body shop involvement entirely — if insurers adopt AI photo-first workflows, CCC's repair-network-centric model loses leverage","The FNOL-to-settlement workflow involves regulatory, legal, and multi-party coordination that pure AI cannot automate — CCC's value is in orchestrating counterparties, not just estimating damage","AI could compress the number of human touches per claim (adjusters, estimators), but CCC's usage-based pricing is per-claim not per-touch, so efficiency gains do not directly erode revenue","Net: CCC is the rare case where AI is already in the P&L as revenue; the risk is a paradigm shift to insurer-direct AI estimation that disintermediates the body shop network CCC controls"]},
  {hidden:true,name:"Elastic",vertical:"Data & Analytics",bucket:"Pure-Play VSaaS",hq:"US",sor:false,seat:false,pricing:"Usage-Based",peOwned:false,tev:4946,ntmRev:1949,growth:15,gm:78,ebitda:18,cagr:14,ntmRevX:2.5,peFit:"Medium",aiRisk:"Medium",avoid:false,ltmEbitda:291,pct52w:0.53,
   desc:"Open-source search, observability, and security analytics platform (Elasticsearch, Kibana, Logstash) used by enterprises for log management, application performance monitoring, and threat detection. Deep developer adoption with a consumption-based cloud model (Elastic Cloud) growing faster than self-managed deployments. Usage-based pricing tied to data ingestion and query volumes.",
   sd:{sharePrice:49.99,sharesOut:112.6,marketCap:5628,netDebt:-682},
   thesis:["2.5x NTM Rev for a 15% grower with 78% GM is genuinely cheap — the market is punishing Elastic for open-source licensing uncertainty and Datadog/Splunk competitive pressure, but the installed base of Elasticsearch deployments across enterprise is massive and deeply embedded in observability stacks","The real moat is developer adoption: Elasticsearch is the default search engine embedded in thousands of enterprise applications — ripping it out requires re-architecting logging, search, and analytics pipelines that engineering teams built over years","Margin expansion from 18% to 28%+ EBITDA is the PE thesis: Elastic has been investing heavily in cloud migration (Elastic Cloud) and go-to-market; a PE buyer can rationalize S&M spend and accelerate the mix shift to higher-margin cloud consumption","Competitive risk from Datadog (observability), Splunk/Cisco (SIEM), and OpenSearch (AWS fork) is real — but Elastic's breadth across search + observability + security in a single platform creates consolidation value that point solutions cannot match","Kill-the-deal risk: AWS OpenSearch is a credible free alternative for cost-sensitive workloads — if AWS invests heavily in OpenSearch feature parity, Elastic's self-managed revenue base erodes faster than cloud revenue grows"],
   aiRationale:["AI is a double-edged sword for Elastic: AI-powered log analysis and anomaly detection (Elastic AI Assistant) are product enhancements, but AI-native observability tools (Datadog AI, Dynatrace) are building competing capabilities from scratch","The deeper AI risk is that LLM-powered search could commoditize Elasticsearch's core value — if vector search and semantic retrieval become commoditized by foundation model providers, Elastic's search differentiation narrows","Counter-argument: Elastic has invested heavily in vector search (ELSER) and RAG capabilities — positioning Elasticsearch as the retrieval layer for enterprise AI applications could expand TAM significantly","Usage-based pricing is a natural hedge: AI workloads generate massive data volumes for logging, monitoring, and security — more AI adoption means more data ingestion through Elastic pipelines","Medium risk: AI is simultaneously a product opportunity (RAG, vector search) and a competitive threat (AI-native observability) — the outcome depends on whether Elastic captures the AI data infrastructure layer or gets displaced by it"]},
  // ── HYBRID VSaaS ──
  {hidden:true,name:"Cellebrite",vertical:"GovTech",bucket:"Hybrid VSaaS",hq:"IL",sor:true,seat:false,pricing:"Usage-Based",peOwned:false,tev:3145,ntmRev:592,growth:20,gm:85,ebitda:27,cagr:18,ntmRevX:5.3,peFit:"High",aiRisk:"Low",avoid:false,ltmEbitda:134,pct52w:0.68,
   desc:"Digital intelligence platform for law enforcement and government agencies to extract, analyze, and manage digital evidence from mobile devices and cloud sources. The SoR for digital forensics workflows globally with government contract revenue providing multi-year visibility. Usage-based model with AI-enhanced investigation tools driving premium pricing.",
   sd:{sharePrice:13.78,sharesOut:260.0,marketCap:3582,netDebt:-437},
   thesis:["\B TEV is the right size for PE, 85% GM / 19% growth / 18% N3Y CAGR is elite quality, and the GovTech moat (CJIS, FedRAMP, Five Eyes certifications) is genuinely hard to replicate","Cellebrite owns both sides of the digital forensics workflow: UFED for extraction and Physical Analyzer/Pathfinder for analysis — competitors like MSAB and Grayshift only compete on extraction","The AI upsell story is real and already working: Cellebrite Guardian (AI case management) and AI-powered analytics are driving 30%+ net revenue retention as agencies expand from extraction to full investigation workflow","Key risk: Cellebrite's brand carries reputational baggage (NSO Group associations, surveillance state concerns) which limits TAM expansion into private enterprise and creates ESG friction for some LPs","Exit path is clear: strategic buyers include Axon, Motorola Solutions, Palantir, or L3Harris — all have adjacent GovTech platforms and would pay 8-12x for the digital forensics SoR with AI growth"],
   aiRationale:["AI is the single biggest product catalyst for Cellebrite: AI-powered evidence search (natural language queries over extracted data), auto-categorization of images/videos, and pattern detection across devices are all premium features","The extraction layer (UFED) requires zero-day exploit research and hardware engineering that AI startups cannot replicate — this is cybersecurity R&D, not software features","Grayshift (now Magnet Forensics/Thermo Fisher) is the only real competitor, and the market is effectively a duopoly with high barriers from security certifications and law enforcement trust","Second-order AI effect is positive: as criminals use AI to generate deepfakes, encrypted comms, and synthetic identities, demand for advanced digital forensics tools increases — AI creates the problem Cellebrite solves","Low risk: digital forensics is one of the clearest AI-as-tailwind categories — AI makes the product better, makes the market larger, and the certification moat prevents AI-native disruption"]},
  {name:"nCino",vertical:"Financial Services",bucket:"Pure-Play VSaaS",hq:"US",sor:true,seat:false,pricing:"Usage-Based",peOwned:false,tev:2375.6,ntmRev:655.3,growth:8,gm:68,ebitda:27,cagr:8.42,ntmRevX:3.63,peFit:"Medium",aiRisk:"Medium",avoid:false,ltmEbitda:143.8,pct52w:0.565,
   desc:"Bank operating system built on the Salesforce platform for loan origination, account opening, and relationship management at commercial banks and credit unions. The SoR for commercial lending workflows at community and regional banks globally. Usage-based model tied to loan origination volumes and active banker seats.",
   sd:{sharePrice:18.46,sharesOut:121.23,marketCap:2237.9,netDebt:137.7},
   thesis:["nCino is a Salesforce ISV overlay for bank lending — the core IP is workflow configuration and bank-specific data models on Salesforce infrastructure nCino does not own","The Salesforce dependency is the deal question: nCino pays ~15-20% of revenue as platform fees, Salesforce controls the roadmap, and Financial Services Cloud competes directly with nCino's relationship management","8% growth reflects saturation in US community banking — international expansion (APAC, EMEA) is the growth vector but adds implementation complexity and longer sales cycles compressing near-term margins","At 3.6x NTM and ~$2.4B TEV this is right-sized for mid-market PE — Thoma Bravo, Vista, or Insight could execute a take-private without club deal complexity","Kill-the-deal risk: if Salesforce launches a native lending origination module (as it has with insurance and wealth management), nCino's entire platform becomes redundant overnight"],
   aiRationale:["The real AI risk is Salesforce Einstein/Agentforce not external competitors — Salesforce is embedding AI directly into Financial Services Cloud potentially making nCino's workflow layer unnecessary","AI-powered credit decisioning tools (Zest AI, Upstart bank partnerships) could bypass nCino's origination workflow entirely if banks adopt AI-first underwriting pipelines","Bank regulators require explainable AI in lending decisions which actually protects nCino's structured workflow approach over black-box AI alternatives near term","Usage-based pricing tied to loan origination volume means if AI accelerates loan processing speed nCino could see more throughput per bank — a potential tailwind","Upgraded to Medium risk: the Salesforce platform dependency means nCino's AI future is largely controlled by Salesforce's strategic decisions not its own product roadmap"]},
  {hidden:true,name:"Flywire",vertical:"Education / Healthcare",bucket:"Hybrid VSaaS",hq:"US",sor:false,seat:false,pricing:"Usage-Based",peOwned:false,tev:1206,ntmRev:747,growth:19,gm:61,ebitda:23,cagr:17,ntmRevX:1.6,peFit:"Medium",aiRisk:"Medium",avoid:false,ltmEbitda:131,pct52w:0.79,
   desc:"Global payment platform handling complex cross-border and domestic payments for education, healthcare, and travel verticals. Processes tuition payments, medical bills, and travel invoices with currency conversion and reconciliation built in. Usage-based transaction fees on payment volumes with strong institutional relationships at universities and hospitals.",
   sd:{sharePrice:11.64,sharesOut:134.1,marketCap:1561,netDebt:-355},
   thesis:["1.7x NTM for 18% growth is mispriced vs. Adyen (30x) and Stripe (private ~20x) — vertical-embedded payment processors trade at massive premiums once investors recognize durable institutional lock-in","Real moat is not payments but FX reconciliation + SIS/HMS integration depth: switching requires re-certifying 50+ currency corridors and re-integrating with PeopleSoft, Ellucian, or Epic billing — a 6-12 month project no CFO will undertake","Immigration policy is the single biggest risk: ~50% of revenue is education, and F-1 visa restrictions under a protectionist administration could crater international enrollment at partner universities overnight","Exit path is compelling — Fiserv, Global Payments, or Worldline would pay 5-7x revenue to acquire vertical-specific institutional payment rails they cannot build organically given decade-long university procurement cycles","Margin expansion from 22% to 32%+ is real but depends on geographic mix: South Asia corridors carry 3-4x the FX take rate of domestic US — execution on international expansion is the margin story, not just operating leverage"],
   aiRationale:["AI fraud detection and smart routing are already table-stakes features Flywire has shipped — these enhance rather than displace the core value proposition of institutional-grade FX reconciliation","The actual AI risk is indirect: AI enrollment advisors and automated credentialing could reduce international student mobility by enabling remote study — fewer cross-border students means fewer cross-border payments","Stripe's AI-powered adaptive acceptance and Adyen's AI routing improvements narrow the gap on payment optimization, but neither has invested in vertical integrations (SIS, HMS, PMS) that drive institutional lock-in","ChatGPT-style interfaces for healthcare billing could disintermediate patient payment portals — but Flywire's value is upstream in payer-to-provider reconciliation, not patient-facing UI","Medium risk overall: AI more likely a tailwind (better FX pricing, fraud reduction) than headwind, but indirect effects on international student mobility and remote credentialing warrant monitoring"]},,
{hidden:true,name:"Toast",vertical:"Restaurant Tech",bucket:"Hybrid VSaaS",hq:"US",sor:true,seat:false,pricing:"Usage-Based",peOwned:false,tev:14326,ntmRev:7735,growth:20,gm:28,ebitda:11,cagr:19.1,ntmRevX:1.85,peFit:"Medium",aiRisk:"Medium",avoid:false,ltmEbitda:673,pct52w:0.54,
   desc:"Restaurant OS combining POS, payments, payroll, and ordering software for 120,000+ US restaurants — usage-based fintech toll on restaurant GMV with deep hardware and software lock-in.",
   sd:{sharePrice:26.51,sharesOut:615.5,marketCap:16317,netDebt:-1991},
   thesis:["Usage-based payments revenue grows with restaurant GMV at ~1.85x NTM vs SaaS multiples — a deeply undervalued fintech-software hybrid","Restaurant POS migrations are 12-18 month projects involving hardware tearout, staff retraining, and menu reconfiguration — extreme switching costs in a segment where operators fear revenue downtime","Full stack (POS + payroll + payables + capital) creates network density where disintermediation requires rebuilding 5+ product categories simultaneously","International and enterprise expansion represent nascent but clear growth vectors beyond the current US SMB installed base"],
   aiRationale:["AI order optimization and predictive inventory are enhancement features that increase ARPU within Toast's platform","Restaurant-specific AI cannot route around PCI-certified hardware — any AI disruption still flows through Toast's payment rails","Voice AI ordering could actually increase Toast's transaction volume as faster order throughput raises restaurant GMV","Medium risk: AI is primarily a product extension within Toast's platform, not a structural threat to the payment toll business model"]},
  {hidden:true,name:"Okta",vertical:"Identity & Access Mgmt",bucket:"Pure-Play VSaaS",hq:"US",sor:true,seat:true,pricing:"Seat-Based",peOwned:false,tev:12251,ntmRev:3231,growth:9,gm:82,ebitda:27,cagr:9.3,ntmRevX:3.79,peFit:"High",aiRisk:"Low",avoid:false,ltmEbitda:802,pct52w:0.62,
   desc:"Identity and access management platform providing SSO, MFA, and lifecycle management for workforce and customer identity — the SoR for enterprise identity workflows across 19,000+ customers globally.",
   sd:{sharePrice:78.71,sharesOut:183.6,marketCap:14455,netDebt:-2204},
   thesis:["Identity is the last layer of enterprise infrastructure a security team will rip out — SSO and MFA integrations across 7,000+ application connectors create migration costs that no CISO will willingly absorb","9% growth on $3B ARR with 82% GM and 27% EBITDA is a durable compounding engine — at 3.8x NTM this is structurally cheap vs the mission-criticality of identity in every enterprise security stack","Microsoft Entra (formerly Azure AD) is the primary competitive threat, but Okta's heterogeneous-environment advantage (non-Microsoft apps, multi-cloud) remains durable for enterprises not standardizing on the Microsoft stack","Workforce Identity is the core, Customer Identity (CIAM) is the growth lever — the CIAM market is 3x larger and Okta's Auth0 acquisition gives it a developer-first CIAM platform competing directly with AWS Cognito and Google Identity"],
   aiRationale:["Identity is AI-proof by definition — every AI tool, agent, and automation workflow requires authenticated access, expanding the universe of identities Okta manages without any competitive substitution risk","AI agents (Copilot, Claude, autonomous workflows) require machine identity management — Okta's machine identity product is positioned to benefit from AI proliferation, not disrupted by it","Microsoft is building AI-native identity features into Entra that could narrow Okta's heterogeneous-environment advantage — the risk is Microsoft bundling identity as a free feature of M365","Low risk: identity management is the infrastructure layer that enables AI rather than being disrupted by it — Okta's SoR position compounds with the growth of identities to manage"]},
  {hidden:true,name:"DigitalOcean",vertical:"Cloud Infrastructure",bucket:"Hybrid VSaaS",hq:"US",sor:false,seat:false,pricing:"Usage-Based",peOwned:false,tev:11695,ntmRev:1177,growth:22,gm:54,ebitda:37,cagr:25.6,ntmRevX:9.94,peFit:"Medium",aiRisk:"Medium",avoid:false,ltmEbitda:382,pct52w:0.99,
   desc:"Developer-focused cloud infrastructure platform providing compute, managed databases, Kubernetes, and AI/ML services for startups and SMBs — a simplified AWS alternative with flat pricing and developer-first tooling.",
   sd:{sharePrice:85.78,sharesOut:124.2,marketCap:10653,netDebt:1041},
   thesis:["DigitalOcean's GPU cloud and AI/ML infrastructure is experiencing explosive demand from AI startups that cannot navigate AWS/Azure complexity — DOCN GPU revenue is growing at 100%+ from a small base","Simplified pricing, 5-minute deployments, and flat-rate predictable billing create genuine switching friction for the SMB developer segment that AWS cannot replicate without cannibalizing its complexity-premium pricing model","At 10x NTM the stock reflects AI infrastructure optimism — but the underlying cloud commodity business growing 20%+ with 37% EBITDA margin is actually well-supported by cash flow","Key risk: AWS, GCP, and Azure targeting SMBs directly through simplified management consoles (AWS Lightsail, Google Cloud Run) would commoditize DigitalOcean's positioning over time"],
   aiRationale:["AI tailwind: GPU cloud demand from AI startups that choose DigitalOcean's simpler deployment vs. AWS SageMaker complexity is a direct growth driver","The risk is that AI reduces the need for DigitalOcean's differentiation — if AI-powered DevOps tools (Copilot, Cursor) make AWS as easy to deploy as DigitalOcean, the simplicity moat erodes","Serverless and containerized compute are standard across all cloud providers — DigitalOcean's managed Kubernetes competes directly with AWS EKS and GCP GKE with no structural advantage","Medium risk: AI is both a demand tailwind (GPU workloads) and a competitive threat (AI-simplified cloud management) — net positive near term, uncertain long term"]},
  {name:"HubSpot",vertical:"Marketing & CRM",bucket:"Pure-Play VSaaS",hq:"US",sor:false,seat:true,pricing:"Seat-Based",peOwned:false,tev:10253.7,ntmRev:3881.8,growth:18,gm:85,ebitda:24,cagr:17.0,ntmRevX:2.64,peFit:"High",aiRisk:"Medium",avoid:false,ltmEbitda:771.3,pct52w:0.331,
   desc:"All-in-one CRM, marketing automation, sales, and customer service platform used by 240,000+ SMB and mid-market companies — the SoR for revenue operations at companies that cannot afford or operationalize Salesforce.",
   sd:{sharePrice:222.49,sharesOut:54.21,marketCap:12061.5,netDebt:-1807.8},
   thesis:["2.6x NTM for 18% growth with 85% GM is statistically cheap for the SMB CRM market leader — HubSpot is where millions of marketing and sales workflows live, creating multi-product data lock-in that transcends any single feature","The SMB and mid-market CRM market is structurally underserved by Salesforce — HubSpot's ease-of-implementation and all-in-one pricing captures the 100-10,000 employee segment where Salesforce's complexity and cost are prohibitive","Multi-hub adoption (Marketing + Sales + Service + CMS) creates compounding switching costs as revenue operations data accumulates across products — customers with 3+ hubs have near-zero churn","Breeze AI (AI content generation, prospect research, email personalization) is already driving ARPU expansion — AI is a natural upsell within HubSpot's existing user base"],
   aiRationale:["HubSpot Breeze AI is built into the platform — AI content generation, email drafting, and prospect enrichment are premium features that expand rather than threaten the CRM's value","The risk is Salesforce Einstein and Microsoft Dynamics AI catching up in the mid-market segment — but HubSpot's ease-of-use advantage likely widens with AI-assisted onboarding vs. Salesforce's complexity","AI-generated content could reduce the number of marketers needed per company, compressing HubSpot's seat count — but if AI makes each marketer manage 2x the campaigns, ARPU per seat expands","Medium risk: AI is primarily an ARPU expansion lever within HubSpot's platform — the structural risk is AI reducing marketing team headcount, which compresses new logo seat counts"]},
  {hidden:true,name:"Figma",vertical:"Design & Collaboration",bucket:"Pure-Play VSaaS",hq:"US",sor:false,seat:true,pricing:"Seat-Based",peOwned:false,tev:11359,ntmRev:1439,growth:30,gm:83,ebitda:9,cagr:24.9,ntmRevX:7.89,peFit:"Medium",aiRisk:"High",avoid:false,ltmEbitda:137,pct52w:0.17,
   desc:"Browser-based collaborative design platform used by 4M+ designers for UI/UX design, prototyping, and developer handoff — the SoR for product design workflows at technology companies globally.",
   sd:{sharePrice:21.14,sharesOut:616.1,marketCap:13025,netDebt:-1666},
   thesis:["30% growth at 8x NTM appears expensive until you recognize Figma owns the product design SoR at virtually every technology company — switching means migrating years of component libraries, design systems, and developer handoff workflows built on Figma's APIs","At only 9% EBITDA, Figma is significantly under-earning its growth rate — a PE buyer can rationalize the massive SBC expense and expand margins to 25%+ while maintaining growth through the installed base","Figma AI (AI design generation, auto-layout, content replacement) represents both an ARPU expansion opportunity and a product defense — native AI features reduce incentive to switch to AI-first design tools","The post-Adobe break-up fee ($1B) gives Figma $1.7B net cash and no strategic overhang — a clean standalone company at an attractive entry point given the 17% pullback from IPO levels"],
   aiRationale:["The existential AI risk: if AI can generate high-fidelity UI designs from text prompts (Galileo AI, Uizard, Vercel v0), the design-from-scratch workflow that Figma serves could be disrupted — designers become prompt curators not screen builders","Counter-argument: Figma's value is collaboration, design system management, and developer handoff — not just pixel creation; these workflows require human judgment and iteration that AI generation does not eliminate","Figma AI (generative design, AI rewriting) is the platform's response — building AI generation into the existing workflow rather than letting AI-native tools capture the use case","High risk: design is one of the clearest AI substitution categories — AI-generated UI reduces the hours per designer but Figma's collaboration and system management layer remains valuable for teams"]},
  {hidden:true,name:"Rubrik",vertical:"Data Protection",bucket:"Pure-Play VSaaS",hq:"US",sor:false,seat:true,pricing:"Seat-Based",peOwned:false,tev:10585,ntmRev:1663,growth:23,gm:81,ebitda:2,cagr:22.8,ntmRevX:6.37,peFit:"Medium-High",aiRisk:"Low",avoid:false,ltmEbitda:30,pct52w:0.49,
   desc:"Data security and backup platform protecting enterprise data across hybrid cloud environments with ransomware recovery, cyber resilience, and data posture management — combining backup-as-a-service with security analytics.",
   sd:{sharePrice:48.97,sharesOut:227.3,marketCap:11130,netDebt:-545},
   thesis:["23% growth transitioning from hardware-bundled backup to pure subscription SaaS — Rubrik's ARR is significantly under-earning EBITDA as the company invests in cloud transition, creating a margin expansion story for PE","Cyber resilience (air-gapped backups, immutable storage, ransomware recovery SLAs) is converging backup with security — Rubrik's data observability platform is positioned for the intersection of CIO backup budget and CISO security budget","The company's IPO in April 2024 validated the business model — but the current 6.4x NTM on 23% growth with 81% GM is approximately where take-private math could work once subscription revenue backlog converts to recognized revenue","Ransomware recovery is the key enterprise pain point: CISOs and CIOs are jointly budgeting for recovery capabilities, giving Rubrik access to both budget owners simultaneously"],
   aiRationale:["Data backup and recovery is AI-resistant by design — it requires immutable copies and regulatory compliance that AI cannot shortcut","AI-powered ransomware detection and data classification (Rubrik Radar) is already a product feature driving ARPU expansion within the security buyer","AI cyberattacks are more sophisticated, making clean recovery copies more valuable — Rubrik benefits from the AI-threat environment, not harmed by it","Low risk: data protection is one of the clearest AI-as-tailwind categories — more AI infrastructure means more data to protect, and AI-generated threats increase demand for Rubrik's cyber resilience capabilities"]},
  {name:"Dynatrace",vertical:"Observability & APM",bucket:"Pure-Play VSaaS",hq:"US",sor:false,seat:false,pricing:"Usage-Based",peOwned:false,tev:9852.5,ntmRev:2324.9,growth:15,gm:84,ebitda:31,cagr:14.94,ntmRevX:4.24,peFit:"High",aiRisk:"Low",avoid:false,ltmEbitda:612.8,pct52w:0.629,
   desc:"Full-stack observability and AIOps platform providing application performance monitoring, infrastructure monitoring, and security analytics — the SoR for enterprise observability workflows with Davis AI engine at the core.",
   sd:{sharePrice:35.6,sharesOut:310.13,marketCap:11040.8,netDebt:-1188.3},
   thesis:["4.2x NTM for 15% growth with 31% EBITDA and 84% GM is the best quality-adjusted multiple in the observability segment — Dynatrace's Davis AI engine has been embedded in enterprise observability for a decade, creating deep workflow dependencies","Full-stack observability (APM + infrastructure + logs + security) in a single platform commands premium pricing vs. point solutions — Dynatrace can out-bundle Datadog in regulated enterprises where a single-vendor security and compliance posture matters","Usage-based pricing means cloud migration tailwinds flow directly into Dynatrace revenue — as enterprises move more workloads to cloud, monitoring volumes expand naturally","Davis AI (causal AI for root cause analysis) is not generative AI hype — it's a decade-old production system that Dynatrace customers have operationalized in their NOC workflows"],
   aiRationale:["Davis AI is already deeply embedded in enterprise NOC workflows — AI is Dynatrace's core product, not a future threat; AI-powered observability is a revenue driver","Datadog's AI monitoring capabilities and Cisco AppDynamics are competitive threats — but Dynatrace's regulatory enterprise focus (financial services, healthcare, government) creates procurement barriers that usage-based startups struggle to replicate","The AI infrastructure monitoring opportunity is significant: AI workloads require GPU monitoring, inference latency tracking, and model drift detection — Dynatrace is positioned to expand observability into AI infrastructure","Low risk: Dynatrace's AI-native platform is strengthened by AI adoption trends — more AI workloads require more observability infrastructure, and Davis AI's causal AI differentiation is a decade-old production advantage"]},
  {hidden:true,name:"Nutanix",vertical:"Cloud Infrastructure",bucket:"Pure-Play VSaaS",hq:"US",sor:false,seat:true,pricing:"Seat-Based",peOwned:false,tev:10142,ntmRev:3063,growth:12,gm:88,ebitda:25,cagr:12.2,ntmRevX:3.31,peFit:"High",aiRisk:"Low",avoid:false,ltmEbitda:659,pct52w:0.46,
   desc:"Hyperconverged infrastructure and hybrid cloud platform providing compute, storage, and networking virtualization for enterprise data centers — transitioning from hardware-bundled appliances to pure SaaS subscription with 88% gross margins.",
   sd:{sharePrice:38.01,sharesOut:280.7,marketCap:10670,netDebt:-528},
   thesis:["Nutanix completed its hardware-to-SaaS transition — 88% gross margins on a $3B revenue base growing 12% is an exceptional business that the market is pricing at only 3.3x NTM, heavily discounting the transition year","Hyperconverged infrastructure is the de facto standard for private cloud at enterprise — ripping out Nutanix means rebuilding networking, storage, and compute virtualization simultaneously; migration projects take 12-18 months","The Dell OEM partnership extends Nutanix's distribution into the largest enterprise hardware sales channel — Nutanix's software riding Dell's enterprise relationships provides a durable go-to-market advantage","At 13x NTM EBITDA this is a PE-style multiple for one of the highest-quality infrastructure SaaS franchises — a take-private with 5-6x leverage creates 25%+ IRR from EBITDA growth alone"],
   aiRationale:["AI infrastructure requires high-performance on-premises compute for data sovereignty and latency-sensitive workloads — Nutanix's HCI is well-positioned for enterprise AI deployments that cannot run entirely in the public cloud","VMware's acquisition by Broadcom is a massive tailwind: Broadcom's aggressive VMware pricing is driving enterprises to evaluate Nutanix as a VMware alternative, creating a multi-year competitive displacement opportunity","The risk is that enterprises consolidate on AWS/Azure/GCP for all workloads — but regulated industries (finance, healthcare, government) require on-premises infrastructure that public cloud cannot replace","Low risk: enterprise infrastructure is the foundational layer where AI workloads increasingly run — Nutanix's hybrid cloud positioning benefits from AI driving more enterprise compute requirements"]},
  {name:"DocuSign",vertical:"eSignature & CLM",bucket:"Pure-Play VSaaS",hq:"US",sor:true,seat:true,pricing:"Seat-Based",peOwned:false,tev:9114,ntmRev:3558.7,growth:8,gm:82,ebitda:34,cagr:8.2,ntmRevX:2.56,peFit:"High",aiRisk:"Medium",avoid:false,ltmEbitda:1095,pct52w:0.487,
   desc:"eSignature and contract lifecycle management platform processing 1.5B+ agreements annually across 1.5M customers — the de facto SoR for digital agreement execution with near-universal brand recognition in the enterprise contract workflow.",
   sd:{sharePrice:45.74,sharesOut:218.2,marketCap:9981,netDebt:-867},
   thesis:["2.6x NTM Revenue for the eSignature SoR at 82% GM and 34% EBITDA is a durable cash flow harvesting business — DocuSign generates $1.1B LTM EBITDA from a platform embedded in every major enterprise's procurement, HR, and legal workflow","IAM (Intelligent Agreement Management) is the real growth catalyst — converting DocuSign from an execution tool to an AI-powered agreement intelligence platform that mines data from billions of signed contracts","At $9.1B TEV, a PE buyer pays 8.3x LTM EBITDA for the eSignature market leader — 6x leverage creates a 25%+ IRR even at 8% growth if exit multiple holds flat","Adobe Acrobat Sign and DocuSign are in a pricing war for SMB eSignature — but enterprise CLM is the battleground where DocuSign's 1.5M customer installed base creates an unprecedented training dataset for agreement AI"],
   aiRationale:["IAM (Intelligent Agreement Management) uses AI to analyze 1.5B+ executed agreements — proprietary training data from real-world contracts is a defensible AI moat that no startup can replicate without DocuSign's scale","The risk: if AI makes agreement execution commoditized (any PDF tool can e-sign), DocuSign's value migrates to analytics — which requires successfully converting its installed base to pay for AI features on top of e-signature","Adobe, Ironclad, and Conga are all building AI-enhanced CLM — but none has DocuSign's 1.5B agreement corpus or 1.5M customer distribution","Medium risk: eSignature itself faces commoditization but IAM creates a viable AI-powered upsell path — execution on the agreement intelligence pivot is the key variable"]},
  {name:"Procore",vertical:"Construction Tech",bucket:"Pure-Play VSaaS",hq:"US",sor:true,seat:true,pricing:"Seat-Based",peOwned:false,tev:8030.7,ntmRev:1553.6,growth:13,gm:84,ebitda:25,cagr:12.86,ntmRevX:5.17,peFit:"High",aiRisk:"Low",avoid:false,ltmEbitda:319.0,pct52w:0.697,
   desc:"Construction management platform providing project management, financial management, quality, and safety workflows for general contractors and owners — the SoR for construction project data with deep integration into subcontractor networks.",
   sd:{sharePrice:55.44,sharesOut:158.72,marketCap:8799.2,netDebt:-768.5},
   thesis:["5.2x NTM for the construction SoR at 84% GM and 25% EBITDA — Procore has no credible competitor at its scale for general contractor project management; Autodesk Construction Cloud is the only meaningful alternative and primarily serves different workflows","Construction project data accumulated over years (costs, schedules, RFIs, submittals, punch lists) creates switching costs that no other vertical has — a GC's institutional knowledge lives in Procore","International expansion (Europe, APAC, Middle East) is the growth vector — construction is a global industry and Procore's US platform playbook is being replicated in international markets with early traction","Procore Copilot (AI-powered daily logs, meeting summaries, RFI response suggestions) expands ARPU without adding seats — AI features monetized as premium tiers within the existing customer base"],
   aiRationale:["Construction is one of the last industries to digitize — AI will accelerate this transition, and Procore is positioned to capture the AI spend as the system of record for construction data","The risk is BIM-native platforms (Autodesk, Bentley) embedding construction management features that compete with Procore at the design-build intersection","AI-powered project scheduling optimization and predictive cost overrun detection are high-value tools that construction owners will pay for — Procore's position as data custodian is the competitive advantage","Low risk: construction workflows require physical-world coordination that AI enhances but cannot automate — Procore's SoR position compounds with AI-enabled efficiency improvements"]},
  {hidden:true,name:"SailPoint",vertical:"Identity & Access Mgmt",bucket:"Pure-Play VSaaS",hq:"US",sor:true,seat:true,pricing:"Seat-Based",peOwned:true,tev:7263,ntmRev:1304,growth:19,gm:78,ebitda:19,cagr:18.5,ntmRevX:5.57,peFit:"High",aiRisk:"Low",avoid:true,ltmEbitda:209,pct52w:0.55,
   desc:"Identity security platform providing identity governance, access management, and privileged access for enterprise identity lifecycle management — taken private by Thoma Bravo in 2022 and re-IPO'd in 2024.",
   sd:{sharePrice:13.24,sharesOut:575.9,marketCap:7624,netDebt:-361},
   thesis:["Identity governance (IGA) is the compliance-driven segment of the identity market — SailPoint's SoR for user provisioning and access certification at large enterprises is deeply embedded in audit, SOX, and regulatory workflows","Thoma Bravo's operational playbook (go-to-market optimization, cloud transition acceleration) created a cleaner platform post-take-private — the re-IPO presents an opportunity to acquire the improved asset at reasonable multiples","19% growth at 5.6x NTM with 78% GM represents reasonable value for an enterprise identity security platform with improving unit economics post-TB's operational work","The risk of another PE take-private is limited by the existing TB overhang — strategic acquirers (Microsoft, CrowdStrike, Palo Alto) would pay significant premium for enterprise IGA assets"],
   aiRationale:["Identity governance is AI-resistant — compliance and audit requirements mandate human-reviewed access certifications that AI cannot approve autonomously","AI agents require identity governance more than humans — machine identities, AI service accounts, and automated workflow permissions are expanding SailPoint's addressable market","Microsoft Entra ID Governance is building competitive IGA features — but SailPoint's depth in complex enterprise role hierarchies, SOD controls, and heterogeneous environments remains differentiated","Low risk: identity governance is regulatory infrastructure where AI creates more identities to manage (machine, AI agent) without displacing the human oversight requirement"]},
  {hidden:true,name:"ServiceTitan",vertical:"Field Service Mgmt",bucket:"Pure-Play VSaaS",hq:"US",sor:true,seat:true,pricing:"Seat-Based",peOwned:false,tev:6682.7,ntmRev:1152.6,growth:17,gm:75,ebitda:16,cagr:15.57,ntmRevX:5.8,peFit:"High",aiRisk:"Low",avoid:false,ltmEbitda:155.2,pct52w:0.497,
   desc:"Field service management platform for HVAC, plumbing, electrical, and other home services businesses — the SoR for trade contractor operations combining scheduling, dispatch, invoicing, payments, and financing.",
   sd:{sharePrice:64.31,sharesOut:110.58,marketCap:7111.6,netDebt:-428.9},
   thesis:["ServiceTitan is the vertical SaaS SoR for a $600B+ US home services market that is structurally fragmented and transitioning from paper-based operations — the installed base has multi-year data lock-in with no credible competitor at scale","Usage of ServiceTitan expands as contractors grow — more technicians, more invoices, more financing applications compound naturally with contractor growth, creating revenue that tracks industry employment rather than software seats","The fintech layer (customer financing, payment processing, capital) is already 30%+ of revenue and growing 2x software — ServiceTitan is becoming the financial infrastructure for home services contractors","At $6.6B TEV, this is the right size for mid-market PE with a clear playbook: acquire, expand into adjacent verticals (HVAC-adjacent commercial services), and build an M&A roll-up strategy in fragmented SMB field service"],
   aiRationale:["AI scheduling optimization and predictive maintenance recommendations are already ServiceTitan features — AI enhances the platform without disrupting its SoR position","Voice AI customer booking and AI dispatch routing could increase technician utilization and average revenue per truck — both are upside scenarios for ServiceTitan's usage-based revenue","The risk is AI-native competitors (like Samsara for field operations) building a greenfield platform — but ServiceTitan's installed base and payment network create switching costs that a new entrant cannot overcome","Low risk: field service AI enhances dispatch efficiency and customer experience within ServiceTitan's platform — the trade contractor segment is not at risk of AI substitution for the actual physical work"]},
  {name:"Paycom",vertical:"HR & Payroll",bucket:"Pure-Play VSaaS",hq:"US",sor:true,seat:false,pricing:"Usage-Based",peOwned:false,tev:6704.0,ntmRev:2237.4,growth:7,gm:84,ebitda:44,cagr:6.72,ntmRevX:3.0,peFit:"High",aiRisk:"Low",avoid:false,ltmEbitda:907.8,pct52w:0.478,
   desc:"Single-database HCM platform covering payroll, talent management, benefits administration, and workforce management for US mid-market employers — differentiated by a fully unified data model vs. multi-module competitors.",
   sd:{sharePrice:126.93,sharesOut:55.73,marketCap:7074.0,netDebt:-370.0},
   thesis:["44% EBITDA margins at 84% GM on a $2.2B revenue base is among the highest profitability profiles in the screen — Paycom's single-database architecture creates structural cost advantages that multi-module competitors (ADP, Ceridian) cannot match without re-architecting their platforms","Beti (employee self-service payroll verification) is genuinely disruptive — shifting payroll accuracy responsibility to employees reduces payroll processing errors and client service costs simultaneously, a moat that competitors would need years to replicate","At 3.0x NTM Revenue and 7.1x NTM EV/EBITDA, Paycom is valued like a no-growth utility despite 7% organic growth — the market is wrong on both the duration and defensibility of the cash flows","Key risk: Paycom's voluntary client attrition increased in 2024 as Beti implementation caused friction — execution on the product transition is the near-term variable that determines if 7% becomes 10%+"],
   aiRationale:["HR and payroll workflows require jurisdiction-specific tax tables, union rules, and compliance logic that AI cannot automate without the underlying regulatory data infrastructure Paycom maintains","Beti AI (AI-powered payroll anomaly detection, real-time error correction) is already a product feature that strengthens Paycom's differentiation vs. competitors with weekly payroll batch processing","The risk is AI-native HR platforms (Rippling, Deel) building payroll capabilities with AI-first architecture — but regulated payroll requires years of trust-building with employers and state tax authorities","Low risk: payroll is regulatory infrastructure where AI improves accuracy within Paycom's platform — switching risk from AI-native entrants is limited by the compliance and data complexity barriers"]},
  {hidden:true,name:"Paylocity",vertical:"HR & Payroll",bucket:"Pure-Play VSaaS",hq:"US",sor:true,seat:false,pricing:"Usage-Based",peOwned:false,tev:5946,ntmRev:1840,growth:8,gm:75,ebitda:36,cagr:8.6,ntmRevX:3.23,peFit:"High",aiRisk:"Low",avoid:false,ltmEbitda:616,pct52w:0.54,
   desc:"Cloud HCM platform providing payroll, HR, talent, and workforce management for mid-market US employers — a modern alternative to ADP and Ceridian with community-driven engagement features and usage-based pricing.",
   sd:{sharePrice:108.04,sharesOut:55.8,marketCap:6027,netDebt:-81},
   thesis:["36% EBITDA at 75% GM on $1.8B revenue growing 8% — Paylocity's cash flow profile is exceptional for a mid-market HCM platform, and 3.2x NTM represents a significant discount to its intrinsic FCF value","Community (Paylocity's employee social engagement module) creates stickiness beyond payroll — HR teams that use Community for company-wide communications, recognition, and surveys accumulate data that is painful to migrate","Paylocity's unified data model connects payroll, time, talent, and engagement data in a single system — multi-product penetration is 65%+ of customers, creating a revenue base that is far stickier than single-module payroll customers","At $6B TEV this is right-sized for PE — Thoma Bravo, Insight, or similar could execute a take-private, rationalize S&M, and grow FCF at 10-12% per year creating mid-20s IRR"],
   aiRationale:["HR payroll compliance is AI-resistant — jurisdiction-specific tax calculations, PTO accrual rules, and benefits deductions require regulatory data that AI generates from but cannot replace","Paylocity's community features and AI-powered performance management tools (self-reviews, AI feedback suggestions) expand ARPU without threatening the core payroll SoR","The risk is Rippling and Deel offering AI-native HR+payroll platforms that attract new logo wins, compressing Paylocity's growth rate in a competitive mid-market segment","Low risk: Paylocity's payroll SoR position is durable and community features create additional switching cost layers that complement the regulatory compliance moat"]},
  {hidden:true,name:"Fastly",vertical:"CDN & Edge Computing",bucket:"Hybrid VSaaS",hq:"US",sor:false,seat:false,pricing:"Usage-Based",peOwned:false,tev:5469,ntmRev:730,growth:14,gm:63,ebitda:16,cagr:12.3,ntmRevX:7.5,peFit:"Low-Medium",aiRisk:"High",avoid:true,ltmEbitda:86,pct52w:0.98,
   desc:"Edge cloud platform providing content delivery, DDoS protection, and serverless computing — a developer-friendly CDN that has struggled to scale against AWS CloudFront, Cloudflare, and Akamai.",
   sd:{sharePrice:29.06,sharesOut:188.2,marketCap:5469,netDebt:0},
   thesis:["Avoid: negative UFCF ($-43M in 2026) despite 16% EBITDA margins reflects significant capex intensity and FCF conversion well below the level required for a viable LBO","7.5x NTM for a CDN business with negative free cash flow and 14% growth is a premium valuation for a company losing competitive position to Cloudflare (which offers similar edge capabilities plus security)","Cloudflare's Supercloud strategy is an existential threat — Cloudflare's network (320+ cities vs. Fastly's 70+) combined with zero-trust security, R2 storage, and Workers serverless creates a full-stack platform Fastly cannot match","The positive case: significant M&A consolidation value — Fastly's developer adoption and real-time CDN architecture could attract Akamai or a cloud provider, but this is a sale thesis not an operational thesis"],
   aiRationale:["Edge computing and CDN are being commoditized by AWS CloudFront, Cloudflare Workers, and Vercel Edge — Fastly's technical differentiation is narrowing as hyperscalers invest in edge infrastructure","Cloudflare's AI Gateway and AI inference at the edge (Cloudflare Workers AI) is a competitive threat to Fastly's edge compute use cases as AI inference shifts to the network edge","Fastly's Compute@Edge serverless platform positions it for AI inference workloads — this is the most defensible long-term growth vector if customers choose Fastly's edge for latency-sensitive AI applications","High risk: CDN is commoditizing, FCF is negative, and Cloudflare is executing a platform strategy that Fastly cannot match — avoid"]},
  {hidden:true,name:"JFrog",vertical:"DevOps & MLOps",bucket:"Pure-Play VSaaS",hq:"US",sor:false,seat:false,pricing:"Usage-Based",peOwned:false,tev:5451,ntmRev:652,growth:18,gm:83,ebitda:19,cagr:17.0,ntmRevX:8.37,peFit:"Medium",aiRisk:"Medium",avoid:false,ltmEbitda:101,pct52w:0.68,
   desc:"Universal artifact management platform (Artifactory) providing binary repository management, software supply chain security, and MLOps capabilities — the SoR for software artifact lifecycle management in enterprise DevOps workflows.",
   sd:{sharePrice:46.93,sharesOut:131.2,marketCap:6156,netDebt:-705},
   thesis:["JFrog Artifactory is the default binary repository for enterprise DevOps — every software release pipeline stores build artifacts in Artifactory, creating a central dependency that is deeply embedded in CI/CD infrastructure","8.4x NTM appears expensive until you recognize JFrog's position at the center of software supply chain security — post-SolarWinds and Log4Shell, artifact integrity verification and software composition analysis are mandatory enterprise compliance requirements","MLflow + JFrog Catalog positions the platform for ML model versioning and registry — the same artifact management patterns that work for software packages apply to ML models, expanding TAM without new sales motions","18% growth with 83% GM and 19% EBITDA — the margin expansion story is compelling as enterprise contracts shift from perpetual to SaaS subscription, improving ARPU and predictability"],
   aiRationale:["Software supply chain security is an AI-amplified concern — AI-generated code that includes unverified packages creates demand for JFrog's Xray (composition analysis) and binary scanning capabilities","The risk is GitHub Advanced Security and Dependabot expanding into binary artifact security — Microsoft's distribution advantage could narrow JFrog's differentiation in the $10B+ DevSecOps market","AI model deployment introduces a new artifact type (ML models) that requires the same versioning, scanning, and lifecycle management as software packages — JFrog's ML model registry is positioned for this growing use case","Medium risk: JFrog's core position is well-defended but the platform must successfully expand into ML model management before a purpose-built MLOps vendor (MLflow, Weights & Biases) commoditizes artifact management for AI"]},
  {hidden:true,name:"Klaviyo",vertical:"Marketing Automation",bucket:"Pure-Play VSaaS",hq:"US",sor:false,seat:false,pricing:"Usage-Based",peOwned:false,tev:5233,ntmRev:1580,growth:22,gm:75,ebitda:16,cagr:20.8,ntmRevX:3.31,peFit:"High",aiRisk:"Medium",avoid:false,ltmEbitda:203,pct52w:0.52,
   desc:"Email and SMS marketing platform purpose-built for ecommerce brands — integrates deeply with Shopify, WooCommerce, and Magento to enable data-driven customer segmentation and automated revenue attribution.",
   sd:{sharePrice:19.46,sharesOut:323.7,marketCap:6298,netDebt:-1066},
   thesis:["Klaviyo's Shopify-native architecture creates deep integration lock-in — the CDP and revenue attribution logic embedded in Shopify Plus merchant workflows cannot be easily replaced without rebuilding the ecommerce analytics stack","22% growth at 3.3x NTM with 75% GM and 16% EBITDA is genuinely cheap for the ecommerce marketing SoR — Klaviyo's usage-based model grows with customer GMV, not headcount, creating compounding revenue from merchant success","The ecommerce marketing category is consolidating around Klaviyo — Mailchimp (Intuit), Attentive, and Braze compete but none has Klaviyo's depth of Shopify integration or native CDP with purchase data attribution","Profitability inflection from 16% to 25%+ EBITDA is achievable as enterprise goes-to-market (Klaviyo's $500K+ ACV segment) provides natural operating leverage on fixed S&M costs"],
   aiRationale:["Klaviyo AI (predictive segmentation, AI send-time optimization, product recommendations) are already production features that improve deliverability and conversion — AI enhances Klaviyo's value proposition","The risk: generative AI reduces the skill barrier for email marketing, potentially commoditizing Klaviyo's template and workflow automation value by enabling any merchant to create sophisticated campaigns without specialized knowledge","Shopify's native email product (Shopify Email) is a direct competitive threat — Shopify could bundle basic email marketing into its monthly fee, pressuring Klaviyo's SMB revenue while Klaviyo defends upmarket","Medium risk: AI is a product enhancement within Klaviyo's platform — the structural risk is Shopify expanding its email capabilities, but Klaviyo's CDP and analytics depth creates a moat that Shopify's horizontal platform cannot easily replicate"]},
  {hidden:true,name:"Wix.com",vertical:"Website Builder",bucket:"Hybrid VSaaS",hq:"IL",sor:false,seat:true,pricing:"Seat-Based",peOwned:false,tev:5219,ntmRev:2366,growth:15,gm:67,ebitda:16,cagr:14.0,ntmRevX:2.21,peFit:"Medium",aiRisk:"High",avoid:false,ltmEbitda:395,pct52w:0.48,
   desc:"Website creation platform serving 250M+ users with drag-and-drop website building, ecommerce, booking, and business management tools — transitioning from consumer-facing builder to SMB business platform with professional tools.",
   sd:{sharePrice:90.07,sharesOut:58.7,marketCap:5284,netDebt:-65},
   thesis:["2.2x NTM for 15% growth with 67% GM and $65M net cash is statistically cheap — Wix's scale (250M sites) and brand recognition create a discovery moat where a new website builder must overcome massive name recognition","Wix's transition from consumer builder to SMB business platform (Studio, Headless, payments, bookings) is redefining its competitive positioning — the question is whether Wix can retain SMB businesses as they scale beyond Wix's simplicity","eCommerce (Wix Stores) and bookings (Wix Bookings) create usage-based revenue that compounds with merchant GMV — payment processing revenue is the hidden growth driver within the seat-based subscription base","Key risk: Squarespace, Webflow, and Framer are competing for the professional creator and agency market that Wix is targeting with Studio — differentiation in this segment is harder to maintain than in the consumer market"],
   aiRationale:["Wix AI (AI website generator, AI text editor, AI image generation) is already deployed — users can generate complete websites from a text description, which simultaneously expands the market and risks commoditizing the core build experience","The existential question: if AI generates websites instantly, does Wix become the AI layer that charges for generation, or is the website builder itself commoditized?","Wix's real moat may be its domain registry, hosting infrastructure, and payment processing — commoditization of website building could actually strengthen Wix's position as the infrastructure provider for SMB online presence","High risk: website building is one of the most directly AI-disrupted categories — AI-generated websites reduce the barrier to entry for Wix's competitors and commoditize the template-and-drag-drop value proposition"]},
  {hidden:true,name:"RingCentral",vertical:"UCaaS",bucket:"Pure-Play VSaaS",hq:"US",sor:false,seat:true,pricing:"Seat-Based",peOwned:false,tev:4670,ntmRev:2659,growth:5,gm:78,ebitda:27,cagr:4.5,ntmRevX:1.76,peFit:"Medium",aiRisk:"High",avoid:false,ltmEbitda:666,pct52w:0.89,
   desc:"Unified communications platform providing cloud phone, video meetings, messaging, and contact center capabilities for enterprise and mid-market businesses — competing in a commoditizing UCaaS market against Microsoft Teams and Zoom.",
   sd:{sharePrice:37.19,sharesOut:95.4,marketCap:3549,netDebt:1121},
   thesis:["1.8x NTM for 27% EBITDA with 78% GM is a financial engineering case — RingCentral generates $666M LTM EBITDA on $2.5B revenue; a take-private at 1.4x leverage creates a 3.7x EBITDA entry with immediate FCF harvesting","The strategic value is not operations but the installed base: 400,000+ enterprise accounts with multi-year contracts represent $2.5B+ in sticky ARR that a strategic acquirer (Cisco, Avaya's successor, SATO) would pay a meaningful premium to acquire","5% growth reflects market saturation — UCaaS has been commoditized by Microsoft Teams bundling, but RingCentral's enterprise telephony integrations (Salesforce, ServiceNow, Epic) create switching costs that Teams cannot match without the same 200+ integrations","AI Receptionist (24/7 AI-powered phone answering) and AI Meeting Intelligence are legitimate revenue expansion tools — but the core UCaaS market is structural headwinds, not growth"],
   aiRationale:["Microsoft Teams' free bundling with Microsoft 365 is the fundamental challenge — RingCentral must justify standalone UCaaS pricing against a product enterprises already pay for","RingCentral AI Receptionist (autonomous phone handling) and AI Meeting Intelligence (automated transcription, summaries, action items) are direct AI product responses to the commoditization threat","The risk is that AI phone agents eliminate the distinction between contact center and general business phone — if AI handles all inbound calls autonomously, the UCaaS/CCaaS boundary dissolves and Teams + an AI layer replaces RingCentral","High risk: UCaaS is structurally challenged by Teams bundling, and AI phone agents represent a further threat to voice communication platform differentiation"]},
  {hidden:true,name:"UiPath",vertical:"RPA & Automation",bucket:"Pure-Play VSaaS",hq:"US",sor:false,seat:true,pricing:"Seat-Based",peOwned:false,tev:4642,ntmRev:1781,growth:9,gm:84,ebitda:24,cagr:8.9,ntmRevX:2.61,peFit:"Medium",aiRisk:"High",avoid:false,ltmEbitda:387,pct52w:0.58,
   desc:"Robotic process automation platform enabling enterprises to automate repetitive software tasks using bots — the market pioneer in RPA with 10,500+ customers across enterprise verticals globally.",
   sd:{sharePrice:11.1,sharesOut:550.9,marketCap:6115,netDebt:-1473},
   thesis:["2.6x NTM for the RPA market leader at 84% GM and 24% EBITDA is statistically cheap despite the narrative that AI replaces RPA — UiPath's 10,500 enterprise customers have deployed bots embedded in production workflows that cannot be instantly replaced by AI agents","At $4.6B TEV with $1.5B net cash, UiPath's operational platform is priced at $3.1B — 1.7x NTM for a leader in enterprise automation with improving economics","Agentic AI is UiPath's opportunity, not its threat — UiPath's platform for orchestrating autonomous processes (Autopilot) positions it as the enterprise-grade AI agent runtime for regulated environments where governance and auditability are required","SAP Business AI and Salesforce Agentforce are vertical AI workflow tools that complement rather than replace UiPath's cross-system horizontal automation — document AI and RPA together are more valuable than either alone"],
   aiRationale:["The AI disruption thesis: if LLMs can perform reasoning tasks that previously required RPA bots (reading emails, filling forms, making decisions), UiPath's bot model becomes obsolete","Counter-argument: UiPath is building agentic AI into its platform — the bot orchestration, audit trail, and governance capabilities that enterprises require for AI agents are the same ones UiPath has built for RPA","Microsoft Power Automate's AI Builder and Copilot integration is a direct competitive threat — Microsoft's distribution advantage could accelerate Power Automate adoption at the expense of UiPath in Microsoft-centric enterprises","High risk: RPA bots are being partially supplanted by AI agents — UiPath's platform must successfully evolve from task automation to AI agent orchestration or face a structural revenue headwind"]},
  {hidden:true,name:"SentinelOne",vertical:"Cybersecurity (EDR)",bucket:"Pure-Play VSaaS",hq:"US",sor:false,seat:false,pricing:"Usage-Based",peOwned:false,tev:4206,ntmRev:1236,growth:20,gm:78,ebitda:13,cagr:18.9,ntmRevX:3.4,peFit:"Medium-High",aiRisk:"Low",avoid:false,ltmEbitda:101,pct52w:0.63,
   desc:"AI-native endpoint detection and response (EDR) platform providing real-time threat detection, automated response, and security data platform — competing in the crowded cybersecurity market against CrowdStrike, Microsoft Defender, and Palo Alto.",
   sd:{sharePrice:12.88,sharesOut:377.1,marketCap:4858,netDebt:-651},
   thesis:["3.4x NTM for 20% growth with 78% GM and positive EBITDA margin expansion from 13% toward 20%+ — SentinelOne's Singularity platform is growing its security data platform (DataLake) which adds usage-based revenue on top of seat-based EDR","Purple AI (natural language threat hunting, automated incident investigation) is already in production — SentinelOne's AI analyst copilot reduces the skill barrier for SOC analysts, expanding the addressable market beyond large enterprises with dedicated threat hunters","The security data platform play positions SentinelOne against Splunk and Elastic in SIEM — security data ingestion at scale is a massive TAM expansion beyond endpoint security that the current multiple does not price in","At $4.2B TEV with $651M net cash, the operational business is priced at $3.5B — 2.8x NTM for a 20% growth, 78% GM security platform with improving FCF conversion"],
   aiRationale:["AI is a product accelerant for SentinelOne — AI-powered threat detection, automated response, and natural language threat hunting (Purple AI) are core revenue drivers, not competitive threats","The risk is Microsoft Defender for Endpoint becoming the de facto choice as Microsoft bundles security into M365 — Microsoft's distribution advantage and free inclusion in enterprise licenses creates pricing pressure on standalone EDR vendors","CrowdStrike's Falcon platform has more enterprise penetration and AI capabilities — SentinelOne competes primarily on platform breadth (security data lake) and pricing rather than differentiated AI capabilities","Low risk: SentinelOne is an AI-native cybersecurity platform where AI is the core product — the competitive dynamic is between AI-native security platforms, not between AI and legacy"]},
  {hidden:true,name:"Zeta",vertical:"Marketing Cloud",bucket:"Pure-Play VSaaS",hq:"US",sor:false,seat:false,pricing:"Usage-Based",peOwned:false,tev:4063,ntmRev:1827,growth:35,gm:62,ebitda:22,cagr:25.0,ntmRevX:2.22,peFit:"Medium",aiRisk:"Medium",avoid:false,ltmEbitda:307,pct52w:0.65,
   desc:"AI-powered marketing cloud and data platform providing identity resolution, audience targeting, and personalization for enterprise marketers — combining a proprietary consumer data set with programmatic advertising activation.",
   sd:{sharePrice:15.92,sharesOut:262.9,marketCap:4186,netDebt:-123},
   thesis:["35% growth at 2.2x NTM is one of the best growth/value combinations in the screen — Zeta's marketing cloud growth is being driven by a combination of AI personalization capabilities and its proprietary Zeta ID (750M+ identity graph) which is defensible against privacy-first advertising changes","Zeta's data asset is the real moat: first-party identity data connecting 750M+ consumer profiles to purchase intent signals is rare in a post-cookie world where identity-based targeting requires first-party data relationships","Usage-based pricing grows with client campaign activity — as enterprise marketers scale AI-personalized campaigns, Zeta's revenue grows with the number of AI-triggered interactions, not headcount","Key risk: 35% growth implies acquisitions and contract timing — Zeta's reported growth includes M&A contributions, and sustainable organic growth closer to 15-20% is the underlying business rate"],
   aiRationale:["Zeta's AI marketing capabilities are built on its identity graph — AI personalization that knows who the consumer is (Zeta ID) is more valuable than AI personalization without identity, creating a defensible AI moat","Privacy changes (cookie deprecation, IDFA) paradoxically strengthen Zeta's position — as third-party data availability decreases, Zeta's first-party identity graph becomes more valuable to enterprise marketers","The risk is a competing identity graph (LiveRamp, The Trade Desk UID2, Google Privacy Sandbox) establishing scale that makes Zeta's proprietary data redundant","Medium risk: marketing AI is increasingly dependent on first-party identity data — Zeta's data moat is defensible, but identity graph consolidation could reduce its pricing power over time"]},
  {hidden:true,name:"Bill.com",vertical:"AP/AR Automation",bucket:"Pure-Play VSaaS",hq:"US",sor:true,seat:false,pricing:"Usage-Based",peOwned:false,tev:3585,ntmRev:1804,growth:13,gm:84,ebitda:20,cagr:13.4,ntmRevX:1.99,peFit:"High",aiRisk:"Medium",avoid:false,ltmEbitda:299,pct52w:0.68,
   desc:"Accounts payable and receivable automation platform processing $300B+ in payment volume annually for SMB and mid-market businesses — the SoR for SMB AP workflows with a two-sided network connecting businesses and their trading partners.",
   sd:{sharePrice:38.3,sharesOut:107.6,marketCap:4119,netDebt:-534},
   thesis:["2.0x NTM for the AP/AR SoR at 84% GM and 20% EBITDA growing 13% — Bill.com's network effects (the more businesses connected, the more valuable the payment network for all participants) create a compounding flywheel that drives organic NRR expansion","$300B+ in annual payment volume with embedded payment interchange makes Bill.com a financial infrastructure company priced like a workflow tool — the fintech revenue component is undercounted in simple revenue multiple analysis","13% growth masks the quality of the existing base: enterprise and mid-market accounts with deep ERP integrations (NetSuite, QuickBooks, Xero) have 3-5 year switching cycles and 95%+ renewal rates","At $3.6B TEV with $534M net cash, the operational business is priced at $3.1B — 1.7x NTM for a payment network + SaaS business is an extreme discount to Adyen, Stripe, or even ADP's workflow multiples"],
   aiRationale:["AI invoice processing and payment anomaly detection are already production features in Bill.com — AI reduces manual AP work but increases the value of Bill.com's payment network by improving straight-through processing rates","The risk is that AI-native AP tools (Tipalti AI, BILL competitors) offer better automation at lower price points — but the two-sided network of connected vendors is the real moat that a standalone AP AI tool cannot replicate","Stripe Treasury and Ramp are adjacent competitors building AP automation on top of their payment networks — the competitive dynamic favors integrated payment network + automation vs. pure AP workflow","Medium risk: AP automation AI is commoditizing the workflow layer — Bill.com's defensible moat is the payment network and the 6M+ vendor directory, not the AP automation software itself"]},
  {hidden:true,name:"Workiva",vertical:"Financial Reporting",bucket:"Pure-Play VSaaS",hq:"US",sor:true,seat:true,pricing:"Seat-Based",peOwned:false,tev:3455,ntmRev:1078,growth:17,gm:82,ebitda:16,cagr:16.4,ntmRevX:3.2,peFit:"High",aiRisk:"Low",avoid:false,ltmEbitda:110,pct52w:0.64,
   desc:"Cloud platform for financial reporting, ESG disclosure, and SEC compliance — the SoR for enterprise report authoring connecting financial data, narrative, and regulatory filings in a single auditable workflow.",
   sd:{sharePrice:59.63,sharesOut:60.0,marketCap:3580,netDebt:-125},
   thesis:["Workiva is the SoR for the CFO office's external reporting workflow — connected reporting (data, tables, narrative in a single source of truth) creates deep switching costs when SEC filings, earnings releases, and board reports all link to the same data cells","ESG disclosure regulations (SEC Climate Rule, EU CSRD) are creating mandatory demand for Workiva's sustainability reporting module — compliance-driven adoption is the most durable growth driver in enterprise software","17% growth at 3.2x NTM with 82% GM is a high-quality mid-market PE opportunity — Workiva's EBITDA margin of 16% expanding toward 25% as compliance reporting scales is a predictable margin expansion story","At $3.5B TEV, this is right-sized for a single sponsor take-private — the regulatory reporting moat and CFO office SoR create a predictable, durable business with low churn and expanding ARPU from ESG modules"],
   aiRationale:["Workiva's connected data model (linking spreadsheet data to narrative text in regulatory filings) requires traceability and auditability that AI must operate within rather than replace","AI-powered financial narrative generation (AI writing assistants for earnings call scripts, 10-K management discussion) is an enhancement within Workiva's platform — the SoR for the underlying data remains unchanged","The risk is that AI makes report authoring commoditized enough that simpler, cheaper tools (Notion AI, Google Docs AI) attract SMB compliance workflows away from Workiva","Low risk: regulatory filings require audit trails, SEC compliance, and version control that AI writing tools cannot provide without Workiva's governance infrastructure"]},
  {hidden:true,name:"Q2 Holdings",vertical:"Digital Banking",bucket:"Pure-Play VSaaS",hq:"US",sor:true,seat:true,pricing:"Seat-Based",peOwned:false,tev:2987,ntmRev:899,growth:10,gm:60,ebitda:26,cagr:10.2,ntmRevX:3.32,peFit:"High",aiRisk:"Low",avoid:false,ltmEbitda:197,pct52w:0.5,
   desc:"Digital banking platform providing mobile banking, account opening, loan origination, and analytics for community and regional banks — the SoR for the digital banking interface layer at 450+ financial institutions.",
   sd:{sharePrice:47.3,sharesOut:65.9,marketCap:3116,netDebt:-129},
   thesis:["Q2 is the bank-grade digital banking SoR for the community and regional bank segment — the compliance, security, and core banking integrations required for FDIC-regulated digital banking create 5-7 year switching cycles that limit churn","10% growth at 3.3x NTM with 60% GM and 26% EBITDA — the margin profile is improving as the platform transitions from professional services-heavy implementation to SaaS subscription growth","Banking regulations (BSA/AML, FDIC, OCC) create a compliance moat that fintech competitors cannot build without years of regulatory relationship investments","The banking consolidation wave (community banks being acquired by regionals) is a risk — every acquired community bank reviews its vendor agreements, and Q2 faces renegotiation at each merger event"],
   aiRationale:["Digital banking AI (AI-powered financial wellness, personalized product recommendations, fraud detection) are already Q2 features — AI enhances the bank-customer relationship within Q2's platform","The risk is that fintech challengers (Zeta banking platform, Nymbus) build AI-native core banking alternatives that attract de novo banks and credit unions away from legacy Q2 infrastructure","Banking regulations protect Q2's incumbency — any AI-native competitor must obtain banking-grade certifications and core banking integrations that Q2 has spent a decade building","Low risk: regulatory banking requirements create durable switching costs — Q2's compliance infrastructure is the moat, not the UI layer that AI could commoditize"]},
  {hidden:true,name:"Qualys",vertical:"Cybersecurity (VM)",bucket:"Pure-Play VSaaS",hq:"US",sor:true,seat:true,pricing:"Seat-Based",peOwned:false,tev:2789,ntmRev:734,growth:8,gm:84,ebitda:44,cagr:7.5,ntmRevX:3.8,peFit:"High",aiRisk:"Low",avoid:false,ltmEbitda:315,pct52w:0.57,
   desc:"Cloud-based vulnerability management and policy compliance platform scanning enterprise IT assets for security vulnerabilities — the SoR for vulnerability management workflows at 10,000+ enterprise customers with 25+ year history.",
   sd:{sharePrice:87.85,sharesOut:36.8,marketCap:3235,netDebt:-446},
   thesis:["44% EBITDA at 84% GM is exceptional profitability for a security platform — Qualys generates $315M EBITDA on $730M revenue with 8% growth; at 3.8x NTM this is near the floor for any high-quality, profitable security SaaS business","Qualys is embedded in compliance frameworks (PCI, HIPAA, FedRAMP) as the required vulnerability scanning tool — compliance-mandated usage creates a revenue floor that persists regardless of competitive pressure","At $2.8B TEV with $446M net cash, the operational business is priced at $2.3B — 3.1x NTM for a 44% EBITDA security compliance tool is a PE take-private with exceptional FCF yield","The VMDR (vulnerability management, detection, and response) platform expansion addresses the gap between vulnerability discovery and remediation — this expansion is driving modest growth above the legacy VM scanning base"],
   aiRationale:["Qualys is AI-enhancing its platform with AI-powered patch prioritization and risk scoring — AI that helps security teams prioritize which vulnerabilities to fix first is a natural value-add in the vulnerability management workflow","Tenable and Rapid7 are the primary competitors, but all three are similar businesses with similar customers — the competitive dynamic is stable with limited market share movement","The risk is that consolidated security platforms (CrowdStrike, Palo Alto XSIAM) bundle vulnerability management into their broader platforms, gradually absorbing Qualys' standalone TAM","Low risk: vulnerability management is compliance-mandated infrastructure — AI improves prioritization but does not eliminate the scanning, cataloging, and remediation tracking workflow that Qualys owns"]},
  {hidden:true,name:"GitLab",vertical:"DevOps & Source Control",bucket:"Pure-Play VSaaS",hq:"US",sor:false,seat:true,pricing:"Seat-Based",peOwned:false,tev:2679,ntmRev:1138,growth:17,gm:86,ebitda:13,cagr:16.3,ntmRevX:2.35,peFit:"Medium-High",aiRisk:"Medium",avoid:false,ltmEbitda:165,pct52w:0.41,
   desc:"Complete DevSecOps platform providing source code management, CI/CD, security scanning, and project management in a single application — the SoR for DevOps workflows at 30M+ registered users globally.",
   sd:{sharePrice:21.64,sharesOut:179.9,marketCap:3893,netDebt:-1214},
   thesis:["2.4x NTM for 17% growth with 86% GM and $1.2B net cash — stripping cash, GitLab's operational business is priced at $1.5B, approximately 1.3x NTM for a DevOps platform growing at 17% with best-in-class gross margins","Single platform for the complete DevSecOps workflow (SCM + CI/CD + security + project management) vs. GitHub + Jenkins + Snyk + Jira multi-vendor stacks — total cost of ownership consolidation is GitLab's primary enterprise sales motion","GitLab Duo (AI coding assistant, AI code review, AI security remediation) is already in production and driving ARPU expansion — the AI assistant layer is priced at premium tiers that expand revenue per seat without new logos","GitHub's market dominance in open source and developer community creates a significant headwind — GitLab's value proposition depends on enterprise features (self-managed, compliance, security) where GitHub is weaker"],
   aiRationale:["GitLab Duo competes directly with GitHub Copilot and Cursor in the AI coding assistant market — the AI coding category is intensely competitive with Microsoft's distribution advantage behind GitHub","Single-platform DevSecOps becomes more valuable with AI — the security scanning, code review, and deployment audit trail that GitLab provides are governance infrastructure for AI-generated code in production environments","The risk is that AI-generated code and vibe coding tools (Cursor, Windsurf, Replit AI) reduce the number of software developers writing code, compressing GitLab's seat count as AI handles more development work","Medium risk: AI coding tools are simultaneously a product opportunity (GitLab Duo) and a threat to seat count (fewer developers needed) — the net depends on whether AI expands the developer market or consolidates it"]},
  {hidden:true,name:"BlackLine",vertical:"Accounting Automation",bucket:"Pure-Play VSaaS",hq:"US",sor:true,seat:true,pricing:"Seat-Based",peOwned:false,tev:2512,ntmRev:787,growth:9,gm:80,ebitda:28,cagr:10.0,ntmRevX:3.19,peFit:"High",aiRisk:"Low",avoid:false,ltmEbitda:196,pct52w:0.63,
   desc:"Financial close and accounting automation platform for corporate accounting teams — the SoR for account reconciliation, close task management, and journal entry automation at enterprise finance organizations.",
   sd:{sharePrice:37.0,sharesOut:63.7,marketCap:2355,netDebt:157},
   thesis:["BlackLine is the SoR for the corporate close process — account reconciliation, intercompany elimination, and close task management are deeply embedded in quarterly and annual audit workflows that cannot be disrupted without regulatory risk","3.2x NTM for 9% growth with 80% GM and 28% EBITDA — BlackLine is a mature, profitable SaaS business with a durable enterprise installed base that generates exceptional cash flow relative to its growth rate","Intercompany Hub (intercompany netting and settlement) is a growing module that addresses the $3T+ in daily intercompany transactions at multinational corporations — a $1B+ TAM expansion beyond the core reconciliation platform","At $2.5B TEV, PE take-private math works with 5x leverage — $196M LTM EBITDA at 5x entry creates a business where FCF alone generates mid-20s IRR without multiple expansion"],
   aiRationale:["BlackLine AI (intelligent transaction matching, AI anomaly detection in reconciliations, natural language close status reporting) are already production features driving ARPU","The risk is that AI-powered accounting tools (Microsoft Copilot in Dynamics, SAP AI for finance) embed reconciliation automation into ERP platforms, reducing the need for standalone BlackLine","BlackLine's value is in the audit trail and governance workflow, not just the automation — even if AI handles matching automatically, the accounting team still needs a system to review, approve, and document the reconciliation","Low risk: financial close is compliance-mandatory infrastructure — AI improves efficiency within BlackLine's workflow but the audit trail, approval governance, and SOX compliance requirements prevent AI tools from replacing the SoR"]},
  {hidden:true,name:"Braze",vertical:"Customer Engagement",bucket:"Pure-Play VSaaS",hq:"US",sor:false,seat:false,pricing:"Usage-Based",peOwned:false,tev:2497,ntmRev:912,growth:20,gm:68,ebitda:9,cagr:18.8,ntmRevX:2.74,peFit:"Medium",aiRisk:"Medium",avoid:false,ltmEbitda:54,pct52w:0.64,
   desc:"Customer engagement platform delivering personalized push notifications, email, SMS, and in-app messaging at scale — used by consumer-facing brands for real-time triggered campaigns based on behavioral data.",
   sd:{sharePrice:23.61,sharesOut:123.2,marketCap:2909,netDebt:-412},
   thesis:["2.7x NTM for 20% growth with 68% GM and 9% EBITDA expanding toward 20% — Braze's usage-based model scales with the number of active users and messages sent, creating compounding revenue as customer user bases grow","Braze is differentiated by real-time data processing — the platform processes behavioral events in milliseconds to trigger personalized messages, a technical capability that legacy batch-processing email platforms (Marketo, Eloqua) cannot replicate","Braze Sage AI (predictive audiences, AI content personalization, send-time optimization) is already driving NRR expansion within the existing customer base — AI is a monetizable enhancement at premium pricing tiers","At $2.5B TEV this is right-sized for PE — 2.7x NTM on a usage-based customer engagement platform with improving unit economics creates strong take-private IRR even at modest revenue assumptions"],
   aiRationale:["Braze AI for personalization and predictive segmentation is a direct revenue driver — AI-optimized message timing and content increases conversion rates, creating clear ROI that justifies premium pricing","The risk is Salesforce Marketing Cloud's AI capabilities (Agentforce for marketing, Salesforce CDP) absorbing Braze's functionality for enterprise customers with Salesforce CRM — the multi-cloud consolidation threat","Klaviyo's ecommerce-vertical depth and HubSpot's SMB pricing are competitive alternatives — Braze is positioned in the consumer-app and mid-enterprise segment where neither is as strong","Medium risk: customer engagement AI is a product opportunity within Braze's platform — the structural risk is marketing platform consolidation into Salesforce/Adobe/HubSpot, not AI disruption of the engagement workflow itself"]},
  {hidden:true,name:"Tenable",vertical:"Cybersecurity (VM)",bucket:"Pure-Play VSaaS",hq:"US",sor:true,seat:true,pricing:"Seat-Based",peOwned:false,tev:2060,ntmRev:1090,growth:7,gm:82,ebitda:25,cagr:7.2,ntmRevX:1.89,peFit:"High",aiRisk:"Low",avoid:false,ltmEbitda:243,pct52w:0.48,
   desc:"Vulnerability management and exposure management platform scanning enterprise networks, cloud, OT, and web applications for security vulnerabilities — the SoR for exposure management at 44,000+ enterprise and government customers.",
   sd:{sharePrice:16.91,sharesOut:124.5,marketCap:2105,netDebt:-45},
   thesis:["1.9x NTM for 25% EBITDA at 82% GM with $45M net cash — Tenable is priced at an extreme discount to its FCF generation; at 2.1x NTM this is 8.4x EBITDA, one of the cheapest profitable security businesses in the screen","44,000+ customers including significant government and regulated enterprise provides a compliance-mandatory revenue floor that persists through security budget cycles","Tenable One (AI-powered exposure management platform) integrates VM, cloud security, OT security, and identity in a single exposure view — the platform expansion beyond vulnerability scanning is the growth driver for the next 5 years","At $2.1B TEV, this is right-sized for a single-sponsor take-private at 4-5x leverage — the FCF yield on a $243M EBITDA business at $2.1B TEV is 11.5%, exceptional for an enterprise security SoR"],
   aiRationale:["Tenable One's AI-powered exposure management uses AI to prioritize vulnerabilities by business risk — AI enhances the core vulnerability management workflow without disrupting Tenable's SoR position","CrowdStrike Falcon Exposure Management and Qualys are direct competitors — the vulnerability management market is stable with limited disruption from AI-native entrants","OT (operational technology) security is a growing segment where Tenable's acquisition of Industrial Defender provides a defensible niche — manufacturing and critical infrastructure OT security faces increasing regulatory requirements","Low risk: vulnerability management is compliance-mandatory security infrastructure — AI improves risk prioritization within Tenable's platform but compliance requirements prevent AI tools from replacing the formal scanning and reporting workflow"]},
  {hidden:true,name:"Intapp",vertical:"Professional Services SW",bucket:"Pure-Play VSaaS",hq:"US",sor:true,seat:true,pricing:"Seat-Based",peOwned:false,tev:2055,ntmRev:630,growth:14,gm:78,ebitda:22,cagr:13.2,ntmRevX:3.26,peFit:"High",aiRisk:"Low",avoid:false,ltmEbitda:113,pct52w:0.43,
   desc:"Software platform for professional services firms (legal, accounting, consulting, investment banking) covering conflicts management, time recording, matter management, and client relationship management.",
   sd:{sharePrice:25.69,sharesOut:87.4,marketCap:2246,netDebt:-191},
   thesis:["Intapp is the SoR for legal and financial professional services workflows — conflicts clearance, time recording, and client onboarding are compliance-mandatory processes embedded in partner and associate daily workflows that carry malpractice risk if disrupted","3.3x NTM for 14% growth with 78% GM and 22% EBITDA is attractive for a vertical SaaS SoR in the highly regulated professional services segment — law firm technology budgets are recession-resistant and expand with firm profitability","Applied AI (AI conflicts analysis, AI contract review, AI matter summary) is already deployed at Intapp enterprise customers — AI enhances the billable workflow within Intapp's platform rather than threatening it","At $2.1B TEV, this is ideal for mid-market PE — professional services SoR with durable contracts, high switching costs, and 100+ partner firm installed base creates a predictable cash flow harvesting opportunity"],
   aiRationale:["Professional services workflows require partner-level judgment, ethical compliance, and malpractice risk management that AI assists but cannot replace — conflicts clearance requires human attorney certification","Intapp AI for conflicts analysis reduces the time to clear new business conflicts from days to hours — AI is a product accelerant that increases value delivered per seat, supporting ARPU expansion","The risk is that large legal technology platforms (Thomson Reuters, LexisNexis) build AI-powered practice management that directly competes with Intapp's specialized workflow tools","Low risk: professional services regulations (bar rules, SEC regulations, PCAOB standards) require human oversight of workflow decisions — AI enhances Intapp's platform efficiency but compliance requirements prevent wholesale AI replacement of the SoR"]},
  {hidden:true,name:"Alkami",vertical:"Digital Banking",bucket:"Pure-Play VSaaS",hq:"US",sor:true,seat:true,pricing:"Seat-Based",peOwned:false,tev:2272.5,ntmRev:556.5,growth:19,gm:65,ebitda:18,cagr:18.08,ntmRevX:4.08,peFit:"High",aiRisk:"Low",avoid:false,ltmEbitda:70.1,pct52w:0.572,
   desc:"Digital banking platform for credit unions and community banks providing mobile banking, account opening, and data analytics — a cloud-native alternative to legacy digital banking vendors focused on the underserved credit union market.",
   sd:{sharePrice:17.83,sharesOut:113.32,marketCap:2020.4,netDebt:252.1},
   thesis:["Alkami serves 250+ credit unions and community banks with cloud-native digital banking infrastructure that legacy providers (Jack Henry, Fiserv) cannot replicate without multi-year re-platforming","19% growth at 3.7x NTM with 65% GM and 18% EBITDA expanding toward 25%+ — Alkami's growth reflects share gain in an underpenetrated credit union market rather than new category creation","The credit union digital transformation is a multi-year tailwind — 5,500+ US credit unions are evaluating cloud-native digital banking platforms, and Alkami's existing 250-customer base is a small fraction of the addressable market","At $2B TEV this is right-sized for PE — the credit union digital banking SoR with expanding margins and durable multi-year contracts creates a predictable growth story"],
   aiRationale:["Digital banking AI (personalized financial wellness, AI fraud detection, AI chatbot for member service) enhances Alkami's platform within credit union member relationships","The regulatory environment for credit unions creates governance requirements around AI deployment — this protects Alkami's SoR position while giving it time to build AI features at the platform level","Jack Henry and Fiserv are the incumbent competitors — both have AI roadmaps but neither has Alkami's cloud-native architecture advantage for modern AI feature deployment","Low risk: credit union digital banking is compliance-driven infrastructure where Alkami's SoR position compounds with credit union digital transformation regardless of AI trends"]},
  {hidden:true,name:"Agilysys",vertical:"Hospitality SW",bucket:"Pure-Play VSaaS",hq:"US",sor:true,seat:true,pricing:"Seat-Based",peOwned:false,tev:1994,ntmRev:365,growth:15,gm:63,ebitda:21,cagr:14.5,ntmRevX:5.47,peFit:"High",aiRisk:"Low",avoid:false,ltmEbitda:64,pct52w:0.5,
   desc:"Hospitality technology platform providing PMS, POS, and inventory management for hotels, resorts, casinos, and food service — the SoR for luxury and gaming hospitality operations with deep Oracle OPERA and Simphony integration expertise.",
   sd:{sharePrice:71.14,sharesOut:28.8,marketCap:2046,netDebt:-52},
   thesis:["Agilysys is the SoR for hospitality property management at luxury resorts and casinos — property management system migrations at a 500+ room resort are 18-24 month projects involving every department from front desk to F&B to maintenance","5.5x NTM for 15% growth with 63% GM and 21% EBITDA expanding toward 30% — Agilysys is transitioning from perpetual license to SaaS subscription, creating an EBITDA margin expansion story over the next 3-5 years","The gaming hospitality segment is structurally high-value — casino resorts require integrated PMS, POS, and gaming management that Agilysys provides in a regulatory-compliant stack","At $2B TEV this is right-sized for PE — hospitality SoR with luxury gaming customer relationships and clear subscription transition margin expansion creates a durable value creation path"],
   aiRationale:["AI-powered revenue management and demand forecasting are already Agilysys product features — AI is an ARPU expansion tool within the hospitality SoR, not a threat to it","The risk is Oracle Hospitality and Amadeus building AI-first hospitality platforms that bundle PMS, CRS, and AI revenue management in a more integrated stack than Agilysys provides","Gaming compliance requirements (Nevada Gaming Control Board, tribal regulations) create switching barriers that AI cannot shortcut — casino operators cannot migrate PMS without regulatory approval","Low risk: hospitality and gaming technology requires physical-world integration with room locks, gaming machines, and F&B equipment — AI enhances workflow efficiency within Agilysys's platform rather than disrupting the core property management SoR"]},
  {hidden:true,name:"SPS Commerce",vertical:"Supply Chain EDI",bucket:"Pure-Play VSaaS",hq:"US",sor:true,seat:false,pricing:"Usage-Based",peOwned:false,tev:1986,ntmRev:817,growth:7,gm:72,ebitda:33,cagr:7.0,ntmRevX:2.43,peFit:"High",aiRisk:"Low",avoid:false,ltmEbitda:239,pct52w:0.37,
   desc:"Cloud-based supply chain EDI and analytics platform enabling retailers, suppliers, and logistics providers to exchange purchase orders, ASNs, and invoices electronically — the SoR for retail supply chain EDI compliance.",
   sd:{sharePrice:55.67,sharesOut:38.4,marketCap:2138,netDebt:-151},
   thesis:["SPS Commerce is the EDI compliance platform that 100,000+ retail trading partners use to send and receive purchase orders — Walmart, Target, and Home Depot require supplier EDI compliance, and SPS Commerce is the easiest path to meeting those requirements","Usage-based pricing grows with transaction volume — as retailer order volumes grow, SPS Commerce revenue grows proportionally without any new customer acquisition, creating compounding organic growth","7% growth masks the quality of the installed base — SPS Commerce's NRR is 105%+ driven by suppliers transacting more as their retail relationships grow; new logo growth is secondary to organic expansion within the existing network","At $2B TEV and 7x EBITDA, this is a PE take-private with exceptional FCF yield — $239M LTM EBITDA on $1.99B TEV is 12% FCF yield before leverage benefit"],
   aiRationale:["EDI is standardized data exchange — AI cannot improve on 50-year-old EDI protocols, but AI-powered supply chain analytics on top of the EDI data is the growth opportunity","SPS Analytics (AI-powered inventory optimization, demand forecasting, scorecard analytics) is the higher-value product layer being built on top of the EDI transaction foundation","The risk is that retailers build direct API integrations that bypass EDI entirely — but the long tail of small-to-medium suppliers cannot maintain direct integrations with 50+ retailer APIs without a platform like SPS Commerce","Low risk: EDI compliance is mandatory for any supplier selling through major retailers — AI cannot eliminate this compliance requirement; SPS Commerce's network of retailer relationships is the durable moat"]},
  {hidden:true,name:"Monday.com",vertical:"Work Management",bucket:"Pure-Play VSaaS",hq:"IL",sor:false,seat:true,pricing:"Seat-Based",peOwned:false,tev:1961,ntmRev:1518,growth:18,gm:89,ebitda:13,cagr:17.3,ntmRevX:1.29,peFit:"Medium",aiRisk:"High",avoid:false,ltmEbitda:189,pct52w:0.22,
   desc:"Work OS platform providing project management, workflow automation, and cross-functional collaboration — used by 225,000+ organizations for project tracking, CRM, product development, and custom workflow applications.",
   sd:{sharePrice:69.11,sharesOut:52.6,marketCap:3632,netDebt:-1671},
   thesis:["1.3x NTM for 18% growth with 89% GM and $1.7B net cash — Monday.com's enterprise platform is priced at near-zero if you strip the cash; $290M TEV for a $1.5B ARR work management platform growing 18% is an anomaly created by the concentration of founders/institutional holders at current prices","monday.com AI (automated workflows, AI-generated project plans, AI column suggestions) is already in production — the platform is positioning as the AI-powered work orchestration layer for enterprise teams","Platform extensibility (CRM, Dev, Service, Marketing modules built on the Work OS) creates compounding switching costs as customers build mission-critical workflows on top of Monday's low-code platform","AI agent automation built on the Work OS creates a scenario where Monday is the orchestration layer for autonomous business workflows — this repositioning from project tracker to AI workflow platform is the bull case"],
   aiRationale:["Work management faces the most direct AI disruption risk: if AI project managers can autonomously generate, assign, and track work items, the value of human project coordination decreases","Counter-argument: Monday's Work OS is a platform for AI workflow automation, not just human coordination — building AI agents on Monday's low-code platform is the strategic repositioning that could justify a 5-7x revenue multiple","The switching cost in Monday is not the project tracker but the custom apps and workflows built on the Work OS — enterprise customers who have built CRM, project intake, and onboarding flows on Monday have multi-year migration costs","High risk: work management is the highest AI-disruption-risk category in this screen — but Monday's platform positioning as an AI orchestration layer creates a credible scenario where AI actually expands its value rather than reducing it"]},
  {hidden:true,name:"AvePoint",vertical:"Microsoft 365 Data Mgmt",bucket:"Pure-Play VSaaS",hq:"US",sor:false,seat:false,pricing:"Usage-Based",peOwned:false,tev:1723,ntmRev:539,growth:23,gm:75,ebitda:20,cagr:21.1,ntmRevX:3.2,peFit:"Medium",aiRisk:"Medium",avoid:false,ltmEbitda:88,pct52w:0.48,
   desc:"Microsoft 365 data management and governance platform providing backup, migration, compliance, and permissions management for SharePoint, Teams, and Exchange — the SoR for Microsoft 365 governance at enterprise scale.",
   sd:{sharePrice:9.51,sharesOut:231.8,marketCap:2204,netDebt:-481},
   thesis:["AvePoint's governance platform is deeply embedded in Microsoft 365 enterprise environments — SharePoint backup, permissions management, and compliance workflows represent years of configuration that migrating requires rebuilding entirely","23% growth at 3.2x NTM with 75% GM and 20% EBITDA — AvePoint is growing at tech-company rates while the market prices it at utility multiples, creating a significant valuation gap","Microsoft Purview and Viva are Microsoft's native governance tools — AvePoint's competitive differentiation depends on providing deeper configuration and multi-cloud governance than Microsoft's first-party tools","At $1.7B TEV with $481M net cash, the operational business is priced at $1.2B — 2.2x NTM for a 23% growth, 75% GM governance platform is extreme value for the risk/return profile"],
   aiRationale:["Microsoft 365 data governance AI is an enhancement to AvePoint's platform — AI-powered data classification, compliance recommendations, and access review automation improve the platform without threatening its SoR position","The risk is Microsoft building native M365 governance features into Purview that make standalone AvePoint unnecessary — Microsoft's Copilot integration with Purview is the specific competitive threat to monitor","AvePoint's multi-cloud governance (AWS, GCP alongside M365) is a differentiating capability — AI workloads that span multiple clouds require governance tools that Microsoft's single-cloud tools cannot provide","Medium risk: AvePoint's moat depends on Microsoft not fully funding Purview's capabilities — as Microsoft invests more in native governance tools, AvePoint's differentiation narrows"]},
  {hidden:true,name:"Freshworks",vertical:"CRM & Service Desk",bucket:"Pure-Play VSaaS",hq:"US",sor:false,seat:true,pricing:"Seat-Based",peOwned:false,tev:1627,ntmRev:990,growth:14,gm:86,ebitda:21,cagr:14.0,ntmRevX:1.64,peFit:"Medium",aiRisk:"Medium",avoid:false,ltmEbitda:204,pct52w:0.5,
   desc:"CRM, customer service, and IT service management platform for SMB and mid-market businesses — Freshdesk (customer service), Freshservice (ITSM), and Freshsales (CRM) serve 67,000+ customers globally.",
   sd:{sharePrice:8.03,sharesOut:306.1,marketCap:2458,netDebt:-831},
   thesis:["1.6x NTM for 14% growth with 86% GM and $831M net cash — stripping cash, Freshworks' operational business is priced at $796M for a company generating $200M EBITDA on $990M revenue; 4x EBITDA for an 86% GM SaaS platform is an extreme discount","Freddy AI (AI-powered ticket resolution, agent copilot, AI chatbot) is already deployed in Freshdesk — AI features expand ARPU without requiring new logo acquisition, creating organic growth from the existing 67,000 customer base","ITSM (Freshservice) is the highest-quality segment — Freshservice competes directly with ServiceNow and Jira Service Management in the mid-market, growing faster than the company average","At $1.6B TEV, this is right-sized for PE — Thoma Bravo or Vista could execute a take-private and rationalize the CRM and field service segments to focus on the higher-margin ITSM and customer service core"],
   aiRationale:["Freddy AI for ticket automation and agent productivity is already a revenue driver — AI reduces the number of agents needed per ticket volume, which compresses headcount but expands Freshworks' value proposition per ticket","The risk is Salesforce Agentforce and ServiceNow Now Assist providing enterprise-grade AI service desk capabilities that attract mid-market customers who want AI features at Freshworks' price point but from enterprise vendors","Freshworks' SMB focus is both a moat (enterprise vendors avoid the complexity of SMB sales) and a vulnerability (AI-native competitors like Intercom and Tidio target SMB service desk at lower price points)","Medium risk: AI customer service automation directly threatens the agent seat count model — Freshworks must successfully monetize AI-powered auto-resolution as a premium feature to offset any headcount reduction in the customer base"]},
  {hidden:true,name:"Five9",vertical:"Contact Center SW",bucket:"Hybrid VSaaS",hq:"US",sor:false,seat:false,pricing:"Usage-Based",peOwned:false,tev:1291,ntmRev:1287,growth:9,gm:63,ebitda:24,cagr:9.6,ntmRevX:1.0,peFit:"Medium",aiRisk:"High",avoid:false,ltmEbitda:278,pct52w:0.51,
   desc:"Cloud contact center software platform providing ACD, IVR, outbound dialing, and AI-powered agent assistance — a pure-play CCaaS vendor competing in a market being restructured by AI autonomous agent platforms.",
   sd:{sharePrice:15.17,sharesOut:82.5,marketCap:1252,netDebt:39},
   thesis:["1.0x NTM for 24% EBITDA at 63% GM — Five9 is priced as a declining business despite generating $278M LTM EBITDA; the FCF yield at current prices is exceptional for any software company regardless of growth rate","2,000+ enterprise contact center deployments represent deep integrations into CRM, workforce management, and telephony infrastructure — enterprise contact center migrations are 12-18 month projects that companies avoid unless the cost savings are overwhelming","AI Genius (real-time agent coaching, auto-summarization, sentiment analysis) is Five9's product response to autonomous AI contact centers — the question is whether AI assistance extends agent relevance or merely delays displacement","Acquisition target: Zoom attempted to acquire Five9 at $14.7B in 2021; at $1.3B today, the strategic value to Zoom, Microsoft, Salesforce, or an integrator is self-evident"],
   aiRationale:["Voice AI platforms (PolyAI, Cognigy, Google CCAI) that handle customer calls autonomously are the direct threat — if 40%+ of contact center calls are handled without human agents, Five9's agent-seat and usage model faces structural revenue headwinds","Counter-argument: Five9 positions as the orchestration layer between AI agents and enterprise telephony infrastructure — AI agent calls still run through Five9's platform and generate usage revenue","The enterprise CCaaS market requires HIPAA/PCI/SOC2 compliance, SLA guarantees, and CRM integrations that AI-native voice platforms are still building — Five9's compliance infrastructure is a meaningful near-term moat","High risk: autonomous voice AI is the most direct near-term revenue substitution threat in this screen — contact center is the clearest AI disruption category and Five9's financial trajectory will reveal the pace of displacement"]},
  {hidden:true,name:"Asana",vertical:"Work Management",bucket:"Pure-Play VSaaS",hq:"US",sor:false,seat:true,pricing:"Seat-Based",peOwned:false,tev:1226,ntmRev:865,growth:8,gm:88,ebitda:12,cagr:8.0,ntmRevX:1.42,peFit:"Low-Medium",aiRisk:"High",avoid:false,ltmEbitda:83,pct52w:0.34,
   desc:"Work management and project tracking platform for cross-functional teams — used for task management, project portfolios, and team coordination at 139,000+ paying organizations globally.",
   sd:{sharePrice:6.4,sharesOut:253.1,marketCap:1620,netDebt:-394},
   thesis:["1.4x NTM for 88% GM with $394M net cash — the core business is priced at $832M for a $760M ARR platform; the implied 1.1x NTM for the operational business is near the floor for any positive-EBITDA SaaS platform with these margin characteristics","Asana AI (AI Studio for no-code workflow automation, AI teammates) is repositioning the platform from project tracker to AI work orchestration — if AI teammates become an enterprise product, the TAM and multiple both expand","At $1.2B TEV, an activist or strategic acquirer can easily make the math work — Google, Salesforce, or a PE sponsor would pay 2-3x TEV for Asana's enterprise customer list and workflow data","Dustin Moskovitz's control position creates governance discount but also stability — the company can execute a long-term AI product bet without quarterly earnings pressure"],
   aiRationale:["AI work automation (Asana AI teammates that complete tasks autonomously) is the product bet that determines Asana's long-term relevance — execution on this pivot is the key variable","If AI project management eliminates the need for manual work coordination, Asana's seat-based model faces headwinds — but if Asana becomes the orchestration layer for AI workflows, the seat model expands","Notion AI, ClickUp AI, and Microsoft Copilot are all embedding AI into work management — the category is converging toward AI-first platforms where differentiation is AI quality, not workflow UX","High risk: work management faces direct AI substitution risk — Asana must successfully execute its AI teammates pivot to avoid being commoditized by AI-embedded competitors with more resources"]},
  {hidden:true,name:"Sprinklr",vertical:"Marketing Tech",bucket:"Pure-Play VSaaS",hq:"US",sor:false,seat:true,pricing:"Seat-Based",peOwned:false,tev:1107,ntmRev:877,growth:2,gm:68,ebitda:19,cagr:3.3,ntmRevX:1.26,peFit:"Low-Medium",aiRisk:"High",avoid:true,ltmEbitda:165,pct52w:0.64,
   desc:"Unified customer experience management platform combining social media management, marketing, and customer service across 30+ digital channels — an enterprise-grade platform with 1,500+ customers facing growth headwinds.",
   sd:{sharePrice:6.0,sharesOut:268.5,marketCap:1611,netDebt:-505},
   thesis:["Avoid: 2% growth with seat-based pricing in a social media management category being disrupted by AI content tools and platform consolidation — the business is contracting in competitive terms even as absolute revenue stays flat","At 1.3x NTM with $505M net cash, the software platform is implied at $600M — 0.7x NTM for a negative-growth business generates a FCF yield argument, but the structural decline risk makes the duration of that FCF uncertain","Strategic value as M&A target: Salesforce, Adobe, or SAP could acquire Sprinklr's enterprise social data and omnichannel CXM capabilities at $600M for the software — the takeover thesis is cleaner than the standalone operating thesis","The F100 customer base (Samsung, Microsoft, P&G) creates a minimum revenue floor — but winning net new enterprise accounts against Hootsuite, Brandwatch, and Sprout Social is increasingly difficult in a commoditizing category"],
   aiRationale:["AI social content generation (Jasper, Copy.ai, native AI in Canva) reduces the premium value of Sprinklr's approval workflow infrastructure — AI commoditizes the content creation use case that drove Sprinklr adoption","Sprinklr AI+ (AI-powered social listening insights, auto-publishing) is the platform's AI response — but the competitive differentiation vs. AI-native social management tools is not compelling enough to re-accelerate growth","The social listening and brand intelligence layer is the most AI-defensible segment — enterprise brand intelligence across 30+ channels at scale has genuine data advantages that smaller tools cannot replicate","High risk: commoditizing category, AI content tools reducing workflow complexity, and slow growth — the avoid flag reflects structural category risk, not just financial metrics"]},
  {hidden:true,name:"C3.ai",vertical:"Enterprise AI SW",bucket:"Hybrid VSaaS",hq:"US",sor:false,seat:false,pricing:"Usage-Based",peOwned:false,tev:811,ntmRev:224,growth:-22,gm:49,ebitda:-67,cagr:-7.8,ntmRevX:3.62,peFit:"Low",aiRisk:"High",avoid:true,ltmEbitda:-199,pct52w:0.29,
   desc:"Enterprise AI application platform providing pre-built AI applications for predictive maintenance, supply chain optimization, and fraud detection — an early enterprise AI vendor facing revenue decline as foundation models commoditize AI application development.",
   sd:{sharePrice:8.42,sharesOut:170.2,marketCap:1433,netDebt:-622},
   thesis:["Avoid: negative 22% revenue growth, negative EBITDA, negative FCF, and secular competitive pressure from hyperscaler AI platforms that commoditize C3.ai's application layer","At 3.6x NTM on shrinking revenue, C3.ai is not cheap — a business declining at 22% per year that is priced at 3.6x forward revenue requires extraordinary multiple expansion to generate positive returns","The only viable PE thesis is government/defense AI contracts — C3.ai's DoD and intelligence community relationships have genuine value, but not at the current $189M implied operational valuation after stripping net cash","$622M net cash extends the runway but enables continued cash burn — the capital discipline required to reach profitability has not been demonstrated by management"],
   aiRationale:["C3.ai pioneered enterprise AI but the category has been absorbed by foundation model APIs — Azure OpenAI, AWS Bedrock, and Google Vertex enable enterprises to build equivalent applications faster and cheaper","The government/defense AI segment (DoD AI contracts) retains value in a market where security clearance requirements restrict foundation model providers — this is C3.ai's most defensible TAM","C3.ai's pivot to generative AI applications (C3 Generative AI suite) competes with Microsoft Copilot, Salesforce Einstein, and ServiceNow AI from a position of significant resource disadvantage","High risk, avoid: C3.ai is an enterprise AI vendor being disrupted by the AI technology it was designed to sell — the market it created is being absorbed by trillion-dollar hyperscalers with unlimited AI R&D budgets"]},
  {hidden:true,name:"PagerDuty",vertical:"IT Operations",bucket:"Pure-Play VSaaS",hq:"US",sor:true,seat:true,pricing:"Seat-Based",peOwned:false,tev:514,ntmRev:494,growth:0,gm:86,ebitda:28,cagr:1.1,ntmRevX:1.04,peFit:"Medium-High",aiRisk:"Medium",avoid:false,ltmEbitda:137,pct52w:0.34,
   desc:"Digital operations management platform providing incident alerting, on-call management, and AIOps for DevOps and IT operations teams — the SoR for incident response workflows at 15,000+ organizations.",
   sd:{sharePrice:6.21,sharesOut:92.0,marketCap:572,netDebt:-57},
   thesis:["1.0x NTM for 28% EBITDA at 86% GM is the clearest financial engineering take-private in this screen — PagerDuty's $137M LTM EBITDA on $514M TEV is 2.7x EBITDA; a take-private at 1.2x NTM with 5x leverage generates mid-20s IRR from FCF alone","PagerDuty is embedded in the on-call rotation of every major technology company's engineering team — alert routing rules, escalation policies, and runbook integrations accumulated over years are not migrated without operational risk","AIOps expansion (noise reduction, intelligent alert grouping, auto-remediation suggestions) represents ARPU expansion within existing accounts — enterprises paying for AI intelligence features generate 30-50% premium pricing per seat","This is a Thoma Bravo / Francisco Partners take-private — buy at 1.2x NTM, cut S&M by 25%, grow through cross-sell, and exit at 10x EBITDA in year 5 when incident management converges with AIOps platforms"],
   aiRationale:["PagerDuty Advance AI (noise reduction, automatic incident summaries, Copilot for root cause analysis) is already a production revenue driver — AI features expand ARPU within the existing installed base","The risk is that Dynatrace Davis, Datadog Watchdog, and ServiceNow AIOps absorb the incident response workflow into their broader observability platforms — reducing PagerDuty to a notification relay","PagerDuty's on-call schedule and escalation graph is proprietary organizational data — who resolves what incidents, team topology, and escalation patterns provide unique AI training context for Advance AI","Medium risk: PagerDuty must execute its AIOps platform transition before larger observability vendors commoditize standalone incident response — the FCF harvest thesis works regardless of growth acceleration"]}
];

// ─── TOP 5 DEEP DIVE DATA ─────────────────────────────────────────────────────
const TOP5_DATA={
  "Waystar":{
    headline:"Healthcare RCM platform with best margin/multiple in the screen — usage-based transaction model with structurally durable payer-provider complexity moat",
    business:[
      "Processes $5T+ in healthcare claims annually across 1,000+ health systems — mission-critical revenue operations infrastructure for hospitals and physician groups",
      "Usage-based fees on every claim compound with healthcare utilization, inflation, and coding complexity — revenue tied to patient volumes not headcount",
      "Multi-year enterprise contracts with hospital CFOs create extreme switching costs; RCM migrations are 12–18 month projects with meaningful implementation risk",
      "Adjacent whitespace in prior authorization, patient pay, and analytics creates clear organic cross-sell runway within the existing account base"
    ],
    competition:[
      "Change Healthcare (Optum/UHG) was the dominant player but suffered a catastrophic 2024 cyberattack causing significant customer attrition — Waystar is the primary beneficiary",
      "Ensemble Health Partners (KKR-backed) and nThrive are primarily services-led operators; Waystar's software-first model has superior scalability and margin structure",
      "Epic MyWay presents integration risk for Epic-installed health systems but lacks standalone RCM breadth and is typically deployed alongside clearinghouses like Waystar",
      "Availity and Experian Health are smaller point-solution competitors without Waystar's end-to-end automation across eligibility, claims, and remittance"
    ],
    aiRisk:[
      "HIPAA, CMS, and payer-specific rule engines require decades of proprietary data relationships — generalist AI cannot replicate without the underlying payer agreements",
      "AI automation of claims processing and denial prevention is already a Waystar product line — AI is a monetizable capability enhancing the platform, not a competitive threat",
      "Usage-based transaction model means AI-driven efficiency improves throughput within Waystar — revenue scales with claim volume, not headcount",
      "No AI-native competitor has achieved meaningful enterprise RCM scale — the barrier is payer relationships and regulatory compliance, not technology alone"
    ],
    thesis:[
      "4.9x NTM Revenue with 42% EBITDA is the best margin/multiple combination in the top tier — entry TEV ~$8.5B at 30% premium is strong absolute value for the quality",
      "7× leverage at 9% generates strong LFCF from Year 1; cumulative cash on balance sheet meaningfully enhances exit equity beyond organic EBITDA value creation",
      "Operating leverage on fixed-cost SaaS infrastructure drives margin expansion — incremental revenue above the fixed cost base drops through at ~70% margin",
      "Post-acquisition M&A of smaller RCM modules (prior auth, patient pay) accelerates cross-sell and deepens platform completeness without significant integration complexity"
    ],
    scenarios:[
      {growthDelta:-4,marginDelta:-3,exitFactor:0.8,reasons:[
        "UHG/Optum rebuilds Change Healthcare within 18 months, recapturing lost clients and removing the demand tailwind from competitor disruption",
        "CMS claims processing rule changes require costly platform updates, compressing margins as compliance spend rises across the hold period",
        "Healthcare system IT budgets freeze under Medicaid funding pressure — enterprise sales cycles extend from 9 to 18+ months"
      ]},
      {growthDelta:0,marginDelta:0,exitFactor:1.0,reasons:[
        "Consistent with 15% N3Y CAGR and management guidance; healthcare utilization normalization continues as post-COVID visit volumes stabilize",
        "Margin stays flat as platform investment in AI prior auth and adjacent modules absorbs incremental revenue from new logo wins",
        "Change Healthcare attrition provides modest demand tailwind offset by competitive re-pricing in RCM RFP processes"
      ]},
      {growthDelta:5,marginDelta:3,exitFactor:1.0,reasons:[
        "Change Healthcare attrition pool (~$400M estimated ARR) accelerates enterprise wins — Waystar captures disproportionate share of displaced clients",
        "AI-enhanced prior authorization commands 15–20% price premium over standard claims processing — mix shift toward premium AI tier improves blended ASP",
        "Healthcare utilization inflation raises per-claim values without requiring incremental volume growth — organic revenue expands beyond growth rate"
      ]}
    ]
  },
  "CCC Intelligent Solutions":{
    headline:"De facto monopoly connecting 35,000+ auto insurance ecosystem participants — 40-year network moat and AI-native claims platform at only 4.0x NTM Revenue",
    business:[
      "Processes $100B+ in auto insurance claims annually across 35,000+ connected businesses — every major US P&C insurer, 27,000+ collision repair shops, OEMs, and parts suppliers",
      "Network effects compound over 40 years: insurers joining benefit all repairers (faster approvals), repairers joining benefit all insurers (more options) — self-reinforcing flywheel",
      "EV and ADAS complexity is a multiyear tailwind — modern vehicles require sensors, cameras, and software calibration creating more complex estimates and higher per-claim fees",
      "Usage-based transaction fees scale with US auto claims volume — inflation, accident rates, and vehicle complexity all drive organic transaction value growth"
    ],
    competition:[
      "Mitchell (Aurora Capital PE-owned) serves ~35% of the US repairer market vs CCC's ~65% — lacks CCC's OEM integration network and nationwide insurer coverage depth",
      "Solera (Vista Equity PE-owned) focuses primarily on European markets and fleet management — minimal direct US collision claims competition in CCC's core segments",
      "No credible new entrant can replicate 40 years of network building — would require simultaneously onboarding 35,000+ businesses while offering feature parity with an AI-native platform",
      "Network flywheel accelerates at scale: larger networks attract more participants, making it increasingly difficult for any competitor to reach critical density"
    ],
    aiRisk:[
      "CCC is AI-native by design — ML embedded in damage estimation, total loss prediction, and parts pricing for over a decade; AI is the core product, not a future threat",
      "AI-enhanced photo damage assessment (Direct Repair) is already a premium product — insurers pay higher per-transaction fees for AI-automated straight-through-processing",
      "EV battery damage and ADAS sensor calibration require sophisticated AI — CCC's early EV claims methodology positions it as default for the most complex, highest-value repairs",
      "Usage-based model: AI processing improvements grow claim throughput — insurer efficiency savings from AI become CCC's revenue growth as volume scales"
    ],
    thesis:[
      "4.0x NTM Revenue with 42% EBITDA is the deepest value among high-quality, low-AI-risk SoRs — PE equity creation from multiple expansion alone is highly compelling",
      "Dividend recapitalization in Year 2–3 is achievable given consistent 40%+ EBITDA and predictable FCF — partial capital return meaningfully enhances LP-level IRR",
      "EV and ADAS claims complexity is a 5–10 year tailwind requiring no incremental R&D — CCC's network and AI infrastructure handles increasing complexity as a natural extension",
      "AI-native platform and impregnable network effects create the ideal buy-and-compound PE profile: stable/expanding margins, reliable FCF, and organic growth optionality"
    ],
    scenarios:[
      {growthDelta:-2,marginDelta:-2,exitFactor:0.8,reasons:[
        "Autonomous vehicle ADAS safety features reduce accident frequency in the outer hold years — progressive decline in claims volume offsets per-claim value growth",
        "Insurance carrier consolidation (e.g., Allstate/Farmers merger scenario) strengthens buyer power in CCC contract negotiations, compressing per-transaction pricing",
        "Broader software multiple compression at exit — PE-to-PE secondary transaction at a lower EV/EBITDA than entry as macro rates stay elevated"
      ]},
      {growthDelta:0,marginDelta:0,exitFactor:1.0,reasons:[
        "Consistent with 10% N3Y CAGR; auto claims frequency stable as ADAS reduces accidents but increasing vehicle complexity raises severity per claim",
        "Margins stable at ~42% as EV complexity tailwinds offset any competitive pricing adjustments — AI investments already embedded in cost structure",
        "Network effects continue to compound — no competitive disruption expected during the hold period given 40-year network moat"
      ]},
      {growthDelta:3,marginDelta:3,exitFactor:1.0,reasons:[
        "EV and ADAS repair complexity grows at 20%+ annually — higher-value claims generate higher per-transaction fees with no incremental platform cost",
        "AI Direct Repair premium tier commands 30–40% higher fees for straight-through processing — mix shift toward premium AI products improves blended ASP",
        "OEM data monetization adds a licensing revenue stream as automakers pay for claims pattern analytics to improve vehicle design and warranty cost management"
      ]}
    ]
  },
  "Flywire":{
    headline:"Specialist global payments platform for education and healthcare at 1.7x NTM — deep institutional relationships and FX complexity create durable moat that generalist processors cannot replicate",
    business:[
      "Processes complex cross-border and domestic payments for 3,000+ institutions across education (tuition), healthcare (medical bills), and travel — verticals where standard payment rails fail",
      "Deep integrations into university SIS, hospital billing systems, and travel ERP create switching costs that typical payment processors do not have — payment rails embedded in vertical workflows",
      "Usage-based transaction fees on payment volumes compound with institutional growth — as universities grow enrollment and hospitals grow patient volumes, Flywire fees grow proportionally",
      "20% N3Y CAGR with improving unit economics — EBITDA margin expansion from 22% toward 32% as higher-margin software processing grows vs infrastructure cost base"
    ],
    competition:[
      "Stripe and Adyen dominate general-purpose payment processing but lack Flywire's vertical-specific integrations, FX reconciliation tools, and institutional sales relationships",
      "TouchNet (Heartland subsidiary) competes in US campus payments but lacks Flywire's international FX capability and healthcare vertical depth",
      "Convera (formerly Western Union Business Solutions) focuses on FX for corporates rather than institutional payments — different buyer, different sales motion",
      "Vertical depth is Flywire's moat: a payments competitor would need to rebuild all institutional integrations (SIS, HMS, PMS) and pass institutional security/compliance reviews at 3,000+ clients"
    ],
    aiRisk:[
      "AI payment routing and fraud detection are already embedded in Flywire's platform — AI is a product efficiency driver not a disruptive threat to the business model",
      "Institutional relationships are the core asset — a university's decision to use Flywire for tuition payments is made by finance and IT leadership based on integration depth, not UI",
      "Usage-based transaction model decouples revenue from headcount — AI efficiency gains in payment processing operations increase throughput without compressing per-transaction revenue",
      "Medium risk: the underlying payment rail is commoditizable in theory, but vertical-specific integrations and institutional lock-in create practical switching barriers at 3,000+ clients"
    ],
    thesis:[
      "1.7x NTM Revenue for 18% growth with a clear path to 32%+ terminal margin — among the best growth/value combinations in the screen and deeply undervalued vs payment sector peers",
      "Institutional relationships at 3,000+ universities and hospitals create compounding growth with zero churn incentive — integration cost of switching is prohibitively high for finance teams",
      "Clear margin expansion path: high-margin software processing and FX analytics growing faster than lower-margin payment infrastructure costs — mix shift drives EBITDA improvement",
      "Geographic expansion into South Asia and Southeast Asia adds new high-FX-margin payment corridors that no generalist processor has built institutional relationships to serve"
    ],
    scenarios:[
      {growthDelta:-6,marginDelta:-3,exitFactor:0.8,reasons:[
        "US student visa restrictions reduce international enrollment at partner universities — education represents ~50% of revenue and visa policy creates binary downside risk",
        "Stripe and Adyen invest in vertical-specific integrations targeting Flywire's institutional clients — competitive pressure compresses pricing on domestic payment volumes",
        "FX volatility increases cost of currency hedging and expands payment corridor economics risks — margin pressure on international transactions where FX is a meaningful cost"
      ]},
      {growthDelta:0,marginDelta:0,exitFactor:1.0,reasons:[
        "Consistent with 20% N3Y CAGR; institutional relationships at universities and hospitals provide durable payment volumes with minimal churn",
        "Margin expansion from 22% to 32% as higher-margin software processing grows vs payment infrastructure costs — in line with management target",
        "International expansion continues at a measured pace — South Asia and Southeast Asia corridors developing as planned with no acceleration or setback"
      ]},
      {growthDelta:5,marginDelta:5,exitFactor:1.0,reasons:[
        "International student recovery post-pandemic accelerates — US F-1 visa issuance growing 15%+ YoY drives education payment volumes at partner universities",
        "Healthcare OOP payment volumes compound as high-deductible plan adoption accelerates — hospital partner volumes grow 20%+ annually as patients pay larger shares of bills",
        "South Asia and Southeast Asia expansion adds new payment corridors with superior FX take rates — higher-margin international mix improves blended economics significantly"
      ]}
    ]
  },
  "Cellebrite":{
    headline:"GovTech digital forensics SoR with 19% growth and High PE Fit — security certifications and duopoly market structure create an impregnable moat at 5.0x NTM Revenue",
    business:[
      "Owns both sides of the digital forensics workflow: UFED for mobile device extraction and Pathfinder/Guardian for AI-powered evidence analysis and case management",
      "The system-of-record for digital evidence across 6,700+ law enforcement and government agencies globally — CJIS, FedRAMP, and Five Eyes certifications create multi-year switching barriers",
      "Usage-based model with AI-enhanced investigation tools driving 30%+ net revenue retention as agencies expand from extraction-only to full investigation workflow",
      "Government contract revenue provides multi-year visibility; $3B TEV is ideal PE size with 85% software margins and a clear path from 27% to 35%+ EBITDA"
    ],
    competition:[
      "Magnet Forensics (now Thermo Fisher) is the only credible competitor after merging with Grayshift — market is effectively a duopoly with high certification barriers",
      "MSAB (Swedish, publicly listed) competes on extraction but lacks Cellebrite's analytics, AI, and case management breadth — single-point solution vs integrated platform",
      "No AI-native startup can replicate the zero-day exploit research and hardware engineering required for mobile device extraction — this is cybersecurity R&D, not software features",
      "Security certifications (CJIS, FedRAMP, Five Eyes) require 2–3 year investment cycles and government trust that cannot be fast-tracked by any new entrant"
    ],
    aiRisk:[
      "AI is the single biggest product catalyst: AI-powered evidence search (natural language queries over extracted data), auto-categorization of images/videos, and pattern detection are all premium features",
      "The extraction layer requires zero-day exploit research and hardware engineering that AI startups cannot replicate — the moat is cybersecurity R&D, not software features",
      "Second-order AI effect is positive: as criminals use AI to generate deepfakes, encrypted communications, and synthetic identities, demand for advanced digital forensics increases",
      "Low risk: digital forensics is one of the clearest AI-as-tailwind categories — AI makes the product better, makes the market larger, and the certification moat prevents AI-native disruption"
    ],
    thesis:[
      "5.0x NTM Revenue with High PE Fit and Low AI Risk — $3B TEV is the ideal size for PE with best-in-class GovTech moat and 18% N3Y CAGR",
      "Margin expansion from 27% to 35%+ EBITDA is highly achievable as high-margin AI analytics products (Guardian, Pathfinder AI) grow as a percentage of the revenue mix",
      "Duopoly market with Thermo Fisher/Magnet is structurally stable — neither competitor has incentive to compete on price and both benefit from growing law enforcement budgets",
      "Exit path is clear: strategic buyers include Axon, Motorola Solutions, Palantir, or L3Harris — all have adjacent GovTech platforms and would pay premium for the digital forensics SoR with AI growth"
    ],
    scenarios:[
      {growthDelta:-5,marginDelta:-3,exitFactor:0.8,reasons:[
        "Government budget sequestration or austerity in key markets (US, UK, EU) delays digital forensics procurement cycles — law enforcement IT budgets are discretionary within broader public safety",
        "ESG and surveillance concerns from Permira LPs create reputational friction — Cellebrite's association with NSO Group and government surveillance limits LP appetite",
        "Thermo Fisher/Magnet Forensics leverages parent company distribution to aggressively bundle forensics tools with broader laboratory equipment sales into government accounts"
      ]},
      {growthDelta:0,marginDelta:0,exitFactor:1.0,reasons:[
        "Consistent with 18% N3Y CAGR; law enforcement digitization continues as device evidence becomes central to criminal investigations globally",
        "Margin expansion from 27% toward 37% as AI-enhanced analytics (Guardian, Pathfinder AI) grow faster than legacy extraction hardware revenue",
        "Duopoly market dynamics remain stable — Thermo Fisher/Magnet and Cellebrite both grow as the market expands without destructive competition"
      ]},
      {growthDelta:5,marginDelta:5,exitFactor:1.0,reasons:[
        "AI-generated crime (deepfakes, synthetic identity fraud, encrypted communications) drives exponential demand for digital forensics — Cellebrite is the default tool for investigating AI-enabled crime",
        "Guardian AI case management wins large federal contracts (FBI, DHS, Europol) with 7-figure ACV — enterprise upsell within existing agencies accelerates revenue growth",
        "Cloud-based forensics-as-a-service model reduces deployment friction and enables usage-based pricing expansion — agencies pay per investigation rather than per license"
      ]}
    ]
  }
};

const COMPANY_FINANCIALS={
  "Toast":{rev24:4960,rev25:6153,ebitda25:633,sbc25:242,da25:0,other25:-244,rev26:7404,rev27:8728,ebitda26:792,ebitda27:1011,sbc26:291,sbc27:343,da26:50,da27:39,other26:-246,other27:-283},
  "Okta":{rev24:2581,rev25:2893,ebitda25:778,sbc25:546,da25:27,other25:34,rev26:3159,rev27:3456,ebitda26:839,ebitda27:948,sbc26:589,sbc27:644,da26:37,da27:41,other26:57,other27:62},
  "Bentley Systems":{rev24:1353.1,rev25:1501.8,ebitda25:525.8,sbc25:72.6,da25:23.9,other25:77.5,rev26:1700.0,rev27:1875.3,ebitda26:610.4,ebitda27:693.0,sbc26:82.2,sbc27:90.6,da26:28.8,da27:28.6,other26:50.6,other27:59.8},
  "DigitalOcean":{rev24:781,rev25:901,ebitda25:375,sbc25:80,da25:117,other25:-191,rev26:1095,rev27:1423,ebitda26:405,ebitda27:567,sbc26:98,sbc27:127,da26:231,da27:267,other26:-210,other27:-278},
  "HubSpot":{rev24:2627.5,rev25:3131.3,ebitda25:718.2,sbc25:528.2,da25:136.3,other25:42.4,rev26:3696.0,rev27:4286.5,ebitda26:890.0,ebitda27:1095.4,sbc26:623.4,sbc27:723.0,da26:151.1,da27:184.2,other26:63.6,other27:76.1},
  "Figma":{rev24:749,rev25:1056,ebitda25:143,sbc25:1364,da25:13,other25:94,rev26:1370,rev27:1646,ebitda26:119,ebitda27:163,sbc26:1770,sbc27:2127,da26:13,da27:8,other26:110,other27:134},
  "Rubrik":{rev24:865,rev25:1280,ebitda25:13,sbc25:378,da25:36,other25:207,rev26:1579,rev27:1930,ebitda26:24,ebitda27:127,sbc26:395,sbc27:483,da26:44,da27:54,other26:262,other27:321},
  "Dynatrace":{rev24:1631.6,rev25:1930.1,ebitda25:585.1,sbc25:299.2,da25:22.9,other25:63.2,rev26:2229.1,rev27:2550.0,ebitda26:684.3,ebitda27:793.0,sbc26:342.5,sbc27:391.8,da26:28.5,da27:24.6,other26:72.5,other27:84.7},
  "Nutanix":{rev24:2311,rev25:2656,ebitda25:640,sbc25:358,da25:73,other25:98,rev26:2972,rev27:3344,ebitda26:742,ebitda27:894,sbc26:387,sbc27:435,da26:78,da27:91,other26:97,other27:111},
  "DocuSign":{rev24:2959,rev25:3199,ebitda25:1060,sbc25:621,da25:99,other25:-224,rev26:3468,rev27:3743,ebitda26:1171,ebitda27:1270,sbc26:670,sbc27:742,da26:124,da27:128,other26:-232,other27:-249},
  "Nemetschek":{rev24:1176.2,rev25:1407.3,ebitda25:438.4,sbc25:0,da25:35.6,other25:53.6,rev26:1589.0,rev27:1811.1,ebitda26:517.5,ebitda27:604.3,sbc26:0,sbc27:0,da26:38.3,da27:40.4,other26:53.4,other27:61.2},
  "Procore":{rev24:1151.7,rev25:1322.5,ebitda25:297.1,sbc25:238.4,da25:110.5,other25:41.8,rev26:1492.3,rev27:1684.6,ebitda26:368.1,ebitda27:443.1,sbc26:269.0,sbc27:303.7,da26:103.1,da27:97.1,other26:64.6,other27:73.7},
  "SailPoint":{rev24:848,rev25:1054,ebitda25:198,sbc25:236,da25:9,other25:-143,rev26:1249,rev27:1480,ebitda26:238,ebitda27:295,sbc26:297,sbc27:352,da26:7,da27:7,other26:-176,other27:-198},
  "ServiceTitan":{rev24:758.7,rev25:945.2,ebitda25:142.2,sbc25:194.3,da25:53.9,other25:-50.8,rev26:1102.3,rev27:1262.5,ebitda26:180.8,ebitda27:231.3,sbc26:226.1,sbc27:259.0,da26:53.3,da27:66.0,other26:-57.7,other27:-66.1},
  "Paycom":{rev24:1883.2,rev25:2051.7,ebitda25:882.3,sbc25:118.7,da25:196.4,other25:-449.3,rev26:2186.7,rev27:2336.7,ebitda26:960.0,ebitda27:1036.5,sbc26:126.5,sbc27:135.2,da26:208.1,da27:222.8,other26:-364.1,other27:-384.4},
  "Waystar":{rev24:944,rev25:1099,ebitda25:462,sbc25:42,da25:22,other25:-65,rev26:1286,rev27:1415,ebitda26:537,ebitda27:594,sbc26:49,sbc27:56,da26:26,da27:28,other26:-82,other27:-87},
  "Paylocity":{rev24:1499,rev25:1666,ebitda25:605,sbc25:147,da25:97,other25:-90,rev26:1806,rev27:1964,ebitda26:655,ebitda27:727,sbc26:157,sbc27:170,da26:99,da27:99,other26:-123,other27:-133},
  "AppFolio":{rev24:794,rev25:951,ebitda25:246,sbc25:71,da25:11,other25:-26,rev26:1113,rev27:1302,ebitda26:319,ebitda27:394,sbc26:83,sbc27:97,da26:22,da27:36,other26:-24,other27:-28},
  "Fastly":{rev24:544,rev25:624,ebitda25:77,sbc25:117,da25:55,other25:-71,rev26:710,rev27:787,ebitda26:111,ebitda27:136,sbc26:134,sbc27:148,da26:55,da27:63,other26:-154,other27:-171},
  "JFrog":{rev24:428,rev25:532,ebitda25:96,sbc25:157,da25:4,other25:30,rev26:626,rev27:728,ebitda26:116,ebitda27:154,sbc26:184,sbc27:214,da26:9,da27:15,other26:35,other27:41},
  "Klaviyo":{rev24:937,rev25:1234,ebitda25:188,sbc25:162,da25:19,other25:-47,rev26:1507,rev27:1800,ebitda26:247,ebitda27:305,sbc26:198,sbc27:236,da26:25,da27:23,other26:-52,other27:-61},
  "Wix.com":{rev24:1761,rev25:1993,ebitda25:406,sbc25:237,da25:24,other25:381,rev26:2291,rev27:2590,ebitda26:361,ebitda27:432,sbc26:273,sbc27:308,da26:34,da27:-16,other26:152,other27:171},
  "CCC Intelligent Solutions":{rev24:944.8,rev25:1057.0,ebitda25:436.0,sbc25:175.4,da25:59.1,other25:-104.0,rev26:1153.1,rev27:1253.2,ebitda26:481.0,ebitda27:531.3,sbc26:191.3,sbc27:208.0,da26:63.0,da27:69.3,other26:-92.6,other27:-99.2},
  "Elastic":{rev24:1411,rev25:1651,ebitda25:276,sbc25:284,da25:12,other25:-38,rev26:1891,rev27:2152,ebitda26:333,ebitda27:411,sbc26:323,sbc27:368,da26:11,da27:23,other26:-44,other27:-50},
  "RingCentral":{rev24:2400,rev25:2515,ebitda25:653,sbc25:270,da25:87,other25:-234,rev26:2629,rev27:2747,ebitda26:704,ebitda27:751,sbc26:282,sbc27:294,da26:92,da27:91,other26:-275,other27:-273},
  "UiPath":{rev24:1420,rev25:1595,ebitda25:368,sbc25:296,da25:9,other25:-158,rev26:1745,rev27:1891,ebitda26:425,ebitda27:486,sbc26:315,sbc27:341,da26:14,da27:16,other26:-166,other27:-177},
  "SentinelOne":{rev24:805,rev25:986,ebitda25:84,sbc25:295,da25:54,other25:92,rev26:1184,rev27:1395,ebitda26:154,ebitda27:220,sbc26:352,sbc27:414,da26:46,da27:48,other26:108,other27:128},
  "Zeta":{rev24:1006,rev25:1305,ebitda25:279,sbc25:178,da25:72,other25:-62,rev26:1756,rev27:2040,ebitda26:391,ebitda27:476,sbc26:239,sbc27:278,da26:93,da27:109,other26:-75,other27:-84},
  "Bill.com":{rev24:1376,rev25:1553,ebitda25:284,sbc25:251,da25:23,other25:12,rev26:1750,rev27:1996,ebitda26:343,ebitda27:412,sbc26:276,sbc27:315,da26:32,da27:38,other26:18,other27:2},
  "Workiva":{rev24:739,rev25:885,ebitda25:91,sbc25:123,da25:4,other25:34,rev26:1038,rev27:1200,ebitda26:165,ebitda27:220,sbc26:144,sbc27:167,da26:6,da27:7,other26:53,other27:61},
  "Cellebrite":{rev24:401,rev25:476,ebitda25:128,sbc25:45,da25:7,other25:33,rev26:569,rev27:661,ebitda26:152,ebitda27:185,sbc26:54,sbc27:62,da26:7,da27:10,other26:35,other27:42},
  "Q2 Holdings":{rev24:696,rev25:795,ebitda25:187,sbc25:87,da25:32,other25:-31,rev26:877,rev27:965,ebitda26:228,ebitda27:270,sbc26:96,sbc27:106,da26:32,da27:34,other26:-40,other27:-44},
  "Qualys":{rev24:609,rev25:669,ebitda25:313,sbc25:77,da25:12,other25:9,rev26:721,rev27:773,ebitda26:320,ebitda27:343,sbc26:83,sbc27:89,da26:12,da27:14,other26:15,other27:16},
  "GitLab":{rev24:744,rev25:939,ebitda25:163,sbc25:213,da25:7,other25:71,rev26:1096,rev27:1271,ebitda26:143,ebitda27:183,sbc26:247,sbc27:286,da26:8,da27:14,other26:94,other27:108},
  "BlackLine":{rev24:653,rev25:700,ebitda25:189,sbc25:93,da25:32,other25:-19,rev26:766,rev27:848,ebitda26:218,ebitda27:256,sbc26:101,sbc27:112,da26:34,da27:35,other26:7,other27:10},
  "Braze":{rev24:583,rev25:726,ebitda25:44,sbc25:141,da25:18,other25:-18,rev26:874,rev27:1024,ebitda26:81,ebitda27:126,sbc26:170,sbc27:199,da26:13,da27:12,other26:-21,other27:-23},
  "Tenable":{rev24:900,rev25:999,ebitda25:235,sbc25:192,da25:16,other25:55,rev26:1070,rev27:1148,ebitda26:269,ebitda27:298,sbc26:205,sbc27:220,da26:18,da27:19,other26:76,other27:85},
  "Intapp":{rev24:467,rev25:539,ebitda25:106,sbc25:97,da25:18,other25:26,rev26:611,rev27:690,ebitda26:132,ebitda27:162,sbc26:113,sbc27:128,da26:18,da27:22,other26:26,other27:29},
  "Alkami":{rev24:333.8,rev25:443.6,ebitda25:59.1,sbc25:76.2,da25:2.1,other25:-5.1,rev26:528.2,rev27:618.5,ebitda26:95.6,ebitda27:132.2,sbc26:90.7,sbc27:106.2,da26:1.2,da27:2.5,other26:-21.9,other27:-25.7},
  "Agilysys":{rev24:266,rev25:307,ebitda25:61,sbc25:21,da25:8,other25:-7,rev26:353,rev27:403,ebitda26:75,ebitda27:98,sbc26:24,sbc27:27,da26:11,da27:12,other26:-1,other27:8},
  "SPS Commerce":{rev24:638,rev25:752,ebitda25:231,sbc25:54,da25:22,other25:-80,rev26:802,rev27:860,ebitda26:263,ebitda27:298,sbc26:57,sbc27:61,da26:22,da27:27,other26:-49,other27:-53},
  "Monday.com":{rev24:972,rev25:1232,ebitda25:189,sbc25:177,da25:14,other25:6,rev26:1458,rev27:1696,ebitda26:189,ebitda27:254,sbc26:210,sbc27:244,da26:19,da27:29,other26:158,other27:183},
  "nCino":{rev24:535.3,rev25:590.3,ebitda25:132.5,sbc25:73.7,da25:5.8,other25:-14.4,rev26:637.3,rev27:693.8,ebitda26:170.3,ebitda27:204.7,sbc26:79.2,sbc27:86.2,da26:6.0,da27:10.6,other26:-9.4,other27:-11.0},
  "AvePoint":{rev24:330,rev25:419,ebitda25:84,sbc25:39,da25:5,other25:-14,rev26:514,rev27:615,ebitda26:100,ebitda27:132,sbc26:48,sbc27:58,da26:6,da27:5,other26:-3,other27:-5},
  "Freshworks":{rev24:720,rev25:839,ebitda25:204,sbc25:147,da25:26,other25:-5,rev26:956,rev27:1090,ebitda26:203,ebitda27:250,sbc26:167,sbc27:191,da26:18,da27:20,other26:-1,other27:-2},
  "Five9":{rev24:1042,rev25:1149,ebitda25:270,sbc25:148,da25:56,other25:-156,rev26:1255,rev27:1381,ebitda26:303,ebitda27:349,sbc26:162,sbc27:178,da26:59,da27:68,other26:-206,other27:-219},
  "Asana":{rev24:718,rev25:785,ebitda25:70,sbc25:215,da25:22,other25:18,rev26:849,rev27:916,ebitda26:101,ebitda27:125,sbc26:231,sbc27:249,da26:22,da27:24,other26:22,other27:24},
  "Flywire":{rev24:492,rev25:603,ebitda25:121,sbc25:72,da25:17,other25:-10,rev26:719,rev27:829,ebitda26:162,ebitda27:201,sbc26:83,sbc27:95,da26:26,da27:31,other26:4,other27:4},
  "Sprinklr":{rev24:791,rev25:852,ebitda25:160,sbc25:82,da25:19,other25:-9,rev26:869,rev27:909,ebitda26:166,ebitda27:185,sbc26:86,sbc27:90,da26:21,da27:30,other26:-11,other27:-12},
  "C3.ai":{rev24:363,rev25:295,ebitda25:-165,sbc25:221,da25:13,other25:165,rev26:231,rev27:251,ebitda26:-155,ebitda27:-105,sbc26:200,sbc27:218,da26:11,da27:-10,other26:155,other27:105},
  "PagerDuty":{rev24:464,rev25:490,ebitda25:134,sbc25:100,da25:16,other25:-20,rev26:492,rev27:501,ebitda26:136,ebitda27:147,sbc26:98,sbc27:100,da26:17,da27:20,other26:-19,other27:-20},
}

// LTM EBITDA ($M) — used for debt sizing in LBO (industry convention: leverage on trailing EBITDA)
const LTM_EBITDA={
  "Toast":673,
  "Okta":802,
  "Bentley Systems":552.4,
  "DigitalOcean":382,
  "HubSpot":771.3,
  "Figma":137,
  "Rubrik":30,
  "Dynatrace":612.8,
  "Nutanix":659,
  "DocuSign":1095,
  "Nemetschek":463.1,
  "Procore":319.0,
  "SailPoint":209,
  "ServiceTitan":155.2,
  "Paycom":907.8,
  "Waystar":486,
  "Paylocity":616,
  "AppFolio":265,
  "Fastly":86,
  "JFrog":101,
  "Klaviyo":203,
  "Wix.com":395,
  "CCC Intelligent Solutions":450.6,
  "Elastic":291,
  "RingCentral":666,
  "UiPath":387,
  "SentinelOne":101,
  "Zeta":307,
  "Bill.com":299,
  "Workiva":110,
  "Cellebrite":134,
  "Q2 Holdings":197,
  "Qualys":315,
  "GitLab":165,
  "BlackLine":196,
  "Braze":54,
  "Tenable":243,
  "Intapp":113,
  "Alkami":70.1,
  "Agilysys":64,
  "SPS Commerce":239,
  "Monday.com":189,
  "nCino":143.8,
  "AvePoint":88,
  "Freshworks":204,
  "Five9":278,
  "Asana":83,
  "Flywire":131,
  "Sprinklr":165,
  "C3.ai":-199,
  "PagerDuty":137,
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const fmt  = n=>Math.abs(n)>=1000?`$${(n/1000).toFixed(1)}B`:`$${Math.round(Math.abs(n))}M`;
const fmtN = n=>Math.abs(n)>=1000?`${(n/1000).toFixed(1)}B`:`${Math.round(Math.abs(n))}M`;
const fmtM = n=>n<0?`(${Math.round(Math.abs(n)).toLocaleString()})`:`${Math.round(n).toLocaleString()}`;
const fmtPct = n=>n<0?`(${Math.abs(n)}%)`:`${n}%`;
const riskColor=r=>({"Low":"bg-green-100 text-green-800","Medium":"bg-yellow-100 text-yellow-800","High":"bg-red-100 text-red-800"})[r]||"bg-gray-100";
const irrColor=v=>v>=IRR_GREAT?"text-green-700 font-bold":v>=IRR_GOOD?"text-lime-700 font-bold":v>=IRR_OK?"text-yellow-600":"text-red-500";
const irrLabel=v=>v>=IRR_GREAT?"★ Great":v>=IRR_GOOD?"✓ Good":v>=IRR_OK?"~ OK":"✗ Weak";
const scColor=s=>s>=7.5?"text-green-700":s>=6.0?"text-lime-700":s>=4.5?"text-yellow-600":"text-red-500";
function dcfPerShare(intrinsic,sd){
  if(!sd?.sharesOut)return null;
  return Math.round(((intrinsic-sd.netDebt)/sd.sharesOut)*100)/100;
}
function lboEntryTEV(sd,ntmRev,ntmRevX){
  if(!sd?.sharePrice)return ntmRev*ntmRevX*LBO_PREM;
  return Math.round((sd.sharePrice*LBO_PREM*sd.sharesOut)+sd.netDebt);
}
function getDimExpl(co,dim,s){
  if(dim==="val")return`EV/EBITDA ${s.evEbitda}x (primary, max 2pts): ${s.evEbitda<10?"<10x — attractive":s.evEbitda<15?"10–15x — moderate":s.evEbitda<20?"15–20x — elevated":">20x — premium"}. EV/Rev ${s.evRev}x (secondary, max 1pt): ${s.evRev<3?"<3x deep value":s.evRev<6?"3–6x reasonable":s.evRev<10?"6–10x above avg":">10x premium"}. Score: ${s.valScore}/3.0`;
  if(dim==="qual"){const mp=co.sor?1.0:0.35;const rm=(co.pricing==="Usage-Based"?0.35:0.10)+(!co.seat?0.20:0);const pp=Math.min((Math.min(co.ebitda,50)/50)*0.75,0.75);const ml=(Math.min(Math.max(co.cagr,0),25)/25)*0.40;const ig={"High":0.30,"Medium-High":0.225,"Medium":0.15,"Low-Medium":0.075,"Low":0}[co.peFit]||0.15;return`Mkt Pos ${mp.toFixed(2)}/1.0 (${co.sor?"SoR":"non-SoR"}). Rev Moat ${rm.toFixed(2)}/0.55 (${co.pricing}${!co.seat?", non-seat":""} ). Pricing Pwr ${pp.toFixed(2)}/0.75. Mkt Lead ${ml.toFixed(2)}/0.40 (N3Y CAGR ${co.cagr}%). Grade ${ig.toFixed(3)}/0.30 (PE Fit: ${co.peFit}). Score: ${s.qualScore}/3.0`;}
  if(dim==="ai")return`Base "${co.aiRisk}" → ${{"Low":2.6,"Medium":1.4,"High":0.1}[co.aiRisk]} pts. SoR: ${co.sor?"+0.2":"+0"}. Pricing: ${co.pricing==="Usage-Based"?"+0.2 (usage)":"-0.2 (seat)"}. Score: ${s.aiScore}/3.0`;
  if(dim==="lbo")return`IRR ${s._lbo?.irr}% → ${irrLabel(s._lbo?.irr||0)}. Entry ${fmt(s._lbo?.entryTEV)} at ${s._lbo?.entryEBITDAMult}x EV/EBITDA. Exit ${fmt(s._lbo?.exitTEV)} at ${s._lbo?.exitEBITDAMult}x. MOIC ${s._lbo?.moic}x. Score: ${s.lboScore}/3.0`;
  if(dim==="dcf")return`DCF/share: $${s._dcfShare??'N/A'} vs current $${co.sd?.sharePrice??'N/A'}. Intrinsic TEV ${fmt(s._dcf?.intrinsic)} vs TEV ${fmt(co.tev)}. PV FCFs: ${fmt(s._dcf?.pvSum)}, PV TV: ${fmt(s._dcf?.pvTV)}. Score: ${s.dcfScore}/2.0`;
  if(dim==="pe")return`PE Fit "${co.peFit}": FCF predictability, margin levers, scale, mgmt alignment. Score: ${s.peScore}/1.0`;
  return"";
}
function SliderInput({label,value,min,max,step=1,unit="",onChange}){
  return(
    <div className="flex items-center gap-2" onClick={e=>e.stopPropagation()}>
      <span className="text-gray-500 w-44 flex-shrink-0 text-xs">{label}</span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={e=>onChange(Number(e.target.value))} className="flex-1 accent-gray-700 h-1.5" style={{minWidth:80}}/>
      <input type="number" min={min} max={max} step={step} value={value} onChange={e=>onChange(Number(e.target.value))} className="w-16 border border-gray-300 rounded px-1.5 py-0.5 text-xs text-right"/>
      <span className="text-gray-400 text-xs w-4">{unit}</span>
    </div>
  );
}
export default function App(){
  const [authed,setAuthed]=useState(false);
  const [pw,setPw]=useState("");
  const [tab,setTab]=useState("screen");
  const [avoidFilter,setAvoidFilter]=useState("All");
  const [searchQuery,setSearchQuery]=useState("");
  const [aiRiskFilter,setAiRiskFilter]=useState("All");
  const [sorFilter,setSorFilter]=useState("All");
  const [sortBy,setSortBy]=useState("Score");
  const [expanded,setExpanded]=useState(null);
  const [openDim,setOpenDim]=useState({});
  const [openSec,setOpenSec]=useState({});
  const [gWacc,setGWacc]=useState(DEFAULT_WACC);
  const [gPgr,setGPgr]=useState(DEFAULT_PGR);
  const [overrides,setOverrides]=useState({});
  const getOv=n=>overrides[n]||{};
  const setOv=(n,k,v)=>setOverrides(p=>({...p,[n]:{...p[n],[k]:v}}));
  const resetOv=n=>setOverrides(p=>{const x={...p};delete x[n];return x;});
  const companies=RAW.map(co=>{
    const ov=getOv(co.name);
    const fin=COMPANY_FINANCIALS[co.name];
    // Terminal margin = 2027 consensus (stay flat after forecast period); fallback to NTM ebitda for companies without fin data
    const defEndM=fin&&fin.ebitda27&&fin.rev27?Math.round((fin.ebitda27/fin.rev27)*1000)/10:Math.max(co.ebitda,Math.min(co.ebitda+10,40));
    // Compute 2027 consensus growth rate and default CAGR from convergence model (high-growth → 10%; sub-10% stays flat)
    const oldStartG=fin&&fin.rev25?Math.round((fin.rev26/fin.rev25-1)*1000)/10:co.growth;
    const g2027Rate=fin?(fin.rev27/fin.rev26-1):(oldStartG/100);
    let simRev=fin?fin.rev27:(co.ntmRev*(1+g2027Rate));
    const terminalG=Math.min(g2027Rate,0.10);
    for(let yr=3;yr<=DCF_YEARS;yr++){simRev*=(1+(g2027Rate+(terminalG-g2027Rate)*((yr-3)/7)));}
    const rev2026=fin?fin.rev26:co.ntmRev;
    const defCAGR=Math.round((Math.pow(simRev/rev2026,1/(DCF_YEARS-1))-1)*1000)/10;
    const g=ov.growth??defCAGR;
    const eM=ov.endMargin??defEndM;
    const xM=ov.exitMult??null;
    const entryTEV=lboEntryTEV(co.sd,co.ntmRev,co.ntmRevX);
    const otherConv=fin?(fin.other27/fin.ebitda27):0;
    const dcf=runDCF(co.name,g,g2027Rate,defCAGR,co.ebitda,eM,gWacc,gPgr,co.ntmRev);
    const lbo=runLBO(co.ntmRev,co.ntmRevX,co.ebitda,g,eM,xM,entryTEV,LTM_EBITDA[co.name]??null,otherConv,co.name,g2027Rate,defCAGR);
    const sc=scoreCompany(co,dcf,lbo);
    const ntmEBITDAX=Math.round((co.tev/(co.ntmRev*co.ebitda/100))*10)/10;
    const dcfShare=dcfPerShare(dcf.intrinsic,co.sd);
    const sharePct=co.sd&&dcfShare?Math.round((dcfShare/co.sd.sharePrice-1)*100):null;
    return{...co,defCAGR,oldStartG,g2027Rate,dcf,lbo,ntmEBITDAX,...sc,_dcf:dcf,_lbo:lbo,dcfShare,sharePct,
      _scores:{...sc,_dcf:dcf,_lbo:lbo,_dcfShare:dcfShare,evEbitda:ntmEBITDAX,evRev:co.ntmRevX}};
  }).sort((a,b)=>b.total-a.total);
  const filtered=(()=>{
    const f=companies.filter(c=>{
      if(c.hidden)return false;
      if(avoidFilter==="Top Picks"&&(c.avoid||c.total<7.0))return false;
      if(avoidFilter==="Avoid"&&!c.avoid)return false;
      if(searchQuery){const q=searchQuery.toLowerCase();if(!c.name.toLowerCase().includes(q)&&!c.vertical.toLowerCase().includes(q))return false;}
      if(aiRiskFilter!=="All"&&c.aiRisk!==aiRiskFilter)return false;
      if(sorFilter==="SoR Only"&&!c.sor)return false;
      return true;
    });
    if(sortBy==="IRR ↓")return [...f].sort((a,b)=>b.lbo.irr-a.lbo.irr);
    if(sortBy==="DCF % ↓")return [...f].sort((a,b)=>(b.sharePct??-9999)-(a.sharePct??-9999));
    if(sortBy==="TEV ↓")return [...f].sort((a,b)=>b.tev-a.tev);
    if(sortBy==="EV/EBITDA ↓")return [...f].sort((a,b)=>b.ntmEBITDAX-a.ntmEBITDAX);
    if(sortBy==="EV/EBITDA ↑")return [...f].sort((a,b)=>a.ntmEBITDAX-b.ntmEBITDAX);
    return f;
  })();
  const dimCfg=[["val","Valuation","/3.0"],["qual","Biz Quality","/3.0"],["ai","AI Risk","/3.0"],["lbo","LBO","/3.0"],["dcf","DCF","/2.0"],["pe","PE Fit","/1.0"]];
  if(!authed)return(
    <div className="min-h-screen font-sans text-sm flex items-center justify-center bg-cover bg-center bg-no-repeat relative" style={{backgroundImage:"url('/miami-bg.avif')"}}>
      <img src="/permira-logo.png" alt="Permira" className="absolute top-10 left-10 h-16"/>
      <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-8 w-80">
        <h1 className="text-xl font-bold text-gray-900 mb-1">Miami Offsite Demo — Take-Private Screen</h1>
        <p className="text-xs text-gray-500 mb-6">Permira · Enter password to continue</p>
        <form onSubmit={e=>{e.preventDefault();if(pw==="miami")setAuthed(true);else{setPw("");alert("Incorrect password");}}} className="space-y-4">
          <input type="password" value={pw} onChange={e=>setPw(e.target.value)} placeholder="Password" autoFocus className="w-full border border-gray-300 rounded px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-gray-400"/>
          <button type="submit" className="w-full bg-gray-900 text-white rounded py-2 text-sm font-medium hover:bg-gray-800 transition-colors">Enter</button>
        </form>
      </div>
    </div>
  );
  return(
    <div className="bg-gray-50 min-h-screen font-sans text-sm">
    <div className="max-w-6xl mx-auto p-2 sm:p-4">
      <div className="mb-4">
        <h1 className="text-xl font-bold text-gray-900">Miami Offsite Demo — Take-Private Screen</h1>
        <p className="text-xs text-gray-500 mt-0.5">Permira · {filtered.length} companies · Data as of 4/17/2026</p>
      </div>
      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-gray-200">
        {[["screen","📊 Screen"],["methodology","📐 Methodology"],["assumptions","⚙️ Assumptions"]].map(([k,l])=>(
          <button key={k} onClick={()=>setTab(k)} className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors ${tab===k?"border-gray-900 text-gray-900":"border-transparent text-gray-500 hover:text-gray-700"}`}>{l}</button>
        ))}
      </div>
      {/* ASSUMPTIONS */}
      {tab==="assumptions"&&(
        <div className="space-y-4">
          <div className="bg-white rounded-lg border border-blue-200 p-5">
            <h2 className="font-bold text-blue-900 mb-3">🌐 Global DCF Toggles</h2>
            <div className="space-y-3 max-w-xl">
              <SliderInput label="WACC" value={gWacc} min={6} max={20} step={0.5} unit="%" onChange={setGWacc}/>
              <SliderInput label="Terminal Growth (PGR)" value={gPgr} min={1} max={8} step={0.5} unit="%" onChange={setGPgr}/>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-lg border border-blue-100 p-4 text-xs space-y-1.5">
              <p className="font-bold text-blue-900 mb-2">📈 DCF Assumptions</p>
              {[["Period","10 years"],["Yr 1","NTM actuals (locked — revenue and EBITDA margin)"],["Growth","Yr 1 = NTM rate; if >10%, linearly converges to 10% by Yr 10"],["Margin expansion","Linear Yr 2→Yr 10 from NTM margin to end-state (no contraction)"],["End-state margin","NTM+10% up to 40% cap (per-company override available)"],["FCF conversion","EBITDA × 85%"],["WACC",`${gWacc}% (global toggle)`],["PGR",`${gPgr}% (global toggle)`],["Terminal value","Gordon Growth on terminal FCF"],["DCF vs share price","Equity value = Intrinsic TEV − Net Debt ÷ Shares Out"]].map(([k,v])=>(
                <div key={k} className="flex gap-2 pb-1 border-b border-gray-100"><span className="text-gray-400 w-40 flex-shrink-0">{k}</span><span className="font-medium text-gray-800">{v}</span></div>
              ))}
            </div>
            <div className="bg-white rounded-lg border border-orange-100 p-4 text-xs space-y-1.5">
              <p className="font-bold text-orange-900 mb-2">💰 LBO Assumptions</p>
              {[["Entry price","Share price × 1.30 × shares out + net debt"],["Entry EV/EBITDA","Derived: Entry TEV ÷ NTM EBITDA"],["Leverage","7.0× LTM EBITDA (as of 6/30/2026), capped at 75% TEV"],["Interest","9.0% on gross debt (fixed — no paydown)"],["Debt","Fixed throughout hold"],["Cash to BS","10% of 2026 revenue"],["Fees","Financing 3% of debt + Transaction 1.75% of EV"],["Cash Balance","BoP Cash + UFCF (Pre-Tax) − Taxes (22% on EBT) − Net Interest Expense"],["Options","10% of equity gains at exit"],["Hold","4.5 years (entry 6/30/2026, exit 12/31/2030)"],["Revenue/margins","Same as DCF Yrs 1–5; Yr 6 projected for NTM exit EBITDA"],["Exit multiple","Applied to NTM EBITDA (Yr 6); defaults to entry EV/EBITDA, hard cap 20×"],["Exit equity","Exit TEV − Gross Debt + Accumulated Cash"],["IRR","≥25% Great | ≥20% Good | ≥15% OK | <15% Weak"]].map(([k,v])=>(
                <div key={k} className="flex gap-2 pb-1 border-b border-gray-100"><span className="text-gray-400 w-36 flex-shrink-0">{k}</span><span className="font-medium text-gray-800">{v}</span></div>
              ))}
            </div>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs text-yellow-800">
            <strong>⚠️ Disclaimer:</strong> Illustrative screening tool only. Not a substitute for full financial modelling and due diligence.
          </div>
        </div>
      )}
      {/* METHODOLOGY */}
      {tab==="methodology"&&(
        <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-3 text-xs">
          <h2 className="font-bold text-gray-900 text-sm mb-1">Composite Score (0–10 · max 15 raw pts → normalized)</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 mb-3">
            {[["AI Risk","3.0pts","Highest weight"],["Biz Quality","3.0pts","SoR, moat, CAGR"],["Valuation","3.0pts","EV/EBITDA primary"],["LBO Returns","3.0pts","IRR thresholds"],["DCF Upside","2.0pts","DCF/share vs price"],["PE Fit","1.0pt","FCF, levers, scale"]].map(([d,p,n])=>(
              <div key={d} className="bg-gray-50 border border-gray-200 rounded p-2"><div className="font-semibold text-gray-800">{d}</div><div className="text-green-700 font-bold">{p}</div><div className="text-gray-400">{n}</div></div>
            ))}
          </div>
          {[["Valuation (3pts)","EV/EBITDA primary (max 2pts): <10x ≈ maximum; >20x ≈ near zero. EV/Revenue secondary (max 1pt): <3x maximum; >12x minimum.","bg-blue-50 border-blue-200"],
            ["Business Quality (3pts)","Market Positioning: SoR=1.0, non-SoR=0.35 (max 1.0pt). Revenue Moat: usage-based+0.35/seat-based+0.10, non-seat-locked+0.20 (max 0.55pt). Pricing Power: EBITDA margin proxy, capped at 50% (max 0.75pt). Market Leadership: N3Y CAGR capped at 25% (max 0.40pt). Investment Grade: PE Fit signal (max 0.30pt).","bg-purple-50 border-purple-200"],
            ["AI Risk (3pts)","Base: Low=2.6, Medium=1.4, High=0.1. Bonuses: SoR +0.2, Usage-Based +0.2, Seat-Based −0.2, PE-Owned +0.2.","bg-red-50 border-red-200"],
            ["LBO Returns (3pts)","≥25% = 3.0 | ≥20% = 2.2 | ≥15% = 1.4 | <15% = scaled to 0. Entry at 30% premium to share price, 7× leverage at 9% fixed, 4.5-year hold, exit multiple applied to NTM (Yr 6) EBITDA capped 20×.","bg-orange-50 border-orange-200"],
            ["DCF Upside (2pts)","Centred at 1.0. Compares DCF equity value per share vs current share price. Rises to 2.0 if significant upside; falls to 0 if significant downside.","bg-yellow-50 border-yellow-200"],
            ["PE Fit (1pt)","High=1.0, Medium-High=0.75, Medium=0.5, Low-Medium=0.25, Low=0.1.","bg-green-50 border-green-200"],
          ].map(([t,b,c])=>(
            <div key={t} className={`rounded-lg border p-3 ${c}`}><p className="font-semibold text-gray-800 mb-1">{t}</p><p className="text-gray-600">{b}</p></div>
          ))}
        </div>
      )}
      {/* TOP 5 */}
      {tab==="top5"&&(
        <div className="space-y-6">
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <h2 className="font-bold text-purple-900 mb-1">🏆 Top 5 Take-Private Candidates — Deep Dive</h2>
            <p className="text-xs text-purple-700">Ranked by composite score (excluding avoided names). Three scenarios per company with company-specific revenue CAGR and terminal margin assumptions — <strong>Downside</strong> (left), <strong>Base Case</strong> (centre), <strong>Upside</strong> (right) — each with the reasoning behind the operating case. Qualitative analysis covers business model, competitive dynamics, AI risk, and PE thesis.</p>
          </div>
          {companies.filter(c=>!c.avoid).slice(0,5).map((co,idx)=>{
            const d=TOP5_DATA[co.name]||{};
            const defEndM=Math.max(co.ebitda,Math.min(co.ebitda+10,40));
            const entryTEV=lboEntryTEV(co.sd,co.ntmRev,co.ntmRevX);
            const entryMult=Math.min(entryTEV/(co.ntmRev*co.ebitda/100),LBO_MAX_EXIT);
            const scenarioCfgs=d.scenarios||[
              {growthDelta:-5,marginDelta:-3,exitFactor:0.8,reasons:[]},
              {growthDelta:0,marginDelta:0,exitFactor:1.0,reasons:[]},
              {growthDelta:5,marginDelta:5,exitFactor:1.0,reasons:[]}
            ];
            const scenarioMeta=[
              {label:"⬇ Downside",bg:"bg-red-50",border:"border-red-200",hd:"text-red-800",sub:"text-red-600",tag:"bg-red-100 text-red-700"},
              {label:"◆ Base Case",bg:"bg-blue-50",border:"border-blue-200",hd:"text-blue-800",sub:"text-blue-600",tag:"bg-blue-100 text-blue-700"},
              {label:"⬆ Upside",bg:"bg-green-50",border:"border-green-200",hd:"text-green-800",sub:"text-green-600",tag:"bg-green-100 text-green-700"}
            ];
            const scenarios=scenarioCfgs.map((s,si)=>{
              const gUsed=co.defCAGR+s.growthDelta;
              const mUsed=Math.max(defEndM+s.marginDelta,co.ebitda);
              const exitMult=s.exitFactor<1?Math.round(entryMult*s.exitFactor*10)/10:null;
              const oConv=COMPANY_FINANCIALS[co.name]?(COMPANY_FINANCIALS[co.name].other27/COMPANY_FINANCIALS[co.name].ebitda27):0;
              const lbo=si===1?co.lbo:runLBO(co.ntmRev,co.ntmRevX,co.ebitda,gUsed,mUsed,exitMult,entryTEV,co.lbo.levEBITDA,oConv,co.name,co.g2027Rate,co.defCAGR);
              const dcf=si===1?co.dcf:runDCF(co.name,gUsed,co.g2027Rate,co.defCAGR,co.ebitda,mUsed,gWacc,gPgr,co.ntmRev);
              const dcfShare=si===1?co.dcfShare:dcfPerShare(dcf.intrinsic,co.sd);
              return{...scenarioMeta[si],gUsed,mUsed,lbo,dcf,dcfShare,reasons:s.reasons||[]};
            });
            const sections=[
              {title:"🏢 Business & Market",key:"business",bg:"bg-blue-50",border:"border-blue-100",hd:"text-blue-900",bullet:"text-blue-400"},
              {title:"⚔️ Competitive Landscape",key:"competition",bg:"bg-purple-50",border:"border-purple-100",hd:"text-purple-900",bullet:"text-purple-400"},
              {title:"🤖 AI Risk Assessment",key:"aiRisk",bg:"bg-orange-50",border:"border-orange-100",hd:"text-orange-900",bullet:"text-orange-400"},
              {title:"🎯 PE Take-Private Thesis",key:"thesis",bg:"bg-green-50",border:"border-green-100",hd:"text-green-900",bullet:"text-green-500"}
            ];
            return(
              <div key={co.name} className="bg-white rounded-xl border border-purple-200 overflow-hidden shadow-sm">
                <div className="bg-gradient-to-r from-purple-900 to-indigo-800 px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-purple-900 font-black text-sm flex-shrink-0">#{idx+1}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-white font-bold text-base">{co.name}</span>
                        <span className="text-purple-200 text-xs border border-purple-400 px-1.5 py-0.5 rounded">{co.vertical}</span>
                      </div>
                      <div className="flex gap-3 mt-1 text-xs text-purple-200 flex-wrap">
                        <span>TEV {fmt(co.tev)}</span>
                        <span>{co.ntmRevX}× NTM Rev</span>
                        <span>{co.ebitda}% EBITDA</span>
                        <span>{co.growth}% growth</span>
                        <span>N3Y CAGR {co.cagr}%</span>
                        <span className="text-yellow-300 font-bold">Score {co.total}/10</span>
                      </div>
                      {d.headline&&<p className="text-purple-100 text-xs mt-1.5 italic">{d.headline}</p>}
                    </div>
                  </div>
                </div>
                <div className="p-5 space-y-5">
                  <div>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">📊 3-Scenario Returns Analysis</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {scenarios.map(s=>(
                        <div key={s.label} className={`${s.bg} border ${s.border} rounded-lg p-3 flex flex-col gap-2`}>
                          <div>
                            <p className={`font-bold text-xs mb-1 ${s.hd}`}>{s.label}</p>
                            <div className="flex gap-1.5 flex-wrap">
                              <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${s.tag}`}>Rev CAGR {s.gUsed}%</span>
                              <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${s.tag}`}>Term. Margin {Math.round(s.mUsed*10)/10}%</span>
                            </div>
                          </div>
                          {s.reasons.length>0&&(
                            <ul className="space-y-1">
                              {s.reasons.map((r,i)=>(
                                <li key={i} className={`text-xs leading-snug flex gap-1 ${s.sub}`}>
                                  <span className="flex-shrink-0 mt-0.5">•</span>
                                  <span>{r}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                          <div className={`border-t ${s.border} pt-2 space-y-1`}>
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-gray-400">IRR</span>
                              <span className={irrColor(s.lbo.irr)}>{s.lbo.irr}%</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-gray-400">MOIC</span>
                              <span className="font-semibold text-gray-800">{s.lbo.moic}×</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-gray-400">DCF TEV</span>
                              <span className="font-semibold text-gray-700">{fmt(s.dcf.intrinsic)}</span>
                            </div>
                            {s.dcfShare&&co.sd&&(
                              <div className="flex justify-between items-center text-xs">
                                <span className="text-gray-400">DCF/share</span>
                                <span className={`font-semibold ${s.dcfShare>co.sd.sharePrice?"text-green-700":"text-red-600"}`}>${s.dcfShare} vs ${co.sd.sharePrice}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {sections.map(sec=>(
                      <div key={sec.key} className={`rounded-lg border ${sec.border} ${sec.bg} p-3`}>
                        <p className={`font-bold text-xs mb-2 ${sec.hd}`}>{sec.title}</p>
                        <ul className="space-y-1.5">
                          {(d[sec.key]||[]).map((b,i)=>(
                            <li key={i} className="flex gap-1.5 text-xs text-gray-700 leading-snug">
                              <span className={`mt-0.5 flex-shrink-0 ${sec.bullet}`}>▸</span>
                              <span>{b}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
          <p className="text-xs text-gray-400 text-center">Top 5 by composite score (non-avoided) · Revenue CAGR = Yr1 NTM growth rate per scenario · Terminal margin = Yr5 end-state EBITDA margin · Downside applies −20% to default exit multiple</p>
        </div>
      )}
            {/* SCREEN */}
      {tab==="screen"&&(
        <>
          {/* Filters */}
          {(()=>{
            const anyActive=searchQuery||avoidFilter!=="All"||aiRiskFilter!=="All"||sorFilter!=="All"||sortBy!=="Score";
            const PillRow=({label,opts,val,set})=>(
              <div className="flex flex-wrap gap-1 items-center">
                <span className="text-xs text-gray-400 font-medium w-16 flex-shrink-0">{label}</span>
                {opts.map(f=>(
                  <button key={f} onClick={()=>set(f)} className={`px-2.5 py-0.5 rounded-full text-xs font-medium border transition-all ${val===f?"bg-gray-900 text-white border-gray-900":"bg-white text-gray-600 border-gray-300 hover:border-gray-500"}`}>{f}</button>
                ))}
              </div>
            );
            return(
              <div className="bg-white rounded-lg border border-gray-200 p-3 mb-3 space-y-2">
                <input
                  type="text"
                  placeholder="Search company or vertical…"
                  value={searchQuery}
                  onChange={e=>setSearchQuery(e.target.value)}
                  className="w-full border border-gray-200 rounded-md px-3 py-1.5 text-base sm:text-xs focus:outline-none focus:ring-1 focus:ring-gray-400 placeholder-gray-400"
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-0.5">
                  <PillRow label="Show" opts={["All","Top Picks","Avoid"]} val={avoidFilter} set={setAvoidFilter}/>
                  <PillRow label="AI Risk" opts={["All","Low","Medium","High"]} val={aiRiskFilter} set={setAiRiskFilter}/>
                  <PillRow label="SoR" opts={["All","SoR Only"]} val={sorFilter} set={setSorFilter}/>
                  <PillRow label="Sort" opts={["Score","IRR ↓","DCF % ↓","TEV ↓","EV/EBITDA ↓","EV/EBITDA ↑"]} val={sortBy} set={setSortBy}/>
                </div>
                <div className="flex items-center justify-between pt-0.5">
                  <span className="text-xs text-gray-400">{filtered.length} companies</span>
                  {anyActive&&<button onClick={()=>{setSearchQuery("");setAvoidFilter("All");setAiRiskFilter("All");setSorFilter("All");setSortBy("Score");}} className="text-xs text-blue-600 hover:text-blue-800 underline">Clear all filters</button>}
                </div>
              </div>
            );
          })()}
          {/* Column header */}
          <div className="bg-white border border-gray-200 rounded-lg mb-1 px-3 py-1.5 text-xs text-gray-400 font-medium hidden md:grid" style={{gridTemplateColumns:"28px 1fr 96px 54px 76px 64px 72px 50px 46px 128px 78px 50px 46px 56px 16px",gap:"0 8px",alignItems:"center"}}>
            <div></div><div>Company</div>
            <div className="text-right">Enterprise Value</div>
            <div className="text-right">EV/Rev</div>
            <div className="text-right">EV/EBITDA</div>
            <div className="text-right">Rev Growth</div>
            <div className="text-right">EBITDA Margin</div>
            <div className="text-right">IRR</div>
            <div className="text-right">MoM</div>
            <div className="text-right">DCF/Share</div>
            <div className="text-center">AI Risk</div>
            <div className="text-center">Model</div>
            <div className="text-center">SoR</div>
            <div className="text-right">Score</div>
            <div></div>
          </div>
          <div className="space-y-1">
            {filtered.map(co=>{
              const rank=filtered.indexOf(co)+1;
              const isOpen=expanded===co.name;
              const ov=getOv(co.name);
              const defEndM=Math.max(co.ebitda,Math.min(co.ebitda+10,40));
              const g=ov.growth??co.defCAGR;
              const eM=ov.endMargin??defEndM;
              const xM=ov.exitMult??Math.round(Math.min(co.ntmEBITDAX,LBO_MAX_EXIT)*10)/10;
              const hasOv=ov.growth!==undefined||ov.endMargin!==undefined||ov.exitMult!==undefined;
              return(
                <div key={co.name} className={`bg-white rounded-lg border ${co.avoid?"border-red-200":co.tev>=10000?"border-blue-100":"border-gray-200"} overflow-hidden`}>
                  {/* Desktop summary row */}
                  <div className="px-3 py-2 cursor-pointer hover:bg-gray-50 select-none text-xs hidden md:grid" onClick={()=>setExpanded(isOpen?null:co.name)}
                    style={{gridTemplateColumns:"28px 1fr 96px 54px 76px 64px 72px 50px 46px 128px 78px 50px 46px 56px 16px",gap:"0 8px",alignItems:"center"}}>
                    <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-600 flex-shrink-0">{rank}</div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1 flex-wrap">
                        <span className="font-semibold text-gray-900 text-xs">{co.name}</span>
                        {co.avoid&&<span className="bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full">AVOID</span>}
                        {co.tev>=10000&&<span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">&gt;$10B</span>}
                        {hasOv&&<span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">custom</span>}
                      </div>
                      <div className="text-gray-400">{co.vertical}</div>
                    </div>
                    <div className="text-right font-semibold">{fmt(co.tev)}</div>
                    <div className="text-right font-semibold">{co.ntmRevX}x</div>
                    <div className="text-right font-semibold">{co.ntmEBITDAX}x</div>
                    <div className="text-right font-semibold">{co.growth}%</div>
                    <div className="text-right font-semibold">{co.ebitda}%</div>
                    <div className={`text-right font-semibold ${irrColor(co.lbo.irr)}`}>{Math.round(co.lbo.irr)}%</div>
                    <div className={`text-right font-semibold ${irrColor(co.lbo.irr)}`}>{co.lbo.moic}x</div>
                    <div className={`text-right font-semibold ${co.sharePct!==null?(co.sharePct>0?"text-green-700":"text-red-500"):"text-gray-300"}`}>
                      {co.sd?co.dcfShare!==null?`$${co.dcfShare} (${co.sharePct>0?"+":""}${co.sharePct}%)`:"—":"—"}</div>
                    <div className="flex justify-center"><span className={`px-1.5 py-0.5 rounded-full font-medium ${riskColor(co.aiRisk)}`}>{co.aiRisk}</span></div>
                    <div className="flex justify-center"><span className={`px-1.5 py-0.5 rounded-full font-medium ${co.pricing==="Usage-Based"?"bg-blue-100 text-blue-800":"bg-purple-100 text-purple-800"}`}>{co.pricing==="Usage-Based"?"Usage":"Seat"}</span></div>
                    <div className="flex justify-center"><span className={`px-1.5 py-0.5 rounded-full font-medium ${co.sor?"bg-indigo-100 text-indigo-800":"bg-gray-100 text-gray-500"}`}>{co.sor?"SoR":"~SoR"}</span></div>
                    <div className={`text-right text-base font-bold ${scColor(co.total)}`}>{co.total}</div>
                    <div className="text-gray-400 text-center">{isOpen?"▲":"▼"}</div>
                  </div>
                  {/* Mobile summary card */}
                  <div className="md:hidden px-3 py-2.5 cursor-pointer hover:bg-gray-50 select-none text-xs space-y-1.5" onClick={()=>setExpanded(isOpen?null:co.name)}>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-600 flex-shrink-0">{rank}</div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className="font-semibold text-gray-900">{co.name}</span>
                          {co.avoid&&<span className="bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full">AVOID</span>}
                          {co.tev>=10000&&<span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">&gt;$10B</span>}
                        </div>
                        <div className="text-gray-400">{co.vertical}</div>
                      </div>
                      <div className={`text-base font-bold ${scColor(co.total)}`}>{co.total}</div>
                      <div className="text-gray-400">{isOpen?"▲":"▼"}</div>
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-gray-500 pl-8">
                      <span>TEV <strong className="text-gray-700">{fmt(co.tev)}</strong></span>
                      <span>EV/EBITDA <strong className="text-gray-700">{co.ntmEBITDAX}x</strong></span>
                      <span>IRR <strong className={irrColor(co.lbo.irr)}>{Math.round(co.lbo.irr)}%</strong></span>
                      <span>MoM <strong className={irrColor(co.lbo.irr)}>{co.lbo.moic}x</strong></span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 pl-8">
                      <span className={`px-1.5 py-0.5 rounded-full font-medium ${riskColor(co.aiRisk)}`}>{co.aiRisk}</span>
                      <span className={`px-1.5 py-0.5 rounded-full font-medium ${co.sor?"bg-indigo-100 text-indigo-800":"bg-gray-100 text-gray-500"}`}>{co.sor?"SoR":"~SoR"}</span>
                      <span className={`px-1.5 py-0.5 rounded-full font-medium ${co.pricing==="Usage-Based"?"bg-blue-100 text-blue-800":"bg-purple-100 text-purple-800"}`}>{co.pricing==="Usage-Based"?"Usage":"Seat"}</span>
                    </div>
                  </div>
                  {/* Expanded */}
                  {isOpen&&(
                    <div className="border-t border-gray-100 bg-gray-50 p-4 space-y-4" onClick={e=>e.stopPropagation()}>
                      {/* Description */}
                      {co.desc&&<div className="bg-white border border-gray-200 rounded-lg p-3">
                        <p className="text-xs font-semibold text-gray-700 mb-1">Business Overview</p>
                        <p className="text-xs text-gray-600 leading-relaxed">{co.desc}</p>
                      </div>}
                      {/* Thesis + AI */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div><p className="font-semibold text-gray-700 text-xs mb-1">Investment Thesis</p>
                          <ol className="space-y-1">{co.thesis.map((t,i)=><li key={i} className="text-xs text-gray-600 flex gap-1.5"><span className="text-gray-400 flex-shrink-0">{i+1}.</span><span>{t}</span></li>)}</ol>
                        </div>
                        <div><p className="font-semibold text-gray-700 text-xs mb-1">AI Risk Analysis</p>
                          <ol className="space-y-1">{co.aiRationale.map((r,i)=><li key={i} className="text-xs text-gray-600 flex gap-1.5"><span className="text-gray-400 flex-shrink-0">{i+1}.</span><span>{r}</span></li>)}</ol>
                        </div>
                      </div>
                      {/* Score badges */}
                      <div>
                        <p className="text-xs font-semibold text-gray-600 mb-2">Score Breakdown — click any badge for rationale</p>
                        <div className="flex flex-wrap gap-2">
                          {dimCfg.map(([key,label,max])=>{
                            const val=key==="dcf"?co.dcfScore:key==="pe"?co.peScore:co[`${key}Score`];
                            const dk=`${co.name}_${key}`;
                            return(
                              <div key={key}>
                                <button onClick={()=>setOpenDim(p=>({...p,[dk]:!p[dk]}))} className={`px-3 py-1.5 rounded-lg border text-xs font-medium ${openDim[dk]?"bg-gray-800 text-white border-gray-800":"bg-white text-gray-700 border-gray-300 hover:border-gray-500"}`}>
                                  {label}: <span className="font-bold">{val}</span>{max} {openDim[dk]?"▲":"▼"}
                                </button>
                                {openDim[dk]&&<div className="mt-1 p-3 bg-white border border-gray-200 rounded-lg text-xs text-gray-600 max-w-lg leading-relaxed">{getDimExpl(co,key,co._scores)}</div>}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      {/* Overrides */}
                      <div className="bg-white border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-xs font-semibold text-gray-700">🎛️ Per-Company Overrides <span className="text-gray-400 font-normal">(updates DCF + LBO live)</span></p>
                          {hasOv&&<button onClick={()=>resetOv(co.name)} className="text-xs text-red-500 border border-red-200 rounded px-2 py-0.5 hover:bg-red-50">Reset defaults</button>}
                        </div>
                        <div className="space-y-3 max-w-xl">
                          <SliderInput label="Revenue CAGR (2026–2035)" value={g} min={-5} max={50} step={0.5} unit="%" onChange={v=>setOv(co.name,"growth",v)}/>
                          <SliderInput label="End-State EBITDA Margin" value={eM} min={Math.min(co.ebitda,5)} max={65} step={0.5} unit="%" onChange={v=>setOv(co.name,"endMargin",v)}/>
                          <SliderInput label="LBO Exit EV/EBITDA" value={xM} min={3} max={25} step={0.5} unit="x" onChange={v=>setOv(co.name,"exitMult",v)}/>
                        </div>
                        <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                          {[["Default CAGR",`${co.defCAGR}%`],["Default End-Margin",`${defEndM}%`],["Default Exit Mult",`${Math.round(Math.min(co.ntmEBITDAX,LBO_MAX_EXIT)*10)/10}x`]].map(([k,v])=>(
                            <div key={k} className="bg-gray-50 rounded p-1.5 border border-gray-100"><div className="text-gray-400">{k}</div><div className="font-medium text-gray-600">{v}</div></div>
                          ))}
                        </div>
                      </div>
                      {/* DCF */}
                      <div>
                        <button onClick={()=>setOpenSec(p=>({...p,[`${co.name}_dcf`]:!p[`${co.name}_dcf`]}))} className="w-full text-left font-semibold text-blue-900 text-xs bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 hover:bg-blue-100">
                          📈 DCF (as of 6/30/2026) — Intrinsic: {fmt(co.dcf.intrinsic)} vs TEV {fmt(co.tev)} · DCF/share: {co.dcfShare?`$${co.dcfShare} (${co.sharePct>0?"+":""}${co.sharePct}%) vs $${co.sd?.sharePrice}`:"pending share data"} {openSec[`${co.name}_dcf`]?"▲":"▼"}
                        </button>
                        {openSec[`${co.name}_dcf`]&&(
                          <div className="mt-2 bg-white border border-blue-100 rounded-lg p-3 overflow-x-auto">
                            <p className="text-xs text-gray-500 mb-3">DCF as of 6/30/2026. 2026 UFCF stubbed at 50% (H2 only). 2026-2027 = consensus (locked). Revenue CAGR: {g}% (2026–2035); 2028+ implied growth: {co.dcf.rows.length>=3?co.dcf.rows[2].revGrowth:"—"}%. EBITDA margin → {eM}%. SBC/D&A held at 2027 % of rev; Other CF held at 2027 UFCF pre-tax conversion. Tax rate 25%. WACC {gWacc}% · PGR {gPgr}%</p>
                            <p className="text-[10px] text-gray-400 mb-1 italic">All figures in $M unless otherwise noted</p>
                            {(()=>{const allCols=co.dcf.hist?[co.dcf.hist,...co.dcf.rows]:co.dcf.rows;const projStart=co.dcf.hist?1:0;const first=allCols[0],last=allCols[allCols.length-1];const cagrCalc=(v0,v1)=>{if(!v0||!v1||v0<=0||v1<=0)return"";const c=Math.round((Math.pow(v1/v0,1/10)-1)*1000)/10;return fmtPct(c);};return(
                            <table className="w-full text-xs border-collapse min-w-max">
                              <thead><tr><th className="px-2 py-1.5 text-left font-semibold text-gray-600 sticky left-0 bg-white w-36 border-b-2 border-black">Metric</th>{allCols.map((r,i)=><th key={r.label} className={`px-2 py-1.5 text-center font-semibold text-gray-600 whitespace-nowrap border-b-2 border-black`} style={i<projStart?{borderRight:"2px solid black"}:{}}>{r.label}</th>)}<th className="px-2 py-1.5 text-center font-semibold text-gray-600 whitespace-nowrap border-b-2 border-black" style={{borderLeft:"2px solid black"}}>'25–'35 CAGR</th></tr></thead>
                              <tbody>
                                {[["Revenue",r=>fmtM(r.rev),{bold:true,topBorder:true},()=>cagrCalc(first.rev,last.rev)],["Rev Growth",r=>r.yr===0&&!r.revGrowth?"—":fmtPct(r.revGrowth),{italic:true},null],["EBITDA",r=>fmtM(r.ebitda),{topBorder:true,bg:true},()=>cagrCalc(first.ebitda,last.ebitda)],["EBITDA Margin",r=>fmtPct(r.ebitdaMargin),{italic:true,bg:true},null],["(-) SBC",r=>fmtM(r.sbc),{},()=>cagrCalc(first.sbc,last.sbc)],["SBC % Rev",r=>fmtPct(r.sbcPctRev),{italic:true},null],["EBITDA Post-SBC",r=>fmtM(r.ebitdaPostSBC),{bold:true,topBorder:true,bg:true},()=>cagrCalc(first.ebitdaPostSBC,last.ebitdaPostSBC)],["Post-SBC Margin",r=>fmtPct(r.ebitdaPostSBCMargin),{italic:true,bg:true},null],["(-) D&A",r=>fmtM(r.da),{},()=>cagrCalc(first.da,last.da)],["D&A % Rev",r=>fmtPct(r.daPctRev),{italic:true},null],["EBIT",r=>fmtM(r.ebit),{topBorder:true,bg:true},()=>cagrCalc(first.ebit,last.ebit)],["EBIT Margin",r=>fmtPct(r.ebitMargin),{italic:true,bg:true},null],["(-) Taxes",r=>fmtM(r.taxes),{},()=>cagrCalc(first.taxes,last.taxes)],["Tax Rate",r=>fmtPct(r.taxRate),{italic:true},null],["NOPAT",r=>fmtM(r.nopat),{topBorder:true,bg:true},()=>cagrCalc(first.nopat,last.nopat)],["NOPAT Margin",r=>fmtPct(r.nopatMargin),{italic:true,bg:true},null],["(+) D&A",r=>fmtM(r.da),{},null],["(+/-) Other Cash Flow ¹",r=>fmtM(r.otherCF),{},()=>cagrCalc(Math.abs(first.otherCF),Math.abs(last.otherCF))],["Other % Rev",r=>fmtPct(r.otherCFPctRev),{italic:true},null],["UFCF",r=>fmtM(r.ufcf),{bold:true,topBorder:true,bg:true},()=>cagrCalc(first.ufcf,last.ufcf)],["UFCF Margin",r=>fmtPct(r.ufcfMargin),{italic:true,bg:true},null],["UFCF % Conversion",r=>fmtPct(r.ufcfConv),{italic:true,bg:true},null],["Stub UFCF (H2 2026 = 50%)",r=>r.stubbed?fmtM(r.ufcfStub):fmtM(r.ufcf),{italic:true,bg:true},null],["_spacer",null,{isSpacer:true},null],["PV of UFCF",r=>r.pv===null?"":fmtM(r.pv),{boxed:true,bold:true},null]].map(([lbl,fn,opts,cagrFn])=>(
                                  opts.isSpacer?<tr key={lbl}><td colSpan={projStart+1} className="py-1.5" style={{borderRight:"2px solid black"}}></td><td colSpan={allCols.length-projStart} className="py-1.5"></td><td className="py-1.5" style={{borderLeft:"2px solid black"}}></td></tr>:
                                  <tr key={lbl} className={`${opts.topBorder?"border-t-2 border-black":""} ${opts.bg?"bg-blue-50":""}`}>
                                    <td className={`px-2 py-1 text-gray-700 sticky left-0 whitespace-nowrap ${opts.bold?"font-bold":""} ${opts.italic?"italic text-gray-400":"font-medium"} ${opts.blue?"text-blue-700":""} ${opts.bg?"bg-blue-50":"bg-white"}`} style={opts.boxed?{borderTop:"2px solid black",borderBottom:"2px solid black",borderLeft:"2px solid black"}:{}}>{lbl}</td>
                                    {allCols.map((r,ri)=><td key={r.label} className={`px-2 py-1 text-center ${opts.bold?"font-bold":""} ${opts.italic?"italic text-gray-400":""} ${opts.blue?"text-blue-700 font-medium":""}`} style={{...(opts.boxed?{borderTop:"2px solid black",borderBottom:"2px solid black",...(ri===allCols.length-1?{borderRight:"2px solid black"}:{})}:{}),...(ri<projStart?{borderRight:"2px solid black"}:{})}}>{fn(r)}</td>)}
                                    <td className={`px-2 py-1 text-center font-semibold ${opts.italic?"italic text-gray-400":""}`} style={{borderLeft:"2px solid black",...(opts.boxed?{borderTop:"2px solid black",borderBottom:"2px solid black",borderRight:"2px solid black"}:{})}}>{cagrFn?cagrFn():""}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>)})()}
                            <p className="text-[10px] text-gray-400 mt-1 italic">¹ Other Cash Flow = change in NWC + capex. UFCF (pre-tax) = EBITDA + Other CF; conversion % = UFCF (pre-tax) / EBITDA. 2028+ holds 2027 conversion constant.</p>
                            <table className="mt-4 text-xs w-auto">
                              <tbody>
                                {(()=>{
                                  const nd=co.sd?.netDebt??0,eqV=co.dcf.intrinsic-nd,shr=co.sd?.sharesOut,dcfShr=shr?(eqV/shr).toFixed(2):null,curP=co.sd?.sharePrice,prem=dcfShr&&curP?Math.round((dcfShr/curP-1)*100):null;
                                  return [
                                    ["Terminal Value Calculation","","",true,false,false,undefined,true],
                                    [`Terminal Year UFCF (2035) × (1 + PGR ${Math.round(co.dcf.pgr*1000)/10}%)`,"",`$${fmtM(co.dcf.tvUFCF)}`,false,false],
                                    [`÷ (WACC ${Math.round(co.dcf.wacc*1000)/10}% – PGR ${Math.round(co.dcf.pgr*1000)/10}%)`,"",`$${fmtM(co.dcf.tv)}`,false,false],
                                    [`Discounted to present (Year ${DCF_YEARS})`,"",`$${fmtM(co.dcf.pvTV)}`,false,false],
                                    ["","","",false,false,true],
                                    ["NPV of UFCFs","",`$${fmtM(co.dcf.pvSum)}`,false,false],
                                    ["(+) NPV of Terminal Value","",`$${fmtM(co.dcf.pvTV)}`,false,false],
                                    ["DCF Intrinsic TEV","",`$${fmtM(co.dcf.intrinsic)}`,true,true],
                                    ["(–) Net Debt","",`$${fmtM(Math.abs(nd))}`,false,false],
                                    ["DCF Equity Value","",`$${fmtM(eqV)}`,true,true],
                                    [`÷ Shares Outstanding`,"",shr?`${shr}`:"N/A",false,false],
                                    ["DCF / Share","",dcfShr?`$${dcfShr}`:"N/A",true,true],
                                    ["","","",false,false,true],
                                    ["Current Share Price","",curP?`$${curP}`:"N/A",false,false],
                                    ["Implied Premium / (Discount)","",prem!==null?`${prem>0?"+":""}${prem}%`:"N/A",true,false,false,prem],
                                  ].map(([label,calc,val,bold,border,spacer,premVal,underline],i)=>(
                                    spacer?<tr key={i}><td colSpan={3} className="py-1.5"></td></tr>:
                                    <tr key={i} className={border?"border-t-2 border-black":""}>
                                      <td className={`pr-6 py-0.5 text-gray-700 whitespace-nowrap ${bold?"font-bold":""} ${underline?"underline":""}`}>{label}</td>
                                      <td className="pr-4 py-0.5 text-gray-400 text-right whitespace-nowrap">{calc}</td>
                                      <td className={`py-0.5 text-right font-medium whitespace-nowrap ${bold?"font-bold":""} ${premVal!==undefined?(premVal>0?"text-green-700":"text-red-600"):""}`}>{val}</td>
                                    </tr>
                                  ))
                                })()}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                      {/* LBO */}
                      <div>
                        <button onClick={()=>setOpenSec(p=>({...p,[`${co.name}_lbo`]:!p[`${co.name}_lbo`]}))} className="w-full text-left font-semibold text-orange-900 text-xs bg-orange-50 border border-orange-200 rounded-lg px-3 py-2 hover:bg-orange-100">
                          💰 LBO — IRR: <span className={irrColor(co.lbo.irr)}>{co.lbo.irr}% {irrLabel(co.lbo.irr)}</span> · MOIC: {co.lbo.moic}x {openSec[`${co.name}_lbo`]?"▲":"▼"}
                        </button>
                        {openSec[`${co.name}_lbo`]&&(
                          <div className="mt-2 bg-white border border-orange-100 rounded-lg p-3 overflow-x-auto">
                            <p className="text-[10px] italic text-gray-500 mb-2">All figures in $M unless otherwise noted</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                              <div className="border border-gray-200 rounded text-xs overflow-hidden">
                                <div className="bg-gray-900 text-white font-bold px-3 py-1.5">Purchase Price</div>
                                <div className="px-3 py-2 space-y-1.5">
                                {(()=>{const sd=co.sd,offerPrice=sd?Math.round(sd.sharePrice*LBO_PREM*100)/100:null,equityVal=sd?Math.round(offerPrice*sd.sharesOut):null,entryTEV=co.lbo.entryTEV;return[
                                  ["Share Price",sd?`$${sd.sharePrice.toFixed(2)}`:"—",""],
                                  ["(×) Premium",`${Math.round((LBO_PREM-1)*100)}%`,"text-gray-400"],
                                  ["Offer Price",sd?`$${offerPrice.toFixed(2)}`:"—","font-bold border-t-2 border-black pt-1 bg-orange-50 -mx-3 px-3 py-0.5"],
                                  ["(×) FDSO",sd?`${sd.sharesOut}`:"—","text-gray-400"],
                                  ["Equity Value",sd?fmtM(equityVal):"—","font-bold border-t-2 border-black pt-1 bg-orange-50 -mx-3 px-3 py-0.5"],
                                  ["(+) Net Debt",sd?fmtM(sd.netDebt):"—","text-gray-400"],
                                  ["Enterprise Value",fmtM(entryTEV),"font-bold border-t-2 border-black pt-1 bg-orange-50 -mx-3 px-3 py-0.5"],
                                  ["NTM EBITDA ³",fmtM(co.lbo.entryEBITDA),"mt-2"],
                                  ["Implied Entry Multiple",`${co.lbo.entryEBITDAMult}x`,"font-medium"],
                                ];})().map(([k,v,c])=>(
                                  <div key={k} className={`flex justify-between ${c}`}><span className="text-gray-500">{k}</span><span>{v}</span></div>
                                ))}
                                </div>
                              </div>
                              <div className="border border-gray-200 rounded text-xs overflow-hidden">
                                <div className="bg-gray-900 text-white font-bold px-3 py-1.5">Exit Analysis</div>
                                <div className="px-3 py-2 space-y-1.5">
                                {[
                                  ["NTM (2031) EBITDA",fmtM(co.lbo.exitEBITDA),""],
                                  ["Exit Multiple",`${co.lbo.exitEBITDAMult}x`,""],
                                  ["Exit TEV",fmtM(co.lbo.exitTEV),"font-bold border-t-2 border-black pt-1 bg-orange-50 -mx-3 px-3 py-0.5"],
                                  ["(–) Debt",`(${fmtM(co.lbo.grossDebt)})`,"text-red-600"],
                                  ["(+) Cash",fmtM(co.lbo.eopCashFinal),"text-green-600"],
                                  ["(–) Options ⁴",`(${fmtM(co.lbo.optionsDilution)})`,"text-red-600"],
                                  ["Equity Value",fmtM(co.lbo.exitEquity),"font-bold border-t-2 border-black pt-1 bg-orange-50 -mx-3 px-3 py-0.5"],
                                  ["IRR",`${co.lbo.irr}% ${irrLabel(co.lbo.irr)}`,"font-bold mt-2 bg-orange-50 -mx-3 px-3 py-0.5"],
                                  ["MoM",`${co.lbo.moic}×`,"font-bold bg-orange-50 -mx-3 px-3 py-0.5"],
                                ].map(([k,v,c])=>(
                                  <div key={k} className={`flex justify-between ${c}`}><span className="text-gray-500">{k}</span><span>{v}</span></div>
                                ))}
                                </div>
                              </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                              <div className="border border-gray-200 rounded text-xs overflow-hidden">
                                <div className="bg-gray-900 text-white font-bold px-3 py-1.5">Sources</div>
                                <div className="px-3 py-2 space-y-1.5">
                                {[
                                  ["Debt",fmtM(co.lbo.grossDebt),""],
                                  ["Equity",fmtM(co.lbo.equityIn),""],
                                  ["Total Sources",fmtM(co.lbo.totalUses),"font-bold border-t-2 border-black pt-1 bg-orange-50 -mx-3 px-3 py-0.5"],
                                ].map(([k,v,c])=>(
                                  <div key={k} className={`flex justify-between ${c}`}><span className="text-gray-500">{k}</span><span>{v}</span></div>
                                ))}
                                </div>
                              </div>
                              <div className="border border-gray-200 rounded text-xs overflow-hidden">
                                <div className="bg-gray-900 text-white font-bold px-3 py-1.5">Uses</div>
                                <div className="px-3 py-2 space-y-1.5">
                                {[
                                  ["Enterprise Value",fmtM(co.lbo.entryTEV),""],
                                  ["Cash to Balance Sheet",fmtM(co.lbo.cashToBS),"text-gray-400"],
                                  ["Financing Fees",fmtM(co.lbo.financingFees),"text-gray-400"],
                                  ["Transaction Fees",fmtM(co.lbo.txnFees),"text-gray-400"],
                                  ["Total Uses",fmtM(co.lbo.totalUses),"font-bold border-t-2 border-black pt-1 bg-orange-50 -mx-3 px-3 py-0.5"],
                                ].map(([k,v,c])=>(
                                  <div key={k} className={`flex justify-between ${c}`}><span className="text-gray-500">{k}</span><span>{v}</span></div>
                                ))}
                                </div>
                              </div>
                            </div>
                            {(()=>{const lboHist=co.lbo.hist;const lboAllCols=lboHist?[lboHist,...co.lbo.lboRows]:co.lbo.lboRows;const lboProjStart=lboHist?1:0;return(<>
                            <p className="text-xs font-semibold text-gray-700 mb-1">Annual Projection (4.5yr hold · NTM exit)</p>
                            <table className="w-full text-xs border-collapse min-w-max">
                              <thead><tr className="border-b-2 border-black"><th className="px-2 py-1.5 text-left font-semibold text-gray-600 sticky left-0 bg-white w-40">Metric</th>{lboAllCols.map((r,ri)=><th key={r.label} className={`px-2 py-1.5 text-center font-semibold ${r.isNTM?"text-orange-700":"text-gray-600"}`} style={ri<lboProjStart?{borderRight:"2px solid black"}:{}}>{r.label}</th>)}</tr></thead>
                              <tbody>
                                {[["Revenue",r=>fmtM(r.rev),{bold:true,topBorder:true}],["Rev Growth",r=>r.isHist?"—":fmtPct(r.revGrowth),{italic:true}],["EBITDA",r=>fmtM(r.ebitda),{topBorder:true,bg:true}],["EBITDA Margin",r=>fmtPct(r.margin),{italic:true,bg:true}],["(+/-) Other Cash Flow ²",r=>r.isNTM?"—":fmtM(r.otherCF),{}],["Other % Rev",r=>r.isNTM?"—":fmtPct(Math.round((r.otherCF/r.rev)*1000)/10),{italic:true}],["UFCF (Pre-Tax)",r=>r.isNTM?"—":fmtM(r.ufcfPretax),{bold:true,topBorder:true,bg:true}],["UFCF Pre-Tax Conv.",r=>r.isNTM?"—":fmtPct(r.ufcfPretaxConv),{italic:true,bg:true}],["spacer",()=>"",{spacer:true}],["BoP Cash",r=>r.isNTM||r.isHist?"—":fmtM(r.bopCash),{topBorder:true}],["(+) UFCF (Pre-Tax)",r=>r.isNTM||r.isHist?"—":fmtM(r.cashUfcf),{}],["(-) Taxes",r=>r.isNTM||r.isHist?"—":`(${fmtM(r.tax)})`,{}],["(-) Net Interest Expense",r=>r.isNTM||r.isHist?"—":`(${fmtM(r.interest)})`,{}],["EoP Cash",r=>r.isNTM||r.isHist?"—":fmtM(r.eopCash),{bold:true,topBorder:true,bg:true}]].map(([lbl,fn,opts])=>(
                                  opts.spacer?<tr key={lbl} className="h-3"><td colSpan={lboAllCols.length+1}></td></tr>:
                                  <tr key={lbl} className={`${opts.topBorder?"border-t-2 border-black":""} ${opts.bg?"bg-orange-50":""}`}>
                                    <td className={`px-2 py-1 text-gray-700 sticky left-0 whitespace-nowrap ${opts.bold?"font-bold":"font-medium"} ${opts.italic?"italic text-gray-400":""} ${opts.bg?"bg-orange-50":"bg-white"}`}>{lbl}</td>
                                    {lboAllCols.map((r,ri)=><td key={r.label} className={`px-2 py-1 text-center ${opts.bold?"font-bold":""} ${opts.italic?"italic text-gray-400":""} ${r.isNTM&&opts.bold?"text-orange-700":""}`} style={ri<lboProjStart?{borderRight:"2px solid black"}:{}}>{fn(r)}</td>)}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            <p className="text-[10px] text-gray-400 mt-1 italic">² Other Cash Flow = change in NWC + capex. UFCF (pre-tax) = EBITDA + Other CF; conversion % = UFCF (pre-tax) / EBITDA. Held constant at 2027 consensus level.</p>
                            <p className="text-xs text-gray-400 mt-2">Gross debt: {fmt(co.lbo.grossDebt)} fixed throughout hold. Interest: {fmt(co.lbo.grossDebt)} × 8.0% ⁶ = {fmt(Math.round(co.lbo.grossDebt*LBO_INT_RATE))}/yr. Exit multiple applied to NTM EBITDA; 4.5-year hold for IRR.</p>
                            <p className="text-xs text-gray-400 mt-1">¹ Debt sized at 7× LTM EBITDA as of 6/30/2026 (50% CY2025 + 50% CY2026) = {fmt(co.lbo.levEBITDA)}.</p>
                            <p className="text-[10px] text-gray-400 mt-1 italic">³ NTM EBITDA as of 6/30/2026 (consensus estimates).</p>
                            <p className="text-[10px] text-gray-400 mt-1 italic">⁴ Options dilution estimated at 10% of equity gains (exit equity value less equity invested). ⁵ 2026 cash flows stubbed at 50% (H2 only) reflecting 6/30/2026 entry date. ⁶ Assumed blended cost of debt of 8.0%.</p>
                            </>);})()}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <p className="text-xs text-gray-400 mt-3 text-center">{filtered.length} companies shown · Click rows to expand · Score badges show rationale · Sliders update models live</p>
        </>
      )}
    </div>
    </div>
  );
}
