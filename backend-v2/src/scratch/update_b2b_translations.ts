import { getPool } from '../lib/db.js'

async function updateData() {
  const pool = getPool()

  console.log('🔄 Updating categories with complete English and Arabic translations...')

  // Category definitions map by slug
  const categoryUpdates = [
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
    },
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
    },
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
    },
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
    },
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
    },
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
    },
  ]

  for (const cat of categoryUpdates) {
    const res = await pool.query(
      `UPDATE v2_categories 
       SET translations = $1, updated_at = NOW() 
       WHERE translations->'en'->>'slug' = $2 OR translations->'ar'->>'slug' = $2 OR translations->'en'->>'slug' = $3`,
      [JSON.stringify(cat.translations), cat.slug, cat.translations.en.slug]
    )
    console.log(`Updated category ${cat.slug}: ${res.rowCount} rows`)
  }

  // Get category IDs for product linking
  const catRows = await pool.query(`SELECT id, translations->'en'->>'slug' as slug FROM v2_categories`)
  const catMap: Record<string, string> = {}
  for (const r of catRows.rows) {
    if (r.slug) catMap[r.slug] = r.id
  }

  console.log('\n🔄 Updating products with comprehensive B2B descriptions and Arabic titles/descriptions...')

  const productUpdates = [
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
    },
  ]

  for (const prod of productUpdates) {
    const targetCatId = catMap[prod.categorySlug] || null

    const res = await pool.query(
      `UPDATE v2_products 
       SET category_id = COALESCE($1, category_id),
           translations = $2,
           updated_at = NOW() 
       WHERE sku = $3`,
      [targetCatId, JSON.stringify(prod.translations), prod.sku]
    )
    console.log(`Updated product ${prod.sku} (Category: ${prod.categorySlug} -> ${targetCatId}): ${res.rowCount} rows`)
  }

  console.log('✅ All categories and products updated successfully!')
  process.exit(0)
}

updateData().catch((err) => {
  console.error('❌ Error updating B2B translations:', err)
  process.exit(1)
})
