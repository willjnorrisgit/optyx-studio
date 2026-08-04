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

The page alternates black and off-white sections all the way down. Both
"beat" sections now hold as long as the light sections either side of
them (`min-height: 130vh`, same as `.services`/`.why-us`) rather than
being a short, cramped pause — the second one is now a video-free, quiet
dark hold rather than a repeat of the same treatment:

```
Hero (black, video, pinned)
  → Services "What we do" (off-white, holds)
    → Beat: dot-waves (black, video, holds)
      → Why us (off-white, holds)
        → Beat: quiet dark hold, no video
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
section contributes a genuine flat *plateau* at its own target value, and
every colour change happens entirely within the **outgoing** section's own
tail (`buildBgKeyframes()`) — never bleeding into the section that follows
— so a heading is never revealed while the background underneath it is
still mid-blend. `final-section` is the one section whose content sits
right at its own top edge rather than being vertically centred (unlike
every other section), so its incoming boundary gets an extra lead
distance on top of the normal ramp. The hero is a special case: it's
pinned and fully opaque throughout, so its own ramp is anchored to the
pin's *actual* release point (`heroTl.scrollTrigger.end`) rather than its
own height — otherwise the whole blend would happen hidden behind the
pinned, opaque hero and the cut to the next section would look abrupt
instead of like a blend. Sections turn transparent only once
`body.motion-active` is present, so the reduced-motion fallback is just
each section's own solid CSS colour, unchanged.

**Header & hero.** The header hides on scroll-down and reappears on
scroll-up via a master `ScrollTrigger`. Its logo (`#homeLogo`) is a normal
in-page link to `#top` for no-JS/reduced-motion visitors; with JS it also
clears the intro's session flag and does a full navigation back to the
page root, so clicking it replays the intro from scratch exactly as a
first visit would. The hero itself is **pinned** (`pin: true`) for one
extra viewport height of scroll, and the wordmark visibly separates from
the video during it: the video retreats upward for the whole pinned range
while the badge drops steadily downward across that same range (opposite
directions, so the gap between them grows continuously), fading out only
in the pin's final 40% once it's dropped well clear, right as the next
section takes over.

**Video-section edges.** A `<video>` is fully opaque and fills its whole
section, so left alone it just pops in and out as a hard-edged box the
instant its section enters or leaves the viewport — no matter how smooth
`bgField`'s own colour transition is either side of it. Every `.beat
video`'s fade is *sequenced*, not concurrent with `bgField`'s own ramp:
the background finishes darkening completely first, then the video fades
in; on the way out, the video fades out completely first, then the
background starts lightening. The video's own trigger end is computed
with the exact same `RAMP_FRACTION` used by `buildBgKeyframes()`, so its
fade-out always finishes exactly where the background's ramp begins —
concurrent fades just trade one seam for a subtler one, so the two now
never overlap at all.

**Off-white tone.** `--bg` is a cool, slightly blue-grey `#f0f1f3`
("silvery") rather than a warm cream, to read as one family with the
videos' own grey/blue tones and the metallic-blue accent — not a separate,
warmer palette.

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
