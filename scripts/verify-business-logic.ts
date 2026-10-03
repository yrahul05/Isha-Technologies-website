/**
 * Pure business-logic checks (no database): GST, currencies, payment webhook signatures.
 *   npm run test:logic
 */
import { createHmac } from 'node:crypto';
import { computeLine, computeTotals, formatMoney, gstSplit, isValidGstin, rupeesToPaise } from '../src/lib/portal/invoice-math';
import * as logic from '../src/server/payments/gateway';
const providerFor = logic.providerFor;

let passes = 0;
let failures = 0;
function check(label: string, ok: boolean) {
  if (ok) passes++;
  else failures++;
  console.log(`${ok ? '  ✓' : '  ✗'} ${label}`);
}

console.log('GST & totals');
const g1 = gstSplit(18_00, '06', '06');
check('intra-state → CGST+SGST halves, no IGST', g1.kind === 'intra' && g1.cgstPaise + g1.sgstPaise === 18_00 && g1.igstPaise === 0);
const g2 = gstSplit(18_00, '06', '08');
check('inter-state → IGST only', g2.kind === 'inter' && g2.igstPaise === 18_00 && g2.cgstPaise === 0);
const odd = gstSplit(1_01, '06', '06');
check('odd paise split never loses a paisa', odd.cgstPaise + odd.sgstPaise === 1_01);
const line = computeLine({ quantity: 2, unitPricePaise: 100_00, discountPct: 10, taxRatePct: 18 });
check('line: 2 × 100 − 10% + 18% = 212.40', line.taxablePaise === 180_00 && line.taxPaise === 32_40);
check('totals sum the lines', computeTotals([{ quantity: 1, unitPricePaise: 100_00, discountPct: 0, taxRatePct: 18 }, { quantity: 1, unitPricePaise: 50_00, discountPct: 0, taxRatePct: 0 }]).totalPaise === 168_00);
check('rupeesToPaise avoids float drift', rupeesToPaise('19.99') === 19_99 && rupeesToPaise(0.1 + 0.2) === 30);
check('valid / invalid GSTIN', isValidGstin('06AABCN1234F1Z5') && !isValidGstin('NOT-A-GSTIN'));

console.log('\nCurrencies');
check('INR uses ₹', formatMoney(1_000_00, 'INR').includes('₹'));
check('USD uses $', formatMoney(1_000_00, 'USD').includes('$'));
check('CAD is distinguishable from USD', formatMoney(1_000_00, 'CAD') !== formatMoney(1_000_00, 'USD'));

console.log('\nPayment webhooks');
process.env.RAZORPAY_WEBHOOK_SECRET = 'rzp_secret';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
const body = '{"event":"payment.captured"}';
const rz = createHmac('sha256', 'rzp_secret').update(body).digest('hex');
check('razorpay: valid signature accepted', logic.verifyRazorpaySignature(body, rz));
check('razorpay: tampered body rejected', !logic.verifyRazorpaySignature(body + ' ', rz));
check('razorpay: missing signature rejected', !logic.verifyRazorpaySignature(body, null));
const now = Date.now();
const t = Math.floor(now / 1000);
const sig = createHmac('sha256', 'whsec_test').update(`${t}.${body}`).digest('hex');
check('stripe: valid signature accepted', logic.verifyStripeSignature(body, `t=${t},v1=${sig}`, now));
check('stripe: tampered body rejected', !logic.verifyStripeSignature(body + 'x', `t=${t},v1=${sig}`, now));
check('stripe: replay older than 5 minutes rejected', !logic.verifyStripeSignature(body, `t=${t},v1=${sig}`, now + 6 * 60_000));
check('stripe: wrong secret rejected', !logic.verifyStripeSignature(body, `t=${t},v1=${'0'.repeat(64)}`, now));
delete process.env.RAZORPAY_KEY_ID;
delete process.env.STRIPE_SECRET_KEY;
check('no provider configured → online payment unavailable', providerFor('INR') === null && providerFor('USD') === null);

console.log(`\n${passes} passed, ${failures} failed`);
process.exit(failures ? 1 : 0);
