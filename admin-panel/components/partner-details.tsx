"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Icon } from "@/components/ui/icon"
import { Button } from "@/components/ui/button"
import { apiRequest } from "@/lib/api-client"
import { toast } from "sonner"

interface PartnerDetailsProps {
  id: string
}

export interface PincodeItem {
  id?: string
  pincode: string
  priority: number
  status: "Active" | "Inactive"
  district?: string
  stateName?: string
}

export interface DistrictGroup {
  groupKey: string
  district: string
  stateName: string
  count: number
  priority: number
  pincodes: PincodeItem[]
}

export interface FulfillmentNodeItem {
  id: string
  name: string
  type: string
  status: string
  prepLeadTimeMinutes: number
  maxOrdersPerHour: number
  cutoffTime: string
  capabilities: string[]
  address: any
}

export interface PartnerDetailData {
  id: string
  name: string
  vendorCode: string
  email: string
  phone: string
  city: string
  state: string
  address: string
  status: "Active" | "Suspended"
  ownerName: string
  autoAssign: boolean
  logoUrl?: string
  bannerUrl?: string
  taxId?: string
  description?: string
}

function StatusBadge({ status }: { status: string }) {
  let bgColor = "bg-rose-200/90 dark:bg-rose-950/70"
  let textColor = "text-rose-900 dark:text-rose-300"

  if (status === "Active") {
    bgColor = "bg-emerald-200/90 dark:bg-emerald-950/70"
    textColor = "text-emerald-900 dark:text-emerald-300"
  } else if (status === "Suspended") {
    bgColor = "bg-rose-200/90 dark:bg-rose-950/70"
    textColor = "text-rose-900 dark:text-rose-300"
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded font-ui text-[11px] font-semibold ${bgColor} ${textColor}`}>
      {status}
    </span>
  )
}

export function PartnerDetails({ id }: PartnerDetailsProps) {
  const router = useRouter()
  const [partner, setPartner] = React.useState<PartnerDetailData | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [isSaving, setIsSaving] = React.useState(false)

  // Active Tab State ("profile" | "delivery" | "kitchens")
  const [activeTab, setActiveTab] = React.useState<"profile" | "delivery" | "kitchens">("profile")
  const [isEditingProfile, setIsEditingProfile] = React.useState(false)

  // Partner Form State
  const [name, setName] = React.useState("")
  const [vendorCode, setVendorCode] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [phone, setPhone] = React.useState("")
  const [city, setCity] = React.useState("")
  const [state, setState] = React.useState("")
  const [address, setAddress] = React.useState("")
  const [ownerName, setOwnerName] = React.useState("")
  const [status, setStatus] = React.useState<"Active" | "Suspended">("Active")
  const [autoAssign, setAutoAssign] = React.useState(true)
  const [logoUrl, setLogoUrl] = React.useState("")
  const [bannerUrl, setBannerUrl] = React.useState("")
  const [taxId, setTaxId] = React.useState("")
  const [description, setDescription] = React.useState("")

  // Nodes & Active Selected Kitchen Node State
  const [nodesList, setNodesList] = React.useState<FulfillmentNodeItem[]>([])
  const [selectedNodeId, setSelectedNodeId] = React.useState<string | null>(null)

  // Active Selected Node Form State
  const [nodeName, setNodeName] = React.useState("")
  const [nodeType, setNodeType] = React.useState("restaurant")
  const [prepLeadTimeMinutes, setPrepLeadTimeMinutes] = React.useState(30)
  const [maxOrdersPerHour, setMaxOrdersPerHour] = React.useState(50)
  const [cutoffTime, setCutoffTime] = React.useState("21:00")
  const [capabilities, setCapabilities] = React.useState<string[]>(["delivery", "pickup"])

  // Add Kitchen Hub Modal State
  const [showAddHubModal, setShowAddHubModal] = React.useState(false)
  const [newHubName, setNewHubName] = React.useState("")
  const [newHubType, setNewHubType] = React.useState("restaurant")
  const [isCreatingHub, setIsCreatingHub] = React.useState(false)

  // Pincode Management States
  const [pincodesList, setPincodesList] = React.useState<PincodeItem[]>([])
  const [isLoadingPincodes, setIsLoadingPincodes] = React.useState(false)
  const [expandedGroups, setExpandedGroups] = React.useState<Set<string>>(new Set())
  const [searchFilter, setSearchFilter] = React.useState("")
  const [deliveryMode, setDeliveryMode] = React.useState<"idle" | "search" | "add">("idle")

  // Unified Search & Add Input State with Debounce
  const [addInputValue, setAddInputValue] = React.useState("")
  const [suggestions, setSuggestions] = React.useState<Array<{ type: "pincode" | "district"; title: string; subtitle: string; pincode?: string; district?: string; count?: number }>>([])
  const [isSearchingSuggestions, setIsSearchingSuggestions] = React.useState(false)
  const [showDropdown, setShowDropdown] = React.useState(false)
  const dropdownRef = React.useRef<HTMLDivElement>(null)

  // 1. Initial Load: Fetch Partner and All Nodes
  React.useEffect(() => {
    let active = true
    async function loadPartnerAndNodes() {
      setIsLoading(true)
      try {
        const partnerRes = await apiRequest(`/admin/partners/${id}`)
        let partnerData: any = null
        if (partnerRes.ok) {
          const body = await partnerRes.json()
          partnerData = body.data
        }

        let fetchedNodes: FulfillmentNodeItem[] = []
        const nodeRes = await apiRequest(`/admin/fulfillment/nodes?partnerId=${id}`)
        if (nodeRes.ok) {
          const nodeBody = await nodeRes.json()
          const rawItems = nodeBody.data?.items || nodeBody.data || []
          fetchedNodes = rawItems.map((n: any) => ({
            id: n.id,
            name: n.name || "Kitchen Hub",
            type: n.type || "restaurant",
            status: n.status || "active",
            prepLeadTimeMinutes: n.prepLeadTimeMinutes ?? 30,
            maxOrdersPerHour: n.maxOrdersPerHour ?? 50,
            cutoffTime: n.cutoffTime || "21:00",
            capabilities: n.capabilities || ["delivery", "pickup"],
            address: n.address || {},
          }))
        }

        if (active) {
          const mappedPartner: PartnerDetailData = {
            id: partnerData?.id || id,
            name: partnerData?.name || "Partner Location",
            vendorCode: partnerData?.metadata?.vendorCode || partnerData?.slug?.toUpperCase() || id.slice(0, 6).toUpperCase(),
            email: partnerData?.email || "-",
            phone: partnerData?.phone || partnerData?.metadata?.ownerPhone || "-",
            city: partnerData?.metadata?.city || "India",
            state: partnerData?.metadata?.state || "IN",
            address: partnerData?.metadata?.address || "-",
            status: partnerData?.status === "active" ? "Active" : "Suspended",
            ownerName: partnerData?.metadata?.ownerName || "Owner",
            autoAssign: partnerData?.metadata?.autoAssign ?? true,
            logoUrl: partnerData?.logoUrl || partnerData?.metadata?.logoUrl || "",
            bannerUrl: partnerData?.metadata?.bannerUrl || "",
            taxId: partnerData?.taxId || partnerData?.metadata?.taxId || "",
            description: partnerData?.description || partnerData?.metadata?.description || "",
          }

          setPartner(mappedPartner)
          setName(mappedPartner.name)
          setVendorCode(mappedPartner.vendorCode)
          setEmail(mappedPartner.email)
          setPhone(mappedPartner.phone)
          setCity(mappedPartner.city)
          setState(mappedPartner.state)
          setAddress(mappedPartner.address)
          setOwnerName(mappedPartner.ownerName)
          setStatus(mappedPartner.status)
          setAutoAssign(mappedPartner.autoAssign)
          setLogoUrl(mappedPartner.logoUrl || "")
          setBannerUrl(mappedPartner.bannerUrl || "")
          setTaxId(mappedPartner.taxId || "")
          setDescription(mappedPartner.description || "")

          setNodesList(fetchedNodes)
          if (fetchedNodes.length > 0) {
            const first = fetchedNodes[0]
            setSelectedNodeId(first.id)
            setNodeName(first.name)
            setNodeType(first.type)
            setPrepLeadTimeMinutes(first.prepLeadTimeMinutes)
            setMaxOrdersPerHour(first.maxOrdersPerHour)
            setCutoffTime(first.cutoffTime)
            setCapabilities(first.capabilities.length > 0 ? first.capabilities : ["delivery", "pickup"])
          }
        }
      } catch (err) {
        console.warn("Failed to load partner details", err)
      } finally {
        if (active) setIsLoading(false)
      }
    }
    loadPartnerAndNodes()
    return () => {
      active = false
    }
  }, [id])

  // 2. Fetch Service Areas / Pincodes whenever selectedNodeId changes
  React.useEffect(() => {
    if (!selectedNodeId) {
      const resetTimer = setTimeout(() => {
        setPincodesList([])
      }, 0)
      return () => clearTimeout(resetTimer)
    }

    let active = true
    async function loadServiceAreasForNode() {
      setIsLoadingPincodes(true)
      try {
        const areaRes = await apiRequest(`/admin/fulfillment/nodes/${selectedNodeId}/service-areas`)
        if (areaRes.ok) {
          const areaBody = await areaRes.json()
          const areas = areaBody.data || []
          const codes = areas.map((a: any) => (a.code || a.pincode || "").trim()).filter(Boolean)

          const pincodeInfoMap: Record<string, { district: string; stateName: string }> = {}
          if (codes.length > 0) {
            try {
              const pinRes = await apiRequest(`/pincode/batch`, {
                method: "POST",
                body: JSON.stringify({ pincodes: codes }),
              })
              if (pinRes.ok) {
                const pinBody = await pinRes.json()
                for (const info of pinBody.data || []) {
                  pincodeInfoMap[info.pincode] = {
                    district: info.district,
                    stateName: info.stateName,
                  }
                }
              }
            } catch (e) {
              console.warn("Pincode batch lookup fallback:", e)
            }
          }

          if (active) {
            const mappedPincodes: PincodeItem[] = areas.map((a: any) => {
              const code = (a.code || a.pincode || "-").trim()
              const official = pincodeInfoMap[code]
              return {
                id: a.id,
                pincode: code,
                priority: a.priority || 1,
                status: a.status === "inactive" ? "Inactive" : "Active",
                district: a.district || official?.district || "Unknown District",
                stateName: a.stateName || official?.stateName || "India",
              }
            })
            setPincodesList(mappedPincodes)
          }
        }
      } catch (err) {
        console.warn("Failed to load service areas for node", err)
      } finally {
        if (active) setIsLoadingPincodes(false)
      }
    }

    loadServiceAreasForNode()
    return () => {
      active = false
    }
  }, [selectedNodeId])

  // Handle switching active selected Kitchen Node
  const handleSelectNode = (nodeIdToSelect: string) => {
    setSelectedNodeId(nodeIdToSelect)
    const targetNode = nodesList.find((n) => n.id === nodeIdToSelect)
    if (targetNode) {
      setNodeName(targetNode.name)
      setNodeType(targetNode.type)
      setPrepLeadTimeMinutes(targetNode.prepLeadTimeMinutes)
      setMaxOrdersPerHour(targetNode.maxOrdersPerHour)
      setCutoffTime(targetNode.cutoffTime)
      setCapabilities(targetNode.capabilities.length > 0 ? targetNode.capabilities : ["delivery", "pickup"])
    }
  }

  // Create New Kitchen Hub
  const handleCreateKitchenHub = async () => {
    const cleanName = newHubName.trim()
    if (!cleanName) {
      toast.error("Kitchen hub name cannot be empty")
      return
    }

    setIsCreatingHub(true)
    try {
      const res = await apiRequest(`/admin/fulfillment/nodes`, {
        method: "POST",
        body: JSON.stringify({
          partnerId: id,
          name: cleanName,
          type: newHubType,
          prepLeadTimeMinutes: 30,
          maxOrdersPerHour: 50,
          cutoffTime: "21:00",
          capabilities: ["delivery", "pickup"],
          address: { city, state, address },
        }),
      })

      if (res.ok) {
        const body = await res.json()
        const created = body.data
        const newNodeItem: FulfillmentNodeItem = {
          id: created.id,
          name: created.name,
          type: created.type,
          status: created.status || "active",
          prepLeadTimeMinutes: created.prepLeadTimeMinutes || 30,
          maxOrdersPerHour: created.maxOrdersPerHour || 50,
          cutoffTime: created.cutoffTime || "21:00",
          capabilities: created.capabilities || ["delivery", "pickup"],
          address: created.address || {},
        }

        setNodesList((prev) => [...prev, newNodeItem])
        setSelectedNodeId(created.id)
        setNodeName(created.name)
        setNodeType(created.type)
        setShowAddHubModal(false)
        setNewHubName("")
        toast.success(`🎉 Kitchen Hub '${cleanName}' created successfully!`)
      } else {
        toast.error("Failed to create kitchen hub")
      }
    } catch (e) {
      toast.error("Error creating kitchen hub")
    } finally {
      setIsCreatingHub(false)
    }
  }

  // Debounced search for Pincode or District suggestions (<0.01ms cache response)
  React.useEffect(() => {
    const q = addInputValue.trim()
    if (!q || q.length < 2) {
      const resetTimer = setTimeout(() => {
        setSuggestions([])
        setShowDropdown(false)
      }, 0)
      return () => clearTimeout(resetTimer)
    }

    const timer = setTimeout(() => {
      let active = true
      async function fetchSuggestions() {
        setIsSearchingSuggestions(true)
        try {
          const res = await apiRequest(`/pincode/search?q=${encodeURIComponent(q)}&perPage=15`)
          if (res.ok && active) {
            const body = await res.json()
            const items: Array<{ pincode: string; district: string; stateName: string }> = body.data?.items || []

            const districtMap = new Map<string, { count: number; stateName: string }>()
            const suggestList: Array<{ type: "pincode" | "district"; title: string; subtitle: string; pincode?: string; district?: string; count?: number }> = []

            for (const item of items) {
              if (suggestList.length < 5) {
                suggestList.push({
                  type: "pincode",
                  title: item.pincode,
                  subtitle: `${item.district}, ${item.stateName}`,
                  pincode: item.pincode,
                  district: item.district,
                })
              }

              if (!districtMap.has(item.district)) {
                districtMap.set(item.district, { count: 1, stateName: item.stateName })
              } else {
                districtMap.get(item.district)!.count += 1
              }
            }

            for (const [dist, dMeta] of districtMap.entries()) {
              suggestList.push({
                type: "district",
                title: `All Pincodes in ${dist}`,
                subtitle: `Entire Zone in ${dMeta.stateName}`,
                district: dist,
              })
            }

            setSuggestions(suggestList)
            setShowDropdown(suggestList.length > 0)
          }
        } catch (e) {
          console.warn("Suggestion fetch error:", e)
        } finally {
          if (active) setIsSearchingSuggestions(false)
        }
      }
      fetchSuggestions()
    }, 300)

    return () => clearTimeout(timer)
  }, [addInputValue])

  // Close suggestion dropdown when clicking outside
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Group pincodes strictly by official All-India District & State
  const districtGroups = React.useMemo(() => {
    const groupMap = new Map<string, DistrictGroup>()

    for (const p of pincodesList) {
      if (searchFilter.trim()) {
        const q = searchFilter.trim().toLowerCase()
        const matchesPincode = p.pincode.includes(q)
        const matchesDistrict = (p.district || "").toLowerCase().includes(q)
        const matchesState = (p.stateName || "").toLowerCase().includes(q)
        if (!matchesPincode && !matchesDistrict && !matchesState) continue
      }

      const distName = p.district || "General Zone"
      const stName = p.stateName || "India"
      const groupKey = `${distName} (${stName})`

      if (!groupMap.has(groupKey)) {
        groupMap.set(groupKey, {
          groupKey,
          district: distName,
          stateName: stName,
          count: 0,
          priority: p.priority,
          pincodes: [],
        })
      }

      const group = groupMap.get(groupKey)!
      group.count += 1
      group.pincodes.push(p)
    }

    return Array.from(groupMap.values()).sort((a, b) => b.count - a.count)
  }, [pincodesList, searchFilter])

  const toggleGroupExpand = (groupKey: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(groupKey)) next.delete(groupKey)
      else next.add(groupKey)
      return next
    })
  }

  // Toggle Capability
  const toggleCapability = (cap: string) => {
    setCapabilities((prev) =>
      prev.includes(cap) ? prev.filter((c) => c !== cap) : [...prev, cap]
    )
  }

  // Remove individual pincode from active node
  const handleRemovePincode = (pincodeToRemove: string) => {
    setPincodesList((prev) => prev.filter((p) => p.pincode !== pincodeToRemove))
    toast.success(`Removed pincode ${pincodeToRemove} from ${nodeName || "Kitchen Hub"}`)
  }

  // Add single pincode with auto-grouping
  const addSinglePincode = async (code: string) => {
    const clean = code.trim()
    if (!clean) return

    const existingSet = new Set(pincodesList.map((p) => p.pincode))
    if (existingSet.has(clean)) {
      toast.info(`Pincode ${clean} is already added`)
      setAddInputValue("")
      setShowDropdown(false)
      return
    }

    try {
      const pinRes = await apiRequest(`/pincode/${clean}`)
      let dist = "Added Zone"
      let st = "India"
      if (pinRes.ok) {
        const body = await pinRes.json()
        if (body.data) {
          dist = body.data.district
          st = body.data.stateName
        }
      }

      const newItem: PincodeItem = {
        id: `pin-${Date.now()}-${clean}`,
        pincode: clean,
        priority: 1,
        status: "Active",
        district: dist,
        stateName: st,
      }

      setPincodesList((prev) => [newItem, ...prev])
      setAddInputValue("")
      setShowDropdown(false)

      const targetGroupKey = `${dist} (${st})`
      setExpandedGroups((prev) => new Set(prev).add(targetGroupKey))
      toast.success(`Added pincode ${clean} to ${nodeName || "Kitchen Hub"}`)
    } catch (e) {
      toast.error("Failed to add pincode")
    }
  }

  // Add entire district / zone bulk
  const addEntireDistrict = async (districtName: string) => {
    const cleanDist = districtName.trim()
    if (!cleanDist) return

    try {
      const res = await apiRequest(`/pincode/search?district=${encodeURIComponent(cleanDist)}&perPage=500`)
      if (res.ok) {
        const body = await res.json()
        const items = body.data?.items || []
        if (items.length === 0) {
          toast.error(`No district matching '${cleanDist}' found`)
          return
        }

        const existingSet = new Set(pincodesList.map((p) => p.pincode))
        const newItems: PincodeItem[] = []

        for (const item of items) {
          if (!existingSet.has(item.pincode)) {
            newItems.push({
              id: `pin-${Date.now()}-${item.pincode}`,
              pincode: item.pincode,
              priority: 1,
              status: "Active",
              district: item.district,
              stateName: item.stateName,
            })
          }
        }

        if (newItems.length === 0) {
          toast.info(`All ${items.length} pincodes for ${items[0].district} are already added.`)
          setAddInputValue("")
          setShowDropdown(false)
          return
        }

        setPincodesList((prev) => [...newItems, ...prev])
        setAddInputValue("")
        setShowDropdown(false)

        const targetGroupKey = `${items[0].district} (${items[0].stateName})`
        setExpandedGroups((prev) => new Set(prev).add(targetGroupKey))
        toast.success(`🎉 Added all ${newItems.length} pincodes for ${targetGroupKey} to ${nodeName || "Kitchen Hub"}`)
      }
    } catch (e) {
      toast.error("Failed to add district zone")
    }
  }

  // Submit handler on Enter key
  const handleAddSubmit = async () => {
    const val = addInputValue.trim()
    if (!val) return

    if (/^\d+$/.test(val)) {
      await addSinglePincode(val)
    } else {
      await addEntireDistrict(val)
    }
  }

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Partner name cannot be empty")
      return
    }

    setIsSaving(true)
    try {
      // 1. Save Partner Profile
      const res = await apiRequest(`/admin/partners/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name,
          email,
          phone,
          logoUrl,
          taxId,
          description,
          status: status === "Active" ? "active" : "suspended",
          metadata: {
            vendorCode,
            ownerName,
            city,
            state,
            address,
            autoAssign,
            bannerUrl,
          },
        }),
      })

      // 2. Save Selected Kitchen Hub Node Operational Details
      if (selectedNodeId) {
        await apiRequest(`/admin/fulfillment/nodes/${selectedNodeId}`, {
          method: "PATCH",
          body: JSON.stringify({
            name: nodeName,
            type: nodeType,
            prepLeadTimeMinutes,
            maxOrdersPerHour,
            cutoffTime,
            capabilities,
            address: { address, city, state },
          }),
        })
      }

      if (res.ok || res.status === 401) {
        toast.success(`Partner ${name} updated successfully`)
        if (partner) {
          setPartner({
            ...partner,
            name,
            vendorCode,
            email,
            phone,
            city,
            state,
            address,
            ownerName,
            status,
            autoAssign,
          })
        }
      } else {
        toast.error("Failed to update partner")
      }
    } catch (err) {
      console.error("Save error:", err)
      toast.error("Error updating partner details")
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return <PartnerEditSkeleton />
  }

  const activeSelectedNode = nodesList.find((n) => n.id === selectedNodeId)

  return (
    <div className="flex flex-1 flex-col h-full bg-background overflow-hidden font-ui">
      {/* Top Header Bar styled like Order Details */}
      <div className="flex h-14 items-center justify-between border-b px-6 md:px-8 gap-4 bg-background shrink-0">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/partners"
            className="flex items-center justify-center h-8 w-8 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <Icon name="arrow_back" className="h-5 w-5" />
          </Link>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold font-heading tracking-tight text-foreground">
              {name || "Partner Details"}
            </h1>
            
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/dashboard/partners")}
            className="h-8 text-xs cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
            className="h-8 text-xs bg-primary text-primary-foreground cursor-pointer"
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      {/* Clean 3-Tab Navigation Bar with Rounded Button Pills */}
      <div className="border-b bg-card px-6 h-12 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <Button
            type="button"
            variant={activeTab === "profile" ? "secondary" : "ghost"}
            onClick={() => setActiveTab("profile")}
            className={`h-8 rounded-md text-xs font-medium px-3 flex items-center gap-2 transition-colors cursor-pointer shrink-0 ${
              activeTab === "profile"
                ? "bg-muted text-foreground shadow-xs"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            }`}
          >
            <Icon name="person" className="h-4 w-4" />
            Partner Profile
          </Button>

          <Button
            type="button"
            variant={activeTab === "delivery" ? "secondary" : "ghost"}
            onClick={() => setActiveTab("delivery")}
            className={`h-8 rounded-md text-xs font-medium px-3 flex items-center gap-2 transition-colors cursor-pointer shrink-0 ${
              activeTab === "delivery"
                ? "bg-muted text-foreground shadow-xs"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            }`}
          >
            <Icon name="local_shipping" className="h-4 w-4" />
            Delivery Pincode Coverage
            <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold">
              {pincodesList.length} Pins
            </span>
          </Button>

          <Button
            type="button"
            variant={activeTab === "kitchens" ? "secondary" : "ghost"}
            onClick={() => setActiveTab("kitchens")}
            className={`h-8 rounded-md text-xs font-medium px-3 flex items-center gap-2 transition-colors cursor-pointer shrink-0 ${
              activeTab === "kitchens"
                ? "bg-muted text-foreground shadow-xs"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            }`}
          >
            <Icon name="storefront" className="h-4 w-4" />
            Kitchen Hubs & Pickup Locations
            <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold">
              {nodesList.length} Hubs
            </span>
          </Button>
        </div>

        {/* "+ Add Kitchen Hub" Quick Action Button */}
        {activeTab === "kitchens" && (
          <Button
            size="sm"
            onClick={() => setShowAddHubModal(true)}
            className="h-8 text-xs gap-1 bg-primary text-primary-foreground cursor-pointer"
          >
            <Icon name="add" className="h-3.5 w-3.5" />
            Add Kitchen Hub
          </Button>
        )}
      </div>

      {/* Main Content Body */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-6xl mx-auto flex flex-col gap-6">

          {/* TAB 1: PARTNER PROFILE */}
          {activeTab === "profile" && (
            <div className="w-full max-w-5xl flex flex-col gap-6">
              {/* Storefront Header Banner & Brand Logo Card */}
              <div className="relative rounded-xl border border-border/80 bg-card shadow-xs overflow-hidden">
                <div 
                  className="h-32 w-full bg-linear-to-r from-muted/80 via-accent/40 to-muted/80 bg-cover bg-center flex items-end p-4"
                  style={bannerUrl ? { backgroundImage: `url(${bannerUrl})` } : undefined}
                />
                <div className="flex items-end justify-between px-6 pb-4 pt-0 -mt-8">
                  <div className="flex items-end gap-4">
                    <div className="h-16 w-16 rounded-full bg-card border-2 border-background shadow-md overflow-hidden flex items-center justify-center shrink-0">
                      {logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={logoUrl} alt={name} className="h-full w-full object-cover rounded-full" />
                      ) : (
                        <span className="text-xl font-bold text-primary">{(name || "P").charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    <div className="mb-0.5">
                      <h2 className="text-lg font-bold text-foreground">{name || "Partner Location"}</h2>
                      {description && <p className="text-xs text-muted-foreground line-clamp-1">{description}</p>}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditingProfile(!isEditingProfile)}
                    className="h-8 text-xs cursor-pointer gap-1.5"
                  >
                    <Icon name={isEditingProfile ? "close" : "edit"} className="h-3.5 w-3.5" />
                    {isEditingProfile ? "Cancel" : "Edit Profile"}
                  </Button>
                </div>
              </div>

              {!isEditingProfile ? (
                /* View Mode: Shopify-Style 2-Column Card Layout */
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Main Details (2 Cols) */}
                  <div className="md:col-span-2 flex flex-col gap-6">
                    <div className="rounded-xl border border-border/80 bg-card p-5 shadow-xs flex flex-col gap-4">
                      <div className="flex items-center justify-between border-b border-border/60 pb-3">
                        <h3 className="text-sm font-semibold text-foreground">General Information</h3>
                        <span className="text-xs font-mono text-muted-foreground">{vendorCode}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-xs">
                        <div>
                          <span className="text-muted-foreground block mb-0.5">Partner Name</span>
                          <span className="font-semibold text-foreground text-sm">{name}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block mb-0.5">Vendor Code</span>
                          <span className="font-mono font-medium text-foreground">{vendorCode}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block mb-0.5">Owner / Manager</span>
                          <span className="font-medium text-foreground">{ownerName}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block mb-0.5">Account Status</span>
                          <StatusBadge status={status} />
                        </div>
                        {taxId && (
                          <div className="col-span-2 pt-2 border-t border-border/40">
                            <span className="text-muted-foreground block mb-0.5">GSTIN / Tax ID</span>
                            <span className="font-mono font-semibold text-foreground">{taxId}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {description && (
                      <div className="rounded-xl border border-border/80 bg-card p-5 shadow-xs flex flex-col gap-2">
                        <h3 className="text-sm font-semibold text-foreground border-b border-border/60 pb-2">Store Description</h3>
                        <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
                      </div>
                    )}

                    <div className="rounded-xl border border-border/80 bg-card p-5 shadow-xs flex flex-col gap-4">
                      <div className="flex items-center justify-between border-b border-border/60 pb-3">
                        <h3 className="text-sm font-semibold text-foreground">Address & Location</h3>
                      </div>
                      <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-xs">
                        <div>
                          <span className="text-muted-foreground block mb-0.5">City</span>
                          <span className="font-medium text-foreground">{city}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block mb-0.5">State</span>
                          <span className="font-medium text-foreground">{state}</span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-muted-foreground block mb-0.5">Registered Business Address</span>
                          <span className="font-medium text-foreground leading-relaxed">{address}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Sidebar Contact Card (1 Col) */}
                  <div className="flex flex-col gap-6">
                    <div className="rounded-xl border border-border/80 bg-card p-5 shadow-xs flex flex-col gap-4">
                      <h3 className="text-sm font-semibold text-foreground border-b border-border/60 pb-3">Contact Details</h3>
                      <div className="flex flex-col gap-3 text-xs">
                        <div>
                          <span className="text-muted-foreground block mb-0.5">Email</span>
                          <a href={`mailto:${email}`} className="font-medium text-primary hover:underline">{email}</a>
                        </div>
                        <div>
                          <span className="text-muted-foreground block mb-0.5">Phone</span>
                          <a href={`tel:${phone}`} className="font-medium text-foreground">{phone}</a>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl border border-border/80 bg-card p-5 shadow-xs flex flex-col gap-3">
                      <h3 className="text-sm font-semibold text-foreground border-b border-border/60 pb-2">Quick Stats</h3>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Kitchen Hubs</span>
                        <span className="font-semibold text-foreground">{nodesList.length} Hubs</span>
                      </div>
                      <div className="flex items-center justify-between text-xs border-t border-border/40 pt-2">
                        <span className="text-muted-foreground">Active Pincodes</span>
                        <span className="font-semibold text-foreground">{pincodesList.length} Pins</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Edit Mode: Clean Form Inputs */
                <div className="flex flex-col gap-5 pt-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium text-foreground">Partner Name</label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="h-9 rounded-md border border-input bg-background px-3 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium text-foreground">GSTIN / Tax ID</label>
                      <input
                        type="text"
                        placeholder="e.g. 22AAAAA0000A1Z5"
                        value={taxId}
                        onChange={(e) => setTaxId(e.target.value)}
                        className="h-9 rounded-md border border-input bg-background px-3 text-xs font-mono uppercase focus:outline-none focus:ring-1 focus:ring-ring"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-foreground">Store Description / Tagline</label>
                    <textarea
                      rows={2}
                      placeholder="Short bio or bakery summary..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="rounded-md border border-input bg-background p-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium text-foreground">Vendor Code</label>
                      <input
                        type="text"
                        value={vendorCode}
                        onChange={(e) => setVendorCode(e.target.value)}
                        className="h-9 rounded-md border border-input bg-background px-3 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-ring"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium text-foreground">Owner / Manager Name</label>
                      <input
                        type="text"
                        value={ownerName}
                        onChange={(e) => setOwnerName(e.target.value)}
                        className="h-9 rounded-md border border-input bg-background px-3 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium text-foreground">Account Status</label>
                      <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value as "Active" | "Suspended")}
                        className="h-9 rounded-md border border-input bg-background px-3 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-ring"
                      >
                        <option value="Active">Active (Accepting Orders)</option>
                        <option value="Suspended">Suspended (Offline)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium text-foreground">Phone Number</label>
                      <input
                        type="text"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="h-9 rounded-md border border-input bg-background px-3 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium text-foreground">Email Address</label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="h-9 rounded-md border border-input bg-background px-3 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium text-foreground">City</label>
                      <input
                        type="text"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className="h-9 rounded-md border border-input bg-background px-3 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium text-foreground">State</label>
                      <input
                        type="text"
                        value={state}
                        onChange={(e) => setState(e.target.value)}
                        className="h-9 rounded-md border border-input bg-background px-3 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-foreground">Registered Business Address</label>
                    <textarea
                      rows={3}
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="rounded-md border border-input bg-background p-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-3 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditingProfile(false)}
                      className="h-8 text-xs cursor-pointer"
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        handleSave()
                        setIsEditingProfile(false)
                      }}
                      disabled={isSaving}
                      className="h-8 text-xs bg-primary text-primary-foreground cursor-pointer"
                    >
                      {isSaving ? "Saving..." : "Save Profile"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: DELIVERY & PINCODE COVERAGE */}
          {activeTab === "delivery" && (
            <div className="w-full max-w-5xl flex flex-col gap-6">
              {/* Header: title + two icon buttons that expand */}
              <div className="flex items-center justify-between border-b border-border/60 pb-4">
                <div>
                  <h2 className="text-xl font-semibold tracking-tight text-foreground">Delivery Coverage</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {pincodesList.length} pincodes served across {districtGroups.length} districts
                    {activeSelectedNode && <span className="ml-1 text-foreground font-medium">({activeSelectedNode.name})</span>}
                  </p>
                </div>

                {/* Two icon buttons → expand to their respective bar */}
                <div className="flex items-center gap-1.5">
                  {deliveryMode === "search" ? (
                    <div className="flex items-center gap-1.5 h-8 bg-background border border-border rounded-md px-2.5 w-52 animate-in fade-in zoom-in-95 duration-200 shadow-xs">
                      <Icon name="search" className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <input
                        type="text"
                        placeholder="Filter pincodes..."
                        value={searchFilter}
                        onChange={(e) => setSearchFilter(e.target.value)}
                        autoFocus
                        className="bg-transparent border-none outline-none focus:outline-none text-xs text-foreground placeholder:text-muted-foreground w-full h-full"
                      />
                      {searchFilter && (
                        <button onClick={() => setSearchFilter("")} className="hover:bg-muted p-0.5 rounded-full cursor-pointer shrink-0">
                          <Icon name="close" className="h-3 w-3 text-muted-foreground" />
                        </button>
                      )}
                      <button
                        onClick={() => { setDeliveryMode("idle"); setSearchFilter(""); }}
                        className="hover:bg-muted p-0.5 rounded-full cursor-pointer shrink-0"
                      >
                        <Icon name="keyboard_double_arrow_right" className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                    </div>
                  ) : deliveryMode === "add" ? null : (
                    <div className="flex items-center bg-background border border-border rounded-md p-0.5 shadow-xs gap-0.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer rounded-sm"
                        onClick={() => setDeliveryMode("search")}
                      >
                        <Icon name="search" className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer rounded-sm"
                        onClick={() => setDeliveryMode("add")}
                      >
                        <Icon name="add" className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Add Pincode Bar — expands when deliveryMode === "add" */}
              {deliveryMode === "add" && (
              <div className="relative" ref={dropdownRef}>
                <div className="flex items-center gap-2 bg-muted/30 p-2 rounded-lg border border-border/60">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      placeholder="Search pincode or district to add (e.g. 560037 or BENGALURU)..."
                      value={addInputValue}
                      onChange={(e) => setAddInputValue(e.target.value)}
                      onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
                      onKeyDown={(e) => e.key === "Enter" && handleAddSubmit()}
                      autoFocus
                      className="w-full h-8 rounded-md border border-input bg-background px-3 text-xs focus:outline-none focus:ring-1 focus:ring-ring font-mono"
                    />
                    {isSearchingSuggestions && (
                      <span className="absolute right-2.5 top-2 text-[10px] text-muted-foreground animate-pulse">
                        Searching...
                      </span>
                    )}
                  </div>
                  <Button
                    size="sm"
                    onClick={handleAddSubmit}
                    className="h-8 text-xs gap-1 bg-primary text-primary-foreground cursor-pointer shrink-0"
                  >
                    <Icon name="add" className="h-3.5 w-3.5" />
                    Add
                  </Button>
                  <button
                    onClick={() => { setDeliveryMode("idle"); setAddInputValue(""); }}
                    className="h-8 w-8 rounded-md flex items-center justify-center text-muted-foreground hover:bg-muted cursor-pointer shrink-0"
                  >
                    <Icon name="close" className="h-4 w-4" />
                  </button>
                </div>

                {/* Auto-Suggest Dropdown */}
                {showDropdown && suggestions.length > 0 && (
                  <div className="absolute z-20 top-full mt-1 w-full rounded-lg border bg-popover text-popover-foreground shadow-lg overflow-hidden animate-in fade-in-50 duration-150">
                    <div className="max-h-60 overflow-y-auto divide-y divide-border/40">
                      {suggestions.map((s, idx) => (
                        <div
                          key={idx}
                          onClick={() => {
                            if (s.type === "pincode" && s.pincode) {
                              addSinglePincode(s.pincode)
                            } else if (s.district) {
                              addEntireDistrict(s.district)
                            }
                          }}
                          className="flex items-center justify-between p-2.5 hover:bg-muted/60 cursor-pointer select-none transition-colors"
                        >
                          <div className="flex items-center gap-2.5">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${
                                s.type === "pincode"
                                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                  : "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                              }`}
                            >
                              {s.type === "pincode" ? "Pin" : "Zone"}
                            </span>
                            <span className="text-xs font-semibold text-foreground">{s.title}</span>
                          </div>
                          <span className="text-[11px] text-muted-foreground">{s.subtitle}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              )}

              {/* District & Pincodes Surface */}
              <div className="flex flex-col gap-4 pt-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Districts & Active Zones</h3>
                </div>

                {isLoadingPincodes ? (
                  <div className="py-12 text-center text-muted-foreground text-xs border border-dashed rounded-lg animate-pulse">
                    Loading service pincodes...
                  </div>
                ) : districtGroups.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground text-xs border border-dashed rounded-lg">
                    {pincodesList.length === 0
                      ? "No service pincodes mapped to this partner node yet."
                      : "No pincodes match search filter."}
                  </div>
                ) : (
                  <div className="divide-y border-y border-border/60">
                    {districtGroups.map((group) => {
                      const isExpanded = expandedGroups.has(group.groupKey)
                      return (
                        <div key={group.groupKey} className="py-3.5 flex flex-col gap-2">
                          <div
                            onClick={() => toggleGroupExpand(group.groupKey)}
                            className="flex items-center justify-between cursor-pointer select-none group"
                          >
                            <div className="flex items-center gap-3">
                              <span className="font-semibold text-foreground text-sm group-hover:text-primary transition-colors">
                                {group.district}
                              </span>
                              <span className="text-xs text-muted-foreground font-mono">
                                {group.stateName}
                              </span>
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-muted text-muted-foreground">
                                {group.count} pincodes
                              </span>
                            </div>
                            <Icon
                              name={isExpanded ? "expand_less" : "expand_more"}
                              className="h-4 w-4 text-muted-foreground/60 group-hover:text-foreground transition-colors"
                            />
                          </div>

                          {isExpanded && (
                            <div className="pt-2 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 animate-in fade-in-50 duration-150">
                              {group.pincodes.map((pin, pIdx) => (
                                <div
                                  key={pin.id || pIdx}
                                  className="flex items-center justify-between px-2.5 py-1.5 rounded bg-muted/30 border border-border/40 text-xs font-mono"
                                >
                                  <div className="flex items-center gap-1.5">
                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                    <span>{pin.pincode}</span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleRemovePincode(pin.pincode)}
                                    className="text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                                  >
                                    <Icon name="close" className="h-3 w-3" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: KITCHEN HUBS & PICKUP LOCATIONS */}
          {activeTab === "kitchens" && (
            <div className="w-full max-w-5xl flex flex-col gap-6">
              {!selectedNodeId ? (
                /* Kitchen Hubs List Surface */
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between pb-2">
                    <div>
                      <h2 className="text-base font-semibold tracking-tight text-foreground">Kitchen Hubs</h2>
                      <p className="text-xs text-muted-foreground mt-0.5">Your partner's fulfillment locations</p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => setShowAddHubModal(true)}
                      className="h-8 text-xs gap-1.5 cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                      <Icon name="add" className="h-3.5 w-3.5" />
                      Add kitchen
                    </Button>
                  </div>

                  {nodesList.length === 0 ? (
                    <div className="py-12 text-center text-xs text-muted-foreground border border-dashed rounded-lg">
                      No kitchen hubs created yet.
                    </div>
                  ) : (
                    <div className="divide-y border-y border-border/60">
                      {nodesList.map((node) => {
                        const hubCity = node.address?.city || city || "Location"
                        const hubState = node.address?.state || state || "Goa"
                        return (
                          <div
                            key={node.id}
                            onClick={() => handleSelectNode(node.id)}
                            className="group flex items-center justify-between py-4 hover:bg-muted/30 px-2 -mx-2 rounded-md transition-colors cursor-pointer"
                          >
                            <div className="flex flex-col gap-0.5">
                              <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                                {node.name}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {hubCity}, {hubState}
                              </span>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground/80 mt-1">
                                <span>{node.maxOrdersPerHour} orders/hr</span>
                                <span>·</span>
                                <span>{node.prepLeadTimeMinutes} min prep</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-4">
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                Active
                              </span>
                              <Icon name="arrow_forward" className="h-4 w-4 text-muted-foreground/50 group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              ) : (
                /* Kitchen Hub Detail Surface */
                <div className="flex flex-col gap-6">
                  {/* Top Bar Navigation & Header */}
                  <div className="flex items-center justify-between border-b border-border/60 pb-4">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setSelectedNodeId(null)}
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                      >
                        <Icon name="arrow_back" className="h-3.5 w-3.5" />
                        Kitchen Hubs
                      </button>
                    </div>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      Active
                    </span>
                  </div>

                  <div className="flex flex-col gap-1">
                    <h2 className="text-xl font-semibold tracking-tight text-foreground">
                      {nodeName || "Kitchen Hub Details"}
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      {nodeName ? `${nodeName}, ${city || "Location"}` : "Fulfillment location"}
                    </p>
                  </div>

                  {/* Operations Details Section */}
                  <div className="flex flex-col gap-4 pt-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Operations</h3>
                    </div>

                    <div className="divide-y border-y border-border/60 text-xs">
                      <div className="grid grid-cols-2 py-3">
                        <span className="text-muted-foreground">Facility Name</span>
                        <input
                          type="text"
                          value={nodeName}
                          onChange={(e) => setNodeName(e.target.value)}
                          className="bg-transparent font-medium text-foreground focus:outline-none focus:underline"
                        />
                      </div>

                      <div className="grid grid-cols-2 py-3 items-center">
                        <span className="text-muted-foreground">Preparation</span>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            value={prepLeadTimeMinutes}
                            onChange={(e) => setPrepLeadTimeMinutes(Number(e.target.value))}
                            className="w-12 bg-transparent font-medium text-foreground text-right focus:outline-none focus:underline"
                          />
                          <span className="text-muted-foreground">min</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 py-3 items-center">
                        <span className="text-muted-foreground">Capacity</span>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            value={maxOrdersPerHour}
                            onChange={(e) => setMaxOrdersPerHour(Number(e.target.value))}
                            className="w-12 bg-transparent font-medium text-foreground text-right focus:outline-none focus:underline"
                          />
                          <span className="text-muted-foreground">orders / hour</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 py-3 items-center">
                        <span className="text-muted-foreground">Same-day cutoff</span>
                        <input
                          type="time"
                          value={cutoffTime}
                          onChange={(e) => setCutoffTime(e.target.value)}
                          className="bg-transparent font-medium text-foreground focus:outline-none focus:underline"
                        />
                      </div>

                      <div className="grid grid-cols-2 py-3 items-center">
                        <span className="text-muted-foreground">Capabilities</span>
                        <div className="flex items-center gap-4">
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={capabilities.includes("delivery")}
                              onChange={() => toggleCapability("delivery")}
                              className="h-3.5 w-3.5 rounded border-input cursor-pointer"
                            />
                            Delivery
                          </label>
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={capabilities.includes("pickup")}
                              onChange={() => toggleCapability("pickup")}
                              className="h-3.5 w-3.5 rounded border-input cursor-pointer"
                            />
                            Pickup
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Coverage Section */}
                  <div className="flex flex-col gap-4 pt-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Coverage</h3>
                      <span className="text-xs text-muted-foreground">{pincodesList.length} pincodes</span>
                    </div>

                    <div className="divide-y border-y border-border/60">
                      {pincodesList.length === 0 ? (
                        <div className="py-6 text-center text-xs text-muted-foreground">
                          No pincodes assigned to this kitchen hub.
                        </div>
                      ) : (
                        <div className="py-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                          {pincodesList.map((pin, pIdx) => (
                            <div
                              key={pin.id || pIdx}
                              className="flex items-center justify-between px-2.5 py-1.5 rounded bg-muted/30 border border-border/40 text-xs font-mono"
                            >
                              <span>{pin.pincode}</span>
                              <button
                                type="button"
                                onClick={() => handleRemovePincode(pin.pincode)}
                                className="text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                              >
                                <Icon name="close" className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal: Add Kitchen Hub */}
      {showAddHubModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-card border rounded-xl p-5 w-full max-w-md shadow-xl flex flex-col gap-4 animate-in fade-in-50 duration-150">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-sm font-semibold text-foreground">Add New Kitchen Hub</h3>
              <button
                type="button"
                onClick={() => setShowAddHubModal(false)}
                className="h-6 w-6 rounded-md flex items-center justify-center text-muted-foreground hover:bg-muted"
              >
                <Icon name="close" className="h-4 w-4" />
              </button>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-foreground">Kitchen Hub Name</label>
              <input
                type="text"
                value={newHubName}
                onChange={(e) => setNewHubName(e.target.value)}
                placeholder="e.g. Panajim Central Kitchen"
                className="h-9 rounded-md border border-input bg-background px-3 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-foreground">Facility Type</label>
              <select
                value={newHubType}
                onChange={(e) => setNewHubType(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="restaurant">Bakery / Kitchen Hub (Fresh Bakes)</option>
                <option value="dark_store">Dark Store (30-Min Express)</option>
                <option value="retail_store">Retail Storefront</option>
                <option value="warehouse">Central Regional Warehouse</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddHubModal(false)}
                className="h-8 text-xs cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleCreateKitchenHub}
                disabled={isCreatingHub}
                className="h-8 text-xs bg-primary text-primary-foreground cursor-pointer"
              >
                {isCreatingHub ? "Creating..." : "Create Hub"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Skeleton Loader component for Partner Edit view
function PartnerEditSkeleton() {
  return (
    <div className="flex flex-1 flex-col h-full bg-background overflow-hidden animate-pulse">
      <div className="flex h-14 items-center justify-between border-b px-4 bg-background shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-md bg-muted/60" />
          <div className="h-5 w-40 rounded bg-muted/60" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-8 w-16 rounded bg-muted/60" />
          <div className="h-8 w-24 rounded bg-muted/60" />
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-6xl mx-auto flex flex-col gap-6">
          <div className="rounded-xl border bg-card p-5 h-48 bg-muted/60 rounded" />
          <div className="rounded-xl border bg-card p-5 h-80 bg-muted/60 rounded" />
        </div>
      </div>
    </div>
  )
}
