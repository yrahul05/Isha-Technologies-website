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
  /** Specific, reusable tags for this post (distinct from `category`,
   * which is the single primary taxonomy bucket). Keep this short and
   * genuinely relevant — not a dumping ground for every related term. */
  tags: string[];
  excerpt: string;
  introduction: string;
  /** The main search term this article targets. Used to inform the meta
   * keywords tag; should already read naturally in the title/body — never
   * stuffed in artificially. */
  primaryKeyword: string;
  /** A handful of related search terms, same rules as `primaryKeyword`. */
  secondaryKeywords: string[];
  readingTime: string;
  author: string;
  /** Only 'published' posts are ever reachable publicly — via the listing
   * page, sitemap, related-posts, or a direct slug URL. A 'draft' post
   * stays in this file (so it's easy to review in a PR) but 404s and is
   * invisible everywhere until flipped to 'published'. */
  status: 'published' | 'draft';
  /** Real ISO 8601 timestamps — never fabricated. Sourced from the git
   * commit that actually introduced this post. `publishedAt` never
   * changes after that; bump `updatedAt` only for a substantive content
   * edit made after publication. */
  publishedAt: string;
  updatedAt: string;
  /** Key into the ServiceHeroVisual visual map — reuses the site's existing
   * custom SVG/Framer Motion visual system instead of stock imagery. */
  visualSlug: string;
  ctaLabel: string;
  ctaHref: string;
  toc: BlogTocEntry[];
  /** Article body as an HTML string, rendered via BlogContent (blog
   * pages) using react-markdown + rehype-raw with element overrides
   * (premium code blocks, callouts, styled tables). */
  contentHtml: string;
  keyTakeaways: string[];
  /** Optional FAQ entries rendered as an accordion (FAQSection). Only set
   * when a post genuinely has them — never force-populated. */
  faqs?: { question: string; answer: string }[];
};

/** Fields needed to render a post teaser (BlogCard / FeaturedBlog on the
 * listing page and the "Related Articles" section). Deliberately excludes
 * `contentHtml`/`toc`/`keyTakeaways` — the full article body — so those
 * views don't have to serialize every post's entire content just to show a
 * title, excerpt and a couple of metadata fields. */
export type BlogPostSummary = Pick<
  BlogPost,
  | 'slug'
  | 'title'
  | 'category'
  | 'tags'
  | 'excerpt'
  | 'readingTime'
  | 'publishedAt'
  | 'visualSlug'
>;
