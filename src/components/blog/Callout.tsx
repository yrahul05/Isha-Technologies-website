import type { LucideIcon } from 'lucide-react';
import { Info } from 'lucide-react';
import type { ReactNode } from 'react';

type CalloutProps = {
  icon?: LucideIcon;
  title?: string;
  children: ReactNode;
  /** Tailwind text/bg/border utilities from BLOG_VARIANT_STYLES, so a
   * callout picks up the post's variant accent instead of always brand blue. */
  accentText?: string;
  accentSoft?: string;
  accentBorder?: string;
};

/** A highlighted box for a key point, note, or (via the blockquote override
 * in BlogContent) a `> quoted` aside in the article body. */
export function Callout({
  icon: Icon = Info,
  title,
  children,
  accentText = 'text-brand',
  accentSoft = 'bg-brand/10',
  accentBorder = 'border-brand/20',
}: CalloutProps) {
  return (
    <div className={`not-prose my-6 flex gap-3 rounded-xl border ${accentBorder} ${accentSoft} p-4 md:p-5`}>
      <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${accentText}`} aria-hidden="true" />
      <div className="text-sm leading-relaxed text-gray-700">
        {title && <p className="mb-1 font-semibold text-black">{title}</p>}
        <div className="[&>p]:m-0">{children}</div>
      </div>
    </div>
  );
}
