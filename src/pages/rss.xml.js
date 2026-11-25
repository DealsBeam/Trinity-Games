import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { SITE, u } from '../site';

export async function GET(context) {
  const posts = (await getCollection('news')).sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
  return rss({
    title: SITE.name,
    description: SITE.description,
    site: new URL(u(), context.site).href,
    items: posts.map((p) => ({
      title: p.data.title,
      pubDate: p.data.date,
      description: p.data.summary,
      link: u(`news/${p.id}/`),
    })),
  });
}
