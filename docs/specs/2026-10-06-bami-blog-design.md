# bami.blog — design

A logbook of instant noodles, loosely inspired by [nice.rocks](https://nice.rocks/): a quiet grid of numbered photos. Brutalist: one font, DM Mono (400 and 500, from Google Fonts), and no fades or transitions. The `b.b` mark sits top left on the grid and add pages (and is the favicon), with a plain-text "about" link bottom right in anthracite `#2E2E30`, so the logo is the only drawn shape in the header. The About page has no header: its full wobbly wordmark links back to the grid. "send noods" (About page, empty grid) and "receive noods" (About page) are lettering built only from the logo's own shapes (`tools/lettering`, output in `public/lettering/`).

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
| review  | optional, ≤ 2000 chars; only in the weekly email, never on the site |
| place   | optional, where it was eaten: `City, CC` with a two-letter country code (e.g. `The Hague, NL`), ≤ 80 chars |
| date    | required, `YYYY-MM-DD`, defaults today  |

## API

- `GET /api/entries` — public, all entries; `rating` and `review` are left out unless logged in.
- `POST /api/entries` — auth; JSON body with fields + `photo` as a data URL (square crop made client-side, ≤ 1200×1200 WebP/JPEG).
- `PATCH /api/entries?id=…` — auth; JSON body `{ place }`, the only field that can be changed after saving.
- `DELETE /api/entries?id=…` — auth; removes the entry and its photo.
- `GET /api/digest` — the weekly email. Vercel cron (`vercel.json`, Mondays 06:00 UTC, authorised with `CRON_SECRET`) sends every entry added since the last send to Buttondown subscribers; skipped when there are none. Logged in: `?mode=preview` (default) returns the email, `?mode=draft` saves it as a Buttondown draft. The last send time lives in Redis (`bami:digest-sent`).
- `GET /api/login` → `{ loggedIn }`; `POST /api/login` `{ password }` sets the cookie; `DELETE /api/login` logs out (no button for it on the site; clear the cookie or change `ADMIN_PASSWORD` instead).

## Auth

Single password in `ADMIN_PASSWORD`. Session cookie is an HMAC of a fixed string keyed by the password (HttpOnly, Secure, SameSite=Lax, 1 year). Changing the password logs everyone out.

## Pages

- `/` — logo, about, grid newest-first. Each tile: number and date (`DD.MM.YY`) above the photo, in DM Mono 400 anthracite. Ratings are never shown on the site; they are kept for a later yearly overview. Tiles do not open; brand, flavour and flag live in the photo alt text. The location, if set, sits under the photo in the same style. When logged in, each tile shows a red "Delete" text link under that.
- `/add` — phone-first form, login prompt if not logged in (no log-out button). The photo (library, camera or files) sits in a square frame under a fixed dashed guide at 84% of the tile. Move it by dragging; zoom by pinching (phone), trackpad pinch or scroll wheel (desktop), or + / − keys (arrows also move). Line the pack's long side (or a cup's rim) up with the guide; only the framed square is uploaded, at most 1200×1200.
- `/about/` — full page: the bami.blog wordmark, a short text in which "receive noods" (the weekly ingest's Buttondown sign-up page, `buttondown.com/bami.blog`) and "send noods" (also the empty-grid text) each sit under the paragraph that introduces them; "send noods" links to a mailto with subject "noods"; the address is assembled in JS so it is not in the HTML.

## Out of scope

Editing entries, tags, search, stats, login rate limiting.

## Testing

Vitest for validation, auth signing and grouping/caption formatting; manual browser run-through of login → add → view → delete.
