import { useState, useRef, useEffect } from "react";

const C = {
  bg:"#070b14", bg2:"#0c1220", card:"#101828", card2:"#162035", card3:"#1e2d47",
  blue:"#4d9fff", blue2:"#a8d4ff", blueD:"#1a5fb4",
  text:"#e8f0ff", muted:"#6b85aa", border:"#1e3050", red:"#ff6b6b",
};
const gradBlue = `linear-gradient(135deg,${C.blueD} 0%,${C.blue} 50%,${C.blue2} 100%)`;
const gradCard  = `linear-gradient(145deg,${C.card} 0%,${C.card2} 100%)`;
const fmt = n => "$" + Math.round(n).toLocaleString("es-CL");
const fmtDate = d => {
  const dt = new Date(d);
  return dt.toLocaleDateString("es-CL",{ day:"2-digit", month:"short", year:"numeric" }) + " · " +
         dt.toLocaleTimeString("es-CL",{ hour:"2-digit", minute:"2-digit" });
};

// ── Historial: usa localStorage (disponible en producción) ──
const STORAGE_KEY = "cuanto-me-toca:historial";
const getHistory = () => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; } };
const saveHistory = (records) => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(records)); } catch {} };

const css = {
  app:{ minHeight:"100vh", background:C.bg, color:C.text, fontFamily:"'Inter','Helvetica Neue',sans-serif", display:"flex", flexDirection:"column", alignItems:"center" },
  header:{ width:"100%", background:C.bg2, borderBottom:`1px solid ${C.border}`, padding:"16px 20px", display:"flex", alignItems:"center", gap:12, boxShadow:"0 2px 24px rgba(0,0,0,0.6)" },
  logoWrap:{ display:"flex", flexDirection:"column", lineHeight:1.2 },
  logo:{ fontSize:17, fontWeight:800, letterSpacing:1, background:gradBlue, WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" },
  logoSub:{ fontSize:9, color:C.muted, letterSpacing:3, textTransform:"uppercase" },
  stepLabel:{ marginLeft:"auto", fontSize:11, color:C.muted, letterSpacing:2, textTransform:"uppercase" },
  body:{ width:"100%", maxWidth:480, padding:"24px 16px 80px" },
  stepper:{ display:"flex", justifyContent:"center", alignItems:"center", gap:0, marginBottom:26 },
  dot:(a,d)=>({ width:a?28:9, height:9, borderRadius:20, background:d?gradBlue:a?gradBlue:C.card3, border:d||a?"none":`1px solid ${C.border}`, transition:"all 0.4s", boxShadow:a||d?`0 0 12px ${C.blue}66`:"none" }),
  dotLine:(d)=>({ width:26, height:1, background:d?gradBlue:C.border, transition:"all 0.4s" }),
  title:{ fontSize:21, fontWeight:700, marginBottom:4, letterSpacing:-0.3 },
  blueTxt:{ background:gradBlue, WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" },
  sub:{ fontSize:13, color:C.muted, marginBottom:22 },
  card:{ background:gradCard, borderRadius:16, padding:18, marginBottom:12, border:`1px solid ${C.border}`, boxShadow:"0 4px 20px rgba(0,0,0,0.4)" },
  cardHL:{ background:gradCard, borderRadius:16, padding:18, marginBottom:12, border:`1px solid ${C.blue}55`, boxShadow:`0 4px 20px rgba(0,0,0,0.4),0 0 0 1px ${C.blue}22` },
  input:{ width:"100%", background:C.card3, border:`1px solid ${C.border}`, borderRadius:10, padding:"13px 16px", color:C.text, fontSize:15, outline:"none", boxSizing:"border-box", fontFamily:"inherit" },
  btn:{ width:"100%", background:gradBlue, border:"none", borderRadius:12, padding:15, color:"#fff", fontWeight:700, fontSize:14, cursor:"pointer", marginTop:10, letterSpacing:0.5, boxShadow:`0 4px 20px ${C.blue}55`, fontFamily:"inherit" },
  btnSec:{ width:"100%", background:"transparent", border:`1px solid ${C.border}`, borderRadius:12, padding:13, color:C.muted, fontWeight:500, fontSize:13, cursor:"pointer", marginTop:8, fontFamily:"inherit" },
  btnSm:{ background:C.card3, border:`1px solid ${C.border}`, borderRadius:8, padding:"7px 12px", color:C.muted, fontSize:13, cursor:"pointer", fontFamily:"inherit" },
  btnSmA:{ background:gradBlue, border:"none", borderRadius:8, padding:"8px 13px", color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit", boxShadow:`0 2px 10px ${C.blue}55` },
  row:{ display:"flex", gap:8, alignItems:"center" },
  label:{ fontSize:11, color:C.muted, marginBottom:8, letterSpacing:1.5, textTransform:"uppercase" },
  divider:{ borderTop:`1px solid ${C.border}`, margin:"14px 0" },
};

function Stepper({ step }) {
  return (
    <div style={css.stepper}>
      {[0,1,2].map(i=>(
        <div key={i} style={{ display:"flex", alignItems:"center" }}>
          <div style={css.dot(step===i,step>i)}/>
          {i<2&&<div style={css.dotLine(step>i)}/>}
        </div>
      ))}
    </div>
  );
}

// ── STEP 1 ──────────────────────────────────────
function Step1({ items, setItems, onNext }) {
  const [name,setName]=useState(""); const [price,setPrice]=useState(""); const [qty,setQty]=useState(1);
  const [scanning,setScanning]=useState(false); const [msg,setMsg]=useState(""); const [msgType,setMsgType]=useState("ok");
  const fileRef=useRef();

  const add=()=>{
    if(!name.trim()||!price) return;
    setItems(p=>[...p,{ id:Date.now(), name:name.trim(), price:parseFloat(price), qty:parseInt(qty) }]);
    setName(""); setPrice(""); setQty(1);
  };

  const handleImage=async(e)=>{
    const file=e.target.files[0]; if(!file) return;
    setScanning(true); setMsg("Analizando boleta con IA..."); setMsgType("ok");
    const b64=await new Promise(res=>{ const r=new FileReader(); r.onload=()=>res(r.result.split(",")[1]); r.readAsDataURL(file); });
    try {
      // Llamada al proxy local — la API key queda en el servidor
      const res=await fetch("/api/anthropic",{
        method:"POST", headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          model:"claude-3-haiku-20240307", max_tokens:1000,
          messages:[{ role:"user", content:[
            { type:"image", source:{ type:"base64", media_type:file.type, data:b64 }},
            { type:"text", text:`Extrae los ítems de esta boleta de restaurante. Responde SOLO con JSON válido sin markdown. Formato: [{"name":"nombre","price":precio_unitario_numero,"qty":cantidad}]. Precios solo números sin formato de miles.` }
          ]}]
        })
      });
      const data=await res.json();
      const txt=data.content?.map(b=>b.text||"").join("")||"";
      const parsed=JSON.parse(txt.replace(/```json|```/g,"").trim());
      if(Array.isArray(parsed)&&parsed.length>0){
        setItems(p=>[...p,...parsed.map(i=>({ id:Date.now()+Math.random(), name:i.name, price:parseFloat(i.price)||0, qty:parseInt(i.qty)||1 }))]);
        setMsg(`✓ ${parsed.length} ítems detectados. Revisa y agrega lo que falte.`); setMsgType("ok");
      } else { setMsg("No se detectaron ítems. Agrégalos manualmente."); setMsgType("warn"); }
    } catch { setMsg("No se pudo leer la boleta. Agrégalos manualmente."); setMsgType("warn"); }
    setScanning(false); e.target.value="";
  };

  const itemsTotal=items.reduce((s,i)=>s+i.price*i.qty,0);

  return (
    <div>
      <Stepper step={0}/>
      <div style={css.title}>Escanea la <span style={css.blueTxt}>boleta</span></div>
      <div style={css.sub}>Sube una foto o ingresa manualmente lo que consumiste</div>

      <div onClick={()=>!scanning&&fileRef.current.click()} style={{ border:`1px dashed ${C.border}`,borderRadius:16,padding:"26px 16px",textAlign:"center",cursor:"pointer",marginBottom:14,background:C.card2 }}>
        <div style={{ width:52,height:52,borderRadius:14,background:`linear-gradient(145deg,${C.card3},${C.card2})`,border:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 10px",fontSize:22,boxShadow:`0 0 20px ${C.blue}22` }}>📷</div>
        <div style={{ fontWeight:700,fontSize:15,marginBottom:3 }}>{scanning?"Procesando...":"Escanear boleta"}</div>
        <div style={{ fontSize:11,color:C.muted }}>Toca para subir foto de la boleta</div>
        {msg&&<div style={{ marginTop:10,fontSize:13,color:msgType==="ok"?C.blue:C.red }}>{msg}</div>}
        <input ref={fileRef} type="file" accept="image/*" style={{ display:"none" }} onChange={handleImage}/>
      </div>

      <div style={css.card}>
        <div style={css.label}>Agregar ítem manualmente</div>
        <input style={{ ...css.input,marginBottom:10 }} placeholder="Nombre del ítem (ej: Pisco Sour)" value={name} onChange={e=>setName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&add()}/>
        <div style={{ ...css.row,marginBottom:10 }}>
          <input style={{ ...css.input,flex:2 }} placeholder="Precio ($)" type="number" value={price} onChange={e=>setPrice(e.target.value)}/>
          <div style={{ display:"flex",alignItems:"center",gap:10,flex:1,justifyContent:"center" }}>
            <button style={{ ...css.btnSm,padding:"8px 14px",fontSize:16,color:C.blue }} onClick={()=>setQty(q=>Math.max(1,q-1))}>−</button>
            <span style={{ fontWeight:700,minWidth:16,textAlign:"center",color:C.blue }}>{qty}</span>
            <button style={{ ...css.btnSm,padding:"8px 14px",fontSize:16,color:C.blue }} onClick={()=>setQty(q=>q+1)}>+</button>
          </div>
        </div>
        <button style={css.btn} onClick={add}>+ Agregar</button>
      </div>

      {items.length>0&&(
        <div style={css.card}>
          <div style={{ ...css.row,marginBottom:12 }}>
            <span style={{ fontWeight:700 }}>Mi consumo ({items.length} ítems)</span>
            <span style={{ marginLeft:"auto",background:gradBlue,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",fontWeight:700 }}>{fmt(itemsTotal)}</span>
          </div>
          {items.map(item=>(
            <div key={item.id} style={{ ...css.row,padding:"9px 0",borderBottom:`1px solid ${C.border}` }}>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:14,fontWeight:500 }}>{item.name}</div>
                <div style={{ fontSize:11,color:C.muted,marginTop:2 }}>x{item.qty} · {fmt(item.price)} c/u</div>
              </div>
              <div style={{ fontWeight:600,marginRight:10,fontSize:14 }}>{fmt(item.price*item.qty)}</div>
              <button style={{ background:"transparent",border:"none",color:C.muted,cursor:"pointer",fontSize:18,padding:0,opacity:0.5 }} onClick={()=>setItems(p=>p.filter(i=>i.id!==item.id))}>×</button>
            </div>
          ))}
        </div>
      )}
      <button style={{ ...css.btn,opacity:items.length===0?0.4:1 }} onClick={()=>items.length>0&&onNext()}>
        {items.length===0?"Agrega al menos un ítem":"Continuar →"}
      </button>
    </div>
  );
}

// ── STEP 2 ──────────────────────────────────────
function Step2({ items, selection, setSelection, onNext, onBack }) {
  const toggle=id=>setSelection(p=>{ const n={...p}; if(n[id]?.selected) delete n[id]; else n[id]={ selected:true,split:1 }; return n; });
  const setSplit=(id,val)=>setSelection(p=>({ ...p,[id]:{ ...p[id],split:Math.max(1,parseInt(val)||1) }}));
  const myTotal=items.reduce((s,i)=>{ const sel=selection[i.id]; if(!sel?.selected) return s; return s+(i.price*i.qty)/sel.split; },0);
  const selCount=Object.values(selection).filter(v=>v?.selected).length;

  return (
    <div>
      <Stepper step={1}/>
      <div style={css.title}>¿Qué <span style={css.blueTxt}>consumiste</span>?</div>
      <div style={css.sub}>Selecciona tus ítems. Si compartiste algo, indica entre cuántos.</div>

      {items.map(item=>{
        const sel=selection[item.id]; const active=sel?.selected; const split=sel?.split||1;
        const myPart=active?(item.price*item.qty)/split:0;
        return (
          <div key={item.id} style={{ ...css.card,border:`1px solid ${active?C.blue+"66":C.border}`,boxShadow:active?`0 4px 24px rgba(0,0,0,0.4),0 0 0 1px ${C.blue}22`:"0 4px 20px rgba(0,0,0,0.4)",transition:"all 0.25s" }}>
            <div style={css.row} onClick={()=>toggle(item.id)}>
              <div style={{ width:22,height:22,borderRadius:6,border:`1.5px solid ${active?C.blue:C.border}`,background:active?gradBlue:"transparent",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0,transition:"all 0.2s" }}>
                {active&&<span style={{ color:"#fff",fontSize:13,fontWeight:900 }}>✓</span>}
              </div>
              <div style={{ flex:1,cursor:"pointer",marginLeft:4 }}>
                <div style={{ fontWeight:600,fontSize:15 }}>{item.name}</div>
                <div style={{ fontSize:11,color:C.muted,marginTop:2 }}>x{item.qty} · {fmt(item.price*item.qty)}</div>
              </div>
              <div style={{ background:active?gradBlue:"transparent",WebkitBackgroundClip:active?"text":"unset",WebkitTextFillColor:active?"transparent":"unset",color:active?"unset":C.muted,fontWeight:700,fontSize:14 }}>
                {fmt(item.price*item.qty)}
              </div>
            </div>
            {active&&(
              <div style={{ marginTop:13,paddingTop:13,borderTop:`1px solid ${C.border}` }}>
                <div style={css.label}>¿Entre cuántos compartiste?</div>
                <div style={{ display:"flex",gap:6,flexWrap:"wrap" }}>
                  {[1,2,3,4,5,6,7,8].map(n=>(
                    <button key={n} style={split===n?css.btnSmA:css.btnSm} onClick={()=>setSplit(item.id,n)}>
                      {n===1?"Solo yo":`÷${n}`}
                    </button>
                  ))}
                </div>
                {split>1&&<div style={{ marginTop:9,fontSize:13,color:C.muted }}>Tu parte: <span style={{ color:C.blue,fontWeight:700 }}>{fmt(myPart)}</span> de {fmt(item.price*item.qty)}</div>}
              </div>
            )}
          </div>
        );
      })}

      <div style={{ position:"sticky",bottom:0,background:C.bg,paddingTop:12,borderTop:`1px solid ${C.border}` }}>
        {selCount>0&&(
          <div style={{ ...css.cardHL,margin:"0 0 10px" }}>
            <div style={css.row}>
              <span style={{ color:C.muted,fontSize:13 }}>Mi subtotal · {selCount} ítem{selCount>1?"s":""}</span>
              <span style={{ marginLeft:"auto",background:gradBlue,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",fontWeight:800,fontSize:20 }}>{fmt(myTotal)}</span>
            </div>
          </div>
        )}
        <button style={{ ...css.btn,marginTop:0,opacity:selCount===0?0.4:1 }} onClick={()=>selCount>0&&onNext()}>
          {selCount===0?"Selecciona al menos un ítem":"Continuar →"}
        </button>
        <button style={css.btnSec} onClick={onBack}>← Volver</button>
      </div>
    </div>
  );
}

// ── STEP 3 ──────────────────────────────────────
function Step3({ items, selection, tableTotal, setTableTotal, tip, setTip, tipSplit, setTipSplit, onBack, onReset, onSave }) {
  const [copied,setCopied]=useState(false);
  const [saved,setSaved]=useState(false);
  const TIPS=[0,10,15,20];

  const mySubtotal=items.reduce((s,i)=>{ const sel=selection[i.id]; if(!sel?.selected) return s; return s+(i.price*i.qty)/sel.split; },0);
  const itemsTotal=items.reduce((s,i)=>s+i.price*i.qty,0);
  const mesaTotal=parseFloat(tableTotal)||itemsTotal;
  const tipTotal=tip.type==="pct"?mesaTotal*tip.value/100:(parseFloat(tip.value)||0);
  const myTip=tipSplit>0?tipTotal/tipSplit:0;
  const myTotal=mySubtotal+myTip;

  const copy=()=>{
    const lines=["¿CUÁNTO ME TOCA?","─────────────────"];
    items.filter(i=>selection[i.id]?.selected).forEach(i=>{ const sp=selection[i.id].split; lines.push(`  ${i.name}${sp>1?` (÷${sp})`:""}  →  ${fmt((i.price*i.qty)/sp)}`); });
    if(myTip>0) lines.push(`  Propina (÷${tipSplit})  →  ${fmt(myTip)}`);
    lines.push("─────────────────",`  TOTAL: ${fmt(myTotal)}`);
    navigator.clipboard?.writeText(lines.join("\n"));
    setCopied(true); setTimeout(()=>setCopied(false),2500);
  };

  const handleSave=()=>{ onSave(myTotal,myTip); setSaved(true); };

  return (
    <div>
      <Stepper step={2}/>
      <div style={css.title}>Total y <span style={css.blueTxt}>propina</span></div>
      <div style={css.sub}>Confirma el total de la mesa para calcular la propina</div>

      <div style={css.cardHL}>
        <div style={css.label}>Total de la mesa (boleta completa)</div>
        <input style={{ ...css.input,fontSize:22,fontWeight:700,color:C.blue2,textAlign:"center" }}
          type="number" placeholder={`Ej: ${fmt(itemsTotal).replace("$","")}`}
          value={tableTotal} onChange={e=>setTableTotal(e.target.value)}/>
        <div style={{ fontSize:11,color:C.muted,textAlign:"center",marginTop:8 }}>
          {parseFloat(tableTotal)>0?`Total ingresado: ${fmt(mesaTotal)}`:`Sin total ingresado, se usa total de ítems: ${fmt(itemsTotal)}`}
        </div>
      </div>

      <div style={css.card}>
        <div style={css.label}>Propina sobre {fmt(mesaTotal)}</div>
        <div style={{ display:"flex",gap:8,marginBottom:14 }}>
          {TIPS.map(p=>(
            <button key={p} style={{ ...(tip.type==="pct"&&tip.value===p?css.btnSmA:css.btnSm),flex:1,fontSize:12 }}
              onClick={()=>setTip({ type:"pct",value:p })}>
              {p===0?"Sin":`${p}%`}
            </button>
          ))}
        </div>
        <div style={css.label}>O monto fijo</div>
        <input style={css.input} type="number" placeholder="Ej: 3000"
          value={tip.type==="fixed"?tip.value:""} onChange={e=>setTip({ type:"fixed",value:e.target.value })}/>
        {tipTotal>0&&(
          <>
            <div style={css.divider}/>
            <div style={{ ...css.row,marginBottom:10 }}>
              <span style={{ color:C.muted,fontSize:13 }}>Propina total</span>
              <span style={{ marginLeft:"auto",fontWeight:600 }}>{fmt(tipTotal)}</span>
            </div>
            <div style={css.label}>¿Entre cuántos se divide?</div>
            <div style={{ display:"flex",gap:6,flexWrap:"wrap" }}>
              {[1,2,3,4,5,6,7,8].map(n=>(
                <button key={n} style={tipSplit===n?css.btnSmA:css.btnSm} onClick={()=>setTipSplit(n)}>
                  {n===1?"Solo yo":`÷${n}`}
                </button>
              ))}
            </div>
            {tipSplit>0&&<div style={{ marginTop:9,fontSize:13,color:C.muted }}>Tu propina: <span style={{ color:C.blue,fontWeight:700 }}>{fmt(myTip)}</span></div>}
          </>
        )}
      </div>

      <div style={css.card}>
        <div style={{ ...css.label,marginBottom:12 }}>Mi desglose</div>
        {items.filter(i=>selection[i.id]?.selected).map(i=>{
          const sp=selection[i.id].split;
          return (
            <div key={i.id} style={{ ...css.row,padding:"8px 0",borderBottom:`1px solid ${C.border}`,fontSize:14 }}>
              <div style={{ flex:1,color:C.muted }}>{i.name}{sp>1&&<span style={{ color:C.blue,fontSize:11,marginLeft:6 }}>÷{sp}</span>}</div>
              <div style={{ fontWeight:600 }}>{fmt((i.price*i.qty)/sp)}</div>
            </div>
          );
        })}
        {myTip>0&&(
          <div style={{ ...css.row,padding:"8px 0",borderBottom:`1px solid ${C.border}`,fontSize:14 }}>
            <div style={{ flex:1,color:C.muted }}>Propina<span style={{ color:C.blue,fontSize:11,marginLeft:6 }}>÷{tipSplit}</span></div>
            <div style={{ fontWeight:600 }}>{fmt(myTip)}</div>
          </div>
        )}
        <div style={css.divider}/>
        <div style={{ ...css.row,fontSize:13,marginBottom:6 }}>
          <span style={{ color:C.muted }}>Subtotal consumo</span><span style={{ marginLeft:"auto" }}>{fmt(mySubtotal)}</span>
        </div>
        {myTip>0&&(
          <div style={{ ...css.row,fontSize:13 }}>
            <span style={{ color:C.muted }}>Propina</span><span style={{ marginLeft:"auto" }}>{fmt(myTip)}</span>
          </div>
        )}
      </div>

      <div style={{ background:"linear-gradient(145deg,#070f1e,#0a1428)",border:`1px solid ${C.blue}44`,borderRadius:20,padding:"28px 24px",textAlign:"center",marginBottom:14,boxShadow:`0 8px 40px rgba(0,0,0,0.6),0 0 30px ${C.blue}22,inset 0 1px 0 ${C.blue}22` }}>
        <div style={{ fontSize:11,color:C.muted,letterSpacing:3,textTransform:"uppercase",marginBottom:10 }}>¿Cuánto me toca?</div>
        <div style={{ fontSize:52,fontWeight:800,background:gradBlue,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",letterSpacing:-1,lineHeight:1 }}>{fmt(myTotal)}</div>
        {myTip>0&&<div style={{ fontSize:12,color:C.muted,marginTop:10 }}>Incluye {fmt(myTip)} de propina</div>}
      </div>

      <button style={{ ...css.btn,background:copied?"transparent":gradBlue,border:copied?`1px solid ${C.blue}`:"none",color:copied?C.blue:"#fff" }} onClick={copy}>
        {copied?"✓ Copiado al portapapeles":"Copiar mi cuenta"}
      </button>
      <button style={{ ...css.btn,marginTop:10,background:saved?"transparent":C.card2,border:saved?`1px solid ${C.blue}`:`1px solid ${C.border}`,color:saved?C.blue:C.muted,boxShadow:"none" }} onClick={handleSave} disabled={saved}>
        {saved?"✓ Guardado en historial":"Guardar en historial"}
      </button>
      <button style={css.btn} onClick={onReset}>↺ Nueva cuenta</button>
      <button style={css.btnSec} onClick={onBack}>← Volver</button>

      <History />
    </div>
  );
}

// ── HISTORIAL ───────────────────────────────────
function History() {
  const [records,setRecords]=useState([]);
  const [showAll,setShowAll]=useState(false);

  useEffect(()=>{ setRecords(getHistory()); },[]);

  const deleteRecord=(id)=>{
    const updated=records.filter(r=>r.id!==id);
    setRecords(updated); saveHistory(updated);
  };

  const total=records.reduce((s,r)=>s+r.total,0);
  const shown=showAll?records:records.slice(0,5);

  if(records.length===0) return (
    <div style={{ marginTop:28 }}>
      <div style={{ ...css.label,marginBottom:14 }}>Historial de cuentas</div>
      <div style={{ ...css.card,textAlign:"center",padding:"28px 16px" }}>
        <div style={{ fontSize:28,marginBottom:8,opacity:0.4 }}>📋</div>
        <div style={{ color:C.muted,fontSize:14 }}>Aún no hay cuentas guardadas</div>
      </div>
    </div>
  );

  return (
    <div style={{ marginTop:28 }}>
      <div style={{ ...css.row,marginBottom:14 }}>
        <div style={css.label}>Historial de cuentas</div>
        <div style={{ marginLeft:"auto",background:gradBlue,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",fontSize:13,fontWeight:700 }}>{records.length} registro{records.length>1?"s":""}</div>
      </div>
      <div style={{ ...css.cardHL,marginBottom:14 }}>
        <div style={css.row}>
          <div>
            <div style={{ fontSize:11,color:C.muted,letterSpacing:1,textTransform:"uppercase",marginBottom:4 }}>Total gastado</div>
            <div style={{ fontSize:28,fontWeight:800,background:gradBlue,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent" }}>{fmt(total)}</div>
          </div>
          <div style={{ marginLeft:"auto",textAlign:"right" }}>
            <div style={{ fontSize:11,color:C.muted,letterSpacing:1,textTransform:"uppercase",marginBottom:4 }}>Promedio</div>
            <div style={{ fontSize:20,fontWeight:700,color:C.text }}>{fmt(total/records.length)}</div>
          </div>
        </div>
      </div>
      {shown.map(r=>(
        <div key={r.id} style={{ ...css.card,padding:"14px 16px" }}>
          <div style={css.row}>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13,color:C.muted,marginBottom:3 }}>{fmtDate(r.date)}</div>
              {r.tip>0&&<div style={{ fontSize:12,color:C.muted }}>Propina: {fmt(r.tip)}</div>}
            </div>
            <div style={{ background:gradBlue,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",fontWeight:800,fontSize:18,marginRight:10 }}>{fmt(r.total)}</div>
            <button style={{ background:"transparent",border:"none",color:C.muted,cursor:"pointer",fontSize:16,padding:0,opacity:0.5 }} onClick={()=>deleteRecord(r.id)}>×</button>
          </div>
        </div>
      ))}
      {records.length>5&&(
        <button style={css.btnSec} onClick={()=>setShowAll(p=>!p)}>
          {showAll?`Mostrar menos ↑`:`Ver todos (${records.length-5} más) ↓`}
        </button>
      )}
    </div>
  );
}

// ── ROOT ────────────────────────────────────────
export default function App() {
  const [step,setStep]=useState(0);
  const [items,setItems]=useState([]);
  const [selection,setSelection]=useState({});
  const [tableTotal,setTableTotal]=useState("");
  const [tip,setTip]=useState({ type:"pct",value:10 });
  const [tipSplit,setTipSplit]=useState(2);

  const reset=()=>{ setItems([]); setSelection({}); setTableTotal(""); setTip({ type:"pct",value:10 }); setTipSplit(2); setStep(0); };

  const goToStep2=()=>{ const s={}; items.forEach(i=>{ s[i.id]={ selected:true,split:1 }; }); setSelection(s); setStep(1); };

  const handleSave=(total,tip)=>{
    const record={ id:Date.now(), date:new Date().toISOString(), total, tip };
    const prev=getHistory();
    saveHistory([record,...prev]);
  };

  return (
    <div style={css.app}>
      <div style={css.header}>
        <div style={{ width:34,height:34,borderRadius:10,background:gradBlue,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,color:"#fff",fontWeight:900,flexShrink:0,boxShadow:`0 0 14px ${C.blue}66` }}>✦</div>
        <div style={css.logoWrap}>
          <span style={css.logo}>¿Cuánto me Toca?</span>
          <span style={css.logoSub}>Calculadora de cuenta</span>
        </div>
        <span style={css.stepLabel}>Paso {step+1} / 3</span>
      </div>
      <div style={css.body}>
        {step===0&&<Step1 items={items} setItems={setItems} onNext={goToStep2}/>}
        {step===1&&<Step2 items={items} selection={selection} setSelection={setSelection} onNext={()=>setStep(2)} onBack={()=>setStep(0)}/>}
        {step===2&&<Step3 items={items} selection={selection} tableTotal={tableTotal} setTableTotal={setTableTotal} tip={tip} setTip={setTip} tipSplit={tipSplit} setTipSplit={setTipSplit} onBack={()=>setStep(1)} onReset={reset} onSave={handleSave}/>}
      </div>
    </div>
  );
}