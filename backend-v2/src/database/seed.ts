import { getDatabase } from '../lib/db.js'
import { categories, products, customers } from './schema.js'

async function seed() {
  const db = getDatabase()

  console.log('🌱 Seeding rich hierarchical categories and products into backend-v2...')

  // 1. SEED HIERARCHICAL CATEGORY TREE (Category -> Subcategory -> Sub-subcategory)
  const categoryTree = [
    {
      slug: 'sauces-dressing',
      translations: {
        en: {
          name: 'Sauces & Dressing',
          description: 'Commercial condiments, dressings, mayonnaise and dips for food service and catering',
          slug: 'sauces-dressing',
        },
        ar: {
          name: 'الصلصات والتتبيلات',
          description: 'الصلصات التجارية، التتبيلات، المايونيز والغموس لقطاع المطاعم والضيافة',
          slug: 'sauces-dressing-ar',
        },
      },
      image: 'https://pub-2ba7d836ec824f9096f19eb3bcbaa81e.r2.dev/generated/mayonnaise_gallon_pack_1786346476883.png',
      displayOrder: 1,
      subcategories: [
        {
          slug: 'mayonnaise-dips',
          translations: {
            en: {
              name: 'Mayonnaise & Creamy Dips',
              description: 'Heavy-duty mayonnaise, garlic mayo, and creamy dipping sauces',
              slug: 'mayonnaise-dips',
            },
            ar: {
              name: 'مايونيز وغموس كريمي',
              description: 'مايونيز تجاري عالي الكثافة، مايونيز بالثوم، وصلصات التغميس الكريمية',
              slug: 'mayonnaise-dips-ar',
            },
          },
          displayOrder: 1,
        },
        {
          slug: 'ketchup-tomato-sauce',
          translations: {
            en: {
              name: 'Ketchup & Tomato Paste',
              description: 'Bulk ketchup sachets, table bottles, and tomato paste',
              slug: 'ketchup-tomato-sauce',
            },
            ar: {
              name: 'كاتشب ومعجون طماطم',
              description: 'مظاريف كاتشب بالجملة، عبوات طعام، ومعجون طماطم مركز',
              slug: 'ketchup-tomato-sauce-ar',
            },
          },
          displayOrder: 2,
        },
        {
          slug: 'gourmet-sauces',
          translations: {
            en: {
              name: 'BBQ & Specialty Sauces',
              description: 'Smoky BBQ sauces, hot sauces, and gourmet condiment glazes',
              slug: 'gourmet-sauces',
            },
            ar: {
              name: 'باربيكيو وصلصات خاصة',
              description: 'صلصات باربيكيو مدخنة، شطة حارة، وتتبيلات فاخرة',
              slug: 'gourmet-sauces-ar',
            },
          },
          displayOrder: 3,
        },
      ],
    },
    {
      slug: 'canned-produce',
      translations: {
        en: {
          name: 'Canned Fruits & Vegetables',
          description: 'Preserved sweet corn, sliced olives, dates, and canned produce for commercial kitchens',
          slug: 'canned-produce',
        },
        ar: {
          name: 'فواكه وخضروات ومحاصيل معلبة',
          description: 'ذرة حلوة، زيتون شرائح، تمور، ومحاصيل معلبة للمطابخ التجارية',
          slug: 'canned-produce-ar',
        },
      },
      image: 'https://pub-2ba7d836ec824f9096f19eb3bcbaa81e.r2.dev/generated/sweet_corn_canned_pack_1786346860827.png',
      displayOrder: 2,
      subcategories: [
        {
          slug: 'canned-vegetables',
          translations: {
            en: {
              name: 'Canned Vegetables & Corn',
              description: 'Sweet corn kernels, mushrooms, green peas, and canned vegetables',
              slug: 'canned-vegetables',
            },
            ar: {
              name: 'خضار وذرة معلبة',
              description: 'حبوب ذرة حلوة، فطر، بازلاء، وخضروات معلبة بجودة عالية',
              slug: 'canned-vegetables-ar',
            },
          },
          displayOrder: 1,
        },
        {
          slug: 'olives-pickles',
          translations: {
            en: {
              name: 'Olives & Pickles',
              description: 'Sliced black and green olives, whole pickles, and jalapeños',
              slug: 'olives-pickles',
            },
            ar: {
              name: 'زيتون ومخللات',
              description: 'شرائح زيتون أسود وأخضر، مخللات مشكلة، وهالبينو',
              slug: 'olives-pickles-ar',
            },
          },
          displayOrder: 2,
        },
      ],
    },
    {
      slug: 'oils-vinegar',
      translations: {
        en: {
          name: 'Oils & Vinegar',
          description: 'Extra virgin olive oil, frying oils, and white distilled vinegar',
          slug: 'oils-vinegar',
        },
        ar: {
          name: 'زيوت وخل',
          description: 'زيت زيتون بكر ممتاز، زيوت قلی، وخل أبيض مقطر',
          slug: 'oils-vinegar-ar',
        },
      },
      image: 'https://pub-2ba7d836ec824f9096f19eb3bcbaa81e.r2.dev/products/extra-virgin-olive-oil-b35bcfd42719c75ce2155e5f4945742b75bce429.jpg',
      displayOrder: 3,
      subcategories: [
        {
          slug: 'olive-oils',
          translations: {
            en: {
              name: 'Olive Oils',
              description: 'First cold pressed extra virgin olive oil and pomace olive oil',
              slug: 'olive-oils',
            },
            ar: {
              name: 'زيوت زيتون',
              description: 'زيت زيتون بكر ممتاز معصور على البارد وزيوت طهي',
              slug: 'olive-oils-ar',
            },
          },
          displayOrder: 1,
        },
        {
          slug: 'distilled-vinegar',
          translations: {
            en: {
              name: 'White & Culinary Vinegar',
              description: 'Standard 5% distilled white vinegar and specialty culinary vinegars',
              slug: 'distilled-vinegar',
            },
            ar: {
              name: 'خل أبيض وطهي',
              description: 'خل أبيض مقطر تركيز 5% وخل مائدة للاستخدام التجاري',
              slug: 'distilled-vinegar-ar',
            },
          },
          displayOrder: 2,
        },
      ],
    },
    {
      slug: 'spices-seasonings',
      translations: {
        en: {
          name: 'Spices & Seasonings',
          description: 'Pure ground spices, black pepper, and commercial seasoning blends',
          slug: 'spices-seasonings',
        },
        ar: {
          name: 'بهارات وتوابل',
          description: 'بهارات مطحونة نقية، فلفل أسود، وخلطات توابل تجارية',
          slug: 'spices-seasonings-ar',
        },
      },
      image: 'https://pub-2ba7d836ec824f9096f19eb3bcbaa81e.r2.dev/generated/black_pepper_powder_pack_1786346685675.png',
      displayOrder: 4,
      subcategories: [
        {
          slug: 'powdered-spices',
          translations: {
            en: {
              name: 'Powdered Spices',
              description: 'Pure black pepper powder, paprika, turmeric, and spice powders',
              slug: 'powdered-spices',
            },
            ar: {
              name: 'توابل مطحونة',
              description: 'فلفل أسود مطحون، بابريكا، كركم، وبهارات طعام نقية',
              slug: 'powdered-spices-ar',
            },
          },
          displayOrder: 1,
        },
      ],
    },
    {
      slug: 'dairy-frozen',
      translations: {
        en: {
          name: 'Dairy, Cheese & Frozen Foods',
          description: 'Cheese sauces, french fries, and frozen food essentials for restaurants',
          slug: 'dairy-frozen',
        },
        ar: {
          name: 'ألبان وأجبان وأغذية مجمدة',
          description: 'صلصات الجبن، البطاطس المقلية، والمستلزمات المجمدة للمطاعم',
          slug: 'dairy-frozen-ar',
        },
      },
      image: 'https://pub-2ba7d836ec824f9096f19eb3bcbaa81e.r2.dev/generated/cheddar_cheese_sauce_pack_1786346876424.png',
      displayOrder: 5,
      subcategories: [
        {
          slug: 'cheese-sauces',
          translations: {
            en: {
              name: 'Cheese Sauces & Dairy',
              description: 'Cheddar cheese sauce tubs, nacho cheese, and dairy sauces',
              slug: 'cheese-sauces',
            },
            ar: {
              name: 'صلصات الجبن والألبان',
              description: 'صلصات جبنة شيدر، جبن ناتشوز، وصلصات ألبان تجارية',
              slug: 'cheese-sauces-ar',
            },
          },
          displayOrder: 1,
        },
        {
          slug: 'french-fries',
          translations: {
            en: {
              name: 'French Fries & Frozen Sides',
              description: 'Grade A straight-cut and crinkle-cut frozen potato french fries',
              slug: 'french-fries',
            },
            ar: {
              name: 'بطاطس مقلية ومقبلات مجمدة',
              description: 'بطاطس مقلية أصابع مجمدة درجة أولى ومقبلات سريعة التحضير',
              slug: 'french-fries-ar',
            },
          },
          displayOrder: 2,
        },
      ],
    },
  ]

  const categoryMap = new Map<string, string>()

  for (const rootCat of categoryTree) {
    const [insertedRoot] = await db
      .insert(categories)
      .values({
        translations: rootCat.translations,
        image: rootCat.image,
        displayOrder: rootCat.displayOrder,
      })
      .returning()

    categoryMap.set(rootCat.slug, insertedRoot.id)

    if (rootCat.subcategories) {
      for (const subCat of rootCat.subcategories) {
        const [insertedSub] = await db
          .insert(categories)
          .values({
            parentId: insertedRoot.id,
            translations: subCat.translations,
            displayOrder: subCat.displayOrder,
          })
          .returning()

        categoryMap.set(subCat.slug, insertedSub.id)
      }
    }
  }

  // Helper to normalize prices to integer cents (x100)
  const toThousandPricing = (pricing: Record<string, { price: number; compare_at?: number }>) => {
    const out: Record<string, { price: number; compare_at?: number }> = {}
    for (const [k, v] of Object.entries(pricing)) {
      out[k] = {
        price: v.price > 0 && v.price < 1000 ? Math.round(v.price * 100) : v.price,
        ...(v.compare_at ? { compare_at: v.compare_at > 0 && v.compare_at < 1000 ? Math.round(v.compare_at * 100) : v.compare_at } : {}),
      }
    }
    return out
  }

  // 2. SEED RICH PRODUCT CATALOGUE
  const richProducts = [
    {
      sku: 'MAYONNAISE-CLASSIC-GALLON',
      categorySlug: 'mayonnaise-dips',
      translations: {
        en: {
          title: 'MAYONNAISE CLASSIC HEAVY DUTY GALLON (3.78L)',
          description:
            'Commercial-grade classic heavy-duty mayonnaise formulated specifically for food service operations and high-volume kitchens. Made with premium quality egg yolks and refined vegetable oils to deliver superior emulsification, heat stability, and an ultra-rich creamy texture with a balanced tangy flavor profile. Ideal for burger spreading, sandwich assembly, coleslaw dressings, and dipping sauce bases. Packaged in durable food-safe 1-gallon (3.78L) jugs (4 jugs per master carton).',
          slug: 'mayonnaise-classic-gallon',
        },
        ar: {
          title: 'مايونيز كلاسيك تجاري عالي الجودة جالون (3.78 لتر)',
          description:
            'مايونيز كلاسيك احترافي مخصص للمطابخ التجارية وسلاسل المطاعم الكبرى والفنادق. يتميز بقوام كريمي كثيف وثبات ممتاز ومقاومة للحرارة والتفكك، مع نكهة متوازنة ولذيذة. مثالي لتحضير البرجر، السندويشات، تتبيلات السلطات، والصلصات الخاصة. معبأ في جوالين طعام آمنة سعة 3.78 لتر (كرتون تجاري 4 جوالين).',
          slug: 'mayonnaise-classic-gallon-ar',
        },
      },
      pricing: toThousandPricing({
        AED: { price: 65.0, compare_at: 75.0 },
        SAR: { price: 66.5, compare_at: 77.0 },
        INR: { price: 1475.0, compare_at: 1700.0 },
        GBP: { price: 14.2, compare_at: 16.5 },
        USD: { price: 17.7, compare_at: 20.4 },
        EUR: { price: 16.5, compare_at: 19.0 },
      }),
      moq: 4,
      moqStep: 4,
      seo: {
        title: 'Mayonnaise Classic Gallon Wholesale UAE & KSA',
        description: 'Bulk order commercial classic mayonnaise gallons for hotel restaurants & QSR chains in Dubai.',
        keywords: 'mayonnaise gallon, bulk mayonnaise, food service condiments dubai',
      },
      attributes: {
        packSize: '( 4 x 3.78 L )',
        netWeight: '15.12 L (4 Gallons x 3.78 L)',
        brand: 'Best Foods / Classic Chef',
        origin: 'Saudi Arabia',
        shelfLife: '12 Months',
        storage: 'Store below 25°C. Refrigerate after opening.',
        certifications: 'Halal Certified, HACCP Approved',
      },
      stockQuantity: 500,
      images: [
        'https://pub-2ba7d836ec824f9096f19eb3bcbaa81e.r2.dev/generated/mayonnaise_gallon_pack_1786346476883.png',
      ],
    },
    {
      sku: 'CHEDDAR-CHEESE-SAUCE-3KG',
      categorySlug: 'cheese-sauces',
      translations: {
        en: {
          title: 'COMMERCIAL CHEDDAR CHEESE SAUCE (3KG Foodservice Tub)',
          description:
            'Rich, velvety smooth commercial cheddar cheese sauce crafted for warm dispenser pump stations and professional food service kitchens. Delivers an authentic sharp cheddar taste with exceptional meltability and zero curdling or oil separation under heat lamps. Perfect for loaded french fries, nachos, gourmet burgers, pasta dishes, and hot sandwiches. Supplied in heavy-duty 3kg food-service tubs (6 tubs per master case).',
          slug: 'cheddar-cheese-sauce-3kg',
        },
        ar: {
          title: 'صلصة جبنة شيدر كريمية تجارية (سطل 3 كجم)',
          description:
            'صلصة جبنة شيدر غنية بقوام مخملي حريري مخصصة للمضخات الساخنة وخطوط تجهيز الوجبات السريعة والمطاعم. تمنح نكهة الشيدر الحادة والشهية مع ثبات استثنائي تحت درجات الحرارة دون تفكك أو انفصال للدهون. مثالية للبطاطس المحملة، الناتشوز، البرجر، السندويشات، والمعكرونة (كرتون تجاري 6 سطول × 3 كجم).',
          slug: 'cheddar-cheese-sauce-3kg-ar',
        },
      },
      pricing: toThousandPricing({
        AED: { price: 78.0, compare_at: 90.0 },
        SAR: { price: 80.0, compare_at: 92.0 },
        INR: { price: 1770.0, compare_at: 2040.0 },
        GBP: { price: 17.0, compare_at: 19.5 },
        USD: { price: 21.2, compare_at: 24.5 },
        EUR: { price: 19.8, compare_at: 23.0 },
      }),
      moq: 2,
      moqStep: 2,
      seo: {
        title: 'Cheddar Cheese Sauce 3kg Tub Foodservice',
        description: 'Velvety commercial cheddar cheese sauce tubs for restaurants & nachos stations in UAE.',
      },
      attributes: {
        packSize: '( 6 x 3 Kg )',
        netWeight: '18 Kg (6 Tubs x 3 Kg)',
        brand: "Chef's Choice",
        origin: 'USA',
        shelfLife: '15 Months',
        certifications: 'Halal Certified',
      },
      stockQuantity: 320,
      images: [
        'https://pub-2ba7d836ec824f9096f19eb3bcbaa81e.r2.dev/generated/cheddar_cheese_sauce_pack_1786346876424.png',
      ],
    },
    {
      sku: 'TOMATO-KETCHUP-SACHET-1000',
      categorySlug: 'ketchup-tomato-sauce',
      translations: {
        en: {
          title: 'TOMATO KETCHUP PORTION SACHETS (1000 Pack x 8g)',
          description:
            'Single-serve 8g commercial tomato ketchup portion sachets packaged in bulk 1000-unit master cartons. Crafted from 100% sun-ripened tomatoes, natural vinegar, and select spices for a rich, balanced sweet and tangy flavor. Designed for high hygiene, portion cost control, and customer convenience. The standard choice for takeaway delivery, fast-casual restaurants, room service, food trucks, and airline catering.',
          slug: 'tomato-ketchup-portion-sachets',
        },
        ar: {
          title: 'كاتشب طماطم مظاريف سريعة الخدمة (1000 ظرف × 8 جم)',
          description:
            'مظاريف كاتشب طماطم فردية سعة 8 جم معبأة في كرتون تجاري يحتوي على 1000 ظرف. مُحضرة من أجود حبات الطماطم الناضجة والخل الطبيعي والبهارات لتمنح مذاقاً متوازناً ولذيذاً. تضمن أعلى معايير النظافة والتحكم في تكلفة الوجبات وتوفير أقصى درجات الراحة للعملاء. الخيار الأمثل لخدمات التوصيل، مطاعم الوجبات السريعة، الفنادق، وعربات الطعام.',
          slug: 'tomato-ketchup-portion-sachets-ar',
        },
      },
      pricing: toThousandPricing({
        AED: { price: 18.0, compare_at: 22.0 },
        SAR: { price: 18.5, compare_at: 23.0 },
        INR: { price: 410.0, compare_at: 500.0 },
        GBP: { price: 3.9, compare_at: 4.8 },
        USD: { price: 4.9, compare_at: 6.0 },
        EUR: { price: 4.5, compare_at: 5.6 },
      }),
      moq: 5,
      moqStep: 5,
      seo: {
        title: 'Tomato Ketchup Portion Sachets 1000 Pack Wholesale',
        description: 'Buy bulk single-serve ketchup sachets 8g for takeaway & delivery in UAE.',
      },
      attributes: {
        packSize: '( 1000 x 8 g )',
        netWeight: '8 Kg (1000 Packets x 8 g)',
        brand: 'Daily Fresh / Abdullah Bakheet',
        origin: 'Saudi Arabia',
        shelfLife: '12 Months',
        certifications: 'Halal Certified, ISO 22000',
      },
      stockQuantity: 600,
      images: [
        'https://pub-2ba7d836ec824f9096f19eb3bcbaa81e.r2.dev/generated/tomato_ketchup_portion_pack_1786346616346.png',
      ],
    },
    {
      sku: 'WHITE-VINEGAR-BOTTLE-473ML',
      categorySlug: 'distilled-vinegar',
      translations: {
        en: {
          title: 'DISTILLED WHITE VINEGAR 5% ACIDITY (473ML Table & Kitchen Bottle)',
          description:
            'Pure food-grade distilled white vinegar standardized to 5% acidity (50 grain). Crystal clear with a crisp, clean taste suited for commercial culinary marinating, salad dressing preparation, pickling, and food preservation. Bottled in shatter-resistant 473ml PET bottles convenient for front-of-house table service and prep counters (12 bottles per case).',
          slug: 'white-vinegar-bottle-473ml',
        },
        ar: {
          title: 'خل أبيض مقطر نقي حموضة 5% (زجاجة 473 مل)',
          description:
            'خل أبيض مقطر نقي عالي الجودة بنسبة حموضة قياسية 5%. يتميز بنقاء فائق وطعم منعش مناسب لتتبيل اللحوم والدواجن، تحضير الصلصات، إعداد المخللات، والاستخدامات الفندقية والمطاعم (كرتون 12 زجاجة × 473 مل).',
          slug: 'white-vinegar-bottle-473ml-ar',
        },
      },
      pricing: toThousandPricing({
        AED: { price: 9.5, compare_at: 12.0 },
        SAR: { price: 9.8, compare_at: 12.5 },
        INR: { price: 215.0, compare_at: 270.0 },
        GBP: { price: 2.1, compare_at: 2.6 },
        USD: { price: 2.6, compare_at: 3.3 },
        EUR: { price: 2.4, compare_at: 3.1 },
      }),
      moq: 12,
      moqStep: 12,
      seo: {
        title: 'White Distilled Vinegar 473ml PET Bottles UAE',
        description: 'Pure 5% acidity distilled white vinegar bottles for restaurant kitchens.',
      },
      attributes: {
        packSize: '( 12 x 473 ml )',
        netWeight: '5.67 L (12 Bottles x 473 ml)',
        brand: 'Food Service Standard',
        origin: 'Saudi Arabia',
        shelfLife: '24 Months',
        certifications: 'Halal Certified, Food Grade 5% Acidity',
      },
      stockQuantity: 400,
      images: [
        'https://pub-2ba7d836ec824f9096f19eb3bcbaa81e.r2.dev/generated/white_vinegar_bottle_pack_1786346650175.png',
      ],
    },
    {
      sku: 'BARBECUE-SAUCE-BOTTLE-500ML',
      categorySlug: 'gourmet-sauces',
      translations: {
        en: {
          title: 'SMOKY HICKORY GOURMET BARBECUE SAUCE (500ML Bottle)',
          description:
            'Authentic American-style gourmet barbecue sauce crafted with natural hickory wood smoke, slow-cooked dark molasses, ripe tomato paste, and select spices. Features a thick, clingy consistency ideal for basting grilled meats, glazing steaks, wings, burger spreads, and tabletop dipping (12 bottles per master case).',
          slug: 'barbecue-sauce-bottle-500ml',
        },
        ar: {
          title: 'صلصة باربيكيو مدخنة فاخرة بنكهة الهيكوري (زجاجة 500 مل)',
          description:
            'صلصة باربيكيو أمريكية فاخرة محضرة من نكهة خشب الهيكوري المدخن الطبيعي، العسل الأسود المركز، ومعجون الطماطم الفاخر مع مزيج من البهارات المنتقاة. تتميز بقوام كثيف يلتصق باللحوم ومثالية للشواء، دهن الستيك وأجنحة الدجاج، وإضافات البرجر (كرتون 12 زجاجة × 500 مل).',
          slug: 'barbecue-sauce-bottle-500ml-ar',
        },
      },
      pricing: toThousandPricing({
        AED: { price: 38.0, compare_at: 45.0 },
        SAR: { price: 39.0, compare_at: 46.0 },
        INR: { price: 860.0, compare_at: 1020.0 },
        GBP: { price: 8.3, compare_at: 9.8 },
        USD: { price: 10.3, compare_at: 12.2 },
        EUR: { price: 9.6, compare_at: 11.4 },
      }),
      moq: 6,
      moqStep: 6,
      seo: {
        title: 'Smoky Gourmet Barbecue Sauce 500ml UAE',
        description: 'Authentic hickory smoke barbecue sauce for commercial grill houses in Dubai.',
      },
      attributes: {
        packSize: '( 12 x 500 ml )',
        netWeight: '6 L (12 Bottles x 500 ml)',
        brand: "Chef's Gourmet",
        origin: 'USA',
        shelfLife: '18 Months',
        certifications: 'Halal Certified',
      },
      stockQuantity: 280,
      images: [
        'https://pub-2ba7d836ec824f9096f19eb3bcbaa81e.r2.dev/products/barbecue-sauce-bottle-5ea614e80b1750a6948242606b397619384dd64d.png',
      ],
    },
    {
      sku: 'SWEET-CORN-CANNED-3KG',
      categorySlug: 'canned-vegetables',
      translations: {
        en: {
          title: 'GOLDEN WHOLE KERNEL SWEET CORN (3KG Commercial Can)',
          description:
            'Naturally sweet whole kernel golden corn harvested at peak ripeness and vacuum-canned in light brine. Retains natural crunch, vibrant golden color, and fresh garden sweetness. An indispensable pantry staple for commercial salad bars, Mexican food catering, pizza toppings, soups, and rice dishes (6 x 3kg cans per master carton).',
          slug: 'sweet-corn-canned-3kg',
        },
        ar: {
          title: 'ذرة حلوة حب ذهبية معلبة (علبة تجارية 3 كجم)',
          description:
            'حبوب ذرة صفراء حلوة طبيعياً منتقاة في ذروة النضج ومحفوظة في محلول ملحي خفيف. تحتفظ بقرمشتها الطبيعية ولونها الذهبي الزاهي ومذاقها اللذيذ. خيار لا غنى عنه لبوفيهات السلطات، أطباق المطبخ المكسيكي، الشوربات، وتوبينج البيتزا (كرتون تجاري 6 علب × 3 كجم).',
          slug: 'sweet-corn-canned-3kg-ar',
        },
      },
      pricing: toThousandPricing({
        AED: { price: 28.0, compare_at: 34.0 },
        SAR: { price: 29.0, compare_at: 35.0 },
        INR: { price: 630.0, compare_at: 770.0 },
        GBP: { price: 6.1, compare_at: 7.4 },
        USD: { price: 7.6, compare_at: 9.2 },
        EUR: { price: 7.1, compare_at: 8.6 },
      }),
      moq: 6,
      moqStep: 6,
      seo: {
        title: 'Canned Golden Sweet Corn 3kg Foodservice',
        description: 'Bulk 3kg sweet corn cans for commercial kitchens & catering in Dubai.',
      },
      attributes: {
        packSize: '( 6 x 3 Kg )',
        netWeight: '18 Kg',
        origin: 'Thailand',
        shelfLife: '24 Months',
      },
      stockQuantity: 350,
      images: [
        'https://pub-2ba7d836ec824f9096f19eb3bcbaa81e.r2.dev/generated/sweet_corn_canned_pack_1786346860827.png',
      ],
    },
    {
      sku: 'BLACK-OLIVES-SLICED-3KG',
      categorySlug: 'olives-pickles',
      translations: {
        en: {
          title: 'SLICED PITTED BLACK OLIVES IN BRINE (3KG Foodservice Can)',
          description:
            'Uniformly machine-sliced, pitted ripe black Spanish olives packed in seasoned brine. High usable yield with minimal breakage, providing a rich savory flavor and striking visual appeal. Perfect bulk ingredient for commercial pizzerias, pasta sauces, sandwich delis, and Mediterranean salad buffets (6 x 3kg cans per master carton).',
          slug: 'black-olives-sliced-3kg',
        },
        ar: {
          title: 'شرائح زيتون أسود منزوع النواة في محلول ملحي (علبة 3 كجم)',
          description:
            'شرائح زيتون أسود ناضج ومنزوع النواة مقطع بانتظام ومحفوظ في محلول ملحي متوازن. يتميز بنكهة غنية وثبات ممتاز عند الخبز والطهي، مما يجعله المكون الأساسي لمطاعم البيتزا، المعكرونة، المخابز، وبوفيهات السلطات (كرتون 6 علب × 3 كجم).',
          slug: 'black-olives-sliced-3kg-ar',
        },
      },
      pricing: toThousandPricing({
        AED: { price: 32.0, compare_at: 38.0 },
        SAR: { price: 33.0, compare_at: 39.0 },
        INR: { price: 720.0, compare_at: 860.0 },
        GBP: { price: 7.0, compare_at: 8.3 },
        USD: { price: 8.7, compare_at: 10.3 },
        EUR: { price: 8.1, compare_at: 9.6 },
      }),
      moq: 6,
      moqStep: 6,
      seo: {
        title: 'Sliced Black Olives 3kg Cans Wholesale UAE',
        description: 'Pitted sliced black olives for pizzerias and Italian restaurants in UAE.',
      },
      attributes: {
        packSize: '( 6 x 3 Kg )',
        netWeight: '18 Kg',
        origin: 'Spain',
        shelfLife: '24 Months',
      },
      stockQuantity: 290,
      images: [
        'https://pub-2ba7d836ec824f9096f19eb3bcbaa81e.r2.dev/generated/black_olives_sliced_pack_1786346666862.png',
      ],
    },
    {
      sku: 'FRENCH-FRIES-STRAIGHT-CUT-2.5KG',
      categorySlug: 'french-fries',
      translations: {
        en: {
          title: 'FRENCH FRIES STRAIGHT CUT 9MM (4 x 2.5KG Master Carton)',
          description:
            'Grade A commercial 9mm straight-cut frozen potato french fries sourced from premium European potatoes. Specially processed for rapid fryer recovery, exceptional golden crispiness, low oil absorption, and extended heat retention in delivery boxes. Master carton contains 4 bags of 2.5kg (10kg total net weight).',
          slug: 'french-fries-straight-cut-9mm',
        },
        ar: {
          title: 'بطاطس مقلية أصابع مستقيمة 9 مم (كرتون 4 × 2.5 كجم)',
          description:
            'بطاطس مقلية مجمدة درجة أولى (أصابع 9 مم) من أجود أنواع البطاطس الأوروبية. مصممة للقلي السريع مع تحقيق أقصى درجات القرمشة واللون الذهبي الجذاب، مع امتصاص منخفض للزيت واحتفاظ طويل بالحرارة أثناء التوصيل. كرتون تجاري 10 كجم (4 أكياس × 2.5 كجم).',
          slug: 'french-fries-straight-cut-9mm-ar',
        },
      },
      pricing: toThousandPricing({
        AED: { price: 24.0, compare_at: 28.0 },
        SAR: { price: 24.5, compare_at: 29.0 },
        INR: { price: 540.0, compare_at: 630.0 },
        GBP: { price: 5.2, compare_at: 6.1 },
        USD: { price: 6.5, compare_at: 7.6 },
        EUR: { price: 6.1, compare_at: 7.1 },
      }),
      moq: 4,
      moqStep: 4,
      seo: {
        title: 'Crispy Frozen French Fries 9mm 2.5kg Wholesale',
        description: 'Grade A frozen straight cut french fries for burger joints & QSR in UAE.',
      },
      attributes: {
        packSize: '( 4 x 2.5 Kg )',
        netWeight: '10 Kg Bag',
        origin: 'Belgium',
        storage: 'Keep Frozen at -18°C',
      },
      stockQuantity: 450,
      images: [
        'https://pub-2ba7d836ec824f9096f19eb3bcbaa81e.r2.dev/products/french-fries-straight-cut-5a78966bd8e588d4e65dd42f970c206cab2fdbe8.png',
      ],
    },
    {
      sku: 'BLACK-PEPPER-POWDER-1KG',
      categorySlug: 'powdered-spices',
      translations: {
        en: {
          title: 'PURE BLACK PEPPER POWDER MALABAR GRADE (1KG Foil Pack)',
          description:
            '100% pure steam-sterilized black pepper powder milled from premium Malabar peppercorns (minimum 550g/l bulk density). Free from additives, sawdust, and fillers, delivering sharp pungent heat and intense essential oil aroma. Packed in airtight multi-layer barrier foil bags (10 x 1kg master carton) for commercial kitchens, marinades, and meat processing.',
          slug: 'black-pepper-powder-pure-1kg',
        },
        ar: {
          title: 'فلفل أسود مطحون نقي درجة أولى (عبوة ألومنيوم 1 كجم)',
          description:
            'فلفل أسود نقي 100% مطحون ومعقم بالبخار من أجود حبوب فلفل مالابار الهندي. خالٍ تماماً من الإضافات والشوائب، ويتميز بنكهة حارة قوية ورائحة زكية غنية بالزيوت العطرية. معبأ في أكياس ألومنيوم محكمة الإغلاق لحفظ النكهة ومخصص للمطاعم ومصانع الأغذية (كرتون 10 كجم).',
          slug: 'black-pepper-powder-pure-1kg-ar',
        },
      },
      pricing: toThousandPricing({
        AED: { price: 42.0, compare_at: 50.0 },
        SAR: { price: 43.0, compare_at: 51.0 },
        INR: { price: 950.0, compare_at: 1130.0 },
        GBP: { price: 9.1, compare_at: 10.9 },
        USD: { price: 11.4, compare_at: 13.6 },
        EUR: { price: 10.7, compare_at: 12.8 },
      }),
      moq: 5,
      moqStep: 5,
      seo: {
        title: 'Pure Black Pepper Powder 1kg Wholesale UAE',
        description: 'Pure ground Malabar black pepper powder 1kg bags for commercial seasoning.',
      },
      attributes: {
        packSize: '( 10 x 1 Kg )',
        netWeight: '10 Kg',
        origin: 'India',
        shelfLife: '24 Months',
      },
      stockQuantity: 380,
      images: [
        'https://pub-2ba7d836ec824f9096f19eb3bcbaa81e.r2.dev/generated/black_pepper_powder_pack_1786346685675.png',
      ],
    },
    {
      sku: 'EVOO-500ML',
      categorySlug: 'olive-oils',
      translations: {
        en: {
          title: 'EXTRA VIRGIN OLIVE OIL FIRST COLD PRESSED (500ML Glass Bottle)',
          description:
            'Premium Mediterranean extra virgin olive oil with guaranteed acidity below 0.5%. First cold-pressed from selected hand-picked olives to retain natural polyphenols, antioxidants, and a fresh fruity aroma. Bottled in UV-protective dark glass bottles for fine dining restaurants, gourmet salad dressings, and dipping service (12 x 500ml per case).',
          slug: 'extra-virgin-olive-oil-500ml',
        },
        ar: {
          title: 'زيت زيتون بكر ممتاز معصور على البارد (زجاجة 500 مل)',
          description:
            'زيت زيتون بكر ممتاز فاخر بنسبة حموضة أقل من 0.5%، ناتج عن العصرة الأولى على البارد لأجود ثمار الزيتون المتوسطي. غني بمضادات الأكسدة والنكهة الفاكهية الطازجة، معبأ في زجاجات داكنة لحماية الجودة ومثالي للمطاعم الفاخرة والسلطات والضيافة (كرتون 12 زجاجة × 500 مل).',
          slug: 'extra-virgin-olive-oil-500ml-ar',
        },
      },
      pricing: toThousandPricing({
        AED: { price: 34.0, compare_at: 40.0 },
        SAR: { price: 35.0, compare_at: 41.0 },
        INR: { price: 770.0, compare_at: 910.0 },
        GBP: { price: 7.4, compare_at: 8.8 },
        USD: { price: 9.3, compare_at: 10.9 },
        EUR: { price: 8.6, compare_at: 10.2 },
      }),
      moq: 5,
      moqStep: 5,
      seo: {
        title: 'Extra Virgin Olive Oil 500ml Wholesale Dubai',
        description: 'First cold pressed EVOO in glass bottles for hospitality & restaurants in UAE.',
      },
      attributes: {
        packSize: '( 12 x 500 ml )',
        netWeight: '6 L',
        origin: 'Spain',
        shelfLife: '24 Months',
      },
      stockQuantity: 400,
      images: [
        'https://pub-2ba7d836ec824f9096f19eb3bcbaa81e.r2.dev/products/extra-virgin-olive-oil-b35bcfd42719c75ce2155e5f4945742b75bce429.jpg',
      ],
    },
    {
      sku: 'DATES-MEDJOOL-1KG',
      categorySlug: 'canned-produce',
      translations: {
        en: {
          title: 'PREMIUM MEDJOOL DATES JUMBO (1KG Gift Master Box)',
          description:
            'Large, succulent jumbo Medjool dates freshly harvested from select Al Ain date palm oases. Rich in natural caramel sweetness with a soft, melt-in-mouth texture and glossy skin. Packaged in 1kg commercial food-grade master cartons ideal for luxury hotels, Ramadan catering buffets, gift hampers, and premium confectioneries.',
          slug: 'premium-medjool-dates-1kg',
        },
        ar: {
          title: 'تمر مجدول جامبو فاخر (كرتون 1 كجم)',
          description:
            'تمور مجدول جامبو فاخرة ومختارة بعناية من أجود واحات نخيل العين. تتميز بحجم كبير وقوام طري ونكهة كراميل طبيعية غنية مع قشرة لامعة. معبأة في كراتين تجارية سعة 1 كجم مناسبة للفنادق الفاخرة، خدمات الضيافة الرمضانية والإعاشة، وبوفيهات المناسبات.',
          slug: 'premium-medjool-dates-1kg-ar',
        },
      },
      pricing: toThousandPricing({
        AED: { price: 55.0, compare_at: 65.0 },
        SAR: { price: 56.5, compare_at: 67.0 },
        INR: { price: 1250.0, compare_at: 1480.0 },
        GBP: { price: 12.0, compare_at: 14.3 },
        USD: { price: 15.0, compare_at: 17.7 },
        EUR: { price: 13.9, compare_at: 16.5 },
      }),
      moq: 5,
      moqStep: 5,
      seo: {
        title: 'Premium Medjool Dates 1kg Wholesale UAE',
        description: 'Jumbo Medjool dates boxes for hotels and Ramadan catering in Dubai.',
      },
      attributes: {
        packSize: '( 10 x 1 Kg )',
        netWeight: '10 Kg',
        origin: 'UAE (Al Ain)',
        shelfLife: '12 Months',
      },
      stockQuantity: 450,
      images: [
        'https://pub-2ba7d836ec824f9096f19eb3bcbaa81e.r2.dev/products/dates-medjool-a87d92849b294cb7603c15d48729587384192bce.png',
      ],
    },
  ]

  for (const prod of richProducts) {
    const categoryId = categoryMap.get(prod.categorySlug) || null

    await db
      .insert(products)
      .values({
        sku: prod.sku,
        categoryId,
        translations: prod.translations,
        pricing: prod.pricing,
        moq: prod.moq,
        moqStep: prod.moqStep,
        seo: prod.seo,
        attributes: prod.attributes,
        stockQuantity: prod.stockQuantity,
        status: 'active' as const,
        images: prod.images,
      })
      .onConflictDoUpdate({
        target: products.sku,
        set: {
          categoryId,
          translations: prod.translations,
          pricing: prod.pricing,
          moq: prod.moq,
          moqStep: prod.moqStep,
          seo: prod.seo,
          attributes: prod.attributes,
          stockQuantity: prod.stockQuantity,
          images: prod.images,
          updatedAt: new Date(),
        },
      })
  }

  // 3. SEED SAMPLE CUSTOMERS
  const sampleCustomer = {
    email: 'customer@example.ae',
    firstName: 'Tariq',
    lastName: 'Al-Mansoori',
    phone: '+971501234567',
    companyName: 'Al-Mansoori Hospitality Group',
  }

  await db.insert(customers).values(sampleCustomer)

  console.log('✅ Seed completed successfully with full hierarchical category tree and rich product catalog!')
  process.exit(0)
}

seed().catch((err) => {
  console.error('❌ Seeding failed:', err)
  process.exit(1)
})
