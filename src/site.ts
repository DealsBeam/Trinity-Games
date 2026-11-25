const [owner, repo] = (process.env.GITHUB_REPOSITORY || 'OWNER/trinity-games').split('/');

export const SITE = {
  name: 'Trinity Games',
  tagline: 'Decomps. Recomps. Ports.',
  description:
    'A hand-reviewed index of decompilations, recompilations and PC ports of classic games. We link to projects and never host games or downloads.',
  owner,
  repo,
};

// Always build internal links with u(): it is correct under /repo-name/ and at a custom domain.
const base = import.meta.env.BASE_URL.replace(/\/+$/, '');
export const u = (path = '') => `${base}/${path.replace(/^\/+/, '')}`;

export const issueUrl = (template: string) =>
  `https://github.com/${owner}/${repo}/issues/new?template=${template}.yml`;
