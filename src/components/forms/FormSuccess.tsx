import { Button } from '@/components/ui/button';
import { WHATSAPP_URL_PLAIN } from '@/data/contact';
import { CheckCircle2 } from 'lucide-react';

export const FormSuccess = () => {
  return (
    <div role="status" aria-live="polite" className="py-6 text-center">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand/10 text-brand">
        <CheckCircle2 className="h-7 w-7" strokeWidth={1.75} />
      </span>
      <h2 className="mt-4 text-xl font-bold tracking-tight text-slate-900 md:text-2xl">
        Thanks — We&apos;ve Received Your Enquiry
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-600">
        Your requirements have been sent to our team. We&apos;ll review the details and get back
        to you within 4–5 business hours.
      </p>

      <div className="mt-6 border-t border-gray-100 pt-5">
        <p className="text-sm font-medium text-slate-700">Need to speak with us sooner?</p>
        <Button asChild variant="secondary" className="mt-3 h-11 rounded-lg px-6">
          <a href={WHATSAPP_URL_PLAIN} target="_blank" rel="noopener noreferrer">
            Contact Us on WhatsApp
          </a>
        </Button>
      </div>
    </div>
  );
};
