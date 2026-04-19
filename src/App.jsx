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
  // 2026-2027 = consensus (locked). 2028+ = linear convergence from 2027 growth to 10% over yr 3-10, shifted by CAGR delta.
  const delta=(cagrPct-baseCAGR)/100;
  const dcfGrowth=(yr)=>g2027Rate+(0.10-g2027Rate)*((yr-3)/7)+delta;
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
  const dcfGrowth=(yr)=>g2027Rate+(0.10-g2027Rate)*((yr-3)/7)+delta;
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
  {name:"Bentley Systems",vertical:"Construction & Design SW",bucket:"Pure-Play VSaaS",hq:"US",sor:true,seat:true,pricing:"Seat-Based",peOwned:false,tev:11855,ntmRev:1744,growth:13,gm:82,ebitda:36,cagr:12,ntmRevX:6.8,peFit:"Medium",aiRisk:"Low",avoid:false,ltmEbitda:547,pct52w:0.60,
   desc:"Engineering software for large-scale infrastructure design (roads, bridges, rail, utilities) serving civil engineers and infrastructure owners globally. The dominant SoR for civil and industrial infrastructure workflows with no credible direct competitor. Seat-based E365 subscription with strong recurring revenue from cloud transition.",
   sd:{sharePrice:35.12,sharesOut:306.3,marketCap:10757,netDebt:1126},
   thesis:["Moat is not just 'infrastructure SoR' — it is the accumulated library of engineering standards, simulation templates, and project data inside each client's Bentley environment; switching means re-certifying years of design models against AASHTO/Eurocode standards","Bentley family controls ~55% of voting power via dual-class structure, making hostile take-private impossible — any negotiated deal pays a governance premium on top of 7.8x NTM Rev, and the family has shown no urgency to sell","Real competitive risk is Hexagon acquiring Bricsys + Iesve to build a vertically-integrated civil/energy design stack; Autodesk Infraworks remains subscale but could bundle aggressively against Bentley's standalone pricing","At B TEV the realistic exit is strategic to Siemens, Dassault, or Hexagon — financial sponsor returns depend on multiple expansion from current trough, not operational improvement on already-36% EBITDA margins","Weakness: E365 subscription transition flatters NRR metrics; underlying seat growth in civil infrastructure is mid-single-digit at best, and the customer base (DOTs, utilities, public agencies) is inherently cyclical with government budget exposure"],
   aiRationale:["Protected workflows: finite element analysis, hydraulic simulation, geotechnical modeling — these require physics engines and regulatory certification (e.g., PE stamp requirements) that generative AI does not address","Threatened workflow: 2D drafting and basic alignment design within OpenRoads/OpenRail could see 40-60% productivity gains from AI copilots, compressing seats at smaller engineering firms within 3-5 years","Second-order risk: if AI makes a 10-person civil engineering team as productive as 15, Bentley's seat-based pricing directly loses 33% of revenue per firm — usage-based repricing on iTwin is the obvious hedge but adoption is nascent","Specific AI competitors: Autodesk's AI-assisted InfraWorks, Trimble's AI-enabled Tekla for structural, and startups like Cala (generative building design) and TestFit (generative site planning) are encroaching on adjacent workflows","3-year view: minimal impact on core simulation/analysis revenue; 10-year view: material seat compression risk in design-phase workflows, partially offset only if Bentley successfully shifts to consumption-based iTwin pricing at scale"]},
  {name:"Nemetschek",vertical:"Construction & Design SW",bucket:"Pure-Play VSaaS",hq:"DE",sor:true,seat:false,pricing:"Usage-Based",peOwned:false,tev:8677,ntmRev:1604,growth:13,gm:97,ebitda:33,cagr:14,ntmRevX:5.4,peFit:"Medium-High",aiRisk:"Low",avoid:false,ltmEbitda:447,pct52w:0.46,
   desc:"Portfolio of AEC software brands (Allplan, Vectorworks, Bluebeam, dRofus) covering architecture, engineering, and construction design workflows. Particularly dominant across European markets with near-100% gross margins reflecting pure software delivery. Usage-based subscription with revenue tied to project activity.",
   sd:{sharePrice:73.40,sharesOut:116.3,marketCap:8534,netDebt:116},
   thesis:["97% GM is real but misleading — Nemetschek is a holding company of semi-autonomous brands (Allplan, Vectorworks, Bluebeam, Graphisoft) with separate codebases, sales teams, and product roadmaps; a PE buyer's operational thesis must center on consolidating this fragmented portfolio, which prior management has resisted","The actual moat varies dramatically by brand: Bluebeam owns PDF markup for construction (near-monopoly), Graphisoft's ArchiCAD is the #2 BIM tool behind Revit, but Allplan is a distant third in structural — a buyer is really underwriting Bluebeam's dominance and ArchiCAD's European installed base","5.8x NTM Rev at 50% off highs is the most attractive entry multiple for a 97% GM business in the screen — but Nemetschek is German-listed with a concentrated shareholder base (Nemetschek family foundation holds ~52%), making take-private governance complex and requiring German takeover law compliance","Consolidation upside is the real prize: unifying Allplan, Vectorworks, and Graphisoft onto a shared platform could unlock 500-800bps of EBITDA improvement from eliminating duplicate R&D and go-to-market — but execution risk is high given brand loyalty and cultural resistance across subsidiaries","Weakness: Autodesk's AEC Collection bundles Revit + Civil 3D + Navisworks at aggressive pricing; Nemetschek's individual brands cannot match this bundling power, and Autodesk's 2024 Forma launch directly targets the generative design space where Nemetschek is underinvested"],
   aiRationale:["Protected workflows: BIM model authoring in ArchiCAD/Allplan requires deep parametric modeling expertise tied to local building codes (Eurocode, DIN standards) — generative AI cannot produce code-compliant structural models without human validation","Threatened workflow: Bluebeam's PDF markup and document review is directly exposed to AI-powered document analysis tools — Procore's AI document management, PlanGrid (Autodesk), and startups like Pypestream could automate 60%+ of punch list and RFI review within 5 years","Second-order effect: usage-based pricing actually cuts both ways — if AI makes architects complete BIM models 2x faster, project-based usage billing captures the same project value, but if AI reduces total project count by enabling faster iteration, usage volume drops","Specific AI competitors: Autodesk Forma (generative site design), Spacemaker (now Autodesk), Hypar (parametric building design), and TestFit are all targeting the early-stage design workflows where Nemetschek brands have historically upsold from concept to detailed design","3-year view: core BIM authoring safe; Bluebeam's document workflow faces near-term AI pressure. 10-year view: if generative design tools can produce code-compliant BIM models, the value shifts from model authoring to model validation — Nemetschek must own the validation layer or risk commoditization"]},
  {name:"Waystar",vertical:"Healthcare",bucket:"Pure-Play VSaaS",hq:"US",sor:false,seat:false,pricing:"Usage-Based",peOwned:false,tev:6175,ntmRev:1318,growth:17,gm:69,ebitda:42,cagr:14,ntmRevX:4.7,peFit:"High",aiRisk:"Low",avoid:false,ltmEbitda:481,pct52w:0.59,
   desc:"Revenue cycle management (RCM) platform automating claims submission, eligibility verification, and payment posting for healthcare providers. Mission-critical workflow embedded across hospitals and physician groups with multi-year contracts and extreme switching costs. Usage-based fees on claims processed, creating revenue tied to patient visit volumes.",
   sd:{sharePrice:24.11,sharesOut:199.3,marketCap:4804,netDebt:1371},
   thesis:["Post-EQT/CPPIB take-private at .75 and re-IPO at .50, Waystar trades at 4.7x NTM with 42% EBITDA — a secondary buyout repricing the same asset EQT bought from Bain","Real moat is payer connectivity: Waystar processes claims across 1,500+ payers with individually negotiated EDI connections — recreating this integration layer is a 5-7 year effort, not a technology problem","Usage-based on claims volume means revenue scales with healthcare utilization inflation (~5-6% annually) independent of customer headcount decisions","Kill-the-deal risk: R1 RCM (now private under TowerBrook/CD&R) is consolidating end-to-end RCM with physician staffing, creating a bundled competitor Waystar cannot match as pure software","Exit path narrows post-EQT: strategic buyers (UHG/Optum, Change Healthcare) face antitrust issues, leaving you selling to another sponsor at cycle-peak healthcare multiples"],
   aiRationale:["AI actually strengthens Waystar near-term: automated prior authorization, denial prediction, and coding suggestions are features Waystar sells, not threats to its position","Real AI risk is indirect — if AI coding tools (Codify, Nym Health) achieve >95% first-pass clean claim rates, Waystar's denial management and appeals workflow becomes less critical","The payer-provider data exchange layer is regulatory infrastructure, not intelligence — AI cannot displace the EDI/X12 transaction backbone Waystar operates on","Ambient clinical documentation (Nuance DAX, Abridge) could reduce coding errors upstream, shrinking the denial-and-rework volume that drives ~30% of RCM platform value","Net assessment: AI is a product tailwind for 3-5 years but the long-term risk is that cleaner upstream data reduces the complexity that justifies RCM platform pricing"]},
  {name:"AppFolio",vertical:"Real Estate / Prop Tech",bucket:"Pure-Play VSaaS",hq:"US",sor:true,seat:false,pricing:"Usage-Based",peOwned:false,tev:5531,ntmRev:1160,growth:17,gm:64,ebitda:29,cagr:17,ntmRevX:4.8,peFit:"High",aiRisk:"Low",avoid:false,ltmEbitda:265,pct52w:0.49,
   desc:"Property management software for residential and commercial real estate operators covering leasing, maintenance, accounting, screening, and payments. The SoR for SMB property managers with a payments flywheel that grows as portfolios scale. Usage-based model with fees tied to units under management and payment volumes.",
   sd:{sharePrice:157.82,sharesOut:36.6,marketCap:5782,netDebt:-251},
   thesis:["AppFolio's real business is a payments company dressed as software — tenant rent payments, screening fees, and insurance premiums flow through AppFolio's ledger, creating ~$400M of payments revenue growing 25%+ that is completely decoupled from property manager headcount or AI productivity","The screening fee monopoly is underappreciated: AppFolio charges tenants $40-50 per application (not the property manager); this is a per-transaction tax on America's rental market that grows with rent prices and application volume, not software seats","At \.2B TEV, the real question is whether this is a 15x payments multiple or a 5.5x software multiple — if you value the payments stream at payments-company multiples (8-12x revenue) and back into the software for free, the upside is significant","Competitive risk from Yardi, RealPage (now Thoma Bravo-owned), and Entrata is concentrated in mid-market/enterprise; AppFolio owns the sub-500 unit SMB segment where implementation simplicity matters more than configurability — this segment is hard to attack from above","Key risk: regulatory scrutiny of tenant screening fees (several state bills proposed) could cap the highest-margin revenue line; also, RealPage's antitrust issues around algorithmic rent-setting create headline risk for the entire PropTech sector"],
   aiRationale:["Payments-as-revenue is the AI-proof core: tenants paying rent through AppFolio generates transaction fees regardless of how many property managers are needed or how productive AI makes them — this is a toll booth, not a productivity tool","The AI-vulnerable surface area is narrow but real: AI-powered leasing assistants (ShowMojo, Elise AI) could reduce the need for leasing agents, compressing AppFolio's per-unit-managed pricing if property managers push back on fees as headcount declines","Counter-argument: AppFolio is already building AI leasing into the platform (AI-powered showing scheduling, tenant communications); the incumbency advantage means AppFolio captures the AI upside rather than being disrupted by it","Second-order benefit: if AI enables a single property manager to manage 200 units instead of 100, AppFolio's revenue per customer doubles (more units = more payments, screening fees, and insurance premiums per account) — AI is actually a growth driver","Low risk: the payments toll-booth model is structurally the most AI-resilient business model in this screen; the only risk is regulatory, not technological"]},
  {name:"CCC Intelligent Solutions",vertical:"Financial Services",bucket:"Pure-Play VSaaS",hq:"US",sor:true,seat:false,pricing:"Usage-Based",peOwned:false,tev:5103,ntmRev:1179,growth:9,gm:78,ebitda:42,cagr:9,ntmRevX:4.3,peFit:"High",aiRisk:"Low",avoid:false,ltmEbitda:447,pct52w:0.60,
   desc:"AI-native platform connecting the entire auto insurance claims ecosystem — insurers, repairers, OEMs, and parts suppliers — across 35,000+ connected businesses. The SoR for collision repair estimates and claims processing with deep network effects that took decades to build. Usage-based transaction fees scaling with auto claims volume.",
   sd:{sharePrice:6.00,sharesOut:657.7,marketCap:3946,netDebt:1167},
   thesis:["The network is the moat: CCC connects insurers, body shops, OEMs, and parts suppliers in a single data exchange — switching any one node requires coordinating all counterparties, which never happens","9% topline growth masks the real story: ARPU expansion via Casualty (injury claims), Emerging Solutions (subrogation, total loss), and AI upsell modules drive revenue per claim higher each year","\.4B net debt from Advent's 2017 LBO still on the balance sheet — a secondary buyout must underwrite deleveraging from ~5x, which constrains entry price and return math","Kill-the-deal risk: Tractable (AI photo-based damage estimation) has signed Tokio Marine, Covea, and US insurers — if Tractable cracks the network effect by going insurer-first, CCC's body shop lock-in weakens","Exit buyer universe is narrow: Verisk and Guidewire are logical strategics but both have antitrust overlap in P&C claims; likely another sponsor exit at 12-14x EBITDA"],
   aiRationale:["CCC already monetizes AI — its AI gateway for damage estimation and claims triage is a revenue driver, not a cost center, making it one of few companies where AI directly accretes to topline","Tractable is the real AI threat: computer vision-based damage estimation that bypasses body shop involvement entirely — if insurers adopt AI photo-first workflows, CCC's repair-network-centric model loses leverage","The FNOL-to-settlement workflow involves regulatory, legal, and multi-party coordination that pure AI cannot automate — CCC's value is in orchestrating counterparties, not just estimating damage","AI could compress the number of human touches per claim (adjusters, estimators), but CCC's usage-based pricing is per-claim not per-touch, so efficiency gains do not directly erode revenue","Net: CCC is the rare case where AI is already in the P&L as revenue; the risk is a paradigm shift to insurer-direct AI estimation that disintermediates the body shop network CCC controls"]},
  {name:"Elastic",vertical:"Data & Analytics",bucket:"Pure-Play VSaaS",hq:"US",sor:false,seat:false,pricing:"Usage-Based",peOwned:false,tev:4946,ntmRev:1949,growth:15,gm:78,ebitda:18,cagr:14,ntmRevX:2.5,peFit:"Medium",aiRisk:"Medium",avoid:false,ltmEbitda:291,pct52w:0.53,
   desc:"Open-source search, observability, and security analytics platform (Elasticsearch, Kibana, Logstash) used by enterprises for log management, application performance monitoring, and threat detection. Deep developer adoption with a consumption-based cloud model (Elastic Cloud) growing faster than self-managed deployments. Usage-based pricing tied to data ingestion and query volumes.",
   sd:{sharePrice:49.99,sharesOut:112.6,marketCap:5628,netDebt:-682},
   thesis:["2.5x NTM Rev for a 15% grower with 78% GM is genuinely cheap — the market is punishing Elastic for open-source licensing uncertainty and Datadog/Splunk competitive pressure, but the installed base of Elasticsearch deployments across enterprise is massive and deeply embedded in observability stacks","The real moat is developer adoption: Elasticsearch is the default search engine embedded in thousands of enterprise applications — ripping it out requires re-architecting logging, search, and analytics pipelines that engineering teams built over years","Margin expansion from 18% to 28%+ EBITDA is the PE thesis: Elastic has been investing heavily in cloud migration (Elastic Cloud) and go-to-market; a PE buyer can rationalize S&M spend and accelerate the mix shift to higher-margin cloud consumption","Competitive risk from Datadog (observability), Splunk/Cisco (SIEM), and OpenSearch (AWS fork) is real — but Elastic's breadth across search + observability + security in a single platform creates consolidation value that point solutions cannot match","Kill-the-deal risk: AWS OpenSearch is a credible free alternative for cost-sensitive workloads — if AWS invests heavily in OpenSearch feature parity, Elastic's self-managed revenue base erodes faster than cloud revenue grows"],
   aiRationale:["AI is a double-edged sword for Elastic: AI-powered log analysis and anomaly detection (Elastic AI Assistant) are product enhancements, but AI-native observability tools (Datadog AI, Dynatrace) are building competing capabilities from scratch","The deeper AI risk is that LLM-powered search could commoditize Elasticsearch's core value — if vector search and semantic retrieval become commoditized by foundation model providers, Elastic's search differentiation narrows","Counter-argument: Elastic has invested heavily in vector search (ELSER) and RAG capabilities — positioning Elasticsearch as the retrieval layer for enterprise AI applications could expand TAM significantly","Usage-based pricing is a natural hedge: AI workloads generate massive data volumes for logging, monitoring, and security — more AI adoption means more data ingestion through Elastic pipelines","Medium risk: AI is simultaneously a product opportunity (RAG, vector search) and a competitive threat (AI-native observability) — the outcome depends on whether Elastic captures the AI data infrastructure layer or gets displaced by it"]},
  // ── HYBRID VSaaS ──
  {name:"Cellebrite",vertical:"GovTech",bucket:"Hybrid VSaaS",hq:"IL",sor:true,seat:false,pricing:"Usage-Based",peOwned:false,tev:3145,ntmRev:592,growth:20,gm:85,ebitda:27,cagr:18,ntmRevX:5.3,peFit:"High",aiRisk:"Low",avoid:false,ltmEbitda:134,pct52w:0.68,
   desc:"Digital intelligence platform for law enforcement and government agencies to extract, analyze, and manage digital evidence from mobile devices and cloud sources. The SoR for digital forensics workflows globally with government contract revenue providing multi-year visibility. Usage-based model with AI-enhanced investigation tools driving premium pricing.",
   sd:{sharePrice:13.78,sharesOut:260.0,marketCap:3582,netDebt:-437},
   thesis:["\B TEV is the right size for PE, 85% GM / 19% growth / 18% N3Y CAGR is elite quality, and the GovTech moat (CJIS, FedRAMP, Five Eyes certifications) is genuinely hard to replicate","Cellebrite owns both sides of the digital forensics workflow: UFED for extraction and Physical Analyzer/Pathfinder for analysis — competitors like MSAB and Grayshift only compete on extraction","The AI upsell story is real and already working: Cellebrite Guardian (AI case management) and AI-powered analytics are driving 30%+ net revenue retention as agencies expand from extraction to full investigation workflow","Key risk: Cellebrite's brand carries reputational baggage (NSO Group associations, surveillance state concerns) which limits TAM expansion into private enterprise and creates ESG friction for some LPs","Exit path is clear: strategic buyers include Axon, Motorola Solutions, Palantir, or L3Harris — all have adjacent GovTech platforms and would pay 8-12x for the digital forensics SoR with AI growth"],
   aiRationale:["AI is the single biggest product catalyst for Cellebrite: AI-powered evidence search (natural language queries over extracted data), auto-categorization of images/videos, and pattern detection across devices are all premium features","The extraction layer (UFED) requires zero-day exploit research and hardware engineering that AI startups cannot replicate — this is cybersecurity R&D, not software features","Grayshift (now Magnet Forensics/Thermo Fisher) is the only real competitor, and the market is effectively a duopoly with high barriers from security certifications and law enforcement trust","Second-order AI effect is positive: as criminals use AI to generate deepfakes, encrypted comms, and synthetic identities, demand for advanced digital forensics tools increases — AI creates the problem Cellebrite solves","Low risk: digital forensics is one of the clearest AI-as-tailwind categories — AI makes the product better, makes the market larger, and the certification moat prevents AI-native disruption"]},
  {name:"nCino",vertical:"Financial Services",bucket:"Pure-Play VSaaS",hq:"US",sor:true,seat:false,pricing:"Usage-Based",peOwned:false,tev:1949,ntmRev:650,growth:8,gm:68,ebitda:25,cagr:9,ntmRevX:3.0,peFit:"Medium",aiRisk:"Medium",avoid:false,ltmEbitda:138,pct52w:0.46,
   desc:"Bank operating system built on the Salesforce platform for loan origination, account opening, and relationship management at commercial banks and credit unions. The SoR for commercial lending workflows at community and regional banks globally. Usage-based model tied to loan origination volumes and active banker seats.",
   sd:{sharePrice:14.98,sharesOut:121.6,marketCap:1821,netDebt:115},
   thesis:["nCino is a Salesforce ISV overlay for bank lending — the core IP is workflow configuration and bank-specific data models on Salesforce infrastructure nCino does not own","The Salesforce dependency is the deal question: nCino pays ~15-20% of revenue as platform fees, Salesforce controls the roadmap, and Financial Services Cloud competes directly with nCino's relationship management","8% growth reflects saturation in US community banking — international expansion (APAC, EMEA) is the growth vector but adds implementation complexity and longer sales cycles compressing near-term margins","At 3.2x NTM and \.1B TEV this is right-sized for mid-market PE — Thoma Bravo, Vista, or Insight could execute a take-private without club deal complexity","Kill-the-deal risk: if Salesforce launches a native lending origination module (as it has with insurance and wealth management), nCino's entire platform becomes redundant overnight"],
   aiRationale:["The real AI risk is Salesforce Einstein/Agentforce not external competitors — Salesforce is embedding AI directly into Financial Services Cloud potentially making nCino's workflow layer unnecessary","AI-powered credit decisioning tools (Zest AI, Upstart bank partnerships) could bypass nCino's origination workflow entirely if banks adopt AI-first underwriting pipelines","Bank regulators require explainable AI in lending decisions which actually protects nCino's structured workflow approach over black-box AI alternatives near term","Usage-based pricing tied to loan origination volume means if AI accelerates loan processing speed nCino could see more throughput per bank — a potential tailwind","Upgraded to Medium risk: the Salesforce platform dependency means nCino's AI future is largely controlled by Salesforce's strategic decisions not its own product roadmap"]},
  {name:"Flywire",vertical:"Education / Healthcare",bucket:"Hybrid VSaaS",hq:"US",sor:false,seat:false,pricing:"Usage-Based",peOwned:false,tev:1206,ntmRev:747,growth:19,gm:61,ebitda:23,cagr:17,ntmRevX:1.6,peFit:"Medium",aiRisk:"Medium",avoid:false,ltmEbitda:131,pct52w:0.79,
   desc:"Global payment platform handling complex cross-border and domestic payments for education, healthcare, and travel verticals. Processes tuition payments, medical bills, and travel invoices with currency conversion and reconciliation built in. Usage-based transaction fees on payment volumes with strong institutional relationships at universities and hospitals.",
   sd:{sharePrice:11.64,sharesOut:134.1,marketCap:1561,netDebt:-355},
   thesis:["1.7x NTM for 18% growth is mispriced vs. Adyen (30x) and Stripe (private ~20x) — vertical-embedded payment processors trade at massive premiums once investors recognize durable institutional lock-in","Real moat is not payments but FX reconciliation + SIS/HMS integration depth: switching requires re-certifying 50+ currency corridors and re-integrating with PeopleSoft, Ellucian, or Epic billing — a 6-12 month project no CFO will undertake","Immigration policy is the single biggest risk: ~50% of revenue is education, and F-1 visa restrictions under a protectionist administration could crater international enrollment at partner universities overnight","Exit path is compelling — Fiserv, Global Payments, or Worldline would pay 5-7x revenue to acquire vertical-specific institutional payment rails they cannot build organically given decade-long university procurement cycles","Margin expansion from 22% to 32%+ is real but depends on geographic mix: South Asia corridors carry 3-4x the FX take rate of domestic US — execution on international expansion is the margin story, not just operating leverage"],
   aiRationale:["AI fraud detection and smart routing are already table-stakes features Flywire has shipped — these enhance rather than displace the core value proposition of institutional-grade FX reconciliation","The actual AI risk is indirect: AI enrollment advisors and automated credentialing could reduce international student mobility by enabling remote study — fewer cross-border students means fewer cross-border payments","Stripe's AI-powered adaptive acceptance and Adyen's AI routing improvements narrow the gap on payment optimization, but neither has invested in vertical integrations (SIS, HMS, PMS) that drive institutional lock-in","ChatGPT-style interfaces for healthcare billing could disintermediate patient payment portals — but Flywire's value is upstream in payer-to-provider reconciliation, not patient-facing UI","Medium risk overall: AI more likely a tailwind (better FX pricing, fraud reduction) than headwind, but indirect effects on international student mobility and remote credentialing warrant monitoring"]},
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
      "4.7x NTM Revenue with 42% EBITDA is the best margin/multiple combination in the top tier — entry TEV ~$8B at 30% premium is strong absolute value for the quality",
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
    headline:"De facto monopoly connecting 35,000+ auto insurance ecosystem participants — 40-year network moat and AI-native claims platform at only 4.4x NTM Revenue",
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
      "4.4x NTM Revenue with 42% EBITDA is the deepest value among high-quality, low-AI-risk SoRs — PE equity creation from multiple expansion alone is highly compelling",
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

// LTM EBITDA ($M) — used for debt sizing in LBO (industry convention: leverage on trailing EBITDA)
const LTM_EBITDA={
  "Bentley Systems":547,
  "Nemetschek":447,
  "Waystar":481,
  "AppFolio":265,
  "CCC Intelligent Solutions":447,
  "Elastic":291,
  "Cellebrite":134,
  "nCino":138,
  "Flywire":131
}
const COMPANY_FINANCIALS={
  "Bentley Systems":{rev24:1353,rev25:1502,ebitda25:526,sbc25:73,da25:24,other25:78,rev26:1700,rev27:1875,ebitda26:610,ebitda27:693,sbc26:82,sbc27:Math.round((82/1700)*1875),da26:29,da27:29,other26:51,other27:60},
  "Nemetschek":{rev24:1147,rev25:1373,ebitda25:428,sbc25:0,da25:35,other25:52,rev26:1550,rev27:1767,ebitda26:504,ebitda27:588,sbc26:0,sbc27:0,da26:41,da27:38,other26:52,other27:60},
  "Waystar":{rev24:944,rev25:1099,ebitda25:462,sbc25:42,da25:22,other25:-65,rev26:1286,rev27:1415,ebitda26:537,ebitda27:594,sbc26:49,sbc27:Math.round((49/1286)*1415),da26:26,da27:28,other26:-83,other27:-87},
  "AppFolio":{rev24:794,rev25:951,ebitda25:246,sbc25:71,da25:11,other25:-27,rev26:1113,rev27:1302,ebitda26:319,ebitda27:394,sbc26:83,sbc27:Math.round((83/1113)*1302),da26:22,da27:36,other26:-24,other27:-28},
  "CCC Intelligent Solutions":{rev24:945,rev25:1057,ebitda25:436,sbc25:175,da25:59,other25:-104,rev26:1153,rev27:1257,ebitda26:481,ebitda27:531,sbc26:191,sbc27:Math.round((191/1153)*1257),da26:62,da27:74,other26:-93,other27:-99},
  "Elastic":{rev24:1411,rev25:1651,ebitda25:276,sbc25:284,da25:12,other25:-38,rev26:1891,rev27:2153,ebitda26:333,ebitda27:411,sbc26:323,sbc27:Math.round((323/1891)*2152),da26:11,da27:23,other26:-44,other27:-49},
  "Cellebrite":{rev24:401,rev25:476,ebitda25:128,sbc25:45,da25:7,other25:34,rev26:569,rev27:661,ebitda26:152,ebitda27:185,sbc26:54,sbc27:Math.round((54/569)*661),da26:7,da27:10,other26:35,other27:42},
  "nCino":{rev24:535,rev25:589,ebitda25:131,sbc25:73,da25:6,other25:-16,rev26:637,rev27:693,ebitda26:159,ebitda27:197,sbc26:79,sbc27:Math.round((79/637)*693),da26:6,da27:9,other26:-12,other27:-13},
  "Flywire":{rev24:492,rev25:603,ebitda25:121,sbc25:72,da25:17,other25:-9,rev26:719,rev27:829,ebitda26:162,ebitda27:201,sbc26:83,sbc27:Math.round((83/719)*829),da26:26,da27:31,other26:3,other27:4}
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
    const defEndM=Math.max(co.ebitda,Math.min(co.ebitda+10,40));
    const fin=COMPANY_FINANCIALS[co.name];
    // Compute 2027 consensus growth rate and default CAGR from convergence model (2027 growth → 10% over 2028-2035)
    const oldStartG=fin&&fin.rev25?Math.round((fin.rev26/fin.rev25-1)*1000)/10:co.growth;
    const g2027Rate=fin?(fin.rev27/fin.rev26-1):(oldStartG/100);
    let simRev=fin?fin.rev27:(co.ntmRev*(1+g2027Rate));
    for(let yr=3;yr<=DCF_YEARS;yr++){simRev*=(1+(g2027Rate+(0.10-g2027Rate)*((yr-3)/7)));}
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
        <p className="text-xs text-gray-500 mt-0.5">Permira · {companies.length} companies · Data as of 3/31/2026</p>
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
                  <span className="text-xs text-gray-400">{filtered.length} of {companies.length} companies</span>
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
              const rank=companies.indexOf(co)+1;
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
