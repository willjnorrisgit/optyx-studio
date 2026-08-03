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
    const letterStepMs = 65;
    const letterAnimMs = 700;
    const holdMs = 550;
    const exitMs = 900;
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
// Hero video — skip autoplay under reduced motion (freezes on first frame)
// ---------------------------------------------------
const heroVideo = document.querySelector('.hero-video');
if (heroVideo && prefersReducedMotion) {
  heroVideo.removeAttribute('autoplay');
  heroVideo.pause();
}

// ---------------------------------------------------
// Header theme — swaps from light-on-dark (over the video hero) to
// dark-on-light (over the rest of the page) as the user scrolls past it.
// ---------------------------------------------------
const siteHeader = document.querySelector('.site-header');
const heroSection = document.getElementById('hero');

function updateHeaderTheme() {
  if (!siteHeader || !heroSection) return;
  const threshold = heroSection.offsetHeight - siteHeader.offsetHeight;
  siteHeader.classList.toggle('is-light', window.scrollY > threshold);
}

// ---------------------------------------------------
// Cinematic scroll engine — fade in/out, parallax, Ken Burns.
// Everything is a direct function of scroll position (no CSS transition
// racing a moving target), eased through the cubic-bezier curves above.
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

  el.style.opacity = opacity.toFixed(3);
  el.style.transform = `translateY(${rise.toFixed(2)}px)`;
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
  updateHeaderTheme();
  ticking = false;
}

function onScrollOrResize() {
  if (!ticking) {
    requestAnimationFrame(runScrollFx);
    ticking = true;
  }
}

window.addEventListener('scroll', onScrollOrResize, { passive: true });
window.addEventListener('resize', onScrollOrResize);
runScrollFx();
// re-run once fonts/layout settle, so initial positions are accurate
window.addEventListener('load', runScrollFx);

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
      "Thanks — this form isn't connected yet. Please email hello@optyxstudio.com in the meantime.";
    contactForm.reset();
  });
}

// Footer year
const yearEl = document.getElementById('year');
if (yearEl) {
  yearEl.textContent = new Date().getFullYear();
}
