async function testB2BOnboarding() {
  const BASE_URL = 'http://localhost:8787/api/v1'
  console.log('🧪 Starting End-to-End Test for B2B Registration & Admin Approval Flow...\n')

  const testEmail = `procurement-${Date.now()}@alsafwa-hotel.com`

  // 1. Submit Corporate Registration from Storefront
  console.log('1. Submitting B2B Registration via /api/v1/auth/register...')
  const regRes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      password: 'password123',
      firstName: 'Tariq',
      lastName: 'Al Otaibi',
      phone: '+966508899112',
      companyName: 'Al Safwa Luxury Hotel & Suites',
      crNumber: '1010892341',
      companyTaxId: '300189234500003',
      businessType: 'hotel',
      city: 'Riyadh',
      deliveryAddress: 'King Fahd Road, Al Olaya District, Gate 4 Goods Receiving',
      crDocumentUrl: 'https://pub-2ba7d836ec824f9096f19eb3bcbaa81e.r2.dev/b2b-docs/sample-cr-cert.pdf',
      customerGroup: 'corporate',
    }),
  })

  const regData: any = await regRes.json()
  console.log('   Registration Response Status:', regRes.status)
  console.log('   Customer ID:', regData.data?.customer?.id)
  console.log('   Account Status:', regData.data?.customer?.status)
  console.log('   Is Pending Approval:', regData.data?.customer?.isPendingApproval)

  if (regData.data?.customer?.status !== 'pending') {
    throw new Error(`Expected status to be 'pending', but got '${regData.data?.customer?.status}'`)
  }
  const customerId = regData.data?.customer?.id

  // 2. Fetch pending accounts from Admin Panel API
  console.log('\n2. Fetching Pending Accounts via /api/v1/admin/customers?status=pending...')
  const listRes = await fetch(`${BASE_URL}/admin/customers?status=pending`)
  const listData: any = await listRes.json()
  const foundInPending = (listData.data?.items || []).find((c: any) => c.id === customerId)
  console.log('   Found customer in Pending tab:', Boolean(foundInPending))
  console.log('   Company Name:', foundInPending?.companyName)
  console.log('   CR Number:', foundInPending?.crNumber)
  console.log('   CR Document URL:', foundInPending?.crDocumentUrl)

  if (!foundInPending) {
    throw new Error('Customer was not found in pending list!')
  }

  // 3. Admin clicks "Approve"
  console.log('\n3. Admin Approving Account via /api/v1/admin/customers/:id/approve...')
  const approveRes = await fetch(`${BASE_URL}/admin/customers/${customerId}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      creditLimit: '25000.00',
      paymentTerms: 'net_30',
    }),
  })
  const approveData: any = await approveRes.json()
  console.log('   Approve Response Status:', approveRes.status)
  console.log('   Updated Status:', approveData.data?.status)
  console.log('   Customer Group:', approveData.data?.customerGroup)
  console.log('   Approved Credit Limit:', approveData.data?.creditLimit)

  if (approveData.data?.status !== 'approved') {
    throw new Error(`Expected status to be 'approved', but got '${approveData.data?.status}'`)
  }

  // Allow async notifications to finish logging
  await new Promise((r) => setTimeout(r, 600))

  console.log('\n✅ ALL B2B REGISTRATION & APPROVAL TESTS PASSED SUCCESSFULLY!')
}

testB2BOnboarding().catch((err) => {
  console.error('Test failed:', err)
  process.exit(1)
})
