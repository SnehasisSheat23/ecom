import { getPool } from '../lib/db.js'

async function run() {
  const pool = getPool()
  console.log('--- Checking current customers in DB ---')
  const res = await pool.query(`
    SELECT id, first_name, last_name, email, phone, company_name, cr_number, business_type, city, status, customer_group, cr_document_url, created_at 
    FROM v2_customers 
    ORDER BY created_at DESC 
    LIMIT 20
  `)

  console.log(`Found ${res.rows.length} customers:`)
  res.rows.forEach(r => {
    console.log(`- [${r.status}] [${r.customer_group}] ${r.company_name || (r.first_name + ' ' + r.last_name)} (${r.email}) - CR: ${r.cr_number || 'N/A'}, Type: ${r.business_type || 'N/A'}, City: ${r.city || 'N/A'}`)
  })

  // Check if we have pending corporate requests
  const pending = res.rows.filter(r => r.status === 'pending')
  console.log(`\nPending count: ${pending.length}`)

  // Create a brand new fresh corporate request for testing
  const testEmail = `procurement@al-safwa-hotels.sa`
  // Delete if already exists to ensure fresh seed
  await pool.query(`DELETE FROM v2_customers WHERE email = $1`, [testEmail])

  const insertRes = await pool.query(`
    INSERT INTO v2_customers (
      email,
      first_name,
      last_name,
      phone,
      company_name,
      cr_number,
      company_tax_id,
      business_type,
      city,
      delivery_address,
      cr_document_url,
      vat_document_url,
      customer_group,
      status,
      created_at,
      updated_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW()
    ) RETURNING id, company_name, email, status, customer_group
  `, [
    testEmail,
    'Sultan',
    'Al-Otaibi',
    '+966555123456',
    'Al Safwa Luxury Hospitality Group',
    '1010892341',
    '300987654300003',
    'hotel',
    'Riyadh',
    'King Fahd Road, Al Olaya District, Building 42, Floor 7, Riyadh 12214, Saudi Arabia',
    'https://pub-8b776be2dbe742e48227b689408bcf77.r2.dev/dubram-assets/b2b-docs/sample-commercial-registration.pdf',
    'https://pub-8b776be2dbe742e48227b689408bcf77.r2.dev/dubram-assets/b2b-docs/sample-vat-certificate.pdf',
    'corporate',
    'pending'
  ])

  console.log('\n✅ Created Fresh Pending Corporate Request:', insertRes.rows[0])
  process.exit(0)
}

run().catch(err => {
  console.error('Error:', err)
  process.exit(1)
})
