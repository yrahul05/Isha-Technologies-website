'use client';

import Image from 'next/image';
import { useEffect, useState, type CSSProperties } from 'react';

/**
 * "Our Partner Network" — one continuous, seamless logo marquee mixing
 * company/technology partners and formal cloud partnerships as equal-
 * weight cards. Same proven marquee technique as `TechMarquee`
 * (duplicated list + CSS `animate-scroll` keyframe translating -50%,
 * paused on hover, static horizontally-scrollable fallback under
 * prefers-reduced-motion) — kept consistent rather than introducing a
 * second animation approach.
 */
type Partner = {
  name: string;
  logoSrc: string;
  logoAlt: string;
  /** Width:height ratio of the source asset, so it never stretches. */
  ratio: number;
  /** Verified designation — never invented. */
  tier: string;
};

const PARTNERS: Partner[] = [
  {
    name: 'Shanav Technologies',
    logoSrc: '/brand-partners/shanav-technologies.png',
    logoAlt: 'Shanav Technologies logo',
    ratio: 557 / 121,
    tier: 'Technology Partner',
  },
  {
    name: 'Anax Mobility',
    logoSrc: '/brand-partners/anax-mobility.png',
    logoAlt: 'Anax Mobility logo',
    ratio: 1714 / 918,
    tier: 'Technology Partner',
  },
  {
    name: 'TheTriFusion',
    logoSrc: '/brand-partners/thetrifusion.svg',
    logoAlt: 'TheTriFusion logo',
    ratio: 1,
    tier: 'Technology Partner',
  },
  {
    name: 'OpsStation',
    logoSrc: '/brand-partners/opsstation.png',
    logoAlt: 'OpsStation logo',
    ratio: 1,
    tier: 'Technology Partner',
  },
  {
    name: 'AWS',
    logoSrc: '/brand-partners/aws-partner-logo.webp',
    logoAlt: 'AWS logo',
    ratio: 800 / 360,
    tier: 'Advanced Tier Services Partner',
  },
  {
    name: 'Google Cloud',
    logoSrc: '/brand-partners/Google-cloud-logo.jpg',
    logoAlt: 'Google Cloud logo',
    ratio: 800 / 360,
    tier: 'Partner',
  },
  {
    name: 'Microsoft Azure',
    logoSrc: '/brand-partners/azure-logo.svg',
    logoAlt: 'Microsoft Azure logo',
    ratio: 52.91666 / 15.244921,
    tier: 'Partner',
  },
];

const LOGO_HEIGHT = 48;

function PartnerCard({ partner, hidden }: { partner: Partner; hidden?: boolean }) {
  return (
    <li
      aria-hidden={hidden}
      className="flex h-[168px] w-[210px] shrink-0 flex-col items-center justify-center gap-3 rounded-2xl border border-gray-200 bg-white px-5 py-4 text-center shadow-sm transition-all duration-300 ease-out hover:border-brand hover:shadow-md sm:w-[230px]"
    >
      <span className="flex h-12 items-center justify-center">
        <Image
          src={partner.logoSrc}
          alt={partner.logoAlt}
          width={Math.round(LOGO_HEIGHT * partner.ratio)}
          height={LOGO_HEIGHT}
          className="h-12 w-auto object-contain"
        />
      </span>
      <div>
        <p className="text-sm font-semibold text-slate-900">{partner.name}</p>
        <p className="mt-0.5 text-xs font-medium text-brand">{partner.tier}</p>
      </div>
    </li>
  );
}

export function PartnerNetwork() {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  if (reducedMotion) {
    return (
      <div className="scroll-bar-hidden w-full overflow-x-auto">
        <ul className="flex w-max items-stretch gap-4 py-2">
          {PARTNERS.map((partner) => (
            <PartnerCard key={partner.name} partner={partner} />
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="relative w-full overflow-hidden [mask-image:linear-gradient(to_right,transparent,#000_6%,#000_94%,transparent)]">
      <ul
        className="flex w-max min-w-full shrink-0 flex-nowrap items-stretch gap-4 py-2 animate-scroll hover:[animation-play-state:paused]"
        style={{ '--animation-duration': '42s' } as CSSProperties}
      >
        {PARTNERS.map((partner) => (
          <PartnerCard key={partner.name} partner={partner} />
        ))}
        {PARTNERS.map((partner) => (
          <PartnerCard key={`${partner.name}-dup`} partner={partner} hidden />
        ))}
      </ul>
    </div>
  );
}
