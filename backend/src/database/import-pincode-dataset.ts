import fs from 'fs'
import readline from 'readline'
import { sql } from 'drizzle-orm'
import { getDatabase } from '../lib/db.js'

async function importPincodes() {
  const db = getDatabase()
  console.log('Starting All-India Pincode Dataset Import (19,253 pincodes)...')

  const filePath = './Dataset/pincode-dataset.csv'
  if (!fs.existsSync(filePath)) {
    console.error('File not found:', filePath)
    process.exit(1)
  }

  const stream = fs.createReadStream(filePath)
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity })

  let count = 0
  let inserted = 0
  let batch: Array<{ pincode: string; district: string; stateName: string }> = []
  const BATCH_SIZE = 1000

  for await (const line of rl) {
    count++
    if (count === 1) continue // Skip header row ("Pincode,District,StateName")

    const parts = line.split(',')
    if (parts.length >= 3) {
      const pincode = parts[0].trim()
      const district = parts[1].trim()
      const stateName = parts.slice(2).join(',').trim() // Handle commas in state name if any

      if (pincode && district && stateName) {
        batch.push({ pincode, district, stateName })
      }
    }

    if (batch.length >= BATCH_SIZE) {
      await insertBatch(db, batch)
      inserted += batch.length
      console.log(`Processed ${inserted} pincodes...`)
      batch = []
    }
  }

  if (batch.length > 0) {
    await insertBatch(db, batch)
    inserted += batch.length
  }

  console.log(`\n🎉 Success! Successfully imported ${inserted} all-India pincodes into pincode_directory table.`)
  process.exit(0)
}

async function insertBatch(
  db: any,
  items: Array<{ pincode: string; district: string; stateName: string }>
) {
  if (items.length === 0) return

  const valuesSql = items
    .map(
      (item) =>
        `('${item.pincode.replace(/'/g, "''")}', '${item.district.replace(
          /'/g,
          "''"
        )}', '${item.stateName.replace(/'/g, "''")}')`
    )
    .join(',\n')

  const query = `
    INSERT INTO pincode_directory (pincode, district, state_name)
    VALUES ${valuesSql}
    ON CONFLICT (pincode) 
    DO UPDATE SET 
      district = EXCLUDED.district,
      state_name = EXCLUDED.state_name;
  `

  await db.execute(sql.raw(query))
}

importPincodes().catch((err) => {
  console.error('Import failed:', err)
  process.exit(1)
})
