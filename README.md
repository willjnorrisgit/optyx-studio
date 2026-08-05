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
assets/favicon.svg                        Browser tab icon (plain ring mark, no badge — see below)
assets/optyx-badge.svg                    Unused for now (see "Known placeholders") — not referenced anywhere
assets/video/abstract-art-03.mp4          Hero background loop
assets/video/blue-flow.mp4                Beat-banner background loop
assets/video/grey-marketing-banner.mp4    Unused — kept in assets/, no longer referenced (see below)
```

Beat-dots (the "Every pixel earns its place." section) has no local video
of its own any more — it's a live Spline scene embedded from
`my.spline.design`, see "Beat-dots" below for how that's wired up and
what that trade-off actually means.

`abstract-art-03` already looped cleanly as delivered (verified by
diffing its own first/last frame — well under the threshold that reads
as a visible jump) and was left alone. `blue-flow` didn't — it's
re-encoded from the source with a 0.4s crossfade blended across the loop
point (same technique used on the old `dot-waves` clip this originally
replaced): the true last 0.4s dissolves into the true first 0.4s, so what
plays is a shorter loop with no seam rather than the original full-length
clip with one.

## Page structure & motion system

The site is **mainly black** end to end now — there's no more alternating
black/off-white rhythm. Every section sits on the same `--bg-black`;
contrast comes from white floating cards (testimonials, the contact panel,
the case-study frame, form fields) and a vivid teal-blue accent, not from
switching the page's own background colour:

```
Hero (black, video, pinned — pill nav + headline/stats)
  → Services "What we do" (black, holds)
    → Beat: Spline "voidspiral" scene (black, pinned + content rises out of it)
      → Why us (black, holds, white testimonial/badge cards)
        → Beat: blue-flow (black, video, holds — quiet, not pinned)
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
a vivid teal-blue, used for eyebrows, gradient headings, links, and bullet
dots — buttons are their own separate darker-blue system, see Cards &
buttons below. `--bg-black` is pure `#000`, not an off-black: the section
videos render at `(0,0,0)` themselves, and a lighter `--bg-black` used to
read as a faint seam against them wherever a video faded in/out, breaking
the "one consistent black" the site is going for between sections.

**Header & hero.** The header (`.site-header`) is a floating rounded pill
(blurred semi-transparent fill, inset from the top) rather than a flush
full-width bar, and hides on scroll-down / reappears on scroll-up via a
master `ScrollTrigger`. Its logo (`#homeLogo`) is a plain "OPTYX"
wordmark, no icon (see "Known placeholders") — a normal in-page link to
`#top` for no-JS/reduced-motion visitors; with JS it also clears the
intro's session flag and does a full navigation back to the page root, so
clicking it replays the intro from scratch exactly as a first visit
would. The footer logo is the same plain wordmark. The hero itself is
**pinned** (`pin: true`) for one extra viewport height of scroll: the
video retreats upward for the whole pinned range (there's currently no
badge to animate alongside it — `heroTl`'s badge tweens are gated behind
`if (heroLogo)` and simply skip themselves while `.hero-logo` doesn't
exist in the DOM, so the video's own motion isn't affected either way).
The headline/subhead/CTA/stat blocks sit outside the pin timeline
entirely and stay static throughout. The video itself is scaled down
(`transform: scale(0.72)` on `.hero-video`) so it reads as a contained
object with real black margin around it rather than edge-to-edge — GSAP
only tweens its `y`, and composes that on top of the CSS scale rather
than overwriting it, so the pin's own parallax still works unchanged.
Three stacked gradients in `.hero-overlay` additionally darken the
lower-left quadrant specifically (where the headline/subhead/CTA sit)
regardless of what the looping video is doing behind them at any given
moment, rather than relying on the video's own crop to keep that zone
clear. The headline itself is uppercase with a small amount of positive
tracking (`.hero-headline`) to match the reference layout's bold
geometric look, rather than the tighter negative-tracked sentence case it
had before.

The desktop `cover` + bleed + `scale(0.72)` combo is tuned for a wide,
landscape viewport — below 900px wide (covers both actual mobile devices
and a narrow/minimised desktop window, since it's a width breakpoint, not
a device check) it was cropping most of the design out of frame instead
of just adding margin. A media-query override switches `.hero-video` to
`object-fit: contain` there instead, guaranteeing the whole clip stays
visible (letterboxed against the same jet black rather than cropped),
with a smaller bleed retained purely so the pin's own vertical parallax
still has room to move without the now-letterboxed video clipping against
`.hero`'s `overflow: hidden` edge.

**Beat-dots — Spline "voidspiral" scene.** This section's background is
a live third-party embed (`<iframe src="https://my.spline.design/
voidspiral-.../">` in `index.html`, reused as `.section-video` for
sizing/positioning) rather than a local video file — it needs real
network access to Spline's CDN at runtime, which is a genuinely different
reliability profile from every other background in this site (self-hosted
files that only depend on this repo's own host). Two scroll phases, split
across two separate `ScrollTrigger`s on the same element:

1. **Approach** (`start: 'top bottom', end: 'top top'`, *not* pinned) —
   as the section scrolls up from below the viewport, the embed grows and
   fades from `{opacity: 0, scale: 0.85}` to `{opacity: 1, scale: 1}`,
   finishing exactly as the section's top reaches the top of the
   viewport. It's "appearing" during ordinary scroll, before anything
   locks.
2. **Pin** (`start: 'top top', end: '+=150%'`, `pin: true`) — the exact
   moment phase 1 finishes is where this one picks up, already at full
   opacity/scale. First a hold (0–50% of the pin) with nothing else
   happening, giving the scene's own internal animation room to play —
   **this is a scroll-distance estimate, not a real sync**: a plain
   iframe embed can't report back to the parent page when its animation
   has actually finished (that needs Spline's own runtime/eventing API
   with named events the scene's author sets up, not just an embed URL),
   so "spiral has completed" is approximated by scroll progress rather
   than known for certain. Only then does the caption rise up from below
   and settle — "the next lot of information rising out of the final
   shape" — holds, and both fade to a true black hold before releasing
   into "Why us". The caption's rise carries `mix-blend-mode: screen`
   (`.beat-dots .beat-inner`), a no-op over black that only visibly picks
   up colour where it crosses something bright — same trick as before,
   though note it's *not guaranteed* to composite against a cross-origin
   iframe's actual pixels the same reliable way it did against a
   same-origin `<video>`; worth a visual check once deployed. The caption
   is deliberately not run through the generic word-split reveal (see
   Typography below) for the same reason as before — a viewport-relative
   trigger on a word span doesn't mix well with a separate manual
   transform on its own pinned ancestor — so it's driven by the pin
   timeline directly; `.beat-banner`'s caption (below, not pinned) still
   gets the full per-word treatment.

**What couldn't be verified here.** This sandbox's outbound proxy blocks
`my.spline.design` outright (confirmed directly — a 403 at the CONNECT
step, not a timeout), so the actual scene was never visible in any of
this round's testing, only the surrounding mechanics (the two
`ScrollTrigger`s firing at the right scroll positions, the fade/scale
math, no JS errors). Two things specifically to check once this is live
and reachable: whether the scene's own baked-in background reads as the
same jet black as the rest of the site (that's authored inside Spline
itself, not something controllable from the embedding page — the
`.section-video` container is set to `--bg-black` as a fallback, but
can't repaint the iframe's actual rendered content if its own background
differs), and whether the `mix-blend-mode` note above actually blends as
intended. Separately — and this surfaced *during* testing, not
speculation: when the iframe fails to load for any reason (blocked here,
but the same would happen to a real visitor behind a restrictive
firewall, an ad-blocker flagging the domain, or a Spline outage),
Chromium renders its own default failed-navigation page, which is light
grey — not black, and not something the embedding page's CSS can repaint,
since a cross-origin iframe's error-page content isn't reachable from
here. There's no reliable way to detect that failure from the parent page
either (iframes don't fire a normal `onerror` for a blocked/rejected
navigation the way an `<img>` does), so there's currently no automatic
fallback for it — flagging this as a known trade-off of a live embed
versus a self-hosted asset, not something fixed in this round.

**Beat-banner — blue-flow.** Not pinned, unlike beat-dots — a normal
scroll-through hold with `blue-flow.mp4` behind the caption, fading in/out
at its own section edges (`start: 'top bottom', end: 'bottom top'`) so it
doesn't pop in as a hard-edged box. The clip's own black background is
pure `#000` — the same value `--bg-black` uses now (see Colour system
above), so it reads as the exact same black as every other section
rather than a visibly different panel, checked directly by sampling the
clip's own corner pixels rather than assumed.

**Typography.** `--font-display` (Space Grotesk) covers headings, nav
links, the logo wordmark, buttons, eyebrows and beat captions; `--font`
(Inter) stays on body copy/paragraphs, form fields and other long-form
text — the same pairing rationale as before (Inter stays the more
legible of the two at the lighter weights long-form text needs), just a
different display face. Both load via the same Google Fonts `<link>` as
before (`index.html`). Space Grotesk tops out at weight 700 (no 800/900),
so the two spots that used to ask `--font-display` for 800
(`.intro-primary`, `.service-num`) are capped at 700 now rather than
triggering a synthetic-bold fallback.

Headings/eyebrows/captions are split into words at
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

**Cards & buttons.** `.btn-primary` uses its own darker metallic-blue
gradient (`--btn-blue`/`--btn-blue-hover`, a deep steel/navy blend rather
than a flat fill) with a thin inset highlight/shadow pair for a brushed-
metal edge, separate from the vivid teal `--accent` used everywhere else
— feedback was that the flat teal fill read as too pale/"baby blue" for a
primary CTA. On `(hover: hover) and (pointer: fine)` devices only:
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
preview, not the deployed site. The beat-dots section is the one
exception either way — it needs real outbound access to
`my.spline.design`, locally or deployed, being a live third-party embed
rather than a file in this repo (see "Beat-dots" above for what that
trades off).

## Deploying to GitHub Pages

1. Push to the `main` branch.
2. In the repo's **Settings → Pages**, set the source to `Deploy from a
   branch`, branch `main`, folder `/ (root)`.
3. The site will be published at `https://<username>.github.io/optyx-studio/`.

## Known placeholders

The following are placeholder content and should be replaced with real
material before launch:

- **Identity mark / badge** — the site currently has no icon anywhere
  (favicon is a plain ring, header/footer/hero are text/video-only). A
  previous badge design (`assets/optyx-badge.svg`, a metal ring + blue
  "lens" accent) didn't land well and was pulled from every placement
  pending a redesign; the file is still in `assets/` but not referenced
  from anywhere. `.hero-logo`'s pin-timeline animation in `js/main.js` is
  still there and gated behind `if (heroLogo)`, so dropping a new
  `.hero-logo` element back into the hero markup picks the drop/fade
  motion back up automatically with no JS changes needed.
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
