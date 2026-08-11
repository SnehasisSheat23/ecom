import { getDatabase } from '../lib/db.js'
import { products } from '../modules/catalog/catalog.schema.js'
import { eq } from 'drizzle-orm'

interface FullProductData {
  titleEn: string
  descEn: string
  titleAr: string
  descAr: string
  specs: Record<string, string>
}

const RICH_PRODUCT_DATA: Record<string, FullProductData> = {
  'mayonnaise-classic-gallon': {
    titleEn: 'MAYONNAISE CLASSIC GALLON',
    descEn: 'Premium commercial-grade classic mayonnaise formulated with high-quality cage-free eggs and refined oils to deliver an ultra-rich, creamy texture and balanced tangy flavor profile. Specially crafted for commercial kitchens, hotel restaurants, and quick-service burger chains across Saudi Arabia. Maintains superior emulsion stability when mixed into house dressings, garlic sauces, dips, and coleslaw spreads without separating under heat or high-volume preparation.',
    titleAr: 'مايونيز كلاسيك جالون',
    descAr: 'مايونيز كلاسيك تجاري ممتاز مُعدّ من أجود المكونات والزيوت النقية لتقديم قوام غني وكريمي فائق وطعم متوازن ولذيذ. صُمم خصيصاً للمطابخ التجارية، المطاعم الفندقية، وسلاسل الوجبات السريعة في جميع أنحاء المملكة العربية السعودية. يتميز بثبات استحلابي ممتاز عند تحضير الصلصات المخصصة، التتبيلات، صوص الثوم، وسندويشات البرجر والشاورما دون انفصال المكونات.',
    specs: {
      img: 'https://pub-2ba7d836ec824f9096f19eb3bcbaa81e.r2.dev/generated/mayonnaise_gallon_pack_1786346476883.png',
      price: '650',
      packSize: '( 4 x 3.78 L )',
      netWeight: '15.12 L (4 Gallons x 3.78 L)',
      brand: 'Best Foods / Classic Chef',
      origin: 'Saudi Arabia',
      shelfLife: '12 Months',
      storage: 'Store in a cool dry place below 25°C. Refrigerate after opening.',
      certifications: 'Halal Certified, HACCP Approved',
      arabicName: 'مايونيز كلاسيك جالون'
    }
  },
  'cheddar-cheese-sauce': {
    titleEn: 'CHEDDAR CHEESE SAUCE',
    descEn: 'Smooth, velvety, and rich cheddar cheese sauce supplied in commercial 3kg food-service tubs. Features an authentic sharp cheddar taste with smooth meltability, making it ideal for warm pump stations, nachos, loaded french fries, gourmet burgers, and hot sandwiches. Formulated to stay smooth and pourable without skinning or lumping during service.',
    titleAr: 'صلصة جبنة شيدر',
    descAr: 'صلصة جبنة شيدر غنية ولذيذة ومخملية في عبوات تجارية سعة 3 كجم مخصصة للخدمات الغذائية. تتميز بنكهة جبنة الشيدر الأصيلة وسهولة الانسياب، مما يجعلها مثالية لموزعات الوجبات الساخنة، الناتشوز، البطاطس المحملة بالجبن، والبرجر الفاخر. تضمن لك نسيجاً ناعماً وسلساً دون تكتل أثناء ساعات العمل المزدحمة.',
    specs: {
      img: 'https://pub-2ba7d836ec824f9096f19eb3bcbaa81e.r2.dev/generated/cheddar_cheese_sauce_pack_1786346876424.png',
      price: '780',
      packSize: '( 6 x 3 Kg )',
      netWeight: '18 Kg (6 Tubs x 3 Kg)',
      brand: "Chef's Choice",
      origin: 'USA',
      shelfLife: '15 Months',
      storage: 'Store in a cool dry place. Keep refrigerated after opening.',
      certifications: 'Halal Certified',
      arabicName: 'صلصة جبنة شيدر'
    }
  },
  'tomato-ketchup-portion': {
    titleEn: 'TOMATO KETCHUP PORTION',
    descEn: 'Single-serve 8g tomato ketchup portion sachets packaged in bulk 1000-unit master cases. Made from 100% sun-ripened tomatoes for a rich, sweet, and tangy taste. Designed for maximum hygiene and convenience in fast-food delivery, takeaway meal boxes, room service, food trucks, and outdoor catering events.',
    titleAr: 'كاتشب طماطم مظاريف',
    descAr: 'مظاريف كاتشب طماطم فردية سعة 8 جرام في كرتون تجاري يحتوي على 1000 ظرف. محضر من طماطم ناضجة ومستوية بنسبة 100% لنكهة غنية ولذيذة. يُعد الخيار الصحي والأكثر راحة للطلبات الخارجية، الوجبات السريعة، خدمة الغرف، عربات الطعام، والفعاليات والتموين الخارجي.',
    specs: {
      img: 'https://pub-2ba7d836ec824f9096f19eb3bcbaa81e.r2.dev/generated/tomato_ketchup_portion_pack_1786346616346.png',
      price: '180',
      packSize: '( 1000 x 8 g )',
      netWeight: '8 Kg (1000 Packets x 8 g)',
      brand: 'Daily Fresh / Abdullah Bakheet',
      origin: 'Saudi Arabia',
      shelfLife: '12 Months',
      storage: 'Store in a cool dry place away from direct sunlight.',
      certifications: 'Halal Certified, ISO 22000',
      arabicName: 'كاتشب طماطم مظاريف'
    }
  },
  'white-vinegar-bottle': {
    titleEn: 'WHITE VINEGAR BOTTLE',
    descEn: 'Pure distilled white food-grade vinegar with a standardized 5% acidity packaged in 473ml table-ready PET bottles. Essential ingredient for preparing salad dressings, pickling liquids, meat marinades, sauces, and culinary cleaning applications in professional dining rooms and restaurant kitchens.',
    titleAr: 'خل أبيض نقي',
    descAr: 'خل طعام أبيض مقطر نقي بتركيز حموضة قياسي 5% في زجاجات سعة 473 مل ممتازة للتقديم المباشر أو الاستخدام المطبخي. عنصر أساسي لتحضير تتبيلات السلطات، مخللات الخضار، نقع اللحوم والدواجن، وتجهيز الصلصات في المطاعم والفنادق.',
    specs: {
      img: 'https://pub-2ba7d836ec824f9096f19eb3bcbaa81e.r2.dev/generated/white_vinegar_bottle_pack_1786346650175.png',
      price: '95',
      packSize: '( 12 x 473 ml )',
      netWeight: '5.67 L (12 Bottles x 473 ml)',
      brand: 'Food Service Standard',
      origin: 'Saudi Arabia',
      shelfLife: '24 Months',
      storage: 'Store at ambient room temperature.',
      certifications: 'Halal Certified, Food Grade 5% Acidity',
      arabicName: 'خل أبيض نقي'
    }
  },
  'barbecue-sauce-bottle': {
    titleEn: 'BARBECUE SAUCE BOTTLE',
    descEn: 'Authentic smoky and sweet gourmet barbecue sauce crafted with natural hickory smoke flavor, dark molasses, and spice extracts. Ideal for glazing grilled ribs, chicken wings, burgers, and smoked meats, holding caramelization beautifully on high-heat grills.',
    titleAr: 'صلصة باربيكيو فاخرة',
    descAr: 'صلصة باربيكيو مدخنة وفاخرة بنكهة حطب الهيكوري الطبيعي والعسل الأسود والتوابل الممتازة. مثالية لتتبيل ودهن اللحوم المشوية، أجنحة الدجاج، البرجر، والمأكولات المدخنة، وتوفر تكراملاً رائعاً ولوناً جذاباً على الشوايات العالية الحرارة.',
    specs: {
      img: 'https://pub-2ba7d836ec824f9096f19eb3bcbaa81e.r2.dev/products/barbecue-sauce-bottle-5ea614e80b1750a6948242606b397619384dd64d.png',
      price: '380',
      packSize: '( 12 x 500 ml )',
      netWeight: '6 L (12 Bottles x 500 ml)',
      brand: "Chef's Gourmet",
      origin: 'USA',
      shelfLife: '18 Months',
      storage: 'Store in a cool dry place. Refrigerate after opening.',
      certifications: 'Halal Certified',
      arabicName: 'صلصة باربيكيو فاخرة'
    }
  },
  'white-vinegar-gallon': {
    titleEn: 'WHITE VINEGAR GALLON',
    descEn: 'Commercial bulk 3.78-liter distilled white vinegar gallon containers (4 x 3.78L). Formulated for heavy-duty food production, central kitchens, hotel catering operations, and commercial food processing across the Kingdom.',
    titleAr: 'جالون خل أبيض',
    descAr: 'خل أبيض مقطر نقي بحجم تجاري كبير 3.78 ليتر (4 × 3.78 ليتر). مُعد خصيصاً للمطابخ المركزية، الفنادق، شركات التموين، والمعامل الغذائية في جميع أنحاء المملكة.',
    specs: {
      img: 'https://pub-2ba7d836ec824f9096f19eb3bcbaa81e.r2.dev/generated/white_vinegar_gallon_pack_1786346444982.png',
      price: '210',
      packSize: '( 4 x 3.78 L )',
      netWeight: '15.12 L (4 Gallons x 3.78 L)',
      brand: 'Standard Foodservice',
      origin: 'Saudi Arabia',
      shelfLife: '24 Months',
      storage: 'Store in ambient conditions away from heat.',
      certifications: 'Halal Certified, 5% Acidity',
      arabicName: 'جالون خل أبيض'
    }
  },
  'french-fries-straight-cut': {
    titleEn: 'FRENCH FRIES STRAIGHT CUT',
    descEn: 'BelClass European Grade-A frozen straight-cut French fries (9x9mm cut) packed in 2.5kg commercial bags (4 x 2.5kg). Pre-fried in pure vegetable oil for rapid deep-fry or air-fry prep, delivering a golden crispy exterior and light fluffy potato interior with long hold time.',
    titleAr: 'بطاطس مقلية أصابع',
    descAr: 'بطاطس مقلية أصابع مجمدة عالية الجودة مقاس 9×9 ملم من ماركة بيلكلاس البلجيكية (4 × 2.5 كجم). مقلية مقدماً بزيوت نباتية نقية للطهي السريع في القلايات الدقيقة، تمنحك قشرة ذهبية مقرمشة وقواماً هشاً ولذيذاً من الداخل مع محافطتها على السخونة وقتاً أطول.',
    specs: {
      img: 'https://pub-2ba7d836ec824f9096f19eb3bcbaa81e.r2.dev/generated/french_fries_belclass_pack_1786346429928.png',
      price: '290',
      packSize: '( 4 x 2.5 Kg )',
      netWeight: '10 Kg (4 Bags x 2.5 Kg)',
      brand: 'BelClass Premium',
      origin: 'Belgium',
      shelfLife: '24 Months',
      storage: 'Keep frozen at -18°C or below. Do not refreeze once thawed.',
      certifications: 'Halal Certified, European Quality Grade A',
      arabicName: 'بطاطس مقلية أصابع'
    }
  },
  'mixed-vegetable-pickles': {
    titleEn: 'MIXED VEGETABLE PICKLES',
    descEn: 'Traditional Middle Eastern mixed vegetable pickles cured in seasoned brine supplied in 5kg food-service pails (4 x 5kg). Contains a colorful mix of crunchy carrots, cucumbers, turnips, cauliflower florets, and chili peppers.',
    titleAr: 'مخلل خضار مشكل',
    descAr: 'مخلل خضار مشكل شرقي تقليدي مخلل في محلول ممتع في عبوات تجارية سعة 5 كجم (4 × 5 كجم). يشتمل على مزيج ملون ومقرمش من الجزر، الخيار، اللفت، القرنبيط والفلفل الحار لمقبلات المطاعم والموائد العربية.',
    specs: {
      img: 'https://pub-2ba7d836ec824f9096f19eb3bcbaa81e.r2.dev/generated/mixed_vegetable_pickles_pack_1786346703336.png',
      price: '420',
      packSize: '( 4 x 5 Kg )',
      netWeight: '20 Kg (4 Pails x 5 Kg)',
      brand: 'Orchard Harvest',
      origin: 'Egypt / KSA',
      shelfLife: '12 Months',
      storage: 'Store in a cool dry place. Keep submersed in brine.',
      certifications: 'Halal Certified',
      arabicName: 'مخلل خضار مشكل'
    }
  },
  'tomato-ketchup-gallon': {
    titleEn: 'TOMATO KETCHUP GALLON',
    descEn: 'Heavy-duty commercial tomato ketchup gallons (4 x 5kg). Formulated with high tomato solids for rich viscosity, vibrant red color, and sweet tomato aroma. Designed specifically for refillable pump dispensers, fast-food outlets, and burger bars.',
    titleAr: 'جالون كاتشب طماطم',
    descAr: 'جالون كاتشب طماطم تجاري عالي الكثافة (4 × 5 كجم). محضر بنسبة عالية من لب الطماطم ليعطي قواماً غنياً ولوناً أحمر جذاباً ورائحة طماطم زكية. مصمم لموزعات الصلصات ومطاعم الوجبات السريعة والبرجر.',
    specs: {
      img: 'https://pub-2ba7d836ec824f9096f19eb3bcbaa81e.r2.dev/generated/tomato_ketchup_gallon_pack_1786346630975.png',
      price: '500',
      packSize: '( 4 x 5 Kg )',
      netWeight: '20 Kg (4 Gallons x 5 Kg)',
      brand: 'KitchenPro Commercial',
      origin: 'Saudi Arabia',
      shelfLife: '12 Months',
      storage: 'Store in a cool dry area. Refrigerate after opening.',
      certifications: 'Halal Certified, HACCP Approved',
      arabicName: 'جالون كاتشب طماطم'
    }
  },
  'pickled-cucumber-sliced': {
    titleEn: 'PICKLED CUCUMBER SLICED',
    descEn: 'Crispy, tangy crinkle-cut cucumber pickle slices packed in large 3kg food-service tin cans (6 x 3kg). Pre-sliced to uniform thickness for rapid assembly in burgers, shawarma wraps, club sandwiches, and deli salads.',
    titleAr: 'خيار مخلل شرائح',
    descAr: 'شرائح خيار مخلل مقرمشة ولذيذة مقطعة بانتظام في علب معدنية كبيرة مخصصة للمطاعم (6 × 3 كجم). مقطعة مسبقاً بسمك موحد للتحضير السريع في البرجر، الشاورما، السندويشات والسلطات.',
    specs: {
      img: 'https://pub-2ba7d836ec824f9096f19eb3bcbaa81e.r2.dev/generated/pickled_cucumber_can_pack_1786346461418.png',
      price: '340',
      packSize: '( 6 x 3 Kg )',
      netWeight: '18 Kg (6 Cans x 3 Kg)',
      brand: "Chef's Choice",
      origin: 'Egypt',
      shelfLife: '18 Months',
      storage: 'Store unopened at room temperature. Keep refrigerated once opened.',
      certifications: 'Halal Certified',
      arabicName: 'خيار مخلل شرائح'
    }
  },
  'sweet-corn-canned': {
    titleEn: 'SWEET CORN CANNED',
    descEn: 'Naturally sweet whole-kernel canned corn preserved in light brine (24 x 400g). Harvested at peak ripeness to preserve crisp crunch, vibrant yellow color, and sweet flavor. Essential for salad bars, soups, pizza toppings, and side dishes.',
    titleAr: 'ذرة حلوة معلبة',
    descAr: 'ذرة صفراء حلوة معلبة طبيعياً في محلول خفيف (24 × 400 جرام). مُحصودة في ذروة النضج للحفاظ على القرمشة واللون الأصفر الزاهي والطعم الحلو الطبيعي. أساسية لبوفيهات السلطة، الشوربات، البيتزا والمقبلات.',
    specs: {
      img: 'https://pub-2ba7d836ec824f9096f19eb3bcbaa81e.r2.dev/generated/sweet_corn_canned_pack_1786346860827.png',
      price: '160',
      packSize: '( 24 x 400 g )',
      netWeight: '9.6 Kg (24 Cans x 400 g)',
      brand: 'Golden Harvest',
      origin: 'Thailand / USA',
      shelfLife: '24 Months',
      storage: 'Store in a cool dry place.',
      certifications: 'Halal Certified, Non-GMO',
      arabicName: 'ذرة حلوة معلبة'
    }
  },
  'extra-virgin-olive-oil': {
    titleEn: 'EXTRA VIRGIN OLIVE OIL',
    descEn: 'First cold-pressed Mediterranean Extra Virgin Olive Oil with acidity below 0.8%, supplied in 5L tin containers (4 x 5L). Boasts a fragrant fruity aroma and smooth peppery finish. Perfect for drizzling over hummus, salad dressings, pasta finishing, and premium Mediterranean cooking.',
    titleAr: 'زيت زيتون بكر ممتاز',
    descAr: 'زيت زيتون بكر ممتاز معصور على البارد من حوض البحر الأبيض المتوسط بنسبة حموضة أقل من 0.8% في عبوات معدنية سعة 5 ليتر (4 × 5 ليتر). يتميز بنكهة فاكهية زكية ورائحة زكية. مثالي لسكبه على الحمص، تتبيلات السلطات، الباستا والطهي المتوسطي الفاخر.',
    specs: {
      img: 'https://pub-2ba7d836ec824f9096f19eb3bcbaa81e.r2.dev/products/extra-virgin-olive-oil-b35bcfd42719c75ce2155e5f4945742b75bce429.jpg',
      price: '850',
      packSize: '( 4 x 5 L )',
      netWeight: '20 L (4 Tins x 5 L)',
      brand: 'Mediterranean Harvest',
      origin: 'Spain / Tunisia',
      shelfLife: '24 Months',
      storage: 'Store in a cool dark place away from heat and light.',
      certifications: 'Halal Certified, First Cold Pressed, Max Acidity 0.8%',
      arabicName: 'زيت زيتون بكر ممتاز'
    }
  },
  'tomato-ketchup-squeeze': {
    titleEn: 'TOMATO KETCHUP SQUEEZE',
    descEn: 'Ergonomic tabletop 340g squeeze bottles featuring a non-drip silicone valve (12 x 340g). Ideal for direct customer dining tables in restaurants, diners, cafes, and room service. Ensures clean portioning without spills or crusting around the cap.',
    titleAr: 'كاتشب طماطم عصر',
    descAr: 'عبوات كاتشب طماطم عصر مريحة لليد سعة 340 جرام مجهزة بصمام سيليكون مانع للتنقيط (12 × 340 جرام). مثالية لطاولات الطعام المباشرة في المطاعم، الكافيهات، وخدمة الغرف الفندقية. تضمن تقديم نظيف بدون تسريب أو تكتل حول الغطاء.',
    specs: {
      img: 'https://pub-2ba7d836ec824f9096f19eb3bcbaa81e.r2.dev/generated/tomato_ketchup_squeeze_pack_1786346843906.png',
      price: '120',
      packSize: '( 12 x 340 g )',
      netWeight: '4.08 Kg (12 Squeeze Bottles x 340 g)',
      brand: 'Daily Fresh Tableware',
      origin: 'Saudi Arabia',
      shelfLife: '12 Months',
      storage: 'Store in a cool dry place. Refrigerate after opening.',
      certifications: 'Halal Certified',
      arabicName: 'كاتشب طماطم عصر'
    }
  },
  'black-olives-sliced': {
    titleEn: 'BLACK OLIVES SLICED',
    descEn: 'Uniformly sliced pitted ripe black olives packed in brine in 3kg foodservice containers (6 x 3kg). Firm texture and rich savory olive flavor, perfect for topping pizzas, baking into focaccia, tossing into pasta, and garnishing salads.',
    titleAr: 'زيتون أسود شرائح',
    descAr: 'شرائح زيتون أسود ناضجة ومنزوعة النوى ومقطعة بانتظام في محلول حفظ بعبوات مخصصة للمطاعم سعة 3 كجم (6 × 3 كجم). قوام متماسك ونكهة غنية، مثالية للبيتزا، الفطائر، المخبوزات، الباستا والسلطات.',
    specs: {
      img: 'https://pub-2ba7d836ec824f9096f19eb3bcbaa81e.r2.dev/generated/black_olives_sliced_pack_1786346666862.png',
      price: '310',
      packSize: '( 6 x 3 Kg )',
      netWeight: '18 Kg (6 Containers x 3 Kg)',
      brand: 'Mediterranean Harvest',
      origin: 'Spain / Egypt',
      shelfLife: '18 Months',
      storage: 'Store in a cool dry place. Keep submerged in brine once opened.',
      certifications: 'Halal Certified',
      arabicName: 'زيتون أسود شرائح'
    }
  },
  'black-pepper-powder': {
    titleEn: 'BLACK PEPPER POWDER',
    descEn: 'Pure coarsely ground 100% black pepper powder packaged in dual-pour shaker jars (12 x 500g). Delivers robust heat and aromatic punch for chef prep lines, meat seasoning blends, soups, stews, and table shakers.',
    titleAr: 'فلفل أسود مطحون',
    descAr: 'فلفل أسود مطحون طازج ونقي 100% في عبوات رشاش مزدوجة الاستخدام بحجم 500 جرام (12 × 500 جرام). يمنح طعماً وقوة حرارية ونكهة زكية مخصصة لخطوط الطهي، تتبيل اللحوم والدواجن، الشوربات والصلصات.',
    specs: {
      img: 'https://pub-2ba7d836ec824f9096f19eb3bcbaa81e.r2.dev/generated/black_pepper_powder_pack_1786346685675.png',
      price: '450',
      packSize: '( 12 x 500 g )',
      netWeight: '6 Kg (12 Shaker Jars x 500 g)',
      brand: "Chef's Spice Line",
      origin: 'India / Vietnam',
      shelfLife: '24 Months',
      storage: 'Store in a dry place away from heat and humidity.',
      certifications: 'Halal Certified, Pure 100% Black Pepper',
      arabicName: 'فلفل أسود مطحون'
    }
  }
}

async function populateRichProductData() {
  const db = getDatabase()
  const abTenantId = 'fd4d2be1-6e2d-48cd-88de-0153ab46bfef'
  const prods = await db.select().from(products).where(eq(products.tenantId, abTenantId))

  let count = 0
  for (const p of prods) {
    const item = RICH_PRODUCT_DATA[p.slug]
    if (item) {
      const currentTranslations = (p.translations as Record<string, any>) || {}
      const updatedTranslations = {
        ...currentTranslations,
        ar: {
          name: item.titleAr,
          description: item.descAr
        },
        en: {
          name: item.titleEn,
          description: item.descEn
        }
      }

      await db
        .update(products)
        .set({
          title: item.titleEn,
          description: item.descEn,
          shortDescription: item.specs.packSize || p.shortDescription,
          specifications: item.specs,
          translations: updatedTranslations,
          updatedAt: new Date()
        })
        .where(eq(products.id, p.id))

      console.log(`Updated rich specs & translations for "${item.titleEn}" (${p.slug})`)
      count++
    }
  }
  console.log(`🎉 Successfully updated ${count} products with rich English/Arabic descriptions and complete specifications!`)
}

populateRichProductData().catch(console.error)
