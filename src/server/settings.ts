import 'server-only';
import { eq, sql } from 'drizzle-orm';
import { cache } from 'react';
import { db, type Database } from '@/server/db';
import { counters, settings } from '@/server/db/schema';

/** Typed system settings, stored as JSON rows in `settings` and edited in /portal/settings. */
export type SettingsMap = {
  company: {
    name: string;
    legalName: string;
    email: string;
    phone: string;
    website: string;
    addressLine1: string;
    addressLine2: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  tax: {
    gstin: string;
    pan: string;
    /** Supplier's GST state code — decides CGST+SGST vs IGST in "auto" mode. */
    stateCode: string;
    /** GST slabs offered on INR invoices (configurable, not hard-coded). */
    gstRates: number[];
    defaultTaxRatePct: number;
    sacCode: string;
    /** Defaults for USD/CAD invoices (no Indian GST). */
    internationalTaxLabel: string;
    internationalTaxRatePct: number;
  };
  invoice: {
    prefix: string;
    defaultCurrency: 'INR' | 'USD' | 'CAD';
    defaultDueDays: number;
    defaultTerms: string;
    defaultNotes: string;
    footer: string;
    signatoryName: string;
    signatoryTitle: string;
  };
  /** Display symbol per currency code (codes are fixed: INR, USD, CAD). */
  currencies: { INR: string; USD: string; CAD: string };
  /** Payment details printed on invoices; each field has a "show on invoice" flag. */
  payment: {
    domestic: { bankName: string; accountName: string; accountNumber: string; ifsc: string; branch: string; upiId: string; show: Record<string, boolean> };
    international: {
      bankName: string;
      accountName: string;
      accountNumber: string;
      swift: string;
      iban: string;
      routing: string;
      bankAddress: string;
      instructions: string;
      show: Record<string, boolean>;
    };
  };
  notifications: { soundEnabled: boolean; pollSeconds: number; emailHighPriority: boolean };
  leads: { defaultAssigneeId: string | null; roundRobin: boolean };
  storage: { maxUploadMb: number };
  security: { enforceMfaForInternal: boolean };
  branding: { accentHex: string; portalName: string };
};

export const DEFAULT_SETTINGS: SettingsMap = {
  company: {
    name: 'Isha Technologies',
    legalName: 'Isha Technologies',
    email: 'hello.ishatechnologies@gmail.com',
    phone: '+91 9351267228',
    website: 'www.ishatechnologies.in',
    addressLine1: '',
    addressLine2: '',
    city: 'Jaipur',
    state: 'Rajasthan',
    postalCode: '',
    country: 'India',
  },
  tax: {
    gstin: '',
    pan: '',
    stateCode: '08',
    gstRates: [0, 5, 12, 18, 28],
    defaultTaxRatePct: 18,
    sacCode: '998313',
    internationalTaxLabel: 'Tax',
    internationalTaxRatePct: 0,
  },
  invoice: {
    prefix: 'ISH',
    defaultCurrency: 'INR',
    defaultDueDays: 15,
    defaultTerms: 'Payment due within 15 days of the invoice date. Late payments may attract interest as per agreement.',
    defaultNotes: 'Thank you for your business.',
    footer: 'This is a computer-generated invoice.',
    signatoryName: '',
    signatoryTitle: 'Authorised Signatory',
  },
  currencies: { INR: '₹', USD: '$', CAD: 'CA$' },
  payment: {
    domestic: {
      bankName: '',
      accountName: '',
      accountNumber: '',
      ifsc: '',
      branch: '',
      upiId: '',
      show: { bankName: true, accountName: true, accountNumber: true, ifsc: true, branch: true, upiId: true },
    },
    international: {
      bankName: '',
      accountName: '',
      accountNumber: '',
      swift: '',
      iban: '',
      routing: '',
      bankAddress: '',
      instructions: '',
      show: { bankName: true, accountName: true, accountNumber: true, swift: true, iban: true, routing: true, bankAddress: true, instructions: true },
    },
  },
  notifications: { soundEnabled: true, pollSeconds: 20, emailHighPriority: true },
  leads: { defaultAssigneeId: null, roundRobin: true },
  storage: { maxUploadMb: 25 },
  security: { enforceMfaForInternal: false },
  branding: { accentHex: '#3478e4', portalName: 'Isha Technologies Portal' },
};

export const getSetting = cache(async <K extends keyof SettingsMap>(key: K): Promise<SettingsMap[K]> => {
  const [row] = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
  return { ...DEFAULT_SETTINGS[key], ...((row?.value as Partial<SettingsMap[K]>) ?? {}) } as SettingsMap[K];
});

export async function saveSetting<K extends keyof SettingsMap>(key: K, value: SettingsMap[K], userId: string) {
  await db
    .insert(settings)
    .values({ key, value, updatedBy: userId })
    .onConflictDoUpdate({ target: settings.key, set: { value, updatedBy: userId, updatedAt: new Date() } });
}

/** Atomically increments and returns a named counter (safe under concurrency). */
export async function nextCounter(key: string, tx: Pick<Database, 'insert'> = db): Promise<number> {
  const [row] = await tx
    .insert(counters)
    .values({ key, value: 1 })
    .onConflictDoUpdate({ target: counters.key, set: { value: sql`${counters.value} + 1` } })
    .returning({ value: counters.value });
  return row.value;
}
