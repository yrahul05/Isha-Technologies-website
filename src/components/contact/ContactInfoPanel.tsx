import {
  CONTACT_EMAIL_ADDRESS,
  CONTACT_PHONE_DISPLAY,
  CONTACT_PHONE_TEL,
  SIGNAL_URL,
  WHATSAPP_URL_PLAIN,
} from '@/data/contact';
import { Mail, MessageCircle, Phone } from 'lucide-react';
import type { ElementType } from 'react';
import { SiSignal } from 'react-icons/si';

type Channel = {
  icon: ElementType;
  label: string;
  value: string;
  href: string;
  external?: boolean;
  /** True when the destination isn't configured yet — renders disabled, never a broken link. */
  comingSoon?: boolean;
  ariaLabel?: string;
};

const CHANNELS: Channel[] = [
  { icon: Mail, label: 'Email', value: CONTACT_EMAIL_ADDRESS, href: `mailto:${CONTACT_EMAIL_ADDRESS}` },
  { icon: Phone, label: 'Phone', value: CONTACT_PHONE_DISPLAY, href: `tel:${CONTACT_PHONE_TEL}` },
  {
    icon: MessageCircle,
    label: 'WhatsApp',
    value: CONTACT_PHONE_DISPLAY,
    href: WHATSAPP_URL_PLAIN,
    external: true,
    ariaLabel: 'Contact Us on WhatsApp',
  },
  {
    icon: SiSignal,
    label: 'Signal',
    value: SIGNAL_URL ? 'Contact Us on Signal' : 'Coming soon',
    href: SIGNAL_URL,
    external: true,
    comingSoon: !SIGNAL_URL,
    ariaLabel: 'Contact Us on Signal',
  },
];

/** "Connect Directly" panel shown beside the contact form. */
export function ContactInfoPanel() {
  return (
    <div className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm md:p-8">
      <span className="text-xs font-semibold uppercase tracking-wide text-brand">
        Connect Directly
      </span>
      <h3 className="mt-2 text-lg font-bold tracking-tight text-slate-900">
        Prefer a Direct Conversation?
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">
        Reach us through email, phone, WhatsApp or Signal if you&apos;d rather speak with the
        team directly.
      </p>

      <div className="mt-5 space-y-1.5">
        {CHANNELS.map((channel) =>
          channel.comingSoon ? (
            <span
              key={channel.label}
              aria-disabled="true"
              title={`${channel.label} link coming soon`}
              className="flex cursor-not-allowed items-center gap-3 rounded-xl border border-transparent p-2.5"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-300">
                <channel.icon className="h-4 w-4" strokeWidth={1.75} />
              </span>
              <span className="min-w-0">
                <span className="block text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {channel.label}
                </span>
                <span className="block truncate text-sm font-medium text-gray-400">
                  {channel.value}
                </span>
              </span>
            </span>
          ) : (
            <a
              key={channel.label}
              href={channel.href}
              target={channel.external ? '_blank' : undefined}
              rel={channel.external ? 'noopener noreferrer' : undefined}
              aria-label={channel.ariaLabel ?? `${channel.label}: ${channel.value}`}
              className="group flex items-center gap-3 rounded-xl border border-transparent p-2.5 transition-colors duration-200 ease-out hover:border-gray-100 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand transition-colors duration-200 ease-out group-hover:bg-brand group-hover:text-white">
                <channel.icon className="h-4 w-4" strokeWidth={1.75} />
              </span>
              <span className="min-w-0">
                <span className="block text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {channel.label}
                </span>
                <span className="block truncate text-sm font-medium text-slate-800">
                  {channel.value}
                </span>
              </span>
            </a>
          )
        )}
      </div>
    </div>
  );
}
