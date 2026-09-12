import Link from 'next/link';
import { CalendarDays } from 'lucide-react';
import { FaEnvelope, FaPhone, FaSlack, FaWhatsapp } from 'react-icons/fa';
import { SiSignal } from 'react-icons/si';
import { FooterVisitorStat } from './FooterVisitorStat';
import { Logo } from '../ui/logo';
import {
  CALENDLY_URL,
  CONTACT_EMAIL_ADDRESS,
  CONTACT_PHONE_DISPLAY,
  CONTACT_PHONE_TEL,
  SIGNAL_URL,
  SLACK_URL,
  WHATSAPP_URL_PREFILLED,
} from '@/data/contact';
import {
  companyLinks,
  resourceLinks,
  socialLinks,
  solutionLinks,
} from '@/data/data';

const footerLinkClass =
  'inline-block text-sm text-gray-600 transition-all duration-200 ease-out hover:translate-x-[3px] hover:text-brand';

const columnLabelClass =
  'text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3';

// Every Connect row shares this shape: a fixed-width icon slot so every
// icon and label lines up on the same X coordinate, a flexible label that
// truncates (never wraps mid-word) if it's ever genuinely too tight, and an
// optional trailing badge that never gets pushed onto its own line.
const connectRowClass =
  'group flex items-center gap-2.5 text-sm text-gray-600 transition-colors duration-200 ease-out hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-2 rounded-sm';

const connectIconWrapClass =
  'flex h-5 w-5 shrink-0 items-center justify-center text-gray-400 transition-colors duration-200 ease-out group-hover:text-brand';

const connectLabelClass =
  'min-w-0 flex-1 truncate transition-transform duration-200 ease-out group-hover:translate-x-[3px]';

const connectComingSoonClass = 'flex cursor-not-allowed items-center gap-2.5 text-sm text-gray-400';

const comingSoonBadgeClass =
  'shrink-0 whitespace-nowrap rounded-full border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-gray-400';

export const Footer = () => {
  return (
    <footer className="relative overflow-hidden border-t border-gray-200 bg-white">
      <div className="relative mx-auto w-[min(1400px,calc(100%-3rem))] pt-12 pb-8">
        <nav aria-label="Footer navigation">
          <div className="grid grid-cols-1 gap-x-8 gap-y-10 md:grid-cols-2 lg:grid-cols-[1.7fr_0.7fr_1.35fr_0.7fr_1.35fr] lg:gap-x-8">
            {/* Column 1 — Brand */}
            <div className="relative md:order-1 md:col-span-2 lg:order-1 lg:col-span-1">
              {/* Very subtle infrastructure-grid backdrop, scoped to the brand column only */}
              <svg
                aria-hidden="true"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                className="pointer-events-none absolute -inset-x-4 -inset-y-6 -z-10 h-[calc(100%+3rem)] w-[calc(100%+2rem)] opacity-60"
              >
                <defs>
                  <pattern
                    id="footer-brand-grid"
                    width="10"
                    height="10"
                    patternUnits="userSpaceOnUse"
                  >
                    <circle cx="1" cy="1" r="0.5" className="fill-brand/10" />
                  </pattern>
                </defs>
                <rect width="100" height="100" fill="url(#footer-brand-grid)" />
                <path
                  d="M6 14 L34 30 L20 58"
                  fill="none"
                  strokeWidth="0.4"
                  className="stroke-brand/10"
                />
                <path
                  d="M34 30 L64 20"
                  fill="none"
                  strokeWidth="0.4"
                  className="stroke-brand/10"
                />
              </svg>

              <div className="relative mb-4">
                <Logo imgClassName="h-auto w-[140px] sm:w-[150px] md:w-[155px]" />
              </div>
              <p className="max-w-[380px] text-balance text-[16px] font-semibold leading-[1.35] tracking-tight text-brand md:text-[17px]">
                The Engineering Behind What&rsquo;s Next.
              </p>
              <p className="mt-3 max-w-[390px] text-sm leading-[1.6] text-gray-600">
                Isha Technologies helps organizations design, automate and
                operate reliable cloud infrastructure — from modern
                architecture and DevOps to security, observability and
                day-to-day operations.
              </p>
            </div>

            {/* Column 2 — Company. At tablet width, ordered next to
                Resources (both short lists) so Solutions' long list gets
                its own full-width row instead of leaving a tall empty gap
                beside it — desktop order matches the DOM (Company then
                Solutions then Resources). */}
            <div className="md:order-2 lg:order-2">
              <h3 className={columnLabelClass}>Company</h3>
              <ul className="space-y-3">
                {companyLinks.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className={footerLinkClass}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 3 — Solutions */}
            <div className="md:order-4 md:col-span-2 lg:order-3 lg:col-span-1">
              <h3 className={columnLabelClass}>Solutions</h3>
              <ul className="space-y-3">
                {solutionLinks.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className={footerLinkClass}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 4 — Resources */}
            <div className="md:order-3 lg:order-4">
              <h3 className={columnLabelClass}>Resources</h3>
              <ul className="space-y-3">
                {resourceLinks.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className={footerLinkClass}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 5 — Connect */}
            <div className="md:order-5 md:col-span-2 lg:order-5 lg:col-span-1">
              <h3 className={columnLabelClass}>Connect</h3>
              {/* One consistent list, one consistent rhythm — Email, Phone,
                  WhatsApp, Signal, Schedule a Meeting, Slack. Every row uses
                  the same fixed-width icon slot so icons and labels align
                  on the same X coordinate; labels truncate rather than wrap
                  mid-word if the column is ever genuinely too narrow. */}
              <ul className="space-y-3">
                <li>
                  <a
                    href={`mailto:${CONTACT_EMAIL_ADDRESS}`}
                    title={CONTACT_EMAIL_ADDRESS}
                    className={connectRowClass}
                  >
                    <span className={connectIconWrapClass}>
                      <FaEnvelope className="h-[15px] w-[15px]" />
                    </span>
                    <span className="min-w-0 flex-1 break-words transition-transform duration-200 ease-out group-hover:translate-x-[3px] lg:truncate">
                      {CONTACT_EMAIL_ADDRESS}
                    </span>
                  </a>
                </li>
                <li>
                  <a href={`tel:${CONTACT_PHONE_TEL}`} className={connectRowClass}>
                    <span className={connectIconWrapClass}>
                      <FaPhone className="h-[15px] w-[15px]" />
                    </span>
                    <span className={`${connectLabelClass} whitespace-nowrap`}>{CONTACT_PHONE_DISPLAY}</span>
                  </a>
                </li>
                <li>
                  <a
                    href={WHATSAPP_URL_PREFILLED}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Contact Us on WhatsApp"
                    className={connectRowClass}
                  >
                    <span className={connectIconWrapClass}>
                      <FaWhatsapp className="h-[15px] w-[15px]" />
                    </span>
                    <span className={`${connectLabelClass} whitespace-nowrap`}>Contact Us on WhatsApp</span>
                  </a>
                </li>
                <li>
                  {SIGNAL_URL ? (
                    <a
                      href={SIGNAL_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Contact Us on Signal"
                      className={connectRowClass}
                    >
                      <span className={connectIconWrapClass}>
                        <SiSignal className="h-[15px] w-[15px]" />
                      </span>
                      <span className={`${connectLabelClass} whitespace-nowrap`}>Contact Us on Signal</span>
                    </a>
                  ) : (
                    <span aria-disabled="true" title="Signal link coming soon" className={connectComingSoonClass}>
                      <span className={connectIconWrapClass}>
                        <SiSignal className="h-[15px] w-[15px]" />
                      </span>
                      <span className="min-w-0 flex-1 truncate whitespace-nowrap">Contact Us on Signal</span>
                      <span className={comingSoonBadgeClass}>Coming soon</span>
                    </span>
                  )}
                </li>
                <li>
                  <a
                    href={CALENDLY_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Schedule a Meeting with Isha Technologies"
                    className={connectRowClass}
                  >
                    <span className={connectIconWrapClass}>
                      <CalendarDays className="h-[15px] w-[15px]" />
                    </span>
                    <span className={`${connectLabelClass} whitespace-nowrap`}>Schedule a Meeting</span>
                  </a>
                </li>
                <li>
                  {SLACK_URL ? (
                    <a
                      href={SLACK_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Join Us on Slack"
                      className={connectRowClass}
                    >
                      <span className={connectIconWrapClass}>
                        <FaSlack className="h-[15px] w-[15px]" />
                      </span>
                      <span className={`${connectLabelClass} whitespace-nowrap`}>Join Us on Slack</span>
                    </a>
                  ) : (
                    <span aria-disabled="true" title="Slack link coming soon" className={connectComingSoonClass}>
                      <span className={connectIconWrapClass}>
                        <FaSlack className="h-[15px] w-[15px]" />
                      </span>
                      <span className="min-w-0 flex-1 truncate whitespace-nowrap">Join Us on Slack</span>
                      <span className={comingSoonBadgeClass}>Coming soon</span>
                    </span>
                  )}
                </li>
              </ul>

              <FooterVisitorStat />

              <div className="mt-3 flex flex-wrap gap-2.5">
                {socialLinks.map((item, index) => {
                  const isConfigured = Boolean(item.href) && item.href !== '#';
                  return isConfigured ? (
                    <a
                      key={index}
                      aria-label={`Isha Technologies on ${item.title}`}
                      title={item.title}
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-brand/30 bg-white text-brand transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-brand hover:bg-brand-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
                    >
                      {item.icon}
                    </a>
                  ) : (
                    <span
                      key={index}
                      aria-disabled="true"
                      title={`${item.title} — coming soon`}
                      className="flex h-11 w-11 shrink-0 cursor-not-allowed items-center justify-center rounded-full border border-gray-200 text-gray-300"
                    >
                      {item.icon}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        </nav>

        {/* copyright bar */}
        <div
          id="footer-legal-bar"
          className="mt-10 flex flex-col items-center gap-4 border-t border-gray-200 pt-6 pb-1 sm:flex-row sm:items-center sm:justify-between sm:gap-6"
        >
          <p className="text-center text-sm text-gray-600 sm:text-left">
            © 2026 Isha Technologies. All rights reserved.{' '}
            <a
              href="https://www.linkedin.com/in/rahulyadavdevops/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline-offset-2 transition-colors duration-200 ease-out hover:text-brand hover:underline"
            >
              Designed by Mr. Rahul Yadav
            </a>
          </p>

          <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 sm:flex-nowrap sm:justify-end">
            <li>
              <Link
                href="/privacy-policy"
                className="whitespace-nowrap text-sm text-gray-600 transition-colors duration-200 ease-out hover:text-brand"
              >
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link
                href="/terms-and-conditions"
                className="whitespace-nowrap text-sm text-gray-600 transition-colors duration-200 ease-out hover:text-brand"
              >
                Terms & Conditions
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
};
