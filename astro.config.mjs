import { defineConfig } from "astro/config"
import sitemap from "@astrojs/sitemap"

export default defineConfig({
  site: "https://philsn.co.uk",
  integrations: [sitemap()],
})
