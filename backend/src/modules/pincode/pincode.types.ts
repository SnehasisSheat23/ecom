export interface PincodeInfo {
  pincode: string
  district: string
  stateName: string
  cityGroup: string
}

export interface PincodeSearchFilters {
  query?: string
  stateName?: string
  district?: string
  page?: number
  perPage?: number
}
