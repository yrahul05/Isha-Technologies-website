import 'server-only';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import fontkit from '@pdf-lib/fontkit';
import { PDFDocument, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import { computeLine, gstSplit, GST_STATES } from '@/lib/portal/invoice-math';
import type { SettingsMap } from '@/server/settings';

/**
 * Branded A4 tax invoice (Isha Technologies logo, DM Sans, brand blue).
 * DM Sans' Latin subset has no ₹ glyph, so the Latin-Ext face is swapped in
 * for that one character. Assets live in src/server/pdf/assets and are
 * traced into the serverless function via next.config outputFileTracingIncludes.
 */
const ASSETS = path.join(process.cwd(), 'src/server/pdf/assets');
const BRAND = rgb(52 / 255, 120 / 255, 228 / 255);
const INK = rgb(15 / 255, 23 / 255, 42 / 255);
const MUTED = rgb(100 / 255, 116 / 255, 139 / 255);
const LINE = rgb(226 / 255, 232 / 255, 240 / 255);
const TINT = rgb(240 / 255, 246 / 255, 254 / 255);

export type InvoicePdfData = {
  number: string;
  status: string;
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

let assetCache: Promise<{ regular: Buffer; bold: Buffer; ext: Buffer; logo: Buffer }> | undefined;
function loadAssets() {
  return (assetCache ??= Promise.all([
    readFile(path.join(ASSETS, 'dm-sans-latin-400-normal.woff')),
    readFile(path.join(ASSETS, 'dm-sans-latin-700-normal.woff')),
    readFile(path.join(ASSETS, 'dm-sans-latin-ext-400-normal.woff')),
    readFile(path.join(ASSETS, 'logo.png')),
  ]).then(([regular, bold, ext, logo]) => ({ regular, bold, ext, logo })));
}

const money = (paise: number) =>
  `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const date = (d: string) => new Date(`${d}T12:00:00+05:30`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });

export async function renderInvoicePdf(inv: InvoicePdfData, company: SettingsMap['company'], tax: SettingsMap['tax'], invoiceSettings: SettingsMap['invoice']): Promise<Uint8Array> {
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
  const text = (p: PDFPage, s: string, x: number, yy: number, size: number, font: PDFFont, color = INK, align: 'left' | 'right' = 'left') => {
    const parts = s.split(/(₹)/).filter(Boolean);
    const width = parts.reduce((w, part) => w + (part === '₹' ? ext : font).widthOfTextAtSize(part, size), 0);
    let cx = align === 'right' ? x - width : x;
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
  const ensure = (needed: number) => {
    if (y - needed < M + 40) {
      footer(page);
      page = pdf.addPage([W, H]);
      y = H - M;
    }
  };
  const footer = (p: PDFPage) => {
    p.drawLine({ start: { x: M, y: M + 18 }, end: { x: W - M, y: M + 18 }, thickness: 0.5, color: LINE });
    text(p, `${company.name} · ${company.website} · ${company.email} · ${company.phone}`, M, M + 6, 7.5, regular, MUTED);
    text(p, 'Build. Scale. Automate.', W - M, M + 6, 7.5, bold, BRAND, 'right');
  };

  // ── Header band ────────────────────────────────────────────────────────
  page.drawRectangle({ x: 0, y: H - 6, width: W, height: 6, color: BRAND });
  const logoW = 150;
  page.drawImage(logo, { x: M, y: y - 44, width: logoW, height: (logoW * logo.height) / logo.width });
  text(page, 'TAX INVOICE', W - M, y - 14, 20, bold, INK, 'right');
  text(page, inv.number, W - M, y - 32, 11, bold, BRAND, 'right');
  if (inv.status === 'paid') text(page, 'PAID IN FULL', W - M, y - 47, 9, bold, rgb(5 / 255, 150 / 255, 105 / 255), 'right');
  if (inv.status === 'cancelled') text(page, 'CANCELLED', W - M, y - 47, 9, bold, rgb(225 / 255, 29 / 255, 72 / 255), 'right');
  y -= 70;

  // ── From / Bill to / Meta ─────────────────────────────────────────────
  const colW = (W - 2 * M - 24) / 3;
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
  const companyAddress = [company.addressLine1, company.addressLine2, [company.city, company.state, company.postalCode].filter(Boolean).join(', '), company.country].filter(Boolean).join(', ');
  const posName = GST_STATES.find((s) => s.code === inv.placeOfSupply)?.name;
  const y1 = block(M, 'From', [company.legalName || company.name, companyAddress, tax.gstin ? `GSTIN: ${tax.gstin}` : '', tax.pan ? `PAN: ${tax.pan}` : '']);
  const y2 = block(M + colW + 12, 'Bill to', [inv.billingName, inv.billingAddress, inv.billingGstin ? `GSTIN: ${inv.billingGstin}` : '']);
  const y3 = block(M + 2 * (colW + 12), 'Details', [
    `Invoice date: ${date(inv.issueDate)}`,
    `Due date: ${date(inv.dueDate)}`,
    posName ? `Place of supply: ${posName} (${inv.placeOfSupply})` : '',
    inv.projectName ? `Project: ${inv.projectName}` : '',
  ]);
  y = Math.min(y1, y2, y3) - 16;

  // ── Items table ───────────────────────────────────────────────────────
  const cols = [
    { key: '#', w: 20, align: 'left' as const },
    { key: 'Description', w: 190, align: 'left' as const },
    { key: 'HSN/SAC', w: 50, align: 'left' as const },
    { key: 'Qty', w: 34, align: 'right' as const },
    { key: 'Rate', w: 70, align: 'right' as const },
    { key: 'Disc.', w: 34, align: 'right' as const },
    { key: 'GST', w: 30, align: 'right' as const },
    { key: 'Amount', w: W - 2 * M - 428, align: 'right' as const },
  ];
  const drawHeader = () => {
    page.drawRectangle({ x: M, y: y - 6, width: W - 2 * M, height: 20, color: TINT });
    let x = M + 6;
    for (const c of cols) {
      text(page, c.key.toUpperCase(), c.align === 'right' ? x + c.w - 6 : x, y, 7, bold, BRAND, c.align);
      x += c.w;
    }
    y -= 22;
  };
  drawHeader();
  inv.items.forEach((item, i) => {
    const line = computeLine(item);
    const desc = wrap(item.description, regular, 8.5, cols[1].w - 10);
    const rowH = Math.max(1, desc.length) * 11 + 12;
    ensure(rowH + 10);
    if (y > H - M - 5) drawHeader();
    const values = [
      String(i + 1),
      '',
      item.hsnSac ?? '',
      Number(item.quantity).toLocaleString('en-IN'),
      money(item.unitPricePaise),
      item.discountPct ? `${item.discountPct}%` : '—',
      `${item.taxRatePct}%`,
      money(line.taxablePaise),
    ];
    let x = M + 6;
    cols.forEach((c, ci) => {
      if (ci === 1) desc.forEach((d, di) => text(page, d, x, y - di * 11, 8.5, di === 0 ? bold : regular, INK));
      else text(page, values[ci], c.align === 'right' ? x + c.w - 6 : x, y, 8.5, ci === 7 ? bold : regular, ci === 7 ? INK : MUTED, c.align);
      x += c.w;
    });
    y -= rowH;
    page.drawLine({ start: { x: M, y: y + 7 }, end: { x: W - M, y: y + 7 }, thickness: 0.5, color: LINE });
  });

  // ── Totals ────────────────────────────────────────────────────────────
  const split = gstSplit(inv.taxPaise, tax.stateCode, inv.placeOfSupply);
  const due = Math.max(0, inv.totalPaise - inv.paidPaise);
  const totals: [string, string, boolean?][] = [
    ['Subtotal', money(inv.subtotalPaise)],
    ...(inv.discountPaise ? ([['Discount', `- ${money(inv.discountPaise)}`]] as [string, string][]) : []),
    ...(split.kind === 'intra'
      ? ([
          ['CGST', money(split.cgstPaise)],
          ['SGST', money(split.sgstPaise)],
        ] as [string, string][])
      : ([['IGST', money(split.igstPaise)]] as [string, string][])),
    ['Total', money(inv.totalPaise), true],
    ['Paid', money(inv.paidPaise)],
    ['Balance due', money(due), true],
  ];
  ensure(totals.length * 16 + 60);
  y -= 6;
  const tx = W - M - 200;
  for (const [label, value, strong] of totals) {
    if (label === 'Balance due') {
      page.drawRectangle({ x: tx - 8, y: y - 6, width: 208, height: 20, color: BRAND });
      text(page, label, tx, y, 9.5, bold, rgb(1, 1, 1));
      text(page, value, W - M - 6, y, 10, bold, rgb(1, 1, 1), 'right');
    } else {
      text(page, label, tx, y, 8.5, strong ? bold : regular, strong ? INK : MUTED);
      text(page, value, W - M - 6, y, 8.5, strong ? bold : regular, INK, 'right');
    }
    y -= 16;
  }
  const words = `Amount in words: ${rupeesInWords(inv.totalPaise)}`;
  const wordLines = wrap(words, regular, 8, tx - M - 30);
  const wordsY = y + totals.length * 16 - 4;
  wordLines.forEach((l, i) => text(page, l, M, wordsY - i * 11, 8, regular, MUTED));
  y -= 10;

  // ── Payments, bank details, notes, terms ─────────────────────────────
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
  const bank = [
    invoiceSettings.bankName && `Bank: ${invoiceSettings.bankName}`,
    invoiceSettings.bankAccountName && `Account name: ${invoiceSettings.bankAccountName}`,
    invoiceSettings.bankAccountNumber && `Account no.: ${invoiceSettings.bankAccountNumber}`,
    invoiceSettings.bankIfsc && `IFSC: ${invoiceSettings.bankIfsc}`,
    invoiceSettings.upiId && `UPI: ${invoiceSettings.upiId}`,
  ]
    .filter(Boolean)
    .join('   ·   ');
  section('Payment details', bank);
  section('Notes', inv.notes);
  section('Terms', inv.terms);
  ensure(40);
  text(page, 'This is a computer-generated invoice and does not require a signature.', M, y - 4, 7.5, regular, MUTED);

  pdf.getPages().forEach((p, i, all) => {
    footer(p);
    if (all.length > 1) text(p, `Page ${i + 1} of ${all.length}`, W - M, H - 24, 7.5, regular, MUTED, 'right');
  });
  return pdf.save();
}

// ── Indian-system amount in words ─────────────────────────────────────────
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
export function rupeesInWords(paise: number): string {
  const rupees = Math.floor(paise / 100);
  const p = paise % 100;
  if (rupees === 0 && p === 0) return 'Zero Rupees Only';
  const parts: string[] = [];
  const crore = Math.floor(rupees / 1e7);
  const lakh = Math.floor((rupees % 1e7) / 1e5);
  const thousand = Math.floor((rupees % 1e5) / 1e3);
  const rest = rupees % 1e3;
  if (crore) parts.push(`${crore >= 100 ? threeDigits(crore) : twoDigits(crore)} Crore`);
  if (lakh) parts.push(`${twoDigits(lakh)} Lakh`);
  if (thousand) parts.push(`${twoDigits(thousand)} Thousand`);
  if (rest) parts.push(threeDigits(rest));
  let out = parts.length ? `${parts.join(' ')} Rupees` : '';
  if (p) out += `${out ? ' and ' : ''}${twoDigits(p)} Paise`;
  return `${out} Only`;
}
