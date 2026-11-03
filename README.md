# philsn.co.uk

Personal site for Phil Sherwin-Nicholls, built with [Astro](https://astro.build).

## Running locally

Requires Node 24 (see `.nvmrc`).

```sh
npm install
npm run dev      # dev server at http://localhost:4321
npm run build    # static site written to dist/
npm run preview  # serve the built site
```

## Layout

- `src/pages/index.astro` — the home page; project and press lists live at the top of this file
- `src/pages/404.astro` — not-found page
- `src/layouts/Layout.astro` — shared `<head>` (title, meta, favicon, font preload)
- `src/styles/global.css` — font face and link styles
- `public/` — files served as-is (font, favicons)

## Piano practice app

`public/piano/` is a static, no-build web app (served at `/piano/`) for learning piano with a
MIDI keyboard over Web MIDI: note/staff/ear/chord/scale drills, falling-notes songs, a sound lab
and custom drills/songs. Web MIDI needs HTTPS (or localhost) and Chrome/Android or a MIDI-capable
browser app on iPad. To try it locally: `npm run dev` then open http://localhost:4321/piano/.

## Deploying

Hosted on GitHub Pages, with DNS for philsn.co.uk on Cloudflare. Every push
to `main` builds the site and deploys it via `.github/workflows/deploy.yml`
(Settings → Pages → Source must be "GitHub Actions"). Pull requests run the
build only, as a check.
