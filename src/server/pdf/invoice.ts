import 'server-only';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import fontkit from '@pdf-lib/fontkit';
import { PDFDocument, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import { computeLine, CURRENCIES, formatMoney, GST_STATES, isCurrency, taxBreakdown } from '@/lib/portal/invoice-math';
import type { SettingsMap } from '@/server/settings';

/**
 * Branded A4 invoice (Isha Technologies logo, DM Sans, brand blue).
 *
 * - INR invoices print "TAX INVOICE" with CGST+SGST or IGST lines; USD/CAD
 *   invoices print "INVOICE" with an optional custom tax line and never show
 *   Indian GST fields.
 * - Payment details come from Admin Settings (domestic or international
 *   profile, each field individually switchable); only the chosen profile
 *   is printed, and only on this client's own invoice.
 * - DM Sans' Latin subset has no ₹ glyph, so the Latin-Ext face is swapped in
 *   for that one character. Assets are traced into the function via
 *   next.config outputFileTracingIncludes.
 */
const ASSETS = path.join(process.cwd(), 'src/server/pdf/assets');
const BRAND = rgb(52 / 255, 120 / 255, 228 / 255);
const INK = rgb(15 / 255, 23 / 255, 42 / 255);
const MUTED = rgb(100 / 255, 116 / 255, 139 / 255);
const LINE = rgb(226 / 255, 232 / 255, 240 / 255);
const TINT = rgb(240 / 255, 246 / 255, 254 / 255);
const GREEN = rgb(5 / 255, 150 / 255, 105 / 255);
const RED = rgb(225 / 255, 29 / 255, 72 / 255);
const AMBER = rgb(180 / 255, 83 / 255, 9 / 255);

export type InvoicePdfData = {
  number: string;
  status: string;
  currency: string;
  taxMode: string;
  taxLabel: string | null;
  paymentProfile: string;
  issueDate: string;
  dueDate: string;
  billingName: string;
  billingAddress: string;
  billingGstin: string | null;
  placeOfSupply: string | null;
  notes: string;
  terms: string;
  subtotalPaise: number;
  discountPaise: number;
  taxPaise: number;
  totalPaise: number;
  paidPaise: number;
  projectName: string | null;
  items: { description: string; hsnSac: string | null; quantity: number; unitPricePaise: number; discountPct: number; taxRatePct: number }[];
  payments: { paidOn: string; amountPaise: number; method: string; reference: string | null }[];
};

export type InvoiceBranding = {
  company: SettingsMap['company'];
  tax: SettingsMap['tax'];
  invoice: SettingsMap['invoice'];
  currencies: SettingsMap['currencies'];
  payment: SettingsMap['payment'];
};

let assetCache: Promise<{ regular: Buffer; bold: Buffer; ext: Buffer; logo: Buffer }> | undefined;
function loadAssets() {
  return (assetCache ??= Promise.all([
    readFile(path.join(ASSETS, 'dm-sans-latin-400-normal.woff')),
    readFile(path.join(ASSETS, 'dm-sans-latin-700-normal.woff')),
    readFile(path.join(ASSETS, 'dm-sans-latin-ext-400-normal.woff')),
    readFile(path.join(ASSETS, 'logo.png')),
  ]).then(([regular, bold, ext, logo]) => ({ regular, bold, ext, logo })));
}

const date = (d: string) => new Date(`${d}T12:00:00+05:30`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });

/** Rows of the configured payment profile, respecting each "show on invoice" flag. */
export function paymentDetailRows(profile: string, currency: string, payment: SettingsMap['payment']): [string, string][] {
  const pick = (source: Record<string, unknown>, show: Record<string, boolean>, fields: [string, string][]) =>
    fields.filter(([k]) => show[k] !== false && String(source[k] ?? '').trim()).map(([k, label]) => [label, String(source[k]).trim()] as [string, string]);
  if (profile === 'none') return [];
  if (profile === 'international') {
    return pick(payment.international, payment.international.show, [
      ['bankName', 'Bank'],
      ['accountName', 'Account name'],
      ['accountNumber', 'Account number'],
      ['swift', 'SWIFT / BIC'],
      ['iban', 'IBAN'],
      ['routing', currency === 'CAD' ? 'Transit / institution no.' : 'Routing (ABA) no.'],
      ['bankAddress', 'Bank address'],
      ['instructions', 'Instructions'],
    ]);
  }
  return pick(payment.domestic, payment.domestic.show, [
    ['bankName', 'Bank'],
    ['accountName', 'Account name'],
    ['accountNumber', 'Account number'],
    ['ifsc', 'IFSC'],
    ['branch', 'Branch'],
    ['upiId', 'UPI'],
  ]);
}

export async function renderInvoicePdf(inv: InvoicePdfData, brand: InvoiceBranding): Promise<Uint8Array> {
  const { company, tax, invoice: invoiceSettings, currencies, payment } = brand;
  const currency = isCurrency(inv.currency) ? inv.currency : 'INR';
  const symbol = currencies[currency] || CURRENCIES[currency].symbol;
  const money = (minor: number) => formatMoney(minor, currency, { symbol });
  const isGst = currency === 'INR' && inv.taxMode.startsWith('gst');

  const assets = await loadAssets();
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  pdf.setTitle(`Invoice ${inv.number}`);
  pdf.setAuthor(company.name);
  pdf.setCreator('Isha Technologies Portal');
  const regular = await pdf.embedFont(assets.regular, { subset: true });
  const bold = await pdf.embedFont(assets.bold, { subset: true });
  const ext = await pdf.embedFont(assets.ext, { subset: true });
  const logo = await pdf.embedPng(assets.logo);

  const W = 595.28;
  const H = 841.89;
  const M = 40;
  let page = pdf.addPage([W, H]);
  let y = H - M;

  /** Draws text, swapping in the Latin-Ext face for ₹. Returns the width. */
  const text = (p: PDFPage, s: string, x: number, yy: number, size: number, font: PDFFont, color = INK, align: 'left' | 'right' | 'center' = 'left') => {
    const parts = s.split(/(₹)/).filter(Boolean);
    const width = parts.reduce((w, part) => w + (part === '₹' ? ext : font).widthOfTextAtSize(part, size), 0);
    let cx = align === 'right' ? x - width : align === 'center' ? x - width / 2 : x;
    for (const part of parts) {
      const f = part === '₹' ? ext : font;
      p.drawText(part, { x: cx, y: yy, size, font: f, color });
      cx += f.widthOfTextAtSize(part, size);
    }
    return width;
  };
  const wrap = (s: string, font: PDFFont, size: number, maxWidth: number): string[] => {
    const out: string[] = [];
    for (const para of s.split('\n')) {
      let line = '';
      for (const word of para.split(/\s+/)) {
        const next = line ? `${line} ${word}` : word;
        if (font.widthOfTextAtSize(next.replace(/₹/g, 'Rs'), size) > maxWidth && line) {
          out.push(line);
          line = word;
        } else line = next;
      }
      out.push(line);
    }
    return out;
  };
  const footer = (p: PDFPage) => {
    p.drawLine({ start: { x: M, y: M + 18 }, end: { x: W - M, y: M + 18 }, thickness: 0.5, color: LINE });
    text(p, invoiceSettings.footer || `${company.name} · ${company.website}`, M, M + 6, 7.5, regular, MUTED);
    text(p, 'Build. Scale. Automate.', W - M, M + 6, 7.5, bold, BRAND, 'right');
  };
  const ensure = (needed: number) => {
    if (y - needed < M + 40) {
      page = pdf.addPage([W, H]);
      y = H - M;
    }
  };

  // ── Header: logo + company identity | document title ─────────────────
  page.drawRectangle({ x: 0, y: H - 6, width: W, height: 6, color: BRAND });
  const logoW = 140;
  page.drawImage(logo, { x: M, y: y - 44, width: logoW, height: (logoW * logo.height) / logo.width });
  const companyLines = [
    [company.addressLine1, company.addressLine2].filter(Boolean).join(', '),
    [[company.city, company.state, company.postalCode].filter(Boolean).join(', '), company.country].filter(Boolean).join(', '),
    [company.email, company.phone].filter(Boolean).join('  ·  '),
    company.website,
    tax.gstin ? `GSTIN ${tax.gstin}${tax.pan ? `  ·  PAN ${tax.pan}` : ''}` : '',
  ].filter((l) => l && l.trim());
  let cy = y - 58;
  text(page, company.legalName || company.name, M, cy, 10, bold, INK);
  for (const l of companyLines) {
    cy -= 11;
    text(page, l, M, cy, 8, regular, MUTED);
  }

  text(page, isGst ? 'TAX INVOICE' : 'INVOICE', W - M, y - 14, 20, bold, INK, 'right');
  text(page, inv.number, W - M, y - 32, 11, bold, BRAND, 'right');
  const due = Math.max(0, inv.totalPaise - inv.paidPaise);
  const [statusText, statusColor] =
    inv.status === 'paid'
      ? ['PAID IN FULL', GREEN]
      : inv.status === 'cancelled'
        ? ['CANCELLED', RED]
        : inv.status === 'overdue'
          ? ['OVERDUE', RED]
          : inv.status === 'partially_paid'
            ? ['PARTIALLY PAID', AMBER]
            : inv.status === 'draft'
              ? ['DRAFT', MUTED]
              : ['PAYMENT DUE', AMBER];
  text(page, statusText, W - M, y - 47, 8.5, bold, statusColor, 'right');
  y = Math.min(cy, y - 60) - 22;

  // ── Bill to | Invoice details ─────────────────────────────────────────
  const colW = (W - 2 * M - 20) / 2;
  const block = (x: number, title: string, lines: string[]) => {
    let yy = y;
    text(page, title.toUpperCase(), x, yy, 7.5, bold, BRAND);
    yy -= 14;
    lines.filter(Boolean).forEach((l, i) => {
      for (const w of wrap(l, i === 0 ? bold : regular, 8.5, colW)) {
        text(page, w, x, yy, 8.5, i === 0 ? bold : regular, i === 0 ? INK : MUTED);
        yy -= 11.5;
      }
    });
    return yy;
  };
  const posName = GST_STATES.find((s) => s.code === inv.placeOfSupply)?.name;
  const clientTaxId = inv.billingGstin ? (currency === 'INR' ? `GSTIN: ${inv.billingGstin}` : `Tax ID: ${inv.billingGstin}`) : '';
  const y1 = block(M, 'Bill to', [inv.billingName, inv.billingAddress, clientTaxId]);
  const y2 = block(M + colW + 20, 'Invoice details', [
    `Invoice no.: ${inv.number}`,
    `Invoice date: ${date(inv.issueDate)}`,
    `Due date: ${date(inv.dueDate)}`,
    `Currency: ${currency} (${CURRENCIES[currency].name})`,
    isGst && posName ? `Place of supply: ${posName} (${inv.placeOfSupply})` : '',
    inv.projectName ? `Project: ${inv.projectName}` : '',
  ]);
  y = Math.min(y1, y2) - 16;

  // ── Line items ───────────────────────────────────────────────────────
  const showTax = inv.taxMode !== 'none';
  const cols = [
    { key: '#', w: 20, align: 'left' as const },
    { key: 'Description', w: 196 + (isGst ? 0 : 46) + (showTax ? 0 : 32), align: 'left' as const },
    { key: isGst ? 'HSN/SAC' : '', w: isGst ? 46 : 0, align: 'left' as const },
    { key: 'Qty', w: 34, align: 'right' as const },
    { key: 'Rate', w: 74, align: 'right' as const },
    { key: 'Disc.', w: 36, align: 'right' as const },
    { key: showTax ? (isGst ? 'GST' : 'Tax') : '', w: showTax ? 32 : 0, align: 'right' as const },
  ];
  cols.push({ key: 'Amount', w: W - 2 * M - cols.reduce((s, c) => s + c.w, 0), align: 'right' as const });
  const drawHeader = () => {
    page.drawRectangle({ x: M, y: y - 6, width: W - 2 * M, height: 20, color: TINT });
    let x = M + 6;
    for (const c of cols) {
      if (c.w) text(page, c.key.toUpperCase(), c.align === 'right' ? x + c.w - 6 : x, y, 7, bold, BRAND, c.align);
      x += c.w;
    }
    y -= 22;
  };
  drawHeader();
  inv.items.forEach((item, i) => {
    const line = computeLine(item);
    const desc = wrap(item.description, regular, 8.5, cols[1].w - 10);
    const rowH = Math.max(1, desc.length) * 11 + 12;
    if (y - rowH < M + 60) {
      page = pdf.addPage([W, H]);
      y = H - M;
      drawHeader();
    }
    const values = [String(i + 1), '', item.hsnSac ?? '', Number(item.quantity).toLocaleString('en-IN'), money(item.unitPricePaise), item.discountPct ? `${item.discountPct}%` : '—', `${item.taxRatePct}%`, money(line.taxablePaise)];
    let x = M + 6;
    cols.forEach((c, ci) => {
      if (c.w) {
        if (ci === 1) desc.forEach((d, di) => text(page, d, x, y - di * 11, 8.5, di === 0 ? bold : regular, INK));
        else text(page, values[ci], c.align === 'right' ? x + c.w - 6 : x, y, 8.5, ci === 7 ? bold : regular, ci === 7 ? INK : MUTED, c.align);
      }
      x += c.w;
    });
    y -= rowH;
    page.drawLine({ start: { x: M, y: y + 7 }, end: { x: W - M, y: y + 7 }, thickness: 0.5, color: LINE });
  });

  // ── Totals ───────────────────────────────────────────────────────────
  const taxLines = taxBreakdown(inv.taxPaise, inv, tax.stateCode);
  const totals: [string, string, boolean?][] = [
    ['Subtotal', money(inv.subtotalPaise)],
    ...(inv.discountPaise ? ([['Discount', `- ${money(inv.discountPaise)}`]] as [string, string][]) : []),
    ...taxLines.map((t) => [t.label, money(t.amount)] as [string, string]),
    [`Total (${currency})`, money(inv.totalPaise), true],
    ['Amount paid', money(inv.paidPaise)],
    ['Amount due', money(due), true],
  ];
  ensure(totals.length * 16 + 50);
  y -= 6;
  const tx = W - M - 210;
  const totalsTop = y;
  for (const [label, value, strong] of totals) {
    if (label === 'Amount due') {
      page.drawRectangle({ x: tx - 8, y: y - 6, width: 218, height: 20, color: BRAND });
      text(page, label, tx, y, 9.5, bold, rgb(1, 1, 1));
      text(page, value, W - M - 6, y, 10, bold, rgb(1, 1, 1), 'right');
    } else {
      text(page, label, tx, y, 8.5, strong ? bold : regular, strong ? INK : MUTED);
      text(page, value, W - M - 6, y, 8.5, strong ? bold : regular, INK, 'right');
    }
    y -= 16;
  }
  wrap(`Amount in words: ${amountInWords(inv.totalPaise, currency)}`, regular, 8, tx - M - 30).forEach((l, i) => text(page, l, M, totalsTop - i * 11, 8, regular, MUTED));
  y -= 10;

  // ── Payments, payment details, notes, terms ──────────────────────────
  const section = (title: string, body: string) => {
    if (!body.trim()) return;
    const lines = wrap(body, regular, 8.5, W - 2 * M);
    ensure(lines.length * 11.5 + 24);
    text(page, title.toUpperCase(), M, y, 7.5, bold, BRAND);
    y -= 13;
    for (const l of lines) {
      text(page, l, M, y, 8.5, regular, INK);
      y -= 11.5;
    }
    y -= 8;
  };
  if (inv.payments.length) {
    section('Payments received', inv.payments.map((p) => `${date(p.paidOn)} · ${money(p.amountPaise)} · ${p.method.replace('_', ' ')}${p.reference ? ` · Ref ${p.reference}` : ''}`).join('\n'));
  }
  const rows = paymentDetailRows(inv.paymentProfile, currency, payment);
  if (rows.length && inv.status !== 'paid' && inv.status !== 'cancelled') {
    section(inv.paymentProfile === 'international' ? 'International payment details' : 'Payment details', rows.map(([k, v]) => `${k}: ${v}`).join('\n'));
  }
  section('Notes', inv.notes);
  section('Terms & conditions', inv.terms);

  // ── Authorised signatory ─────────────────────────────────────────────
  ensure(80);
  const sx = W - M - 190;
  y -= 10;
  text(page, `For ${company.legalName || company.name}`, sx, y, 8.5, bold, INK);
  page.drawLine({ start: { x: sx, y: y - 36 }, end: { x: W - M, y: y - 36 }, thickness: 0.6, color: MUTED });
  if (invoiceSettings.signatoryName) text(page, invoiceSettings.signatoryName, sx, y - 48, 8.5, bold, INK);
  text(page, invoiceSettings.signatoryTitle || 'Authorised Signatory', sx, invoiceSettings.signatoryName ? y - 60 : y - 48, 8, regular, MUTED);

  pdf.getPages().forEach((p, i, all) => {
    footer(p);
    if (all.length > 1) text(p, `Page ${i + 1} of ${all.length}`, W - M, H - 24, 7.5, regular, MUTED, 'right');
  });
  return pdf.save();
}

// ── Amount in words ──────────────────────────────────────────────────────
const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
function twoDigits(n: number): string {
  return n < 20 ? ONES[n] : `${TENS[Math.floor(n / 10)]}${n % 10 ? ` ${ONES[n % 10]}` : ''}`;
}
function threeDigits(n: number): string {
  const h = Math.floor(n / 100);
  const r = n % 100;
  return [h ? `${ONES[h]} Hundred` : '', r ? twoDigits(r) : ''].filter(Boolean).join(' ');
}
/** Indian system (lakh/crore) for INR; international (thousand/million) for USD/CAD. */
export function amountInWords(minor: number, currency = 'INR'): string {
  const major = Math.floor(minor / 100);
  const cents = minor % 100;
  const parts: string[] = [];
  if (currency === 'INR') {
    const crore = Math.floor(major / 1e7);
    const lakh = Math.floor((major % 1e7) / 1e5);
    const thousand = Math.floor((major % 1e5) / 1e3);
    if (crore) parts.push(`${crore >= 100 ? threeDigits(crore) : twoDigits(crore)} Crore`);
    if (lakh) parts.push(`${twoDigits(lakh)} Lakh`);
    if (thousand) parts.push(`${twoDigits(thousand)} Thousand`);
  } else {
    const billion = Math.floor(major / 1e9);
    const million = Math.floor((major % 1e9) / 1e6);
    const thousand = Math.floor((major % 1e6) / 1e3);
    if (billion) parts.push(`${threeDigits(billion)} Billion`);
    if (million) parts.push(`${threeDigits(million)} Million`);
    if (thousand) parts.push(`${threeDigits(thousand)} Thousand`);
  }
  if (major % 1e3) parts.push(threeDigits(major % 1e3));
  const unit = currency === 'INR' ? ['Rupees', 'Paise'] : currency === 'CAD' ? ['Canadian Dollars', 'Cents'] : ['US Dollars', 'Cents'];
  let out = parts.length ? `${parts.join(' ')} ${unit[0]}` : '';
  if (cents) out += `${out ? ' and ' : ''}${twoDigits(cents)} ${unit[1]}`;
  return `${out || `Zero ${unit[0]}`} Only`;
}
