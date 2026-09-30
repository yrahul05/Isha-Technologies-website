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
  tax: { gstin: string; pan: string; stateCode: string; defaultTaxRatePct: number; sacCode: string };
  invoice: {
    prefix: string;
    defaultDueDays: number;
    defaultTerms: string;
    defaultNotes: string;
    bankName: string;
    bankAccountName: string;
    bankAccountNumber: string;
    bankIfsc: string;
    upiId: string;
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
  tax: { gstin: '', pan: '', stateCode: '08', defaultTaxRatePct: 18, sacCode: '998313' },
  invoice: {
    prefix: 'INV',
    defaultDueDays: 15,
    defaultTerms: 'Payment due within 15 days of the invoice date. Late payments may attract interest as per agreement.',
    defaultNotes: 'Thank you for your business.',
    bankName: '',
    bankAccountName: '',
    bankAccountNumber: '',
    bankIfsc: '',
    upiId: '',
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
