import { defineConfig } from "astro/config"
import sitemap from "@astrojs/sitemap"

export default defineConfig({
  site: "https://philsn.co.uk",
  integrations: [sitemap()],
  // Inline CSS to save a render-blocking request
  build: { inlineStylesheets: "always" },
})
