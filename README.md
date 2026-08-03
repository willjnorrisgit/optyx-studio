# Optyx Studio

Landing page for Optyx Studio — a premium web design agency building
conversion-focused websites for businesses that already know how to
advertise.

Plain HTML/CSS/JS, no build step, deploy-ready for GitHub Pages.

## Structure

```
index.html                                Page markup
css/styles.css                            All styling
js/main.js                                Intro, cinematic scroll engine, nav, contact form
assets/favicon.svg                        Browser tab icon
assets/video/abstract-art-03.mp4          Hero background loop
assets/video/dot-waves.mp4                Case study section background loop
assets/video/grey-marketing-banner.mp4    Contact section background loop
assets/video/gradient-bg.mp4              Closing section background loop (ping-pong loop — see below)
```

All four background videos were re-encoded from the originals to fix a
visible jump at the loop restart:

- `abstract-art-03`, `dot-waves`, `grey-marketing-banner` — a 0.4s
  cross-dissolve was baked into the loop point.
- `gradient-bg` — its motion doesn't cycle (a continuously morphing
  gradient, not a rotating object), so a cross-dissolve still showed a
  visible blend between two different-looking frames. It's encoded as a
  **ping-pong loop** instead (forward + time-reversed copy, 20s total) —
  the loop point is mathematically exact since the reversed copy always
  ends back at frame 0.

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
