'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Cloud, Layers, Loader2, Rocket, ShieldAlert, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { trackEvent } from '@/components/analytics/GoogleAnalytics';
import { readAttribution } from '@/components/analytics/AttributionTracker';
import { ASSESSMENT } from '@/lib/portal/assessment';
import { CALENDLY_URL, WHATSAPP_URL_PLAIN } from '@/data/contact';
import { cn } from '@/lib/utils';

type Answers = {
  currentCloud: string;
  infrastructure: string[];
  monthlySpend: string;
  deploymentFrequency: string;
  problems: string[];
  problemDetails: string;
  companySize: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  consent: boolean;
  website: string;
};

const STEPS = [
  { key: 'cloud', label: 'Cloud', icon: Cloud },
  { key: 'infra', label: 'Infrastructure', icon: Layers },
  { key: 'delivery', label: 'Delivery', icon: Rocket },
  { key: 'problems', label: 'Challenges', icon: ShieldAlert },
  { key: 'contact', label: 'Contact', icon: UserRound },
] as const;

const FIELD_STEP: Record<string, number> = {
  currentCloud: 0, infrastructure: 1, monthlySpend: 2, deploymentFrequency: 2, problems: 3, problemDetails: 3, companySize: 3,
  name: 4, email: 4, phone: 4, company: 4, consent: 4,
};

const input =
  'w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20';

function Choice({ selected, onClick, children, multi }: { selected: boolean; onClick: () => void; children: React.ReactNode; multi?: boolean }) {
  return (
    <button
      type="button"
      role={multi ? 'checkbox' : 'radio'}
      aria-checked={selected}
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40',
        selected ? 'border-brand bg-brand/[0.06] text-slate-900 shadow-[0_8px_20px_-14px_rgba(52,120,228,0.7)]' : 'border-gray-200 bg-white text-slate-700 hover:border-brand/40'
      )}
    >
      <span className={cn('flex h-5 w-5 shrink-0 items-center justify-center border transition-colors', multi ? 'rounded-md' : 'rounded-full', selected ? 'border-brand bg-brand text-white' : 'border-gray-300')}>
        {selected && <Check className="h-3 w-3" strokeWidth={3} />}
      </span>
      {children}
    </button>
  );
}

export function AssessmentForm() {
  const [step, setStep] = useState(0);
  const [a, setA] = useState<Answers>({
    currentCloud: '', infrastructure: [], monthlySpend: '', deploymentFrequency: '', problems: [], problemDetails: '', companySize: '',
    name: '', email: '', phone: '', company: '', consent: false, website: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [reference, setReference] = useState('');

  const set = <K extends keyof Answers>(k: K, v: Answers[K]) => {
    setA((s) => ({ ...s, [k]: v }));
    setErrors((e) => ({ ...e, [k]: '' }));
  };
  const toggle = (k: 'infrastructure' | 'problems', v: string) => set(k, a[k].includes(v) ? a[k].filter((x) => x !== v) : [...a[k], v]);

  const validate = (i: number): boolean => {
    const e: Record<string, string> = {};
    if (i === 0 && !a.currentCloud) e.currentCloud = 'Choose your current cloud.';
    if (i === 1 && a.infrastructure.length === 0) e.infrastructure = 'Select at least one.';
    if (i === 2) {
      if (!a.monthlySpend) e.monthlySpend = 'Choose an approximate spend.';
      if (!a.deploymentFrequency) e.deploymentFrequency = 'Choose a deployment frequency.';
    }
    if (i === 3 && !a.companySize) e.companySize = 'Choose your company size.';
    if (i === 4) {
      if (a.name.trim().length < 2) e.name = 'Please enter your name.';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(a.email)) e.email = 'Please enter a valid work email.';
      if (a.phone && !/^[+\d][\d\s()-]{6,}$/.test(a.phone)) e.phone = 'Please enter a valid phone number.';
      if (!a.consent) e.consent = 'Please agree so we can contact you.';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => {
    if (!validate(step)) return;
    if (step === 0) trackEvent('assessment_start');
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
  };

  const submit = async () => {
    if (!validate(4)) return;
    setStatus('sending');
    try {
      const res = await fetch('/api/leads/assessment', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...a, attribution: readAttribution() }) });
      const data = (await res.json()) as { ok: boolean; error?: string; fieldErrors?: Record<string, string>; reference?: string };
      if (data.ok) {
        setStatus('done');
        setReference(data.reference ?? '');
        trackEvent('assessment_submit', { cloud: a.currentCloud, company_size: a.companySize });
        return;
      }
      if (data.fieldErrors) {
        setErrors(data.fieldErrors);
        const steps = Object.keys(data.fieldErrors).map((f) => FIELD_STEP[f] ?? 4);
        setStep(Math.min(...steps));
      }
      setMessage(data.error ?? 'Please check the highlighted answers.');
      setStatus('error');
    } catch {
      setMessage('Network error — please try again.');
      setStatus('error');
    }
  };

  if (status === 'done') {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-[0_24px_60px_-30px_rgba(52,120,228,0.45)]">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
          <CheckCircle2 className="h-7 w-7" />
        </span>
        <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">Your assessment is in</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-600">
          A cloud engineer is reviewing your answers and will reach out within one business day with findings and next steps.
          {reference && (
            <>
              {' '}
              Reference <span className="font-mono font-semibold text-slate-900">{reference}</span>.
            </>
          )}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button asChild variant="primary" className="h-11 rounded-lg px-5">
            <a href={CALENDLY_URL} target="_blank" rel="noopener noreferrer">
              Book a consultation now
            </a>
          </Button>
          <Button asChild variant="secondary" className="h-11 rounded-lg px-5">
            <a href={WHATSAPP_URL_PLAIN} target="_blank" rel="noopener noreferrer">
              Talk to a DevOps expert on WhatsApp
            </a>
          </Button>
        </div>
        <p className="mt-6 text-xs text-slate-500">
          Meanwhile, see how we&apos;ve solved similar problems in our <Link href="/case-studies" className="font-semibold text-brand">case studies</Link>.
        </p>
      </div>
    );
  }

  const pct = ((step + 1) / STEPS.length) * 100;
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_24px_60px_-30px_rgba(52,120,228,0.45)] sm:p-7">
      <ol className="mb-5 grid grid-cols-5 gap-1.5" aria-label="Progress">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          return (
            <li key={s.key} className="flex flex-col items-center gap-1.5">
              <span className={cn('flex h-9 w-9 items-center justify-center rounded-xl transition-colors', i < step ? 'bg-brand text-white' : i === step ? 'bg-brand/10 text-brand ring-2 ring-brand/30' : 'bg-slate-100 text-slate-400')}>
                {i < step ? <Check className="h-4 w-4" strokeWidth={3} /> : <Icon className="h-4 w-4" strokeWidth={1.75} />}
              </span>
              <span className={cn('hidden text-[11px] font-semibold sm:block', i <= step ? 'text-slate-900' : 'text-slate-400')}>{s.label}</span>
            </li>
          );
        })}
      </ol>
      <div className="mb-6 h-1 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-gradient-to-r from-brand/70 to-brand transition-[width] duration-500" style={{ width: `${pct}%` }} />
      </div>

      {/* CSS entrance (the site's hero-rise keyframe) rather than framer-motion:
          pulling AnimatePresence in here enlarged the framer chunk every page shares. */}
      <div key={step} className="motion-safe:animate-hero-rise">
          {step === 0 && (
            <Step title="Where does your infrastructure run today?" error={errors.currentCloud}>
              <div className="grid gap-2 sm:grid-cols-2">
                {ASSESSMENT.clouds.map((c) => (
                  <Choice key={c} selected={a.currentCloud === c} onClick={() => set('currentCloud', c)}>
                    {c}
                  </Choice>
                ))}
              </div>
            </Step>
          )}
          {step === 1 && (
            <Step title="What does your stack include?" hint="Select all that apply." error={errors.infrastructure}>
              <div className="grid gap-2 sm:grid-cols-2">
                {ASSESSMENT.infrastructure.map((c) => (
                  <Choice key={c} multi selected={a.infrastructure.includes(c)} onClick={() => toggle('infrastructure', c)}>
                    {c}
                  </Choice>
                ))}
              </div>
            </Step>
          )}
          {step === 2 && (
            <>
              <Step title="Approximate monthly cloud spend" error={errors.monthlySpend}>
                <div className="grid gap-2 sm:grid-cols-3">
                  {ASSESSMENT.spend.map((c) => (
                    <Choice key={c} selected={a.monthlySpend === c} onClick={() => set('monthlySpend', c)}>
                      {c}
                    </Choice>
                  ))}
                </div>
              </Step>
              <div className="h-6" />
              <Step title="How often do you deploy to production?" error={errors.deploymentFrequency}>
                <div className="grid gap-2 sm:grid-cols-3">
                  {ASSESSMENT.deployFrequency.map((c) => (
                    <Choice key={c} selected={a.deploymentFrequency === c} onClick={() => set('deploymentFrequency', c)}>
                      {c}
                    </Choice>
                  ))}
                </div>
              </Step>
            </>
          )}
          {step === 3 && (
            <>
              <Step title="What's hurting most right now?" hint="Optional — select any that apply.">
                <div className="grid gap-2 sm:grid-cols-2">
                  {ASSESSMENT.problems.map((c) => (
                    <Choice key={c} multi selected={a.problems.includes(c)} onClick={() => toggle('problems', c)}>
                      {c}
                    </Choice>
                  ))}
                </div>
                <textarea value={a.problemDetails} onChange={(e) => set('problemDetails', e.target.value)} rows={3} maxLength={2000} placeholder="Anything else we should know? (optional)" className={cn(input, 'mt-3 resize-y')} aria-label="Describe your infrastructure problems" />
              </Step>
              <div className="h-6" />
              <Step title="Company size" error={errors.companySize}>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                  {ASSESSMENT.companySize.map((c) => (
                    <Choice key={c} selected={a.companySize === c} onClick={() => set('companySize', c)}>
                      {c}
                    </Choice>
                  ))}
                </div>
              </Step>
            </>
          )}
          {step === 4 && (
            <Step title="Where should we send your assessment?">
              <div className="grid gap-3 sm:grid-cols-2">
                <Labeled label="Full name" error={errors.name}>
                  <input className={input} value={a.name} onChange={(e) => set('name', e.target.value)} autoComplete="name" />
                </Labeled>
                <Labeled label="Work email" error={errors.email}>
                  <input className={input} type="email" value={a.email} onChange={(e) => set('email', e.target.value)} autoComplete="email" />
                </Labeled>
                <Labeled label="Phone (optional)" error={errors.phone}>
                  <input className={input} type="tel" value={a.phone} onChange={(e) => set('phone', e.target.value)} autoComplete="tel" />
                </Labeled>
                <Labeled label="Company (optional)">
                  <input className={input} value={a.company} onChange={(e) => set('company', e.target.value)} autoComplete="organization" />
                </Labeled>
              </div>
              {/* Honeypot — hidden from people, filled by bots. */}
              <input tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 opacity-0" value={a.website} onChange={(e) => set('website', e.target.value)} name="website" />
              <label className="mt-4 flex items-start gap-3 text-sm text-slate-600">
                <input type="checkbox" checked={a.consent} onChange={(e) => set('consent', e.target.checked)} className="mt-0.5 h-4 w-4 rounded accent-[#3478e4]" />
                <span>
                  I agree to be contacted by Isha Technologies about this assessment. See our <Link href="/privacy-policy" className="font-semibold text-brand">privacy policy</Link>.
                </span>
              </label>
              {errors.consent && <p className="mt-1 text-xs font-medium text-rose-600">{errors.consent}</p>}
            </Step>
          )}
      </div>

      {status === 'error' && message && <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">{message}</p>}

      <div className="mt-7 flex items-center justify-between gap-3">
        <button type="button" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0} className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-brand disabled:invisible">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        {step < STEPS.length - 1 ? (
          <Button type="button" variant="primary" onClick={next} className="h-11 rounded-lg px-6">
            Continue <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button type="button" variant="primary" onClick={submit} disabled={status === 'sending'} className="h-11 rounded-lg px-6">
            {status === 'sending' ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {status === 'sending' ? 'Submitting…' : 'Get my free assessment'}
          </Button>
        )}
      </div>
    </div>
  );
}

function Step({ title, hint, error, children }: { title: string; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <fieldset>
      <legend className="text-lg font-semibold tracking-tight text-slate-900">{title}</legend>
      {hint && <p className="mt-0.5 text-sm text-slate-500">{hint}</p>}
      <div className="mt-4">{children}</div>
      {error && <p className="mt-2 text-xs font-medium text-rose-600">{error}</p>}
    </fieldset>
  );
}

function Labeled({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-semibold text-slate-700">{label}</span>
      {children}
      {error && <span className="block text-xs font-medium text-rose-600">{error}</span>}
    </label>
  );
}
