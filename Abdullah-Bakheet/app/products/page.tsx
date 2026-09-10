import { Suspense } from 'react';
import ProductListing from '@/products/ProductListing';
import ConnectCTA from '@/components/ConnectCTA';

export default function ProductsPage() {
    return (
        <div className="flex flex-col w-full bg-[#fcfcfc]">
            {/* Product Listing / Filters */}
            <Suspense fallback={<div className="w-full py-20 text-center text-gray-500">Loading products...</div>}>
                <ProductListing />
            </Suspense>

            {/* Global Connect CTA */}
            <ConnectCTA />
        </div>
    );
}