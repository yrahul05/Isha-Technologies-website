export function MarkdownUINormal({
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
        prose-p:w-full 
        prose-h2:text-lg prose-h2:tracking-tight lg:prose-h2:text-2xl prose-h2:mb-2 prose-h2:font-bold
        lg:prose-p:text-base prose-p:text-sm prose-p:font-light

        lg:prose-li:text-base prose-li:text-sm prose-li:font-light
        prose-hr:my-4 prose-h3:text-md prose-h3:tracking-tight lg:prose-h3:text-lg prose-h3:mb-2 
        prose-a:text-sm lg:prose-a:text-base prose-a:text-brand prose-a:underline prose-a:hover:no-underline ${className} text-black prose-strong:text-black
        prose-iframe
        
        `}>
        {children}
      </div>
    </>
  );
}
