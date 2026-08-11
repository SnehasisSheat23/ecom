// Import your page-specific components
import HeroSection from '@/home/HeroSection';
import ConnectCTA from '@/components/ConnectCTA';
import CategoriesSection from "@/home/CategoriesSection";
import WantToKnowMore from "@/home/WantToKnowMore";
import WhyChooseUs from "@/home/WhyChooseUs";
import PrinciplesSection from "@/home/PrinciplesSection";

export default function Home() {
    return (
        <div className="flex flex-col w-full">
            {/* 1. Render the Hero/About Section */}
            <HeroSection />
            <CategoriesSection />
            <WantToKnowMore/>
            <WhyChooseUs/>
            <PrinciplesSection />
            {/*
          Add other sections here later (e.g., Categories, Products List, etc.)

          <ProductsSection />
      */}

            {/* 2. Render the Connect Call-to-Action right before the footer */}
            <ConnectCTA />
        </div>
    );
}