# IP Address Tracker

A responsive IP geolocation tracker built as a [Frontend Mentor](https://www.frontendmentor.io) challenge. Search by IP address or domain and see the location, timezone and ISP on an interactive map. On first load it shows the visitor's own IP.

## Demo

- Live site: https://ip-address-tracker-master-ochre.vercel.app
- Repository: _add your repo URL here_

## Features

- Search by IPv4 address or domain name.
- Displays IP, location, timezone (UTC offset) and ISP.
- Interactive map (Leaflet + OpenStreetMap) with a marker for the result.
- Initial load shows the visitor's own IP and location.
- Responsive layout (mobile 375px → desktop 1440px).
- Live search with debounce and request cancellation (AbortController).
- Accessible: semantic HTML, `aria-live` updates, keyboard navigation, visible focus.

## Tech stack

- [Vite](https://vitejs.dev/) (vanilla JS, no framework)
- [Leaflet](https://leafletjs.com/) for the map
- [IPify Geolocation API](https://geo.ipify.org/) for IP/domain lookup
- Plain CSS (custom properties, mobile-first, BEM-ish naming)

## Getting started

```bash
# Install dependencies
npm install

# Create your env file
cp .env.example .env
# then edit .env and set VITE_IPIFY_API_KEY to your free key from https://geo.ipify.org/

# Run the dev server
npm run dev
```

The app runs at `http://localhost:5173`.

## Environment variables

| Variable | Description |
| --- | --- |
| `VITE_IPIFY_API_KEY` | Free API key from IPify Geolocation (no card required). |

> ⚠️ IPify does not support key restriction by domain, so the key is exposed to the client. Use only the free tier and never commit a paid key. `.env` is gitignored.

## Scripts

- `npm run dev` — start the Vite dev server with HMR.
- `npm run build` — production build into `dist/`.
- `npm run preview` — preview the production build locally.

## Project structure

```
├── index.html
├── public/            # static assets served at root (images, robots.txt)
├── src/
│   ├── main.js        # app logic: API, map, DOM, events
│   └── style.css      # tokens, base, components, responsive
├── design/            # Frontend Mentor mockups (not shipped)
└── .env.example
```

## Notes / learnings

- Leaflet's default marker icons break under Vite's asset bundling; they are re-registered via `L.Icon.Default.mergeOptions` using imported PNGs.
- Vite only exposes env vars prefixed with `VITE_` to the client (`import.meta.env.VITE_*`).
- Static files must live in `public/` to be copied to `dist/` in production.

## Acknowledgements

Challenge by [Frontend Mentor](https://www.frontendmentor.io). Coded by [Your Name Here](https://github.com/your-username).