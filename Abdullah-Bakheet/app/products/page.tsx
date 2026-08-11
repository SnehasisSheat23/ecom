import ProductsHero from '@/products/ProductsHero';
import ProductListing from '@/products/ProductListing';
import ConnectCTA from '@/components/ConnectCTA';

export default function ProductsPage() {
    return (
        <div className="flex flex-col w-full bg-[#fcfcfc]">

            {/* 1. Products Hero Section */}
            <ProductsHero />

            {/* 2. New Product Listing / Filters */}
            <ProductListing />

            {/* 3. Global Connect CTA */}
            <ConnectCTA />

        </div>
    );
}