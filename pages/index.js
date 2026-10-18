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

const EXPENSE_CATEGORIES = ["Inventory Purchase","Shipping","Shop Investment","Packaging","Marketing","Rent","Salary","Utilities","Platform Fees","Other"];
const PRODUCT_TYPES = ["T-Shirts","Shirts","Trousers","Shorts","Inner Wear","Socks","Sweatshirts","Hoodies","Oversized Tees","Tops","Bottomwear","Winterwear","Basics","Boys Wear","Girls Wear"];
const fmt = n => "₹" + Number(n).toLocaleString("en-IN");
const MAX_IMAGES = 5;
const SIZE_OPTIONS = ["S","M","L","XL","XXL"];

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
  const [adminTab, setAdminTab] = useState("sales");
  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [orders, setOrders] = useState([]);
  const [heroImage, setHeroImage] = useState("");
  const [editingProduct, setEditingProduct] = useState(null);
  const [addSuccess, setAddSuccess] = useState(false);
  const [newProduct, setNewProduct] = useState({ name:"", type:"T-Shirts", gender:"MEN", sizes:["M"], fit:"Oversized", mrp:"", price:"", tag:"HOT DROP", images:[], stock:0 });

  // Sale capture state
  const [saleProduct, setSaleProduct] = useState(null);
  const [saleSize, setSaleSize] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [saleQty, setSaleQty] = useState(1);
  const [saleChannel, setSaleChannel] = useState("Store");
  const [saleShipping, setSaleShipping] = useState("");
  const [saleCustomer, setSaleCustomer] = useState("");
  const [salePhone, setSalePhone] = useState("");
  const [saleSuccess, setSaleSuccess] = useState(false);
  const [saleSearch, setSaleSearch] = useState("");
  const [saleTypeFilter, setSaleTypeFilter] = useState("All");
  const [saleGenderFilter, setSaleGenderFilter] = useState("All");

  // Expense state
  const [newExpense, setNewExpense] = useState({ category:"Inventory Purchase", description:"", amount:"", shipping:"", expense_date: new Date().toISOString().slice(0,10) });
  const [expenseSuccess, setExpenseSuccess] = useState(false);
  const [booksMonth, setBooksMonth] = useState(new Date().toISOString().slice(0,7));
  const [booksFrom, setBooksFrom] = useState(() => { const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().slice(0,10); });
  const [booksTo, setBooksTo] = useState(new Date().toISOString().slice(0,10));

  // Order filters
  const [orderSearch, setOrderSearch] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState("All");

  // Timeline collapsible
  const [timelineOpen, setTimelineOpen] = useState(false);

  // Withdrawal state (collapsible)
  const [withdrawalOpen, setWithdrawalOpen] = useState(false);
  const [newWithdrawal, setNewWithdrawal] = useState({ amount:"", description:"", date: new Date().toISOString().slice(0,10) });
  const [withdrawalSuccess, setWithdrawalSuccess] = useState(false);

  // Sale recording state
  const [saleRecording, setSaleRecording] = useState(false);
  const [saleError, setSaleError] = useState("");

  useEffect(() => {
    async function load() {
      const [{ data: prods }, { data: sls }, { data: exps }, { data: ords }, { data: hero }] = await Promise.all([
        supabase.from("products").select("*").order("created_at", { ascending: false }),
        supabase.from("sales").select("*").order("created_at", { ascending: false }),
        supabase.from("expenses").select("*").order("expense_date", { ascending: false }),
        supabase.from("orders").select("*").order("created_at", { ascending: false }),
        supabase.from("settings").select("value").eq("key","hero_image").maybeSingle(),
      ]);
      if (prods) setProducts(prods);
      if (sls) setSales(sls);
      if (exps) setExpenses(exps);
      if (ords) setOrders(ords);
      if (hero?.value) setHeroImage(hero.value);
    }
    load();
    const ch = supabase.channel("admin-realtime")
      .on("postgres_changes",{event:"*",schema:"public",table:"products"},load)
      .on("postgres_changes",{event:"*",schema:"public",table:"sales"},load)
      .on("postgres_changes",{event:"*",schema:"public",table:"expenses"},load)
      .on("postgres_changes",{event:"*",schema:"public",table:"orders"},load)
      .on("postgres_changes",{event:"*",schema:"public",table:"settings"},load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  /* ── Sale capture ── */
  function selectProductForSale(p) {
    setSaleProduct(p);
    setSaleSize("");
    setSalePrice(String(p.price));
    setSaleQty(1);
    setSaleChannel("Store");
    setSaleShipping("");
    setSaleCustomer("");
    setSalePhone("");
  }

  async function handleRecordSale(e) {
    e.preventDefault();
    setSaleError("");
    if (!saleProduct || !saleSize || !salePrice) {
      setSaleError(!saleSize ? "Please select a size" : "Missing required fields");
      return;
    }
    setSaleRecording(true);
    try {
      const total = (+salePrice) * saleQty;
      const { error } = await supabase.from("sales").insert([{
        product_id: saleProduct.id,
        product_name: saleProduct.name,
        product_image: saleProduct.image,
        size: saleSize,
        quantity: saleQty,
        unit_price: +salePrice,
        total_amount: total,
        channel: saleChannel,
        shipping_cost: +saleShipping || 0,
        customer_name: saleCustomer || null,
        customer_phone: salePhone || null,
      }]);
      if (error) { setSaleError("Sale failed: " + error.message); setSaleRecording(false); return; }

      // Also create an order entry
      const { error: orderErr } = await supabase.from("orders").insert([{
        customer: saleCustomer || "Walk-in",
        phone: salePhone || null,
        product: `${saleProduct.name} (${saleSize})`,
        gender: saleProduct.gender,
        qty: saleQty,
        amount: total,
        status: saleChannel === "Store" ? "Delivered" : "Pending",
      }]);
      if (orderErr) console.warn("Order entry failed:", orderErr.message);

      // Decrement stock_by_size
      const currentStock = saleProduct.stock_by_size || {};
      const newStockVal = Math.max(0, (currentStock[saleSize] || 0) - saleQty);
      await supabase.from("products").update({
        stock_by_size: { ...currentStock, [saleSize]: newStockVal },
        stock: Math.max(0, (saleProduct.stock || 0) - saleQty),
      }).eq("id", saleProduct.id);

      setSaleProduct(null);
      setSaleSize("");
      setSalePrice("");
      setSaleQty(1);
      setSaleChannel("Store");
      setSaleShipping("");
      setSaleCustomer("");
      setSalePhone("");
      setSaleSuccess(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
      setTimeout(() => setSaleSuccess(false), 4000);
    } catch (err) {
      setSaleError("Unexpected error: " + err.message);
    } finally {
      setSaleRecording(false);
    }
  }

  /* ── Products ── */
  async function handleAddProduct(e) {
    e.preventDefault();
    if (!newProduct.name||!newProduct.mrp||!newProduct.price) return;
    if (!newProduct.sizes.length) { alert("Pick at least one size."); return; }
    const imgs = newProduct.images.length ? newProduct.images : ["https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=600&q=80"];
    const stockPerSize = {};
    const perSizeStock = Math.floor((+newProduct.stock || 0) / newProduct.sizes.length);
    newProduct.sizes.forEach(s => { stockPerSize[s] = perSizeStock; });
    const { error } = await supabase.from("products").insert([{
      name:newProduct.name, type:newProduct.type, gender:newProduct.gender,
      size:newProduct.sizes[0], sizes:newProduct.sizes,
      fit:newProduct.fit,
      mrp:+newProduct.mrp, price:+newProduct.price, tag:newProduct.tag,
      image: imgs[0], images: imgs,
      stock:+newProduct.stock||0,
      stock_by_size: stockPerSize,
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
    const stockPerSize = editingProduct.stock_by_size || {};
    sizes.forEach(s => { if (stockPerSize[s] === undefined) stockPerSize[s] = 0; });
    const { error } = await supabase.from("products").update({
      name:editingProduct.name, type:editingProduct.type, gender:editingProduct.gender,
      size:sizes[0], sizes, fit:editingProduct.fit,
      mrp:+editingProduct.mrp, price:+editingProduct.price, tag:editingProduct.tag,
      image: imgs[0], images: imgs,
      stock:+editingProduct.stock||0,
      stock_by_size: stockPerSize,
    }).eq("id", editingProduct.id);
    if (error) { alert("Error: "+error.message); return; }
    setEditingProduct(null);
  }

  async function handleDeleteProduct(id) {
    if (!confirm("Delete this product permanently?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) return alert("Delete failed: " + error.message);
    setProducts(prev => prev.filter(p => p.id !== id));
  }

  /* ── Orders ── */
  async function updateOrderStatus(id, status) {
    const { error } = await supabase.from("orders").update({ status }).eq("id", id);
    if (error) return alert("Status update failed: " + error.message);
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
  }

  async function handleDeleteOrder(id) {
    try {
      if (!confirm("Delete this order? (ID: " + id + ")")) return;
      const res = await supabase.from("orders").delete().eq("id", id).select();
      if (res.error) return alert("Delete error: " + JSON.stringify(res.error));
      alert("Deleted " + (res.data?.length || 0) + " row(s) for ID " + id);
      setOrders(prev => prev.filter(o => o.id !== id));
    } catch (e) {
      alert("JS error: " + e.message);
    }
  }

  /* ── Expenses ── */
  async function handleAddExpense(e) {
    e.preventDefault();
    if (!newExpense.amount) return;
    const shippingAmt = newExpense.category === "Inventory Purchase" ? (+newExpense.shipping || 0) : 0;
    const rows = [{ category: newExpense.category, description: newExpense.description || null, amount: +newExpense.amount, expense_date: newExpense.expense_date }];
    if (shippingAmt > 0) {
      rows.push({ category: "Shipping", description: `Shipping for: ${newExpense.description || "Inventory Purchase"}`, amount: shippingAmt, expense_date: newExpense.expense_date });
    }
    const { error } = await supabase.from("expenses").insert(rows);
    if (error) { alert("Error: " + error.message); return; }
    setNewExpense({ category:"Inventory Purchase", description:"", amount:"", shipping:"", expense_date: new Date().toISOString().slice(0,10) });
    setExpenseSuccess(true); setTimeout(() => setExpenseSuccess(false), 2500);
  }

  async function handleDeleteExpense(id) {
    if (!confirm("Delete this expense?")) return;
    const { error } = await supabase.from("expenses").delete().eq("id", id);
    if (error) return alert("Delete failed: " + error.message);
    setExpenses(prev => prev.filter(e => e.id !== id));
  }

  async function handleDeleteSale(sale) {
    try {
    if (!confirm("Delete this sale? (ID: " + sale.id + ")")) return;
    // Restore stock
    if (sale.product_id) {
      const prod = products.find(p => p.id === sale.product_id);
      if (prod) {
        const sbs = { ...(prod.stock_by_size || {}) };
        if (sale.size && sbs[sale.size] !== undefined) sbs[sale.size] = (sbs[sale.size] || 0) + sale.quantity;
        await supabase.from("products").update({
          stock_by_size: sbs,
          stock: Math.max(0, (prod.stock || 0) + sale.quantity),
        }).eq("id", sale.product_id);
      }
    }
    // Remove matching auto-created order
    const orderProduct = `${sale.product_name} (${sale.size})`;
    const { data: matchingOrders } = await supabase.from("orders").select("id").eq("product", orderProduct).eq("qty", sale.quantity).limit(1);
    if (matchingOrders?.length) {
      await supabase.from("orders").delete().eq("id", matchingOrders[0].id);
      setOrders(prev => prev.filter(o => o.id !== matchingOrders[0].id));
    }
    const { error } = await supabase.from("sales").delete().eq("id", sale.id);
    if (error) return alert("Sale delete failed: " + error.message);
    alert("Sale " + sale.id + " deleted successfully");
    setSales(prev => prev.filter(s => s.id !== sale.id));
    } catch (e) { alert("JS error in sale delete: " + e.message); }
  }

  async function setHero(url) {
    setHeroImage(url);
    await supabase.from("settings").upsert({ key:"hero_image", value:url, updated_at:new Date().toISOString() });
  }

  /* ── Computed values ── */
  const today = new Date().toISOString().slice(0,10);
  const todaySales = sales.filter(s => s.created_at?.slice(0,10) === today);
  const todayRevenue = todaySales.reduce((s, r) => s + (+r.total_amount), 0);
  const todayItems = todaySales.reduce((s, r) => s + r.quantity, 0);

  const monthSales = sales.filter(s => s.created_at?.slice(0,7) === booksMonth);
  const monthRevenue = monthSales.reduce((s, r) => s + (+r.total_amount), 0);
  const monthShipping = monthSales.reduce((s, r) => s + (+r.shipping_cost || 0), 0);
  const monthExpenses = expenses.filter(e => e.expense_date?.slice(0,7) === booksMonth && e.category !== "Withdrawal");
  const monthExpenseTotal = monthExpenses.reduce((s, e) => s + (+e.amount), 0);
  const monthProfit = monthRevenue - monthExpenseTotal - monthShipping;

  const totalRevenue = sales.reduce((s, r) => s + (+r.total_amount), 0);
  const totalShipping = sales.reduce((s, r) => s + (+r.shipping_cost || 0), 0);
  const totalExpenseAll = expenses.filter(e => e.category !== "Withdrawal").reduce((s, e) => s + (+e.amount), 0);

  const saleTypeOptions = ["All", ...new Set(products.map(p => p.type).filter(Boolean))];
  const filteredProducts = products.filter(p => {
    if (saleGenderFilter !== "All" && p.gender !== saleGenderFilter) return false;
    if (saleTypeFilter !== "All" && p.type !== saleTypeFilter) return false;
    if (saleSearch && !p.name.toLowerCase().includes(saleSearch.toLowerCase())) return false;
    const totalStock = p.stock_by_size ? Object.values(p.stock_by_size).reduce((a,b)=>a+b,0) : (p.stock||0);
    if (totalStock <= 0) return false;
    return true;
  });

  // Orders filtered
  const filteredOrders = orders.filter(o => {
    if (orderStatusFilter !== "All" && o.status !== orderStatusFilter) return false;
    if (orderSearch) {
      const q = orderSearch.toLowerCase();
      if (!((o.customer||"").toLowerCase().includes(q) || (o.phone||"").includes(q) || (o.product||"").toLowerCase().includes(q))) return false;
    }
    return true;
  });

  // Timeline data for Books chart
  const timelineDays = (() => {
    const days = [];
    const from = new Date(booksFrom), to = new Date(booksTo);
    for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
      const key = d.toISOString().slice(0,10);
      const daySales = sales.filter(s => s.created_at?.slice(0,10) === key);
      const dayRev = daySales.reduce((s,r) => s + (+r.total_amount), 0);
      const dayShip = daySales.reduce((s,r) => s + (+r.shipping_cost || 0), 0);
      const dayExp = expenses.filter(e => e.expense_date === key && e.category !== "Withdrawal").reduce((s,e) => s + (+e.amount), 0);
      days.push({ date: key, label: `${d.getDate()}/${d.getMonth()+1}`, revenue: dayRev, shipping: dayShip, expenses: dayExp, profit: dayRev - dayExp - dayShip });
    }
    return days;
  })();
  const timelineMax = Math.max(...timelineDays.map(d => Math.max(d.revenue, d.expenses)), 1);
  const timelineRangeRev = timelineDays.reduce((s,d) => s + d.revenue, 0);
  const timelineRangeExp = timelineDays.reduce((s,d) => s + d.expenses, 0);
  const timelineRangeShip = timelineDays.reduce((s,d) => s + d.shipping, 0);
  const timelineRangeProfit = timelineRangeRev - timelineRangeExp - timelineRangeShip;

  const tabs = [["sales","Sales"],["products","Products"],["inventory","Inventory"],["books","Books"],["orders","Orders"]];

  return (
    <div style={{ background:"#080808", minHeight:"100vh", color:"#fff", fontFamily:"'DM Sans',sans-serif" }}>
      {/* Nav */}
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

        {/* ═══════════ SALES TAB (HOME) ═══════════ */}
        {adminTab==="sales" && (
          <div className="fu">
            {saleSuccess && (
              <div style={{ padding:"16px 20px", background:"rgba(0,212,150,.12)", border:"2px solid rgba(0,212,150,.35)", borderRadius:14, marginBottom:20, display:"flex", alignItems:"center", gap:12, animation:"fadeUp .3s ease" }}>
                <div style={{ width:36, height:36, borderRadius:"50%", background:"rgba(0,212,150,.2)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}>✓</div>
                <div>
                  <div style={{ fontSize:15, fontWeight:700, color:"#00d496" }}>Sale Recorded Successfully!</div>
                  <div style={{ fontSize:12, color:"#888", marginTop:2 }}>Stock updated. Order created.</div>
                </div>
              </div>
            )}
            {/* KPI row */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))", gap:12, marginBottom:24 }}>
              {[
                { label:"Today's Revenue", value:fmt(todayRevenue), color:"#a06aff" },
                { label:"Items Sold Today", value:todayItems, color:"#ff3c64" },
                { label:"Total Revenue", value:fmt(totalRevenue), color:"#00d496" },
                { label:"Total Sales", value:sales.length, color:"#ffb400" },
              ].map(k => (
                <div key={k.label} className="kpi-card">
                  <div style={{ fontSize:10, color:"#444", textTransform:"uppercase", letterSpacing:".1em", marginBottom:7 }}>{k.label}</div>
                  <div style={{ fontFamily:"Bebas Neue", fontSize:30, color:k.color, lineHeight:1 }}>{k.value}</div>
                </div>
              ))}
            </div>

            {!saleProduct ? (
              <>
                {/* Product search */}
                <div style={{ fontFamily:"Bebas Neue", fontSize:22, color:"#fff", marginBottom:4 }}>QUICK SALE</div>
                <div style={{ fontSize:12, color:"#555", marginBottom:12 }}>Tap a product to record a sale</div>

                {/* Filters: gender dropdown + category tabs + search */}
                <div style={{ display:"flex", gap:10, alignItems:"flex-end", flexWrap:"wrap", marginBottom:14 }}>
                  <div>
                    <label style={{ fontSize:9, color:"#555", textTransform:"uppercase", letterSpacing:".1em", marginBottom:5, display:"block" }}>Gender</label>
                    <select className="form-field" value={saleGenderFilter} onChange={e=>{setSaleGenderFilter(e.target.value);setSaleTypeFilter("All");}} style={{ fontSize:12, padding:"9px 14px", minWidth:140 }}>
                      {["All","MEN","WOMEN","KIDS","UNISEX"].map(g => (
                        <option key={g} value={g}>{g === "All" ? "All Genders" : g.charAt(0) + g.slice(1).toLowerCase()}</option>
                      ))}
                    </select>
                  </div>
                  <input className="form-field" type="text" placeholder="Search by name…" value={saleSearch} onChange={e=>setSaleSearch(e.target.value)} style={{ fontSize:12, padding:"9px 14px", maxWidth:220 }} />
                  <div style={{ fontSize:10, color:"#444", paddingBottom:4 }}>{filteredProducts.length} product{filteredProducts.length !== 1 ? "s" : ""}</div>
                </div>

                {/* Category tabs */}
                <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:16 }}>
                  {saleTypeOptions.map(t => (
                    <button key={t} type="button" onClick={()=>setSaleTypeFilter(t)} style={{
                      padding:"7px 14px", borderRadius:9, cursor:"pointer", fontWeight:600, fontSize:11, letterSpacing:".03em",
                      background: saleTypeFilter===t ? "linear-gradient(135deg,#a06aff,#ff3c64)" : "rgba(255,255,255,.04)",
                      border: saleTypeFilter===t ? "1px solid transparent" : "1px solid rgba(255,255,255,.08)",
                      color: saleTypeFilter===t ? "#fff" : "#666", whiteSpace:"nowrap", transition:"all .15s",
                    }}>{t}{t !== "All" ? ` (${products.filter(p=> (saleGenderFilter==="All" || p.gender===saleGenderFilter) && p.type===t).length})` : ""}</button>
                  ))}
                </div>

                {/* Product grid */}
                    <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(130px,1fr))", gap:10, marginBottom:32 }}>
                      {filteredProducts.map(p => {
                        const totalStock = p.stock_by_size ? Object.values(p.stock_by_size).reduce((a,b)=>a+b,0) : (p.stock||0);
                        return (
                          <div key={p.id} onClick={()=>selectProductForSale(p)} style={{
                            cursor:"pointer", borderRadius:14, overflow:"hidden",
                            background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.07)",
                            transition:"all .2s",
                          }} className="sale-card">
                            <div style={{ aspectRatio:"1/1", overflow:"hidden", position:"relative" }}>
                              <img src={p.image} alt={p.name} style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }} onError={e=>{e.target.style.background="#222";}} />
                              {totalStock <= 3 && <div style={{ position:"absolute", top:6, right:6, background:"rgba(255,60,100,.9)", color:"#fff", fontSize:8, fontWeight:700, padding:"2px 6px", borderRadius:4 }}>LOW</div>}
                            </div>
                            <div style={{ padding:"10px 10px 12px" }}>
                              <div style={{ fontSize:12, fontWeight:600, color:"#fff", lineHeight:1.3, marginBottom:4, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.name}</div>
                              <div style={{ fontSize:10, color:"#555", marginBottom:4 }}>{p.type} · {(p.sizes||[]).join("/")}</div>
                              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                                <div style={{ fontSize:14, fontWeight:700, color:"#a06aff" }}>{fmt(p.price)}</div>
                                <div style={{ fontSize:10, color: totalStock <= 3 ? "#ff3c64" : "#555" }}>{totalStock} left</div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      {filteredProducts.length === 0 && (
                        <div style={{ gridColumn:"1/-1", textAlign:"center", padding:"40px 20px", color:"#444", fontSize:13 }}>No products match these filters.</div>
                      )}
                    </div>
              </>
            ) : (
              /* ── Sale capture panel ── */
              <div style={{ maxWidth:480 }}>
                <button onClick={()=>setSaleProduct(null)} style={{ background:"none", border:"none", color:"#777", fontSize:13, cursor:"pointer", marginBottom:16, padding:0 }}>← Back to products</button>
                <div style={{ padding:24, background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.08)", borderRadius:18 }}>
                  <div style={{ display:"flex", gap:14, marginBottom:20 }}>
                    <img src={saleProduct.image} alt={saleProduct.name} style={{ width:80, height:80, objectFit:"cover", borderRadius:12, border:"1px solid rgba(255,255,255,.1)" }} />
                    <div>
                      <div style={{ fontSize:16, fontWeight:600, color:"#fff", marginBottom:4 }}>{saleProduct.name}</div>
                      <div style={{ fontSize:11, color:"#555" }}>{saleProduct.type} · {saleProduct.gender} · {saleProduct.fit}</div>
                      <div style={{ fontSize:13, color:"#a06aff", fontWeight:600, marginTop:4 }}>MRP {fmt(saleProduct.mrp)} → {fmt(saleProduct.price)}</div>
                    </div>
                  </div>

                  <form onSubmit={handleRecordSale}>
                    {/* Size */}
                    <label className="form-label" style={{ marginBottom:8, display:"block" }}>Size</label>
                    <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:16 }}>
                      {(saleProduct.sizes || [saleProduct.size]).map(s => {
                        const sbs = saleProduct.stock_by_size || {};
                        const stockForSize = sbs[s] !== undefined ? sbs[s] : (saleProduct.stock || 0);
                        const on = saleSize === s;
                        return (
                          <button key={s} type="button" onClick={()=>setSaleSize(s)} style={{
                            minWidth:52, padding:"10px 14px", borderRadius:10, cursor:"pointer", fontWeight:700, fontSize:13,
                            background: on ? "linear-gradient(135deg,#a06aff,#ff3c64)" : "rgba(255,255,255,.04)",
                            border: on ? "1px solid transparent" : "1px solid rgba(255,255,255,.1)",
                            color: on ? "#fff" : "#888", position:"relative",
                          }}>
                            {s}
                            <span style={{ display:"block", fontSize:9, fontWeight:400, opacity:0.7, marginTop:2 }}>{stockForSize} left</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Price (editable) */}
                    <div className="admin-form-grid" style={{ marginBottom:14 }}>
                      <div>
                        <label className="form-label">Selling Price (₹)</label>
                        <input className="form-field" type="number" value={salePrice} onChange={e=>setSalePrice(e.target.value)} />
                      </div>
                      <div>
                        <label className="form-label">Quantity</label>
                        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                          <button type="button" onClick={()=>setSaleQty(q=>Math.max(1,q-1))} style={{ width:36, height:36, borderRadius:8, background:"rgba(255,255,255,.06)", border:"1px solid rgba(255,255,255,.1)", color:"#fff", fontSize:18, cursor:"pointer" }}>−</button>
                          <div style={{ fontFamily:"Bebas Neue", fontSize:24, color:"#fff", minWidth:30, textAlign:"center" }}>{saleQty}</div>
                          <button type="button" onClick={()=>setSaleQty(q=>q+1)} style={{ width:36, height:36, borderRadius:8, background:"rgba(255,255,255,.06)", border:"1px solid rgba(255,255,255,.1)", color:"#fff", fontSize:18, cursor:"pointer" }}>+</button>
                        </div>
                      </div>
                    </div>

                    {/* Channel */}
                    <label className="form-label" style={{ marginBottom:8, display:"block" }}>Channel</label>
                    <div style={{ display:"flex", gap:8, marginBottom:14 }}>
                      {["Store","Online"].map(ch => (
                        <button key={ch} type="button" onClick={()=>{setSaleChannel(ch);if(ch==="Store")setSaleShipping("");}} style={{
                          padding:"10px 20px", borderRadius:10, cursor:"pointer", fontWeight:600, fontSize:13,
                          background: saleChannel===ch ? "linear-gradient(135deg,#a06aff,#ff3c64)" : "rgba(255,255,255,.04)",
                          border: saleChannel===ch ? "1px solid transparent" : "1px solid rgba(255,255,255,.1)",
                          color: saleChannel===ch ? "#fff" : "#888",
                        }}>{ch === "Store" ? "🏪 Store" : "📱 Online"}</button>
                      ))}
                    </div>

                    {/* Shipping Cost (Online sales only) */}
                    {saleChannel === "Online" && (
                      <div style={{ marginBottom:14 }}>
                        <label className="form-label">Shipping Cost (₹)</label>
                        <input className="form-field" type="number" placeholder="0" value={saleShipping} onChange={e=>setSaleShipping(e.target.value)} />
                      </div>
                    )}

                    {/* Customer details (optional) */}
                    <div className="admin-form-grid" style={{ marginBottom:18 }}>
                      <div>
                        <label className="form-label">Customer Name <span style={{ color:"#555", fontWeight:400, textTransform:"none" }}>(optional)</span></label>
                        <input className="form-field" type="text" placeholder="Walk-in / Customer name" value={saleCustomer} onChange={e=>setSaleCustomer(e.target.value)} />
                      </div>
                      <div>
                        <label className="form-label">Phone <span style={{ color:"#555", fontWeight:400, textTransform:"none" }}>(optional)</span></label>
                        <input className="form-field" type="tel" placeholder="9876543210" value={salePhone} onChange={e=>setSalePhone(e.target.value)} />
                      </div>
                    </div>

                    {/* Total */}
                    <div style={{ padding:"14px 16px", background:"rgba(160,106,255,.08)", border:"1px solid rgba(160,106,255,.2)", borderRadius:12, marginBottom:18 }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                        <div style={{ fontSize:12, color:"#888", fontWeight:600, textTransform:"uppercase", letterSpacing:".08em" }}>Total</div>
                        <div style={{ fontFamily:"Bebas Neue", fontSize:32, color:"#a06aff" }}>{fmt((+salePrice||0) * saleQty + (+saleShipping||0))}</div>
                      </div>
                      {(+saleShipping||0) > 0 && (
                        <div style={{ display:"flex", justifyContent:"space-between", marginTop:6, fontSize:11, color:"#666" }}>
                          <span>Product: {fmt((+salePrice||0) * saleQty)}</span>
                          <span>Shipping: {fmt(+saleShipping)}</span>
                        </div>
                      )}
                    </div>

                    {saleError && (
                      <div style={{ padding:"10px 14px", background:"rgba(255,60,100,.1)", border:"1px solid rgba(255,60,100,.25)", borderRadius:10, marginBottom:12, fontSize:12, color:"#ff3c64", fontWeight:500 }}>{saleError}</div>
                    )}
                    <button type="submit" className="submit-btn" style={{ width:"100%", opacity: saleRecording ? 0.6 : 1 }} disabled={!saleSize || saleRecording}>
                      {saleRecording ? "Recording…" : saleSize ? "Record Sale →" : "Pick a size first"}
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* Today's sales feed */}
            {!saleProduct && todaySales.length > 0 && (
              <div>
                <div style={{ fontFamily:"Bebas Neue", fontSize:18, color:"#fff", marginBottom:12 }}>TODAY'S SALES</div>
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  {todaySales.map(s => {
                    const orderProduct = `${s.product_name} (${s.size})`;
                    const matchedOrder = orders.find(o => o.product === orderProduct && +o.amount === +s.total_amount);
                    return (
                      <div key={s.id} style={{ padding:"12px 14px", background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.06)", borderRadius:12 }}>
                        <div style={{ display:"grid", gridTemplateColumns:"40px 1fr auto auto auto", gap:12, alignItems:"center" }}>
                          <img src={s.product_image} alt="" style={{ width:40, height:40, objectFit:"cover", borderRadius:8 }} onError={e=>{e.target.style.display="none";}} />
                          <div>
                            <div style={{ fontSize:13, fontWeight:500, color:"#fff" }}>{s.product_name}{s.customer_name ? ` — ${s.customer_name}` : ""}</div>
                            <div style={{ fontSize:10, color:"#555" }}>Size {s.size} · Qty {s.quantity} · {s.channel}{s.shipping_cost > 0 ? ` · Ship ${fmt(s.shipping_cost)}` : ""}{s.customer_phone ? ` · ${s.customer_phone}` : ""}</div>
                          </div>
                          <div style={{ fontSize:9, padding:"3px 8px", borderRadius:6, fontWeight:600, background: s.channel==="Store" ? "rgba(160,106,255,.12)" : "rgba(0,212,150,.12)", color: s.channel==="Store" ? "#a06aff" : "#00d496" }}>{s.channel}</div>
                          <div style={{ fontFamily:"Bebas Neue", fontSize:18, color:"#a06aff" }}>{fmt(s.total_amount)}</div>
                          <button onClick={()=>handleDeleteSale(s)} style={{ padding:"4px 8px", background:"rgba(255,60,100,.1)", border:"1px solid rgba(255,60,100,.2)", borderRadius:6, color:"#ff3c64", fontSize:10, cursor:"pointer" }}>✕</button>
                        </div>
                        {matchedOrder && (
                          <div style={{ marginTop:8, paddingTop:8, borderTop:"1px solid rgba(255,255,255,.05)", display:"flex", alignItems:"center", gap:10 }}>
                            <span style={{ fontSize:10, color:"#555", letterSpacing:".08em", textTransform:"uppercase" }}>Status</span>
                            <select className="status-sel" value={matchedOrder.status} onChange={e=>updateOrderStatus(matchedOrder.id,e.target.value)} style={{ background:STATUS_COLORS[matchedOrder.status]?.bg, color:STATUS_COLORS[matchedOrder.status]?.color, borderColor:`${STATUS_COLORS[matchedOrder.status]?.color}44` }}>
                              {["Pending","Packed","Shipped","Delivered","Cancelled"].map(st=><option key={st} style={{background:"#1a1a1a",color:"#ccc"}}>{st}</option>)}
                            </select>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

          </div>
        )}

        {/* ═══════════ PRODUCTS TAB ═══════════ */}
        {adminTab==="products" && (
          <div className="fu" style={{ maxWidth:580 }}>
            <div style={{ fontFamily:"Bebas Neue", fontSize:26, color:"#fff", marginBottom:22 }}>ADD PRODUCT</div>
            <div style={{ padding:26, background:"rgba(255,255,255,.02)", border:"1px solid rgba(255,255,255,.07)", borderRadius:19 }}>
              <MultiImageInput images={newProduct.images} onChange={imgs=>setNewProduct(p=>({...p,images:imgs}))} />
              <form onSubmit={handleAddProduct}>
                <div style={{ display:"grid", gap:14 }}>
                  <div><label className="form-label">Product Name</label><input className="form-field" type="text" placeholder="e.g. Oversized Acid Wash Tee" value={newProduct.name} onChange={e=>setNewProduct(p=>({...p,name:e.target.value}))} /></div>
                  <div className="admin-form-grid">
                    {[
                      {label:"Product Type",key:"type",opts:PRODUCT_TYPES},
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
                    <div><label className="form-label">Total Stock</label><input className="form-field" type="number" placeholder="20" value={newProduct.stock} onChange={e=>setNewProduct(p=>({...p,stock:e.target.value}))} /></div>
                  </div>
                  <div style={{ display:"flex", gap:12, alignItems:"center", flexWrap:"wrap" }}>
                    <button type="submit" className="submit-btn">Add to Storefront →</button>
                    {addSuccess && <div className="success-badge">✓ Saved to database!</div>}
                  </div>
                </div>
              </form>
            </div>

            {/* Hero image */}
            <div style={{ marginTop:28, padding:22, background:"rgba(255,255,255,.02)", border:"1px solid rgba(255,255,255,.07)", borderRadius:17 }}>
              <div style={{ fontFamily:"Bebas Neue", fontSize:18, color:"#a06aff", marginBottom:16 }}>HERO IMAGE</div>
              <ImageInput image={heroImage} onSet={setHero} onClear={()=>setHero("")} label="Homepage Hero Image" />
            </div>
          </div>
        )}

        {/* ═══════════ INVENTORY TAB ═══════════ */}
        {adminTab==="inventory" && (
          <div className="fu">
            <div style={{ fontFamily:"Bebas Neue", fontSize:26, color:"#fff", marginBottom:6 }}>INVENTORY</div>
            <div style={{ fontSize:12, color:"#444", marginBottom:20 }}>{products.length} products · live</div>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {products.map(p => {
                const sbs = p.stock_by_size || {};
                const totalStock = Object.keys(sbs).length ? Object.values(sbs).reduce((a,b)=>a+b,0) : (p.stock||0);
                return (
                  <div key={p.id} className="inv-row">
                    <img src={p.image} alt={p.name} style={{ width:48, height:48, objectFit:"cover", borderRadius:8, border:"1px solid rgba(255,255,255,.1)", flexShrink:0 }} onError={e=>{e.target.style.display="none";}} />
                    <div>
                      <div style={{ fontSize:13, fontWeight:500, color:"#fff" }}>{p.name}</div>
                      <div style={{ fontSize:10, color:"#444", marginTop:2 }}>{p.type} · {p.gender} · {p.tag}</div>
                      {/* Per-size stock */}
                      <div style={{ display:"flex", gap:6, marginTop:6, flexWrap:"wrap" }}>
                        {(p.sizes || []).map(s => {
                          const count = sbs[s] !== undefined ? sbs[s] : "?";
                          const low = typeof count === "number" && count <= 3;
                          return (
                            <span key={s} style={{ fontSize:10, padding:"2px 7px", borderRadius:5, background: low ? "rgba(255,60,100,.12)" : "rgba(255,255,255,.05)", border: `1px solid ${low ? "rgba(255,60,100,.3)" : "rgba(255,255,255,.08)"}`, color: low ? "#ff3c64" : "#888" }}>
                              {s}: {count}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                    <div style={{ textAlign:"right" }}>
                      <div style={{ fontSize:15, fontWeight:600, color: totalStock <= 5 ? "#ff3c64" : "#fff" }}>{totalStock}</div>
                      <div style={{ fontSize:9, color:"#444" }}>total</div>
                    </div>
                    <div style={{ textAlign:"right" }}><div style={{ fontSize:14, fontWeight:600, color:"#a06aff" }}>{fmt(p.price)}</div><div style={{ fontSize:9, color:"#444" }}>{fmt(p.mrp)} MRP</div></div>
                    <button onClick={()=>setEditingProduct({...p, images: p.images?.length ? p.images : [p.image], sizes: (p.sizes && p.sizes.length) ? p.sizes : (p.size ? [p.size] : []), stock_by_size: p.stock_by_size || {}})} style={{ padding:"5px 12px", background:"rgba(160,106,255,.14)", border:"1px solid rgba(160,106,255,.3)", borderRadius:8, color:"#c084fc", fontSize:11, fontWeight:600, cursor:"pointer" }}>Edit</button>
                    <button onClick={()=>handleDeleteProduct(p.id)} style={{ padding:"5px 12px", background:"rgba(255,60,100,.12)", border:"1px solid rgba(255,60,100,.3)", borderRadius:8, color:"#ff3c64", fontSize:11, fontWeight:600, cursor:"pointer" }}>Delete</button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ═══════════ BOOKS TAB ═══════════ */}
        {adminTab==="books" && (
          <div className="fu">
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:22, flexWrap:"wrap", gap:12 }}>
              <div style={{ fontFamily:"Bebas Neue", fontSize:26, color:"#fff" }}>BOOKS</div>
              <input type="month" value={booksMonth} onChange={e=>setBooksMonth(e.target.value)} style={{ padding:"8px 12px", background:"rgba(255,255,255,.05)", border:"1px solid rgba(255,255,255,.1)", borderRadius:10, color:"#fff", fontSize:13, fontFamily:"'DM Sans',sans-serif" }} />
            </div>

            {/* P&L Summary */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))", gap:12, marginBottom:24 }}>
              {[
                { label:"Revenue", value:fmt(monthRevenue), color:"#00d496" },
                { label:"Shipping", value:fmt(monthShipping), color:"#00b4ff" },
                { label:"Expenses", value:fmt(monthExpenseTotal), color:"#ff3c64" },
                { label:"Net Profit", value:fmt(monthProfit), color: monthProfit >= 0 ? "#00d496" : "#ff3c64" },
                { label:"All-Time Profit", value:fmt(totalRevenue - totalExpenseAll - totalShipping), color:"#a06aff" },
                { label:"Total Withdrawn", value:fmt(expenses.filter(e=>e.category==="Withdrawal").reduce((s,e)=>s+(+e.amount),0)), color:"#ffb400" },
              ].map(k => (
                <div key={k.label} className="kpi-card">
                  <div style={{ fontSize:10, color:"#444", textTransform:"uppercase", letterSpacing:".1em", marginBottom:7 }}>{k.label}</div>
                  <div style={{ fontFamily:"Bebas Neue", fontSize:30, color:k.color, lineHeight:1 }}>{k.value}</div>
                </div>
              ))}
            </div>

            {/* Performance Timeline (collapsible) */}
            <div style={{ padding:"16px 22px", background:"rgba(255,255,255,.02)", border:"1px solid rgba(255,255,255,.07)", borderRadius:18, marginBottom:24, cursor:"pointer" }} onClick={()=>setTimelineOpen(o=>!o)}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div style={{ fontFamily:"Bebas Neue", fontSize:18, color:"#fff", display:"flex", alignItems:"center", gap:10 }}>
                  <span style={{ fontSize:14, transition:"transform .2s", transform: timelineOpen ? "rotate(90deg)" : "rotate(0deg)", display:"inline-block" }}>▶</span>
                  PERFORMANCE TIMELINE
                </div>
                <div style={{ fontSize:11, color:"#555" }}>{timelineOpen ? "Click to collapse" : "Click to expand"}</div>
              </div>
            </div>
            {timelineOpen && (
            <div style={{ padding:22, background:"rgba(255,255,255,.02)", border:"1px solid rgba(255,255,255,.07)", borderRadius:18, marginBottom:24, marginTop:-20 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18, flexWrap:"wrap", gap:12 }}>
                <div style={{ fontFamily:"Bebas Neue", fontSize:16, color:"#888" }}>DATE RANGE</div>
                <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }} onClick={e=>e.stopPropagation()}>
                  <label style={{ fontSize:10, color:"#555", letterSpacing:".08em" }}>FROM</label>
                  <input type="date" value={booksFrom} onChange={e=>setBooksFrom(e.target.value)} style={{ padding:"6px 10px", background:"rgba(255,255,255,.05)", border:"1px solid rgba(255,255,255,.1)", borderRadius:8, color:"#fff", fontSize:12, fontFamily:"'DM Sans',sans-serif" }} />
                  <label style={{ fontSize:10, color:"#555", letterSpacing:".08em" }}>TO</label>
                  <input type="date" value={booksTo} onChange={e=>setBooksTo(e.target.value)} style={{ padding:"6px 10px", background:"rgba(255,255,255,.05)", border:"1px solid rgba(255,255,255,.1)", borderRadius:8, color:"#fff", fontSize:12, fontFamily:"'DM Sans',sans-serif" }} />
                </div>
              </div>
              {/* Range KPIs */}
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))", gap:10, marginBottom:18 }}>
                {[
                  { label:"Revenue", value:fmt(timelineRangeRev), color:"#00d496" },
                  { label:"Expenses", value:fmt(timelineRangeExp), color:"#ff3c64" },
                  { label:"Shipping", value:fmt(timelineRangeShip), color:"#00b4ff" },
                  { label:"Profit", value:fmt(timelineRangeProfit), color: timelineRangeProfit >= 0 ? "#00d496" : "#ff3c64" },
                ].map(k => (
                  <div key={k.label} style={{ padding:"10px 12px", background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.06)", borderRadius:10 }}>
                    <div style={{ fontSize:9, color:"#555", textTransform:"uppercase", letterSpacing:".08em", marginBottom:4 }}>{k.label}</div>
                    <div style={{ fontFamily:"Bebas Neue", fontSize:20, color:k.color, lineHeight:1 }}>{k.value}</div>
                  </div>
                ))}
              </div>
              {/* Legend */}
              <div style={{ display:"flex", gap:16, marginBottom:14, fontSize:10 }}>
                <span style={{ display:"flex", alignItems:"center", gap:5 }}><span style={{ width:10, height:10, borderRadius:3, background:"#00d496" }} /> Revenue</span>
                <span style={{ display:"flex", alignItems:"center", gap:5 }}><span style={{ width:10, height:10, borderRadius:3, background:"#ff3c64" }} /> Expenses</span>
                <span style={{ display:"flex", alignItems:"center", gap:5 }}><span style={{ width:10, height:10, borderRadius:3, background:"rgba(160,106,255,.6)" }} /> Profit</span>
              </div>
              {/* Chart */}
              <div style={{ overflowX:"auto", paddingBottom:8 }}>
                <div style={{ display:"flex", alignItems:"flex-end", gap:2, minWidth: timelineDays.length * 32, height:180 }}>
                  {timelineDays.map((d, i) => {
                    const revH = timelineMax ? (d.revenue / timelineMax) * 150 : 0;
                    const expH = timelineMax ? (d.expenses / timelineMax) * 150 : 0;
                    const profH = timelineMax ? (Math.abs(d.profit) / timelineMax) * 150 : 0;
                    return (
                      <div key={d.date} style={{ flex:1, minWidth:28, display:"flex", flexDirection:"column", alignItems:"center", gap:2 }} title={`${d.date}\nRev: ${fmt(d.revenue)}\nExp: ${fmt(d.expenses)}\nProfit: ${fmt(d.profit)}`}>
                        <div style={{ display:"flex", gap:1, alignItems:"flex-end", height:150 }}>
                          <div style={{ width:7, height:Math.max(revH, 1), background:"#00d496", borderRadius:"3px 3px 0 0", transition:"height .3s" }} />
                          <div style={{ width:7, height:Math.max(expH, 1), background:"#ff3c64", borderRadius:"3px 3px 0 0", transition:"height .3s" }} />
                          <div style={{ width:7, height:Math.max(profH, 1), background: d.profit >= 0 ? "rgba(160,106,255,.6)" : "rgba(255,60,100,.4)", borderRadius:"3px 3px 0 0", transition:"height .3s" }} />
                        </div>
                        <div style={{ fontSize:8, color:"#444", whiteSpace:"nowrap", transform: timelineDays.length > 15 && i % 2 !== 0 ? "scale(0)" : "none" }}>{d.label}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
              {timelineDays.length === 0 && <div style={{ fontSize:13, color:"#444", textAlign:"center", padding:20 }}>No data for this range.</div>}
            </div>
            )}

            {/* Withdrawal — collapsible (same style as Performance Timeline) */}
            <div style={{ padding:"16px 22px", background:"rgba(255,255,255,.02)", border:"1px solid rgba(255,255,255,.07)", borderRadius:18, marginBottom:24, cursor:"pointer" }} onClick={()=>setWithdrawalOpen(o=>!o)}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div style={{ fontFamily:"Bebas Neue", fontSize:18, color:"#ffb400", display:"flex", alignItems:"center", gap:10 }}>
                  <span style={{ fontSize:14, transition:"transform .2s", transform: withdrawalOpen ? "rotate(90deg)" : "rotate(0deg)", display:"inline-block" }}>▶</span>
                  WITHDRAWALS
                </div>
                <div style={{ fontSize:11, color:"#555" }}>{withdrawalOpen ? "Click to collapse" : "Click to expand"}</div>
              </div>
            </div>
            {withdrawalOpen && (<>
              <div style={{ padding:22, background:"rgba(255,255,255,.02)", border:"1px solid rgba(255,255,255,.07)", borderRadius:18, marginBottom:24, marginTop:-20 }}>
              <form onSubmit={async (e) => {
                e.preventDefault();
                if (!newWithdrawal.amount) return;
                const totalAmt = +newWithdrawal.amount;
                const { error } = await supabase.from("expenses").insert([{
                  category: "Withdrawal",
                  description: newWithdrawal.description || "Owner withdrawal",
                  amount: totalAmt,
                  expense_date: newWithdrawal.date,
                }]);
                if (error) { alert("Error: " + error.message); return; }
                setNewWithdrawal({ amount:"", description:"", date: new Date().toISOString().slice(0,10) });
                setWithdrawalSuccess(true); setTimeout(()=>setWithdrawalSuccess(false), 2500);
              }}>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))", gap:12, marginBottom:14 }}>
                  <div><label className="form-label">Amount (₹)</label><input className="form-field" type="number" placeholder="5000" value={newWithdrawal.amount} onChange={e=>setNewWithdrawal(x=>({...x,amount:e.target.value}))} /></div>
                  <div><label className="form-label">Date</label><input className="form-field" type="date" value={newWithdrawal.date} onChange={e=>setNewWithdrawal(x=>({...x,date:e.target.value}))} /></div>
                  <div><label className="form-label">Note</label><input className="form-field" type="text" placeholder="Personal use, reinvestment…" value={newWithdrawal.description} onChange={e=>setNewWithdrawal(x=>({...x,description:e.target.value}))} /></div>
                </div>
                <div style={{ display:"flex", gap:12, alignItems:"center", flexWrap:"wrap" }}>
                  <button type="submit" className="submit-btn" style={{ background:"linear-gradient(135deg,#ffb400,#ff8c00)" }}>Record Withdrawal →</button>
                  {withdrawalSuccess && <div className="success-badge">✓ Withdrawal recorded!</div>}
                </div>
              </form>
              {(() => {
                const monthWithdrawals = expenses.filter(e => e.category === "Withdrawal" && e.expense_date?.slice(0,7) === booksMonth);
                const totalWithdrawn = monthWithdrawals.reduce((s,e) => s + (+e.amount), 0);
                const allTimeWithdrawn = expenses.filter(e => e.category === "Withdrawal").reduce((s,e) => s + (+e.amount), 0);
                return (
                  <>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginTop:18, marginBottom:14 }}>
                      <div style={{ padding:"12px 14px", background:"rgba(255,180,0,.06)", border:"1px solid rgba(255,180,0,.15)", borderRadius:12 }}>
                        <div style={{ fontSize:9, color:"#666", textTransform:"uppercase", letterSpacing:".08em", marginBottom:4 }}>This Month</div>
                        <div style={{ fontFamily:"Bebas Neue", fontSize:22, color:"#ffb400" }}>{fmt(totalWithdrawn)}</div>
                      </div>
                      <div style={{ padding:"12px 14px", background:"rgba(255,180,0,.06)", border:"1px solid rgba(255,180,0,.15)", borderRadius:12 }}>
                        <div style={{ fontSize:9, color:"#666", textTransform:"uppercase", letterSpacing:".08em", marginBottom:4 }}>All Time</div>
                        <div style={{ fontFamily:"Bebas Neue", fontSize:22, color:"#ffb400" }}>{fmt(allTimeWithdrawn)}</div>
                      </div>
                    </div>
                    {monthWithdrawals.length > 0 && (
                      <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                        {monthWithdrawals.map(w => (
                          <div key={w.id} style={{ display:"grid", gridTemplateColumns:"1fr auto auto", gap:12, alignItems:"center", padding:"10px 14px", background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.06)", borderRadius:10 }}>
                            <div>
                              <div style={{ fontSize:12, fontWeight:500, color:"#fff" }}>{w.description || "Withdrawal"}</div>
                              <div style={{ fontSize:10, color:"#555" }}>{w.expense_date}</div>
                            </div>
                            <div style={{ fontFamily:"Bebas Neue", fontSize:18, color:"#ffb400" }}>{fmt(w.amount)}</div>
                            <button onClick={async ()=>{ if(!confirm("Delete this withdrawal?")) return; const{error}=await supabase.from("expenses").delete().eq("id",w.id); if(error) return alert("Delete failed: "+error.message); setExpenses(prev=>prev.filter(e=>e.id!==w.id)); }} style={{ padding:"4px 8px", background:"rgba(255,180,0,.1)", border:"1px solid rgba(255,180,0,.2)", borderRadius:6, color:"#ffb400", fontSize:10, cursor:"pointer" }}>✕</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
            </>)}

            {/* Add Expense */}
            <div style={{ padding:22, background:"rgba(255,255,255,.02)", border:"1px solid rgba(255,255,255,.07)", borderRadius:18, marginBottom:24 }}>
              <div style={{ fontFamily:"Bebas Neue", fontSize:18, color:"#ff3c64", marginBottom:16 }}>ADD EXPENSE</div>
              <form onSubmit={handleAddExpense}>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))", gap:12, marginBottom:14 }}>
                  <div>
                    <label className="form-label">Category</label>
                    <select className="form-field" value={newExpense.category} onChange={e=>setNewExpense(x=>({...x,category:e.target.value}))}>
                      {EXPENSE_CATEGORIES.map(c=><option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div><label className="form-label">Amount (₹)</label><input className="form-field" type="number" placeholder="5000" value={newExpense.amount} onChange={e=>setNewExpense(x=>({...x,amount:e.target.value}))} /></div>
                  {newExpense.category === "Inventory Purchase" && (
                    <div><label className="form-label">Shipping (₹)</label><input className="form-field" type="number" placeholder="150" value={newExpense.shipping} onChange={e=>setNewExpense(x=>({...x,shipping:e.target.value}))} /></div>
                  )}
                  <div><label className="form-label">Date</label><input className="form-field" type="date" value={newExpense.expense_date} onChange={e=>setNewExpense(x=>({...x,expense_date:e.target.value}))} /></div>
                  <div><label className="form-label">Description</label><input className="form-field" type="text" placeholder="Bought T-shirts from supplier" value={newExpense.description} onChange={e=>setNewExpense(x=>({...x,description:e.target.value}))} /></div>
                </div>
                {newExpense.category === "Inventory Purchase" && (+newExpense.shipping || 0) > 0 && (
                  <div style={{ fontSize:11, color:"#888", marginBottom:10 }}>Total: {fmt((+newExpense.amount||0) + (+newExpense.shipping||0))} (Item: {fmt(+newExpense.amount||0)} + Shipping: {fmt(+newExpense.shipping||0)})</div>
                )}
                <div style={{ display:"flex", gap:12, alignItems:"center", flexWrap:"wrap" }}>
                  <button type="submit" className="submit-btn">Add Expense →</button>
                  {expenseSuccess && <div className="success-badge">✓ Expense saved!</div>}
                </div>
              </form>
            </div>

            {/* Expense breakdown by category */}
            {monthExpenses.length > 0 && (
              <div style={{ padding:22, background:"rgba(255,255,255,.02)", border:"1px solid rgba(255,255,255,.07)", borderRadius:18, marginBottom:24 }}>
                <div style={{ fontFamily:"Bebas Neue", fontSize:18, color:"#fff", marginBottom:16 }}>EXPENSE BREAKDOWN</div>
                {(() => {
                  const byCategory = {};
                  monthExpenses.forEach(e => { byCategory[e.category] = (byCategory[e.category]||0) + (+e.amount); });
                  const maxCat = Math.max(...Object.values(byCategory), 1);
                  return Object.entries(byCategory).sort((a,b)=>b[1]-a[1]).map(([cat, amt]) => (
                    <div key={cat} style={{ display:"grid", gridTemplateColumns:"140px 1fr 80px", gap:10, alignItems:"center", marginBottom:8 }}>
                      <div style={{ fontSize:12, color:"#777", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{cat}</div>
                      <div style={{ height:7, background:"rgba(255,255,255,.05)", borderRadius:4, overflow:"hidden" }}>
                        <div style={{ height:"100%", width:`${Math.round((amt/maxCat)*100)}%`, background:"linear-gradient(90deg,#ff3c64,#ffb400)", borderRadius:4 }} />
                      </div>
                      <div style={{ fontSize:12, color:"#ff3c64", fontWeight:600, textAlign:"right" }}>{fmt(amt)}</div>
                    </div>
                  ));
                })()}
              </div>
            )}

            {/* Expense list */}
            <div style={{ fontFamily:"Bebas Neue", fontSize:18, color:"#fff", marginBottom:12 }}>EXPENSE LOG</div>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {monthExpenses.map(e => (
                <div key={e.id} style={{ display:"grid", gridTemplateColumns:"1fr auto auto", gap:12, alignItems:"center", padding:"12px 16px", background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.06)", borderRadius:12 }}>
                  <div>
                    <div style={{ fontSize:13, fontWeight:500, color:"#fff" }}>{e.description || e.category}</div>
                    <div style={{ fontSize:10, color:"#555", marginTop:2 }}>{e.category} · {e.expense_date}</div>
                  </div>
                  <div style={{ fontFamily:"Bebas Neue", fontSize:18, color:"#ff3c64" }}>{fmt(e.amount)}</div>
                  <button onClick={()=>handleDeleteExpense(e.id)} style={{ padding:"4px 8px", background:"rgba(255,60,100,.1)", border:"1px solid rgba(255,60,100,.2)", borderRadius:6, color:"#ff3c64", fontSize:10, cursor:"pointer" }}>✕</button>
                </div>
              ))}
              {monthExpenses.length === 0 && <div style={{ fontSize:13, color:"#444", padding:20, textAlign:"center" }}>No expenses for {booksMonth}</div>}
            </div>

          </div>
        )}

        {/* ═══════════ ORDERS TAB ═══════════ */}
        {adminTab==="orders" && (
          <div className="fu">
            <div style={{ fontFamily:"Bebas Neue", fontSize:26, color:"#fff", marginBottom:12 }}>ORDERS</div>
            {/* Search + status filter */}
            <div style={{ display:"flex", gap:10, marginBottom:16, flexWrap:"wrap", alignItems:"center" }}>
              <input className="form-field" type="text" placeholder="Search customer, phone, product…" value={orderSearch} onChange={e=>setOrderSearch(e.target.value)} style={{ maxWidth:300, flex:1 }} />
              <div style={{ display:"flex", gap:5 }}>
                {["All","Pending","Packed","Shipped","Delivered","Cancelled"].map(st => (
                  <button key={st} type="button" onClick={()=>setOrderStatusFilter(st)} style={{
                    padding:"6px 12px", borderRadius:8, cursor:"pointer", fontWeight:600, fontSize:10,
                    background: orderStatusFilter===st ? (STATUS_COLORS[st]?.bg || "rgba(160,106,255,.2)") : "rgba(255,255,255,.03)",
                    border: `1px solid ${orderStatusFilter===st ? (STATUS_COLORS[st]?.color || "rgba(160,106,255,.4)") + "44" : "rgba(255,255,255,.06)"}`,
                    color: orderStatusFilter===st ? (STATUS_COLORS[st]?.color || "#c084fc") : "#555",
                  }}>{st}{st !== "All" ? ` (${orders.filter(o=>o.status===st).length})` : ""}</button>
                ))}
              </div>
            </div>
            <div style={{ fontSize:11, color:"#444", marginBottom:14 }}>{filteredOrders.length} of {orders.length} orders</div>
            <div style={{ display:"flex", flexDirection:"column", gap:9 }}>
              {filteredOrders.map(o => (
                <div key={o.id} style={{ padding:"16px 18px", background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.07)", borderRadius:15, display:"grid", gridTemplateColumns:"1fr auto auto auto", gap:14, alignItems:"center" }}>
                  <div><div style={{ fontSize:13, fontWeight:600, color:"#fff" }}>{o.customer}{o.phone ? ` · ${o.phone}` : ""}</div><div style={{ fontSize:11, color:"#555", marginTop:2 }}>{o.product} · {o.gender} · Qty {o.qty}</div></div>
                  <div style={{ fontFamily:"Bebas Neue", fontSize:20, color:"#a06aff" }}>{fmt(o.amount)}</div>
                  <select className="status-sel" value={o.status} onChange={e=>updateOrderStatus(o.id,e.target.value)} style={{ background:STATUS_COLORS[o.status]?.bg, color:STATUS_COLORS[o.status]?.color, borderColor:`${STATUS_COLORS[o.status]?.color}44` }}>
                    {["Pending","Packed","Shipped","Delivered","Cancelled"].map(s=><option key={s} style={{background:"#1a1a1a",color:"#ccc"}}>{s}</option>)}
                  </select>
                  <button onClick={()=>handleDeleteOrder(o.id)} style={{ padding:"5px 10px", background:"rgba(255,60,100,.1)", border:"1px solid rgba(255,60,100,.2)", borderRadius:7, color:"#ff3c64", fontSize:10, fontWeight:600, cursor:"pointer" }}>Delete</button>
                </div>
              ))}
              {filteredOrders.length === 0 && <div style={{ fontSize:13, color:"#444", padding:20, textAlign:"center" }}>{orderSearch || orderStatusFilter !== "All" ? "No matching orders." : "No orders yet."}</div>}
            </div>
          </div>
        )}

        {/* ═══════════ EDIT PRODUCT MODAL ═══════════ */}
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
                    <div><label className="form-label">Type</label><select className="form-field" value={editingProduct.type} onChange={e=>setEditingProduct(p=>({...p,type:e.target.value}))}>{PRODUCT_TYPES.map(t=><option key={t}>{t}</option>)}</select></div>
                    <div><label className="form-label">Gender</label><select className="form-field" value={editingProduct.gender} onChange={e=>setEditingProduct(p=>({...p,gender:e.target.value}))}>{["MEN","WOMEN","KIDS","UNISEX"].map(g=><option key={g}>{g}</option>)}</select></div>
                    <div><label className="form-label">MRP (₹)</label><input className="form-field" type="number" value={editingProduct.mrp} onChange={e=>setEditingProduct(p=>({...p,mrp:e.target.value}))} /></div>
                    <div><label className="form-label">Selling Price (₹)</label><input className="form-field" type="number" value={editingProduct.price} onChange={e=>setEditingProduct(p=>({...p,price:e.target.value}))} /></div>
                    <div><label className="form-label">Fit</label><select className="form-field" value={editingProduct.fit} onChange={e=>setEditingProduct(p=>({...p,fit:e.target.value}))}>{["Oversized","Boxy","True to Size","Standard Fit"].map(f=><option key={f}>{f}</option>)}</select></div>
                    <div><label className="form-label">Tag</label><select className="form-field" value={editingProduct.tag} onChange={e=>setEditingProduct(p=>({...p,tag:e.target.value}))}>{["HOT DROP","LIMITED","NEW DROP"].map(t=><option key={t}>{t}</option>)}</select></div>
                  </div>
                  <SizeChips label="Sizes (tap multiple)" selected={editingProduct.sizes || []} onChange={sizes=>setEditingProduct(p=>({...p,sizes}))} />
                  {/* Per-size stock edit */}
                  <div>
                    <label className="form-label" style={{ marginBottom:8, display:"block" }}>Stock by Size</label>
                    <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                      {(editingProduct.sizes || []).map(s => (
                        <div key={s} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
                          <div style={{ fontSize:11, fontWeight:700, color:"#888" }}>{s}</div>
                          <input type="number" value={editingProduct.stock_by_size?.[s] ?? 0} onChange={e => setEditingProduct(p => ({...p, stock_by_size: {...(p.stock_by_size||{}), [s]: +e.target.value}}))}
                            style={{ width:50, padding:"6px 4px", textAlign:"center", background:"rgba(255,255,255,.05)", border:"1px solid rgba(255,255,255,.1)", borderRadius:8, color:"#fff", fontSize:13, fontFamily:"'DM Sans',sans-serif" }} />
                        </div>
                      ))}
                    </div>
                  </div>
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
              color: on ? "#fff" : "#888", transition: "all .15s",
            }}>{s}</button>
          );
        })}
      </div>
      {selected.length === 0 && <div style={{ fontSize:11, color:"#ff3c64", marginTop:8 }}>Pick at least one size.</div>}
    </div>
  );
}

/* ═══════════════ MULTI-IMAGE INPUT ═══════════════ */
function MultiImageInput({ images = [], onChange }) {
  const [urlInput, setUrlInput] = useState("");
  const [urlError, setUrlError] = useState("");
  const fileRef = useRef(null);

  function addUrl() {
    const v = urlInput.trim();
    if (!v.startsWith("http")) { setUrlError("Please enter a valid https:// URL"); return; }
    if (images.length >= MAX_IMAGES) { setUrlError(`Max ${MAX_IMAGES} images per product`); return; }
    setUrlError(""); onChange([...images, v]); setUrlInput("");
  }

  async function handleFiles(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    if (images.length + files.length > MAX_IMAGES) { alert(`Max ${MAX_IMAGES} images total.`); return; }
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

  return (
    <div style={{ marginBottom:20 }}>
      <div className="form-label">Product Images ({images.length}/{MAX_IMAGES})</div>
      {images.length > 0 && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(90px, 1fr))", gap:8, marginBottom:12 }}>
          {images.map((img, idx) => (
            <div key={idx} style={{ position:"relative", borderRadius:10, overflow:"hidden", aspectRatio:"1/1", border: idx===0 ? "2px solid #a06aff" : "1px solid rgba(255,255,255,.1)" }}>
              <img src={img} alt={`Image ${idx+1}`} style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }} />
              {idx === 0 && <div style={{ position:"absolute", top:4, left:4, background:"linear-gradient(135deg,#a06aff,#ff3c64)", color:"#fff", fontSize:8, fontWeight:700, padding:"2px 6px", borderRadius:4 }}>MAIN</div>}
              <button type="button" onClick={()=>onChange(images.filter((_, i) => i !== idx))} style={{ position:"absolute", top:4, right:4, width:22, height:22, borderRadius:"50%", background:"rgba(0,0,0,.85)", border:"1px solid rgba(255,255,255,.2)", color:"#fff", fontSize:11, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
              {idx !== 0 && <button type="button" onClick={()=>{const r=[images[idx],...images.filter((_,i)=>i!==idx)];onChange(r);}} style={{ position:"absolute", bottom:4, left:4, right:4, background:"rgba(0,0,0,.7)", border:"1px solid rgba(160,106,255,.4)", color:"#c084fc", fontSize:9, fontWeight:600, padding:"3px 4px", borderRadius:5, cursor:"pointer" }}>SET MAIN</button>}
            </div>
          ))}
        </div>
      )}
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
      <input ref={fileRef} type="file" accept="image/*" multiple style={{ display:"none" }} onChange={handleFiles} />
      <button type="button" onClick={()=>fileRef.current?.click()} disabled={images.length >= MAX_IMAGES}
        style={{ width:"100%", padding:"9px", background:"rgba(160,106,255,.1)", border:"1px dashed rgba(160,106,255,.3)", borderRadius:10, color:"#a06aff", fontSize:12, fontWeight:600, cursor:images.length >= MAX_IMAGES ? "not-allowed":"pointer", opacity: images.length >= MAX_IMAGES ? 0.5 : 1 }}>
        ↑ Upload from device (multiple)
      </button>
    </div>
  );
}

/* ═══════════════ SINGLE IMAGE INPUT ═══════════════ */
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
    onSet(publicUrl); e.target.value = "";
  }

  return (
    <div style={{ marginBottom:18 }}>
      <div className="form-label">{label}</div>
      {image && (
        <div style={{ position:"relative", marginBottom:10, borderRadius:12, overflow:"hidden" }}>
          <img src={image} alt="preview" style={{ width:"100%", maxHeight:200, objectFit:"cover", display:"block" }} />
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
      .sale-card:hover{background:rgba(255,255,255,.06)!important;border-color:rgba(160,106,255,.3)!important;transform:translateY(-2px);}
      @keyframes fadeUp{from{opacity:0;transform:translateY(18px);}to{opacity:1;transform:translateY(0);}}
      .fu{animation:fadeUp .45s ease forwards;}
    `}</style>
  );
}
