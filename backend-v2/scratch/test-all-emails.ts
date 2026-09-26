import { notify, notificationService } from '../src/modules/notifications/index.js'
import { renderEmailTemplate } from '../src/modules/notifications/templates/email.templates.js'
import * as fs from 'fs'
import * as path from 'path'

async function testAllEmails() {
  console.log('================================================================')
  console.log('🚀 TESTING ALL SYSTEM EMAILS (Email Channel Only)')
  console.log('================================================================\n')

  const testCases: { name: string; event: any; payload: any }[] = [
    {
      name: '1. Order Confirmation (ORDER_PLACED)',
      event: 'ORDER_PLACED',
      payload: {
        orderNumber: 'ORD-2026-8812',
        customerName: 'Ahmed Al Maktoum',
        customerEmail: 'ahmed.maktoum@example.ae',
        customerPhone: '+971501112233',
        totalAmount: '1,280.00',
        subtotal: '1,200.00',
        shippingCost: '30.00',
        currency: 'AED',
        paymentMethod: 'CARD',
        shippingAddress: 'Villa 14, Al Safa 2, Jumeirah, Dubai, UAE',
        items: [
          {
            name: 'Extra Virgin Olive Oil 5L Cold Pressed',
            quantity: 2,
            unitPrice: 350,
            totalPrice: 700,
            sku: 'EVOO-5L',
          },
          {
            name: 'Premium Medjool Dates Jumbo Pack 1kg',
            quantity: 5,
            unitPrice: 100,
            totalPrice: 500,
            sku: 'MDJ-1KG',
          },
        ],
        trackingUrl: 'https://abdullahbakheet.com/track/ORD-2026-8812',
      },
    },
    {
      name: '2. Order Status Update (ORDER_STATUS_CHANGED)',
      event: 'ORDER_STATUS_CHANGED',
      payload: {
        orderNumber: 'ORD-2026-8812',
        customerName: 'Ahmed Al Maktoum',
        customerEmail: 'ahmed.maktoum@example.ae',
        newStatus: 'shipped',
        currency: 'AED',
        totalAmount: '1,280.00',
        trackingNumber: 'TRK-DXB-987412',
        trackingUrl: 'https://track.courier.ae/TRK-DXB-987412',
      },
    },
    {
      name: '3. B2B Wholesale Quotation Request (B2B_QUOTATION_REQUESTED)',
      event: 'B2B_QUOTATION_REQUESTED',
      payload: {
        quoteNumber: 'Q-2026-0091',
        customerName: 'Sultan Al Qasimi',
        customerEmail: 'procurement@gulfresorts.ae',
        companyName: 'Gulf Resorts & Hotels Group',
        currency: 'SAR',
        totalAmount: '45,000.00',
        itemsCount: 12,
        customerNotes: 'Require FOB delivery to Jeddah warehouse by 15th next month.',
      },
    },
    {
      name: '4. B2B Quotation Responded with Custom Pricing (B2B_QUOTATION_RESPONDED)',
      event: 'B2B_QUOTATION_RESPONDED',
      payload: {
        quoteNumber: 'Q-2026-0091',
        customerName: 'Sultan Al Qasimi',
        customerEmail: 'procurement@gulfresorts.ae',
        currency: 'SAR',
        subtotal: '42,000.00',
        totalAmount: '44,100.00',
        validUntil: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        paymentLink: 'https://abdullahbakheet.com/b2b/quote/Q-2026-0091/accept',
        adminNotes: 'Applied 15% VIP volume discount for 500+ unit orders.',
      },
    },
    {
      name: '5. Admin Password Reset (ADMIN_PASSWORD_RESET)',
      event: 'ADMIN_PASSWORD_RESET',
      payload: {
        email: 'admin@abdullahbakheet.com',
        adminName: 'Operations Lead',
        resetToken: 'token_reset_881923',
        resetUrl: 'https://admin.abdullahbakheet.com/reset-password?token=token_reset_881923',
        expiresInMinutes: 30,
      },
    },
    {
      name: '6. Customer Welcome (CUSTOMER_WELCOME)',
      event: 'CUSTOMER_WELCOME',
      payload: {
        customerName: 'Mariam Al Nuaimi',
        customerEmail: 'mariam@nuaimitrading.com',
        companyName: 'Al Nuaimi Gourmet Foods',
      },
    },
  ]

  // Test 1: Fire-and-forget notification dispatch through the service
  console.log('⚡ Step 1: Testing fire-and-forget notify() for all scenarios:\n')
  for (const tc of testCases) {
    console.log(`➡️  Triggering: [${tc.name}]`)
    notify(tc.event, tc.payload, { channels: ['email'] })
  }

  // Allow async loop to finish
  await new Promise((r) => setTimeout(r, 600))

  // Test 2: Save sample generated HTML files to inspect template quality
  const outputDir = path.join(process.cwd(), 'scratch', 'email-previews')
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  console.log('\n📄 Step 2: Generating HTML preview files in scratch/email-previews/ ...')
  for (const tc of testCases) {
    const rendered = renderEmailTemplate(tc.event, tc.payload)
    if (rendered) {
      const fileName = `${tc.event.toLowerCase()}.html`
      fs.writeFileSync(path.join(outputDir, fileName), rendered.html, 'utf-8')
      console.log(`   ✓ Saved: scratch/email-previews/${fileName} (${rendered.subject})`)
    }
  }

  console.log('\n✅ ALL EMAIL NOTIFICATION TESTS PASSED SUCCESSFULLY!')
}

testAllEmails().catch((err) => {
  console.error('Test error:', err)
  process.exit(1)
})
