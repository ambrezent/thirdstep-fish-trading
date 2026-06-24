// ── Firebase ──────────────────────────────────────────────────────────────────
import { initializeApp }     from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth,
         signInWithEmailAndPassword,
         signOut,
         onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore,
         collection, getDocs, getDoc,
         addDoc, setDoc, updateDoc, deleteDoc,
         doc, onSnapshot, serverTimestamp,
         query, orderBy }    from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ── Config — replace with your Firebase project credentials ──────────────────
const firebaseConfig = {
  apiKey:            "AIzaSyB3vIp806AsDhTEwSBEKWMcfvOUP6NkBxg",
  authDomain:        "freshcatch-uae.firebaseapp.com",
  projectId:         "freshcatch-uae",
  storageBucket:     "freshcatch-uae.firebasestorage.app",
  messagingSenderId: "192728450319",
  appId:             "1:192728450319:web:f38432714e9fe691deea7a"
};

// ── Init ──────────────────────────────────────────────────────────────────────
let db = null, auth = null, firebaseReady = false;
try {
  if (firebaseConfig.apiKey && firebaseConfig.apiKey !== "YOUR_API_KEY") {
    const app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db   = getFirestore(app);
    firebaseReady = true;
  }
} catch (e) { console.warn("Admin Firebase demo mode:", e.message); }

// ═══════════════════════════════════════════════════════════════════════════════
//  DEMO DATA
// ═══════════════════════════════════════════════════════════════════════════════
const DEMO_CATEGORIES = [
  { id:"c1", label:"Large Fish",  slug:"large",    color:"teal"   },
  { id:"c2", label:"Small Fish",  slug:"small",    color:"blue"   },
  { id:"c3", label:"Shellfish",   slug:"shellfish",color:"purple" },
  { id:"c4", label:"Shrimp",      slug:"shrimp",   color:"gold"   },
];

const DEMO_PRODUCTS = [
  { id:"d1", name:"Hamour",    nameAr:"هامور",  subtitle:"Grouper",     emoji:"🐠", price:48, unit:"per kg",    category:"large",    badge:"best",    inStock:true,  preOrder:false },
  { id:"d2", name:"Kingfish",  nameAr:"كنعد",   subtitle:"Seer fish",   emoji:"🐡", price:62, unit:"per kg",    category:"large",    badge:"preorder",inStock:false, preOrder:true  },
  { id:"d3", name:"Shaari",    nameAr:"شعري",   subtitle:"Emperorfish", emoji:"🐟", price:36, unit:"per kg",    category:"large",    badge:"new",     inStock:true,  preOrder:false },
  { id:"d4", name:"Zubaidi",   nameAr:"زبيدي",  subtitle:"Pomfret",     emoji:"🐠", price:55, unit:"per 500g", category:"large",    badge:"pop",     inStock:true,  preOrder:false },
  { id:"d5", name:"Shrimp",    nameAr:"روبيان", subtitle:"XL Prawns",   emoji:"🦐", price:42, unit:"per 500g", category:"shrimp",   badge:"new",     inStock:true,  preOrder:false },
  { id:"d6", name:"Blue Crab", nameAr:"قبقب",   subtitle:"Local crab",  emoji:"🦀", price:38, unit:"per piece",category:"shellfish",badge:"low",     inStock:true,  preOrder:false },
  { id:"d7", name:"Jesh",      nameAr:"جش",     subtitle:"Grey Mullet", emoji:"🐟", price:28, unit:"per kg",   category:"small",    badge:"preorder",inStock:false, preOrder:true  },
  { id:"d8", name:"Saafi",     nameAr:"صافي",   subtitle:"Rabbitfish",  emoji:"🐠", price:32, unit:"per kg",   category:"small",    badge:"new",     inStock:true,  preOrder:false },
];

const DEMO_ORDERS = [
  { id:"o1", customerName:"Ahmed Al Mansoori", customerMobile:"+971 50 111 2233", deliveryAddress:"Villa 12, Al Bateen, Abu Dhabi", deliveryDate:"Wed 26 Jun · 8am–1pm", items:[{productName:"Hamour",qty:2,cut:"Fillet skin-on",price:48},{productName:"Shrimp",qty:1,cut:"Cleaned",price:42}], subtotal:138, delivery:15, total:153, status:"pending",   createdAt:{toDate:()=>new Date("2024-06-24T08:12:00")} },
  { id:"o2", customerName:"Fatima Al Zaabi",   customerMobile:"+971 55 987 6543", deliveryAddress:"Apt 4B, Al Reem Island, Abu Dhabi", deliveryDate:"Wed 26 Jun · 2pm–7pm", items:[{productName:"Zubaidi",qty:1,cut:"Whole uncut",price:55}], subtotal:55, delivery:15, total:70, status:"confirmed", createdAt:{toDate:()=>new Date("2024-06-24T09:40:00")} },
  { id:"o3", customerName:"Khalid Al Hameli",  customerMobile:"+971 52 444 5566", deliveryAddress:"House 8, Khalifa City A, Abu Dhabi", deliveryDate:"Thu 27 Jun · 8am–1pm", items:[{productName:"Shaari",qty:3,cut:"Curry cut",price:36},{productName:"Blue Crab",qty:2,cut:"Whole",price:38}], subtotal:184, delivery:15, total:199, status:"preparing",  createdAt:{toDate:()=>new Date("2024-06-24T11:05:00")} },
  { id:"o4", customerName:"Sara Al Nahyan",    customerMobile:"+971 50 777 8899", deliveryAddress:"Tower 3, Saadiyat Island, Abu Dhabi", deliveryDate:"Fri 28 Jun · 8am–1pm", items:[{productName:"Hamour",qty:1,cut:"Steaks",price:48}], subtotal:48, delivery:15, total:63, status:"delivered",  createdAt:{toDate:()=>new Date("2024-06-23T14:30:00")} },
];

const DEMO_SETTINGS = {
  waNumber: "971500000000",
  email: "hello@freshcatch.ae",
  hours: "Sat–Thu · 6am – 8pm",
  deliveryFee: 15,
  cutoff: "18:00",
  freeDelivery: 200,
  areas: "Abu Dhabi city, Khalifa City, Al Reem Island, Yas Island, Saadiyat Island",
  eyebrow: "Fresh catch — just landed today",
  headline: "Premium UAE Seafood",
  subline: "Select your cut, add custom instructions, and place your order directly via WhatsApp.",
  nextDelivery: "Wed 26 Jun · 8am – 1pm",
  deliveryWindows: ["8am – 1pm", "2pm – 7pm"],
};

// ═══════════════════════════════════════════════════════════════════════════════
//  STATE
// ═══════════════════════════════════════════════════════════════════════════════
let products = [], orders = [], settings = { ...DEMO_SETTINGS }, categories = [];
let editingProductId = null, viewingOrderId = null, editingCategoryId = null, demoMode = false;

// ═══════════════════════════════════════════════════════════════════════════════
//  DOM REFS
// ═══════════════════════════════════════════════════════════════════════════════
const loginScreen  = document.getElementById("login-screen");
const appEl        = document.getElementById("app");
const loginEmail   = document.getElementById("login-email");
const loginPass    = document.getElementById("login-password");
const loginError   = document.getElementById("login-error");
const sbUser       = document.getElementById("sb-user");

// ═══════════════════════════════════════════════════════════════════════════════
//  AUTH
// ═══════════════════════════════════════════════════════════════════════════════
document.getElementById("login-btn").addEventListener("click", async () => {
  if (!firebaseReady) { toast("Firebase not configured — use demo mode", "error"); return; }
  const email = loginEmail.value.trim();
  const pass  = loginPass.value;
  if (!email || !pass) { showLoginError("Please enter email and password."); return; }
  try {
    await signInWithEmailAndPassword(auth, email, pass);
  } catch (e) {
    showLoginError(e.code === "auth/invalid-credential"
      ? "Invalid email or password." : e.message);
  }
});

document.getElementById("demo-btn").addEventListener("click", () => {
  demoMode = true;
  bootApp("demo@freshcatch.ae");
});

document.getElementById("logout-btn").addEventListener("click", async () => {
  if (firebaseReady && !demoMode) await signOut(auth);
  appEl.classList.add("hidden");
  loginScreen.classList.remove("hidden");
  demoMode = false;
});

if (firebaseReady) {
  onAuthStateChanged(auth, user => {
    if (user) bootApp(user.email);
    else {
      loginScreen.classList.remove("hidden");
      appEl.classList.add("hidden");
    }
  });
} else {
  // Show demo notice on login screen
  document.getElementById("demo-notice").style.display = "block";
}

function showLoginError(msg) {
  loginError.textContent = msg;
  loginError.classList.remove("hidden");
}

// ═══════════════════════════════════════════════════════════════════════════════
//  BOOT
// ═══════════════════════════════════════════════════════════════════════════════
async function bootApp(email) {
  loginScreen.classList.add("hidden");
  appEl.classList.remove("hidden");
  sbUser.textContent = email;
  document.getElementById("dash-date").textContent =
    new Date().toLocaleDateString("en-AE", { weekday:"long", day:"numeric", month:"long", year:"numeric" });

  await loadAll();
  renderDashboard();
  renderCategories();
  renderProducts();
  renderOrders();
  loadSettings();
  renderRecentCatches();

  if (firebaseReady && !demoMode) setupRealtimeListeners();
}

// ═══════════════════════════════════════════════════════════════════════════════
//  LOAD DATA
// ═══════════════════════════════════════════════════════════════════════════════
async function loadAll() {
  if (demoMode || !firebaseReady) {
    categories = DEMO_CATEGORIES.map(c => ({ ...c }));
    products   = DEMO_PRODUCTS.map(p => ({ ...p }));
    orders     = DEMO_ORDERS.map(o => ({ ...o }));
    return;
  }
  try {
    const [cSnap, pSnap, oSnap, sSnap] = await Promise.all([
      getDocs(collection(db, "categories")),
      getDocs(collection(db, "products")),
      getDocs(query(collection(db, "orders"), orderBy("createdAt", "desc"))),
      getDocs(collection(db, "settings")),
    ]);
    categories = cSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    products   = pSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    orders     = oSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    if (!sSnap.empty) settings = { ...DEMO_SETTINGS, ...sSnap.docs[0].data() };
    // Seed categories if empty
    if (categories.length === 0) {
      for (const c of DEMO_CATEGORIES) {
        const ref = await addDoc(collection(db, "categories"), { ...c });
        categories.push({ id: ref.id, ...c });
      }
    }
    // Seed products if empty
    if (products.length === 0) {
      for (const p of DEMO_PRODUCTS) {
        const ref = await addDoc(collection(db, "products"), { ...p, createdAt: serverTimestamp() });
        products.push({ id: ref.id, ...p });
      }
    }
  } catch (e) {
    console.warn("Firestore load failed, using demo data:", e.message);
    categories = DEMO_CATEGORIES.map(c => ({ ...c }));
    products   = DEMO_PRODUCTS.map(p => ({ ...p }));
    orders     = DEMO_ORDERS.map(o => ({ ...o }));
  }
}

// ── Realtime listeners (only when Firebase is live) ──────────────────────────
function setupRealtimeListeners() {
  onSnapshot(collection(db, "products"), snap => {
    products = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderProducts(); renderDashboard();
  });
  onSnapshot(query(collection(db, "orders"), orderBy("createdAt","desc")), snap => {
    orders = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderOrders(); renderDashboard();
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
//  NAVIGATION
// ═══════════════════════════════════════════════════════════════════════════════
document.querySelectorAll(".sb-link").forEach(link => {
  link.addEventListener("click", () => showPage(link.dataset.page));
});

function showPage(page) {
  document.querySelectorAll(".sb-link").forEach(l => l.classList.toggle("active", l.dataset.page === page));
  document.querySelectorAll(".page").forEach(p => p.classList.toggle("active", p.id === "page-"+page));
  document.querySelectorAll(".page").forEach(p => {
    if (p.id === "page-"+page) p.classList.add("active");
    else { p.classList.remove("active"); }
  });
  // Re-show hidden class correctly
  document.querySelectorAll(".page").forEach(p => {
    if (p.id === "page-"+page) p.style.display = "block";
    else p.style.display = "none";
  });
}
// init display
document.querySelectorAll(".page").forEach((p, i) => {
  p.style.display = i === 0 ? "block" : "none";
  p.classList.remove("active", "hidden");
  if (i === 0) p.classList.add("active");
});

// ═══════════════════════════════════════════════════════════════════════════════
//  DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════
function renderDashboard() {
  const pending = orders.filter(o => o.status === "pending").length;
  const revenue = orders.filter(o => o.status !== "cancelled").reduce((s,o) => s + (o.total||0), 0);
  document.getElementById("stat-products").textContent = products.length;
  document.getElementById("stat-orders").textContent   = orders.length;
  document.getElementById("stat-pending").textContent  = pending;
  document.getElementById("stat-revenue").textContent  = `AED ${revenue.toLocaleString()}`;
  document.getElementById("sb-prod-count").textContent = products.length;
  document.getElementById("sb-order-count").textContent = pending;

  const recent = orders.slice(0, 6);
  const body = document.getElementById("dash-orders-body");
  body.innerHTML = recent.length ? recent.map(o => `
    <tr style="cursor:pointer" onclick="openOrderModal('${o.id}')">
      <td><code style="font-size:11px;color:var(--muted)">#${o.id.slice(0,8)}</code></td>
      <td>${o.customerName||"—"}</td>
      <td>${(o.items||[]).length} item${(o.items||[]).length!==1?"s":""}</td>
      <td style="font-weight:500">AED ${o.total||0}</td>
      <td>${statusBadge(o.status)}</td>
      <td style="color:var(--muted);font-size:12px">${fmtDate(o.createdAt)}</td>
    </tr>`).join("")
    : `<tr class="empty-row"><td colspan="6">No orders yet.</td></tr>`;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  CATEGORIES
// ═══════════════════════════════════════════════════════════════════════════════
const CAT_COLORS = {
  teal:   { bg:"#eef7f4", border:"#1a6b55", text:"#1a6b55", dot:"#1a6b55"   },
  gold:   { bg:"#fdf6ed", border:"#c4986e", text:"#8a5a28", dot:"#c4986e"   },
  blue:   { bg:"#e8f0ff", border:"#4080e0", text:"#3060c0", dot:"#4080e0"   },
  purple: { bg:"#f0e8ff", border:"#8040c0", text:"#6030a0", dot:"#8040c0"   },
  red:    { bg:"#fff0f0", border:"#d44",    text:"#d44",    dot:"#d44"      },
  gray:   { bg:"#f4f4f2", border:"#bbb",    text:"#666",    dot:"#bbb"      },
};

function catColorStyle(color) {
  const c = CAT_COLORS[color] || CAT_COLORS.gray;
  return `background:${c.bg};border:1.5px solid ${c.border};color:${c.text}`;
}

function renderCategories() {
  document.getElementById("sb-cat-count").textContent = categories.length;
  rebuildCategoryDropdowns();

  const body = document.getElementById("categories-body");
  if (!body) return;
  body.innerHTML = categories.length ? categories.map(c => {
    const c2 = CAT_COLORS[c.color] || CAT_COLORS.gray;
    const count = products.filter(p => p.category === c.slug).length;
    return `
    <tr>
      <td>
        <div class="cat-name-cell">
          <span class="cat-color-dot" style="background:${c2.dot}"></span>
          <span style="padding:3px 12px;border-radius:999px;font-size:12px;font-weight:500;${catColorStyle(c.color)}">${c.label}</span>
        </div>
      </td>
      <td><code class="cat-slug-code">${c.slug}</code></td>
      <td>
        <span style="width:18px;height:18px;border-radius:50%;display:inline-block;background:${c2.dot}"></span>
      </td>
      <td><span class="cat-count-badge">${count} product${count !== 1 ? "s" : ""}</span></td>
      <td>
        <div class="actions-cell">
          <button class="btn-edit" onclick="openEditCategory('${c.id}')">Edit</button>
          <button class="btn-del"  onclick="confirmDelete('${c.id}','category')">Delete</button>
        </div>
      </td>
    </tr>`;
  }).join("") : `<tr class="empty-row"><td colspan="5">No categories yet. Add one above.</td></tr>`;
}

function rebuildCategoryDropdowns() {
  // Product modal select
  const pCat = document.getElementById("p-category");
  if (pCat) {
    const prev = pCat.value;
    pCat.innerHTML = categories.map(c =>
      `<option value="${c.slug}">${c.label}</option>`
    ).join("") || `<option value="">No categories</option>`;
    if (prev) pCat.value = prev;
  }
  // Filter select
  const fCat = document.getElementById("prod-cat-filter");
  if (fCat) {
    fCat.innerHTML = `<option value="">All categories</option>` +
      categories.map(c => `<option value="${c.slug}">${c.label}</option>`).join("");
  }
}

document.getElementById("add-category-btn")?.addEventListener("click", () => {
  editingCategoryId = null;
  document.getElementById("c-label").value = "";
  document.getElementById("c-slug").value  = "";
  document.querySelector('input[name="c-color"][value="teal"]').checked = true;
  document.getElementById("c-slug").removeAttribute("readonly");
  document.getElementById("category-modal-title").textContent = "Add category";
  document.getElementById("category-modal").classList.remove("hidden");
});

// Auto-generate slug from label
document.getElementById("c-label")?.addEventListener("input", () => {
  if (editingCategoryId) return; // don't overwrite slug when editing
  document.getElementById("c-slug").value = document.getElementById("c-label").value
    .toLowerCase().trim().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
});

window.openEditCategory = function(id) {
  const c = categories.find(x => x.id === id);
  if (!c) return;
  editingCategoryId = id;
  document.getElementById("c-label").value = c.label;
  document.getElementById("c-slug").value  = c.slug;
  document.getElementById("c-slug").setAttribute("readonly", "true");
  const radio = document.querySelector(`input[name="c-color"][value="${c.color}"]`);
  if (radio) radio.checked = true;
  document.getElementById("category-modal-title").textContent = `Edit — ${c.label}`;
  document.getElementById("category-modal").classList.remove("hidden");
};

window.closeCategoryModal = function() {
  document.getElementById("category-modal").classList.add("hidden");
  editingCategoryId = null;
};

document.getElementById("save-category-btn")?.addEventListener("click", async () => {
  const label = document.getElementById("c-label").value.trim();
  const slug  = document.getElementById("c-slug").value.trim();
  const color = document.querySelector('input[name="c-color"]:checked')?.value || "gray";

  if (!label) { toast("Display name is required", "error"); return; }
  if (!slug)  { toast("Slug is required", "error"); return; }
  if (!/^[a-z0-9-]+$/.test(slug)) { toast("Slug must be lowercase letters, numbers, hyphens only", "error"); return; }

  // Check for duplicate slug (only on add)
  if (!editingCategoryId && categories.some(c => c.slug === slug)) {
    toast("A category with that slug already exists", "error"); return;
  }

  const data = { label, slug, color };

  if (firebaseReady && !demoMode) {
    try {
      if (editingCategoryId) {
        await updateDoc(doc(db, "categories", editingCategoryId), { label, color });
        toast(`${label} updated`, "success");
      } else {
        const ref = await addDoc(collection(db, "categories"), data);
        categories.push({ id: ref.id, ...data });
        toast(`${label} added`, "success");
      }
      const snap = await getDocs(collection(db, "categories"));
      categories = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch(e) { toast("Save failed: " + e.message, "error"); return; }
  } else {
    if (editingCategoryId) {
      const idx = categories.findIndex(c => c.id === editingCategoryId);
      if (idx !== -1) categories[idx] = { ...categories[idx], label, color };
      toast(`${label} updated (demo)`, "success");
    } else {
      categories.push({ id: "cat-" + Date.now(), ...data });
      toast(`${label} added (demo)`, "success");
    }
  }

  renderCategories();
  window.closeCategoryModal();
});

// ═══════════════════════════════════════════════════════════════════════════════
//  PRODUCTS
// ═══════════════════════════════════════════════════════════════════════════════
function renderProducts(list = products) {
  const q   = document.getElementById("prod-search")?.value.toLowerCase() || "";
  const cat = document.getElementById("prod-cat-filter")?.value || "";
  const stk = document.getElementById("prod-stock-filter")?.value || "";

  let filtered = list;
  if (q)   filtered = filtered.filter(p => p.name.toLowerCase().includes(q) || (p.nameAr||"").includes(q));
  if (cat) filtered = filtered.filter(p => p.category === cat);
  if (stk === "inStock")  filtered = filtered.filter(p => !p.preOrder);
  if (stk === "preOrder") filtered = filtered.filter(p => p.preOrder);

  const body = document.getElementById("products-body");
  body.innerHTML = filtered.length ? filtered.map(p => `
    <tr>
      <td>
        <div class="fish-cell">
          <div class="fish-emoji">${p.emoji||"🐟"}</div>
          <div>
            <div class="fish-name">${p.name}</div>
            <div class="fish-sub">${p.subtitle||""}</div>
          </div>
        </div>
      </td>
      <td style="font-size:14px;direction:rtl">${p.nameAr||"—"}</td>
      <td><span class="cat-badge">${p.category||"—"}</span></td>
      <td style="font-weight:500">AED ${p.price}</td>
      <td style="color:var(--muted);font-size:12px">${p.unit||""}</td>
      <td><span class="cat-badge">${p.badge||"—"}</span></td>
      <td>${p.preOrder ? `<span class="status-badge s-preOrder">Pre-order</span>` : `<span class="status-badge s-inStock">In stock</span>`}</td>
      <td>
        <div class="actions-cell">
          <button class="btn-edit" onclick="openEditProduct('${p.id}')">Edit</button>
          <button class="btn-del"  onclick="confirmDelete('${p.id}','product')">Delete</button>
        </div>
      </td>
    </tr>`).join("")
    : `<tr class="empty-row"><td colspan="8">No products found.</td></tr>`;
}

// Filters
["prod-search","prod-cat-filter","prod-stock-filter"].forEach(id => {
  document.getElementById(id)?.addEventListener("input", () => renderProducts());
  document.getElementById(id)?.addEventListener("change", () => renderProducts());
});

// ── Add / Edit ────────────────────────────────────────────────────────────────
document.getElementById("add-product-btn").addEventListener("click", () => {
  editingProductId = null;
  clearProductForm();
  document.getElementById("product-modal-title").textContent = "Add product";
  document.getElementById("product-modal").classList.remove("hidden");
});

window.openEditProduct = function(id) {
  const p = products.find(x => x.id === id);
  if (!p) return;
  editingProductId = id;
  document.getElementById("p-name").value      = p.name      || "";
  document.getElementById("p-name-ar").value   = p.nameAr    || "";
  document.getElementById("p-subtitle").value  = p.subtitle  || "";
  document.getElementById("p-emoji").value     = p.emoji     || "";
  document.getElementById("p-price").value     = p.price     || "";
  document.getElementById("p-unit").value      = p.unit      || "per kg";
  document.getElementById("p-category").value  = p.category  || "large";
  document.getElementById("p-badge").value     = p.badge     || "";
  document.getElementById("p-availability").value = p.preOrder ? "preOrder" : "inStock";
  document.getElementById("product-modal-title").textContent = `Edit — ${p.name}`;
  document.getElementById("product-modal").classList.remove("hidden");
};

window.closeProductModal = function() {
  document.getElementById("product-modal").classList.add("hidden");
  editingProductId = null;
};

function clearProductForm() {
  ["p-name","p-name-ar","p-subtitle","p-emoji","p-price"].forEach(id =>
    { document.getElementById(id).value = ""; });
  document.getElementById("p-unit").value     = "per kg";
  document.getElementById("p-category").value = "large";
  document.getElementById("p-badge").value    = "";
  document.getElementById("p-availability").value = "inStock";
}

document.getElementById("save-product-btn").addEventListener("click", async () => {
  const name = document.getElementById("p-name").value.trim();
  const price = parseFloat(document.getElementById("p-price").value);
  if (!name)      { toast("Fish name is required", "error"); return; }
  if (isNaN(price)){ toast("Price is required", "error"); return; }

  const avail = document.getElementById("p-availability").value;
  const data = {
    name,
    nameAr:   document.getElementById("p-name-ar").value.trim(),
    subtitle: document.getElementById("p-subtitle").value.trim(),
    emoji:    document.getElementById("p-emoji").value.trim() || "🐟",
    price,
    unit:     document.getElementById("p-unit").value,
    category: document.getElementById("p-category").value,
    badge:    document.getElementById("p-badge").value,
    inStock:  avail === "inStock",
    preOrder: avail === "preOrder",
  };

  if (firebaseReady && !demoMode) {
    try {
      if (editingProductId) {
        await updateDoc(doc(db, "products", editingProductId), data);
        toast(`${name} updated`, "success");
      } else {
        await addDoc(collection(db, "products"), { ...data, createdAt: serverTimestamp() });
        toast(`${name} added`, "success");
      }
    } catch (e) { toast("Save failed: " + e.message, "error"); return; }
  } else {
    // Demo mode — update local state
    if (editingProductId) {
      const idx = products.findIndex(p => p.id === editingProductId);
      if (idx !== -1) products[idx] = { ...products[idx], ...data };
      toast(`${name} updated (demo)`, "success");
    } else {
      products.push({ id: "d"+Date.now(), ...data });
      toast(`${name} added (demo)`, "success");
    }
    renderProducts(); renderDashboard();
  }
  window.closeProductModal();
});

// ── Delete ────────────────────────────────────────────────────────────────────
let pendingDeleteId = null, pendingDeleteType = null;

window.confirmDelete = function(id, type) {
  pendingDeleteId = id; pendingDeleteType = type;
  let item;
  if (type === "product")  item = products.find(p => p.id === id)?.name;
  else if (type === "category") {
    const c = categories.find(c => c.id === id);
    const n = products.filter(p => p.category === c?.slug).length;
    item = `${c?.label}${n ? ` (${n} product${n!==1?"s":""} use this category)` : ""}`;
  } else item = `order #${id.slice(0,8)}`;
  document.getElementById("confirm-msg").textContent =
    `Delete "${item}"? This cannot be undone.`;
  document.getElementById("confirm-modal").classList.remove("hidden");
};
window.closeConfirm = function() {
  document.getElementById("confirm-modal").classList.add("hidden");
  pendingDeleteId = null; pendingDeleteType = null;
};
document.getElementById("confirm-ok-btn").addEventListener("click", async () => {
  if (!pendingDeleteId) return;
  const collMap = { product: "products", order: "orders", category: "categories" };
  if (firebaseReady && !demoMode) {
    try {
      await deleteDoc(doc(db, collMap[pendingDeleteType], pendingDeleteId));
      toast("Deleted", "success");
    } catch(e) { toast("Delete failed: "+e.message, "error"); }
  } else {
    if (pendingDeleteType === "product") {
      products = products.filter(p => p.id !== pendingDeleteId);
      renderProducts(); renderDashboard();
    } else if (pendingDeleteType === "category") {
      categories = categories.filter(c => c.id !== pendingDeleteId);
      renderCategories();
    } else {
      orders = orders.filter(o => o.id !== pendingDeleteId);
      renderOrders(); renderDashboard();
    }
    toast("Deleted (demo)", "success");
  }
  window.closeConfirm();
});

// ═══════════════════════════════════════════════════════════════════════════════
//  ORDERS
// ═══════════════════════════════════════════════════════════════════════════════
function renderOrders() {
  const statusFilter = document.getElementById("order-status-filter")?.value || "";
  let filtered = statusFilter ? orders.filter(o => o.status === statusFilter) : orders;

  const body = document.getElementById("orders-body");
  body.innerHTML = filtered.length ? filtered.map(o => `
    <tr>
      <td><code style="font-size:11px;color:var(--muted)">#${(o.id||"").slice(0,8)}</code></td>
      <td style="font-weight:500">${o.customerName||"—"}</td>
      <td style="color:var(--muted);font-size:12px">${o.customerMobile||"—"}</td>
      <td>${(o.items||[]).length} item${(o.items||[]).length!==1?"s":""}</td>
      <td style="font-weight:500">AED ${o.total||0}</td>
      <td style="font-size:12px;color:var(--muted)">${o.deliveryDate||"—"}</td>
      <td>${statusBadge(o.status)}</td>
      <td>
        <div class="actions-cell">
          <button class="btn-view" onclick="openOrderModal('${o.id}')">View</button>
          <button class="btn-del"  onclick="confirmDelete('${o.id}','order')">Delete</button>
        </div>
      </td>
    </tr>`).join("")
    : `<tr class="empty-row"><td colspan="8">No orders found.</td></tr>`;
}

document.getElementById("order-status-filter").addEventListener("change", renderOrders);

// ── Order detail modal ────────────────────────────────────────────────────────
window.openOrderModal = function(id) {
  const o = orders.find(x => x.id === id);
  if (!o) return;
  viewingOrderId = id;

  document.getElementById("order-modal-title").textContent = `Order #${id.slice(0,8)}`;
  document.getElementById("order-status-select").value = o.status || "pending";

  const items = (o.items || []).map(item => `
    <div class="order-item-row">
      <div>
        <div class="oi-name">${item.productName||item.name||"?"} · ${item.qty||1} kg</div>
        <div class="oi-meta">
          ${item.cut ? `Cut: ${item.cut}` : ""}
          ${item.notes ? ` · Notes: "${item.notes}"` : ""}
          ${item.preOrder ? " · <strong style='color:var(--gold)'>Pre-order</strong>" : ""}
        </div>
      </div>
      <div class="oi-price">AED ${(item.price||0)*(item.qty||1)}</div>
    </div>`).join("");

  document.getElementById("order-modal-body").innerHTML = `
    <div class="order-detail-grid">
      <div class="order-detail-section">
        <h4>Customer</h4>
        <div class="order-detail-row"><span>Name</span><span>${o.customerName||"—"}</span></div>
        <div class="order-detail-row"><span>Mobile</span><span>${o.customerMobile||"—"}</span></div>
        <div class="order-detail-row"><span>Address</span><span style="text-align:right;max-width:200px">${o.deliveryAddress||"—"}</span></div>
        ${o.driverNote ? `<div class="order-detail-row"><span>Driver note</span><span>${o.driverNote}</span></div>` : ""}
        ${o.mapPin ? `<div class="order-detail-row"><span>Map pin</span><a href="${o.mapPin}" target="_blank" style="color:var(--teal);font-size:12px">Open Google Maps ↗</a></div>` : ""}
      </div>
      <div class="order-detail-section">
        <h4>Delivery &amp; totals</h4>
        <div class="order-detail-row"><span>Window</span><span>${o.deliveryDate||"—"}</span></div>
        <div class="order-detail-row"><span>Subtotal</span><span>AED ${o.subtotal||0}</span></div>
        <div class="order-detail-row"><span>Delivery</span><span>AED ${o.delivery||15}</span></div>
        <div class="order-detail-row" style="font-weight:600"><span>Total</span><span>AED ${o.total||0}</span></div>
        <div class="order-detail-row"><span>Status</span><span>${statusBadge(o.status)}</span></div>
        <div class="order-detail-row"><span>Placed</span><span style="font-size:12px">${fmtDate(o.createdAt)}</span></div>
      </div>
    </div>
    <div class="order-items-list">
      <h4 style="font-size:11px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin-bottom:10px;padding-top:16px">Order items</h4>
      ${items}
      <div class="order-item-row" style="font-weight:600;border-top:2px solid var(--border);padding-top:14px">
        <div class="oi-name">Total</div>
        <div class="oi-price" style="font-size:16px">AED ${o.total||0}</div>
      </div>
    </div>`;

  document.getElementById("order-modal").classList.remove("hidden");
};

window.closeOrderModal = function() {
  document.getElementById("order-modal").classList.add("hidden");
  viewingOrderId = null;
};

document.getElementById("update-order-status-btn").addEventListener("click", async () => {
  if (!viewingOrderId) return;
  const newStatus = document.getElementById("order-status-select").value;
  if (firebaseReady && !demoMode) {
    try {
      await updateDoc(doc(db, "orders", viewingOrderId), { status: newStatus, updatedAt: serverTimestamp() });
      toast("Status updated", "success");
    } catch(e) { toast("Update failed: "+e.message, "error"); return; }
  } else {
    const o = orders.find(x => x.id === viewingOrderId);
    if (o) o.status = newStatus;
    renderOrders(); renderDashboard();
    toast("Status updated (demo)", "success");
  }
  window.closeOrderModal();
});

// ═══════════════════════════════════════════════════════════════════════════════
//  SETTINGS
// ═══════════════════════════════════════════════════════════════════════════════
function loadSettings() {
  document.getElementById("s-wa-number").value    = settings.waNumber      || "";
  document.getElementById("s-email").value        = settings.email         || "";
  document.getElementById("s-hours").value        = settings.hours         || "";
  document.getElementById("s-delivery-fee").value = settings.deliveryFee   || 15;
  document.getElementById("s-cutoff").value       = settings.cutoff        || "18:00";
  document.getElementById("s-free-delivery").value= settings.freeDelivery  || 0;
  document.getElementById("s-areas").value        = settings.areas         || "";
  document.getElementById("s-eyebrow").value      = settings.eyebrow       || "";
  document.getElementById("s-headline").value     = settings.headline      || "";
  document.getElementById("s-subline").value      = settings.subline       || "";
  document.getElementById("s-next-delivery").value= settings.nextDelivery  || "";
  renderDeliveryWindows();
}

function renderDeliveryWindows() {
  const list = settings.deliveryWindows || [];
  document.getElementById("delivery-windows-list").innerHTML = list.map((w, i) => `
    <div class="window-row">
      <input type="text" value="${w}" data-idx="${i}" class="window-input" placeholder="e.g. 8am – 1pm" />
      <button class="window-del" data-idx="${i}" onclick="removeWindow(${i})">✕</button>
    </div>`).join("");
  document.querySelectorAll(".window-input").forEach(inp => {
    inp.addEventListener("input", () => {
      settings.deliveryWindows[inp.dataset.idx] = inp.value;
    });
  });
}

window.removeWindow = function(i) {
  settings.deliveryWindows.splice(i, 1);
  renderDeliveryWindows();
};

document.getElementById("add-window-btn").addEventListener("click", () => {
  settings.deliveryWindows = settings.deliveryWindows || [];
  settings.deliveryWindows.push("8am – 1pm");
  renderDeliveryWindows();
});

document.getElementById("save-settings-btn").addEventListener("click", async () => {
  const updated = {
    waNumber:        document.getElementById("s-wa-number").value.trim(),
    email:           document.getElementById("s-email").value.trim(),
    hours:           document.getElementById("s-hours").value.trim(),
    deliveryFee:     parseFloat(document.getElementById("s-delivery-fee").value) || 15,
    cutoff:          document.getElementById("s-cutoff").value,
    freeDelivery:    parseFloat(document.getElementById("s-free-delivery").value) || 0,
    areas:           document.getElementById("s-areas").value.trim(),
    eyebrow:         document.getElementById("s-eyebrow").value.trim(),
    headline:        document.getElementById("s-headline").value.trim(),
    subline:         document.getElementById("s-subline").value.trim(),
    nextDelivery:    document.getElementById("s-next-delivery").value.trim(),
    deliveryWindows: settings.deliveryWindows || [],
    updatedAt:       new Date().toISOString(),
  };
  settings = { ...settings, ...updated };

  if (firebaseReady && !demoMode) {
    try {
      const snap = await getDocs(collection(db, "settings"));
      if (snap.empty) {
        await addDoc(collection(db, "settings"), updated);
      } else {
        await setDoc(doc(db, "settings", snap.docs[0].id), updated);
      }
      toast("Settings saved to Firebase ✓", "success");
    } catch(e) { toast("Save failed: "+e.message, "error"); }
  } else {
    toast("Settings saved (demo mode)", "success");
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  CATCH UPLOAD
// ═══════════════════════════════════════════════════════════════════════════════
let recentCatches = [];

document.getElementById("cu-push-btn")?.addEventListener("click", async () => {
  const name      = document.getElementById("cu-name").value.trim();
  const price     = parseFloat(document.getElementById("cu-price").value);
  const grossWt   = parseFloat(document.getElementById("cu-gross-weight").value) || 1.0;
  const netYield  = document.getElementById("cu-net-yield").value.trim() || "70–75%";
  const stockQty  = parseInt(document.getElementById("cu-stock-qty").value) || 10;
  const avail     = document.querySelector('input[name="cu-avail"]:checked')?.value || "live";

  if (!name)       { toast("Fish name is required", "error"); return; }
  if (isNaN(price)){ toast("Price is required", "error"); return; }

  const FISH_EMOJIS = { large:"🐠", small:"🐟", shellfish:"🦀", shrimp:"🦐" };
  const cat = document.getElementById("cu-category").value;

  const data = {
    name,
    nameAr:      document.getElementById("cu-name-ar").value.trim(),
    subtitle:    document.getElementById("cu-note").value.trim() || "Today's fresh catch",
    emoji:       FISH_EMOJIS[cat] || "🐟",
    price,
    unit:        document.getElementById("cu-unit").value,
    category:    cat,
    badge:       avail === "live" ? "new" : "preorder",
    inStock:     avail === "live",
    preOrder:    avail === "preorder",
    grossWeight: grossWt,
    netYield,
    stockQty,
    catchNote:   document.getElementById("cu-note").value.trim(),
    pushedAt:    new Date().toISOString(),
  };

  const startTime = Date.now();
  const timerEl = document.getElementById("cu-timer");
  timerEl.textContent = "Pushing live…";

  if (firebaseReady && !demoMode) {
    try {
      const ref = await addDoc(collection(db, "products"), { ...data, createdAt: serverTimestamp() });
      products.push({ id: ref.id, ...data });
      toast(`✅ ${name} is now live on the website!`, "success");
    } catch(e) { toast("Push failed: "+e.message, "error"); return; }
  } else {
    products.push({ id: "cu-"+Date.now(), ...data });
    toast(`✅ ${name} pushed live (demo mode)`, "success");
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  timerEl.textContent = `⚡ Pushed in ${elapsed}s`;
  setTimeout(() => { timerEl.textContent = ""; }, 4000);

  recentCatches.unshift(data);
  renderRecentCatches();
  renderProducts(); renderDashboard();

  // Clear form
  ["cu-name","cu-name-ar","cu-price","cu-gross-weight","cu-net-yield","cu-stock-qty","cu-note"]
    .forEach(id => { document.getElementById(id).value = ""; });
  document.querySelector('input[name="cu-avail"][value="live"]').checked = true;
});

function renderRecentCatches() {
  const el = document.getElementById("catch-recent-list");
  if (!el) return;
  const list = recentCatches.slice(0, 6);
  el.innerHTML = list.length ? list.map(c => `
    <div class="catch-recent-item">
      <div class="cri-emoji">${c.emoji}</div>
      <div class="cri-info">
        <div class="cri-name">${c.name}</div>
        <div class="cri-meta">AED ${c.price} ${c.unit} · ${c.grossWeight}kg gross</div>
      </div>
      <span class="cri-status ${c.preOrder?"cri-pre":"cri-live"}">${c.preOrder?"Pre-order":"Live"}</span>
    </div>`).join("")
    : `<p style="font-size:13px;color:var(--muted);padding:20px 0">No catches pushed this session.</p>`;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  WEIGHT ADJUSTER
// ═══════════════════════════════════════════════════════════════════════════════
window.saveActualWeight = async function() {
  if (!viewingOrderId) return;
  const val = parseFloat(document.getElementById("actual-weight-input").value);
  if (isNaN(val) || val <= 0) { toast("Enter a valid weight", "error"); return; }

  const o = orders.find(x => x.id === viewingOrderId);
  if (!o) return;

  const revisedTotal = Math.round((val / (o.items?.[0]?.qty || 1)) * (o.subtotal || 0) * 100) / 100;

  if (firebaseReady && !demoMode) {
    try {
      await updateDoc(doc(db, "orders", viewingOrderId), {
        actualWeight: val, revisedTotal,
        updatedAt: serverTimestamp()
      });
      toast(`Weight saved: ${val}kg · Revised total AED ${revisedTotal}`, "success");
    } catch(e) { toast("Save failed: "+e.message, "error"); return; }
  } else {
    if (o) { o.actualWeight = val; o.revisedTotal = revisedTotal; }
    toast(`Weight saved: ${val}kg (demo)`, "success");
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
//  KITCHEN TICKET
// ═══════════════════════════════════════════════════════════════════════════════
window.printKitchenTicket = function() {
  const o = orders.find(x => x.id === viewingOrderId);
  if (!o) return;

  const items = (o.items || []).map(item => {
    const noteLine = item.notes
      ? `<div class="kt-item-note">⚠️ ${item.notes.toUpperCase()}</div>`
      : "";
    return `
      <div class="kt-item">
        <div class="kt-item-name">${item.productName || item.name || "?"}</div>
        <div class="kt-item-cut">✂ CUT: ${(item.cut || "CLEANED").toUpperCase()}</div>
        ${noteLine}
        <div class="kt-item-qty">Qty: ${item.qty || 1} kg${item.preOrder ? " [PRE-ORDER]" : ""}</div>
      </div>`;
  }).join("");

  const addonLine = (o.addons||[]).length
    ? `<div class="kt-section"><div class="kt-section-label">Add-ons</div>${o.addons.map(a=>`<div>${a.name}</div>`).join("")}</div>`
    : "";

  document.getElementById("kitchen-ticket-print").innerHTML = `
    <div class="kt-header">
      <div class="kt-logo">🐟 FRESHCATCH UAE</div>
      <div class="kt-sub">Kitchen Prep Ticket</div>
      <div class="kt-order-id">Order #${o.orderId || o.id?.slice(0,8) || "—"}</div>
      <div class="kt-date">${new Date().toLocaleString("en-AE", {dateStyle:"medium",timeStyle:"short"})}</div>
    </div>
    <div class="kt-section">
      <div class="kt-section-label">Items to prepare</div>
      ${items}
    </div>
    ${addonLine}
    <div class="kt-section">
      <div class="kt-section-label">Customer</div>
      <div class="kt-customer">
        <strong>${o.customerName || "—"}</strong><br>
        ${o.deliveryDate || ""}<br>
        ${o.deliveryAddress || "Shop pickup"}<br>
        ${o.customerMobile || ""}
      </div>
    </div>
    <div class="kt-footer">Print time: ${new Date().toLocaleTimeString("en-AE")} · FreshCatch UAE</div>`;

  window.print();
};

// ═══════════════════════════════════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════════════════════════════════
function statusBadge(status) {
  const labels = {
    pending: "Pending", confirmed: "Confirmed", preparing: "Preparing",
    out_for_delivery: "Out for delivery", delivered: "Delivered", cancelled: "Cancelled",
  };
  const label = labels[status] || status || "—";
  return `<span class="status-badge s-${status}">${label}</span>`;
}

function fmtDate(val) {
  if (!val) return "—";
  try {
    const d = typeof val?.toDate === "function" ? val.toDate() : new Date(val);
    return d.toLocaleString("en-AE", { day:"numeric", month:"short", hour:"2-digit", minute:"2-digit" });
  } catch { return "—"; }
}

function toast(msg, type = "") {
  const el = Object.assign(document.createElement("div"), { className: `toast ${type}`, textContent: msg });
  document.getElementById("toast-container").appendChild(el);
  requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add("show")));
  setTimeout(() => { el.classList.remove("show"); setTimeout(() => el.remove(), 350); }, 3000);
}
