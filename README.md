# Optyx Studio

Landing page for Optyx Studio — a premium web design agency building
conversion-focused websites for businesses that already know how to
advertise.

Plain HTML/CSS/JS, no build step, deploy-ready for GitHub Pages.

## Structure

```
index.html                                Page markup
css/styles.css                            All styling
js/main.js                                Intro, GSAP/ScrollTrigger/Lenis motion system, nav, contact form
assets/favicon.svg                        Browser tab icon
assets/video/abstract-art-03.mp4          Hero background loop
assets/video/dot-waves.mp4                First punctuation-beat section background loop
assets/video/grey-marketing-banner.mp4    Second punctuation-beat section background loop
```

All three background videos loop seamlessly: `dot-waves` and
`grey-marketing-banner` were re-encoded from the originals with a 0.4s
cross-dissolve baked into the loop point to fix a visible jump at the
restart; `abstract-art-03` is trimmed to its best rotation-match point
with a built-in 0.25s crossfade blending its own tail into its own head.

## Page structure & motion system

The page alternates black and off-white sections all the way down, with
the two video sections acting as short "punctuation beat" pauses rather
than places to linger:

```
Hero (black, video)
  → Services "What we do" (off-white, holds)
    → Beat: dot-waves (black, video, short)
      → Why us (off-white, holds)
        → Beat: grey-marketing-banner (black, video, short)
          → Case study + Contact (off-white, runs to the footer)
            → Footer (off-white — no colour of its own)
```

Motion runs on **GSAP + ScrollTrigger** for all scroll-linked animation and
**Lenis** for smooth, momentum-based scrolling site-wide, both loaded via
CDN (`index.html`) and wired up in `js/main.js`. Lenis drives GSAP's own
ticker (`gsap.ticker.add((t) => lenis.raf(t * 1000))` with `lagSmoothing(0)`)
so `ScrollTrigger` and Lenis stay perfectly in sync. Everything is gated
behind `prefers-reduced-motion`: when it's set, none of the below runs and
every section just shows its own static CSS background/opacity — a plain,
fully-legible fallback with zero extra branching required.

**Background rhythm.** A fixed field (`#bgField`) sits behind everything;
its `background-color` is driven by a single continuous function of
`scrollY` (`lightnessAt()` in `js/main.js`), written every frame to both
the field itself and a `--bg-mix` CSS custom property (0 = black, 1 =
off-white) — there are no discrete per-section triggers. Each theme
section contributes a genuine flat *plateau* at its own target value (not
just an instant at its midpoint), with a smoothstep ramp between adjacent
plateaus sized off the shorter of the two flanking sections — so a short
"beat" section still gets a comfortable, comparable hold instead of the
ramps from its taller neighbours eating almost all of it. Sections turn
transparent only once `body.motion-active` is present, so the
reduced-motion fallback is just each section's own solid CSS colour,
unchanged.

**Header & hero.** The header hides on scroll-down and reappears on
scroll-up via a single master `ScrollTrigger` (also driving the badge, see
below). The hero is **pinned** (`pin: true`) for one extra viewport height
of scroll: the video keeps scrubbing/translating underneath while the
wordmark stays stationary, then fades and lifts away only in the pin's
final ~35%, right as the next section takes over.

**Typography.** Headings/eyebrows/captions are split into words at
runtime (`splitWords()` in `js/main.js`). Each word's opacity/position is
tied directly to scroll progress through the block (`scrub`, not a
fixed-duration one-shot), with a slight upward move and a blur-to-sharp
finish, eased with one shared curve (`premiumEase`,
`cubic-bezier(0.25, 0.1, 0.25, 1)`, hand-solved and registered since GSAP's
free build has no CustomEase — used for every scroll-reveal animation
site-wide). The original text is preserved via `aria-label` on the
element, with the visual split spans marked `aria-hidden`, so screen
readers get the plain sentence and nothing is ever hidden from crawlers —
the un-split plain text is what's in the DOM until JS runs, and remains
the whole story under reduced motion. `.section-title` and `.beat-caption`
also get a gradient text-clip (applied per-word-span, since
`background-clip: text` doesn't reliably composite through the nested
`inline-block` word wrappers needed for the reveal).

**Depth & images.** Any element with `data-speed` (the background blobs,
`.beat-bigtype`, `.beat-inner`, the case-study image) gets an independent
scroll-scrubbed parallax offset, scaled down for mobile via
`gsap.matchMedia()`. The case-study image also gets a `clip-path` mask
reveal on scroll-in plus a continuous subtle scale/drift while it's in
view.

**Services.** The "What we do" list (`.services-list` in `index.html`) is
a numbered list — large ghost numerals (01/02/03), thin dividers, a
staggered reveal via `ScrollTrigger.batch` — rather than an icon card
grid.

**Cards & buttons.** On `(hover: hover) and (pointer: fine)` devices only:
testimonials and the direct-contact panel get a cursor-follow 3D tilt +
lift via `gsap.quickTo`; every `.btn` gets a magnetic hover (pulls toward
the cursor within a proximity radius, `power3.out` while tracking,
`premiumEase` on release) plus a press-scale, replacing the plain CSS
hover/`:active` for those users. Touch devices get none of that and rely
on the CSS hover/press states and the scroll-reveal entrance alone.

A small ring-and-dot badge (`#badgeDrift`) drifts continuously across the
screen for the entire scroll — position, scale and rotation are all a
function of scroll position — and inverts its stroke colour between white
and black depending on the current section's theme.

A subtle fixed grain texture (`body::after`) sits above everything at low
opacity with `mix-blend-mode: overlay` for a bit of non-distracting depth;
it's static, so it needs no reduced-motion gating.

## Local development

No build step required — open `index.html` directly in a browser, or serve
the folder locally. The background videos need a server that supports
HTTP Range requests (required for `<video>` playback) — Python's built-in
`http.server` does **not** support this and will leave every `<video>`
stuck on a black frame locally. Use something like:

```
npx http-server
```

GitHub Pages supports Range requests correctly, so this only affects local
preview, not the deployed site.

## Deploying to GitHub Pages

1. Push to the `main` branch.
2. In the repo's **Settings → Pages**, set the source to `Deploy from a
   branch`, branch `main`, folder `/ (root)`.
3. The site will be published at `https://<username>.github.io/optyx-studio/`.

## Known placeholders

The following are placeholder content and should be replaced with real
material before launch:

- **Case study screenshot** — `.screenshot-placeholder` in the "Work"
  section. Replace with an `<img>` of the real LockOn site.
- **Case study results** — bracketed metrics in the case study section.
- **Beat captions** — "Every pixel earns its place." / "Built to perform
  under real ad spend." (`.beat-caption` in `index.html`) are placeholder
  microcopy for the two video punctuation sections.
- **Testimonials** — quotes and attribution in the "Why us" section.
- **Awards / credibility badges** — placeholder badges in the "Why us"
  section.
- **Contact form** — currently shows a message on submit instead of
  sending anywhere. Wire it up to a form backend (e.g. Formspree, Netlify
  Forms) via the `contactForm` element in `index.html` / `js/main.js`.
- **Contact email** — `optyxstudio@gmail.com` is a placeholder address.
- **WhatsApp icon** — the glyph used for the floating button and the
  contact-section link (`.fab-whatsapp`, `.contact-whatsapp` in
  `index.html`) is a hand-built simplified icon, not the official WhatsApp
  brand asset. Swap in the official SVG if pixel-perfect brand accuracy
  matters. The number itself (`wa.me/447495260785`) is live.
