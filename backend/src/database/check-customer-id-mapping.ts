import { getPool } from '../lib/db.js'

async function checkCustomerMapping() {
  const pool = getPool()
  try {
    const res = await pool.query(`
      SELECT 
        count(*) AS total_orders,
        count(customer_id) AS orders_with_customer_id,
        count(*) - count(customer_id) AS orders_without_customer_id
      FROM orders
    `)
    console.log('Customer Mapping Stats in DB:', res.rows[0])

    const sample = await pool.query(`
      SELECT o.order_number, o.customer_id, c.email, c.first_name, c.last_name 
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      WHERE o.customer_id IS NOT NULL
      LIMIT 5
    `)
    console.log('Sample Linked Orders:', sample.rows)
  } catch (err) {
    console.error(err)
  } finally {
    await pool.end()
  }
}

checkCustomerMapping()
