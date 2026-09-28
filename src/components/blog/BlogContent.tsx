import type { ReactNode } from 'react';
import { isValidElement } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import { CodeBlock } from './CodeBlock';
import { Callout } from './Callout';
import { ComparisonTable } from './ComparisonTable';
import type { BLOG_VARIANT_STYLES } from '@/data/blog-variants';

/** Flattens a react-markdown-rendered node tree back to plain text — used
 * to recover the original code string for the copy button and language
 * detection, since react-markdown hands `pre` its already-rendered `code`
 * child rather than a raw string. */
function extractText(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(extractText).join('');
  if (isValidElement<{ children?: ReactNode }>(node)) return extractText(node.props.children);
  return '';
}

type VariantStyle = (typeof BLOG_VARIANT_STYLES)[keyof typeof BLOG_VARIANT_STYLES];

/**
 * Renders a blog post's `contentHtml` with its own react-markdown setup
 * (separate from the generic MarkdownContainerNormal, so this stays scoped
 * to blog articles): premium code blocks with a copy button,
 * variant-accented blockquotes/callouts, scroll-margin on headings so
 * anchor jumps from the Table of Contents land below the sticky header,
 * and readable spacing tuned for long-form articles rather than dense
 * legal text.
 *
 * Every element override here is a generic tag mapping (h2, table, pre, …)
 * — it enhances whatever structure a post's `contentHtml` already has
 * instead of requiring the content to be rewritten to "fit" a template.
 * A post with no table/blockquote simply never renders those overrides.
 */
export function BlogContent({ html, variant }: { html: string; variant: VariantStyle }) {
  return (
    <div
      className="prose prose-slate max-w-none
        prose-headings:scroll-mt-28 prose-headings:font-bold prose-headings:tracking-tight prose-headings:text-black
        prose-h2:mt-12 prose-h2:mb-4 prose-h2:text-2xl prose-h2:first:mt-0
        prose-h3:mt-8 prose-h3:mb-3 prose-h3:text-lg
        prose-p:leading-[1.8] prose-p:text-gray-700
        prose-li:leading-[1.8] prose-li:text-gray-700 prose-ol:my-5 prose-ul:my-5
        prose-strong:text-black prose-strong:font-semibold
        prose-a:font-medium prose-a:text-brand prose-a:underline prose-a:decoration-brand/30 prose-a:underline-offset-2 hover:prose-a:decoration-brand
        prose-code:rounded prose-code:bg-gray-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:text-[0.85em] prose-code:font-medium prose-code:text-brand prose-code:before:content-none prose-code:after:content-none
        prose-table:text-sm prose-thead:border-b-2 prose-thead:border-gray-200 prose-th:font-semibold prose-th:text-black
        prose-hr:my-10 prose-hr:border-gray-200"
    >
      <ReactMarkdown
        rehypePlugins={[rehypeRaw]}
        components={{
          pre({ children }) {
            const code = extractText(children).replace(/\n$/, '');
            return <CodeBlock code={code} />;
          },
          blockquote({ children }) {
            return (
              <Callout
                accentText={variant.text}
                accentSoft={variant.soft}
                accentBorder={variant.border}
              >
                {children}
              </Callout>
            );
          },
          table({ children }) {
            return <ComparisonTable>{children}</ComparisonTable>;
          },
          th({ children }) {
            return (
              <th className="border-b-2 border-gray-200 bg-gray-50 px-4 py-3 text-left font-semibold text-black">
                {children}
              </th>
            );
          },
          td({ children }) {
            return <td className="border-b border-gray-100 px-4 py-3 text-gray-700">{children}</td>;
          },
        }}
      >
        {html}
      </ReactMarkdown>
    </div>
  );
}
