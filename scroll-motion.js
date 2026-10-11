/* cesoi.de — scroll motion (reference implementation, vanilla JS, no deps)
   Markup hooks (add to existing index.html):
     data-line            hero headline line (inside an overflow:hidden wrapper)
     data-reveal="up"     fade + 28px rise when entering viewport (data-delay="ms" optional)
     data-swing="left|right|fade"  work thumbnails slide in from side + rotate, fade in (fade = opacity only)
     data-parallax="-0.14" vertical parallax factor (relative to parent's center)
     data-hero-drift="0.35" hero content drifts down + fades as page scrolls
     data-words + [data-w] children  word-by-word opacity fill
     data-cursor          shows the "View →" follower cursor on hover
     #scroll-bar, #view-cursor, [data-foot], [data-foot-shade], main  (see README) */
(() => {
  // motion always on, regardless of the OS "reduce motion" setting (Cesar's call)
  const reduce = false;
  const k = reduce ? 0 : 1;
  const $$ = (s) => Array.from(document.querySelectorAll(s));
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const EASE_OUT = "cubic-bezier(.2,.8,.2,1)";
  const EASE_IMG = "cubic-bezier(.16,1,.3,1)";

  // Hero headline lines
  $$("[data-line]").forEach((el, i) => {
    el.style.display = "inline-block";
    if (!k) return;
    el.style.transform = "translateY(110%)";
    el.style.transition = `transform 1.2s ${EASE_IMG}`;
    setTimeout(() => (el.style.transform = "translateY(0)"), 200 + i * 130);
  });

  // Reveal on scroll — reversible: hides again once the element drops below the
  // viewport (scrolling back up), so it plays again on the way down
  const show = (el) => {
    el.style.transition = `opacity .75s ${EASE_OUT}, transform 1.2s ${EASE_IMG}`;
    el.style.transitionDelay = (el.dataset.delay || 0) + "ms";
    el.style.opacity = "1"; el.style.transform = "none";
  };
  const hide = (el) => {
    el.style.transition = "none"; el.style.transitionDelay = "0ms";
    el.style.opacity = "0"; el.style.transform = "translateY(28px)";
  };
  if (k) {
    const io = new IntersectionObserver((ents) => ents.forEach((en) => {
      if (en.isIntersecting) show(en.target);
    }), { rootMargin: "0px 0px -8% 0px" });
    const out = new IntersectionObserver((ents) => ents.forEach((en) => {
      if (!en.isIntersecting && en.boundingClientRect.top > 0) hide(en.target);
    }));
    $$("[data-reveal]").forEach((el) => {
      if (el.closest("[data-hero]")) { hide(el); el.offsetHeight; setTimeout(() => show(el), 60); return; }
      if (el.getBoundingClientRect().top >= innerHeight * 0.92) hide(el);   // already in view on load: just appear
      io.observe(el); out.observe(el);
    });
  }

  const bar = document.getElementById("scroll-bar");
  const drift = document.querySelector("[data-hero-drift]");
  const pars = $$("[data-parallax]");
  const swings = $$("[data-swing]");
  const words = $$("[data-words]").map((c) => ({ c, w: Array.from(c.querySelectorAll("[data-w]")) }));
  const main = document.querySelector("main");
  const foot = document.querySelector("[data-foot]");
  const shade = document.querySelector("[data-foot-shade]");
  const narrow = matchMedia("(max-width: 768px)");
  let raf = null;

  const frame = () => {
    raf = null;
    const vh = innerHeight;
    const docH = document.documentElement.scrollHeight - vh;
    if (bar) bar.style.transform = `scaleX(${docH > 0 ? scrollY / docH : 0})`;
    if (!k) return;

    if (drift) {
      const y = Math.max(0, scrollY);
      drift.style.transform = `translateY(${y * parseFloat(drift.dataset.heroDrift)}px)`;
      drift.style.opacity = String(clamp(1 - y / (vh * 0.9)));
    }
    const mob = narrow.matches;                          // mobile: no parallax, half swing
    pars.forEach((el) => {
      if (mob) { el.style.transform = "none"; return; }
      const r = el.parentElement.getBoundingClientRect();
      el.style.transform = `translateY(${(r.top + r.height / 2 - vh / 2) * parseFloat(el.dataset.parallax)}px)`;
    });
    swings.forEach((el) => {
      const r = el.parentElement.getBoundingClientRect();
      const p = clamp((vh - r.top) / (vh * 0.75));      // 0 when parent top hits viewport bottom → 1 after 75% of vh
      const e = 1 - Math.pow(1 - p, 3);                  // ease-out cubic
      const dir = el.dataset.swing === "right" ? 1 : -1;
      const m = el.dataset.swing === "fade" ? 0 : 1 - e;
      el.style.transform = `translateX(${dir * (mob ? 25 : 50) * m}%) rotate(${dir * (mob ? 5 : 10) * m}deg)`;
      el.style.transformOrigin = dir > 0 ? "100% 100%" : "0% 100%";
      el.style.opacity = String(Math.pow(e, 1.4));
    });
    words.forEach(({ c, w }) => {
      const r = c.getBoundingClientRect();
      const p = clamp((vh * 0.85 - r.top) / (r.height + vh * 0.3));
      const n = p * (w.length + 1.5);
      w.forEach((s, i) => (s.style.opacity = String(0.14 + 0.86 * clamp(n - i))));
    });
    if (main && foot && shade) {
      const p = clamp((vh - main.getBoundingClientRect().bottom) / foot.getBoundingClientRect().height);
      shade.style.opacity = String(0.7 * (1 - p));
    }
  };
  const onScroll = () => { if (!raf) raf = requestAnimationFrame(frame); };
  addEventListener("scroll", onScroll, { passive: true });
  addEventListener("resize", onScroll);
  frame();

  // Follower cursor
  const cur = document.getElementById("view-cursor");
  if (cur && matchMedia("(hover: hover)").matches) {
    const s = { mx: -200, my: -200, x: -200, y: -200, sc: 0, t: 0 };
    addEventListener("mousemove", (e) => { s.mx = e.clientX; s.my = e.clientY; });
    $$("[data-cursor]").forEach((el) => {
      el.addEventListener("mouseenter", () => (s.t = 1));
      el.addEventListener("mouseleave", () => (s.t = 0));
    });
    const loop = () => {
      const ease = k ? 0.16 : 1;
      s.x += (s.mx - s.x) * ease; s.y += (s.my - s.y) * ease; s.sc += (s.t - s.sc) * (k ? 0.14 : 1);
      cur.style.transform = `translate(${s.x - 48}px, ${s.y - 48}px) scale(${s.sc.toFixed(3)})`;
      requestAnimationFrame(loop);
    };
    loop();
  }

  // São Paulo clock
  const clock = document.querySelector("[data-clock]");
  if (clock) {
    const fmt = new Intl.DateTimeFormat("en-GB", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
    const tick = () => (clock.textContent = fmt.format(new Date()) + " BRT");
    tick(); setInterval(tick, 1000);
  }
})();
