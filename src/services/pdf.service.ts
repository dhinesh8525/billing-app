/**
 * PDF Service
 *
 * Generates PDF invoices using HTML template.
 * Returns HTML that can be converted to PDF on the client side.
 */

import { prisma } from "@/lib/db"

interface InvoiceData {
  invoice: {
    id: string
    invoiceNumber: string
    type: string
    status: string
    invoiceDate: Date
    dueDate: Date | null
    customerName: string | null
    customerPhone: string | null
    customerEmail: string | null
    subtotal: number
    cgst: number
    sgst: number
    igst: number
    taxAmount: number
    discountPercent: number
    discountAmount: number
    roundOff: number
    total: number
    amountPaid: number
    paymentStatus: string
    paymentMode: string | null
    notes: string | null
    termsConditions: string | null
  }
  items: {
    productName: string
    productSku: string
    hsn: string | null
    unit: string
    unitPrice: number
    quantity: number
    taxRate: number
    taxAmount: number
    discount: number
    lineTotal: number
  }[]
  party: {
    name: string
    phone: string | null
    email: string | null
    gstin: string | null
    billingAddress: string | null
  } | null
  business: {
    name: string
    email: string | null
    phone: string | null
    gstin: string | null
    address: string | null
    city: string | null
    state: string | null
    pincode: string | null
    logo: string | null
  }
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount)
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

function numberToWords(num: number): string {
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"]
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"]
  const teens = ["Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"]

  if (num === 0) return "Zero"

  const convertLessThanThousand = (n: number): string => {
    if (n === 0) return ""
    if (n < 10) return ones[n]
    if (n < 20) return teens[n - 10]
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "")
    return ones[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " " + convertLessThanThousand(n % 100) : "")
  }

  const convert = (n: number): string => {
    if (n < 1000) return convertLessThanThousand(n)
    if (n < 100000) return convertLessThanThousand(Math.floor(n / 1000)) + " Thousand" + (n % 1000 ? " " + convertLessThanThousand(n % 1000) : "")
    if (n < 10000000) return convertLessThanThousand(Math.floor(n / 100000)) + " Lakh" + (n % 100000 ? " " + convert(n % 100000) : "")
    return convertLessThanThousand(Math.floor(n / 10000000)) + " Crore" + (n % 10000000 ? " " + convert(n % 10000000) : "")
  }

  const rupees = Math.floor(num)
  const paise = Math.round((num - rupees) * 100)

  let result = convert(rupees) + " Rupees"
  if (paise > 0) {
    result += " and " + convert(paise) + " Paise"
  }
  return result + " Only"
}

export class PDFService {
  /**
   * Get invoice data for PDF generation
   */
  static async getInvoiceData(tenantId: string, invoiceId: string): Promise<InvoiceData | null> {
    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, tenantId },
      include: {
        items: true,
        party: true,
      },
    })

    if (!invoice) return null

    // Get business details from tenant
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    })

    if (!tenant) return null

    return {
      invoice: {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        type: invoice.type,
        status: invoice.status,
        invoiceDate: invoice.invoiceDate,
        dueDate: invoice.dueDate,
        customerName: invoice.customerName,
        customerPhone: invoice.customerPhone,
        customerEmail: invoice.customerEmail,
        subtotal: Number(invoice.subtotal),
        cgst: Number(invoice.cgst),
        sgst: Number(invoice.sgst),
        igst: Number(invoice.igst),
        taxAmount: Number(invoice.taxAmount),
        discountPercent: Number(invoice.discountPercent),
        discountAmount: Number(invoice.discountAmount),
        roundOff: Number(invoice.roundOff),
        total: Number(invoice.total),
        amountPaid: Number(invoice.amountPaid),
        paymentStatus: invoice.paymentStatus,
        paymentMode: invoice.paymentMode,
        notes: invoice.notes,
        termsConditions: invoice.termsConditions,
      },
      items: invoice.items.map((item) => ({
        productName: item.productName,
        productSku: item.productSku,
        hsn: item.hsn,
        unit: item.unit,
        unitPrice: Number(item.unitPrice),
        quantity: item.quantity,
        taxRate: Number(item.taxRate),
        taxAmount: Number(item.taxAmount),
        discount: Number(item.discount),
        lineTotal: Number(item.lineTotal),
      })),
      party: invoice.party
        ? {
            name: invoice.party.name,
            phone: invoice.party.phone,
            email: invoice.party.email,
            gstin: invoice.party.gstin,
            billingAddress: invoice.party.billingAddress,
          }
        : null,
      business: {
        name: tenant.name,
        email: tenant.email,
        phone: tenant.phone,
        gstin: tenant.gstin,
        address: tenant.address,
        city: tenant.city,
        state: tenant.state,
        pincode: tenant.pincode,
        logo: tenant.logo,
      },
    }
  }

  /**
   * Generate invoice HTML for PDF conversion
   */
  static generateInvoiceHTML(data: InvoiceData): string {
    const { invoice, items, party, business } = data

    const customerName = party?.name || invoice.customerName || "Walk-in Customer"
    const customerPhone = party?.phone || invoice.customerPhone || ""
    const customerEmail = party?.email || invoice.customerEmail || ""
    const customerGstin = party?.gstin || ""
    const customerAddress = party?.billingAddress || ""

    const businessAddress = [business.address, business.city, business.state, business.pincode]
      .filter(Boolean)
      .join(", ")

    const invoiceTitle = invoice.type === "SALE" ? "Tax Invoice" :
                         invoice.type === "PURCHASE" ? "Purchase Invoice" : "Invoice"

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${invoice.invoiceNumber}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      font-size: 12px;
      line-height: 1.4;
      color: #333;
      background: white;
    }
    .invoice {
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      display: flex;
      justify-content: space-between;
      border-bottom: 2px solid #2563eb;
      padding-bottom: 15px;
      margin-bottom: 20px;
    }
    .company-info h1 {
      font-size: 24px;
      color: #1e40af;
      margin-bottom: 5px;
    }
    .company-info p {
      color: #666;
      font-size: 11px;
    }
    .invoice-title {
      text-align: right;
    }
    .invoice-title h2 {
      font-size: 28px;
      color: #1e40af;
      text-transform: uppercase;
    }
    .invoice-title .invoice-number {
      font-size: 14px;
      color: #666;
      margin-top: 5px;
    }
    .details-section {
      display: flex;
      justify-content: space-between;
      margin-bottom: 20px;
    }
    .details-box {
      width: 48%;
    }
    .details-box h3 {
      font-size: 11px;
      text-transform: uppercase;
      color: #666;
      border-bottom: 1px solid #ddd;
      padding-bottom: 5px;
      margin-bottom: 8px;
    }
    .details-box p {
      margin-bottom: 3px;
    }
    .details-box .name {
      font-weight: bold;
      font-size: 14px;
    }
    .invoice-meta {
      text-align: right;
    }
    .invoice-meta table {
      margin-left: auto;
    }
    .invoice-meta td {
      padding: 3px 8px;
    }
    .invoice-meta td:first-child {
      color: #666;
      text-align: right;
    }
    .invoice-meta td:last-child {
      font-weight: bold;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    .items-table th {
      background: #1e40af;
      color: white;
      padding: 10px 8px;
      text-align: left;
      font-size: 11px;
      text-transform: uppercase;
    }
    .items-table th.right,
    .items-table td.right {
      text-align: right;
    }
    .items-table td {
      padding: 10px 8px;
      border-bottom: 1px solid #eee;
    }
    .items-table tr:nth-child(even) {
      background: #f9fafb;
    }
    .items-table .product-name {
      font-weight: 500;
    }
    .items-table .product-sku {
      font-size: 10px;
      color: #666;
    }
    .summary-section {
      display: flex;
      justify-content: space-between;
    }
    .amount-words {
      width: 55%;
      padding: 15px;
      background: #f1f5f9;
      border-radius: 5px;
    }
    .amount-words h4 {
      font-size: 10px;
      color: #666;
      text-transform: uppercase;
      margin-bottom: 5px;
    }
    .amount-words p {
      font-style: italic;
    }
    .totals {
      width: 40%;
    }
    .totals table {
      width: 100%;
    }
    .totals td {
      padding: 6px 10px;
    }
    .totals td:first-child {
      color: #666;
    }
    .totals td:last-child {
      text-align: right;
      font-weight: 500;
    }
    .totals .grand-total {
      background: #1e40af;
      color: white;
    }
    .totals .grand-total td {
      color: white;
      font-size: 14px;
      font-weight: bold;
      padding: 10px;
    }
    .footer {
      margin-top: 30px;
      padding-top: 15px;
      border-top: 1px solid #ddd;
    }
    .footer-content {
      display: flex;
      justify-content: space-between;
    }
    .notes {
      width: 60%;
    }
    .notes h4 {
      font-size: 11px;
      color: #666;
      text-transform: uppercase;
      margin-bottom: 5px;
    }
    .notes p {
      font-size: 11px;
      color: #666;
    }
    .signature {
      width: 35%;
      text-align: right;
    }
    .signature-line {
      border-top: 1px solid #333;
      margin-top: 40px;
      padding-top: 5px;
      font-size: 11px;
    }
    .status-badge {
      display: inline-block;
      padding: 3px 10px;
      border-radius: 20px;
      font-size: 10px;
      font-weight: bold;
      text-transform: uppercase;
    }
    .status-paid { background: #dcfce7; color: #166534; }
    .status-unpaid { background: #fee2e2; color: #991b1b; }
    .status-partial { background: #fef3c7; color: #92400e; }
    @media print {
      body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
      .invoice { padding: 0; }
    }
  </style>
</head>
<body>
  <div class="invoice">
    <div class="header">
      <div class="company-info">
        <h1>${business.name}</h1>
        ${businessAddress ? `<p>${businessAddress}</p>` : ""}
        ${business.phone ? `<p>Phone: ${business.phone}</p>` : ""}
        ${business.email ? `<p>Email: ${business.email}</p>` : ""}
        ${business.gstin ? `<p>GSTIN: ${business.gstin}</p>` : ""}
      </div>
      <div class="invoice-title">
        <h2>${invoiceTitle}</h2>
        <div class="invoice-number">#${invoice.invoiceNumber}</div>
      </div>
    </div>

    <div class="details-section">
      <div class="details-box">
        <h3>Bill To</h3>
        <p class="name">${customerName}</p>
        ${customerAddress ? `<p>${customerAddress}</p>` : ""}
        ${customerPhone ? `<p>Phone: ${customerPhone}</p>` : ""}
        ${customerEmail ? `<p>Email: ${customerEmail}</p>` : ""}
        ${customerGstin ? `<p>GSTIN: ${customerGstin}</p>` : ""}
      </div>
      <div class="details-box invoice-meta">
        <table>
          <tr>
            <td>Invoice Date:</td>
            <td>${formatDate(invoice.invoiceDate)}</td>
          </tr>
          ${invoice.dueDate ? `
          <tr>
            <td>Due Date:</td>
            <td>${formatDate(invoice.dueDate)}</td>
          </tr>
          ` : ""}
          <tr>
            <td>Payment Status:</td>
            <td>
              <span class="status-badge status-${invoice.paymentStatus}">
                ${invoice.paymentStatus}
              </span>
            </td>
          </tr>
        </table>
      </div>
    </div>

    <table class="items-table">
      <thead>
        <tr>
          <th style="width: 5%">#</th>
          <th style="width: 35%">Item</th>
          <th style="width: 10%">HSN</th>
          <th class="right" style="width: 10%">Qty</th>
          <th class="right" style="width: 12%">Rate</th>
          <th class="right" style="width: 10%">Tax</th>
          <th class="right" style="width: 18%">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${items.map((item, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>
            <div class="product-name">${item.productName}</div>
            <div class="product-sku">${item.productSku}</div>
          </td>
          <td>${item.hsn || "-"}</td>
          <td class="right">${item.quantity} ${item.unit}</td>
          <td class="right">${formatCurrency(item.unitPrice)}</td>
          <td class="right">${item.taxRate}%</td>
          <td class="right">${formatCurrency(item.lineTotal)}</td>
        </tr>
        `).join("")}
      </tbody>
    </table>

    <div class="summary-section">
      <div class="amount-words">
        <h4>Amount in Words</h4>
        <p>${numberToWords(invoice.total)}</p>
      </div>
      <div class="totals">
        <table>
          <tr>
            <td>Subtotal</td>
            <td>${formatCurrency(invoice.subtotal)}</td>
          </tr>
          ${invoice.cgst > 0 ? `
          <tr>
            <td>CGST</td>
            <td>${formatCurrency(invoice.cgst)}</td>
          </tr>
          ` : ""}
          ${invoice.sgst > 0 ? `
          <tr>
            <td>SGST</td>
            <td>${formatCurrency(invoice.sgst)}</td>
          </tr>
          ` : ""}
          ${invoice.igst > 0 ? `
          <tr>
            <td>IGST</td>
            <td>${formatCurrency(invoice.igst)}</td>
          </tr>
          ` : ""}
          ${invoice.discountAmount > 0 ? `
          <tr>
            <td>Discount${invoice.discountPercent > 0 ? ` (${invoice.discountPercent}%)` : ""}</td>
            <td>-${formatCurrency(invoice.discountAmount)}</td>
          </tr>
          ` : ""}
          ${invoice.roundOff !== 0 ? `
          <tr>
            <td>Round Off</td>
            <td>${invoice.roundOff > 0 ? "+" : ""}${formatCurrency(invoice.roundOff)}</td>
          </tr>
          ` : ""}
          <tr class="grand-total">
            <td>Total</td>
            <td>${formatCurrency(invoice.total)}</td>
          </tr>
          ${invoice.amountPaid > 0 && invoice.amountPaid < invoice.total ? `
          <tr>
            <td>Amount Paid</td>
            <td>${formatCurrency(invoice.amountPaid)}</td>
          </tr>
          <tr>
            <td>Balance Due</td>
            <td>${formatCurrency(invoice.total - invoice.amountPaid)}</td>
          </tr>
          ` : ""}
        </table>
      </div>
    </div>

    <div class="footer">
      <div class="footer-content">
        <div class="notes">
          ${invoice.notes ? `
          <h4>Notes</h4>
          <p>${invoice.notes}</p>
          ` : ""}
          ${invoice.termsConditions ? `
          <h4 style="margin-top: 10px;">Terms & Conditions</h4>
          <p>${invoice.termsConditions}</p>
          ` : ""}
        </div>
        <div class="signature">
          <div class="signature-line">
            Authorized Signature
          </div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>
`
  }
}
