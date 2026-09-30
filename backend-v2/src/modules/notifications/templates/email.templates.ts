import type {
  NotificationEvent,
  OrderPlacedPayload,
  OrderStatusChangedPayload,
  QuotationRequestedPayload,
  QuotationRespondedPayload,
  AdminPasswordResetPayload,
  CustomerWelcomePayload,
  OutgoingEmailMessage,
} from '../types.js'

const FRONTEND_URL = process.env.FRONTEND_URL || 'https://abdullahbakheetksa.com'
const LOGO_URL = 'https://abdullahbakheetksa.com/images/logo.png'

function baseEmailWrapper(title: string, categoryTag: string, bodyContent: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: #f4f4f5;
      margin: 0;
      padding: 32px 16px;
      color: #18181b;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      max-width: 600px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      border: 1px solid #e4e4e7;
      box-shadow: 0 4px 16px -2px rgba(0, 0, 0, 0.05);
    }
    .brand-header {
      background-color: #000000;
      padding: 22px 28px;
      border-bottom: 2px solid #fbdc3c;
    }
    .brand-table {
      width: 100%;
      border-collapse: collapse;
    }
    .brand-logo {
      height: 44px;
      width: 44px;
      display: block;
      border: 0;
      outline: none;
    }
    .content-body {
      padding: 36px 32px;
    }
    .tag-badge {
      display: inline-block;
      background-color: #fbdc3c;
      color: #000000;
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      padding: 4px 10px;
      border-radius: 4px;
      margin-bottom: 16px;
    }
    .main-title {
      margin: 0 0 16px 0;
      font-size: 22px;
      font-weight: 700;
      color: #09090b;
      letter-spacing: -0.02em;
      line-height: 1.25;
    }
    .lead-text {
      color: #52525b;
      font-size: 14px;
      line-height: 1.6;
      margin: 0 0 24px 0;
    }
    .card-box {
      background-color: #fafafa;
      border: 1px solid #f4f4f5;
      border-radius: 8px;
      padding: 20px;
      margin: 24px 0;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #f4f4f5;
      font-size: 13px;
    }
    .info-row:last-child {
      border-bottom: none;
      padding-bottom: 0;
    }
    .info-label {
      color: #71717a;
    }
    .info-value {
      font-weight: 600;
      color: #09090b;
    }
    .btn-primary {
      display: inline-block;
      background-color: #000000;
      color: #ffffff !important;
      text-decoration: none;
      padding: 13px 28px;
      border-radius: 6px;
      font-weight: 600;
      font-size: 13px;
      letter-spacing: 0.03em;
      text-transform: uppercase;
      margin-top: 12px;
    }
    .brand-footer {
      background-color: #fafafa;
      padding: 28px 32px;
      text-align: center;
      border-top: 1px solid #f4f4f5;
      font-size: 12px;
      color: #71717a;
      line-height: 1.6;
    }
    .footer-title {
      font-weight: 700;
      color: #18181b;
      font-size: 12px;
      margin: 0 0 4px 0;
    }
    .footer-sub {
      margin: 0 0 12px 0;
      color: #71717a;
    }
    .footer-note {
      font-size: 11px;
      color: #a1a1aa;
      margin: 0;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <!-- Header with Transparent Official Logo & Brand Accent -->
    <div class="brand-header">
      <a href="${FRONTEND_URL}" target="_blank" style="text-decoration: none; display: inline-block;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="vertical-align: middle; padding-right: 12px;">
              <img src="${LOGO_URL}" alt="Abdullah Bakheet Logo" width="44" height="44" class="brand-logo" />
            </td>
            <td style="vertical-align: middle;">
              <span style="font-size: 15px; font-weight: 700; color: #ffffff; letter-spacing: 0.03em; text-transform: uppercase; display: block; line-height: 1.2;">
                Abdullah Bakheet
              </span>
              <span style="font-size: 10px; font-weight: 500; color: #a1a1aa; letter-spacing: 0.06em; text-transform: uppercase; display: block;">
                Trading Co. | مؤسسة عبدالله بخيت
              </span>
            </td>
          </tr>
        </table>
      </a>
    </div>

    <!-- Main Content Area -->
    <div class="content-body">
      ${categoryTag ? `<div class="tag-badge">${categoryTag}</div>` : ''}
      ${bodyContent}
    </div>

    <!-- Official Corporate Footer -->
    <div class="brand-footer">
      <p class="footer-title">مؤسسة عبدالله بخيت التجارية | Abdullah Bakheet Trading Co.</p>
      <p class="footer-sub">Commercial Registration: 1010055373 • Riyadh, Kingdom of Saudi Arabia</p>
      <p class="footer-note">This is an automated transactional message from <a href="${FRONTEND_URL}" style="color:#71717a;text-decoration:underline;">abdullahbakheetksa.com</a>.</p>
    </div>
  </div>
</body>
</html>`
}

export function renderEmailTemplate(event: NotificationEvent, payload: any): OutgoingEmailMessage | null {
  switch (event) {
    case 'ORDER_PLACED': {
      const p = payload as OrderPlacedPayload
      const isCorporate = !!p.isCorporate || !!p.companyName
      const subject = isCorporate
        ? `Corporate Order Confirmation #${p.orderNumber} - Abdullah Bakheet Wholesale`
        : `Order Confirmation #${p.orderNumber} - Abdullah Bakheet`
      const categoryTag = isCorporate ? 'CORPORATE WHOLESALE ORDER' : 'ORDER CONFIRMATION'

      const itemsHtml = (p.items || [])
        .map(
          (item) => `
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #f4f4f5; font-size: 13px; color: #09090b;">
                <strong>${item.name || 'Product'}</strong> ${item.sku ? `<br><span style="color:#a1a1aa;font-size:11px;font-family:monospace;">SKU: ${item.sku}</span>` : ''}
              </td>
              <td style="padding: 10px 0; border-bottom: 1px solid #f4f4f5; text-align: center; font-size: 13px; color: #71717a;">
                ×${item.quantity || 1}
              </td>
              <td style="padding: 10px 0; border-bottom: 1px solid #f4f4f5; text-align: right; font-size: 13px; font-weight: 600; color: #09090b;">
                ${p.currency || 'SAR'} ${Number(item.totalPrice || (Number(item.unitPrice || 0) * Number(item.quantity || 1)) || 0).toFixed(2)}
              </td>
            </tr>
          `
        )
        .join('')

      const html = baseEmailWrapper(
        subject,
        categoryTag,
        `
          <h1 class="main-title">Thank you for your order, ${p.customerName || 'Valued Customer'}!</h1>
          <p class="lead-text">
            We have received order <strong>#${p.orderNumber}</strong>${p.companyName ? ` placed on behalf of <strong>${p.companyName}</strong>` : ''}. Our fulfillment team is preparing your shipment.
          </p>

          ${isCorporate ? `
          <div style="background-color: #fafafa; border: 1px solid #f4f4f5; border-radius: 8px; padding: 12px 16px; margin-bottom: 20px;">
            <table style="width: 100%; font-size: 12px; border-collapse: collapse;">
              ${p.companyName ? `<tr><td style="color:#71717a;padding:3px 0;">Corporate Account:</td><td style="text-align:right;font-weight:600;">${p.companyName}</td></tr>` : ''}
              ${p.poNumber ? `<tr><td style="color:#71717a;padding:3px 0;">Purchase Order (PO):</td><td style="text-align:right;font-weight:600;font-family:monospace;">${p.poNumber}</td></tr>` : ''}
              ${p.vatNumber ? `<tr><td style="color:#71717a;padding:3px 0;">Buyer VAT ID:</td><td style="text-align:right;font-weight:600;font-family:monospace;">${p.vatNumber}</td></tr>` : ''}
              ${p.paymentMethod ? `<tr><td style="color:#71717a;padding:3px 0;">Payment Method:</td><td style="text-align:right;font-weight:600;text-transform:uppercase;">${String(p.paymentMethod).replace(/_/g, ' ')}</td></tr>` : ''}
            </table>
          </div>
          ` : ''}

          <div class="card-box">
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="text-align: left; color: #a1a1aa; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em;">
                  <th style="padding-bottom: 10px;">Item Description</th>
                  <th style="padding-bottom: 10px; text-align: center;">Qty</th>
                  <th style="padding-bottom: 10px; text-align: right;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>

            <div style="margin-top: 16px; border-top: 1px solid #e4e4e7; padding-top: 12px;">
              <table style="width: 100%; font-size: 13px;">
                ${p.subtotal !== undefined && p.subtotal !== null ? `<tr><td style="color:#71717a;padding:3px 0;">Subtotal:</td><td style="text-align:right;font-weight:500;">${p.currency || 'SAR'} ${Number(p.subtotal || 0).toFixed(2)}</td></tr>` : ''}
                ${p.shippingCost !== undefined && p.shippingCost !== null ? `<tr><td style="color:#71717a;padding:3px 0;">Shipping & Logistics:</td><td style="text-align:right;font-weight:500;">${p.currency || 'SAR'} ${Number(p.shippingCost || 0).toFixed(2)}</td></tr>` : ''}
                ${p.vatAmount !== undefined && p.vatAmount !== null ? `<tr><td style="color:#71717a;padding:3px 0;">VAT (15%):</td><td style="text-align:right;font-weight:500;">${p.currency || 'SAR'} ${Number(p.vatAmount || 0).toFixed(2)}</td></tr>` : ''}
                <tr>
                  <td style="font-weight: 700; font-size: 15px; padding-top: 8px; color: #09090b;">Order Total:</td>
                  <td style="font-weight: 800; font-size: 17px; color: #09090b; text-align: right; padding-top: 8px;">
                    ${p.currency || 'SAR'} ${Number(p.totalAmount || 0).toFixed(2)}
                  </td>
                </tr>
              </table>
            </div>
          </div>

          ${p.shippingAddress ? `
          <div style="background-color: #fafafa; border: 1px solid #f4f4f5; border-radius: 8px; padding: 14px 18px; margin-bottom: 24px;">
            <p style="margin: 0 0 4px 0; font-size: 11px; text-transform: uppercase; font-weight: 700; color: #71717a; letter-spacing: 0.05em;">Delivery Destination</p>
            <p style="margin: 0; font-size: 13px; color: #18181b; line-height: 1.5;">${p.shippingAddress}</p>
          </div>
          ` : ''}

          <div style="margin-top: 24px;">
            <a href="${p.trackingUrl || `${FRONTEND_URL}/orders`}" class="btn-primary">View Order Status →</a>
          </div>
        `
      )

      const text = `Thank you for your order, ${p.customerName}!\n\nOrder Number: ${p.orderNumber}\nTotal: ${p.currency} ${p.totalAmount}\nItems:\n${p.items.map((i) => `- ${i.name} (x${i.quantity}) - ${p.currency} ${i.totalPrice}`).join('\n')}`

      return {
        to: p.customerEmail || (p as any).email,
        toName: p.customerName,
        subject,
        html,
        text,
      }
    }

    case 'ORDER_STATUS_CHANGED': {
      const p = payload as OrderStatusChangedPayload
      const subject = `Update on Order #${p.orderNumber}: ${p.newStatus.toUpperCase()}`
      const html = baseEmailWrapper(
        subject,
        'ORDER STATUS UPDATE',
        `
          <h1 class="main-title">Status Update on Order #${p.orderNumber}</h1>
          <p class="lead-text">
            Hello ${p.customerName}, the status of your order has been updated:
          </p>

          <div class="card-box" style="text-align: center; padding: 24px;">
            <span style="display: inline-block; background-color: #000000; color: #fbdc3c; font-size: 14px; font-weight: 800; letter-spacing: 0.08em; padding: 8px 20px; border-radius: 6px; text-transform: uppercase;">
              ${p.newStatus.toUpperCase()}
            </span>
            ${p.trackingNumber ? `
              <p style="margin: 16px 0 0 0; font-size: 13px; color: #52525b;">
                Waybill / Tracking: <strong style="font-family: monospace; font-size: 14px; color: #09090b;">${p.trackingNumber}</strong>
              </p>
            ` : ''}
          </div>

          <div style="margin-top: 24px;">
            <a href="${p.trackingUrl || `${FRONTEND_URL}/orders`}" class="btn-primary">Track Shipment →</a>
          </div>
        `
      )
      const text = `Hello ${p.customerName},\nYour order #${p.orderNumber} status is now: ${p.newStatus.toUpperCase()}.\n${p.trackingNumber ? `Tracking: ${p.trackingNumber}` : ''}`
      return {
        to: p.customerEmail,
        toName: p.customerName,
        subject,
        html,
        text,
      }
    }

    case 'B2B_QUOTATION_REQUESTED': {
      const p = payload as QuotationRequestedPayload
      const subject = `Quotation Request Received: #${p.quoteNumber} - Abdullah Bakheet B2B`
      const html = baseEmailWrapper(
        subject,
        'B2B WHOLESALE RFQ',
        `
          <h1 class="main-title">Quotation Request #${p.quoteNumber} Received</h1>
          <p class="lead-text">
            Dear ${p.customerName}${p.companyName ? ` (${p.companyName})` : ''}, thank you for requesting commercial wholesale pricing.
          </p>

          <div class="card-box">
            <div style="display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; border-bottom: 1px solid #f4f4f5;">
              <span style="color:#71717a;">Quotation Number:</span>
              <span style="font-weight:700;color:#09090b;">${p.quoteNumber}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; border-bottom: 1px solid #f4f4f5;">
              <span style="color:#71717a;">Line Items:</span>
              <span style="font-weight:600;color:#09090b;">${p.itemsCount} item(s)</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px;">
              <span style="color:#71717a;">Review Status:</span>
              <span style="color:#b45309;font-weight:700;">Under Volume Review</span>
            </div>
          </div>

          <p class="lead-text" style="margin-bottom: 16px;">
            Our commercial pricing desk in Riyadh is calculating custom tiered B2B pricing based on your volume requirements. You will receive an email as soon as your quote is finalized.
          </p>
        `
      )
      const text = `Dear ${p.customerName},\nWe have received your quotation request #${p.quoteNumber}. Our team will review and respond shortly.`
      return {
        to: p.customerEmail,
        toName: p.customerName,
        subject,
        html,
        text,
      }
    }

    case 'B2B_QUOTATION_RESPONDED': {
      const p = payload as QuotationRespondedPayload
      const subject = `Your Custom Wholesale Quotation #${p.quoteNumber} is Ready`
      const html = baseEmailWrapper(
        subject,
        'CUSTOM B2B PRICING READY',
        `
          <h1 class="main-title">Wholesale Quotation #${p.quoteNumber} is Ready</h1>
          <p class="lead-text">
            Dear ${p.customerName}, custom volume pricing for your quotation has been prepared.
          </p>

          <div class="card-box" style="text-align: center; padding: 24px;">
            <p style="margin: 0; font-size: 12px; color: #71717a; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600;">
              Total Quoted Amount
            </p>
            <p style="margin: 6px 0 0 0; font-size: 26px; font-weight: 800; color: #09090b;">
              ${p.currency} ${Number(p.totalAmount).toFixed(2)}
            </p>
            ${p.validUntil ? `
              <p style="margin: 8px 0 0 0; font-size: 12px; color: #a1a1aa;">
                Quote Valid Until: ${new Date(p.validUntil).toLocaleDateString()}
              </p>
            ` : ''}
          </div>

          <div style="margin-top: 24px;">
            <a href="${p.paymentLink || `${FRONTEND_URL}/quotations`}" class="btn-primary">Review & Accept Quotation →</a>
          </div>
        `
      )
      const text = `Dear ${p.customerName},\nYour quotation #${p.quoteNumber} is ready. Total: ${p.currency} ${p.totalAmount}.\n${p.paymentLink ? `Review link: ${p.paymentLink}` : ''}`
      return {
        to: p.customerEmail,
        toName: p.customerName,
        subject,
        html,
        text,
      }
    }

    case 'ADMIN_PASSWORD_RESET': {
      const p = payload as AdminPasswordResetPayload
      const subject = `Reset Your Admin Password - Abdullah Bakheet`
      const html = baseEmailWrapper(
        subject,
        'SECURITY & CREDENTIALS',
        `
          <h1 class="main-title">Password Reset Request</h1>
          <p class="lead-text">
            Hello ${p.adminName || 'Administrator'}, a password reset was requested for your admin account (<strong>${p.email}</strong>).
          </p>

          <div class="card-box">
            <p style="margin: 0 0 6px 0; font-size: 13px; color: #52525b;">
              To choose a new secure password, click the button below. This single-use authorization link expires in <strong>${p.expiresInMinutes || 30} minutes</strong>.
            </p>
          </div>

          <div style="margin-top: 24px;">
            <a href="${p.resetUrl}" class="btn-primary">Reset Admin Password →</a>
          </div>

          <p style="font-size: 11px; color: #a1a1aa; margin-top: 28px; line-height: 1.5;">
            If you did not initiate this request, no action is required. Your account remains protected and this link will expire automatically.
          </p>
        `
      )
      const text = `Password Reset Request:\nPlease use the following link to reset your admin password: ${p.resetUrl} (Expires in ${p.expiresInMinutes || 30} minutes)`
      return {
        to: p.email,
        toName: p.adminName,
        subject,
        html,
        text,
      }
    }

    case 'CUSTOMER_WELCOME': {
      const p = payload as CustomerWelcomePayload
      const subject = `Welcome to Abdullah Bakheet Trading`
      const html = baseEmailWrapper(
        subject,
        'WELCOME TO ABDULLAH BAKHEET',
        `
          <h1 class="main-title">Welcome, ${p.customerName}!</h1>
          <p class="lead-text">
            Thank you for creating an account with Abdullah Bakheet Trading Co. ${p.companyName ? `for <strong>${p.companyName}</strong>.` : ''}
          </p>

          <div class="card-box">
            <p style="margin: 0 0 10px 0; font-size: 13px; font-weight: 700; color: #09090b;">What You Can Do Now:</p>
            <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #52525b; line-height: 1.8;">
              <li>Explore premium commercial hospitality & dining supplies</li>
              <li>Order online with door-to-door delivery across Saudi Arabia</li>
              <li>Request wholesale B2B tiered quotations for commercial orders</li>
            </ul>
          </div>

          <div style="margin-top: 24px;">
            <a href="${FRONTEND_URL}/products" class="btn-primary">Explore Catalog →</a>
          </div>
        `
      )
      const text = `Welcome to Abdullah Bakheet Trading, ${p.customerName}!`
      return {
        to: p.customerEmail || (p as any).email,
        toName: p.customerName,
        subject,
        html,
        text,
      }
    }

    case 'BUSINESS_REGISTRATION_SUBMITTED': {
      const p = payload as any
      const subject = `Corporate Application Received: ${p.companyName} - Abdullah Bakheet`
      const html = baseEmailWrapper(
        subject,
        'APPLICATION UNDER REVIEW',
        `
          <h1 class="main-title">Corporate Application Received</h1>
          <p class="lead-text">
            Dear ${p.contactPerson}, thank you for applying for a corporate wholesale account for <strong>${p.companyName}</strong>.
          </p>

          <div class="card-box">
            <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
              <tr>
                <td style="color:#71717a;padding:6px 0;border-bottom:1px solid #f4f4f5;">Company Name:</td>
                <td style="text-align:right;font-weight:700;padding:6px 0;border-bottom:1px solid #f4f4f5;">${p.companyName}</td>
              </tr>
              ${p.crNumber ? `<tr><td style="color:#71717a;padding:6px 0;border-bottom:1px solid #f4f4f5;">CR Number:</td><td style="text-align:right;font-family:monospace;font-weight:600;padding:6px 0;border-bottom:1px solid #f4f4f5;">${p.crNumber}</td></tr>` : ''}
              ${p.vatNumber ? `<tr><td style="color:#71717a;padding:6px 0;border-bottom:1px solid #f4f4f5;">VAT Number:</td><td style="text-align:right;font-family:monospace;font-weight:600;padding:6px 0;border-bottom:1px solid #f4f4f5;">${p.vatNumber}</td></tr>` : ''}
              ${p.businessType ? `<tr><td style="color:#71717a;padding:6px 0;border-bottom:1px solid #f4f4f5;">Business Type:</td><td style="text-align:right;font-weight:600;text-transform:uppercase;padding:6px 0;border-bottom:1px solid #f4f4f5;">${p.businessType}</td></tr>` : ''}
              ${p.city ? `<tr><td style="color:#71717a;padding:6px 0;border-bottom:1px solid #f4f4f5;">City:</td><td style="text-align:right;font-weight:600;padding:6px 0;border-bottom:1px solid #f4f4f5;">${p.city}</td></tr>` : ''}
              <tr>
                <td style="color:#71717a;padding:6px 0;">Verification Status:</td>
                <td style="text-align:right;font-weight:700;color:#b45309;padding:6px 0;">Pending Verification</td>
              </tr>
            </table>
          </div>

          <p class="lead-text">
            Our commercial compliance desk in Riyadh is verifying your CR and commercial credentials. You will receive an automated email as soon as your wholesale tier is approved.
          </p>

          <div style="margin-top: 24px;">
            <a href="${FRONTEND_URL}" class="btn-primary">Return to Store →</a>
          </div>
        `
      )
      const text = `Dear ${p.contactPerson},\nWe received your corporate account registration for ${p.companyName}. Our team is verifying your CR credentials and will update you shortly.`
      return {
        to: p.email,
        toName: p.contactPerson,
        subject,
        html,
        text,
      }
    }

    case 'BUSINESS_ACCOUNT_APPROVED': {
      const p = payload as any
      const subject = `Corporate Account Approved: Welcome to Abdullah Bakheet Wholesale`
      const html = baseEmailWrapper(
        subject,
        'CORPORATE ACCOUNT APPROVED',
        `
          <h1 class="main-title">Your Corporate Account is Active</h1>
          <p class="lead-text">
            Dear ${p.contactPerson}, we are pleased to confirm that <strong>${p.companyName}</strong> has been approved for full B2B Wholesale partner access.
          </p>

          <div class="card-box" style="border-left: 3px solid #fbdc3c;">
            <p style="margin: 0 0 10px 0; font-size: 13px; font-weight: 700; color: #09090b;">Active Corporate Privileges:</p>
            <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #52525b; line-height: 1.8;">
              <li>Automatic volume-tiered discounts on all catalog items</li>
              <li>Priority fast-track quotation requests (RFQ)</li>
              ${p.creditLimit && Number(p.creditLimit) > 0 ? `<li>Corporate Credit Facility: SAR ${Number(p.creditLimit).toLocaleString()}</li>` : ''}
              ${p.paymentTerms ? `<li>Payment Terms: ${p.paymentTerms.replace('_', ' ').toUpperCase()}</li>` : ''}
            </ul>
          </div>

          <div style="margin-top: 24px;">
            <a href="${FRONTEND_URL}/login?type=corporate" class="btn-primary">Access Wholesale Portal →</a>
          </div>
        `
      )
      const text = `Dear ${p.contactPerson},\nYour corporate wholesale account for ${p.companyName} is approved! You can now log in and place orders.`
      return {
        to: p.email,
        toName: p.contactPerson,
        subject,
        html,
        text,
      }
    }

    default:
      return null
  }
}
