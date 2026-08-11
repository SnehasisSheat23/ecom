"use client"
import React from 'react';
import ConnectCTA from '@/components/ConnectCTA';

export default function CookiePolicyPage() {
    return (
        <div className="w-full bg-brand-gray min-h-screen font-sans py-16">
            <div className="max-w-[900px] mx-auto px-6 md:px-12 bg-white p-8 md:p-12 shadow-sm border border-gray-100 rounded-md">
                
                <div className="text-center mb-12">
                    <div className="bg-[#fbdc3c] py-3 px-8 inline-block">
                        <h1 className="font-heading text-4xl md:text-5xl uppercase tracking-normal text-black transform scale-y-110 origin-bottom leading-none pt-2">
                            COOKIE POLICY
                        </h1>
                    </div>
                </div>

                <div className="prose max-w-none text-gray-700 text-[14px] leading-relaxed space-y-8">
                    <div>
                        <p className="mb-4">Last Updated: August 5, 2026</p>
                        <p>At Abdullah Bakheet ("we," "our," or "us"), accessible via https://www.abdullahbakheettksa.com/ (the "Platform"), operated by Abdullah Bakhaeet, we use cookies and similar tracking technologies to enhance your experience, maintain active sessions, and analyze platform traffic.</p>
                        <p>This Cookie Policy explains what cookies are, how we use them, and your choices regarding cookie management.</p>
                    </div>

                    <div>
                        <h2 className="text-lg font-bold text-black uppercase mb-3">1. WHAT ARE COOKIES?</h2>
                        <p>Cookies are small text files that are stored on your device (computer, smartphone, or tablet) when you visit a website. They allow the Platform to remember your actions, choices, and preferences (such as login sessions, shopping cart contents, and language settings) over time, so you do not have to re-enter them whenever you return to the site or navigate between pages.</p>
                    </div>

                    <div>
                        <h2 className="text-lg font-bold text-black uppercase mb-3">2. HOW WE USE COOKIES</h2>
                        <p className="mb-2">We use cookies and related technologies for several essential and analytical functions across our multi-vendor marketplace:</p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>Strictly Necessary Cookies: Essential for the core operation of our Platform. They enable secure user login, maintain active shopping carts, route orders correctly between vendors, and secure checkout transactions.</li>
                            <li>Performance & Analytics Cookies: Collect aggregated, non-personally identifiable information about how visitors interact with our Platform (e.g., pages visited, loading speeds, and site navigation errors). This helps us improve UI/UX design and overall site functionality.</li>
                            <li>Functionality Cookies: Allow the Platform to remember choices you make (such as custom personalization inputs, location, or vendor search filters) to provide a tailored user experience.</li>
                            <li>Security Cookies: Assist in detecting fraud, preventing unauthorized access, and enforcing security protocols across user and vendor accounts.</li>
                        </ul>
                    </div>

                    <div>
                        <h2 className="text-lg font-bold text-black uppercase mb-3">3. THIRD-PARTY COOKIES</h2>
                        <p className="mb-2">In addition to our first-party cookies, trusted third-party partners may place cookies on your device when you interact with our Platform:</p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>Payment Services: PCI-DSS compliant payment aggregators use security cookies to verify transactions and prevent payment fraud.</li>
                            <li>Analytics Providers: Tools like Google Analytics may store cookies to provide us with insights into platform usage patterns.</li>
                            <li>Embedded Media & Plugins: Features provided by third parties (such as video players or social media sharing controls) may set cookies according to their independent privacy policies.</li>
                        </ul>
                    </div>

                    <div>
                        <h2 className="text-lg font-bold text-black uppercase mb-3">4. YOUR COOKIE CHOICES & CONTROL</h2>
                        <p className="mb-2">You have the right to accept, refuse, or manage cookie settings on your browser at any time:</p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>Browser Controls: You can modify your web browser settings to block or delete cookies. Most browsers allow you to manage settings for first-party vs. third-party cookies.
                                <ul className="list-[circle] pl-5 mt-1">
                                    <li>Note: Disabling or refusing strictly necessary cookies may impact platform functionality, such as maintaining items in your cart or completing purchases.</li>
                                </ul>
                            </li>
                            <li>Mobile Settings: Mobile operating systems provide options to opt out of interest-based advertising or reset advertising identifiers in your device settings.</li>
                        </ul>
                    </div>

                    <div>
                        <h2 className="text-lg font-bold text-black uppercase mb-3">5. UPDATES TO THIS COOKIE POLICY</h2>
                        <p>We may update this Cookie Policy periodically to reflect operational, legal, or regulatory changes. The "Last Updated" date at the top of this policy indicates when the latest modifications were published.</p>
                    </div>

                    <div>
                        <h2 className="text-lg font-bold text-black uppercase mb-3">6. CONTACT INFORMATION</h2>
                        <p className="mb-2">If you have questions or concerns regarding our use of cookies and tracking technologies, please contact us:</p>
                        <ul className="list-none space-y-1">
                            <li><strong>Company Name:</strong> Abdullah Bakheet (Operated by Abdullah Bakhaeet)</li>
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
