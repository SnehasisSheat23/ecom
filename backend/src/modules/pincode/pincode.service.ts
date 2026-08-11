import type { CacheProvider } from '../../providers/cache/cache.interface.js'
import type { PincodeRepository } from './pincode.repository.js'
import type { PincodeInfo, PincodeSearchFilters } from './pincode.types.js'

export class PincodeService {
  // Level-1 In-Memory Cache (0.01ms lookup time)
  private readonly memoryCache = new Map<string, PincodeInfo>()
  private readonly districtCache = new Map<string, PincodeInfo[]>()
  private isPreloaded = false

  constructor(
    private readonly repository: PincodeRepository,
    private readonly cache?: CacheProvider
  ) {}

  /**
   * Pre-load all 19,247 pincodes into in-memory Map cache on startup
   */
  async preloadCache(): Promise<void> {
    if (this.isPreloaded) return
    try {
      const all = await this.repository.loadAllPincodes()
      for (const info of all) {
        this.memoryCache.set(info.pincode, info)
        const dKey = info.district.toUpperCase().trim()
        if (!this.districtCache.has(dKey)) {
          this.districtCache.set(dKey, [])
        }
        this.districtCache.get(dKey)!.push(info)
      }
      this.isPreloaded = true
      console.log(`🚀 [PincodeService] Cached ${this.memoryCache.size} All-India pincodes across ${this.districtCache.size} districts in memory.`)
    } catch (err) {
      console.warn('[PincodeService] Preload failed, falling back to lazy cache:', err)
    }
  }

  /**
   * Lookup single pincode details with L1 In-Memory & L2 Redis Cache
   */
  async lookup(pincode: string): Promise<PincodeInfo | null> {
    const cleanCode = pincode.trim()
    if (!cleanCode) return null

    if (this.memoryCache.has(cleanCode)) {
      return this.memoryCache.get(cleanCode)!
    }

    const cacheKey = `pincode:info:${cleanCode}`
    if (this.cache) {
      const cached = await this.cache.get<PincodeInfo>(cacheKey)
      if (cached) {
        this.memoryCache.set(cleanCode, cached)
        return cached
      }
    }

    const info = await this.repository.findByCode(cleanCode)
    if (info) {
      this.memoryCache.set(cleanCode, info)
      if (this.cache) {
        await this.cache.set(cacheKey, info, 30 * 24 * 60 * 60) // 30 Days TTL
      }
    }

    return info
  }

  /**
   * Lookup multiple pincodes in batch with ultra-fast cache resolution
   */
  async lookupBatch(pincodes: string[]): Promise<Map<string, PincodeInfo>> {
    const result = new Map<string, PincodeInfo>()
    const missing: string[] = []

    for (const code of pincodes) {
      const clean = code.trim()
      if (this.memoryCache.has(clean)) {
        result.set(clean, this.memoryCache.get(clean)!)
      } else {
        missing.push(clean)
      }
    }

    if (missing.length > 0) {
      const fetched = await this.repository.findByCodesBatch(missing)
      for (const info of fetched) {
        this.memoryCache.set(info.pincode, info)
        result.set(info.pincode, info)
      }
    }

    return result
  }

  /**
   * Fast In-Memory Lookup for all pincodes in a District (<0.01ms)
   */
  async getDistrictPincodes(districtName: string): Promise<PincodeInfo[]> {
    await this.preloadCache()
    const dKey = districtName.toUpperCase().trim()
    if (this.districtCache.has(dKey)) {
      return this.districtCache.get(dKey)!
    }
    const result = await this.repository.searchPincodes({ district: districtName, perPage: 1000 })
    return result.items
  }

  /**
   * Search pincodes, districts, or states
   */
  async search(filters: PincodeSearchFilters) {
    if (filters.district && !filters.query && !filters.stateName) {
      const items = await this.getDistrictPincodes(filters.district)
      if (items.length > 0) {
        return {
          items,
          page: filters.page || 1,
          perPage: filters.perPage || 1000,
          total: items.length,
        }
      }
    }
    return this.repository.searchPincodes(filters)
  }
}
