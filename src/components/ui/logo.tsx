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
}

export function Logo({
  href = '/',
  className,
  src = '/ISHA-TECHNO-LG.png',
  width = 2172,
  height = 724,
  imgClassName = 'h-9 w-auto',
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
        priority
        className={imgClassName}
      />
    </Link>
  );
}
