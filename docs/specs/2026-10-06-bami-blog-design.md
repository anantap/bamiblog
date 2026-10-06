# bami.blog — design

A logbook of instant noodles, loosely inspired by [nice.rocks](https://nice.rocks/): a quiet grid of numbered photos. Set in Instrument Sans SemiBold. The `b.b` mark sits top left on the grid and add pages (and is the favicon); the About page drops it and shows the full wobbly wordmark instead, with a hand-drawn red × (`close.svg`) to close. "about" (header) and "send noods" (About page, empty grid) are lettering built only from the logo's own shapes (`tools/lettering`, output in `public/lettering/`); "Log out" keeps a wobbly red outline (`button-border.svg`).

## Stack

- Plain Vite front-end (no framework), deployed on Vercel, domain `bami.blog`.
- Vercel Blob for photos, Upstash Redis for entries (hash `bami:entries`).
- Without Redis/Blob credentials and outside Vercel, the API falls back to an in-memory store so `npm run dev` works end to end.

## Entry

| field   | rules                                   |
|---------|-----------------------------------------|
| number  | assigned by the server: highest existing + 1 (empty log starts at 001) |
| photo   | Blob URL                                |
| brand   | required, ≤ 60 chars                    |
| flavour | optional, ≤ 80 chars                    |
| country | optional, ISO-3166 alpha-2 from list    |
| rating  | required, integer 1–5                   |
| note    | optional, ≤ 280 chars                   |
| place   | optional, ≤ 80 chars (no longer in the form or on the page) |
| date    | required, `YYYY-MM-DD`, defaults today  |

## API

- `GET /api/entries` — public, all entries.
- `POST /api/entries` — auth; JSON body with fields + `photo` as a data URL (square crop made client-side, ≤ 1200×1200 WebP/JPEG).
- `DELETE /api/entries?id=…` — auth; removes the entry and its photo.
- `GET /api/login` → `{ loggedIn }`; `POST /api/login` `{ password }` sets the cookie; `DELETE /api/login` logs out.

## Auth

Single password in `ADMIN_PASSWORD`. Session cookie is an HMAC of a fixed string keyed by the password (HttpOnly, Secure, SameSite=Lax, 1 year). Changing the password logs everyone out.

## Pages

- `/` — logo, ABOUT, grid newest-first. Each tile: number and date (`DDMMYY`) above the photo, stars below. Tiles do not open; brand, flavour and flag live in the photo alt text. When logged in, each tile shows a × to delete it.
- `/add` — phone-first form, login prompt if not logged in. The photo (library, camera or files) sits in a square frame under a fixed dashed guide at 84% of the tile. Move it by dragging; zoom by pinching (phone), trackpad pinch or scroll wheel (desktop), or + / − keys (arrows also move). Line the pack's long side (or a cup's rim) up with the guide; only the framed square is uploaded, at most 1200×1200.
- `/about/` — full page: the bami.blog wordmark above "send noods" (also the empty-grid text), linking to a mailto with subject "noods"; the address is assembled in JS so it is not in the HTML.

## Out of scope

Editing entries, tags, search, stats, login rate limiting.

## Testing

Vitest for validation, auth signing and grouping/caption formatting; manual browser run-through of login → add → view → delete.
