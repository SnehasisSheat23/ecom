import { describe, expect, it } from 'vitest'

import { PincodeService } from './pincode.service.js'
import type { PincodeRepository } from './pincode.repository.js'
import type { PincodeInfo } from './pincode.types.js'

describe('PincodeService', () => {
  const mockPincodes: Record<string, PincodeInfo> = {
    '110001': { pincode: '110001', district: 'CENTRAL DELHI', stateName: 'Delhi', cityGroup: 'CENTRAL DELHI (Delhi)' },
    '560037': { pincode: '560037', district: 'Bangalore Urban', stateName: 'Karnataka', cityGroup: 'Bangalore Urban (Karnataka)' },
    '400001': { pincode: '400001', district: 'MUMBAI', stateName: 'Maharashtra', cityGroup: 'MUMBAI (Maharashtra)' },
  }

  const mockRepo = {
    findByCode: async (code: string) => mockPincodes[code] || null,
    findByCodesBatch: async (codes: string[]) => codes.map((c) => mockPincodes[c]).filter(Boolean),
    loadAllPincodes: async () => Object.values(mockPincodes),
    searchPincodes: async () => ({ items: Object.values(mockPincodes), page: 1, perPage: 50, total: 3 }),
  } as unknown as PincodeRepository

  it('should lookup single pincode with ultra-low latency memory cache', async () => {
    const service = new PincodeService(mockRepo)
    const result = await service.lookup('110001')
    expect(result).toBeDefined()
    expect(result?.district).toBe('CENTRAL DELHI')
    expect(result?.stateName).toBe('Delhi')

    // Second call should return from Level-1 Memory Map Cache instantly
    const result2 = await service.lookup('110001')
    expect(result2?.pincode).toBe('110001')
  })

  it('should batch lookup multiple pincodes accurately', async () => {
    const service = new PincodeService(mockRepo)
    const resultMap = await service.lookupBatch(['110001', '560037'])
    expect(resultMap.size).toBe(2)
    expect(resultMap.get('110001')?.district).toBe('CENTRAL DELHI')
    expect(resultMap.get('560037')?.district).toBe('Bangalore Urban')
  })
})
