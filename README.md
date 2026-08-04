# Optyx Studio

Landing page for Optyx Studio — a premium web design agency building
conversion-focused websites for businesses that already know how to
advertise.

Plain HTML/CSS/JS, no build step, deploy-ready for GitHub Pages.

## Structure

```
index.html                                Page markup
css/styles.css                            All styling
js/main.js                                Intro, mask-wipe/scroll engine, nav, contact form
assets/favicon.svg                        Browser tab icon
assets/video/abstract-art-03.mp4          Hero background loop
assets/video/dot-waves.mp4                First punctuation-beat section background loop
assets/video/grey-marketing-banner.mp4    Second punctuation-beat section background loop
```

Both background videos were re-encoded from the originals with a 0.4s
cross-dissolve baked into the loop point, to fix a visible jump at the
loop restart.

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

Every black/off-white boundary uses a **scroll-scrubbed circular mask
wipe** (`#wipeOverlay` in `index.html`, driven by `js/main.js`) instead of
a crossfade: a fixed, full-viewport overlay whose `clip-path: circle()`
radius is driven directly by scroll position through an eased
(`--ease-cinematic`) cubic-bezier curve, growing from the bottom of the
viewport to fully cover it. Zone boundaries are computed from the actual
section `offsetTop`/`offsetHeight` at load/resize, so they always span
exactly the scroll range where the raw section seam would otherwise be
visible — and are clamped so adjacent zones never overlap (short sections
can otherwise cause a zone to start mid-progress instead of at 0%).

A small ring-and-dot badge (`#badgeDrift`) drifts continuously across the
screen for the entire scroll — position, scale and rotation are all a
function of `scrollY` — and inverts its stroke colour between white and
black depending on the current section's theme, using the same zone data
as the wipe.

The two video sections layer a near-static background video, a large
faint background word drifting slowly, and a foreground caption drifting
faster, for a sense of depth (`.beat-bigtype` / `.beat-inner[data-speed]`
in `index.html`).

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
