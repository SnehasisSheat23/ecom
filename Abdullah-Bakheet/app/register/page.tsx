"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Eye, EyeOff, ArrowUpRight } from 'lucide-react';
import { useShop } from '@/context/ShopContext';

export default function RegisterPage() {
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const router = useRouter();
    const { setUser } = useShop();

    const handleRegister = (e: React.FormEvent) => {
        e.preventDefault();
        setUser({ name: 'New User', email: 'user@example.com' });
        router.push('/');
    };

    return (
        <div className="min-h-screen bg-white flex">
            {/* Left Column - Form */}
            <div className="w-full lg:w-1/2 flex flex-col pt-8 pb-12 px-6 sm:px-12 md:px-20 lg:px-24">
                
                <button 
                    onClick={() => router.back()}
                    className="flex items-center gap-2 text-black hover:text-gray-600 transition-colors w-fit mb-12"
                >
                    <ChevronLeft size={18} />
                    <span className="font-medium text-sm">Back</span>
                </button>

                <div className="max-w-md w-full mx-auto flex-1 flex flex-col justify-center">
                    
                    <div className="bg-[#fbdc3c] py-2 px-4 inline-block w-fit mb-6">
                        <h1 className="font-heading text-5xl md:text-6xl uppercase tracking-normal text-black transform scale-y-110 origin-bottom leading-none pt-2">
                            CREATE ACCOUNT
                        </h1>
                    </div>
                    
                    <p className="text-gray-500 mb-10 text-[15px]">
                        Already have an account? <Link href="/login" className="text-black font-bold hover:underline">Sign in</Link>
                    </p>

                    <form onSubmit={handleRegister} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wide">
                                    FIRST NAME
                                </label>
                                <input 
                                    type="text" 
                                    required
                                    className="w-full bg-white border border-gray-200 rounded p-3.5 text-[15px] focus:outline-none focus:border-gray-400 transition-colors"
                                    placeholder="First Name" 
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wide">
                                    LAST NAME
                                </label>
                                <input 
                                    type="text" 
                                    required
                                    className="w-full bg-white border border-gray-200 rounded p-3.5 text-[15px] focus:outline-none focus:border-gray-400 transition-colors"
                                    placeholder="Last Name" 
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wide">
                                EMAIL
                            </label>
                            <input 
                                type="email" 
                                required
                                className="w-full bg-white border border-gray-200 rounded p-3.5 text-[15px] focus:outline-none focus:border-gray-400 transition-colors"
                                placeholder="Email" 
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wide">
                                PASSWORD
                            </label>
                            <div className="relative">
                                <input 
                                    type={showPassword ? "text" : "password"} 
                                    required
                                    className="w-full bg-white border border-gray-200 rounded p-3.5 text-[15px] focus:outline-none focus:border-gray-400 transition-colors pr-10"
                                    placeholder="Password" 
                                />
                                <button 
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wide">
                                CONFIRM PASSWORD
                            </label>
                            <div className="relative">
                                <input 
                                    type={showConfirmPassword ? "text" : "password"} 
                                    required
                                    className="w-full bg-white border border-gray-200 rounded p-3.5 text-[15px] focus:outline-none focus:border-gray-400 transition-colors pr-10"
                                    placeholder="Password" 
                                />
                                <button 
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <div className="pt-6">
                            <button 
                                type="submit"
                                className="w-full bg-[#1a2b25] text-white py-4 rounded-md font-bold text-[13px] uppercase tracking-wide flex justify-center items-center gap-2 hover:bg-black transition-colors group"
                            >
                                CREATE ACCOUNT
                                <ArrowUpRight size={16} className="text-gray-400 group-hover:text-white transition-colors" />
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* Right Column - Image & Testimonial */}
            <div className="hidden lg:flex w-1/2 relative bg-gray-900 overflow-hidden">
                <img 
                    src="https://images.unsplash.com/photo-1586521995568-39abaa0c2311?q=80&w=2000&auto=format&fit=crop" 
                    alt="Riyadh Skyline" 
                    className="absolute inset-0 w-full h-full object-cover opacity-80"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                
                <div className="absolute bottom-12 left-12 right-12">
                    <div className="backdrop-blur-md bg-white/10 border border-white/20 p-10 rounded-xl">
                        <div className="flex justify-between items-start mb-6">
                            <div className="text-white text-6xl font-serif leading-none opacity-80">“</div>
                            <div className="flex gap-1">
                                {[...Array(5)].map((_, i) => (
                                    <svg key={i} width="16" height="16" viewBox="0 0 24 24" fill="#fbdc3c" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                                    </svg>
                                ))}
                            </div>
                        </div>
                        
                        <p className="text-white text-xl md:text-2xl font-medium leading-relaxed mb-10">
                            The platform transformed how we plan and execute our projects. It's like having an extra team member who never sleeps.
                        </p>
                        
                        <div className="flex justify-between items-end">
                            <div>
                                <h4 className="text-white font-bold text-lg">Ritwika Sengupta</h4>
                                <p className="text-gray-300 text-sm">CEO & Founder, ABC Company</p>
                            </div>
                            <div className="flex gap-3">
                                <button className="w-10 h-10 rounded-full border border-white/30 flex items-center justify-center text-white hover:bg-white/10 transition-colors">
                                    <ChevronLeft size={16} />
                                </button>
                                <button className="w-10 h-10 rounded-full border border-white/30 flex items-center justify-center text-white hover:bg-white/10 transition-colors">
                                    <ChevronLeft size={16} className="rotate-180" />
                                </button>
                            </div>
                        </div>

                        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
                            <div className="w-2 h-2 rounded-full bg-white/30"></div>
                            <div className="w-2 h-2 rounded-full bg-white"></div>
                            <div className="w-2 h-2 rounded-full bg-white/30"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
