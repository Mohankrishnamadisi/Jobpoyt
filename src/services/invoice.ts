import { jsPDF } from 'jspdf';
import { supabase } from './supabase';
import { siteConfig } from '@config/site';

type AnyRecord = Record<string, any>;

export type InvoiceParty = {
  name: string;
  lines: string[];
};

export type SubscriptionInvoice = {
  invoiceNumber: string;
  invoiceDate: string;
  provisional: boolean;
  audience: 'candidate' | 'recruiter';
  seller: InvoiceParty;
  billTo: InvoiceParty;
  planName: string;
  planCode: string;
  durationLabel: string;
  periodStart: string | null;
  periodEnd: string | null;
  status: string;
  autoRenew: boolean;
  taxableAmount: number;
  gstPercent: number;
  gstAmount: number;
  totalAmount: number;
  currency: string;
  payment: {
    method: string;
    transactionId: string;
    paidOn: string | null;
    status: string;
  };
  subscriptionId: string;
};

const CANDIDATE_GST_PERCENT = 18;
const RECRUITER_PLAN_KEYS = ['pro', 'enterprise', 'recruiter'];

const round2 = (value: number) => Math.round(value * 100) / 100;

const formatInr = (value: number) => `INR ${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatDateLong = (iso: string | null) => (iso
  ? new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  : '—');

const monthsBetween = (start: string | null, end: string | null): number | null => {
  if (!start || !end) return null;
  const from = new Date(start);
  const to = new Date(end);
  const months = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
  return months > 0 ? months : null;
};

const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

const twoDigits = (n: number) => (n < 20 ? ONES[n] : `${TENS[Math.floor(n / 10)]}${n % 10 ? ` ${ONES[n % 10]}` : ''}`);
const threeDigits = (n: number) => {
  const hundred = Math.floor(n / 100);
  const rest = n % 100;
  return [hundred ? `${ONES[hundred]} Hundred` : '', rest ? twoDigits(rest) : ''].filter(Boolean).join(' ');
};

// Indian numbering: crore, lakh, thousand.
export const amountInWords = (amount: number): string => {
  const rupees = Math.floor(amount);
  const paise = Math.round((amount - rupees) * 100);
  const parts: string[] = [];
  const crore = Math.floor(rupees / 10000000);
  const lakh = Math.floor((rupees % 10000000) / 100000);
  const thousand = Math.floor((rupees % 100000) / 1000);
  const rest = rupees % 1000;
  if (crore) parts.push(`${threeDigits(crore)} Crore`);
  if (lakh) parts.push(`${twoDigits(lakh)} Lakh`);
  if (thousand) parts.push(`${twoDigits(thousand)} Thousand`);
  if (rest) parts.push(threeDigits(rest));
  const rupeeWords = parts.length ? parts.join(' ') : 'Zero';
  return `Indian Rupees ${rupeeWords}${paise ? ` and ${twoDigits(paise)} Paise` : ''} Only`;
};

const isRecruiterPlan = (plan: string, role: string) =>
  role === 'recruiter' || RECRUITER_PLAN_KEYS.some((key) => plan.includes(key));

export const buildSubscriptionInvoice = async (userId: string, subscription: AnyRecord): Promise<SubscriptionInvoice> => {
  const [paymentRes, profileRes, issuedRes] = await Promise.all([
    supabase.from('payments').select('*').eq('subscription_id', subscription.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
    supabase.rpc('issue_subscription_invoice', { p_subscription_id: subscription.id }),
  ]);
  const payment = (paymentRes.data || null) as AnyRecord | null;
  const profile = (profileRes.data || {}) as AnyRecord;
  const issued = (issuedRes.error ? null : issuedRes.data) as AnyRecord | null;
  if (issuedRes.error) {
    console.warn('Sequential invoice number unavailable, issuing a provisional invoice:', issuedRes.error.message);
  }

  const planKey = String(subscription.plan || '').toLowerCase();
  const audience: SubscriptionInvoice['audience'] = isRecruiterPlan(planKey, String(profile.role || '').toLowerCase()) ? 'recruiter' : 'candidate';

  let recruiter: AnyRecord | null = null;
  if (audience === 'recruiter') {
    const { data } = await supabase.from('recruiters').select('*').eq('id', userId).maybeSingle();
    recruiter = data || null;
  }

  // payments.amount is stored in paise; subscriptions.amount is rupees.
  const totalAmount = round2(payment?.amount != null ? Number(payment.amount) / 100 : Number(subscription.amount || 0));
  const gstPercent = audience === 'candidate' ? CANDIDATE_GST_PERCENT : 0;
  const taxableAmount = round2(totalAmount / (1 + gstPercent / 100));
  const gstAmount = round2(totalAmount - taxableAmount);

  const months = monthsBetween(subscription.start_date, subscription.end_date);
  const durationLabel = months ? `${months} Month${months === 1 ? '' : 's'}` : 'Subscription';
  const planName = audience === 'recruiter' ? `${siteConfig.name} Recruiter Pro` : `${siteConfig.name} Candidate Premium`;

  const issuedOn = issued?.issued_at || payment?.created_at || subscription.start_date || subscription.created_at || new Date().toISOString();
  const issuedDate = new Date(issuedOn);
  const reference = String(payment?.id || subscription.id || '').replace(/-/g, '').slice(0, 8).toUpperCase();
  const invoiceNumber = issued?.invoice_number
    ? String(issued.invoice_number)
    : `PROV/${issuedDate.getFullYear()}${String(issuedDate.getMonth() + 1).padStart(2, '0')}/${reference}`;

  const billing = siteConfig.billing;
  const seller: InvoiceParty = {
    name: billing.legalName || siteConfig.name,
    lines: [
      billing.address,
      billing.gstin ? `GSTIN: ${billing.gstin}` : '',
      billing.pan ? `PAN: ${billing.pan}` : '',
      billing.email ? `Email: ${billing.email}` : '',
      billing.website,
    ].filter(Boolean),
  };

  const billTo: InvoiceParty = audience === 'recruiter'
    ? {
        name: recruiter?.company_name || profile.name || 'Recruiter',
        lines: [
          recruiter?.company_address || recruiter?.location || '',
          recruiter?.gst_number ? `GSTIN: ${recruiter.gst_number}` : '',
          recruiter?.cin_number ? `CIN: ${recruiter.cin_number}` : '',
          recruiter?.hr_name ? `Contact: ${recruiter.hr_name}` : (profile.name ? `Contact: ${profile.name}` : ''),
          recruiter?.hr_email || recruiter?.company_email || profile.email ? `Email: ${recruiter?.hr_email || recruiter?.company_email || profile.email}` : '',
          recruiter?.hr_phone || recruiter?.company_phone ? `Phone: ${recruiter?.hr_phone || recruiter?.company_phone}` : '',
        ].filter(Boolean),
      }
    : {
        name: profile.name || profile.full_name || 'Candidate',
        lines: [
          profile.location || '',
          profile.email ? `Email: ${profile.email}` : '',
          profile.phone ? `Phone: ${profile.phone}` : '',
        ].filter(Boolean),
      };

  return {
    invoiceNumber,
    invoiceDate: issuedOn,
    provisional: !issued?.invoice_number,
    audience,
    seller,
    billTo,
    planName,
    planCode: planKey || 'premium',
    durationLabel,
    periodStart: subscription.start_date || null,
    periodEnd: subscription.end_date || null,
    status: String(subscription.status || 'active'),
    autoRenew: Boolean(subscription.auto_renew),
    taxableAmount,
    gstPercent,
    gstAmount,
    totalAmount,
    currency: String(payment?.currency || 'INR'),
    payment: {
      method: payment?.method ? String(payment.method).replace(/^\w/, (c: string) => c.toUpperCase()) : 'Online',
      transactionId: String(payment?.transaction_id || subscription.payment_id || '—'),
      paidOn: payment?.created_at || subscription.start_date || null,
      status: String(payment?.status || 'completed'),
    },
    subscriptionId: String(subscription.id || ''),
  };
};

const loadImageDataUrl = async (src: string): Promise<string | null> => {
  try {
    const response = await fetch(src);
    if (!response.ok) return null;
    const blob = await response.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
};

const NAVY: [number, number, number] = [11, 37, 72];
const BLUE: [number, number, number] = [37, 99, 235];
const MUTED: [number, number, number] = [100, 116, 139];
const TEXT: [number, number, number] = [15, 23, 42];
const BORDER: [number, number, number] = [226, 232, 240];
const SOFT: [number, number, number] = [248, 250, 252];
const GREEN: [number, number, number] = [22, 163, 74];

export const createInvoicePdf = async (invoice: SubscriptionInvoice): Promise<jsPDF> => {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 16;
  const right = pageWidth - margin;
  const contentWidth = right - margin;

  doc.setFillColor(...NAVY);
  doc.rect(0, 0, pageWidth, 6, 'F');
  doc.setFillColor(...BLUE);
  doc.rect(0, 6, pageWidth, 1.2, 'F');

  const logo = await loadImageDataUrl('/Jobpoyt.png');
  if (logo) {
    doc.addImage(logo, 'PNG', margin, 13, 42, 14, undefined, 'FAST');
  } else {
    doc.setFont('helvetica', 'bold').setFontSize(20).setTextColor(...NAVY).text(siteConfig.name, margin, 23);
  }

  doc.setFont('helvetica', 'bold').setFontSize(invoice.provisional ? 16 : 20).setTextColor(...NAVY);
  const title = invoice.gstPercent > 0 ? 'TAX INVOICE' : 'INVOICE';
  doc.text(invoice.provisional ? `PROVISIONAL ${title}` : title, right, 20, { align: 'right' });
  doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(...MUTED);
  doc.text('Original for Recipient', right, 25.5, { align: 'right' });

  if (invoice.payment.status.toLowerCase() === 'completed') {
    const stampX = pageWidth / 2 + 6;
    doc.setDrawColor(...GREEN).setLineWidth(0.8).roundedRect(stampX, 13, 28, 12, 2, 2, 'S');
    doc.setFont('helvetica', 'bold').setFontSize(13).setTextColor(...GREEN).text('PAID', stampX + 14, 21.2, { align: 'center' });
    doc.setLineWidth(0.2);
  }

  // Invoice meta strip
  let y = 34;
  doc.setFillColor(...SOFT).setDrawColor(...BORDER).roundedRect(margin, y, contentWidth, 16, 2, 2, 'FD');
  const meta = [
    ['Invoice No.', invoice.invoiceNumber],
    ['Invoice Date', formatDateLong(invoice.invoiceDate)],
    ['Subscription ID', invoice.subscriptionId.slice(0, 18) || '—'],
    ['Payment Status', invoice.payment.status.toUpperCase()],
  ];
  const metaWidths = [0.36, 0.2, 0.26, 0.18];
  let metaX = margin + 4;
  meta.forEach(([label, value], index) => {
    const width = contentWidth * metaWidths[index];
    doc.setFont('helvetica', 'normal').setFontSize(7.5).setTextColor(...MUTED).text(label.toUpperCase(), metaX, y + 6);
    doc.setFont('helvetica', 'bold').setFontSize(8.5).setTextColor(...TEXT).text(String(value), metaX, y + 11.5);
    metaX += width;
  });
  const colWidth = contentWidth / 4;

  // Seller and bill-to
  y += 24;
  const half = contentWidth / 2;
  const drawParty = (title: string, party: InvoiceParty, x: number) => {
    doc.setFont('helvetica', 'bold').setFontSize(8).setTextColor(...BLUE).text(title, x, y);
    doc.setFont('helvetica', 'bold').setFontSize(11).setTextColor(...TEXT).text(party.name, x, y + 6, { maxWidth: half - 8 });
    doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(...MUTED);
    let lineY = y + 11.5;
    party.lines.forEach((line) => {
      const wrapped = doc.splitTextToSize(line, half - 8) as string[];
      doc.text(wrapped, x, lineY);
      lineY += wrapped.length * 4.4;
    });
    return lineY;
  };
  const sellerEnd = drawParty('BILLED BY', invoice.seller, margin);
  const buyerEnd = drawParty('BILLED TO', invoice.billTo, margin + half + 4);
  y = Math.max(sellerEnd, buyerEnd) + 6;

  // Subscription summary
  doc.setDrawColor(...BORDER).line(margin, y, right, y);
  y += 7;
  doc.setFont('helvetica', 'bold').setFontSize(8).setTextColor(...BLUE).text('SUBSCRIPTION DETAILS', margin, y);
  y += 5;
  const details = [
    ['Plan', `${invoice.planName} (${invoice.durationLabel})`],
    ['Account type', invoice.audience === 'recruiter' ? 'Recruiter / Employer' : 'Job Seeker'],
    ['Service period', `${formatDateLong(invoice.periodStart)}  to  ${formatDateLong(invoice.periodEnd)}`],
    ['Subscription status', `${invoice.status.charAt(0).toUpperCase()}${invoice.status.slice(1)}`],
    ['Auto-renewal', invoice.autoRenew ? 'Enabled' : 'Disabled'],
  ];
  details.forEach(([label, value], index) => {
    const x = margin + (index % 2) * half;
    const rowY = y + Math.floor(index / 2) * 10;
    doc.setFont('helvetica', 'normal').setFontSize(7.5).setTextColor(...MUTED).text(label.toUpperCase(), x, rowY);
    doc.setFont('helvetica', 'bold').setFontSize(9.5).setTextColor(...TEXT).text(value, x, rowY + 4.8, { maxWidth: half - 6 });
  });
  y += Math.ceil(details.length / 2) * 10 + 4;

  // Line items table
  const cols = [
    { label: '#', x: margin + 3, align: 'left' as const },
    { label: 'DESCRIPTION', x: margin + 11, align: 'left' as const },
    { label: 'SAC', x: margin + 104, align: 'left' as const },
    { label: 'QTY', x: margin + 124, align: 'right' as const },
    { label: 'AMOUNT', x: right - 3, align: 'right' as const },
  ];
  doc.setFillColor(...NAVY).rect(margin, y, contentWidth, 9, 'F');
  doc.setFont('helvetica', 'bold').setFontSize(8).setTextColor(255, 255, 255);
  cols.forEach((col) => doc.text(col.label, col.x, y + 6, { align: col.align }));
  y += 9;

  doc.setFillColor(255, 255, 255).setDrawColor(...BORDER).rect(margin, y, contentWidth, 16, 'S');
  doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(...TEXT);
  doc.text('1', cols[0].x, y + 6.5);
  doc.setFont('helvetica', 'bold').text(`${invoice.planName} - ${invoice.durationLabel}`, cols[1].x, y + 6.5);
  doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(...MUTED);
  doc.text(`Access period ${formatDateLong(invoice.periodStart)} - ${formatDateLong(invoice.periodEnd)}`, cols[1].x, y + 11.5);
  doc.setFontSize(9).setTextColor(...TEXT);
  doc.text('998439', cols[2].x, y + 6.5);
  doc.text('1', cols[3].x, y + 6.5, { align: 'right' });
  doc.text(formatInr(invoice.taxableAmount), cols[4].x, y + 6.5, { align: 'right' });
  y += 16;

  // Totals
  y += 6;
  const labelX = right - 70;
  const totals: Array<[string, string]> = [['Taxable value', formatInr(invoice.taxableAmount)]];
  totals.push(invoice.gstPercent > 0
    ? [`GST @ ${invoice.gstPercent}%`, formatInr(invoice.gstAmount)]
    : ['GST', 'Not applicable']);
  totals.forEach(([label, value]) => {
    doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(...MUTED).text(label, labelX, y);
    doc.setTextColor(...TEXT).text(value, right - 3, y, { align: 'right' });
    y += 6;
  });
  doc.setFillColor(...BLUE).roundedRect(labelX - 4, y - 2, right - labelX + 4, 11, 1.5, 1.5, 'F');
  doc.setFont('helvetica', 'bold').setFontSize(10.5).setTextColor(255, 255, 255);
  doc.text('Total Paid', labelX, y + 5.3);
  doc.text(formatInr(invoice.totalAmount), right - 3, y + 5.3, { align: 'right' });

  doc.setFont('helvetica', 'normal').setFontSize(7.5).setTextColor(...MUTED).text('AMOUNT IN WORDS', margin, y - 6);
  doc.setFont('helvetica', 'bold').setFontSize(9).setTextColor(...TEXT);
  doc.text(doc.splitTextToSize(amountInWords(invoice.totalAmount), labelX - margin - 10) as string[], margin, y - 1);
  y += 20;

  // Payment details
  doc.setFillColor(...SOFT).setDrawColor(...BORDER).roundedRect(margin, y, contentWidth, 22, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold').setFontSize(8).setTextColor(...BLUE).text('PAYMENT DETAILS', margin + 4, y + 6);
  const paymentMeta = [
    ['Method', invoice.payment.method],
    ['Transaction ID', invoice.payment.transactionId],
    ['Paid on', formatDateLong(invoice.payment.paidOn)],
    ['Currency', invoice.currency],
  ];
  paymentMeta.forEach(([label, value], index) => {
    const x = margin + 4 + index * colWidth;
    doc.setFont('helvetica', 'normal').setFontSize(7.5).setTextColor(...MUTED).text(label.toUpperCase(), x, y + 12);
    doc.setFont('helvetica', 'bold').setFontSize(8.5).setTextColor(...TEXT).text(value, x, y + 17, { maxWidth: colWidth - 6 });
  });
  y += 30;

  // Notes
  doc.setFont('helvetica', 'bold').setFontSize(8).setTextColor(...BLUE).text('NOTES', margin, y);
  doc.setFont('helvetica', 'normal').setFontSize(8.5).setTextColor(...MUTED);
  const notes = [
    'This invoice is issued for a prepaid digital subscription. The amount has been received in full.',
    invoice.gstPercent > 0 ? `Prices are inclusive of GST @ ${invoice.gstPercent}%.` : 'No GST has been charged on this subscription.',
    `For billing questions contact ${siteConfig.billing.email || 'support'} and quote invoice ${invoice.invoiceNumber}.`,
  ];
  notes.forEach((note, index) => doc.text(`${index + 1}. ${note}`, margin, y + 5.5 + index * 5, { maxWidth: contentWidth }));

  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setDrawColor(...BORDER).line(margin, pageHeight - 22, right, pageHeight - 22);
  doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(...MUTED);
  doc.text('This is a computer-generated invoice and does not require a physical signature.', pageWidth / 2, pageHeight - 16, { align: 'center' });
  doc.text(`${siteConfig.name} · ${siteConfig.billing.website || siteConfig.url}`, pageWidth / 2, pageHeight - 11.5, { align: 'center' });
  doc.setFillColor(...NAVY).rect(0, pageHeight - 4, pageWidth, 4, 'F');

  doc.setProperties({ title: `Invoice ${invoice.invoiceNumber}`, subject: invoice.planName, author: siteConfig.name, creator: siteConfig.name });
  return doc;
};

export const invoiceFileName = (invoice: SubscriptionInvoice) => `${siteConfig.name}-Invoice-${invoice.invoiceNumber.replace(/\//g, '-')}.pdf`;
