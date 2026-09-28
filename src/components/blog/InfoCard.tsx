import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

type InfoCardProps = {
  icon?: LucideIcon;
  title: string;
  children: ReactNode;
  accentText?: string;
  accentSoft?: string;
  accentBorder?: string;
};

/** A single icon+title+description card — used for the Key Takeaways
 * section (BlogArticleLayout), and available for any post content that
 * wants a grid of short highlighted points instead of a plain list. */
export function InfoCard({
  icon: Icon,
  title,
  children,
  accentText = 'text-brand',
  accentSoft = 'bg-brand/10',
  accentBorder = 'border-brand/20',
}: InfoCardProps) {
  return (
    <div className={`rounded-xl border ${accentBorder} bg-white p-5`}>
      {Icon && (
        <span
          className={`mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg ${accentSoft} ${accentText}`}
        >
          <Icon className="h-4 w-4" strokeWidth={1.8} />
        </span>
      )}
      <p className="text-sm font-semibold text-black">{title}</p>
      <div className="mt-1.5 text-sm leading-relaxed text-gray-600">{children}</div>
    </div>
  );
}
