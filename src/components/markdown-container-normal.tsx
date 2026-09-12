import ReactMarkdown from 'react-markdown';
import { MarkdownUINormal } from './markdown-ui-nomal';
import rehypeRaw from 'rehype-raw';

export function MarkdownContainerNormal({
  content,
  className = '',
}: {
  content: string;
  className?: string;
}) {
  return (
    <>
      <MarkdownUINormal
        className={`${className} mx-auto max-w-full lg:max-w-4xl bg-light p-6 lg:p-10`}
      >
        <ReactMarkdown rehypePlugins={[rehypeRaw]}>
          {content}
        </ReactMarkdown>
      </MarkdownUINormal>
    </>
  );
}
