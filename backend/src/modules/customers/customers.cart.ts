export interface GuestCartMergeRequest {
  tenantId: string
  guestSessionId: string
  customerId: string
}

export interface GuestCartMerger {
  mergeGuestCartIntoCustomer(request: GuestCartMergeRequest): Promise<void>
  unlinkGuestSession(tenantId: string, guestSessionId: string): Promise<void>
  syncItems(tenantId: string, owner: { customerId?: string; guestSessionId?: string }, items: any[]): Promise<void>
}

export class NoopGuestCartMerger implements GuestCartMerger {
  async mergeGuestCartIntoCustomer(_request: GuestCartMergeRequest): Promise<void> {
    return
  }
  async unlinkGuestSession(_tenantId: string, _guestSessionId: string): Promise<void> {
    return
  }
  async syncItems(_tenantId: string, _owner: { customerId?: string; guestSessionId?: string }, _items: any[]): Promise<void> {
    return
  }
}
