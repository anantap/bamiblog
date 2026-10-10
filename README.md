# bami.blog

A logbook of instant noodles, inspired by [nice.rocks](https://nice.rocks/). Every pack gets a photo, a number, a flag and a rating out of five.

```bash
npm install
npm run dev     # http://localhost:5173
npm test
```

`npm run dev` runs the `/api` routes too. Without storage credentials it keeps entries in memory (gone when the server restarts), so you can play freely. Put `ADMIN_PASSWORD=…` in `.env.local` to log in at `/add/`.

## Deploy

1. Import this repo on [Vercel](https://vercel.com/new) — it auto-detects Vite.
2. Storage tab → connect an **Upstash Redis** database and a **Blob** store.
3. Settings → Environment Variables → add `ADMIN_PASSWORD`.
4. Settings → Domains → add `bami.blog`.
5. For the weekly email, add `BUTTONDOWN_API_KEY` (Buttondown → Settings → API) and `CRON_SECRET` (any long random string) too.

## Weekly email

Every Monday morning (06:00 UTC, set in `vercel.json`) a Vercel cron job emails your [Buttondown](https://buttondown.com) subscribers every noodle added since the last email: number, date, name, location, photo and your review. No ratings, and no email in a week without noodles. Logged in, open `/api/digest` to preview the next one, or `/api/digest?mode=draft` to save it as a draft in Buttondown; neither sends anything.

## Adding noodles

Go to `bami.blog/add/` on your phone, log in once (it remembers you for a year), snap the pack, fill in the rest. To fix a mistake, open the entry on the homepage and hit DELETE, then add it again.
