import { index, pgTable, timestamp, varchar } from 'drizzle-orm/pg-core'

export const pincodeDirectory = pgTable(
  'pincode_directory',
  {
    pincode: varchar('pincode', { length: 10 }).primaryKey(),
    district: varchar('district', { length: 255 }).notNull(),
    stateName: varchar('state_name', { length: 255 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    districtIdx: index('pincode_dir_district_idx').on(table.district),
    stateIdx: index('pincode_dir_state_idx').on(table.stateName),
  })
)
