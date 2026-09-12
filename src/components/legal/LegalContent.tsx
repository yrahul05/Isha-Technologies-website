import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';

/** Shared prose styling for legal page bodies — plain, readable, no cards. */
export function LegalContent({ content }: { content: string }) {
  return (
    <div
      className="prose prose-slate max-w-none
        prose-h2:mt-10 prose-h2:mb-3 prose-h2:scroll-mt-28 prose-h2:text-xl prose-h2:font-bold prose-h2:tracking-tight prose-h2:text-gray-900 md:prose-h2:text-2xl
        prose-h3:mt-6 prose-h3:mb-2 prose-h3:text-base prose-h3:font-semibold prose-h3:text-gray-900
        prose-p:leading-relaxed prose-p:text-gray-600
        prose-li:leading-relaxed prose-li:text-gray-600
        prose-strong:text-gray-900
        prose-a:font-medium prose-a:text-brand prose-a:underline prose-a:underline-offset-2 hover:prose-a:no-underline
        prose-hr:my-8 prose-hr:border-gray-200"
    >
      <ReactMarkdown rehypePlugins={[rehypeRaw]}>{content}</ReactMarkdown>
    </div>
  );
}
