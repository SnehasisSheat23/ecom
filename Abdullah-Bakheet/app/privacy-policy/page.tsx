"use client"
import React from 'react';
import ConnectCTA from '@/components/ConnectCTA';

export default function PrivacyPolicyPage() {
    return (
        <div className="w-full bg-brand-gray min-h-screen font-sans py-16">
            <div className="max-w-[900px] mx-auto px-6 md:px-12 bg-white p-8 md:p-12 shadow-sm border border-gray-100 rounded-md">
                
                <div className="text-center mb-12">
                    <div className="bg-[#fbdc3c] py-3 px-8 inline-block">
                        <h1 className="font-heading text-4xl md:text-5xl uppercase tracking-normal text-black transform scale-y-110 origin-bottom leading-none pt-2">
                            OUR PRIVACY POLICY
                        </h1>
                    </div>
                </div>

                <div className="prose max-w-none text-gray-700 text-[14px] leading-relaxed space-y-8">
                    <div>
                        <p className="mb-4">Last Updated: August 5, 2026</p>
                        <p>Welcome to Abdullah Bakheet. At Abdullah Bakheet ("we," "our," or "us"), operated by Abdullah Bakhaeet, we run the storefront accessible via https://www.abdullahbakheettksa.com/ (the "Platform"). We respect your privacy and are committed to protecting the personal data of our customers, visitors, and independent vendors.</p>
                        <p>This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our Platform, purchase curated items, or register as a vendor.</p>
                    </div>

                    <div>
                        <h2 className="text-lg font-bold text-black uppercase mb-3">1. INFORMATION WE COLLECT</h2>
                        <p className="mb-2">We collect information directly from you when you interact with our platform, split into two primary categories:</p>
                        <ul className="list-disc pl-5 space-y-2">
                            <li><strong>For Customers & Visitors:</strong>
                                <ul className="list-[circle] pl-5 mt-1 space-y-1">
                                    <li>Identity & Contact Data: Name, email address, phone number, billing address, and delivery/shipping addresses.</li>
                                    <li>Personalization Data: Custom text, custom engravings, handwritten note requests.</li>
                                    <li>Financial Data: Payment transaction details. Note: We do not store raw credit/debit card numbers. All payments are processed through PCI-DSS compliant secure payment aggregators.</li>
                                    <li>Technical & Usage Data: IP address, browser type, device information, operating system.</li>
                                </ul>
                            </li>
                            <li><strong>For Third-Party Vendors:</strong>
                                <ul className="list-[circle] pl-5 mt-1 space-y-1">
                                    <li>Business Registration Details: Legal business name, entity type, and Certificate of Incorporation.</li>
                                    <li>Identity & Tax Verification: Permanent Account Number (PAN), Goods and Services Tax Identification Number (GSTIN), or Udyam (MSME) certificates.</li>
                                    <li>Financial & Payout Data: Bank account details, IFSC code, account holder name.</li>
                                </ul>
                            </li>
                        </ul>
                    </div>

                    <div>
                        <h2 className="text-lg font-bold text-black uppercase mb-3">2. HOW WE USE YOUR INFORMATION</h2>
                        <p className="mb-2">We process personal data under lawful grounds for the following specific business purposes:</p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>Order & Gift Fulfillment: Processing transactions, orchestrating multi-vendor order routing, and managing delivery logistics.</li>
                            <li>Account & Vendor Management: Managing user accounts, onboarding and verifying third-party vendors.</li>
                            <li>Personalization Services: Sharing custom engraving or gifting instructions with specific artisans.</li>
                            <li>Customer Support: Responding to inquiries, tracking shipments, and resolving delivery issues.</li>
                            <li>Platform Optimization: Improving our UI/UX design, refining vendor catalogs, and monitoring system security.</li>
                            <li>Marketing Communications: Sending curated catalogs, festive updates, and newsletters (only if explicitly opted in).</li>
                        </ul>
                    </div>

                    <div>
                        <h2 className="text-lg font-bold text-black uppercase mb-3">3. SHARING AND THIRD-PARTY DISCLOSURES</h2>
                        <p className="mb-2">In a multi-vendor ecosystem, data must sometimes be shared to fulfill services under strict conditions:</p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>Between Customers and Vendors: When you purchase an artisan item, the independent vendor receives your name, shipping address, phone number, and personalization requests strictly to prepare and pack the item.</li>
                            <li>With Third-Party Service Providers: We share necessary details with trusted logistics partners and payment aggregators.</li>
                            <li>Business Transfers: If Abdullah Bakheet undergoes an organizational restructuring, merger, or acquisition.</li>
                            <li>Legal & Statutory Compliance: We may disclose information if legally required by government bodies or law enforcement agencies.</li>
                        </ul>
                    </div>

                    <div>
                        <h2 className="text-lg font-bold text-black uppercase mb-3">4. DATA SECURITY AND RETENTION</h2>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>Security Measures: We implement rigorous physical, technical, and administrative security protocols (such as SSL/TLS encryption) to defend against unauthorized access.</li>
                            <li>Data Retention: We retain your personal data only as long as necessary to fulfill the purposes outlined in this policy.</li>
                        </ul>
                    </div>

                    <div>
                        <h2 className="text-lg font-bold text-black uppercase mb-3">5. YOUR LEGAL RIGHTS</h2>
                        <p className="mb-2">Depending on your engagement with our platform, you hold the following rights regarding your personal data:</p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>Right to Access & Rectification: Review, update, or correct your identity, tax, delivery, or financial details.</li>
                            <li>Right to Erasure ("Right to be Forgotten"): Request the deletion of your account and related data.</li>
                            <li>Right to Withdraw Consent: Withdraw consent for data processing at any time via the unsubscribe links.</li>
                        </ul>
                    </div>

                    <div>
                        <h2 className="text-lg font-bold text-black uppercase mb-3">6. COOKIES AND TRACKING TECHNOLOGIES</h2>
                        <p>Our Platform utilizes cookies and similar tracking technologies to recall your preferences, maintain active shopping cart items, track analytics, and secure your session. You can configure your browser to reject cookies, though doing so may prevent certain interactive elements of the Platform from functioning correctly.</p>
                    </div>

                    <div>
                        <h2 className="text-lg font-bold text-black uppercase mb-3">7. CHANGES TO THIS PRIVACY POLICY</h2>
                        <p>We reserve the right to modify or replace this Privacy Policy at any time. When updates are published, the "Last Updated" date at the top of the policy will be modified. We encourage you to review this policy periodically to stay informed about how we safeguard your data.</p>
                    </div>

                    <div>
                        <h2 className="text-lg font-bold text-black uppercase mb-3">8. GRIEVANCE REDRESSAL & CONTACT INFORMATION</h2>
                        <p className="mb-2">If you have questions regarding this Privacy Policy, wish to exercise your legal rights, or have a complaint regarding data handling, please contact our designated Grievance Officer:</p>
                        <ul className="list-none space-y-1">
                            <li><strong>Company Name:</strong> Abdullah Bakheet</li>
                            <li><strong>Primary Contact:</strong> Abdullah Bakhaeet</li>
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
