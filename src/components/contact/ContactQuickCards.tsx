'use client';

import { SIGNAL_URL, SLACK_URL, WHATSAPP_URL_PREFILLED } from '@/data/contact';
import { motion } from 'framer-motion';
import type { IconType } from 'react-icons';
import { FaSlack, FaWhatsapp } from 'react-icons/fa';
import { SiSignal } from 'react-icons/si';

type QuickCard = {
  icon: IconType;
  label: string;
  title: string;
  description: string;
  ctaLabel: string;
  href?: string;
  ariaLabel?: string;
};

const CARDS: QuickCard[] = [
  {
    icon: FaWhatsapp,
    label: 'WhatsApp',
    title: 'Chat With Our Team',
    description:
      'Have a quick question or want to discuss your requirements? Start a conversation with our team on WhatsApp.',
    ctaLabel: 'Contact Us on WhatsApp',
    href: WHATSAPP_URL_PREFILLED,
    ariaLabel: 'Contact Us on WhatsApp',
  },
  {
    icon: SiSignal,
    label: 'Signal',
    title: 'Connect With Us on Signal',
    description:
      'Prefer a private, encrypted channel? Connect with our team on Signal alongside WhatsApp.',
    ctaLabel: 'Contact Us on Signal',
    href: SIGNAL_URL || undefined,
    ariaLabel: 'Contact Us on Signal',
  },
  {
    icon: FaSlack,
    label: 'Slack',
    title: 'Connect With Us on Slack',
    description:
      'Prefer Slack for technical conversations? Connect directly with our team when Slack is the right channel for your discussion.',
    ctaLabel: 'Join Us on Slack',
    href: SLACK_URL || undefined,
  },
];

export function ContactQuickCards() {
  return (
    <section className="bg-brand/[0.03] py-14">
      <div className="mx-auto max-w-[1280px] px-4">
        <div className="mb-8 max-w-xl">
          <span className="text-xs font-semibold uppercase tracking-wide text-brand">
            Connect With Us
          </span>
          <h2 className="mt-2 text-xl font-bold tracking-tight text-slate-900 md:text-2xl">
            More Ways to Reach the Team
          </h2>
        </div>

        <div className="mx-auto grid max-w-4xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {CARDS.map((card, idx) => {
            const Icon = card.icon;
            const isDisabled = !card.href;

            return (
              <motion.div
                key={card.label}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.4, ease: 'easeOut', delay: idx * 0.06 }}
                className="card-hover flex h-full flex-col rounded-2xl border border-gray-200 bg-white p-7 md:p-8"
              >
                <span className="card-accent-bg flex h-11 w-11 items-center justify-center rounded-xl bg-brand/10 text-brand">
                  <Icon className="card-accent h-5 w-5" />
                </span>
                <span className="mt-5 block text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  {card.label}
                </span>
                <h3 className="mt-1.5 text-lg font-bold tracking-tight text-slate-900">
                  {card.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{card.description}</p>

                <div className="mt-6">
                  {isDisabled ? (
                    <span
                      aria-disabled="true"
                      title={`${card.label} link coming soon`}
                      className="inline-flex h-11 w-full cursor-not-allowed items-center justify-center rounded-lg border border-gray-200 bg-gray-50 px-6 text-sm font-semibold text-gray-400 sm:w-auto"
                    >
                      {card.ctaLabel}
                    </span>
                  ) : (
                    <a
                      href={card.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={card.ariaLabel ?? `${card.ctaLabel} — Isha Technologies`}
                      className="inline-flex h-11 w-full items-center justify-center whitespace-nowrap rounded-lg border border-brand bg-white px-5 text-sm font-semibold text-brand transition-all duration-300 ease-out hover:-translate-y-0.5 hover:bg-brand hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 max-w-full box-border sm:w-auto"
                    >
                      {card.ctaLabel}
                    </a>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
