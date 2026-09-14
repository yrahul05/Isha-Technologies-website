'use client';

import { trackEvent } from '@/components/analytics/GoogleAnalytics';
import { Button } from '@/components/ui/button';
import {
  contactPlatformOptions,
  contactServiceOptions,
  contactTimelineOptions,
} from '@/data/contact';
import type { ContactFormValues } from '@/types/types';
import axios from 'axios';
import { AnimatePresence, motion, MotionConfig } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { FormError } from './FormError';
import { FormSuccess } from './FormSuccess';

const inputClasses =
  'w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 transition-colors duration-200 ease-out focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 aria-invalid:border-red-400 aria-invalid:focus:ring-red-100';

const selectClasses = `${inputClasses} appearance-none pr-9`;

const labelClasses = 'mb-1.5 block text-sm font-medium text-slate-700';

const errorClasses = 'mt-1.5 text-xs font-medium text-red-600';

export const ContactForm = () => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<ContactFormValues>();

  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Aggregate, non-identifying view event only — no form values are ever
  // sent to GA4 (see trackEvent's docs and CLAUDE brief on this).
  useEffect(() => {
    trackEvent('contact_form_view');
  }, []);

  const onSubmit = async (data: ContactFormValues) => {
    try {
      const response = await axios.post('/api/contact', data, {
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.status === 200 && response.data?.success) {
        trackEvent('contact_form_submit');
        setStatus('success');
        reset();
        return;
      }
      throw new Error('API did not report success');
    } catch (error) {
      // The submission genuinely failed (server error, rate limit, network
      // issue, etc). Stay on the site and let the visitor retry — never
      // silently fall back to a mailto: redirect, and never lose what they
      // typed.
      console.error('Contact form submission error:', error);
      setStatus('error');
    }
  };

  return (
    <MotionConfig reducedMotion="user">
      <div
        id="contact-form"
        className="scroll-mt-24 rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm md:p-8"
      >
        <AnimatePresence mode="wait">
          {status === 'success' ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
            >
              <FormSuccess />
            </motion.div>
          ) : status === 'error' ? (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
            >
              <FormError onRetry={() => setStatus('idle')} />
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
            >
              <div className="mb-6">
                <h2 className="text-xl font-bold tracking-tight text-slate-900 md:text-2xl">
                  Tell Us About Your Requirements
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  A few details about your project will help us understand the environment,
                  priorities and technical challenges involved.
                </p>
              </div>

              <form
                noValidate
                aria-label="Contact form"
                onSubmit={handleSubmit(onSubmit)}
                className="space-y-4"
              >
                {/* Honeypot — invisible to sighted and assistive-tech users, but a
                    plain (non type="hidden") field bots that auto-fill forms
                    tend to fill anyway. */}
                <div
                  aria-hidden="true"
                  className="absolute -left-[9999px] top-auto h-px w-px overflow-hidden"
                >
                  <input
                    type="text"
                    tabIndex={-1}
                    autoComplete="off"
                    {...register('website')}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="fullName" className={labelClasses}>
                      Full Name *
                    </label>
                    <input
                      id="fullName"
                      type="text"
                      autoComplete="name"
                      maxLength={100}
                      placeholder="Your name"
                      aria-invalid={!!errors.fullName}
                      aria-describedby={errors.fullName ? 'fullName-error' : undefined}
                      {...register('fullName', {
                        required: 'Please enter your name.',
                        minLength: { value: 2, message: 'Please enter your name.' },
                      })}
                      className={inputClasses}
                    />
                    {errors.fullName && (
                      <p id="fullName-error" role="alert" className={errorClasses}>
                        {errors.fullName.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="company" className={labelClasses}>
                      Company Name
                    </label>
                    <input
                      id="company"
                      type="text"
                      autoComplete="organization"
                      maxLength={150}
                      placeholder="Your company"
                      {...register('company')}
                      className={inputClasses}
                    />
                  </div>

                  <div>
                    <label htmlFor="email" className={labelClasses}>
                      Work Email *
                    </label>
                    <input
                      id="email"
                      type="email"
                      autoComplete="email"
                      maxLength={254}
                      placeholder="you@company.com"
                      aria-invalid={!!errors.email}
                      aria-describedby={errors.email ? 'email-error' : undefined}
                      {...register('email', {
                        required: 'Please enter a valid work email.',
                        pattern: {
                          value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                          message: 'Please enter a valid work email.',
                        },
                      })}
                      className={inputClasses}
                    />
                    {errors.email && (
                      <p id="email-error" role="alert" className={errorClasses}>
                        {errors.email.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="phone" className={labelClasses}>
                      Phone Number
                    </label>
                    <input
                      id="phone"
                      type="tel"
                      autoComplete="tel"
                      maxLength={30}
                      placeholder="+91 00000 00000"
                      {...register('phone')}
                      className={inputClasses}
                    />
                  </div>

                  <div>
                    <label htmlFor="service" className={labelClasses}>
                      Service Required *
                    </label>
                    <div className="relative">
                      <select
                        id="service"
                        defaultValue=""
                        aria-invalid={!!errors.service}
                        aria-describedby={errors.service ? 'service-error' : undefined}
                        {...register('service', { required: 'Please select a service.' })}
                        className={selectClasses}
                      >
                        <option value="" disabled>
                          Select a service
                        </option>
                        {contactServiceOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    </div>
                    {errors.service && (
                      <p id="service-error" role="alert" className={errorClasses}>
                        {errors.service.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="platform" className={labelClasses}>
                      Current Cloud Platform
                    </label>
                    <div className="relative">
                      <select
                        id="platform"
                        defaultValue=""
                        {...register('platform')}
                        className={selectClasses}
                      >
                        <option value="" disabled>
                          Select an option
                        </option>
                        {contactPlatformOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label htmlFor="timeline" className={labelClasses}>
                      Project Timeline
                    </label>
                    <div className="relative">
                      <select
                        id="timeline"
                        defaultValue=""
                        {...register('timeline')}
                        className={selectClasses}
                      >
                        <option value="" disabled>
                          Select a timeline
                        </option>
                        {contactTimelineOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label htmlFor="message" className={labelClasses}>
                      Message *
                    </label>
                    <textarea
                      id="message"
                      rows={5}
                      maxLength={2000}
                      placeholder="Tell us about your infrastructure, current challenges, requirements or project goals."
                      aria-invalid={!!errors.message}
                      aria-describedby={errors.message ? 'message-error' : undefined}
                      {...register('message', {
                        required: 'Please tell us a little about your requirements.',
                        minLength: {
                          value: 10,
                          message: 'Please tell us a little about your requirements.',
                        },
                      })}
                      className={`${inputClasses} resize-none`}
                    />
                    {errors.message && (
                      <p id="message-error" role="alert" className={errorClasses}>
                        {errors.message.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="pt-1">
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={isSubmitting}
                    className="h-12 w-full rounded-lg sm:w-auto sm:px-10"
                  >
                    {isSubmitting ? 'Sending…' : 'Send Enquiry'}
                  </Button>
                  <p className="mt-3 text-xs text-slate-500">
                    We aim to respond within 4–5 business hours.
                  </p>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </MotionConfig>
  );
};
