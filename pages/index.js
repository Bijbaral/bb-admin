import { useState, useEffect, useRef } from "react";
import Head from "next/head";
import { supabase } from "../lib/supabase";

const TAG_COLORS = {
  "HOT DROP":{ bg:"rgba(255,60,100,0.18)",  color:"#ff3c64", border:"rgba(255,60,100,0.35)"  },
  "LIMITED": { bg:"rgba(255,180,0,0.15)",   color:"#ffb400", border:"rgba(255,180,0,0.35)"   },
  "NEW DROP":{ bg:"rgba(120,80,255,0.18)",  color:"#a06aff", border:"rgba(120,80,255,0.35)"  },
};

const STATUS_COLORS = {
  Pending:  { bg:"rgba(255,180,0,0.12)",  color:"#ffb400" },
  Packed:   { bg:"rgba(120,80,255,0.15)", color:"#a06aff" },
  Shipped:  { bg:"rgba(0,180,255,0.12)",  color:"#00b4ff" },
  Delivered:{ bg:"rgba(0,212,150,0.12)",  color:"#00d496" },
  Cancelled:{ bg:"rgba(255,60,100,0.12)", color:"#ff3c64" },
};

const fmt = n => "₹" + Number(n).toLocaleString("en-IN");
const WEEKLY_DATA = [65,82,74,91,88,110,95];
const DAYS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
const MAX_IMAGES = 5;

export default function AdminApp() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:"100vh", background:"#080808" }}>
        <div style={{ width:36, height:36, border:"2px solid rgba(160,106,255,0.2)", borderTopColor:"#a06aff", borderRadius:"50%", animation:"spin 0.9s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>BB Enterprise — Admin</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="robots" content="noindex,nofollow" />
      </Head>
      <GlobalStyles />
      {session ? <AdminDashboard onLogout={() => supabase.auth.signOut()} /> : <LoginPage />}
    </>
  );
}

/* ─────────── LOGIN PAGE ─────────── */
function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setErr(""); setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setErr(error.message);
    setBusy(false);
  }

  return (
    <div style={{ minHeight:"100vh", background:"#080808", color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", padding:20, fontFamily:"'DM Sans',sans-serif" }}>
      <div style={{ width:"100%", maxWidth:400, padding:36, background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.08)", borderRadius:22 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
          <div style={{ width:38, height:38, background:"linear-gradient(135deg,#a06aff,#ff3c64)", borderRadius:11, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", lineHeight:1 }}>
            <span style={{ fontFamily:"Bebas Neue", fontSize:13, color:"#fff", letterSpacing:"0.08em" }}>BB</span>
            <div style={{ width:18, height:1, background:"rgba(255,255,255,0.4)", margin:"1px 0" }} />
            <span style={{ fontFamily:"Bebas Neue", fontSize:7, color:"rgba(255,255,255,0.7)", letterSpacing:"0.12em" }}>ENT</span>
          </div>
          <div>
            <div style={{ fontFamily:"Bebas Neue", fontSize:18, letterSpacing:"0.14em", color:"#fff" }}>BB ENTERPRISE</div>
            <div style={{ fontSize:9, color:"#555", letterSpacing:"0.18em", textTransform:"uppercase" }}>Admin Panel</div>
          </div>
        </div>
        <h1 style={{ fontFamily:"Bebas Neue", fontSize:32, color:"#fff", letterSpacing:".04em", marginTop:24, marginBottom:6 }}>Welcome <span className="grad">back.</span></h1>
        <p style={{ fontSize:13, color:"#777", marginBottom:28 }}>Sign in to manage your store.</p>

        <form onSubmit={handleLogin}>
          <label className="form-label">Email</label>
          <input className="form-field" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" required style={{ marginBottom:14 }} />

          <label className="form-label">Password</label>
          <input className="form-field" type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" required style={{ marginBottom:14 }} />

          {err && <div style={{ background:"rgba(255,60,100,0.12)", border:"1px solid rgba(255,60,100,.3)", color:"#ff3c64", padding:"10px 14px", borderRadius:10, fontSize:13, marginBottom:14 }}>{err}</div>}

          <button type="submit" disabled={busy} style={{ width:"100%", padding:14, background:"linear-gradient(135deg,#a06aff,#ff3c64)", border:"none", borderRadius:12, color:"#fff", fontWeight:700, fontSize:14, cursor:busy?"wait":"pointer", letterSpacing:".05em", textTransform:"uppercase", opacity:busy?.6:1 }}>
            {busy ? "Signing in…" : "Sign In →"}
          </button>
        </form>
      </div>
    </div>
  );
}

/* ─────────── MAIN DASHBOARD ─────────── */
function AdminDashboard({ onLogout }) {
  const [adminTab, setAdminTab] = useState("dashboard");
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [heroImage, setHeroImage] = useState("");
  const [editingProduct, setEditingProduct] = useState(null);
  const [addSuccess, setAddSuccess] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [newProduct, setNewProduct] = useState({ name:"", type:"T-Shirts", gender:"MEN", sizes:["M"], fit:"Oversized", mrp:"", price:"", tag:"HOT DROP", images:[], stock:0 });
  const [newOrder, setNewOrder] = useState({ customer:"", product:"", gender:"MEN", qty:1, amount:"", status:"Pending" });

  useEffect(() => {
    async function load() {
      const { data: prods } = await supabase.from("products").select("*").order("created_at", { ascending: false });
      if (prods) setProducts(prods);
      const { data: ords } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
      if (ords) setOrders(ords);
      const { data: hero } = await supabase.from("settings").select("value").eq("key","hero_image").maybeSingle();
      if (hero?.value) setHeroImage(hero.value);
    }
    load();
    const ch = supabase.channel("admin-realtime")
      .on("postgres_changes",{event:"*",schema:"public",table:"products"},load)
      .on("postgres_changes",{event:"*",schema:"public",table:"orders"},load)
      .on("postgres_changes",{event:"*",schema:"public",table:"settings"},load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  async function handleAddProduct(e) {
    e.preventDefault();
    if (!newProduct.name||!newProduct.mrp||!newProduct.price) return;
    if (!newProduct.sizes.length) { alert("Pick at least one size."); return; }
    const imgs = newProduct.images.length ? newProduct.images : ["https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=600&q=80"];
    const { error } = await supabase.from("products").insert([{
      name:newProduct.name, type:newProduct.type, gender:newProduct.gender,
      size:newProduct.sizes[0], sizes:newProduct.sizes,
      fit:newProduct.fit,
      mrp:+newProduct.mrp, price:+newProduct.price, tag:newProduct.tag,
      image: imgs[0],
      images: imgs,
      stock:+newProduct.stock||0,
    }]);
    if (error) { alert("Error: "+error.message); return; }
    setNewProduct({ name:"", type:"T-Shirts", gender:"MEN", sizes:["M"], fit:"Oversized", mrp:"", price:"", tag:"HOT DROP", images:[], stock:0 });
    setAddSuccess(true); setTimeout(()=>setAddSuccess(false),2500);
  }

  async function handleSaveEdit(e) {
    e.preventDefault();
    const imgs = editingProduct.images?.length ? editingProduct.images : [editingProduct.image];
    const sizes = editingProduct.sizes?.length ? editingProduct.sizes : (editingProduct.size ? [editingProduct.size] : []);
    if (!sizes.length) { alert("Pick at least one size."); return; }
    const { error } = await supabase.from("products").update({
      name:editingProduct.name, type:editingProduct.type, gender:editingProduct.gender,
      size:sizes[0], sizes,
      fit:editingProduct.fit,
      mrp:+editingProduct.mrp, price:+editingProduct.price, tag:editingProduct.tag,
      image: imgs[0],
      images: imgs,
      stock:+editingProduct.stock||0,
    }).eq("id", editingProduct.id);
    if (error) { alert("Error: "+error.message); return; }
    setEditingProduct(null);
  }

  async function handleDeleteProduct(id) {
    if (!confirm("Delete this product permanently?")) return;
    await supabase.from("products").delete().eq("id", id);
  }

  async function handleAddOrder(e) {
    e.preventDefault();
    if (!newOrder.customer||!newOrder.product||!newOrder.amount) return;
    const { error } = await supabase.from("orders").insert([{ ...newOrder, qty:+newOrder.qty, amount:+newOrder.amount }]);
    if (error) { alert("Error: "+error.message); return; }
    setNewOrder({ customer:"", product:"", gender:"MEN", qty:1, amount:"", status:"Pending" });
    setOrderSuccess(true); setTimeout(()=>setOrderSuccess(false),2500);
  }

  async function updateOrderStatus(id, status) {
    await supabase.from("orders").update({ status }).eq("id", id);
  }

  async function setHero(url) {
    setHeroImage(url);
    await supabase.from("settings").upsert({ key:"hero_image", value:url, updated_at:new Date().toISOString() });
  }

  const totalRevenue = orders.filter(o=>o.status!=="Cancelled").reduce((s,o)=>s+o.amount,0);
  const catRevenue = {};
  products.forEach(p=>{ catRevenue[p.type]=(catRevenue[p.type]||0)+p.price*3; });
  const maxRev = Math.max(...Object.values(catRevenue),1);
  const maxW = Math.max(...WEEKLY_DATA);
  const tabs = [["dashboard","Dashboard"],["add-products","Add Products"],["inventory","Inventory"],["sales","Sales"],["orders","Orders"]];

  return (
    <div style={{ background:"#080808", minHeight:"100vh", color:"#fff", fontFamily:"'DM Sans',sans-serif" }}>
      <nav style={{ position:"fixed", top:0, left:0, right:0, zIndex:100, height:58, padding:"0 20px", display:"flex", alignItems:"center", justifyContent:"space-between", background:"rgba(6,6,6,0.9)", backdropFilter:"blur(22px)", borderBottom:"1px solid rgba(255,255,255,0.07)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:34, height:34, background:"linear-gradient(135deg,#a06aff,#ff3c64)", borderRadius:10, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", lineHeight:1 }}>
            <span style={{ fontFamily:"Bebas Neue", fontSize:13, color:"#fff" }}>BB</span>
            <div style={{ width:18, height:1, background:"rgba(255,255,255,0.4)", margin:"1px 0" }} />
            <span style={{ fontFamily:"Bebas Neue", fontSize:7, color:"rgba(255,255,255,0.7)", letterSpacing:"0.12em" }}>ENT</span>
          </div>
          <div>
            <div style={{ fontFamily:"Bebas Neue", fontSize:17, letterSpacing:"0.14em", color:"#fff" }}>BB ENTERPRISE</div>
            <div style={{ fontSize:9, color:"#a06aff", letterSpacing:"0.18em", textTransform:"uppercase" }}>Admin Panel</div>
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:8, height:8, borderRadius:"50%", background:"#00d496", boxShadow:"0 0 12px rgba(0,212,150,0.6)" }} />
          <span style={{ fontSize:11, color:"#666", letterSpacing:"0.08em", textTransform:"uppercase" }}>Live</span>
          <button onClick={onLogout} style={{ padding:"7px 14px", background:"rgba(255,255,255,.05)", border:"1px solid rgba(255,255,255,.1)", borderRadius:9, color:"#aaa", fontSize:12, fontWeight:600, cursor:"pointer", marginLeft:10 }}>Logout</button>
        </div>
      </nav>

      <div style={{ paddingTop:80, maxWidth:1100, margin:"0 auto", padding:"80px clamp(16px,4vw,28px) 80px" }}>
        <div style={{ marginBottom:28 }}>
          <div style={{ fontSize:10, color:"#444", textTransform:"uppercase", letterSpacing:".14em", marginBottom:5 }}>Operating System</div>
          <h1 style={{ fontFamily:"Bebas Neue", fontSize:"clamp(30px,5vw,44px)", letterSpacing:".05em", color:"#fff" }}>ADMIN <span className="grad">PANEL</span></h1>
        </div>
        <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:28, padding:"12px 14px", background:"rgba(255,255,255,.02)", border:"1px solid rgba(255,255,255,.06)", borderRadius:15 }}>
          {tabs.map(([id,label]) => <div key={id} className={`admin-tab ${adminTab===id?"active":""}`} onClick={()=>setAdminTab(id)}>{label}</div>)}
        </div>

        {adminTab==="dashboard" && (
          <div className="fu">
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))", gap:12, marginBottom:24 }}>
              {[
                {label:"Total Revenue", value:fmt(totalRevenue), color:"#a06aff"},
                {label:"Orders",        value:orders.length,     color:"#ff3c64"},
                {label:"Products",      value:products.length,   color:"#ffb400"},
                {label:"Visitors",      value:"—",               color:"#00d496"},
              ].map(k => (
                <div key={k.label} className="kpi-card">
                  <div style={{ fontSize:10, color:"#444", textTransform:"uppercase", letterSpacing:".1em", marginBottom:7 }}>{k.label}</div>
                  <div style={{ fontFamily:"Bebas Neue", fontSize:34, color:k.color, lineHeight:1 }}>{k.value}</div>
                </div>
              ))}
            </div>
            <div style={{ background:"rgba(255,255,255,.02)", border:"1px solid rgba(255,255,255,.07)", borderRadius:17, padding:22, marginBottom:20 }}>
              <div style={{ fontFamily:"Bebas Neue", fontSize:20, color:"#fff", marginBottom:4 }}>WEEKLY PERFORMANCE</div>
              <div style={{ fontSize:12, color:"#444", marginBottom:20 }}>Orders this week</div>
              <div style={{ display:"flex", gap:8, alignItems:"flex-end", height:130 }}>
                {WEEKLY_DATA.map((v,i) => (
                  <div key={i} className="bar-wrap">
                    <div className="bar-fill" style={{ height:`${Math.round((v/maxW)*110)}px` }} />
                    <div style={{ fontSize:10, color:"#444" }}>{DAYS[i]}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ background:"rgba(255,255,255,.02)", border:"1px solid rgba(255,255,255,.07)", borderRadius:17, padding:22 }}>
              <div style={{ fontFamily:"Bebas Neue", fontSize:18, color:"#a06aff", marginBottom:16 }}>HERO IMAGE</div>
              <ImageInput image={heroImage} onSet={setHero} onClear={()=>setHero("")} label="Homepage Hero Image" />
            </div>
          </div>
        )}

        {adminTab==="add-products" && (
          <div className="fu" style={{ maxWidth:580 }}>
            <div style={{ fontFamily:"Bebas Neue", fontSize:26, color:"#fff", marginBottom:22 }}>ADD PRODUCT</div>
            <div style={{ padding:26, background:"rgba(255,255,255,.02)", border:"1px solid rgba(255,255,255,.07)", borderRadius:19 }}>
              <MultiImageInput images={newProduct.images} onChange={imgs=>setNewProduct(p=>({...p,images:imgs}))} />
              <form onSubmit={handleAddProduct}>
                <div style={{ display:"grid", gap:14 }}>
                  <div><label className="form-label">Product Name</label><input className="form-field" type="text" placeholder="e.g. Oversized Acid Wash Tee" value={newProduct.name} onChange={e=>setNewProduct(p=>({...p,name:e.target.value}))} /></div>
                  <div className="admin-form-grid">
                    {[
                      {label:"Product Type",key:"type",opts:["T-Shirts","Shirts","Trousers","Shorts","Inner Wear","Socks","Sweatshirts","Hoodies","Oversized Tees","Tops","Bottomwear","Winterwear","Basics","Boys Wear","Girls Wear"]},
                      {label:"Gender",key:"gender",opts:["MEN","WOMEN","KIDS","UNISEX"]},
                      {label:"Fit Type",key:"fit",opts:["Oversized","Boxy","True to Size","Standard Fit"]},
                    ].map(f => (
                      <div key={f.key}><label className="form-label">{f.label}</label><select className="form-field" value={newProduct[f.key]} onChange={e=>setNewProduct(p=>({...p,[f.key]:e.target.value}))}>{f.opts.map(o=><option key={o}>{o}</option>)}</select></div>
                    ))}
                    <div><label className="form-label">MRP (₹)</label><input className="form-field" type="number" placeholder="2499" value={newProduct.mrp} onChange={e=>setNewProduct(p=>({...p,mrp:e.target.value}))} /></div>
                    <div><label className="form-label">Selling Price (₹)</label><input className="form-field" type="number" placeholder="599" value={newProduct.price} onChange={e=>setNewProduct(p=>({...p,price:e.target.value}))} /></div>
                  </div>
                  <SizeChips label="Sizes (tap multiple)" selected={newProduct.sizes} onChange={sizes=>setNewProduct(p=>({...p,sizes}))} />
                  <div className="admin-form-grid">
                    <div><label className="form-label">Tag</label><select className="form-field" value={newProduct.tag} onChange={e=>setNewProduct(p=>({...p,tag:e.target.value}))}>{["HOT DROP","LIMITED","NEW DROP"].map(t=><option key={t}>{t}</option>)}</select></div>
                    <div><label className="form-label">Stock</label><input className="form-field" type="number" placeholder="20" value={newProduct.stock} onChange={e=>setNewProduct(p=>({...p,stock:e.target.value}))} /></div>
                  </div>
                  <div style={{ display:"flex", gap:12, alignItems:"center", flexWrap:"wrap" }}>
                    <button type="submit" className="submit-btn">Add to Storefront →</button>
                    {addSuccess && <div className="success-badge">✓ Saved to database!</div>}
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}

        {adminTab==="inventory" && (
          <div className="fu">
            <div style={{ fontFamily:"Bebas Neue", fontSize:26, color:"#fff", marginBottom:6 }}>INVENTORY</div>
            <div style={{ fontSize:12, color:"#444", marginBottom:20 }}>{products.length} products · live</div>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {products.map(p => (
                <div key={p.id} className="inv-row">
                  {/* Product thumbnail */}
                  <img src={p.image} alt={p.name} style={{ width:48, height:48, objectFit:"cover", borderRadius:8, border:"1px solid rgba(255,255,255,.1)", flexShrink:0 }} onError={e=>{e.target.style.display="none";}} />
                  <div>
                    <div style={{ fontSize:13, fontWeight:500, color:"#fff" }}>{p.name}</div>
                    <div style={{ fontSize:10, color:"#444", marginTop:2 }}>{p.type} · {p.gender} · {(p.sizes && p.sizes.length) ? p.sizes.join("/") : p.size} · {p.tag}{p.images?.length>1 ? ` · 📸 ${p.images.length} photos` : ""}</div>
                  </div>
                  <div style={{ textAlign:"right" }}><div style={{ fontSize:15, fontWeight:600, color:"#fff" }}>{p.stock||0}</div><div style={{ fontSize:9, color:"#444" }}>stock</div></div>
                  <div style={{ textAlign:"right" }}><div style={{ fontSize:14, fontWeight:600, color:"#a06aff" }}>{fmt(p.price)}</div><div style={{ fontSize:9, color:"#444" }}>{fmt(p.mrp)} MRP</div></div>
                  <button onClick={()=>setEditingProduct({...p, images: p.images?.length ? p.images : [p.image], sizes: (p.sizes && p.sizes.length) ? p.sizes : (p.size ? [p.size] : [])})} style={{ padding:"5px 12px", background:"rgba(160,106,255,.14)", border:"1px solid rgba(160,106,255,.3)", borderRadius:8, color:"#c084fc", fontSize:11, fontWeight:600, cursor:"pointer" }}>Edit</button>
                  <button onClick={()=>handleDeleteProduct(p.id)} style={{ padding:"5px 12px", background:"rgba(255,60,100,.12)", border:"1px solid rgba(255,60,100,.3)", borderRadius:8, color:"#ff3c64", fontSize:11, fontWeight:600, cursor:"pointer" }}>Delete</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {adminTab==="sales" && (
          <div className="fu">
            <div style={{ fontFamily:"Bebas Neue", fontSize:26, color:"#fff", marginBottom:22 }}>SALES ANALYTICS</div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))", gap:12, marginBottom:24 }}>
              {[
                {label:"Total Sales",value:fmt(totalRevenue),color:"#a06aff"},
                {label:"Orders",value:orders.length,color:"#ff3c64"},
                {label:"Products",value:products.length,color:"#00d496"},
                {label:"Avg Order",value:orders.length?fmt(Math.round(totalRevenue/orders.length)):"—",color:"#ffb400"},
              ].map(k => (
                <div key={k.label} className="kpi-card">
                  <div style={{ fontSize:10, color:"#444", textTransform:"uppercase", letterSpacing:".09em", marginBottom:7 }}>{k.label}</div>
                  <div style={{ fontFamily:"Bebas Neue", fontSize:30, color:k.color }}>{k.value}</div>
                </div>
              ))}
            </div>
            <div style={{ background:"rgba(255,255,255,.02)", border:"1px solid rgba(255,255,255,.07)", borderRadius:17, padding:22 }}>
              <div style={{ fontFamily:"Bebas Neue", fontSize:19, color:"#fff", marginBottom:18 }}>REVENUE BY CATEGORY</div>
              <div style={{ display:"flex", flexDirection:"column", gap:9 }}>
                {Object.entries(catRevenue).slice(0,9).map(([cat,rev]) => (
                  <div key={cat} style={{ display:"grid", gridTemplateColumns:"minmax(100px,140px) 1fr 80px", gap:10, alignItems:"center" }}>
                    <div style={{ fontSize:12, color:"#777", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{cat}</div>
                    <div style={{ height:7, background:"rgba(255,255,255,.05)", borderRadius:4, overflow:"hidden" }}>
                      <div style={{ height:"100%", width:`${Math.round((rev/maxRev)*100)}%`, background:"linear-gradient(90deg,#a06aff,#ff3c64)", borderRadius:4 }} />
                    </div>
                    <div style={{ fontSize:12, color:"#a06aff", fontWeight:600, textAlign:"right" }}>{fmt(rev)}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {adminTab==="orders" && (
          <div className="fu">
            <div style={{ fontFamily:"Bebas Neue", fontSize:26, color:"#fff", marginBottom:22 }}>ORDERS</div>
            <div style={{ padding:22, background:"rgba(255,255,255,.02)", border:"1px solid rgba(255,255,255,.07)", borderRadius:18, marginBottom:22 }}>
              <div style={{ fontFamily:"Bebas Neue", fontSize:17, color:"#a06aff", marginBottom:16 }}>ADD MANUAL ORDER</div>
              <form onSubmit={handleAddOrder}>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))", gap:12, marginBottom:14 }}>
                  {[["Customer Name","customer","text","Arjun Sharma"],["Product","product","text","Product name"],["Quantity","qty","number","1"],["Amount (₹)","amount","number","599"]].map(([l,k,t,ph]) => (
                    <div key={k}><label className="form-label">{l}</label><input className="form-field" type={t} placeholder={ph} value={newOrder[k]} onChange={e=>setNewOrder(o=>({...o,[k]:e.target.value}))} /></div>
                  ))}
                  <div><label className="form-label">Gender</label><select className="form-field" value={newOrder.gender} onChange={e=>setNewOrder(o=>({...o,gender:e.target.value}))}>{["MEN","WOMEN","KIDS","UNISEX"].map(g=><option key={g}>{g}</option>)}</select></div>
                  <div><label className="form-label">Status</label><select className="form-field" value={newOrder.status} onChange={e=>setNewOrder(o=>({...o,status:e.target.value}))}>{["Pending","Packed","Shipped","Delivered","Cancelled"].map(s=><option key={s}>{s}</option>)}</select></div>
                </div>
                <div style={{ display:"flex", gap:12, alignItems:"center", flexWrap:"wrap" }}>
                  <button type="submit" className="submit-btn">Add Order →</button>
                  {orderSuccess && <div className="success-badge">✓ Order saved!</div>}
                </div>
              </form>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:9 }}>
              {orders.map(o => (
                <div key={o.id} style={{ padding:"16px 18px", background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.07)", borderRadius:15, display:"grid", gridTemplateColumns:"1fr auto auto", gap:14, alignItems:"center" }}>
                  <div><div style={{ fontSize:13, fontWeight:600, color:"#fff" }}>{o.customer}</div><div style={{ fontSize:11, color:"#555", marginTop:2 }}>{o.product} · {o.gender} · Qty {o.qty}</div></div>
                  <div style={{ fontFamily:"Bebas Neue", fontSize:20, color:"#a06aff" }}>{fmt(o.amount)}</div>
                  <select className="status-sel" value={o.status} onChange={e=>updateOrderStatus(o.id,e.target.value)} style={{ background:STATUS_COLORS[o.status]?.bg, color:STATUS_COLORS[o.status]?.color, borderColor:`${STATUS_COLORS[o.status]?.color}44` }}>
                    {["Pending","Packed","Shipped","Delivered","Cancelled"].map(s=><option key={s} style={{background:"#1a1a1a",color:"#ccc"}}>{s}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </div>
        )}

        {editingProduct && (
          <div className="modal-backdrop" onClick={()=>setEditingProduct(null)}>
            <div className="modal-box" onClick={e=>e.stopPropagation()}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
                <div style={{ fontFamily:"Bebas Neue", fontSize:22, color:"#fff" }}>EDIT PRODUCT</div>
                <button onClick={()=>setEditingProduct(null)} style={{ background:"none", border:"none", color:"#555", fontSize:20, cursor:"pointer" }}>✕</button>
              </div>
              <MultiImageInput images={editingProduct.images || []} onChange={imgs=>setEditingProduct(p=>({...p,images:imgs}))} />
              <form onSubmit={handleSaveEdit}>
                <div style={{ display:"grid", gap:13 }}>
                  <div><label className="form-label">Product Name</label><input className="form-field" type="text" value={editingProduct.name} onChange={e=>setEditingProduct(p=>({...p,name:e.target.value}))} /></div>
                  <div className="admin-form-grid">
                    <div><label className="form-label">Type</label><select className="form-field" value={editingProduct.type} onChange={e=>setEditingProduct(p=>({...p,type:e.target.value}))}>{["T-Shirts","Shirts","Trousers","Shorts","Inner Wear","Socks","Sweatshirts","Hoodies","Oversized Tees","Tops","Bottomwear","Winterwear","Basics","Boys Wear","Girls Wear"].map(t=><option key={t}>{t}</option>)}</select></div>
                    <div><label className="form-label">Gender</label><select className="form-field" value={editingProduct.gender} onChange={e=>setEditingProduct(p=>({...p,gender:e.target.value}))}>{["MEN","WOMEN","KIDS","UNISEX"].map(g=><option key={g}>{g}</option>)}</select></div>
                    <div><label className="form-label">MRP (₹)</label><input className="form-field" type="number" value={editingProduct.mrp} onChange={e=>setEditingProduct(p=>({...p,mrp:e.target.value}))} /></div>
                    <div><label className="form-label">Selling Price (₹)</label><input className="form-field" type="number" value={editingProduct.price} onChange={e=>setEditingProduct(p=>({...p,price:e.target.value}))} /></div>
                    <div><label className="form-label">Fit</label><select className="form-field" value={editingProduct.fit} onChange={e=>setEditingProduct(p=>({...p,fit:e.target.value}))}>{["Oversized","Boxy","True to Size","Standard Fit"].map(f=><option key={f}>{f}</option>)}</select></div>
                    <div><label className="form-label">Tag</label><select className="form-field" value={editingProduct.tag} onChange={e=>setEditingProduct(p=>({...p,tag:e.target.value}))}>{["HOT DROP","LIMITED","NEW DROP"].map(t=><option key={t}>{t}</option>)}</select></div>
                    <div><label className="form-label">Stock</label><input className="form-field" type="number" value={editingProduct.stock||0} onChange={e=>setEditingProduct(p=>({...p,stock:e.target.value}))} /></div>
                  </div>
                  <SizeChips label="Sizes (tap multiple)" selected={editingProduct.sizes || []} onChange={sizes=>setEditingProduct(p=>({...p,sizes}))} />
                  <div style={{ display:"flex", gap:10, paddingTop:4 }}>
                    <button type="submit" className="submit-btn">Save Changes →</button>
                    <button type="button" onClick={()=>setEditingProduct(null)} style={{ padding:"12px 20px", background:"rgba(255,255,255,.05)", border:"1px solid rgba(255,255,255,.1)", borderRadius:11, color:"#777", fontWeight:600, fontSize:14, cursor:"pointer" }}>Cancel</button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════ MULTI-SIZE CHIPS ═══════════════ */
const SIZE_OPTIONS = ["S","M","L","XL","XXL"];
function SizeChips({ selected = [], onChange, label = "Sizes" }) {
  function toggle(s) {
    if (selected.includes(s)) onChange(selected.filter(x=>x!==s));
    else onChange([...selected, s].sort((a,b)=>SIZE_OPTIONS.indexOf(a)-SIZE_OPTIONS.indexOf(b)));
  }
  return (
    <div>
      <label className="form-label" style={{ display:"block", marginBottom:8 }}>{label}</label>
      <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
        {SIZE_OPTIONS.map(s => {
          const on = selected.includes(s);
          return (
            <button key={s} type="button" onClick={()=>toggle(s)} style={{
              minWidth:46, padding:"9px 14px", borderRadius:10, cursor:"pointer", fontWeight:700, fontSize:13, letterSpacing:".05em",
              background: on ? "linear-gradient(135deg,#a06aff,#ff3c64)" : "rgba(255,255,255,.04)",
              border: on ? "1px solid transparent" : "1px solid rgba(255,255,255,.1)",
              color: on ? "#fff" : "#888",
              transition: "all .15s",
            }}>{s}</button>
          );
        })}
      </div>
      {selected.length === 0 && <div style={{ fontSize:11, color:"#ff3c64", marginTop:8 }}>Pick at least one size.</div>}
    </div>
  );
}

/* ═══════════════ MULTI-IMAGE INPUT (NEW!) ═══════════════ */
function MultiImageInput({ images = [], onChange }) {
  const [urlInput, setUrlInput] = useState("");
  const [urlError, setUrlError] = useState("");
  const fileRef = useRef(null);

  function addUrl() {
    const v = urlInput.trim();
    if (!v.startsWith("http")) { setUrlError("Please enter a valid https:// URL"); return; }
    if (images.length >= MAX_IMAGES) { setUrlError(`Max ${MAX_IMAGES} images per product`); return; }
    setUrlError(""); 
    onChange([...images, v]); 
    setUrlInput("");
  }

  async function handleFiles(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    if (images.length + files.length > MAX_IMAGES) {
      alert(`Max ${MAX_IMAGES} images total. You can add ${MAX_IMAGES - images.length} more.`);
      return;
    }
    const newUrls = [];
    for (const file of files) {
      const ext = file.name.split(".").pop();
      const path = `${Date.now()}-${Math.random().toString(36).slice(2,8)}.${ext}`;
      const { data, error } = await supabase.storage.from("product-images").upload(path, file);
      if (error) { alert("Upload failed: "+error.message); continue; }
      const { data: { publicUrl } } = supabase.storage.from("product-images").getPublicUrl(data.path);
      newUrls.push(publicUrl);
    }
    onChange([...images, ...newUrls]);
    e.target.value = "";
  }

  function removeImg(idx) {
    onChange(images.filter((_, i) => i !== idx));
  }

  function makeMain(idx) {
    if (idx === 0) return;
    const reordered = [images[idx], ...images.filter((_, i) => i !== idx)];
    onChange(reordered);
  }

  return (
    <div style={{ marginBottom:20 }}>
      <div className="form-label">Product Images ({images.length}/{MAX_IMAGES})</div>
      
      {/* Image grid */}
      {images.length > 0 && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(90px, 1fr))", gap:8, marginBottom:12 }}>
          {images.map((img, idx) => (
            <div key={idx} style={{ position:"relative", borderRadius:10, overflow:"hidden", aspectRatio:"1/1", border: idx===0 ? "2px solid #a06aff" : "1px solid rgba(255,255,255,.1)" }}>
              <img src={img} alt={`Image ${idx+1}`} style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }} onError={e=>{e.target.style.background="#222";}} />
              
              {/* Main badge */}
              {idx === 0 && (
                <div style={{ position:"absolute", top:4, left:4, background:"linear-gradient(135deg,#a06aff,#ff3c64)", color:"#fff", fontSize:8, fontWeight:700, padding:"2px 6px", borderRadius:4, letterSpacing:".08em" }}>MAIN</div>
              )}
              
              {/* Remove button */}
              <button type="button" onClick={()=>removeImg(idx)} style={{ position:"absolute", top:4, right:4, width:22, height:22, borderRadius:"50%", background:"rgba(0,0,0,.85)", border:"1px solid rgba(255,255,255,.2)", color:"#fff", fontSize:11, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
              
              {/* Make main button (only show on non-main images) */}
              {idx !== 0 && (
                <button type="button" onClick={()=>makeMain(idx)} style={{ position:"absolute", bottom:4, left:4, right:4, background:"rgba(0,0,0,.7)", border:"1px solid rgba(160,106,255,.4)", color:"#c084fc", fontSize:9, fontWeight:600, padding:"3px 4px", borderRadius:5, cursor:"pointer", letterSpacing:".05em" }}>SET MAIN</button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* URL input */}
      <div style={{ display:"flex", gap:8, marginBottom:6 }}>
        <input className="form-field" type="text" placeholder="Paste image URL (https://…)" value={urlInput}
          onChange={e=>{setUrlInput(e.target.value);setUrlError("");}}
          onKeyDown={e=>e.key==="Enter"&&(e.preventDefault(),addUrl())}
          disabled={images.length >= MAX_IMAGES}
          style={{ flex:1, fontSize:12, opacity: images.length >= MAX_IMAGES ? 0.5 : 1 }} />
        <button type="button" onClick={addUrl} disabled={images.length >= MAX_IMAGES}
          style={{ padding:"10px 14px", background:"linear-gradient(135deg,#a06aff,#ff3c64)", border:"none", borderRadius:10, color:"#fff", fontSize:12, fontWeight:700, cursor:images.length >= MAX_IMAGES ? "not-allowed":"pointer", flexShrink:0, opacity: images.length >= MAX_IMAGES ? 0.5 : 1 }}>+ Add</button>
      </div>
      {urlError && <div style={{ fontSize:11, color:"#ff3c64", marginBottom:6 }}>{urlError}</div>}

      {/* File upload */}
      <input ref={fileRef} type="file" accept="image/*" multiple style={{ display:"none" }} onChange={handleFiles} />
      <button type="button" onClick={()=>fileRef.current?.click()} disabled={images.length >= MAX_IMAGES}
        style={{ width:"100%", padding:"9px", background:"rgba(160,106,255,.1)", border:"1px dashed rgba(160,106,255,.3)", borderRadius:10, color:"#a06aff", fontSize:12, fontWeight:600, cursor:images.length >= MAX_IMAGES ? "not-allowed":"pointer", opacity: images.length >= MAX_IMAGES ? 0.5 : 1 }}>
        ↑ Upload from device (multiple)
      </button>
      <div style={{ fontSize:10, color:"#444", marginTop:6 }}>
        First image = main image shown in product cards. Click "SET MAIN" to reorder.
      </div>
    </div>
  );
}

/* ═══════════════ SINGLE IMAGE INPUT (for hero only) ═══════════════ */
function ImageInput({ image, onSet, onClear, label="Image" }) {
  const [urlInput, setUrlInput] = useState("");
  const [urlError, setUrlError] = useState("");
  const fileRef = useRef(null);

  function applyUrl() {
    const v = urlInput.trim();
    if (!v.startsWith("http")) { setUrlError("Please enter a valid https:// URL"); return; }
    setUrlError(""); onSet(v); setUrlInput("");
  }
  async function handleFile(e) {
    const file = e.target.files?.[0]; if (!file) return;
    const ext = file.name.split(".").pop();
    const path = `${Date.now()}-${Math.random().toString(36).slice(2,8)}.${ext}`;
    const { data, error } = await supabase.storage.from("product-images").upload(path, file);
    if (error) { alert("Upload failed: "+error.message); return; }
    const { data: { publicUrl } } = supabase.storage.from("product-images").getPublicUrl(data.path);
    onSet(publicUrl);
    e.target.value = "";
  }

  return (
    <div style={{ marginBottom:18 }}>
      <div className="form-label">{label}</div>
      {image && (
        <div style={{ position:"relative", marginBottom:10, borderRadius:12, overflow:"hidden" }}>
          <img src={image} alt="preview" style={{ width:"100%", maxHeight:200, objectFit:"cover", display:"block" }} onError={e=>{e.target.style.display="none";}} />
          <button type="button" onClick={onClear} style={{ position:"absolute", top:8, right:8, width:26, height:26, borderRadius:"50%", background:"rgba(0,0,0,.8)", border:"1px solid rgba(255,255,255,.2)", color:"#fff", fontSize:12, cursor:"pointer" }}>✕</button>
        </div>
      )}
      <div style={{ display:"flex", gap:8, marginBottom:6 }}>
        <input className="form-field" type="text" placeholder="Paste image URL (https://…)" value={urlInput}
          onChange={e=>{setUrlInput(e.target.value);setUrlError("");}}
          onKeyDown={e=>e.key==="Enter"&&(e.preventDefault(),applyUrl())}
          style={{ flex:1, fontSize:12 }} />
        <button type="button" onClick={applyUrl} style={{ padding:"10px 14px", background:"linear-gradient(135deg,#a06aff,#ff3c64)", border:"none", borderRadius:10, color:"#fff", fontSize:12, fontWeight:700, cursor:"pointer", flexShrink:0 }}>Set</button>
      </div>
      {urlError && <div style={{ fontSize:11, color:"#ff3c64", marginBottom:6 }}>{urlError}</div>}
      <input ref={fileRef} type="file" accept="image/*" style={{ display:"none" }} onChange={handleFile} />
      <button type="button" onClick={()=>fileRef.current?.click()}
        style={{ width:"100%", padding:"9px", background:"rgba(160,106,255,.1)", border:"1px dashed rgba(160,106,255,.3)", borderRadius:10, color:"#a06aff", fontSize:12, fontWeight:600, cursor:"pointer" }}>
        ↑ Upload to Supabase Storage
      </button>
    </div>
  );
}

function GlobalStyles() {
  return (
    <style>{`
      .grad{background:linear-gradient(135deg,#a06aff,#ff3c64);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}
      .form-field{width:100%;padding:11px 13px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:11px;color:#fff;font-size:14px;font-family:'DM Sans',sans-serif;transition:border-color .2s;outline:none;}
      .form-field:focus{border-color:rgba(160,106,255,.5);background:rgba(160,106,255,.05);}
      .form-field option{background:#181818;}
      .form-label{font-size:11px;font-weight:600;letter-spacing:.09em;text-transform:uppercase;color:#555;margin-bottom:5px;display:block;}
      .submit-btn{padding:12px 24px;background:linear-gradient(135deg,#a06aff,#ff3c64);border:none;border-radius:11px;color:#fff;font-weight:600;font-size:14px;cursor:pointer;transition:all .2s;}
      .submit-btn:hover{opacity:.86;transform:scale(1.02);}
      .admin-tab{cursor:pointer;padding:8px 15px;border-radius:11px;font-size:12px;font-weight:500;transition:all .2s;color:#555;border:1px solid transparent;white-space:nowrap;}
      .admin-tab:hover{color:#ccc;background:rgba(255,255,255,.04);}
      .admin-tab.active{background:rgba(160,106,255,.14);border-color:rgba(160,106,255,.3);color:#c084fc;}
      .kpi-card{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);border-radius:17px;padding:18px;transition:all .2s;}
      .kpi-card:hover{background:rgba(255,255,255,.06);}
      .inv-row{display:grid;grid-template-columns:48px 1fr auto auto auto auto;gap:14px;align-items:center;padding:12px 14px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);border-radius:13px;transition:all .2s;}
      .inv-row:hover{background:rgba(255,255,255,.05);}
      .status-sel{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:8px;color:#ccc;font-size:12px;padding:5px 9px;cursor:pointer;outline:none;font-family:'DM Sans',sans-serif;}
      .success-badge{background:rgba(0,212,150,.14);border:1px solid rgba(0,212,150,.28);color:#00d496;padding:9px 16px;border-radius:9px;font-size:13px;font-weight:500;display:inline-flex;align-items:center;gap:6px;}
      .admin-form-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
      @media(max-width:480px){.admin-form-grid{grid-template-columns:1fr!important;}}
      .bar-wrap{flex:1;display:flex;flex-direction:column;align-items:center;gap:5px;}
      .bar-fill{width:100%;background:linear-gradient(180deg,rgba(160,106,255,.75),rgba(255,60,100,.75));border-radius:6px 6px 0 0;transition:height .8s cubic-bezier(.4,0,.2,1);}
      .modal-backdrop{position:fixed;inset:0;z-index:300;background:rgba(0,0,0,.85);display:flex;align-items:center;justify-content:center;padding:20px;}
      .modal-box{background:#111;border:1px solid rgba(255,255,255,.1);border-radius:20px;padding:28px;width:100%;max-width:540px;max-height:90vh;overflow-y:auto;}
      @keyframes fadeUp{from{opacity:0;transform:translateY(18px);}to{opacity:1;transform:translateY(0);}}
      .fu{animation:fadeUp .45s ease forwards;}
    `}</style>
  );
}
