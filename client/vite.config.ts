// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
// NOTE: `@lovable.dev/vite-tanstack-config` currently points its `main` field to a CJS build
// that `require()`s an ESM-only dependency (`lovable-tagger`) and crashes under Vite/Node.
// Import the ESM build directly to avoid that resolution path.
import { defineConfig } from "@lovable.dev/vite-tanstack-config/dist/index.js";

// Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
// @cloudflare/vite-plugin builds from this — wrangler.jsonc main alone is insufficient.
export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
});
