// Arabic and English translations for Home components
export interface HomeTranslation {
    hero: {
        firstName: string;
        lastName: string;
        tagline: string;
        description: string;
        knowMore: string;
        imgAlt1: string;
        imgAlt2: string;
        imgAlt3: string;
    };
    categories: {
        title: string;
        happyCustomers: string;
        productsSupplied: string;
        seeMore: string;
        list: {
            ketchup: string;
            vinegar: string;
            pickles: string;
            cannedVeg: string;
            oils: string;
            sauces: string;
        };
        cards: {
            frenchFriesTitle: string;
            frenchFriesDesc: string;
            dryCondimentsTitle: string;
            dryCondimentsDesc: string;
            frozenItemsTitle: string;
            frozenItemsDesc: string;
            seasoningsTitle: string;
            seasoningsDesc: string;
        };
    };
    wantToKnowMore: {
        wantTo: string;
        know: string;
        more: string;
        companyName: string;
        description: string;
        viewProducts: string;
    };
    whyChooseUs: {
        titleLine1: string;
        titleLine2: string;
        companyName: string;
        description: string;
        yearsExpVal: string;
        yearsExpLabelLine1: string;
        yearsExpLabelLine2: string;
        productsVal: string;
        productsLabelLine1: string;
        productsLabelLine2: string;
        knowMore: string;
        featured: string;
        feature1Title: string;
        feature1Desc: string;
        feature2Title: string;
        feature2Desc: string;
        feature3Title: string;
        feature3Desc: string;
    };
    principles: {
        titleLine1: string;
        titleLine2: string;
        description: string;
        knowMore: string;
        ourMission: string;
        missionDescription: string;
    };
    connectCTA: {
        anyDoubt: string;
        doubtDescription: string;
        contactUs: string;
        letsConnect: string;
        andTalk: string;
        firstNameBadge: string;
        lastNameBadge: string;
    };
    footer: {
        brandSubtitle: string;
        vision1: string;
        vision2: string;
        newsletterTitle: string;
        emailPlaceholder: string;
        submit: string;
        pagesTitle: string;
        home: string;
        about: string;
        products: string;
        contact: string;
        categoriesTitle: string;
        contactsTitle: string;
        phoneLabel: string;
        whatsappLabel: string;
        emailLabel: string;
        privacyPolicy: string;
        termsConditions: string;
        cookiePolicy: string;
        badgeTrading: string;
        badgeCompany: string;
        copyright: string;
        builtWith: string;
        by: string;
    };
}

export const translations: Record<'en' | 'ar', HomeTranslation> = {
    en: {
        hero: {
            firstName: "Abdullah",
            lastName: "Bakheet",
            tagline: "Best Trading Company In Saudi Arabia, Riyadh",
            description: "Established in 2004, we have built a strong reputation for providing food essentials to restaurants, hotels, caterers, and wholesalers across the Kingdom. With over two decades of industry expertise, we have cultivated long-term relationships with top international brands.",
            knowMore: "Know More",
            imgAlt1: "Riyadh Street View",
            imgAlt2: "Kingdom Centre Detail",
            imgAlt3: "Kingdom Centre Wide View"
        },
        categories: {
            title: "Our Categories",
            happyCustomers: "Happy Customers",
            productsSupplied: "Products Supplied",
            seeMore: "See More",
            list: {
                ketchup: "Ketchup",
                vinegar: "Vinegar",
                pickles: "Pickles",
                cannedVeg: "Canned Vegetables & Fruits",
                oils: "Oils",
                sauces: "Sauces & Dressings"
            },
            cards: {
                frenchFriesTitle: "French Fries",
                frenchFriesDesc: "Handpicked premium french fries built for high quality food service and everyday use.",
                dryCondimentsTitle: "Dry Condiments",
                dryCondimentsDesc: "Fast shipping with secure packaging and reliable supply across the region.",
                frozenItemsTitle: "Frozen Items",
                frozenItemsDesc: "Reliable cold-chain distribution with high-grade temperature-controlled handling.",
                seasoningsTitle: "Seasonings",
                seasoningsDesc: "Rich, authentic spices and blends sourced directly from premier global producers."
            }
        },
        wantToKnowMore: {
            wantTo: "Want To",
            know: "Know",
            more: "More ?",
            companyName: "Abdullah Bakheet",
            description: "Trading Co., we take pride in building strong, long-term relationships with leading businesses across Saudi Arabia. Our commitment to quality, reliability, and service excellence has earned us the trust of restaurants, hotels, caterers, wholesalers, and retailers who rely on us for premium food products.",
            viewProducts: "View Products"
        },
        whyChooseUs: {
            titleLine1: "Why",
            titleLine2: "Choose Us",
            companyName: "Abdullah Bakheet",
            description: "Our commitment to quality, reliability, customer satisfaction has positioned us as a trusted partner in the foodservice and retail industry. At Abdullah Bakheet Trading Co., we take pride in building strong, long-term relationships with leading businesses across Saudi Arabia.",
            yearsExpVal: "20+",
            yearsExpLabelLine1: "Years Of",
            yearsExpLabelLine2: "Experience",
            productsVal: "300 +",
            productsLabelLine1: "Products",
            productsLabelLine2: "Available",
            knowMore: "KNOW MORE",
            featured: "Featured",
            feature1Title: "Decades of Loyalty, Trust & Excellence",
            feature1Desc: "With over 20 years in food distribution, we bring deep industry knowledge and a proven track record of reliability.",
            feature2Title: "Sourcing the Best Always, Globally.",
            feature2Desc: "We partner with top international brands, ensuring you get only the finest ingredients from around the world.",
            feature3Title: "Seamless, Trust Worthy & Reliable Logistics",
            feature3Desc: "From order placement to doorstep delivery, our efficient supply chain guarantees on-time distribution across Saudi Arabia."
        },
        principles: {
            titleLine1: "Our Principles That",
            titleLine2: "Makes Us Different Always",
            description: "Every relationship holds a story. At Abdullah Bakheet, we help you elevate your business by blending premium food essentials with elegant, reliable service.",
            knowMore: "Know More",
            ourMission: "Our Mission",
            missionDescription: "Driven by innovation and efficiency, Abdullah Bakheet Trading Co. is dedicated to delivering premium food products defined by quality, freshness, and reliability. The company aims to build lasting commercial partnerships across Saudi Arabia by providing competitive pricing, seamless logistics, and tailored supply solutions that actively support client growth while continually setting higher industry standards for supply chain, storage, and service."
        },
        connectCTA: {
            anyDoubt: "Any Doubt ?",
            doubtDescription: "If you have a project in mind or simply want to explore possibilities, feel free to reach out. We believe great business products start with meaningful conversations.",
            contactUs: "Contact Us",
            letsConnect: "Let's Connect ...",
            andTalk: "And Talk",
            firstNameBadge: "Abdullah",
            lastNameBadge: "Bakheet"
        },
        footer: {
            brandSubtitle: "TRADING COMPANY",
            vision1: "To be the leading and most trusted food importer and distributor in Saudi Arabia, recognized for our commitment to quality, innovation, and customer satisfaction.",
            vision2: "We strive to expand our reach, foster strong partnerships, and set new standards in the food distribution industry while ensuring sustainability, excellence in every product we deliver.",
            newsletterTitle: "Join Our Newsletter",
            emailPlaceholder: "Enter Your Email",
            submit: "Submit",
            pagesTitle: "Pages",
            home: "Home",
            about: "About",
            products: "Products",
            contact: "Contact",
            categoriesTitle: "Categories",
            contactsTitle: "Our Contacts",
            phoneLabel: "Phone No.",
            whatsappLabel: "WhatsApp No.",
            emailLabel: "Email Id",
            privacyPolicy: "Privacy Policy",
            termsConditions: "Terms & Conditions",
            cookiePolicy: "Cookie Policy",
            badgeTrading: "Trading",
            badgeCompany: "Company",
            copyright: "© 2023 .abdullahbakheetksa. All rights reserved.",
            builtWith: "Built With Love By",
            by: "Stanford Consultancy"
        }
    },
    ar: {
        hero: {
            firstName: "عبدالله",
            lastName: "بخيت",
            tagline: "أفضل شركة تجارية في المملكة العربية السعودية، الرياض",
            description: "تأسست في عام 2004، وقمنا ببناء سمعة قوية في توفير المواد الغذائية الأساسية والمستلزمات للمطاعم والفنادق وشركات الإعاشة وتجار الجملة في جميع أنحاء المملكة. مع أكثر من عقدين من الخبرة في هذا المجال، قمنا بتطوير علاقات طويلة الأمد مع كبرى العلامات التجارية العالمية.",
            knowMore: "اعرف المزيد",
            imgAlt1: "إطلالة على شوارع الرياض",
            imgAlt2: "تفاصيل مركز المملكة",
            imgAlt3: "عرض واسع لمركز المملكة"
        },
        categories: {
            title: "أقسامنا",
            happyCustomers: "عميل سعيد",
            productsSupplied: "منتج متوفر",
            seeMore: "شاهد المزيد",
            list: {
                ketchup: "كاتشب",
                vinegar: "خل",
                pickles: "مخللات",
                cannedVeg: "خضروات وفواكه معلبة",
                oils: "زيوت",
                sauces: "صلصات وتتبيلات"
            },
            cards: {
                frenchFriesTitle: "بطاطس مقلية",
                frenchFriesDesc: "بطاطس مقلية ممتازة مختارة بعناية ومصممة لخدمات الأغذية عالية الجودة والاستخدام اليومي.",
                dryCondimentsTitle: "توابل وجفافات",
                dryCondimentsDesc: "شحن سريع وتغليف آمن وإمداد موثوق في جميع أنحاء المنطقة.",
                frozenItemsTitle: "منتجات مجمدة",
                frozenItemsDesc: "توزيع موثوق عبر السلسلة الباردة مع مناولة دقيقة تحت درجات حرارة محددة.",
                seasoningsTitle: "بهارات وتوابل",
                seasoningsDesc: "بهارات وخلطات غنية وأصلية مستوردة مباشرة من كبار المنتجين العالميين."
            }
        },
        wantToKnowMore: {
            wantTo: "هل تريد أن",
            know: "تعرف",
            more: "المزيد ؟",
            companyName: "عبدالله بخيت",
            description: "في شركة عبدالله بخيت للتجارة، نفخر ببناء علاقات قوية وطويلة الأمد مع الشركات الرائدة في جميع أنحاء المملكة العربية السعودية. إن التزامنا بالجودة والموثوقية والتميز في الخدمة قد كسبنا ثقة المطاعم والفنادق وشركات التموين وتجار الجملة والتجزئة الذين يعتمدون علينا للحصول على منتجات غذائية فاخرة.",
            viewProducts: "عرض المنتجات"
        },
        whyChooseUs: {
            titleLine1: "لماذا",
            titleLine2: "تختارنا",
            companyName: "عبدالله بخيت",
            description: "إن التزامنا بالجودة والموثوقية ورضا العملاء قد جعلنا شريكًا موثوقًا به في قطاع خدمات الأغذية والتجزئة. في شركة عبدالله بخيت للتجارة، نفخر ببناء علاقات قوية وطويلة الأمد مع كبرى الشركات في المملكة العربية السعودية.",
            yearsExpVal: "+20",
            yearsExpLabelLine1: "عامًا من",
            yearsExpLabelLine2: "الخبرة",
            productsVal: "+300",
            productsLabelLine1: "منتج",
            productsLabelLine2: "متاح",
            knowMore: "اعرف المزيد",
            featured: "مميز",
            feature1Title: "عقود من الولاء والثقة والتميز",
            feature1Desc: "مع أكثر من 20 عامًا في توزيع الأغذية، نقدم معرفة عميقة بالصناعة وسجل حافل من الموثوقية.",
            feature2Title: "نستورد الأفضل دائمًا، عالميًا.",
            feature2Desc: "نشترك مع كبرى العلامات التجارية العالمية، مما يضمن حصولك على أجود المكونات من جميع أنحاء العالم.",
            feature3Title: "لوجستيات سلسة وموثوقة وآمنة",
            feature3Desc: "من تقديم الطلب حتى التسليم، تضمن سلسلة التوريد الفعالة لدينا التوزيع في الوقت المحدد في جميع أنحاء المملكة."
        },
        principles: {
            titleLine1: "مبادئنا التي",
            titleLine2: "تجلعنا متميزين دائمًا",
            description: "تتميز كل شراكة بقصة نجاح. في شركة عبدالله بخيت، نساعدك على الارتقاء بأعمالك من خلال الجمع بين المواد الغذائية الفاخرة والخدمة الموثوقة.",
            knowMore: "اعرف المزيد",
            ourMission: "مهمتنا",
            missionDescription: "انطلاقًا من الإبداع والكفاءة، تكرس شركة عبدالله بخيت للتجارة جهودها لتقديم منتجات غذائية عالية الجودة تتميز بالطازجة والموثوقية. تهدف الشركة إلى بناء شراكات تجارية مستدامة في جميع أنحاء المملكة العربية السعودية من خلال تقديم أسعار تنافسية ولوجستيات سلسة وحلول توريد مخصصة تدعم نمو العملاء بشكل فعال مع رفع معايير التخزين وسلسلة التوريد والخدمة باستمرار."
        },
        connectCTA: {
            anyDoubt: "لديك استفسار ؟",
            doubtDescription: "إذا كان لديك مشروع في ذهنك أو ترغب ببساطة في استكشاف الإمكانيات، فلا تتردد في التواصل معنا. نحن نؤمن بأن المنتجات والأعمال الناجحة تبدأ بمحادثات هادفة.",
            contactUs: "تواصل معنا",
            letsConnect: "دعنا نتواصل ...",
            andTalk: "ونتحدث",
            firstNameBadge: "عبدالله",
            lastNameBadge: "بخيت"
        },
        footer: {
            brandSubtitle: "شركة تجارية",
            vision1: "أن نكون مستورد وموزع الأغذية الرائد والأكثر ثقة في المملكة العربية السعودية، والمعترف بنا للتزامنا بالجودة والابتكار ورضا العملاء.",
            vision2: "نسعى جاهدين لتوسيع نطاق وصولنا، وتعزيز الشراكات القوية، ووضع معايير جديدة في صناعة توزيع الأغذية مع ضمان الاستدامة والتميز في كل منتج نقدمه.",
            newsletterTitle: "اشترك في النشرة الإخبارية",
            emailPlaceholder: "أدخل بريدك الإلكتروني",
            submit: "إرسال",
            pagesTitle: "الصفحات",
            home: "الرئيسية",
            about: "من نحن",
            products: "المنتجات",
            contact: "تواصل معنا",
            categoriesTitle: "الأقسام",
            contactsTitle: "معلومات الاتصال",
            phoneLabel: "رقم الهاتف",
            whatsappLabel: "رقم الواتساب",
            emailLabel: "البريد الإلكتروني",
            privacyPolicy: "سياسة الخصوصية",
            termsConditions: "الشروط والأحكام",
            cookiePolicy: "سياسة ملفات تعريف الارتباط",
            badgeTrading: "شركة",
            badgeCompany: "تجارية",
            copyright: "© 2023 .abdullahbakheetksa. جميع الحقوق محفوظة.",
            builtWith: "تم التطوير بحب بواسطة",
            by: "ستانفورد للاستشارات"
        }
    }
};
