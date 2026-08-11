import ContactHero from '@/contact/ContactHero';
import ContactForm from '@/contact/ContactForm'; // <-- New import
import ConnectCTA from '@/components/ConnectCTA';

export default function ContactPage() {
    return (
        <div className="flex flex-col w-full bg-[#fcfcfc]">

            {/* 1. Contact Hero Section */}
            <ContactHero />

            {/* 2. Contact Form & Info Grid Section */}
            <ContactForm />

            {/* 3. Global Connect CTA before the footer */}
            <ConnectCTA />

        </div>
    );
}