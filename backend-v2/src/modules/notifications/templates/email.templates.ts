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

function baseEmailWrapper(title: string, bodyContent: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    .header { background: #09090b; padding: 24px 32px; text-align: left; }
    .header h1 { color: #f8fafc; font-size: 20px; margin: 0; font-weight: 600; letter-spacing: -0.025em; }
    .content { padding: 32px; }
    .button { display: inline-block; background-color: #18181b; color: #ffffff !important; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 500; font-size: 14px; margin-top: 20px; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 12px; font-weight: 600; text-transform: uppercase; }
    .badge-pending { background: #fef3c7; color: #92400e; }
    .badge-success { background: #dcfce7; color: #166534; }
    .item-row { display: flex; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding: 10px 0; font-size: 14px; }
    .total-row { display: flex; justify-content: space-between; padding-top: 14px; font-weight: 700; font-size: 16px; }
    .footer { background: #f8fafc; padding: 20px 32px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Abdullah Bakheet B2B & Retail</h1>
    </div>
    <div class="content">
      ${bodyContent}
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} Abdullah Bakheet Commercial Establishment. Riyadh, Kingdom of Saudi Arabia.</p>
      <p>If you have any questions, reply to this email or contact support.</p>
    </div>
  </div>
</body>
</html>`
}

export function renderEmailTemplate(event: NotificationEvent, payload: any): OutgoingEmailMessage | null {
  switch (event) {
    case 'ORDER_PLACED': {
      const p = payload as OrderPlacedPayload
      const subject = `Order Confirmation #${p.orderNumber}`
      const itemsHtml = p.items
        .map(
          (item) => `
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; font-size: 14px;">
                <strong>${item.name}</strong> ${item.sku ? `<span style="color:#64748b;font-size:12px;">(${item.sku})</span>` : ''}
              </td>
              <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; text-align: center; font-size: 14px; color: #64748b;">
                ×${item.quantity}
              </td>
              <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; text-align: right; font-size: 14px; font-weight: 500;">
                ${p.currency} ${Number(item.totalPrice).toFixed(2)}
              </td>
            </tr>
          `
        )
        .join('')

      const html = baseEmailWrapper(
        subject,
        `
          <h2 style="margin-top:0; font-size: 22px; color: #09090b;">Thank you for your order, ${p.customerName}!</h2>
          <p style="color: #475569; font-size: 15px; line-height: 1.5;">
            Your order <strong>#${p.orderNumber}</strong> has been received and is currently being processed.
          </p>

          <div style="background-color: #f8fafc; border-radius: 8px; padding: 16px; margin: 24px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="text-align: left; color: #64748b; font-size: 12px; text-transform: uppercase;">
                  <th style="padding-bottom: 8px;">Item</th>
                  <th style="padding-bottom: 8px; text-align: center;">Qty</th>
                  <th style="padding-bottom: 8px; text-align: right;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>

            <div style="margin-top: 16px; border-top: 2px solid #e2e8f0; padding-top: 12px;">
              <table style="width: 100%;">
                ${p.subtotal ? `<tr><td style="color:#64748b;font-size:14px;">Subtotal:</td><td style="text-align:right;font-size:14px;">${p.currency} ${Number(p.subtotal).toFixed(2)}</td></tr>` : ''}
                ${p.shippingCost ? `<tr><td style="color:#64748b;font-size:14px;">Shipping:</td><td style="text-align:right;font-size:14px;">${p.currency} ${Number(p.shippingCost).toFixed(2)}</td></tr>` : ''}
                <tr>
                  <td style="font-weight: 700; font-size: 16px; padding-top: 6px;">Total:</td>
                  <td style="font-weight: 700; font-size: 18px; color: #0f172a; text-align: right; padding-top: 6px;">
                    ${p.currency} ${Number(p.totalAmount).toFixed(2)}
                  </td>
                </tr>
              </table>
            </div>
          </div>

          ${p.shippingAddress ? `<p style="font-size:14px;color:#475569;"><strong>Delivery Address:</strong><br>${p.shippingAddress}</p>` : ''}
          ${p.trackingUrl ? `<a href="${p.trackingUrl}" class="button">Track Your Order</a>` : ''}
        `
      )

      const text = `Thank you for your order, ${p.customerName}!\n\nOrder Number: ${p.orderNumber}\nTotal: ${p.currency} ${p.totalAmount}\nItems:\n${p.items.map((i) => `- ${i.name} (x${i.quantity}) - ${p.currency} ${i.totalPrice}`).join('\n')}`

      return {
        to: p.customerEmail,
        toName: p.customerName,
        subject,
        html,
        text,
      }
    }

    case 'ORDER_STATUS_CHANGED': {
      const p = payload as OrderStatusChangedPayload
      const subject = `Update on Order #${p.orderNumber}: Status ${p.newStatus.toUpperCase()}`
      const html = baseEmailWrapper(
        subject,
        `
          <h2 style="margin-top:0; font-size: 20px;">Order Status Update</h2>
          <p style="color: #475569; font-size: 15px; line-height: 1.5;">
            Hello ${p.customerName}, the status of your order <strong>#${p.orderNumber}</strong> has been updated to:
          </p>
          <div style="margin: 20px 0;">
            <span class="badge badge-success" style="font-size: 14px; padding: 6px 14px;">
              ${p.newStatus.toUpperCase()}
            </span>
          </div>
          ${p.trackingNumber ? `<p style="font-size:14px;color:#475569;">Tracking Number: <strong>${p.trackingNumber}</strong></p>` : ''}
          ${p.trackingUrl ? `<a href="${p.trackingUrl}" class="button">View Order Status</a>` : ''}
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
      const subject = `Quotation Request Received: #${p.quoteNumber}`
      const html = baseEmailWrapper(
        subject,
        `
          <h2 style="margin-top:0; font-size: 20px;">Quotation Request Received</h2>
          <p style="color: #475569; font-size: 15px; line-height: 1.5;">
            Dear ${p.customerName}${p.companyName ? ` (${p.companyName})` : ''},
          </p>
          <p style="color: #475569; font-size: 15px; line-height: 1.5;">
            We have received your B2B wholesale quotation request <strong>#${p.quoteNumber}</strong> for ${p.itemsCount} line item(s).
          </p>
          <p style="color: #475569; font-size: 14px;">
            Our commercial sales team is reviewing your volume request and will supply custom tiered B2B pricing shortly.
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
      const subject = `Your Custom Quotation #${p.quoteNumber} is Ready`
      const html = baseEmailWrapper(
        subject,
        `
          <h2 style="margin-top:0; font-size: 20px;">Your B2B Quotation is Ready!</h2>
          <p style="color: #475569; font-size: 15px; line-height: 1.5;">
            Dear ${p.customerName}, our pricing team has prepared custom wholesale pricing for quotation <strong>#${p.quoteNumber}</strong>.
          </p>
          <div style="background-color: #f8fafc; border-radius: 8px; padding: 16px; margin: 20px 0;">
            <p style="margin: 0; font-size: 14px; color: #64748b;">Quoted Total Amount:</p>
            <p style="margin: 4px 0 0 0; font-size: 24px; font-weight: 700; color: #0f172a;">
              ${p.currency} ${Number(p.totalAmount).toFixed(2)}
            </p>
            ${p.validUntil ? `<p style="margin: 8px 0 0 0; font-size: 12px; color: #94a3b8;">Valid Until: ${new Date(p.validUntil).toLocaleDateString()}</p>` : ''}
          </div>
          ${p.paymentLink ? `<a href="${p.paymentLink}" class="button">Review & Accept Quotation</a>` : ''}
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
      const subject = `Reset Your Admin Password`
      const html = baseEmailWrapper(
        subject,
        `
          <h2 style="margin-top:0; font-size: 20px;">Password Reset Request</h2>
          <p style="color: #475569; font-size: 15px; line-height: 1.5;">
            Hello ${p.adminName || 'Admin'},
          </p>
          <p style="color: #475569; font-size: 15px; line-height: 1.5;">
            A password reset was requested for your admin account (<strong>${p.email}</strong>).
          </p>
          <p style="color: #475569; font-size: 14px;">
            Click the button below to set a new password. This link expires in ${p.expiresInMinutes || 30} minutes.
          </p>
          <a href="${p.resetUrl}" class="button">Reset Password</a>
          <p style="font-size: 12px; color: #94a3b8; margin-top: 24px;">
            If you did not request this, please disregard this email.
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
        `
          <h2 style="margin-top:0; font-size: 20px;">Welcome, ${p.customerName}!</h2>
          <p style="color: #475569; font-size: 15px; line-height: 1.5;">
            Thank you for registering your ${p.companyName ? `corporate account for <strong>${p.companyName}</strong>` : 'account'}.
          </p>
          <p style="color: #475569; font-size: 14px;">
            You can now request wholesale B2B quotes, track orders, and access volume catalog pricing.
          </p>
        `
      )
      const text = `Welcome to Abdullah Bakheet Trading, ${p.customerName}!`
      return {
        to: p.customerEmail,
        toName: p.customerName,
        subject,
        html,
        text,
      }
    }

    case 'BUSINESS_REGISTRATION_SUBMITTED': {
      const p = payload as any
      const subject = `Business Application Received: ${p.companyName}`
      const html = baseEmailWrapper(
        subject,
        `
          <h2 style="margin-top:0; font-size: 20px;">Corporate Account Application Under Review</h2>
          <p style="color: #475569; font-size: 15px; line-height: 1.5;">
            Dear ${p.contactPerson},
          </p>
          <p style="color: #475569; font-size: 15px; line-height: 1.5;">
            Thank you for applying for a corporate wholesale account for <strong>${p.companyName}</strong>.
          </p>
          <div style="background-color: #f8fafc; border-radius: 8px; padding: 16px; margin: 20px 0; font-size: 14px;">
            <p style="margin: 0 0 8px 0;"><strong>Company:</strong> ${p.companyName}</p>
            ${p.crNumber ? `<p style="margin: 0 0 8px 0;"><strong>CR Number:</strong> ${p.crNumber}</p>` : ''}
            ${p.vatNumber ? `<p style="margin: 0 0 8px 0;"><strong>VAT / TRN:</strong> ${p.vatNumber}</p>` : ''}
            ${p.businessType ? `<p style="margin: 0 0 8px 0;"><strong>Business Type:</strong> ${p.businessType.toUpperCase()}</p>` : ''}
            ${p.city ? `<p style="margin: 0;"><strong>City:</strong> ${p.city}</p>` : ''}
          </div>
          <p style="color: #475569; font-size: 14px; line-height: 1.5;">
            Our B2B verification team is reviewing your commercial credentials. You will receive an email confirmation as soon as your account is approved (typically within 24 business hours).
          </p>
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
      const subject = `Account Approved: Welcome to Abdullah Bakheet Wholesale`
      const html = baseEmailWrapper(
        subject,
        `
          <h2 style="margin-top:0; font-size: 20px; color: #166534;">🎉 Your Corporate Account is Approved!</h2>
          <p style="color: #475569; font-size: 15px; line-height: 1.5;">
            Dear ${p.contactPerson}, we are pleased to confirm that <strong>${p.companyName}</strong> has been approved for full B2B Wholesale access.
          </p>
          <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 20px 0; font-size: 14px;">
            <p style="margin: 0 0 6px 0; color: #166534; font-weight: 600;">Account Privileges Active:</p>
            <ul style="margin: 6px 0 0 0; padding-left: 20px; color: #15803d;">
              <li>Volume Tiered Pricing across our entire catalog</li>
              <li>Fast B2B Quotation Requests & Direct Checkout</li>
              ${p.creditLimit && Number(p.creditLimit) > 0 ? `<li>Corporate Credit Limit: SAR ${Number(p.creditLimit).toFixed(2)}</li>` : ''}
              ${p.paymentTerms ? `<li>Payment Terms: ${p.paymentTerms.replace('_', ' ').toUpperCase()}</li>` : ''}
            </ul>
          </div>
          <a href="https://abdullahbakheet.com/login?type=corporate" class="button">Log In to Your Corporate Account</a>
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
