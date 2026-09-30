/**
 * Invoice arithmetic in integer paise. Shared by the server (authoritative
 * totals on save), the seed script and the live preview in the invoice
 * editor, so the numbers can never disagree.
 */
export type LineInput = { quantity: number; unitPricePaise: number; discountPct: number; taxRatePct: number };

export type LineResult = { basePaise: number; discountPaise: number; taxablePaise: number; taxPaise: number };

export function computeLine(line: LineInput): LineResult {
  const basePaise = Math.round(line.quantity * line.unitPricePaise);
  const discountPaise = Math.round((basePaise * clampPct(line.discountPct)) / 100);
  const taxablePaise = basePaise - discountPaise;
  const taxPaise = Math.round((taxablePaise * clampPct(line.taxRatePct)) / 100);
  return { basePaise, discountPaise, taxablePaise, taxPaise };
}

export function computeTotals(lines: LineInput[]) {
  let subtotalPaise = 0;
  let discountPaise = 0;
  let taxPaise = 0;
  for (const line of lines) {
    const r = computeLine(line);
    subtotalPaise += r.basePaise;
    discountPaise += r.discountPaise;
    taxPaise += r.taxPaise;
  }
  return { subtotalPaise, discountPaise, taxPaise, totalPaise: subtotalPaise - discountPaise + taxPaise };
}

/** Intra-state supply → CGST + SGST halves; inter-state → IGST. */
export function gstSplit(taxPaise: number, supplierStateCode: string, placeOfSupplyCode: string | null | undefined) {
  if (placeOfSupplyCode && supplierStateCode && placeOfSupplyCode === supplierStateCode) {
    const cgst = Math.floor(taxPaise / 2);
    return { kind: 'intra' as const, cgstPaise: cgst, sgstPaise: taxPaise - cgst, igstPaise: 0 };
  }
  return { kind: 'inter' as const, cgstPaise: 0, sgstPaise: 0, igstPaise: taxPaise };
}

function clampPct(n: number): number {
  return Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : 0;
}

export function rupeesToPaise(value: number | string): number {
  const n = typeof value === 'string' ? Number(value.replace(/[,₹\s]/g, '')) : value;
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 });
const inrCompact = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', notation: 'compact', maximumFractionDigits: 1 });

export function formatINR(paise: number, opts: { compact?: boolean } = {}): string {
  return (opts.compact ? inrCompact : inr).format(paise / 100);
}

/** Invoice status derived from amounts and dates (never stored stale). */
export function deriveInvoiceStatus(inv: {
  status: string;
  totalPaise: number;
  paidPaise: number;
  dueDate: string;
}, today = new Date().toISOString().slice(0, 10)): 'draft' | 'sent' | 'partially_paid' | 'paid' | 'overdue' | 'cancelled' {
  if (inv.status === 'draft' || inv.status === 'cancelled') return inv.status;
  if (inv.totalPaise > 0 && inv.paidPaise >= inv.totalPaise) return 'paid';
  if (inv.dueDate < today) return 'overdue';
  if (inv.paidPaise > 0) return 'partially_paid';
  return 'sent';
}

/** Indian GST state codes (first two digits of a GSTIN). */
export const GST_STATES: { code: string; name: string }[] = [
  ['01', 'Jammu & Kashmir'], ['02', 'Himachal Pradesh'], ['03', 'Punjab'], ['04', 'Chandigarh'], ['05', 'Uttarakhand'],
  ['06', 'Haryana'], ['07', 'Delhi'], ['08', 'Rajasthan'], ['09', 'Uttar Pradesh'], ['10', 'Bihar'], ['11', 'Sikkim'],
  ['12', 'Arunachal Pradesh'], ['13', 'Nagaland'], ['14', 'Manipur'], ['15', 'Mizoram'], ['16', 'Tripura'],
  ['17', 'Meghalaya'], ['18', 'Assam'], ['19', 'West Bengal'], ['20', 'Jharkhand'], ['21', 'Odisha'],
  ['22', 'Chhattisgarh'], ['23', 'Madhya Pradesh'], ['24', 'Gujarat'], ['26', 'Dadra & Nagar Haveli and Daman & Diu'],
  ['27', 'Maharashtra'], ['29', 'Karnataka'], ['30', 'Goa'], ['31', 'Lakshadweep'], ['32', 'Kerala'],
  ['33', 'Tamil Nadu'], ['34', 'Puducherry'], ['35', 'Andaman & Nicobar Islands'], ['36', 'Telangana'],
  ['37', 'Andhra Pradesh'], ['38', 'Ladakh'], ['97', 'Other Territory'], ['96', 'Outside India (export)'],
].map(([code, name]) => ({ code, name }));

export function isValidGstin(value: string): boolean {
  return /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(value.toUpperCase());
}
