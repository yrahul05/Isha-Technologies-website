import { Button } from '@/components/ui/button';
import { WHATSAPP_URL_PLAIN } from '@/data/contact';
import { AlertTriangle } from 'lucide-react';

export const FormError = ({ onRetry }: { onRetry: () => void }) => {
  return (
    <div role="alert" aria-live="assertive" className="py-6 text-center">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-500">
        <AlertTriangle className="h-7 w-7" strokeWidth={1.75} />
      </span>
      <h2 className="mt-4 text-xl font-bold tracking-tight text-slate-900 md:text-2xl">
        We Couldn&apos;t Send Your Enquiry
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-600">
        Something went wrong while sending your enquiry. Please try again or contact us directly.
      </p>

      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Button type="button" variant="primary" className="h-11 rounded-lg px-6" onClick={onRetry}>
          Try Again
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
