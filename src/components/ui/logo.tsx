import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface LogoProps {
  href?: string;
  className?: string;
  /** Logo asset. Defaults to the original (dark-background) file. */
  src?: string;
  width?: number;
  height?: number;
  /** Classes for the <img> itself (sizing). */
  imgClassName?: string;
  /** Preload as a likely LCP image — only for the above-the-fold navbar logo. */
  priority?: boolean;
}

export function Logo({
  href = '/',
  className,
  src = '/ISHA-TECHNO-LG.png',
  // Intrinsic size at the largest rendered width (~155px) × 2 for retina,
  // keeping the source's 3:1 ratio. Declaring the full 2172×724 source
  // size here made Next.js request the logo at w=3840 on every page.
  width = 312,
  height = 104,
  imgClassName = 'h-9 w-auto',
  priority = false,
}: LogoProps) {
  return (
    <Link
      href={href}
      aria-label="Isha Technologies"
      className={cn(
        'inline-flex items-center overflow-hidden rounded-md',
        className
      )}
    >
      <Image
        src={src}
        alt="Isha Technologies"
        width={width}
        height={height}
        priority={priority}
        className={imgClassName}
      />
    </Link>
  );
}
