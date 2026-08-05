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
assets/video/motion-trail.mp4             Unused — kept in assets/, no longer referenced (see below)
assets/video/blue-flow.mp4                The site's one remaining punctuation-beat background loop
assets/video/grey-marketing-banner.mp4    Unused — kept in assets/, no longer referenced (see below)
```

`abstract-art-03` and `motion-trail` already looped cleanly as delivered
(verified by diffing their own first/last frame — well under the
threshold that reads as a visible jump) and were left alone. `blue-flow`
didn't — it's re-encoded from the source with a 0.4s crossfade blended
across the loop point (same technique used on the old `dot-waves` clip
this replaced): the true last 0.4s dissolves into the true first 0.4s,
so what plays is a shorter loop with no seam rather than the original
full-length clip with one.

## Page structure & motion system

The site is **mainly black** end to end now — there's no more alternating
black/off-white rhythm. Every section sits on the same `--bg-black`;
contrast comes from white floating cards (testimonials, the contact panel,
the case-study frame, form fields) and a vivid teal-blue accent, not from
switching the page's own background colour:

```
Hero (black, video, pinned — pill nav + headline/stats + corner badge)
  → Marquee "Built with tools you already trust" (black, right-to-left auto-scroll)
    → Services "What we do" (black, holds — tag pill per row)
      → Process rail "How it works" (black, pinned — vertical scroll drives horizontal cards)
        → Beat: blue-flow (black, video, holds — quiet, not pinned)
          → Why us (black, holds, white testimonial/badge cards)
            → Case study + Contact (black, runs to the footer, white cards)
              → Footer (black — no colour of its own)
```

**Copy direction.** Headline, subhead, services and process-rail copy are
all written to lead with outcome/result over feature description (e.g.
"More customers. Less guesswork." over a features list), and to keep
friction low — one repeated CTA (`Let's talk`), no multi-step pricing or
comparison content to parse. Deliberately **no guarantee language
anywhere on the site** (no money-back, satisfaction-guarantee, or
"risk-free" framing of any kind) — this was requested in an early draft
of the copy brief and explicitly withdrawn before anything was written,
so it was never added.

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
would otherwise disappear. `--text`/`--text-dim`/`--text-on-dark` are a
cool, faintly blue-tinted white/grey (not a neutral warm off-white) so
body copy reads as one family with the blue gradient headings rather than
two different palettes sharing a page. `body { color-scheme: dark }` keeps
native UI (scrollbars, unstyled form-control fallbacks) dark by default,
with `color-scheme: light` scoped back onto the two actual `<input>`/
`<textarea>` fields so their own chrome doesn't get auto-dark-moded away
from the explicit white fill. The accent (`--accent`/`--accent-bright`) is
a vivid teal-blue, used for eyebrows, gradient headings, links, and bullet
dots — buttons pull from the same family (`--btn-blue`/`--btn-blue-hover`),
see Cards & buttons below. `--bg-black` is pure `#000`, not an off-black:
the section videos render at `(0,0,0)` themselves, and a lighter
`--bg-black` used to read as a faint seam against them wherever a video
faded in/out, breaking the "one consistent black" the site is going for
between sections.

**Header & hero.** The header (`.site-header`) is a floating rounded pill
(blurred semi-transparent fill, inset from the top) rather than a flush
full-width bar, and hides on scroll-down / reappears on scroll-up via a
master `ScrollTrigger`. Its logo (`#homeLogo`) is a plain "OPTYX"
wordmark, no icon (see "Known placeholders") — a normal in-page link to
`#top` for no-JS/reduced-motion visitors; with JS it also clears the
intro's session flag and does a full navigation back to the page root, so
clicking it replays the intro from scratch exactly as a first visit
would. The footer logo is the same plain wordmark. `.logo-word` runs a
touch larger than before with a thin `-webkit-text-stroke` layered on top
— Space Grotesk tops out at weight 700 (no 800/900, see Typography below),
so the stroke fakes the extra boldness a heavier weight would otherwise
give, without a synthetic-bold fallback kicking in.

A bold `.hero-corner-badge` ("Superior Web Design") sits top-right of the
hero, in `--font-display` to match the rest of the site's headings/nav —
positioned to clear the floating header pill above it and the vertically-
centred `.hero-stats` below it.

The hero itself is
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

**Beat-banner — blue-flow.** The site's one remaining punctuation beat
(there used to be two — see "Known placeholders" for the motion-trail
video this replaced). Not pinned — a normal scroll-through hold with
`blue-flow.mp4` behind the caption, fading in/out at its own section edges
(`start: 'top bottom', end: 'bottom top'`) so it doesn't pop in as a
hard-edged box. The caption gets the full per-word split-reveal treatment
(see Typography below) like every other heading/eyebrow on the site. The
clip's own black background is pure `#000` — the same value `--bg-black`
uses now (see Colour system above), so it reads as the exact same black as
every other section rather than a visibly different panel, checked
directly by sampling the clip's own corner pixels rather than assumed.

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
grid. Each row also carries a small outlined tag pill (Design / Conversion
/ Brand) next to its heading.

**Process rail.** `.rail` (`id="process"`, sits directly after Services)
is a horizontal-scroll section: vertical scroll drives horizontal motion
across three "how it works" cards plus a fourth white case-study card
linking down to LockOn. Same pin technique as the hero/beat-dots
(`pin: true` on the section), but instead of tweening a fixed distance it
tweens `x`/`end` as **functions** (`x: () => -railDistance()`, with
`invalidateOnRefresh: true`), so the scroll distance always matches the
track's actual rendered width — card widths are viewport-relative, so
that width isn't a constant. Deliberately framed as "how we work," not
"browse our projects": Optyx has one real case study so far, and a rail
that reads as a project gallery would make that thin instead of the
process steps it's actually built to spotlight (the LockOn card is styled
as a distinct case-study callout, not one card among a set of projects).

**Tools & platforms marquee.** `.marquee-section` (between Hero and
Services) is a continuous right-to-left auto-scroll of white cards —
Meta, Google Ads, WordPress, Python, Shopify, Stripe — each a simplified,
hand-built icon (not the official brand asset, same approach as the
WhatsApp icon elsewhere) paired with a text label. Framed as tools and
platforms Optyx builds with/for, not as a client-logo strip — Optyx has
one real case study so far (see the process rail above), so implying a
roster of clients here would misrepresent that. Pure CSS, no GSAP: the
track's markup is duplicated once and a `@keyframes` loop shifts it
exactly `-50%`, so the second copy scrolls in behind the first with no
seam; `mask-image` fades both edges for a cinematic dissolve rather than a
hard cut, and the loop pauses on hover. Gated by its own
`prefers-reduced-motion` media query (`animation: none`, `overflow-x:
auto`) rather than the sitewide `motion-active` JS gate, since it doesn't
depend on GSAP/ScrollTrigger at all.

**Cards & buttons.** `.btn-primary` uses its own gradient
(`--btn-blue`/`--btn-blue-hover`) pulled in close to the vivid teal
`--accent`/`--accent-bright` used everywhere else (it used to be a much
darker, desaturated steel/navy blend) so the CTA reads as the same blue as
the rest of the site rather than a separate, muted colour of its own; a
thin inset highlight/shadow pair keeps a bit of a brushed-metal edge so it
doesn't go flat. Every `.btn` sets its own label text uppercase
(`text-transform: uppercase`) with a touch of extra letter-spacing rather
than relying on manually capitalised copy. On `(hover: hover) and
(pointer: fine)` devices only:
testimonials and the direct-contact panel get a cursor-follow 3D tilt +
lift via `gsap.quickTo`; every `.btn` gets a magnetic hover (pulls toward
the cursor within a proximity radius, `power3.out` while tracking,
`premiumEase` on release) plus a press-scale, replacing the plain CSS
hover/`:active` for those users. Touch devices get none of that and rely
on the CSS hover/press states and the scroll-reveal entrance alone.

A handful of plain-CSS hover transitions layer on top of the JS-driven
system above rather than replacing it: nav links get a sliding underline,
the header/footer logo widens its letter-spacing, service rows brighten
their tag pill, and process-rail/testimonial/contact cards lift or
brighten their border — all subtle, all `--ease-premium`, none requiring
JS since they're plain `:hover` state changes.

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
- **Beat caption** — "Built to perform under real ad spend."
  (`.beat-caption` in `index.html`) is placeholder microcopy for the
  site's one remaining dark punctuation section.
- **`assets/video/motion-trail.mp4`** — no longer referenced anywhere (the
  site went from two punctuation-beat sections down to one, see Page
  structure above); the file is still in the repo in case it's wanted
  again, safe to delete otherwise.
- **`assets/video/grey-marketing-banner.mp4`** — no longer referenced
  anywhere; the file is still in the repo in case it's wanted again, safe
  to delete otherwise.
- **Tools & platforms marquee logos** — the six icons in
  `.marquee-track` (Meta, Google Ads, WordPress, Python, Shopify, Stripe)
  are hand-built simplified marks, not the official brand assets — same
  caveat as the WhatsApp icon below. Swap in official SVGs if
  pixel-perfect brand accuracy matters, and double-check each brand's
  usage guidelines before shipping their mark live.
- **Testimonials** — one of the two cards in the "Why us" section is a
  **drafted** 5-star quote attributed to Guy Lockwood (CEO, LockOn),
  written by Optyx to match the site's tone — Guy Lockwood has not
  reviewed or approved this wording. It carries a visible dashed
  "Draft — pending Guy Lockwood's approval" tag (`.draft-tag` in
  `css/styles.css`) for exactly that reason; do not remove the tag or
  treat the quote as a genuine testimonial until he's actually signed off
  on it. The second card is still a generic bracketed placeholder, quote
  and attribution both to be replaced.
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
