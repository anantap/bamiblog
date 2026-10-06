# bami.blog — design

A logbook of instant noodles, loosely inspired by [nice.rocks](https://nice.rocks/): a quiet grid of numbered photos. Set in Inter, with the wobbly wordmark as logo and a `b.b` favicon.

## Stack

- Plain Vite front-end (no framework), deployed on Vercel, domain `bami.blog`.
- Vercel Blob for photos, Upstash Redis for entries (hash `bami:entries`, counter `bami:counter`).
- Without Redis/Blob credentials and outside Vercel, the API falls back to an in-memory store so `npm run dev` works end to end.

## Entry

| field   | rules                                   |
|---------|-----------------------------------------|
| number  | assigned by the server, never reused    |
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

- `/` — logo, ABOUT, grid newest-first. Each tile: number and date (`DD/MM/YYYY`) above the photo, stars below. Tiles do not open; brand, flavour and flag live in the photo alt text. When logged in, each tile shows a × to delete it.
- `/add` — phone-first form, login prompt if not logged in. After taking a photo you frame it in a square crop (drag, pinch/scroll or slider to zoom, pack-shaped rectangular guide); only that square is uploaded, at most 1200×1200.
- `/about/` — full page, just "send noods" (also the empty-grid text).

## Out of scope

Editing entries, tags, search, stats, login rate limiting.

## Testing

Vitest for validation, auth signing and grouping/caption formatting; manual browser run-through of login → add → view → delete.
