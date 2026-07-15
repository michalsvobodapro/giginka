// Giginka — champion-party vizitka logic.
// Loads content.json (single source of truth), renders every data-driven
// section, and wires the funky bits: confetti, sticker overlays, an
// easter-egg toast and a keyboard-navigable lightbox. Vanilla JS, no deps.

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const PARTY = ["#E08A3C", "#F06CA8", "#3FA96A", "#FFC94D", "#7A4FA3", "#FFFDF8"];

let CONTENT = null;

/* ---------- SVG builders ---------- */

function gearPath(cx, cy, rOut, rIn, teeth) {
  let d = "";
  const step = Math.PI / teeth;
  for (let i = 0; i < teeth * 2; i++) {
    const r = i % 2 === 0 ? rOut : rIn;
    const a = i * step - Math.PI / 2;
    const x = (cx + Math.cos(a) * r).toFixed(1);
    const y = (cy + Math.sin(a) * r).toFixed(1);
    d += (i === 0 ? "M" : "L") + x + " " + y;
  }
  return d + "Z";
}

// A prize rosette: pleated gold medal + candy ribbon tails + "A3" center.
function rosetteSVG() {
  return `<svg viewBox="0 0 100 130" role="img" aria-label="A3 championská rozeta">
    <path d="M44 70 L30 126 L40 116 L46 127 L50 80 Z" fill="#F06CA8" stroke="#3A2417" stroke-width="2.4" stroke-linejoin="round"/>
    <path d="M56 70 L70 126 L60 116 L54 127 L50 80 Z" fill="#D24488" stroke="#3A2417" stroke-width="2.4" stroke-linejoin="round"/>
    <path d="${gearPath(50, 47, 41, 33, 18)}" fill="#E08A3C" stroke="#3A2417" stroke-width="2.6" stroke-linejoin="round"/>
    <circle cx="50" cy="47" r="28" fill="#FFC94D" stroke="#3A2417" stroke-width="2.4"/>
    <circle cx="50" cy="47" r="20" fill="#FFFDF8" stroke="#3A2417" stroke-width="2"/>
    <text x="50" y="55" text-anchor="middle" font-family="'Baloo 2',sans-serif" font-weight="800" font-size="21" fill="#B96417">A3</text>
  </svg>`;
}

function starburst(color) {
  return `<path d="${gearPath(50, 50, 48, 26, 12)}" fill="${color}" stroke="#3A2417" stroke-width="3" stroke-linejoin="round"/>`;
}

// Sticker overlays keyed by persona type. Each returns [{cls, svg}].
function stickersFor(type) {
  const sparkle = (x, y, s, c) =>
    `<path transform="translate(${x} ${y}) scale(${s})" d="M0 -10 Q1.5 -1.5 10 0 Q1.5 1.5 0 10 Q-1.5 1.5 -10 0 Q-1.5 -1.5 0 -10 Z" fill="${c}" stroke="#3A2417" stroke-width="1.4"/>`;
  const sparkleLayer = {
    cls: "sticker--sparkles",
    svg: `<svg viewBox="0 0 100 130" preserveAspectRatio="none">
      ${sparkle(16, 22, 1.1, "#FFC94D")}${sparkle(84, 30, 1.4, "#FFFDF8")}
      ${sparkle(76, 100, 1, "#F06CA8")}${sparkle(20, 92, 1.2, "#FFC94D")}
      ${sparkle(90, 66, .8, "#FFFDF8")}</svg>`,
  };
  switch (type) {
    case "crown":
      return [
        { cls: "sticker--crown", svg: `<svg viewBox="0 0 100 66">
          <path d="M8 58 L14 20 L34 42 L50 8 L66 42 L86 20 L92 58 Z" fill="#FFC94D" stroke="#3A2417" stroke-width="3.5" stroke-linejoin="round"/>
          <rect x="8" y="56" width="84" height="10" rx="4" fill="#FFC94D" stroke="#3A2417" stroke-width="3.5"/>
          <circle cx="50" cy="8" r="6" fill="#F06CA8" stroke="#3A2417" stroke-width="3"/>
          <circle cx="30" cy="61" r="3.5" fill="#F06CA8"/><circle cx="50" cy="61" r="3.5" fill="#3FA96A"/><circle cx="70" cy="61" r="3.5" fill="#F06CA8"/>
        </svg>` },
        sparkleLayer,
      ];
    case "horns":
      return [{ cls: "sticker--horns", svg: `<svg viewBox="0 0 150 60">
        <path d="M40 58 C22 46 14 22 20 4 C36 12 46 34 48 58 Z" fill="#D63B3B" stroke="#3A2417" stroke-width="4" stroke-linejoin="round"/>
        <path d="M110 58 C128 46 136 22 130 4 C114 12 104 34 102 58 Z" fill="#D63B3B" stroke="#3A2417" stroke-width="4" stroke-linejoin="round"/>
      </svg>` }];
    case "cape":
      return [
        { cls: "sticker--cape", svg: `<svg viewBox="0 0 120 120">
          <path d="M20 6 C6 46 4 86 30 116 C40 96 44 60 40 8 Z" fill="#7A4FA3" stroke="#3A2417" stroke-width="4" stroke-linejoin="round"/>
          <path d="M40 8 C60 42 62 84 52 118 C74 92 78 48 66 6 Z" fill="#F06CA8" stroke="#3A2417" stroke-width="4" stroke-linejoin="round"/>
        </svg>` },
        { cls: "sticker--pow", svg: `<svg viewBox="0 0 100 100">
          ${starburst("#FFC94D")}
          <text x="50" y="58" text-anchor="middle" font-family="'Baloo 2',sans-serif" font-weight="800" font-size="24" fill="#D24488" transform="rotate(-8 50 50)">POW!</text>
        </svg>` },
      ];
    case "grr":
      return [{ cls: "sticker--pow", svg: `<svg viewBox="0 0 100 100">
        ${starburst("#D63B3B")}
        <text x="50" y="58" text-anchor="middle" font-family="'Baloo 2',sans-serif" font-weight="800" font-size="26" fill="#fff" transform="rotate(-8 50 50)">GRR!</text>
      </svg>` }];
    case "star":
      return [{ cls: "sticker--star", svg: `<svg viewBox="0 0 100 100">${starburst("#FFC94D")}
        <path d="M50 24 L57 44 L78 44 L61 57 L67 78 L50 65 L33 78 L39 57 L22 44 L43 44 Z" fill="#fff" stroke="#3A2417" stroke-width="2"/></svg>` }];
    case "sparkles":
    default:
      return [sparkleLayer];
  }
}

function icon(name) {
  const s = 'stroke="#B96417" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"';
  switch (name) {
    case "shield":
      return `<svg viewBox="0 0 24 24"><path ${s} d="M12 2 20 5v6c0 5-3.4 8.5-8 11-4.6-2.5-8-6-8-11V5z"/><path ${s} d="M9 12l2 2 4-4"/></svg>`;
    case "bolt":
      return `<svg viewBox="0 0 24 24"><path ${s} d="M13 2 4 14h6l-1 8 9-12h-6z"/></svg>`;
    default:
      return `<svg viewBox="0 0 24 24"><circle ${s} cx="12" cy="12" r="9"/></svg>`;
  }
}

/* ---------- Renderers ---------- */

function renderMarquee() {
  const track = document.getElementById("marquee-track");
  const items = CONTENT.marquee || [];
  const one = items.map((t) => `<span class="marquee-item"><span class="dot">✦</span>${t}</span>`).join("");
  track.innerHTML = one + one; // duplicate for seamless loop
}

function renderHero() {
  const h = CONTENT.hero || {};
  document.getElementById("hero-kicker").textContent = h.kicker || "";
  document.getElementById("hero-name").textContent = h.name || "Giginka";
  document.getElementById("hero-subtitle").textContent = h.subtitle || "";
  document.getElementById("badge-l1").textContent = h.badge_line1 || "A3";
  document.getElementById("badge-l2").textContent = h.badge_line2 || "CHAMPIONKA";
  if (h.image) document.getElementById("hero-bg").style.backgroundImage = `url("${h.image}")`;
  document.getElementById("a3-rosette").innerHTML = rosetteSVG();
}

function renderVizitka() {
  const v = CONTENT.vizitka || {};
  const img = document.getElementById("vcard-img");
  img.src = v.photo || "";
  img.alt = v.photo_alt || "";
  document.getElementById("vcard-stamp").textContent = v.stamp || "";
  const dl = document.getElementById("vcard-rows");
  dl.innerHTML = "";
  (v.rows || []).forEach((r) => {
    const row = document.createElement("div");
    row.className = "vrow";
    const dt = document.createElement("dt");
    dt.textContent = r.label;
    const dd = document.createElement("dd");
    dd.textContent = r.value;
    if (r.note) {
      const note = document.createElement("span");
      note.className = "note";
      note.textContent = r.note;
      dd.appendChild(note);
    }
    row.append(dt, dd);
    dl.appendChild(row);
  });
}

function renderTimeline() {
  const wrap = document.getElementById("timeline");
  wrap.innerHTML = "";
  (CONTENT.timeline || []).forEach((s) => {
    const step = document.createElement("div");
    step.className = "tl-step" + (s.climax ? " climax" : "");
    const media = document.createElement("div");
    media.className = "tl-media";
    media.innerHTML =
      `<img loading="lazy" src="${s.image}" alt="${s.alt || ""}">` +
      (s.tag ? `<span class="tl-tag">${s.tag}</span>` : "");
    const node = document.createElement("div");
    node.className = "tl-node";
    const text = document.createElement("p");
    text.className = "tl-text";
    text.textContent = s.caption;
    step.append(media, node, text);
    wrap.appendChild(step);
  });
}

function renderPersonas() {
  const grid = document.getElementById("persona-grid");
  grid.innerHTML = "";
  (CONTENT.personas || []).forEach((p) => {
    const card = document.createElement("article");
    card.className = "persona";
    const stickers = stickersFor(p.sticker)
      .map((s) => `<span class="sticker ${s.cls}">${s.svg}</span>`)
      .join("");
    const posStyle = p.object_position ? ` style="object-position:${p.object_position}"` : "";
    card.innerHTML =
      `<div class="persona-photo"><img loading="lazy" src="${p.image}" alt="${p.alt || ""}"${posStyle}>${stickers}</div>` +
      `<div class="persona-body"><span class="persona-role">${p.role}</span><p>${p.line}</p></div>`;
    grid.appendChild(card);
  });
}

function renderPalmares() {
  const pm = CONTENT.palmares || {};
  const hero = pm.hero || {};
  document.getElementById("ach-rosette").innerHTML = rosetteSVG();
  document.getElementById("ach-title").textContent = hero.title || "";
  document.getElementById("ach-desc").textContent = hero.desc || "";
  const grid = document.getElementById("ach-grid");
  grid.innerHTML = "";
  (pm.items || []).forEach((it) => {
    const card = document.createElement("div");
    card.className = "ach-card";
    const ico = it.image
      ? `<div class="ach-ico photo"><img loading="lazy" src="${it.image}" alt="${it.alt || ""}"></div>`
      : `<div class="ach-ico">${icon(it.icon)}</div>`;
    card.innerHTML = ico + `<h4>${it.title}</h4><p>${it.desc}</p>`;
    grid.appendChild(card);
  });
}

function renderGallery() {
  const grid = document.getElementById("gallery");
  grid.innerHTML = "";
  (CONTENT.gallery || []).forEach((item) => {
    const fig = document.createElement("figure");
    fig.innerHTML =
      `<img loading="lazy" src="${item.src}" alt="${item.caption || ""}">` +
      `<figcaption>${item.caption || ""}</figcaption>`;
    grid.appendChild(fig);
  });
}

function renderFooter() {
  document.getElementById("footer-line").textContent = CONTENT.footer || "";
  document.getElementById("year").textContent = new Date().getFullYear();
}

/* ---------- Confetti ---------- */

const confetti = (() => {
  if (reduceMotion) return { fire: () => {} };
  const canvas = document.createElement("canvas");
  canvas.id = "confetti-canvas";
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  let parts = [];
  let running = false;

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener("resize", resize);

  function loop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    parts = parts.filter((p) => p.life > 0 && p.y < canvas.height + 40);
    parts.forEach((p) => {
      p.vy += 0.16;
      p.vx *= 0.99;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      p.life -= 0.006;
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, p.life));
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 0.6);
      ctx.restore();
    });
    if (parts.length) {
      requestAnimationFrame(loop);
    } else {
      running = false;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  function fire(x, y, amount = 90) {
    for (let i = 0; i < amount; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 4 + Math.random() * 9;
      parts.push({
        x, y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 5,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.4,
        s: 6 + Math.random() * 8,
        color: PARTY[(Math.random() * PARTY.length) | 0],
        life: 1,
      });
    }
    if (!running) {
      running = true;
      requestAnimationFrame(loop);
    }
  }
  return { fire };
})();

/* ---------- Easter-egg toast ---------- */

let toastTimer = null;
let eggIdx = 0;
function showToast() {
  const eggs = CONTENT.eastereggs || [];
  if (!eggs.length) return;
  const el = document.getElementById("toast");
  el.textContent = eggs[eggIdx % eggs.length];
  eggIdx++;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 3200);
}

/* ---------- Lightbox ---------- */

(() => {
  const lightbox = document.getElementById("lightbox");
  const lightboxImg = document.getElementById("lightbox-img");
  const counter = document.getElementById("lightbox-counter");
  const gallery = document.getElementById("gallery");
  let idx = 0;
  let photos = [];

  function refresh() {
    photos = Array.from(gallery.querySelectorAll("figure")).map((f) => ({
      src: f.querySelector("img").src,
      caption: f.querySelector("figcaption")?.textContent ?? "",
    }));
  }
  function show(i) {
    if (!photos.length) refresh();
    idx = (i + photos.length) % photos.length;
    lightboxImg.src = photos[idx].src;
    lightboxImg.alt = photos[idx].caption;
    counter.textContent = `${idx + 1} / ${photos.length}`;
  }
  function open(i) { refresh(); show(i); lightbox.classList.add("is-open"); lightbox.setAttribute("aria-hidden", "false"); document.body.style.overflow = "hidden"; }
  function close() { lightbox.classList.remove("is-open"); lightbox.setAttribute("aria-hidden", "true"); document.body.style.overflow = ""; }

  gallery.addEventListener("click", (e) => {
    const fig = e.target.closest("figure");
    if (!fig) return;
    open(Array.from(gallery.querySelectorAll("figure")).indexOf(fig));
  });
  document.getElementById("lightbox-close").addEventListener("click", close);
  document.getElementById("lightbox-prev").addEventListener("click", (e) => { e.stopPropagation(); show(idx - 1); });
  document.getElementById("lightbox-next").addEventListener("click", (e) => { e.stopPropagation(); show(idx + 1); });
  lightbox.addEventListener("click", (e) => { if (e.target === lightbox) close(); });
  document.addEventListener("keydown", (e) => {
    if (!lightbox.classList.contains("is-open")) return;
    if (e.key === "Escape") close();
    else if (e.key === "ArrowRight") show(idx + 1);
    else if (e.key === "ArrowLeft") show(idx - 1);
  });
})();

/* ---------- Wire-up ---------- */

// Show-more gallery toggle
document.getElementById("gallery-more-btn").addEventListener("click", () => {
  const gallery = document.getElementById("gallery");
  const label = document.getElementById("gallery-more-label");
  const expanded = gallery.classList.toggle("expanded");
  label.textContent = expanded ? "Míň fotek" : "Ukaž víc fotek";
});

// A3 badge → confetti + rosette pop
document.getElementById("a3-badge").addEventListener("click", (e) => {
  const r = e.currentTarget.getBoundingClientRect();
  confetti.fire(r.left + r.width / 2, r.top + r.height / 2, 130);
  const ros = document.getElementById("a3-rosette");
  if (!reduceMotion) { ros.classList.remove("pop"); void ros.offsetWidth; ros.classList.add("pop"); }
});

// Hero photo click → easter-egg toast
document.getElementById("hero-bg").addEventListener("click", showToast);

function renderAll() {
  renderMarquee();
  renderHero();
  renderVizitka();
  renderTimeline();
  renderPersonas();
  renderPalmares();
  renderGallery();
  renderFooter();
}

fetch("content.json")
  .then((r) => r.json())
  .then((data) => {
    CONTENT = data;
    renderAll();

    // Confetti welcome burst — from the A3 badge, same origin as clicking it
    if (!reduceMotion) {
      setTimeout(() => {
        const b = document.getElementById("a3-badge");
        if (!b) return;
        const r = b.getBoundingClientRect();
        confetti.fire(r.left + r.width / 2, r.top + r.height / 2, 140);
      }, 350);
    }

    // Fade-in reveal on scroll
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
      });
    }, { threshold: 0.08 });
    document.querySelectorAll(".vcard, .tl-step, .persona, .ach-hero, .ach-card, .gallery figure")
      .forEach((el, i) => {
        el.classList.add("fade-in");
        el.style.transitionDelay = (Math.min(i, 8) * 45) + "ms";
        io.observe(el);
      });
  })
  .catch((err) => {
    console.error("Nepodařilo se načíst content.json", err);
    document.querySelector(".hero-inner").innerHTML =
      "<p style='color:#fff;padding:2rem;text-align:center'>Obsah se nenačetl. Spusť přes lokální server (např. <code>python3 -m http.server</code>), ne přes <code>file://</code>.</p>";
  });
