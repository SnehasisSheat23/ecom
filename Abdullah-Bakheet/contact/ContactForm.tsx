'use client';

import { MapPinIcon, PhoneIcon, MailboxIcon, ClockIcon, ArrowUpRightIcon } from 'lucide-animated';
import { useShop } from '@/context/ShopContext';

export default function ContactForm() {
    const { language } = useShop();
    const isArabic = language.startsWith('Arabic');

    return (
        <section className="w-full bg-brand-gray py-16 md:py-10 font-sans">
            <div className="max-w-[1100px] mx-auto px-4 md:px-8 flex flex-col items-center">

                {/* Title Section */}
                <div className="font-heading flex flex-wrap items-center justify-center gap-x-4 gap-y-2 mb-12 md:mb-16">
                    <h2 className={`text-5xl md:text-6xl lg:text-[110px] uppercase text-[#1a2b25] leading-none tracking-wide scale-y-110 transform origin-bottom text-center ${isArabic ? 'font-sans font-black tracking-tight scale-y-100' : ''}`}>
                        {isArabic ? 'يرجى تعبئة' : 'Please Fill The'}
                    </h2>
                    <div className="bg-[#fbdc3c] px-4 md:px-6 pt-2 pb-1">
                        <h2 className={`text-5xl md:text-6xl lg:text-[110px] uppercase text-[#1a2b25] leading-none tracking-wide scale-y-110 transform origin-bottom ${isArabic ? 'font-sans font-black tracking-tight scale-y-100' : ''}`}>
                            {isArabic ? 'النموذج' : 'Form'}
                        </h2>
                    </div>
                </div>

                {/* Form and Image Container */}
                <div className="w-full bg-white shadow-[0_4px_30px_-10px_rgba(0,0,0,0.08)] p-6 md:p-10 flex flex-col lg:flex-row gap-8 lg:gap-12 mb-8 border border-gray-50">

                    {/* Left Form Area */}
                    <div className="w-full lg:w-1/2 flex flex-col gap-5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                            <div className="flex flex-col gap-1.5">
                                <label className={`text-[10px] font-bold text-gray-400 uppercase tracking-widest ${isArabic ? 'text-right' : 'text-left'}`}>
                                    {isArabic ? 'الاسم الأول' : 'First Name'}
                                </label>
                                <input
                                    type="text"
                                    placeholder={isArabic ? 'أدخل الاسم الأول' : 'abc'}
                                    className={`w-full border border-gray-200 px-4 py-3 text-sm text-black outline-none focus:border-[#1a2b25] transition-colors ${isArabic ? 'text-right' : 'text-left'}`}
                                />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className={`text-[10px] font-bold text-gray-400 uppercase tracking-widest ${isArabic ? 'text-right' : 'text-left'}`}>
                                    {isArabic ? 'اسم العائلة' : 'Last Name'}
                                </label>
                                <input
                                    type="text"
                                    placeholder={isArabic ? 'أدخل اسم العائلة' : 'abc'}
                                    className={`w-full border border-gray-200 px-4 py-3 text-sm text-black outline-none focus:border-[#1a2b25] transition-colors ${isArabic ? 'text-right' : 'text-left'}`}
                                />
                            </div>
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className={`text-[10px] font-bold text-gray-400 uppercase tracking-widest ${isArabic ? 'text-right' : 'text-left'}`}>
                                {isArabic ? 'البريد الإلكتروني' : 'Email'}
                            </label>
                            <input
                                type="email"
                                placeholder={isArabic ? 'example@domain.com' : 'abc'}
                                className={`w-full border border-gray-200 px-4 py-3 text-sm text-black outline-none focus:border-[#1a2b25] transition-colors ${isArabic ? 'text-right' : 'text-left'}`}
                            />
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className={`text-[10px] font-bold text-gray-400 uppercase tracking-widest ${isArabic ? 'text-right' : 'text-left'}`}>
                                {isArabic ? 'رقم الهاتف' : 'Phone'}
                            </label>
                            <input
                                type="tel"
                                placeholder={isArabic ? '+966 5X XXX XXXX' : 'abc'}
                                className={`w-full border border-gray-200 px-4 py-3 text-sm text-black outline-none focus:border-[#1a2b25] transition-colors ${isArabic ? 'text-right' : 'text-left'}`}
                            />
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className={`text-[10px] font-bold text-gray-400 uppercase tracking-widest ${isArabic ? 'text-right' : 'text-left'}`}>
                                {isArabic ? 'الشركة / التفاصيل' : 'Company'}
                            </label>
                            <textarea
                                placeholder={isArabic ? 'اكتب تفاصيل طلبك هنا...' : 'abc'}
                                rows={4}
                                className={`w-full border border-gray-200 px-4 py-3 text-sm text-black outline-none focus:border-[#1a2b25] transition-colors resize-none ${isArabic ? 'text-right' : 'text-left'}`}
                            ></textarea>
                        </div>

                        <button className="w-full bg-[#1a2b25] text-white py-4 mt-2 flex items-center justify-center gap-3 hover:bg-black transition-colors group">
                            <span className="text-sm font-semibold tracking-wide">
                                {isArabic ? 'إرسال الطلب' : 'SUBMIT RESPONSE'}
                            </span>
                            <ArrowUpRightIcon size={18} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                        </button>
                    </div>

                    {/* Right Image Area */}
                    <div className="w-full lg:w-1/2 h-[400px] lg:h-auto bg-gray-100 relative overflow-hidden group">
                        <img
                            src="https://www.dropbox.com/scl/fi/vbw7zvz40bpyvp0rhmzog/7dfedd5318a6dcc977273869f52740a1cdf8731b.jpg?rlkey=bt4bn1k4vkf8ax96pnvpmkf3d&st=xx3jr8z6&raw=1"
                            alt={isArabic ? "موقع المكتب" : "Office Location"}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                        />

                        {/* Overlay Glassmorphism Box */}
                        <div className="absolute bottom-6 left-6 right-6 bg-black/50 backdrop-blur-md p-5 border border-white/10 text-white">
                            <div className={`flex items-center gap-2 mb-2 ${isArabic ? 'flex-row-reverse text-right' : ''}`}>
                                <MapPinIcon size={18} className="text-white" />
                                <h4 className="font-bold text-base tracking-wide">{isArabic ? 'موقع المكتب الرئيس' : 'Office Location'}</h4>
                            </div>
                            <p className={`text-[13px] text-gray-200 leading-relaxed font-medium ${isArabic ? 'text-right' : 'text-left'}`}>
                                {isArabic ? 'الرياض، المملكة العربية السعودية' : 'Riyadh, Kingdom of Saudi Arabia'}
                            </p>
                        </div>
                    </div>

                </div>

                {/* Contact Info Cards */}
                <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mt-4">

                    {/* Location Card */}
                    <div className="bg-white shadow-[0_4px_20px_-10px_rgba(0,0,0,0.06)] p-8 flex flex-col items-start border border-gray-50 hover:-translate-y-1 transition-transform duration-300">
                        <div className="mb-8 text-black">
                            <MapPinIcon size={24} />
                        </div>
                        <h3 className={`font-heading text-3xl md:text-5xl uppercase text-black leading-none tracking-wide scale-y-110 transform origin-bottom mb-6 ${isArabic ? 'font-sans font-black tracking-tight scale-y-100' : ''}`}>
                            {isArabic ? 'الموقع' : 'Location'}
                        </h3>
                        <p className={`text-[15px] text-gray-500 font-medium leading-relaxed ${isArabic ? 'text-right' : 'text-left'}`}>
                            {isArabic ? <>الرياض،<br />المملكة العربية السعودية</> : <>Riyadh,<br />Saudi Arabia</>}
                        </p>
                    </div>

                    {/* Phone Card */}
                    <div className="bg-white shadow-[0_4px_20px_-10px_rgba(0,0,0,0.06)] p-8 flex flex-col items-start border border-gray-50 hover:-translate-y-1 transition-transform duration-300">
                        <div className="mb-8 text-black">
                            <PhoneIcon size={24} />
                        </div>
                        <h3 className={`font-heading text-3xl md:text-5xl uppercase text-black leading-none tracking-wide scale-y-110 transform origin-bottom mb-6 ${isArabic ? 'font-sans font-black tracking-tight scale-y-100' : ''}`}>
                            {isArabic ? 'الهاتف' : 'Phone'}
                        </h3>
                        <p className={`text-[15px] text-gray-500 font-medium leading-relaxed ${isArabic ? 'text-right' : 'text-left'}`}>
                            +966 11 2094636 , +966<br />9200 15884
                        </p>
                    </div>

                    {/* Email Card */}
                    <div className="bg-white shadow-[0_4px_20px_-10px_rgba(0,0,0,0.06)] p-8 flex flex-col items-start border border-gray-50 hover:-translate-y-1 transition-transform duration-300">
                        <div className="mb-8 text-black">
                            <MailboxIcon size={24} />
                        </div>
                        <h3 className={`font-heading text-3xl md:text-5xl uppercase text-black leading-none tracking-wide scale-y-110 transform origin-bottom mb-6 ${isArabic ? 'font-sans font-black tracking-tight scale-y-100' : ''}`}>
                            {isArabic ? 'البريد الإلكتروني' : 'Email'}
                        </h3>
                        <p className="text-[15px] text-gray-500 font-medium leading-relaxed">
                            contact@abdullahbakhe<br/>etksa.com
                        </p>
                    </div>

                    {/* Timing Card */}
                    <div className="bg-white shadow-[0_4px_20px_-10px_rgba(0,0,0,0.06)] p-8 flex flex-col items-start border border-gray-50 hover:-translate-y-1 transition-transform duration-300">
                        <div className="mb-8 text-black">
                            <ClockIcon size={24} />
                        </div>
                        <h3 className={`font-heading text-3xl md:text-5xl uppercase text-black leading-none tracking-wide scale-y-110 transform origin-bottom mb-6 ${isArabic ? 'font-sans font-black tracking-tight scale-y-100' : ''}`}>
                            {isArabic ? 'أوقات العمل' : 'Timing'}
                        </h3>
                        <p className={`text-[15px] text-gray-500 font-medium leading-relaxed ${isArabic ? 'text-right' : 'text-left'}`}>
                            {isArabic ? <>صباحًا 10:00 إلى<br />مساءً 7:00</> : <>Morning 10 : 00 AM to<br />Evening 7 : 00 PM</>}
                        </p>
                    </div>

                </div>

            </div>
        </section>
    );
}