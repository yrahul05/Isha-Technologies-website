import ReactMarkdown from 'react-markdown';
import { MarkdownUI } from './markdown-ui';

export function MarkdownContainer({
  content,
  className = '',
}: {
  content: string;
  className?: string;
}) {
  return (
    <>
      <MarkdownUI
        className={`${className} mx-auto max-w-full lg:max-w-4xl bg-light p-6 lg:p-10`}
      >
        <ReactMarkdown>{content}</ReactMarkdown>
      </MarkdownUI>
    </>
  );
}
