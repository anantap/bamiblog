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

## Adding noodles

Go to `bami.blog/add/` on your phone, log in once (it remembers you for a year), snap the pack, fill in the rest. To fix a mistake, open the entry on the homepage and hit DELETE, then add it again.
