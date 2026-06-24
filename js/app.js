// ── Firebase imports ─────────────────────────────────────────────────────────
import { initializeApp }   from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore,
         collection, getDocs,
         addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ── Config — replace YOUR_* values with your Firebase project credentials ────
const firebaseConfig = {
  apiKey:            "AIzaSyB3vIp806AsDhTEwSBEKWMcfvOUP6NkBxg",
  authDomain:        "freshcatch-uae.firebaseapp.com",
  projectId:         "freshcatch-uae",
  storageBucket:     "freshcatch-uae.firebasestorage.app",
  messagingSenderId: "192728450319",
  appId:             "1:192728450319:web:f38432714e9fe691deea7a"
};

const WA_NUMBER = "971500000000"; // your WhatsApp business number (no +)

// ── Firebase init — safe fallback if config is still placeholder ──────────────
let db = null, firebaseReady = false;
try {
  if (firebaseConfig.apiKey && firebaseConfig.apiKey !== "YOUR_API_KEY") {
    db = getFirestore(initializeApp(firebaseConfig));
    firebaseReady = true;
  }
} catch (e) { console.warn("Firebase demo mode:", e.message); }

// ═══════════════════════════════════════════════════════════════════════════════
//  DEMO DATA (used when Firebase is not yet configured)
// ═══════════════════════════════════════════════════════════════════════════════
const DEMO = [
  { name:"Hamour",   nameAr:"هامور",  subtitle:"Grouper",      emoji:"🐠", price:48, unit:"per kg",    category:"large",    badge:"best",    inStock:true,  preOrder:false, grossWeight:1.0, netYield:"70–75%", stockQty:12 },
  { name:"Kingfish", nameAr:"كنعد",   subtitle:"Seer fish",    emoji:"🐡", price:62, unit:"per kg",    category:"large",    badge:"preorder",inStock:false, preOrder:true,  grossWeight:1.0, netYield:"65–70%", stockQty:0  },
  { name:"Shaari",   nameAr:"شعري",   subtitle:"Emperorfish",  emoji:"🐟", price:36, unit:"per kg",    category:"large",    badge:"new",     inStock:true,  preOrder:false, grossWeight:1.0, netYield:"72–78%", stockQty:8  },
  { name:"Zubaidi",  nameAr:"زبيدي",  subtitle:"Pomfret",      emoji:"🐠", price:55, unit:"per 500g",  category:"large",    badge:"pop",     inStock:true,  preOrder:false, grossWeight:0.5, netYield:"68–72%", stockQty:6  },
  { name:"Shrimp",   nameAr:"روبيان", subtitle:"XL Prawns",    emoji:"🦐", price:42, unit:"per 500g",  category:"shrimp",   badge:"new",     inStock:true,  preOrder:false, grossWeight:0.5, netYield:"75–80%", stockQty:20 },
  { name:"Blue Crab",nameAr:"قبقب",   subtitle:"Local crab",   emoji:"🦀", price:38, unit:"per piece", category:"shellfish",badge:"low",     inStock:true,  preOrder:false, grossWeight:0.4, netYield:"35–45%", stockQty:3  },
  { name:"Jesh",     nameAr:"جش",     subtitle:"Grey Mullet",  emoji:"🐟", price:28, unit:"per kg",    category:"small",    badge:"preorder",inStock:false, preOrder:true,  grossWeight:1.0, netYield:"65–70%", stockQty:0  },
  { name:"Saafi",    nameAr:"صافي",   subtitle:"Rabbitfish",   emoji:"🐠", price:32, unit:"per kg",    category:"small",    badge:"new",     inStock:true,  preOrder:false, grossWeight:1.0, netYield:"70–75%", stockQty:10 },
];

const CUTS = [
  { id:"whole",   label:"Whole uncut",      emoji:"🐟", note:"As-caught, no processing" },
  { id:"cleaned", label:"Cleaned & gutted", emoji:"🔪", note:"Scaled, gutted, fins off"  },
  { id:"fillet",  label:"Fillet skin-on",   emoji:"🍽️", note:"Boneless, skin kept"       },
  { id:"steaks",  label:"Steaks",           emoji:"🥩", note:"Cross-cut thick slices"    },
  { id:"curry",   label:"Curry cut",        emoji:"🍛", note:"Small pieces for curries"  },
  { id:"custom",  label:"Custom note ✏️",   emoji:"💬", note:"Describe below"            },
];

const ADDONS = [
  { id:"ice",   name:"Ice flakes (2 kg)",         desc:"Keeps fish chilled during transport", price:8  },
  { id:"box",   name:"Insulated foam box",         desc:"Holds cold for 6–8 hours",           price:15 },
  { id:"rice",  name:"Sayadieh rice (serves 4)",   desc:"Ready to heat — traditional recipe", price:25 },
  { id:"spice", name:"Fish spice mix packet",       desc:"Traditional UAE blend",              price:12 },
];

// ═══════════════════════════════════════════════════════════════════════════════
//  STATE
// ═══════════════════════════════════════════════════════════════════════════════
let products = [], cart = [], pdpProduct = null, activeSort = "default", activeCat = "all";

function genOrderId() {
  const y = new Date().getFullYear();
  const n = String(Math.floor(1000 + Math.random() * 9000));
  return `FT-${y}-${n}`;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  DOM REFS
// ═══════════════════════════════════════════════════════════════════════════════
const productGrid  = document.getElementById("product-grid");
const heroCards    = document.getElementById("hero-cards");
const itemCount    = document.getElementById("item-count");
const cartBadge    = document.getElementById("cart-badge");
const cartOverlay  = document.getElementById("cart-overlay");
const cartBody     = document.getElementById("cart-body");
const cartFoot     = document.getElementById("cart-foot");
const pdpOverlay   = document.getElementById("pdp-overlay");
const coOverlay    = document.getElementById("co-overlay");
const searchInput  = document.getElementById("search-input");
const searchDrop   = document.getElementById("search-drop");
const toastCont    = document.getElementById("toast-container");

// ═══════════════════════════════════════════════════════════════════════════════
//  FIREBASE — seed & load
// ═══════════════════════════════════════════════════════════════════════════════
async function seedIfEmpty() {
  if (!firebaseReady) return;
  try {
    const snap = await getDocs(collection(db, "products"));
    if (!snap.empty) return;
    for (const p of DEMO) await addDoc(collection(db, "products"), { ...p, createdAt: serverTimestamp() });
    console.log("Seeded Firestore with demo products.");
  } catch (e) { console.warn("Seed skipped:", e.message); }
}

async function loadProducts() {
  renderSkeletons();
  if (firebaseReady) {
    try {
      await seedIfEmpty();
      const snap = await getDocs(collection(db, "products"));
      products = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (e) {
      console.warn("Firestore unavailable — using demo data");
      products = DEMO.map((p, i) => ({ id: String(i), ...p }));
    }
  } else {
    products = DEMO.map((p, i) => ({ id: String(i), ...p }));
  }
  updateSidebarCounts();
  renderHeroCards();
  applyFilters();
}

// ═══════════════════════════════════════════════════════════════════════════════
//  SIDEBAR COUNTS
// ═══════════════════════════════════════════════════════════════════════════════
function updateSidebarCounts() {
  const cats = ["all","large","small","shellfish","shrimp"];
  cats.forEach(cat => {
    const el = document.getElementById(`sb-cnt-${cat}`);
    if (el) el.textContent = cat === "all" ? products.length : products.filter(p => p.category === cat).length;
  });
  const preEl = document.getElementById("sb-cnt-preorder");
  if (preEl) preEl.textContent = products.filter(p => p.preOrder).length;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  RENDER SKELETON
// ═══════════════════════════════════════════════════════════════════════════════
function renderSkeletons() {
  productGrid.innerHTML = Array(8).fill(0).map(() => `
    <div class="product-card" style="pointer-events:none">
      <div class="skeleton" style="height:130px;border-radius:0"></div>
      <div class="pc-body">
        <div class="skeleton" style="height:16px;width:65%;margin-bottom:8px"></div>
        <div class="skeleton" style="height:11px;width:50%;margin-bottom:14px"></div>
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div class="skeleton" style="height:20px;width:70px"></div>
          <div class="skeleton" style="height:32px;width:32px;border-radius:10px"></div>
        </div>
      </div>
    </div>`).join("");
}

// ═══════════════════════════════════════════════════════════════════════════════
//  HERO CARDS
// ═══════════════════════════════════════════════════════════════════════════════
function renderHeroCards() {
  const featured = products.slice(0, 3);
  heroCards.innerHTML = featured.map(p => `
    <div class="hero-fish-card" data-id="${p.id}" role="button" tabindex="0">
      <div class="hfc-emoji" aria-hidden="true">${p.emoji}</div>
      <div class="hfc-name">${p.name}</div>
      <div class="hfc-ar">${p.nameAr}</div>
      <div class="hfc-price">AED ${p.price}/${p.unit.replace("per ","")}</div>
      <div class="hfc-tag ${p.preOrder?"tag-gold":"tag-teal"}">${p.preOrder?"Pre-order":"In stock"}</div>
    </div>`).join("");
  heroCards.querySelectorAll(".hero-fish-card").forEach(c => {
    const p = products.find(x => x.id === c.dataset.id);
    c.addEventListener("click", () => openPDP(p));
    c.addEventListener("keydown", e => { if (e.key === "Enter") openPDP(p); });
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
//  FILTER + SORT + RENDER PRODUCTS
// ═══════════════════════════════════════════════════════════════════════════════
function applyFilters() {
  let list = activeCat === "all"      ? [...products]
           : activeCat === "preorder" ? products.filter(p => p.preOrder)
           : products.filter(p => p.category === activeCat);

  if (activeSort === "price-asc")  list.sort((a,b) => a.price - b.price);
  if (activeSort === "price-desc") list.sort((a,b) => b.price - a.price);
  if (activeSort === "name")       list.sort((a,b) => a.name.localeCompare(b.name));

  itemCount.textContent = `${list.length} item${list.length !== 1 ? "s" : ""}`;
  renderProducts(list);
}

const BADGE_CLASS = { best:"pb-best", preorder:"pb-pre", new:"pb-new", low:"pb-low", pop:"pb-pop", popular:"pb-pop" };
const BADGE_LABEL = { best:"Best seller", preorder:"Pre-order", new:"In stock", low:"Low stock", pop:"Popular", popular:"Popular" };

function renderProducts(list, container = productGrid) {
  if (!list.length) {
    container.innerHTML = `<p class="products-empty">No items in this category yet.</p>`;
    return;
  }
  container.innerHTML = list.map(p => `
    <article class="product-card" data-id="${p.id}" role="button" tabindex="0" aria-label="View ${p.name}">
      <div class="pc-img ${p.preOrder?"pre-bg":""}">
        ${p.badge ? `<span class="pc-badge ${BADGE_CLASS[p.badge]||"pb-new"}">${BADGE_LABEL[p.badge]||p.badge}</span>` : ""}
        <span aria-hidden="true">${p.emoji}</span>
      </div>
      <div class="pc-body">
        <h3 class="pc-name">${p.name}</h3>
        <p class="pc-ar">${p.nameAr} · ${p.subtitle}</p>
        <div class="pc-foot">
          <div>
            <div class="pc-price ${p.preOrder?"pre":""}">AED ${p.price}</div>
            <div class="pc-unit">${p.unit}</div>
          </div>
          <button class="pc-add ${p.preOrder?"pc-add-gold":"pc-add-teal"}" data-id="${p.id}" aria-label="${p.preOrder?"Pre-order":"Add"} ${p.name}">
            ${p.preOrder
              ? `<svg viewBox="0 0 24 24" stroke-width="2" fill="none" stroke="currentColor" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`
              : `<svg viewBox="0 0 24 24" stroke-width="2.5" fill="none" stroke="currentColor" stroke-linecap="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`
            }
          </button>
        </div>
      </div>
    </article>`).join("");

  container.querySelectorAll(".product-card").forEach(card => {
    card.addEventListener("click", e => {
      if (e.target.closest(".pc-add")) return;
      openPDP(products.find(p => p.id === card.dataset.id));
    });
    card.addEventListener("keydown", e => { if (e.key === "Enter") card.click(); });
  });
  container.querySelectorAll(".pc-add").forEach(btn => {
    btn.addEventListener("click", e => {
      e.stopPropagation();
      openPDP(products.find(p => p.id === btn.dataset.id));
    });
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
//  SIDEBAR CATEGORY FILTER  (called from HTML onclick)
// ═══════════════════════════════════════════════════════════════════════════════
window.setSbCat = function(el) {
  if (!el) return;
  document.querySelectorAll(".sb-item").forEach(i => i.classList.remove("active"));
  el.classList.add("active");
  activeCat = el.dataset.cat || "all";
  applyFilters();
};

// ═══════════════════════════════════════════════════════════════════════════════
//  TOOLBAR SORT  (called from HTML onclick)
// ═══════════════════════════════════════════════════════════════════════════════
window.setSort = function(el) {
  document.querySelectorAll(".t-pill[data-sort]").forEach(p => p.classList.remove("active"));
  el.classList.add("active");
  activeSort = el.dataset.sort || "default";
  applyFilters();
};

// ═══════════════════════════════════════════════════════════════════════════════
//  PRODUCT DETAIL MODAL
// ═══════════════════════════════════════════════════════════════════════════════
function openPDP(p) {
  if (!p) return;
  pdpProduct = p;

  document.getElementById("pdp-vis").className        = `pdp-vis${p.preOrder?" pre":""}`;
  document.getElementById("pdp-emoji").textContent    = p.emoji;
  document.getElementById("pdp-vis-name").textContent = p.name;
  document.getElementById("pdp-vis-ar").textContent   = `${p.nameAr} · ${p.subtitle}`;

  const priceEl = document.getElementById("pdp-price");
  priceEl.textContent = `AED ${p.price}`;
  priceEl.className   = `pdp-price${p.preOrder?" gold":""}`;
  document.getElementById("pdp-unit").textContent = p.unit;

  // Gross / Net weight display
  const weightEl = document.getElementById("pdp-weight-info");
  if (weightEl) {
    const gross = p.grossWeight || 1;
    const net   = p.netYield   || "70–75%";
    weightEl.innerHTML =
      `<span class="wt-tag wt-gross">⚖️ ${gross}kg Gross</span>` +
      `<span class="wt-arrow">→</span>` +
      `<span class="wt-tag wt-net">~${Math.round(gross * parseFloat(net) / 100 * 10) / 10 || ""}kg Net · ${net} yield after cleaning</span>`;
  }

  document.getElementById("pdp-meta").innerHTML =
    `Minimum 1 kg &nbsp;·&nbsp; <strong style="color:${p.preOrder?"var(--gold)":"var(--teal)"}">${p.preOrder?"Pre-order — boats return 48–72 hrs":"In stock · Available today"}</strong>`;
  document.getElementById("pdp-pre-notice").classList.toggle("hidden", !p.preOrder);

  // Stock indicator
  const stockEl = document.getElementById("pdp-stock");
  if (stockEl) {
    const qty = p.stockQty ?? (p.inStock ? 10 : 0);
    if (p.preOrder) {
      stockEl.innerHTML = `<span class="stock-badge stock-pre">⏱ Pre-order · Boats return 48–72 hrs</span>`;
    } else if (qty <= 3) {
      stockEl.innerHTML = `<span class="stock-badge stock-low">🔴 Only ${qty} kg left — order fast</span>`;
    } else {
      stockEl.innerHTML = `<span class="stock-badge stock-in">✓ In stock · ${qty} kg available today</span>`;
    }
  }

  // Cut grid — mandatory selection
  const cutsEl = document.getElementById("pdp-cuts");
  cutsEl.innerHTML = `
    <p class="cuts-label">Select cut style <span class="cuts-req">*required</span></p>
    <div class="cuts-grid">` +
    CUTS.map((c, i) => `
      <div class="cut-opt${i===1?" selected":""}" data-cut="${c.id}" role="radio" aria-checked="${i===1}" tabindex="0">
        <span class="cut-emoji">${c.emoji}</span>
        <span class="cut-lbl">${c.label}</span>
        <span class="cut-note">${c.note}</span>
      </div>`).join("") +
    `</div>`;
  cutsEl.querySelectorAll(".cut-opt").forEach(opt => {
    opt.addEventListener("click", () => {
      cutsEl.querySelectorAll(".cut-opt").forEach(o => { o.classList.remove("selected"); o.setAttribute("aria-checked","false"); });
      opt.classList.add("selected"); opt.setAttribute("aria-checked","true");
    });
    opt.addEventListener("keydown", e => { if (e.key === "Enter") opt.click(); });
  });

  // Add-on fast taps
  const addonsEl = document.getElementById("pdp-addons");
  if (addonsEl) {
    addonsEl.innerHTML = `
      <p class="cuts-label">Quick add-ons</p>
      <div class="pdp-addons-grid">` +
      ADDONS.map(a => `
        <label class="addon-tap">
          <input type="checkbox" data-addon="${a.id}" data-price="${a.price}" />
          <span class="addon-tap-inner">
            <span class="addon-tap-name">${a.name}</span>
            <span class="addon-tap-desc">${a.desc}</span>
            <span class="addon-tap-price">+AED ${a.price}</span>
          </span>
        </label>`).join("") +
      `</div>`;
  }

  document.getElementById("pdp-notes").value = "";
  const cta = document.getElementById("pdp-cta");
  cta.textContent = p.preOrder ? "Pre-order for next catch →" : `Add to cart — AED ${p.price}/${p.unit.replace("per ","")}`;
  cta.className   = `pdp-cta ${p.preOrder?"cta-gold":"cta-teal"}`;

  pdpOverlay.classList.add("open");
  document.body.style.overflow = "hidden";
}

window.closePDP = function() {
  pdpOverlay.classList.remove("open");
  document.body.style.overflow = "";
  pdpProduct = null;
};

document.getElementById("pdp-cta").addEventListener("click", () => {
  if (!pdpProduct) return;
  const cut   = document.querySelector("#pdp-cuts .cut-opt.selected")?.dataset.cut || "cleaned";
  const notes = document.getElementById("pdp-notes").value.trim();
  const selectedAddons = [...document.querySelectorAll("#pdp-addons input[type=checkbox]:checked")]
    .map(cb => ADDONS.find(a => a.id === cb.dataset.addon)).filter(Boolean);
  addToCart(pdpProduct, cut, notes, selectedAddons);
  window.closePDP();
  openCart();
});

// ═══════════════════════════════════════════════════════════════════════════════
//  CART
// ═══════════════════════════════════════════════════════════════════════════════
function cutLabel(id) { return CUTS.find(c => c.id === id)?.label || id; }

function addToCart(p, cut, notes, addons = []) {
  const ex = cart.find(i => i.product.id === p.id && i.cut === cut);
  if (ex) { ex.qty++; toast(`${p.name} qty updated`, "success"); }
  else     { cart.push({ product: p, cut, notes, addons, qty: 1 }); toast(`${p.name} added to cart`, "success"); }
  updateCartBadge();
}

function updateCartBadge() {
  const n = cart.reduce((s,i) => s + i.qty, 0);
  cartBadge.textContent = n;
  cartBadge.style.display = n ? "flex" : "none";
}

function addonTotal()  { return cart.reduce((s,i) => s + (i.addons||[]).reduce((a,x)=>a+x.price,0), 0); }
function cartSubtotal(){ return cart.reduce((s,i) => s + i.product.price * i.qty, 0) + addonTotal(); }

function openCart() {
  renderCart();
  cartOverlay.classList.add("open");
  document.body.style.overflow = "hidden";
}

window.closeCart = function() {
  cartOverlay.classList.remove("open");
  document.body.style.overflow = "";
};

document.getElementById("cart-btn").addEventListener("click", openCart);

function renderCart() {
  const hasPreOrder = cart.some(i => i.product.preOrder);

  if (!cart.length) {
    cartBody.innerHTML = `<p class="cart-empty">Your cart is empty.<br><span style="font-size:12px">Browse today's fresh catch above.</span></p>`;
    cartFoot.innerHTML = "";
    return;
  }

  cartBody.innerHTML = cart.map((item, idx) => `
    <div class="cart-item">
      <div class="ci-thumb${item.product.preOrder?" pre":""}">${item.product.emoji}</div>
      <div class="ci-info">
        <p class="ci-name">${item.product.name}</p>
        <div class="ci-tags">
          ${item.product.preOrder ? `<span class="ci-tag ct-pre">Pre-order</span>` : ""}
          <span class="ci-tag ct-cut">${cutLabel(item.cut)}</span>
        </div>
        ${(item.addons||[]).length ? `<div class="ci-addons">${item.addons.map(a=>`<span class="ci-addon">+${a.name}</span>`).join("")}</div>` : ""}
        ${item.notes ? `<p class="ci-note">"${item.notes}"</p>` : ""}
      </div>
      <div class="ci-right">
        <span class="ci-price${item.product.preOrder?" gold":""}">AED ${item.product.price * item.qty}</span>
        <div class="ci-qty">
          <button class="qty-btn" data-idx="${idx}" data-d="-1" aria-label="Decrease">−</button>
          <span class="qty-num">${item.qty} kg</span>
          <button class="qty-btn" data-idx="${idx}" data-d="1"  aria-label="Increase">+</button>
        </div>
      </div>
    </div>`).join("");

  cartBody.querySelectorAll(".qty-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const i = Number(btn.dataset.idx), d = Number(btn.dataset.d);
      cart[i].qty = Math.max(1, cart[i].qty + d);
      updateCartBadge(); renderCart();
    });
  });

  const sub = cartSubtotal();
  cartFoot.innerHTML = `
    <div class="sum-row"><span>Subtotal</span><span>AED ${sub}</span></div>
    <div class="sum-row"><span>Delivery</span><span>AED 15</span></div>
    ${hasPreOrder ? `<div class="sum-row warn"><span>Pre-order item</span><span>+48–72 hrs</span></div>` : ""}
    <div class="sum-total"><span>Total</span><span>AED ${sub + 15}</span></div>
    <button class="wa-btn" id="go-checkout">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21"/></svg>
      Proceed to WhatsApp checkout
    </button>`;

  document.getElementById("go-checkout").addEventListener("click", () => {
    window.closeCart(); openCheckout();
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
//  CHECKOUT MODAL
// ═══════════════════════════════════════════════════════════════════════════════
function openCheckout() {
  renderCheckout();
  coOverlay.classList.add("open");
  document.body.style.overflow = "hidden";
}

window.closeCheckout = function() {
  coOverlay.classList.remove("open");
  document.body.style.overflow = "";
};

function renderCheckout() {
  const hasPreOrder = cart.some(i => i.product.preOrder);
  document.getElementById("co-items").innerHTML = cart.map(item => `
    <div class="co-item">
      <p class="co-item-name">${item.product.name} · ${item.qty} kg</p>
      <p class="co-item-meta${item.product.preOrder?" gold":""}">${item.product.preOrder?"⏱ Pre-order · ":""}${cutLabel(item.cut)}${item.notes?` · "${item.notes}"`:"" }</p>
      <p class="co-item-price">AED ${item.product.price * item.qty}</p>
    </div>`).join("") + `
    <div class="co-item">
      <p class="co-item-name" style="color:rgba(255,255,255,.4)">Delivery fee</p>
      <p class="co-item-price">AED 15</p>
    </div>`;
  document.getElementById("co-grand").textContent = `AED ${cartSubtotal() + 15}`;
  document.getElementById("co-pre-alert").classList.toggle("hidden", !hasPreOrder);
  updatePreview();
}

// live preview update
function updatePreview() {
  const name    = document.getElementById("co-name")?.value.trim()    || "Customer";
  const address   = document.getElementById("co-address")?.value.trim() || "(address not entered)";
  const delType   = document.querySelector('input[name="del-type"]:checked')?.value || "delivery";
  const payMethod = document.querySelector('input[name="pay-method"]:checked')?.value || "cod";
  const selDate   = document.querySelector(".date-opt.selected");
  const dateStr   = selDate
    ? `${selDate.querySelector(".d-day").textContent} ${selDate.querySelector(".d-num").textContent} Jun · ${selDate.querySelector(".d-slot").textContent}`
    : "Date not selected";

  // show/hide bank details note
  const bankNote = document.getElementById("bank-details-note");
  if (bankNote) bankNote.classList.toggle("hidden", payMethod !== "bank");

  const payLabel = payMethod === "bank" ? "🏦 Bank Transfer" : "💵 Cash on Delivery";

  const lines = cart.map((item, i) => {
    const addonLine = (item.addons||[]).length ? ` + ${item.addons.map(a=>a.name).join(", ")}` : "";
    const noteLine  = item.notes ? ` · "${item.notes}"` : "";
    return `${i+1}. ${item.product.name} ×${item.qty}kg${item.product.preOrder?` <span class="hl">[PRE-ORDER]</span>`:""}` +
           `<br><span class="dim">   Cut: ${cutLabel(item.cut)}${noteLine}${addonLine}</span>`;
  }).join("<br>");

  const deliveryFee = delType === "pickup" ? 0 : 15;

  document.getElementById("msg-preview").innerHTML =
    `<span class="hl">🐟 NEW FRESH FISH ORDER</span><br>` +
    `<span class="dim">──────────────────────</span><br>` +
    `<span class="dim">Type: </span>${delType === "pickup" ? "Shop Pickup" : "Standard Delivery"}<br>` +
    `<span class="dim">Payment: </span><span class="grn">${payLabel}</span><br>` +
    `<span class="dim">──────────────────────</span><br>` +
    lines + `<br>` +
    `<span class="dim">──────────────────────</span><br>` +
    `<span class="dim">Date: </span><span class="grn">${dateStr}</span><br>` +
    `<span class="dim">${delType==="pickup"?"Pickup from shop":"Address: "}${delType!=="pickup"?address:""}</span><br>` +
    `<span class="dim">Name: </span>${name}<br>` +
    `<span class="dim">──────────────────────</span><br>` +
    `Total: <span class="hl">AED ${cartSubtotal() + deliveryFee}</span><br>` +
    `<span class="dim" style="font-size:10px">⚠️ Final price based on actual scale weight</span>`;
}

// expose for HTML onclick date selection
window._updatePreview = updatePreview;

["co-name","co-mobile","co-address"].forEach(id => {
  document.getElementById(id)?.addEventListener("input", updatePreview);
});

document.getElementById("wa-final").addEventListener("click", async () => {
  const name      = document.getElementById("co-name").value.trim();
  const mobile    = document.getElementById("co-mobile").value.trim();
  const address   = document.getElementById("co-address").value.trim();
  const delType   = document.querySelector('input[name="del-type"]:checked')?.value || "delivery";
  const payMethod = document.querySelector('input[name="pay-method"]:checked')?.value || "cod";
  if (!name || !mobile || !address) { toast("Please fill in name, mobile and address"); return; }
  const selDate = document.querySelector(".date-opt.selected");
  if (!selDate) { toast("Please select a delivery date"); return; }
  const dateStr = `${selDate.querySelector(".d-day").textContent} ${selDate.querySelector(".d-num").textContent} Jun · ${selDate.querySelector(".d-slot").textContent}`;

  const orderId     = genOrderId();
  const hasPreOrder = cart.some(i => i.product.preOrder);
  const payLabel    = payMethod === "bank" ? "Bank Transfer" : "Cash on Delivery (COD)";
  const payEmoji    = payMethod === "bank" ? "🏦" : "💵";

  const itemLines = cart.map((item, i) => {
    const addonLine = (item.addons||[]).length
      ? `\n   + Extras: ${item.addons.map(a=>a.name).join(", ")}`
      : "";
    const noteLine = item.notes ? `\n   ✏️ Note: "${item.notes}"` : "";
    return `${i+1}. ${item.product.name} × ${item.qty}kg${item.product.preOrder?" [PRE-ORDER]":""}\n   Cut: ${cutLabel(item.cut)}${noteLine}${addonLine}`;
  }).join("\n");

  const mapsLink = document.getElementById("loc-open-maps")?.href;
  const hasPin   = mapsLink && mapsLink !== "#" && mapsLink.includes("maps.google.com");
  const addrLine = hasPin ? `${address}\n   📍 Map pin: ${mapsLink}` : address;
  const addonSummary = cart.flatMap(i=>i.addons||[]);
  const deliveryFee  = delType === "pickup" ? 0 : 15;

  const msg =
    `🐟 NEW FRESH FISH ORDER\n` +
    `──────────────────────\n` +
    `Order ID: #${orderId}\n` +
    `Type: ${delType === "pickup" ? "Shop Pickup" : "Standard Delivery"}\n` +
    `Payment: ${payEmoji} ${payLabel}\n` +
    `──────────────────────\n` +
    `Items Requested:\n${itemLines}\n` +
    `──────────────────────\n` +
    `Delivery Details:\n` +
    `- Name: ${name}\n` +
    `- Mobile: ${mobile}\n` +
    `- ${delType === "pickup" ? "Pickup from shop" : `Address: ${addrLine}`}\n` +
    `- Date: ${dateStr}\n` +
    `──────────────────────\n` +
    `Subtotal: AED ${cartSubtotal()}\n` +
    `Delivery: AED ${deliveryFee}\n` +
    `Total: AED ${cartSubtotal() + deliveryFee}\n` +
    (payMethod === "bank" ? `\n🏦 Bank transfer details will be shared by our team.\n` : "") +
    (hasPreOrder ? `\n⚠️ Contains pre-order items — final availability confirmed separately.\n` : "") +
    `⚠️ Note: Final price based on actual scale weight at prep time.`;

  try {
    if (firebaseReady) await addDoc(collection(db, "orders"), {
      orderId, customerName: name, customerMobile: mobile,
      deliveryAddress: address, deliveryType: delType,
      paymentMethod: payMethod,
      mapPin: hasPin ? mapsLink : null,
      deliveryDate: dateStr,
      items: cart.map(i => ({
        productId: i.product.id, productName: i.product.name,
        cut: i.cut, notes: i.notes, qty: i.qty,
        price: i.product.price, preOrder: i.product.preOrder,
        addons: (i.addons||[]).map(a=>a.name)
      })),
      addons: addonSummary.map(a=>({name:a.name,price:a.price})),
      subtotal: cartSubtotal(),
      delivery: deliveryFee,
      total: cartSubtotal() + deliveryFee,
      status: "pending", createdAt: serverTimestamp()
    });
  } catch (e) { console.warn("Order not saved:", e.message); }

  window.open(`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`, "_blank");
  cart = []; updateCartBadge(); window.closeCheckout();
  toast(`Order #${orderId} sent via WhatsApp!`, "success");
});

// ═══════════════════════════════════════════════════════════════════════════════
//  SEARCH
// ═══════════════════════════════════════════════════════════════════════════════
searchInput.addEventListener("input", () => {
  const q = searchInput.value.trim().toLowerCase();
  if (!q) { searchDrop.classList.remove("open"); searchDrop.innerHTML = ""; return; }
  const hits = products.filter(p =>
    p.name.toLowerCase().includes(q) || p.nameAr.includes(q) || p.subtitle.toLowerCase().includes(q)
  );
  searchDrop.classList.add("open");
  searchDrop.innerHTML = hits.length
    ? hits.map(p => `
        <div class="sr-item${p.preOrder?" pre":""}" data-id="${p.id}" role="button" tabindex="0">
          <div class="sr-emoji">${p.emoji}</div>
          <div>
            <div class="sr-name">${p.name}</div>
            <div class="sr-sub">${p.nameAr} · ${p.subtitle}</div>
          </div>
          <span class="sr-price${p.preOrder?" pre":""}">AED ${p.price}<br><span style="font-size:10px;font-weight:300">${p.unit}</span></span>
        </div>`).join("")
    : `<p class="sr-empty">No results for "${q}"</p>`;

  searchDrop.querySelectorAll(".sr-item").forEach(item => {
    const handler = () => {
      searchDrop.classList.remove("open");
      searchInput.value = "";
      openPDP(products.find(p => p.id === item.dataset.id));
    };
    item.addEventListener("click", handler);
    item.addEventListener("keydown", e => { if (e.key === "Enter") handler(); });
  });
});

document.addEventListener("click", e => {
  if (!e.target.closest(".search-wrap")) searchDrop.classList.remove("open");
});

// ═══════════════════════════════════════════════════════════════════════════════
//  TOAST
// ═══════════════════════════════════════════════════════════════════════════════
function toast(msg, type = "") {
  const el = Object.assign(document.createElement("div"), { className: `toast ${type}`, textContent: msg });
  toastCont.appendChild(el);
  requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add("show")));
  setTimeout(() => { el.classList.remove("show"); setTimeout(() => el.remove(), 350); }, 2800);
}

// ═══════════════════════════════════════════════════════════════════════════════
//  LOCATION PICKER
// ═══════════════════════════════════════════════════════════════════════════════
const locBtn       = document.getElementById("loc-btn");
const locPreview   = document.getElementById("loc-preview");
const locMapFrame  = document.getElementById("loc-map-frame");
const locMapAddr   = document.getElementById("loc-map-addr");
const locMapCoords = document.getElementById("loc-map-coords");
const locOpenMaps  = document.getElementById("loc-open-maps");
const locMapsLink  = document.getElementById("loc-maps-link");

locBtn.addEventListener("click", async () => {
  if (!navigator.geolocation) {
    toast("Geolocation is not supported by your browser");
    return;
  }
  locBtn.classList.add("loading");
  locBtn.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="animation:spin 1s linear infinite">
      <path d="M21 12a9 9 0 1 1-6.22-8.56"/>
    </svg>
    Detecting…`;

  navigator.geolocation.getCurrentPosition(
    async ({ coords }) => {
      const { latitude: lat, longitude: lng } = coords;
      const mapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;

      // Update "Pin on Google Maps" link to the exact coords
      locMapsLink.href = mapsUrl;

      // Show map embed via OpenStreetMap (no API key needed)
      locMapFrame.innerHTML = `<iframe
        src="https://www.openstreetmap.org/export/embed.html?bbox=${lng-.005},${lat-.005},${lng+.005},${lat+.005}&layer=mapnik&marker=${lat},${lng}"
        loading="lazy" title="Delivery location map">
      </iframe>`;

      // Set coords display
      locMapCoords.textContent = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
      locOpenMaps.href = mapsUrl;
      locPreview.classList.remove("hidden");

      // Reverse geocode via Nominatim (OpenStreetMap, no key needed)
      try {
        const res  = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
          { headers: { "Accept-Language": "en" } }
        );
        const data = await res.json();
        const addr = data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;

        // Fill address field
        const addrInput = document.getElementById("co-address");
        addrInput.value = addr;
        locMapAddr.textContent = addr;
        updatePreview();
        toast("Location detected and address filled", "success");
      } catch {
        // Fallback: just use coordinates
        const fallback = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        document.getElementById("co-address").value = fallback;
        locMapAddr.textContent = "Location pinned (coordinates below)";
        updatePreview();
        toast("Location pinned — address may need editing", "success");
      }

      locBtn.classList.remove("loading");
      locBtn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
        </svg>
        Location detected ✓`;
    },
    (err) => {
      locBtn.classList.remove("loading");
      locBtn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
        </svg>
        Detect my location`;
      const msg = err.code === 1
        ? "Location access denied — please allow location permission"
        : "Could not detect location — enter address manually";
      toast(msg);
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );
});

// CSS spin animation
const spinStyle = document.createElement("style");
spinStyle.textContent = `@keyframes spin { to { transform: rotate(360deg); } }`;
document.head.appendChild(spinStyle);

// ═══════════════════════════════════════════════════════════════════════════════
//  MOBILE CATEGORY CHIP
// ═══════════════════════════════════════════════════════════════════════════════
window.setChip = function(el) {
  document.querySelectorAll(".cat-chip").forEach(c => c.classList.remove("active"));
  el.classList.add("active");
  // sync sidebar
  const cat = el.dataset.cat;
  const sbItem = document.querySelector(`.sb-item[data-cat="${cat}"]`);
  if (sbItem) window.setSbCat(sbItem);
  else { activeCat = cat; applyFilters(); }
};

// ═══════════════════════════════════════════════════════════════════════════════
//  CATCH OF THE DAY PAGE
// ═══════════════════════════════════════════════════════════════════════════════
function populateCatch() {
  const inStock  = products.filter(p => !p.preOrder);
  const preOrder = products.filter(p => p.preOrder);

  // Highlight cards
  const hiEl = document.getElementById("catch-highlights");
  if (hiEl && !hiEl.dataset.filled) {
    hiEl.dataset.filled = "1";
    hiEl.innerHTML = inStock.map(p => `
      <div class="catch-card" data-id="${p.id}" role="button" tabindex="0">
        <div class="catch-card-img">
          <span class="catch-fresh-badge">Fresh today</span>
          ${p.emoji}
        </div>
        <div class="catch-card-body">
          <div class="catch-card-name">${p.name}</div>
          <div class="catch-card-ar">${p.nameAr} · ${p.subtitle}</div>
          <div class="catch-card-price">AED ${p.price}</div>
          <div class="catch-card-unit">${p.unit}</div>
          <button class="catch-card-add" data-id="${p.id}">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add to cart
          </button>
        </div>
      </div>`).join("");

    hiEl.querySelectorAll(".catch-card").forEach(c => {
      c.addEventListener("click", e => {
        if (e.target.closest(".catch-card-add")) return;
        openPDP(products.find(p => p.id === c.dataset.id));
      });
    });
    hiEl.querySelectorAll(".catch-card-add").forEach(btn => {
      btn.addEventListener("click", e => {
        e.stopPropagation();
        openPDP(products.find(p => p.id === btn.dataset.id));
      });
    });
  }

  // Availability grid
  const avEl = document.getElementById("avail-grid");
  if (avEl && !avEl.dataset.filled) {
    avEl.dataset.filled = "1";
    avEl.innerHTML = products.map(p => `
      <div class="avail-card">
        <div class="avail-emoji">${p.emoji}</div>
        <div class="avail-name">${p.name}</div>
        <div class="avail-status ${p.preOrder?"pre":"in"}">${p.preOrder?"⏱ Pre-order":"✓ In stock"}</div>
        <div class="avail-price">AED ${p.price} ${p.unit}</div>
      </div>`).join("");
  }

  // Pre-order grid on catch page
  const pgEl = document.getElementById("preorder-grid");
  if (pgEl && !pgEl.dataset.filled) {
    pgEl.dataset.filled = "1";
    renderProducts(preOrder, pgEl);
  }
}

// expose for HTML onclick (called when catch page is shown)
window._populateCatch = populateCatch;

// ═══════════════════════════════════════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════════════════════════════════════
loadProducts();
updateCartBadge();
