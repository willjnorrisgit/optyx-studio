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
assets/video/dot-waves.mp4                Precision beat section background loop
assets/video/grey-marketing-banner.mp4    Unused — kept in assets/, no longer referenced (see below)
```

`dot-waves` and `abstract-art-03` loop seamlessly: `dot-waves` was
re-encoded from the original with a 0.4s cross-dissolve baked into the
loop point to fix a visible jump at the restart; `abstract-art-03` is
trimmed to its best rotation-match point with a built-in 0.25s crossfade
blending its own tail into its own head.

## Page structure & motion system

The site is **mainly black** end to end now — there's no more alternating
black/off-white rhythm. Every section sits on the same `--bg-black`;
contrast comes from white floating cards (testimonials, the contact panel,
the case-study frame, form fields) and a vivid teal-blue accent, not from
switching the page's own background colour:

```
Hero (black, video, pinned — pill nav + ring badge + headline/stats)
  → Services "What we do" (black, holds)
    → Beat: dot-waves particles (black, video, pinned + content scrolls over it)
      → Why us (black, holds, white testimonial/badge cards)
        → Beat: quiet dark hold, no video
          → Case study + Contact (black, runs to the footer, white cards)
            → Footer (black — no colour of its own)
```

Motion runs on **GSAP + ScrollTrigger** for all scroll-linked animation and
**Lenis** for smooth, momentum-based scrolling site-wide, both loaded via
CDN (`index.html`) and wired up in `js/main.js`. Lenis drives GSAP's own
ticker (`gsap.ticker.add((t) => lenis.raf(t * 1000))` with `lagSmoothing(0)`)
so `ScrollTrigger` and Lenis stay perfectly in sync. Everything is gated
behind `prefers-reduced-motion`: when it's set, none of the below runs and
every section just shows its own static CSS background/opacity — a plain,
fully-legible fallback with zero extra branching required.

**Colour system.** `--text`/`--text-dim`/`--border` are the page-level
tokens (light-on-black, for content sitting directly on a section); a
parallel `--text-panel`/`--text-panel-dim`/`--border-panel*` set exists
for content living inside a white `--bg-panel` card, since white-on-white
would otherwise disappear. `body { color-scheme: dark }` keeps native UI
(scrollbars, unstyled form-control fallbacks) dark by default, with
`color-scheme: light` scoped back onto the two actual `<input>`/
`<textarea>` fields so their own chrome doesn't get auto-dark-moded away
from the explicit white fill. The accent (`--accent`/`--accent-bright`) is
a vivid teal-blue, used for eyebrows, gradient headings, links, bullet
dots, the ring logo's lens highlight, and button fills.

**Header & hero.** The header (`.site-header`) is a floating rounded pill
now (blurred semi-transparent fill, inset from the top) rather than a
flush full-width bar, and hides on scroll-down / reappears on scroll-up
via a master `ScrollTrigger` same as before. Its logo (`#homeLogo`) is a
plain "OPTYX" wordmark — a normal in-page link to `#top` for
no-JS/reduced-motion visitors; with JS it also clears the intro's session
flag and does a full navigation back to the page root, so clicking it
replays the intro from scratch exactly as a first visit would. The hero
itself is **pinned** (`pin: true`) for one extra viewport height of
scroll: the video retreats upward for the whole pinned range while the
identity mark — a small ring "lens" badge (`#icon-optyx-ring`, a matte
grey ring with a teal-blue highlight ring at its upper-right corner,
defined once as an SVG `<symbol>` and reused via `<use>`) — drops steadily
downward across that same range, fading out only in the pin's final 40%
once it's dropped well clear, right as the next section takes over. The
rest of the hero (headline, subhead, CTA, the two stat blocks) sits
outside the pin timeline entirely and stays static throughout — only the
badge and video move.

**Beat-dots — particles pin-and-hold.** Same pinning technique as the
hero: once `.beat-dots` reaches the top of the viewport it locks in place
for ~1.5 screens (`end: '+=150%'`) while the caption drifts upward over
the now full-screen `dot-waves.mp4`, then releases into "Why us". Because
every section is the same solid black now, the video simply fading in
(over ~16% of the pin) and back out (before the final ~18%) against that
constant backdrop is what reads as "black, then the particles appear" —
there's no separate colour ramp left to sequence it against, unlike the
old cross-fading system. The caption is deliberately *not* run through the
generic word-split reveal (see Typography below) — a viewport-relative
scroll trigger on a word span doesn't mix well with a separate manual
transform on its own pinned ancestor, so it gets a plain fade-in from the
pin timeline instead; `.beat-banner`'s caption (untouched, not pinned)
still gets the full per-word treatment.

**Typography.** Headings/eyebrows/captions are split into words at
runtime (`splitWords()` in `js/main.js`). Each word's opacity/position is
tied directly to scroll progress through the block (`scrub`, not a
fixed-duration one-shot) — the window is `top 55%` to `top 18%`, i.e. it
only starts once the block is already about half-scrolled into view
(rather than the instant it peeks in at the very bottom of the screen)
and finishes soon after, so it reads as prompt rather than a long, slow
reveal — with a slight upward move and a blur-to-sharp finish, eased with
one shared curve (`premiumEase`,
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
`.beat-inner`, the case-study image) gets an independent scroll-scrubbed
parallax offset, scaled down for mobile via `gsap.matchMedia()`. The
case-study image also gets a `clip-path` mask reveal on scroll-in plus a
continuous subtle scale/drift while it's in view.

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

- **Hero stats** — the two `[X]+` stat blocks (`.hero-stat-num` in
  `index.html`) are bracketed placeholders — Optyx Studio has no verified
  track record yet, so these are deliberately not real numbers. Fill in
  once there's an honest count for years/projects.
- **Case study screenshot** — `.screenshot-placeholder` in the "Work"
  section. Replace with an `<img>` of the real LockOn site.
- **Case study results** — bracketed metrics in the case study section.
- **Beat captions** — "Every pixel earns its place." / "Built to perform
  under real ad spend." (`.beat-caption` in `index.html`) are placeholder
  microcopy for the two dark punctuation sections.
- **`assets/video/grey-marketing-banner.mp4`** — no longer referenced
  anywhere (the second beat section is now a quiet video-free hold); the
  file is still in the repo in case it's wanted again, safe to delete
  otherwise.
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
