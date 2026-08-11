import AboutHero from '@/about/AboutHero';
import AboutStory from '@/about/AboutStory';
import AboutWhyWeAreBest from '@/about/AboutWhyWeAreBest';
import AboutPrinciples from '@/about/AboutPrinciples';
import AboutFounder from '@/about/AboutFounder'; // <-- New import
import ConnectCTA from '@/components/ConnectCTA';

export default function AboutPage() {
    return (
        <div className="flex flex-col w-full bg-[#fcfcfc]">

            {/* 1. About Hero Section */}
            <AboutHero />

            {/* 2. About Story Section */}
            <AboutStory />

            {/* 3. Why We Are The Best Section */}
            <AboutWhyWeAreBest />

            {/* 4. Our Principles / Mission Section */}
            <AboutPrinciples />

            {/* 5. Words by Our Founder Section */}
            <AboutFounder />

            {/* 6. Global Connect CTA */}
            <ConnectCTA />

        </div>
    );
}