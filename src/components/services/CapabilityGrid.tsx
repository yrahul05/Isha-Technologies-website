import { iconMap } from '@/data/icon-map';
import type { ServiceCapability } from '@/types/types';
import { motion } from 'framer-motion';

export function CapabilityGrid({ capabilities }: { capabilities: ServiceCapability[] }) {
  const columns = capabilities.length % 3 === 0 ? 'lg:grid-cols-3' : 'lg:grid-cols-2';

  return (
    <section className="bg-brand/[0.03] py-16">
      <div className="mx-auto max-w-[1280px] px-4">
        <div className="mb-10 max-w-xl">
          <span className="text-xs font-semibold uppercase tracking-wide text-brand">
            What We Provide
          </span>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
            Capabilities Covered by This Service
          </h2>
        </div>

        <div className={`grid grid-cols-1 gap-5 sm:grid-cols-2 ${columns}`}>
          {capabilities.map((capability, idx) => {
            const Icon = iconMap[capability.icon];
            return (
              <motion.div
                key={capability.title}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.4, ease: 'easeOut', delay: idx * 0.06 }}
                className="group rounded-[20px] border border-gray-200 bg-white p-5 shadow-sm transition-all duration-300 ease-out hover:border-brand hover:bg-brand/[0.04] hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-semibold text-brand/60 transition-colors duration-300 ease-out group-hover:text-brand">
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-50 text-gray-400 transition-colors duration-300 ease-out group-hover:bg-brand/10 group-hover:text-brand">
                    <Icon className="h-4 w-4" strokeWidth={1.75} />
                  </span>
                </div>
                <h3 className="mt-4 text-base font-semibold tracking-tight text-slate-900">
                  {capability.title}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                  {capability.description}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
