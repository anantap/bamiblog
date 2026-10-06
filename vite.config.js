import { resolve } from "node:path";
import { defineConfig, loadEnv } from "vite";

// Runs api/*.js inside the Vite dev server with a minimal stand-in for Vercel's req/res helpers,
// so `npm run dev` works end to end without `vercel dev`.
function devApi() {
  return {
    name: "dev-api",
    configureServer(server) {
      server.middlewares.use("/api", async (req, res, next) => {
        const url = new URL(req.url, "http://localhost");
        const name = url.pathname.replace(/^\/|\/$/g, "");
        if (!/^[a-z-]+$/.test(name)) return next();

        let mod;
        try {
          mod = await server.ssrLoadModule(`/api/${name}.js`);
        } catch {
          return next();
        }

        const chunks = [];
        try {
          for await (const chunk of req) chunks.push(chunk);
        } catch {
          return; // the browser gave up on the request (e.g. navigated away)
        }
        const raw = Buffer.concat(chunks).toString();
        try {
          req.body = raw ? JSON.parse(raw) : undefined;
        } catch {
          req.body = undefined;
        }
        req.query = Object.fromEntries(url.searchParams);
        res.status = (code) => {
          res.statusCode = code;
          return res;
        };
        res.json = (data) => {
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify(data));
        };

        try {
          await mod.default(req, res);
        } catch (err) {
          server.config.logger.error(err.stack);
          res.status(500).json({ error: "server error" });
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  Object.assign(process.env, loadEnv(mode, process.cwd(), ""));
  return {
    plugins: [devApi()],
    build: {
      rollupOptions: {
        input: {
          main: resolve(import.meta.dirname, "index.html"),
          add: resolve(import.meta.dirname, "add/index.html"),
          about: resolve(import.meta.dirname, "about/index.html"),
        },
      },
    },
  };
});
