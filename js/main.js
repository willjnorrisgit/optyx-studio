const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isSmallScreen = () => window.innerWidth <= 760;

// ---------------------------------------------------
// Cubic-bezier easing (mirrors the --ease / --ease-cinematic CSS curves)
// so scroll-linked motion is shaped by the same custom curves used for
// discrete transitions, rather than a raw linear scroll value.
// ---------------------------------------------------
function makeCubicBezier(x1, y1, x2, y2) {
  const A = (a1, a2) => 1 - 3 * a2 + 3 * a1;
  const B = (a1, a2) => 3 * a2 - 6 * a1;
  const C = (a1) => 3 * a1;
  const calcBezier = (t, a1, a2) => ((A(a1, a2) * t + B(a1, a2)) * t + C(a1)) * t;
  const getSlope = (t, a1, a2) => 3 * A(a1, a2) * t * t + 2 * B(a1, a2) * t + C(a1);

  return function easeFn(x) {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 6; i++) {
      const slope = getSlope(t, x1, x2);
      if (Math.abs(slope) < 1e-6) break;
      t -= (calcBezier(t, x1, x2) - x) / slope;
    }
    return calcBezier(t, y1, y2);
  };
}

const easeCinematic = makeCubicBezier(0.65, 0, 0.35, 1);
const easeOutCinematic = makeCubicBezier(0.16, 1, 0.3, 1);
const clamp01 = (n) => Math.min(Math.max(n, 0), 1);

// ---------------------------------------------------
// Intro — letter-by-letter reveal, once per session
// ---------------------------------------------------
const intro = document.getElementById('intro');
const introSkipped = document.documentElement.classList.contains('intro-skip');

if (intro) {
  if (introSkipped) {
    intro.remove();
  } else {
    document.body.classList.add('intro-active');

    // double rAF: ensure the initial (letters hidden) state has painted
    // before adding .run, so the stagger animation actually triggers.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => intro.classList.add('run'));
    });

    const letterCount = intro.querySelectorAll('.intro-letter').length;
    const letterStepMs = 150;
    const letterAnimMs = 1400;
    const holdMs = 1300;
    const exitMs = 1400;
    const totalDelay = letterCount * letterStepMs + letterAnimMs + holdMs;

    window.setTimeout(() => {
      intro.classList.add('exit');
      document.body.classList.remove('intro-active');
      try { sessionStorage.setItem('optyxIntroPlayed', '1'); } catch (e) {}
      window.setTimeout(() => intro.remove(), exitMs + 60);
    }, totalDelay);
  }
}

// ---------------------------------------------------
// Mobile nav toggle
// ---------------------------------------------------
const navToggle = document.getElementById('navToggle');
const mobileNav = document.getElementById('mobileNav');

if (navToggle && mobileNav) {
  navToggle.addEventListener('click', () => {
    const isOpen = mobileNav.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', String(isOpen));
    navToggle.setAttribute('aria-label', isOpen ? 'Close menu' : 'Open menu');
  });

  mobileNav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      mobileNav.classList.remove('open');
      navToggle.setAttribute('aria-expanded', 'false');
      navToggle.setAttribute('aria-label', 'Open menu');
    });
  });
}

// ---------------------------------------------------
// Background videos — skip autoplay under reduced motion (freezes on
// first frame instead of looping).
// ---------------------------------------------------
if (prefersReducedMotion) {
  document.querySelectorAll('.section-video').forEach((video) => {
    video.removeAttribute('autoplay');
    video.pause();
  });
}

// ---------------------------------------------------
// Theme zones — every [data-theme] section boundary becomes a
// scroll-scrubbed mask-wipe zone. Recomputed on load/resize since it
// depends on layout (offsetTop).
// ---------------------------------------------------
const themeSections = Array.from(document.querySelectorAll('[data-theme]'));
const wipeOverlay = document.getElementById('wipeOverlay');
let wipeZones = [];

function computeWipeZones() {
  wipeZones = [];
  const vh = window.innerHeight;
  for (let i = 0; i < themeSections.length - 1; i++) {
    const current = themeSections[i];
    const next = themeSections[i + 1];
    if (current.dataset.theme === next.dataset.theme) continue;
    // Span the wipe across exactly the scroll range where the raw section
    // seam would otherwise be visible in the viewport: from the moment the
    // outgoing section's bottom edge first appears, to the moment the
    // incoming section fully fills the viewport.
    let seamStart = current.offsetTop + current.offsetHeight - vh;
    const seamEnd = next.offsetTop;
    // Sections shorter than one viewport (the punctuation beats) can have
    // their entry and exit seams overlap — clamp so zones never overlap,
    // otherwise the later zone would jump-start mid-progress instead of at 0.
    const prev = wipeZones[wipeZones.length - 1];
    if (prev) seamStart = Math.max(seamStart, prev.end);
    wipeZones.push({ start: seamStart, end: seamEnd, toTheme: next.dataset.theme });
  }
}

function themeAt(y) {
  for (const zone of wipeZones) {
    if (y >= zone.start && y <= zone.end) {
      const t = (y - zone.start) / (zone.end - zone.start);
      const fromTheme = zone.toTheme === 'light' ? 'dark' : 'light';
      return t < 0.5 ? fromTheme : zone.toTheme;
    }
  }
  let current = themeSections[0];
  for (const s of themeSections) {
    if (s.offsetTop <= y + 100) current = s; else break;
  }
  return current ? current.dataset.theme : 'dark';
}

function updateWipe() {
  if (!wipeOverlay) return;
  if (prefersReducedMotion) {
    wipeOverlay.style.display = 'none';
    return;
  }
  const y = window.scrollY;
  const active = wipeZones.find((zone) => y >= zone.start && y <= zone.end);
  if (!active) {
    wipeOverlay.style.display = 'none';
    return;
  }
  const t = clamp01((y - active.start) / (active.end - active.start));
  const eased = easeCinematic(t);
  wipeOverlay.style.display = 'block';
  wipeOverlay.style.background = active.toTheme === 'light' ? 'var(--bg)' : 'var(--bg-black)';
  wipeOverlay.style.clipPath = `circle(${(eased * 150).toFixed(1)}% at 50% 100%)`;
}

// ---------------------------------------------------
// Persistent drifting badge — connective thread through the whole
// scroll sequence, colour-inverting against whatever theme is current.
// ---------------------------------------------------
const badgeDrift = document.getElementById('badgeDrift');

if (badgeDrift && prefersReducedMotion) {
  badgeDrift.style.display = 'none';
}

function updateBadgeDrift() {
  if (!badgeDrift || prefersReducedMotion) return;
  const y = window.scrollY;
  const dx = Math.sin(y * 0.0015) * 220;
  const dy = Math.cos(y * 0.0011) * 140;
  const rot = y * 0.06;
  const scale = 0.85 + Math.sin(y * 0.002) * 0.25;
  badgeDrift.style.transform =
    `translate(calc(-50% + ${dx.toFixed(1)}px), calc(-50% + ${dy.toFixed(1)}px)) rotate(${rot.toFixed(1)}deg) scale(${scale.toFixed(3)})`;
  badgeDrift.classList.toggle('on-light', themeAt(y) === 'light');
}

// ---------------------------------------------------
// Cinematic scroll engine — fade in/out, parallax, Ken Burns, depth
// drift. Everything is a direct function of scroll position (no CSS
// transition racing a moving target), eased through the cubic-bezier
// curves above.
// ---------------------------------------------------
const revealEls = document.querySelectorAll('.reveal');
const parallaxEls = document.querySelectorAll('.parallax-layer');
const kenburnsEls = document.querySelectorAll('.kenburns-media');

function updateReveal(el, vh) {
  if (prefersReducedMotion) {
    el.style.opacity = 1;
    el.style.transform = '';
    return;
  }
  const rect = el.getBoundingClientRect();
  const centerNorm = (rect.top + rect.height / 2) / vh;

  let opacity = 1;
  let rise = 0;

  if (centerNorm > 0.9) {
    // entering from below the fold
    const t = clamp01((1.15 - centerNorm) / 0.25);
    const eased = easeOutCinematic(t);
    opacity = eased;
    rise = (1 - eased) * 28;
  } else if (centerNorm < 0.15) {
    // exiting past the top
    const t = clamp01((centerNorm + 0.15) / 0.3);
    const eased = easeCinematic(t);
    opacity = eased;
    rise = -(1 - eased) * 28;
  }

  // optional depth-drift: foreground content in the video beats moves
  // at its own speed, distinct from the near-static background video
  // and the slower-drifting big background type.
  let drift = 0;
  const speed = parseFloat(el.dataset.speed || '0');
  if (speed && !isSmallScreen()) {
    const centerOffset = rect.top + rect.height / 2 - vh / 2;
    drift = -centerOffset * speed;
  }

  el.style.opacity = opacity.toFixed(3);
  el.style.transform = `translateY(${(rise + drift).toFixed(2)}px)`;
}

function updateParallax(el, vh) {
  if (prefersReducedMotion || isSmallScreen()) {
    el.style.transform = '';
    return;
  }
  const speed = parseFloat(el.dataset.speed || '0.25');
  const rect = el.getBoundingClientRect();
  const centerOffset = rect.top + rect.height / 2 - vh / 2;
  el.style.transform = `translate3d(0, ${(-centerOffset * speed).toFixed(2)}px, 0)`;
}

function updateKenBurns(el, vh) {
  if (prefersReducedMotion) {
    el.style.transform = '';
    return;
  }
  const intensity = isSmallScreen() ? 0.5 : 1;
  const rect = el.getBoundingClientRect();
  const centerNorm = clamp01((vh - rect.top) / (vh + rect.height));
  const eased = easeCinematic(centerNorm);

  const scale = 1 + 0.1 * eased * intensity;
  const shiftX = (eased - 0.5) * 18 * intensity;
  const tilt = (eased - 0.5) * 3 * intensity;

  el.style.transform = `scale(${scale.toFixed(3)}) translateX(${shiftX.toFixed(2)}px) rotate(${tilt.toFixed(2)}deg)`;
}

let ticking = false;
function runScrollFx() {
  const vh = window.innerHeight;
  revealEls.forEach((el) => updateReveal(el, vh));
  parallaxEls.forEach((el) => updateParallax(el, vh));
  kenburnsEls.forEach((el) => updateKenBurns(el, vh));
  updateWipe();
  updateBadgeDrift();
  ticking = false;
}

function onScrollOrResize() {
  if (!ticking) {
    requestAnimationFrame(runScrollFx);
    ticking = true;
  }
}

function onResize() {
  computeWipeZones();
  onScrollOrResize();
}

computeWipeZones();
window.addEventListener('scroll', onScrollOrResize, { passive: true });
window.addEventListener('resize', onResize);
runScrollFx();
// re-run once fonts/layout settle, so initial positions/zones are accurate
window.addEventListener('load', () => {
  computeWipeZones();
  runScrollFx();
});

// ---------------------------------------------------
// Contact form — placeholder handling until a real backend
// (e.g. Formspree, Netlify Forms) is wired up to the `contactForm` action.
// ---------------------------------------------------
const contactForm = document.getElementById('contactForm');
const formNote = document.getElementById('formNote');

if (contactForm && formNote) {
  contactForm.addEventListener('submit', (event) => {
    event.preventDefault();
    formNote.textContent =
      "Thanks — this form isn't connected yet. Please email optyxstudio@gmail.com in the meantime.";
    contactForm.reset();
  });
}

// Footer year
const yearEl = document.getElementById('year');
if (yearEl) {
  yearEl.textContent = new Date().getFullYear();
}
