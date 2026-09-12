import { GOOGLE_MAPS_URL } from '@/data/contact';
import { MapPin } from 'lucide-react';

export function ContactLocation() {
  return (
    <section className="bg-white py-14">
      <div className="mx-auto max-w-[1280px] px-4">
        <div className="overflow-hidden rounded-[28px] border border-gray-200 bg-brand/[0.03] p-6 md:p-10">
          <div className="grid grid-cols-1 items-center gap-6 md:grid-cols-[auto_1fr_auto] md:gap-8">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-brand/20 bg-white text-brand shadow-sm">
              <MapPin className="h-7 w-7" strokeWidth={1.75} />
            </span>

            <div>
              <span className="text-xs font-semibold uppercase tracking-wide text-brand">
                Our Location
              </span>
              <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-900 md:text-2xl">
                Based in Jaipur. Working With Technology Teams.
              </h2>
              <p className="mt-1.5 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                Jaipur, Rajasthan, India
              </p>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-600">
                Isha Technologies is based in Jaipur, Rajasthan, with a focus on cloud
                infrastructure, DevOps automation, platform engineering and reliable technology
                operations.
              </p>
            </div>

            <a
              href={GOOGLE_MAPS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 shrink-0 items-center justify-center rounded-lg border border-brand bg-white px-6 text-sm font-semibold text-brand transition-all duration-300 ease-out hover:-translate-y-0.5 hover:bg-brand hover:text-white hover:shadow-[0_8px_20px_-6px_rgba(52,120,228,0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
            >
              View on Google Maps
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
