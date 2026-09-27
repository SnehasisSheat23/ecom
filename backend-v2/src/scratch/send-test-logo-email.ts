
import { notificationService } from '../modules/notifications/index.js'

async function run() {
  console.log('Sending Customer Welcome test email with transparent logo to snehasisshit2003@gmail.com...')
  const result = await notificationService.notifySync('CUSTOMER_WELCOME', {
    customerEmail: 'snehasisshit2003@gmail.com',
    customerName: 'Snehasis',
    companyName: 'Abdullah Bakheet Foods',
  })
  console.log('RESULT:', JSON.stringify(result, null, 2))
}

run().catch((err) => {
  console.error('Email send failed:', err)
  process.exit(1)
})
