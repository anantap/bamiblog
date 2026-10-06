# bami.blog — design

A logbook of instant noodles, in the spirit of [nice.rocks](https://nice.rocks/): a quiet grid of numbered photos grouped by date and place.

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
| place   | optional, ≤ 80 chars                    |
| date    | required, `YYYY-MM-DD`, defaults today  |

## API

- `GET /api/entries` — public, all entries.
- `POST /api/entries` — auth; JSON body with fields + `photo` as a data URL (resized client-side to ≤ 1600px WebP/JPEG).
- `DELETE /api/entries?id=…` — auth; removes the entry and its photo.
- `GET /api/login` → `{ loggedIn }`; `POST /api/login` `{ password }` sets the cookie; `DELETE /api/login` logs out.

## Auth

Single password in `ADMIN_PASSWORD`. Session cookie is an HMAC of a fixed string keyed by the password (HttpOnly, Secure, SameSite=Lax, 1 year). Changing the password logs everyone out.

## Pages

- `/` — logo, ABOUT, grid newest-first. Consecutive entries with the same date + place share a text card (`DD/MM/YYYY`, place). Caption: `🇮🇩 INDOMIE — MI GORENG · ★4`. Tap opens a dialog with the large photo and note; when logged in it has a delete button.
- `/add` — phone-first form (camera input, fields, date defaults to today), login prompt if not logged in.

## Out of scope

Editing entries, tags, search, stats, login rate limiting.

## Testing

Vitest for validation, auth signing and grouping/caption formatting; manual browser run-through of login → add → view → delete.
