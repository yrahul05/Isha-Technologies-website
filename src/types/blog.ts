/** One entry in an article's table of contents. `id` must match the
 * `id` attribute of the matching `<h2 id="...">` in `contentHtml`. */
export type BlogTocEntry = {
  id: string;
  heading: string;
};

export type BlogPost = {
  /** URL slug — the page lives at /resources/blogs/[slug]. */
  slug: string;
  title: string;
  category: string;
  excerpt: string;
  introduction: string;
  readingTime: string;
  author: string;
  /** Shown instead of a fabricated historical publish date. */
  publishedLabel: string;
  /** Key into the ServiceHeroVisual visual map — reuses the site's existing
   * custom SVG/Framer Motion visual system instead of stock imagery. */
  visualSlug: string;
  ctaLabel: string;
  ctaHref: string;
  toc: BlogTocEntry[];
  /** Article body as an HTML string, rendered via MarkdownContainerNormal —
   * the same mechanism already used for the legal pages. */
  contentHtml: string;
  keyTakeaways: string[];
};
