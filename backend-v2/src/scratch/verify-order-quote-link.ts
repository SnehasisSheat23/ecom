import pg from 'pg';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

async function main() {
  const quoteRes = await pool.query(`SELECT id, quote_number, status, company_name, tax_number, customer_name, customer_email FROM v2_quotations ORDER BY created_at DESC LIMIT 1`);
  console.log("Latest Quote:", quoteRes.rows[0]);

  const orderRes = await pool.query(`SELECT id, order_number, status, customer_id, quotation_id, shipping_address_snapshot FROM v2_orders WHERE quotation_id IS NOT NULL ORDER BY created_at DESC LIMIT 1`);
  console.log("Latest Converted Order:", JSON.stringify(orderRes.rows[0], null, 2));

  await pool.end();
}

main().catch(console.error);
