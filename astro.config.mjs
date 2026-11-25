import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// On GitHub Actions GITHUB_REPOSITORY is "owner/repo". Locally we fall back to placeholders.
const [owner, repo] = (process.env.GITHUB_REPOSITORY || 'OWNER/trinity-games').split('/');
const domain = process.env.CUSTOM_DOMAIN; // optional, set later as a repo variable

export default defineConfig({
  site: domain ? `https://${domain}` : `https://${owner}.github.io`,
  base: domain ? '/' : `/${repo}`,
  integrations: [sitemap()],
});
