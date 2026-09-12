export function MarkdownUI({
  children,
  className = '',
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <>
      <div
        className={`prose

  prose-h2:tracking-tighter prose-h2:mb-3 prose-h2:mt-2 prose-h2:border-l-2 prose-h2:pl-4 prose-h2:py-2 prose-h2:bg-brand/5 prose-h2:border-brand prose-h2:font-bold prose-h2:text-xl md:prose-h2:text-2xl
  prose-h3:font-semibold prose-h3:text-xl lg:prose-h3:text-xl prose-h3:mb-2 prose-h3:tracking-tight

  prose-p:text-sm lg:prose-p:text-base prose-p:leading-relaxed prose-p:text-neutral-700
  prose-li:list-disc prose-li:text-sm lg:prose-li:text-base prose-li:font-light marker:text-primary marker:font-bold
  prose-ul:pl-5 prose-ol:pl-5
  
  prose-li:marker:text-brand
  

  prose-a:text-primary prose-a:underline hover:prose-a:no-underline hover:prose-a:text-primary-dark

  prose-img:rounded-xl prose-img:shadow-lg prose-img:my-4
  prose-hr:my-6 border-t border-neutral-200

  prose-blockquote:border-l-4 prose-blockquote:pl-4 prose-blockquote:text-neutral-600 prose-blockquote:italic prose-blockquote:border-primary

  prose-strong:text-black prose-strong:font-semibold

  text-black
  ${className}`}
      >
        {children}
      </div>
    </>
  );
}
