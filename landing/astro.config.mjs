import { defineConfig } from "astro/config";
import cloudflare from "@astrojs/cloudflare";
import tailwind from "@astrojs/tailwind";
import react from "@astrojs/react";

export default defineConfig({
  site: "https://skerry.cloud",
  output: "server",
  adapter: cloudflare({
    imageService: "compile",
  }),
  integrations: [tailwind({ applyBaseStyles: false }), react()],
  prefetch: { defaultStrategy: "viewport" },
  vite: {
    define: {
      "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV ?? "production"),
    },
  },
});
