import pg from 'pg';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

async function main() {
  const result = await pool.query(`
    SELECT id, sku, 
           pricing->'AED' as aed_pricing,
           pricing->'SAR' as sar_pricing
    FROM v2_products 
    LIMIT 5
  `);
  
  for (const row of result.rows) {
    console.log(`\n=== ${row.sku} ===`);
    console.log(`  id: ${row.id}`);
    console.log(`  AED pricing:`, JSON.stringify(row.aed_pricing, null, 2));
    console.log(`  SAR pricing:`, JSON.stringify(row.sar_pricing, null, 2));
  }
  
  await pool.end();
}

main().catch(console.error);
