import { Button } from '@/components/ui/button';
import { CONTACT_EMAIL_ADDRESS, WHATSAPP_URL_PLAIN } from '@/data/contact';
import { Mail } from 'lucide-react';

export const FormMailtoFallback = ({ mailtoUrl }: { mailtoUrl: string }) => {
  return (
    <div role="status" aria-live="polite" className="py-6 text-center">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand/10 text-brand">
        <Mail className="h-7 w-7" strokeWidth={1.75} />
      </span>
      <h2 className="mt-4 text-xl font-bold tracking-tight text-slate-900 md:text-2xl">
        Your Email App Should Now Be Open
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-600">
        We&apos;ve prepared your enquiry as an email to {CONTACT_EMAIL_ADDRESS}. Please press
        send there to complete it — we&apos;ll get back to you within 4–5 business hours.
      </p>

      <div className="mt-6 flex flex-wrap justify-center gap-3 border-t border-gray-100 pt-5">
        <Button asChild variant="primary" className="h-11 rounded-lg px-6">
          <a href={mailtoUrl}>Open Email Again</a>
        </Button>
        <Button asChild variant="secondary" className="h-11 rounded-lg px-6">
          <a href={WHATSAPP_URL_PLAIN} target="_blank" rel="noopener noreferrer">
            Contact Us on WhatsApp
          </a>
        </Button>
      </div>
    </div>
  );
};
