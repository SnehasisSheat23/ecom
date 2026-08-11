import { CustomerDetails } from "@/components/customer-details"

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params

  return (
    <div className="flex flex-1 flex-col bg-background/50 min-h-0">
      <CustomerDetails id={resolvedParams.id} />
    </div>
  )
}
