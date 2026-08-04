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

  // ---------------------------------------------------
  // One consistent easing curve for every scroll-reveal animation
  // site-wide. GSAP's free build has no CustomEase, so it's solved by
  // hand (Newton-Raphson) and registered once as a named ease.
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
  gsap.registerEase('premiumEase', makeCubicBezier(0.25, 0.1, 0.25, 1));

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
      ease: 'premiumEase',
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
  // Hero — pinned in place while the video scrolls/scrubs underneath.
  // The wordmark stays stationary for most of the pinned range and only
  // fades + releases in its final portion, right as the next section
  // takes over.
  // ---------------------------------------------------
  const hero = document.getElementById('hero');
  const heroLogo = document.querySelector('.hero-logo');
  const heroVideo = hero ? hero.querySelector('.hero-video') : null;

  if (hero && heroLogo) {
    const pinDistance = isSmallScreen() ? '60%' : '100%';
    const videoTravel = isSmallScreen() ? window.innerHeight * 0.06 : window.innerHeight * 0.1;

    const heroTl = gsap.timeline({
      scrollTrigger: {
        trigger: hero,
        start: 'top top',
        end: `+=${pinDistance}`,
        scrub: 1,
        pin: true,
        anticipatePin: 1,
      },
    });

    if (heroVideo) {
      heroTl.to(heroVideo, { y: -videoTravel, ease: 'none', duration: 1 }, 0);
    }
    // badge/wordmark: untouched (pinned in place) for the first 65% of the
    // range, then fades + lifts away in the last 35% as section two arrives
    heroTl.to(heroLogo, { autoAlpha: 0, yPercent: -20, ease: 'none', duration: 0.35 }, 0.65);
  }

  // ---------------------------------------------------
  // Background rhythm — a single continuous scroll-linked value (0 = black,
  // 1 = off-white), recomputed every frame from one function of scrollY and
  // written to a CSS custom property + the fixed field's background-colour.
  // There are no discrete per-section triggers: `lightnessAt()` is one
  // smoothstep-interpolated curve across the entire page, and an extra
  // per-frame lag on top of it keeps the drift itself gradual rather than
  // snapping straight to the target the instant scroll position changes.
  // ---------------------------------------------------
  const bgField = document.getElementById('bgField');

  if (bgField) {
    const rootStyle = getComputedStyle(document.documentElement);
    const colorDark = rootStyle.getPropertyValue('--bg-black').trim();
    const colorLight = rootStyle.getPropertyValue('--bg').trim();

    let bgKeyframes = [];
    let bgLightness = themeSections[0] && themeSections[0].dataset.theme === 'light' ? 1 : 0;

    // Each section gets a genuine flat hold (not just a single instant at its
    // midpoint) so every colour reads as settled for a comparable stretch —
    // dark "beat" sections included, not just the taller light ones either
    // side of them. The ramp at each boundary is sized off the SHORTER of
    // the two flanking sections, so a short section never has its whole
    // height eaten by transition before it gets to hold anything.
    function buildBgKeyframes() {
      const stops = [];
      const rampFraction = 0.22;
      themeSections.forEach((s, i) => {
        const value = s.dataset.theme === 'light' ? 1 : 0;
        const prev = themeSections[i - 1];
        const next = themeSections[i + 1];
        const rampIn = prev ? Math.min(s.offsetHeight, prev.offsetHeight) * rampFraction : 0;
        const rampOut = next ? Math.min(s.offsetHeight, next.offsetHeight) * rampFraction : 0;
        const plateauStart = s.offsetTop + rampIn;
        const plateauEnd = Math.max(plateauStart, s.offsetTop + s.offsetHeight - rampOut);
        stops.push({ y: plateauStart, value });
        stops.push({ y: plateauEnd, value });
      });
      bgKeyframes = stops;
    }

    function lightnessAt(y) {
      const kfs = bgKeyframes;
      if (!kfs.length) return bgLightness;
      if (y <= kfs[0].y) return kfs[0].value;
      if (y >= kfs[kfs.length - 1].y) return kfs[kfs.length - 1].value;
      for (let i = 0; i < kfs.length - 1; i++) {
        const a = kfs[i];
        const b = kfs[i + 1];
        if (y >= a.y && y <= b.y) {
          const t = (y - a.y) / (b.y - a.y);
          const smooth = t * t * (3 - 2 * t);
          return a.value + (b.value - a.value) * smooth;
        }
      }
      return kfs[kfs.length - 1].value;
    }

    buildBgKeyframes();
    gsap.set(bgField, { backgroundColor: gsap.utils.interpolate(colorDark, colorLight, bgLightness) });
    document.documentElement.style.setProperty('--bg-mix', bgLightness.toFixed(4));

    // Gradualness already comes from the ramp zones in lightnessAt() (spread
    // over real scroll distance, not time) — tracking the target directly
    // here, rather than adding a second temporal lag on top, is what lets
    // short sections actually reach and hold their settled colour instead of
    // perpetually chasing it.
    gsap.ticker.add(() => {
      const target = lightnessAt(window.scrollY);
      if (Math.abs(target - bgLightness) < 0.0006) return;
      bgLightness = target;
      bgField.style.backgroundColor = gsap.utils.interpolate(colorDark, colorLight, bgLightness);
      document.documentElement.style.setProperty('--bg-mix', bgLightness.toFixed(4));
    });

    window.addEventListener('resize', buildBgKeyframes);
    window.addEventListener('load', buildBgKeyframes);
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

  // Scroll-driven: each word ramps from low to full opacity as the block
  // scrolls through its own viewport window — tied directly to scroll
  // progress (scrub), not a fixed-duration one-shot animation.
  const mobileType = isSmallScreen();
  document.querySelectorAll('.eyebrow, .section-title, .why-sub, .beat-caption').forEach((el) => {
    const words = splitWords(el);
    if (!words.length) return;
    gsap.fromTo(
      words,
      { yPercent: mobileType ? 45 : 65, autoAlpha: 0.08, filter: `blur(${mobileType ? 3 : 6}px)` },
      {
        yPercent: 0,
        autoAlpha: 1,
        filter: 'blur(0px)',
        ease: 'premiumEase',
        stagger: { each: mobileType ? 0.025 : 0.04, from: 'start' },
        scrollTrigger: { trigger: el, start: 'top 92%', end: 'top 42%', scrub: 0.4 },
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
    if (el.matches('.service-row, .testimonial')) return;
    const hasParallax = el.hasAttribute('data-speed');
    gsap.fromTo(
      el,
      { autoAlpha: 0, y: hasParallax ? 0 : 28, scale: hasParallax ? 0.96 : 1 },
      {
        autoAlpha: 1,
        y: 0,
        scale: 1,
        duration: 1,
        ease: 'premiumEase',
        scrollTrigger: { trigger: el, start: 'top 88%', once: true },
      }
    );
  });

  ['.service-row', '.testimonial'].forEach((selector) => {
    ScrollTrigger.batch(selector, {
      start: 'top 88%',
      once: true,
      onEnter: (batch) =>
        gsap.fromTo(
          batch,
          { autoAlpha: 0, y: 28 },
          { autoAlpha: 1, y: 0, duration: 0.9, ease: 'premiumEase', stagger: 0.12 }
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
        ease: 'premiumEase',
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
        document.querySelectorAll('.testimonial, .contact-direct').forEach((card) => {
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

        // Magnetic CTA buttons — pulls toward the cursor within a proximity
        // radius (ease-out while tracking), releases back to rest with an
        // ease-in-out curve on leaving that radius or the button itself.
        const magnets = Array.from(document.querySelectorAll('.btn')).map((btn) => ({
          btn,
          quickX: gsap.quickTo(btn, 'x', { duration: 0.35, ease: 'power3.out' }),
          quickY: gsap.quickTo(btn, 'y', { duration: 0.35, ease: 'power3.out' }),
          quickScale: gsap.quickTo(btn, 'scale', { duration: 0.2, ease: 'power2.out' }),
          active: false,
        }));

        const release = (m) => {
          m.active = false;
          gsap.to(m.btn, { x: 0, y: 0, duration: 0.6, ease: 'premiumEase', overwrite: true });
        };

        document.addEventListener('mousemove', (event) => {
          magnets.forEach((m) => {
            const rect = m.btn.getBoundingClientRect();
            const dx = event.clientX - (rect.left + rect.width / 2);
            const dy = event.clientY - (rect.top + rect.height / 2);
            const reach = Math.max(rect.width, rect.height) / 2 + 90;
            const dist = Math.hypot(dx, dy);
            if (dist < reach) {
              m.active = true;
              const pull = 1 - dist / reach;
              m.quickX(dx * 0.35 * pull);
              m.quickY(dy * 0.35 * pull - 3);
            } else if (m.active) {
              release(m);
            }
          });
        });

        magnets.forEach((m) => {
          m.btn.addEventListener('mouseleave', () => {
            if (m.active) release(m);
          });
          m.btn.addEventListener('mousedown', () => m.quickScale(0.94));
          m.btn.addEventListener('mouseup', () => m.quickScale(1));
          m.btn.addEventListener('mouseleave', () => m.quickScale(1));
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
