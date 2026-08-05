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
// Header logo — back to top, replaying the intro. Clearing the
// session flag and doing a full navigation (rather than an in-page
// scroll) is what lets the intro's own load-time logic run again exactly
// as it does on a first visit, including its reduced-motion check.
// ---------------------------------------------------
const homeLogo = document.getElementById('homeLogo');
if (homeLogo) {
  homeLogo.addEventListener('click', (event) => {
    event.preventDefault();
    try { sessionStorage.removeItem('optyxIntroPlayed'); } catch (e) {}
    window.location.href = window.location.pathname;
  });
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
    if (link.id === 'homeLogo') return; // handled separately — full navigation, not an in-page scroll
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
  // Header — hides on scroll down, reappears on scroll up.
  // ---------------------------------------------------
  const header = document.querySelector('.site-header');
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

  ScrollTrigger.create({
    start: 0,
    end: () => document.documentElement.scrollHeight - window.innerHeight,
    onUpdate(self) {
      updateHeader(self.scroll(), self.direction);
    },
  });

  // ---------------------------------------------------
  // Hero — pinned in place while the video scrolls/scrubs underneath. The
  // wordmark visibly separates from it: the video retreats upward for the
  // whole pinned range, while the badge drops steadily downward across
  // that same range (opposite directions, so the gap between them grows),
  // fading out only in the final portion as the next section takes over.
  // ---------------------------------------------------
  const hero = document.getElementById('hero');
  const heroLogo = document.querySelector('.hero-logo');
  const heroVideo = hero ? hero.querySelector('.hero-video') : null;
  let heroTl = null;

  if (hero) {
    const pinDistance = isSmallScreen() ? '60%' : '100%';
    const videoTravel = isSmallScreen() ? window.innerHeight * 0.16 : window.innerHeight * 0.24;
    const badgeDrop = isSmallScreen() ? window.innerHeight * 0.32 : window.innerHeight * 0.42;

    heroTl = gsap.timeline({
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
      // fades out approaching release, revealing the (already black) page
      // background instead of the video's own opaque content cutting off
      // hard right at the pin boundary
      heroTl.to(heroVideo, { opacity: 0, ease: 'none', duration: 0.3 }, 0.7);
    }
    // badge: no identity mark in the hero right now (removed, pending a
    // replacement design) — .hero-logo doesn't currently exist in the DOM,
    // so this is a no-op until it's back; the pin/video motion above
    // doesn't depend on it either way.
    if (heroLogo) {
      // drops steadily for the entire pinned range (opposite direction to
      // the video, so the separation is visible throughout), only fading
      // out in the final 40% once it's dropped well clear of the
      // wordmark's resting position
      heroTl.to(heroLogo, { y: badgeDrop, ease: 'none', duration: 1 }, 0);
      heroTl.to(heroLogo, { autoAlpha: 0, ease: 'none', duration: 0.4 }, 0.6);
    }
  }

  // ---------------------------------------------------
  // Process rail — vertical scroll drives horizontal motion across the
  // process cards + case-study card. x and end are function-based so
  // invalidateOnRefresh recomputes both from the track's actual rendered
  // width instead of a value baked in at load (card widths are
  // viewport-relative, so that width changes on resize).
  // ---------------------------------------------------
  const rail = document.querySelector('.rail');
  const railViewport = rail ? rail.querySelector('.rail-viewport') : null;
  const railTrack = rail ? rail.querySelector('.rail-track') : null;

  if (rail && railViewport && railTrack) {
    const railDistance = () => Math.max(0, railTrack.scrollWidth - railViewport.clientWidth);

    gsap.to(railTrack, {
      x: () => -railDistance(),
      ease: 'none',
      scrollTrigger: {
        trigger: rail,
        start: 'top top',
        end: () => `+=${railDistance()}`,
        scrub: 1,
        pin: true,
        anticipatePin: 1,
        invalidateOnRefresh: true,
      },
    });
  }

  // ---------------------------------------------------
  // Beat-dots — motion-trail pin-and-hold. Once the section reaches the
  // top of the viewport it locks in place for ~1.5 screens: the video
  // fades in, the caption rises up from below the frame and settles onto
  // the page (its CSS mix-blend-mode does the "blend through the trails"
  // part on its own — over the section's own black it looks identical to
  // normal text, and only picks up colour where it actually crosses a
  // bright trail line, so no extra timing/coordinate work is needed to
  // sync it to the video's own motion), holds for a beat, then both fade
  // out together to a true black hold before releasing into why-us — a
  // deliberate cinematic beat rather than an instant cut, even though the
  // next section is already the same black.
  // ---------------------------------------------------
  const beatDots = document.querySelector('.beat-dots');
  const beatDotsVideo = beatDots ? beatDots.querySelector('.section-video') : null;
  const beatDotsInner = beatDots ? beatDots.querySelector('.beat-inner') : null;

  if (beatDots && beatDotsVideo && beatDotsInner) {
    const beatPinDistance = isSmallScreen() ? '120%' : '150%';

    gsap
      .timeline({
        scrollTrigger: {
          trigger: beatDots,
          start: 'top top',
          end: `+=${beatPinDistance}`,
          scrub: 1,
          pin: true,
          anticipatePin: 1,
        },
      })
      // video: fades in early, holds, fades out well before release —
      // leaving a genuine black hold at the very end, not a hard cut
      .fromTo(beatDotsVideo, { opacity: 0 }, { opacity: 1, ease: 'none', duration: 0.14 }, 0)
      .to(beatDotsVideo, { opacity: 0, ease: 'none', duration: 0.2 }, 0.72)
      // caption: rises up from below the frame — a full "slide" of scroll
      // to get there — fading in early in that rise so it's visible while
      // still crossing the video's centre, settles, holds, then fades out
      // together with the video for the cinematic black beat
      .fromTo(beatDotsInner, { yPercent: 70 }, { yPercent: 0, ease: 'power2.out', duration: 0.55 }, 0)
      .fromTo(beatDotsInner, { autoAlpha: 0 }, { autoAlpha: 1, ease: 'none', duration: 0.3 }, 0.05)
      .to(beatDotsInner, { autoAlpha: 0, ease: 'none', duration: 0.2 }, 0.72);
  }

  // ---------------------------------------------------
  // Beat-banner — blue-flow video fade. Not pinned (a normal scroll-through
  // hold, unlike beat-dots above), so it just needs a plain fade-in/out at
  // its own section edges rather than a pin timeline: fully faded in by
  // the time the section is centred in the viewport, fully faded out again
  // before it leaves — a hard-edged video box popping in/out at the
  // section boundary would be the only rough edge left now that there's no
  // colour ramp to hide it against.
  // ---------------------------------------------------
  const beatBanner = document.querySelector('.beat-banner');
  const beatBannerVideo = beatBanner ? beatBanner.querySelector('.section-video') : null;

  if (beatBanner && beatBannerVideo) {
    gsap
      .timeline({
        scrollTrigger: {
          trigger: beatBanner,
          start: 'top bottom',
          end: 'bottom top',
          scrub: 0.3,
        },
      })
      .fromTo(beatBannerVideo, { opacity: 0 }, { opacity: 1, ease: 'none', duration: 0.3 }, 0)
      .to(beatBannerVideo, { opacity: 0, ease: 'none', duration: 0.3 }, 0.7);
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
  // progress (scrub), not a fixed-duration one-shot animation. Starts once
  // the block is already about half-scrolled into view (rather than the
  // instant it peeks in at the very bottom) and finishes soon after, so it
  // reads as prompt rather than a long, slow reveal.
  const mobileType = isSmallScreen();
  document.querySelectorAll('.eyebrow, .section-title, .why-sub, .beat-caption').forEach((el) => {
    // .beat-dots' own caption is driven by its pin timeline above instead
    // (a viewport-relative trigger on a word span doesn't mix well with a
    // separate manual transform on its pinned ancestor) — .beat-banner's
    // caption is untouched and still gets the full word-level reveal.
    if (el.closest('.beat-dots')) return;
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
        scrollTrigger: { trigger: el, start: 'top 55%', end: 'top 18%', scrub: 0.4 },
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
