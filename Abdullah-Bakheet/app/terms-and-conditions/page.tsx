"use client"
import React from 'react';
import ConnectCTA from '@/components/ConnectCTA';

export default function TermsAndConditionsPage() {
    return (
        <div className="w-full bg-brand-gray min-h-screen font-sans py-16">
            <div className="max-w-[900px] mx-auto px-6 md:px-12 bg-white p-8 md:p-12 shadow-sm border border-gray-100 rounded-md">
                
                <div className="text-center mb-12">
                    <div className="bg-[#fbdc3c] py-3 px-8 inline-block">
                        <h1 className="font-heading text-4xl md:text-5xl uppercase tracking-normal text-black transform scale-y-110 origin-bottom leading-none pt-2">
                            OUR TERMS AND CONDITIONS
                        </h1>
                    </div>
                </div>

                <div className="prose max-w-none text-gray-700 text-[14px] leading-relaxed space-y-8">
                    <div>
                        <p className="mb-4">Last Updated: August 5, 2026</p>
                        <p>Welcome to Abdullah Bakheet. These Terms and Conditions ("Terms," "Agreement") govern your access to and use of the website and storefront located at https://www.abdullahbakheettksa.com/ (the "Platform"), operated by Abdullah Bakhaeet ("we," "our," or "us").</p>
                        <p>By accessing, browsing, registering on, or purchasing from our Platform—whether as a customer, visitor, or independent vendor—you agree to be bound by these Terms and our Privacy Policy. If you do not agree, please do not use the Platform.</p>
                    </div>

                    <div>
                        <h2 className="text-lg font-bold text-black uppercase mb-3">1. PLATFORM OVERVIEW & SERVICES</h2>
                        <p className="mb-2">Abdullah Bakheet operates a multi-vendor e-commerce marketplace platform that connects independent artisans, creators, and vendors with consumers seeking curated items, custom keepsakes, and personalized gift hampers.</p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>Role of the Platform: We provide the digital infrastructure, checkout services, and vendor order routing. Independent vendors sell products directly to buyers through the Platform.</li>
                            <li>Eligibility: You must be at least 18 years of age or the legal age of majority in your jurisdiction to create an account or complete transactions.</li>
                        </ul>
                    </div>

                    <div>
                        <h2 className="text-lg font-bold text-black uppercase mb-3">2. USER ACCOUNTS & REGISTRATION</h2>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>Accuracy of Information: You agree to provide accurate, current, and complete information during registration and checkout.</li>
                            <li>Account Security: You are responsible for maintaining the confidentiality of your account credentials and for all activities occurring under your account.</li>
                            <li>Account Termination: We reserve the right to suspend or terminate accounts that violate these Terms, engage in fraudulent activity, or disrupt the marketplace.</li>
                        </ul>
                    </div>

                    <div>
                        <h2 className="text-lg font-bold text-black uppercase mb-3">3. TERMS FOR CUSTOMERS & PURCHASERS</h2>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>Product Personalization: Custom engravings, handwritten notes, and bespoke requests are processed strictly based on the text and details provided by you at checkout. Please review all text carefully before submitting, as custom-made items cannot be returned due to customer typing errors.</li>
                            <li>Pricing & Payments: All prices listed are in the designated applicable currency inclusive of applicable taxes unless stated otherwise. Payments are processed through secure, PCI-DSS compliant third-party payment aggregators.</li>
                            <li>Order Processing & Logistics: Orders involving items from multiple independent vendors may be split and delivered in separate packages. Delivery estimates are indicative and subject to regional courier schedules.</li>
                        </ul>
                    </div>

                    <div>
                        <h2 className="text-lg font-bold text-black uppercase mb-3">4. TERMS FOR THIRD-PARTY VENDORS & ARTISANS</h2>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>Vendor Onboarding & KYC: Independent vendors must complete mandated Know Your Customer (KYC) verification prior to receiving payouts.</li>
                            <li>Fulfillment Standards: Vendors contractually agree to process, pack, and prepare custom and curated orders strictly according to the customer's specifications and platform timeline.</li>
                            <li>Customer Data Restrictions: Vendor partners receive customer identity and shipping information solely for order fulfillment and logistics. Independent marketing to customers using platform-acquired data is strictly prohibited.</li>
                        </ul>
                    </div>

                    <div>
                        <h2 className="text-lg font-bold text-black uppercase mb-3">5. INTELLECTUAL PROPERTY RIGHTS</h2>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>Platform Content: All logos, software, website graphics, text, UI/UX designs, and code on the Platform are the exclusive property of Abdullah Bakheet or its licensors and are protected under copyright and intellectual property laws.</li>
                            <li>User Content & Reviews: By submitting reviews, custom design files, or feedback, you grant us a non-exclusive, royalty-free license to use and display such content solely to fulfill services and promote the platform.</li>
                        </ul>
                    </div>

                    <div>
                        <h2 className="text-lg font-bold text-black uppercase mb-3">6. PROHIBITED CONDUCT</h2>
                        <p className="mb-2">Users and vendors agree NOT to:</p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>Use the Platform for any unlawful purpose or fraudulent activity.</li>
                            <li>Reverse-engineer, scrape, or interfere with the code, infrastructure, or security of https://www.abdullahbakheettksa.com/.</li>
                            <li>Upload or request custom text/engravings that contain defamatory, hate-speech, or infringing content.</li>
                            <li>Circumvent platform transaction systems to conduct off-market deals between buyers and vendors.</li>
                        </ul>
                    </div>

                    <div>
                        <h2 className="text-lg font-bold text-black uppercase mb-3">7. LIMITATION OF LIABILITY & DISCLAIMERS</h2>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>"As-Is" Basis: The Platform and all products offered are provided on an "as-is" and "as-available" basis without warranties of any kind, express or implied.</li>
                            <li>Third-Party Vendor Products: While we verify vendor credentials, Abdullah Bakheet is not liable for minor variations in artisan handcrafted products or carrier delivery delays beyond reasonable control.</li>
                            <li>Cap on Liability: To the maximum extent permitted by law, Abdullah Bakheet's maximum total liability for any claim arising out of your use of the Platform shall not exceed the amount paid for the specific order giving rise to the claim.</li>
                        </ul>
                    </div>

                    <div>
                        <h2 className="text-lg font-bold text-black uppercase mb-3">8. GOVERNING LAW & DISPUTE RESOLUTION</h2>
                        <p>These Terms shall be governed by and construed in accordance with the laws of India. Any disputes arising out of or in connection with these Terms, the Privacy Policy, or platform transactions shall be subject to the exclusive jurisdiction of the competent courts in Navi Mumbai / Mumbai, Maharashtra, India.</p>
                    </div>

                    <div>
                        <h2 className="text-lg font-bold text-black uppercase mb-3">9. AMENDMENTS TO TERMS</h2>
                        <p>We reserve the right to revise these Terms at any time. Updated versions will be published on this page with an updated "Last Updated" date. Continued use of the Platform after changes are posted constitutes acceptance of the modified Terms.</p>
                    </div>

                    <div>
                        <h2 className="text-lg font-bold text-black uppercase mb-3">10. CONTACT INFORMATION</h2>
                        <p className="mb-2">For questions, support, or legal inquiries regarding these Terms and Conditions:</p>
                        <ul className="list-none space-y-1">
                            <li><strong>Business Entity:</strong> Abdullah Bakheet (Operated by Abdullah Bakhaeet)</li>
                            <li><strong>Email:</strong> admin@thetruegift.com</li>
                            <li><strong>Mailing Address:</strong> Koparkhairne, Navi Mumbai, PIN: 400709, Maharashtra, India</li>
                            <li><strong>Platform URL:</strong> https://www.abdullahbakheettksa.com/</li>
                        </ul>
                    </div>
                </div>
            </div>
            
            <div className="mt-16">
                <ConnectCTA />
            </div>
        </div>
    );
}
