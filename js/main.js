const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isSmallScreen = () => window.innerWidth <= 760;

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
// Motion system — GSAP + ScrollTrigger + Lenis. Skipped entirely under
// prefers-reduced-motion: every section keeps its own static CSS
// background/opacity (the .reveal / [data-theme] defaults already in
// styles.css), so that fallback needs no JS branching of its own.
// ---------------------------------------------------
if (!prefersReducedMotion && window.gsap && window.ScrollTrigger) {
  gsap.registerPlugin(ScrollTrigger);
  document.body.classList.add('motion-active');

  let lenis = null;
  if (window.Lenis) {
    lenis = new Lenis({ autoRaf: false, duration: 1.1 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', (event) => {
      const id = link.getAttribute('href');
      if (!id || id === '#') return;
      const target = document.querySelector(id);
      if (!target) return;
      event.preventDefault();
      const header = document.querySelector('.site-header');
      const offset = header ? -header.offsetHeight : 0;
      if (lenis) {
        lenis.scrollTo(target, { offset, duration: 1.4 });
      } else {
        target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });

  // ---------------------------------------------------
  // Theme lookup — shared by the persistent badge and (indirectly) the
  // background-rhythm zones below.
  // ---------------------------------------------------
  const themeSections = Array.from(document.querySelectorAll('[data-theme]'));

  function themeAt(y) {
    let current = themeSections[0];
    for (const section of themeSections) {
      if (section.offsetTop <= y + window.innerHeight * 0.5) current = section;
      else break;
    }
    return current ? current.dataset.theme : 'dark';
  }

  // ---------------------------------------------------
  // Header — hides on scroll down, reappears on scroll up. Persistent
  // drifting badge rides the same master scroll listener.
  // ---------------------------------------------------
  const header = document.querySelector('.site-header');
  const badgeDrift = document.getElementById('badgeDrift');
  let headerHidden = false;

  function updateHeader(y, direction) {
    if (!header) return;
    const shouldHide = y > 80 && direction === 1;
    if (shouldHide === headerHidden) return;
    headerHidden = shouldHide;
    gsap.to(header, {
      yPercent: shouldHide ? -100 : 0,
      autoAlpha: shouldHide ? 0 : 1,
      duration: 0.5,
      ease: 'power3.out',
      overwrite: true,
    });
  }

  function updateBadgeDrift(y) {
    if (!badgeDrift) return;
    const dx = Math.sin(y * 0.0015) * 220;
    const dy = Math.cos(y * 0.0011) * 140;
    const rot = y * 0.06;
    const scale = 0.85 + Math.sin(y * 0.002) * 0.25;
    badgeDrift.style.transform =
      `translate(calc(-50% + ${dx.toFixed(1)}px), calc(-50% + ${dy.toFixed(1)}px)) rotate(${rot.toFixed(1)}deg) scale(${scale.toFixed(3)})`;
    badgeDrift.classList.toggle('on-light', themeAt(y) === 'light');
  }

  ScrollTrigger.create({
    start: 0,
    end: () => document.documentElement.scrollHeight - window.innerHeight,
    onUpdate(self) {
      const y = self.scroll();
      updateHeader(y, self.direction);
      updateBadgeDrift(y);
    },
  });

  // ---------------------------------------------------
  // Hero logo — scroll-scrubbed parallax follow + fade as the hero
  // gives way to the next section.
  // ---------------------------------------------------
  const hero = document.getElementById('hero');
  const heroLogo = document.querySelector('.hero-logo');

  if (hero && heroLogo) {
    gsap.to(heroLogo, {
      yPercent: -55,
      autoAlpha: 0,
      ease: 'none',
      scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true },
    });
  }

  // ---------------------------------------------------
  // Background rhythm — a fixed field behind everything, crossfaded
  // continuously via scroll-scrubbed colour tweens. Each transition spans
  // roughly one-and-a-half sections' worth of scroll distance, centred on
  // (not locked to) the actual section seam, so the shift feels like it
  // flows through the content rather than snapping at a hard boundary.
  // ---------------------------------------------------
  const bgField = document.getElementById('bgField');

  if (bgField) {
    const rootStyle = getComputedStyle(document.documentElement);
    const colorDark = rootStyle.getPropertyValue('--bg-black').trim();
    const colorLight = rootStyle.getPropertyValue('--bg').trim();
    const colorOf = (theme) => (theme === 'light' ? colorLight : colorDark);

    gsap.set(bgField, { backgroundColor: colorOf(themeSections[0] ? themeSections[0].dataset.theme : 'dark') });

    let prevEndFn = () => 0;
    for (let i = 0; i < themeSections.length - 1; i++) {
      const current = themeSections[i];
      const next = themeSections[i + 1];
      if (current.dataset.theme === next.dataset.theme) continue;

      // Freeze the current prevEndFn reference per-iteration: startFn is only
      // invoked later (lazily, by ScrollTrigger), by which point the loop has
      // already finished and a shared mutable variable would just hold the
      // last iteration's value for every closure.
      const capturedPrevEnd = prevEndFn;
      const span = () => (document.documentElement.scrollHeight / themeSections.length) * 1.5;
      const startFn = () => Math.max(next.offsetTop - span() / 2, capturedPrevEnd());
      const endFn = () => next.offsetTop + span() / 2;

      gsap.fromTo(
        bgField,
        { backgroundColor: colorOf(current.dataset.theme) },
        {
          backgroundColor: colorOf(next.dataset.theme),
          ease: 'none',
          scrollTrigger: { start: startFn, end: endFn, scrub: true },
        }
      );

      prevEndFn = endFn;
    }
  }

  // ---------------------------------------------------
  // Typography — word-level reveal with a slight upward move and a
  // blur-to-sharp finish. Runs once per element on scroll-in.
  // Accessibility: the original text is preserved via aria-label on the
  // element and the visual split spans are hidden from assistive tech.
  // ---------------------------------------------------
  function splitWords(el) {
    const text = el.textContent.trim();
    if (!text) return [];
    el.setAttribute('aria-label', text);
    el.textContent = '';

    const visual = document.createElement('span');
    visual.className = 'split-visual';
    visual.setAttribute('aria-hidden', 'true');

    const words = text.split(/\s+/);
    words.forEach((word, i) => {
      const outer = document.createElement('span');
      outer.className = 'split-word';
      const inner = document.createElement('span');
      inner.className = 'split-word-inner';
      inner.textContent = word;
      outer.appendChild(inner);
      visual.appendChild(outer);
      if (i < words.length - 1) visual.appendChild(document.createTextNode(' '));
    });

    el.appendChild(visual);
    return Array.from(visual.querySelectorAll('.split-word-inner'));
  }

  const mobileType = isSmallScreen();
  document.querySelectorAll('.eyebrow, .section-title, .why-sub, .beat-caption').forEach((el) => {
    const words = splitWords(el);
    if (!words.length) return;
    gsap.fromTo(
      words,
      { yPercent: 115, autoAlpha: 0, filter: `blur(${mobileType ? 4 : 8}px)` },
      {
        yPercent: 0,
        autoAlpha: 1,
        filter: 'blur(0px)',
        duration: 1,
        ease: 'power3.out',
        stagger: mobileType ? 0.03 : 0.045,
        scrollTrigger: { trigger: el, start: 'top 90%', once: true },
      }
    );
  });

  // ---------------------------------------------------
  // Generic reveal — everything else marked .reveal fades and rises into
  // place once, on scroll-in. Elements that also carry a parallax
  // data-speed skip the rise (parallax owns their y) and scale in
  // instead, so the two effects don't fight over the same property.
  // ---------------------------------------------------
  const splitSelector = '.eyebrow, .section-title, .why-sub';
  gsap.utils.toArray('.reveal').forEach((el) => {
    if (el.matches(splitSelector)) return;
    if (el.matches('.service-card, .testimonial')) return;
    const hasParallax = el.hasAttribute('data-speed');
    gsap.fromTo(
      el,
      { autoAlpha: 0, y: hasParallax ? 0 : 28, scale: hasParallax ? 0.96 : 1 },
      {
        autoAlpha: 1,
        y: 0,
        scale: 1,
        duration: 1,
        ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 88%', once: true },
      }
    );
  });

  ['.service-card', '.testimonial'].forEach((selector) => {
    ScrollTrigger.batch(selector, {
      start: 'top 88%',
      once: true,
      onEnter: (batch) =>
        gsap.fromTo(
          batch,
          { autoAlpha: 0, y: 28 },
          { autoAlpha: 1, y: 0, duration: 0.9, ease: 'power3.out', stagger: 0.12 }
        ),
    });
  });

  // ---------------------------------------------------
  // Case-study image — mask reveal on entry, subtle continuous
  // scale/drift (Ken Burns) while it's in view.
  // ---------------------------------------------------
  const kenburnsFrame = document.querySelector('.kenburns-frame');
  const kenburnsMedia = document.querySelector('.kenburns-media');

  if (kenburnsFrame && kenburnsMedia) {
    gsap.fromTo(
      kenburnsFrame,
      { clipPath: 'inset(0% 0% 100% 0%)' },
      {
        clipPath: 'inset(0% 0% 0% 0%)',
        duration: 1.1,
        ease: 'power3.inOut',
        scrollTrigger: { trigger: kenburnsFrame, start: 'top 85%', once: true },
      }
    );

    gsap.to(kenburnsMedia, {
      scale: 1.12,
      xPercent: 3,
      ease: 'none',
      scrollTrigger: { trigger: kenburnsFrame, start: 'top bottom', end: 'bottom top', scrub: true },
    });
  }

  // ---------------------------------------------------
  // Responsive motion — matchMedia keeps desktop and mobile as distinct
  // configurations (not one scaled down into the other): mobile gets
  // gentler parallax and skips hover-only card tilt entirely.
  // ---------------------------------------------------
  const mm = gsap.matchMedia();

  mm.add(
    {
      isMobile: '(max-width: 760px)',
      canHover: '(hover: hover) and (pointer: fine)',
    },
    (context) => {
      const { isMobile, canHover } = context.conditions;
      const intensity = isMobile ? 0.45 : 1;

      gsap.utils.toArray('[data-speed]').forEach((el) => {
        const speed = (parseFloat(el.dataset.speed) || 0.2) * intensity;
        gsap.fromTo(
          el,
          { y: () => -window.innerHeight * speed },
          {
            y: () => window.innerHeight * speed,
            ease: 'none',
            scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true },
          }
        );
      });

      if (canHover) {
        document.querySelectorAll('.service-card, .testimonial, .contact-direct').forEach((card) => {
          const quickX = gsap.quickTo(card, 'rotationY', { duration: 0.5, ease: 'power3.out' });
          const quickY = gsap.quickTo(card, 'rotationX', { duration: 0.5, ease: 'power3.out' });
          const quickLift = gsap.quickTo(card, 'y', { duration: 0.5, ease: 'power3.out' });

          const onMove = (event) => {
            const rect = card.getBoundingClientRect();
            const px = (event.clientX - rect.left) / rect.width - 0.5;
            const py = (event.clientY - rect.top) / rect.height - 0.5;
            quickX(px * 8);
            quickY(-py * 8);
            quickLift(-6);
          };
          const onLeave = () => {
            quickX(0);
            quickY(0);
            quickLift(0);
          };

          card.addEventListener('mousemove', onMove);
          card.addEventListener('mouseleave', onLeave);
        });
      }
    }
  );

  window.addEventListener('load', () => ScrollTrigger.refresh());
} else {
  const badgeDrift = document.getElementById('badgeDrift');
  if (badgeDrift) badgeDrift.style.display = 'none';
}

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
