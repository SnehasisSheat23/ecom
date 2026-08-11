import { getDatabase } from '../lib/db.js'
import { products } from '../modules/catalog/catalog.schema.js'
import { eq } from 'drizzle-orm'

interface ProductTextUpdate {
  titleEn: string
  descEn: string
  titleAr: string
  descAr: string
}

const PRODUCT_TEXTS: Record<string, ProductTextUpdate> = {
  'mayonnaise-classic-gallon': {
    titleEn: 'MAYONNAISE CLASSIC GALLON',
    descEn: 'Premium rich and creamy classic mayonnaise packaged in bulk gallons (4 x 3.78L). Ideal for high-volume commercial kitchens, restaurants, and catering services across Saudi Arabia.',
    titleAr: 'مايونيز كلاسيك جالون',
    descAr: 'مايونيز كلاسيك فاخر بقوام غني وكريمي في عبوات الجالون التجارية (4 × 3.78 ليتر). مثالي للمطاعم الكبرى، المطابخ التجارية، وشركات الإعاشة والتموين في جميع أنحاء المملكة.'
  },
  'cheddar-cheese-sauce': {
    titleEn: 'CHEDDAR CHEESE SAUCE',
    descEn: 'Smooth, rich, and velvety commercial cheddar cheese sauce in 3kg food-service tubs (6 x 3kg). Perfect for nachos, burgers, fries, and warm dip stations.',
    titleAr: 'صلصة جبنة شيدر',
    descAr: 'صلصة جبنة شيدر غنية ومخملية في عبوات مخصصة للخدمات الغذائية بحجم 3 كجم (6 × 3 كجم). مثالية للبرجر، البطاطس المقلية، الناتشوز ومحطات التقديم الساخنة.'
  },
  'tomato-ketchup-portion': {
    titleEn: 'TOMATO KETCHUP PORTION',
    descEn: 'Single-serve 8g tomato ketchup sachets in bulk boxes (1000 x 8g). Hygienic, convenient single portions for fast-food chains, takeaways, room service, and outdoor catering.',
    titleAr: 'كاتشب طماطم مظاريف',
    descAr: 'مظاريف كاتشب طماطم فردية بحجم 8 جرام في كرتون تجاري (1000 × 8 جرام). خيار صحي ومريح للوجبات السريعة، الطلبات الخارجية، خدمة الغرف، والفعاليات الخارجية.'
  },
  'white-vinegar-bottle': {
    titleEn: 'WHITE VINEGAR BOTTLE',
    descEn: 'Pure distilled white food-grade vinegar 5% acidity in 473ml retail/table bottles (12 x 473ml). Essential for culinary preparations, salad dressings, and marinades.',
    titleAr: 'خل أبيض نقي',
    descAr: 'خل طعام أبيض مقطر نقي بنسبة حموضة 5% في زجاجات سعة 473 مل (12 × 473 مل). أساسي لتتبيل السلطات، تجهيز المأكولات، والتحضيرات الفندقية.'
  },
  'barbecue-sauce-bottle': {
    titleEn: 'BARBECUE SAUCE BOTTLE',
    descEn: 'Smoky and tangy gourmet barbecue sauce formulated for grilling, basting, and dipping. Premium food-grade packaging for commercial kitchens.',
    titleAr: 'صلصة باربيكيو فاخرة',
    descAr: 'صلصة باربيكيو مدخنة وفاخرة مخصصة للشواء وتتبيل اللحوم والدواجن. تعطي طعماً غنياً ومثالياً للمطاعم والفنادق.'
  },
  'white-vinegar-gallon': {
    titleEn: 'WHITE VINEGAR GALLON',
    descEn: 'Commercial grade 3.78L white distilled vinegar in bulk gallons (4 x 3.78L). Used extensively in hotel kitchens, food manufacturing, and large catering units.',
    titleAr: 'جالون خل أبيض',
    descAr: 'خل أبيض مقطر تجاري ممتاز بحجم الجالون 3.78 ليتر (4 × 3.78 ليتر). يستخدم على نطاق واسع في مطابخ الفنادق، شركات التموين، والمعامل الغذائية.'
  },
  'french-fries-straight-cut': {
    titleEn: 'FRENCH FRIES STRAIGHT CUT',
    descEn: 'Crispy golden straight-cut frozen French fries (4 x 2.5kg). Pre-fried Belgian style for maximum crispiness and heat retention in quick-service restaurants.',
    titleAr: 'بطاطس مقلية أصابع',
    descAr: 'أصابع بطاطس مقلية مجمدة مقرمشة وذهبية (4 × 2.5 كجم). مصنعة بأعلى المعايير الأوروبية لضمان القرمشة والمحافظة على الحرارة في مطاعم الوجبات السريعة.'
  },
  'mixed-vegetable-pickles': {
    titleEn: 'MIXED VEGETABLE PICKLES',
    descEn: 'Traditional assorted mixed vegetable pickles in savory brine (4 x 5kg). Includes carrots, cucumbers, cauliflower, and peppers for authentic Middle Eastern mezze.',
    titleAr: 'مخلل خضار مشكل',
    descAr: 'مخلل خضار مشكل تقليدي بطعمه ونكهته الممتازة في محلول ملحي متوازن (4 × 5 كجم). يحتوي على الجزر، الخيار، القرنبيط والفلفل لمقبلات المائدة الشرقية.'
  },
  'tomato-ketchup-gallon': {
    titleEn: 'TOMATO KETCHUP GALLON',
    descEn: 'Rich, thick commercial tomato ketchup in heavy-duty 5kg gallons (4 x 5kg). Designed for bulk condiment dispensers and high-volume burger restaurants.',
    titleAr: 'جالون كاتشب طماطم',
    descAr: 'كاتشب طماطم تجاري غني وكثيف في عبوات جالون سعة 5 كجم (4 × 5 كجم). مصمم لموزعات الكاتشب الكبيرة ومطاعم الوجبات السريعة.'
  },
  'pickled-cucumber-sliced': {
    titleEn: 'PICKLED CUCUMBER SLICED',
    descEn: 'Crunchy, tangy sliced pickled cucumbers in foodservice tin cans (6 x 3kg). Ready to insert straight into burgers, shawarma, sandwiches, and wraps.',
    titleAr: 'خيار مخلل شرائح',
    descAr: 'شرائح خيار مخلل مقرمشة ولذيذة في علب معدنية مخصصة للمطاعم (6 × 3 كجم). جاهزة للاستخدام المباشر في البرجر، الشاورما والسندويشات.'
  },
  'sweet-corn-canned': {
    titleEn: 'SWEET CORN CANNED',
    descEn: 'Naturally sweet whole-kernel canned corn in brine (24 x 400g). Crisp texture perfect for salads, soups, pizzas, and side dishes.',
    titleAr: 'ذرة حلوة معلبة',
    descAr: 'حبات ذرة ذهبية حلوة معلبة طبيعياً في المحلول (24 × 400 جرام). قوام مقرمش وطازج مثالي للسلطات، الشوربات، البيتزا والمقبلات.'
  },
  'extra-virgin-olive-oil': {
    titleEn: 'EXTRA VIRGIN OLIVE OIL',
    descEn: 'First cold-pressed premium Extra Virgin Olive Oil in 5L bulk containers (4 x 5L). Rich in antioxidants with low acidity for fine dining and gourmet cooking.',
    titleAr: 'زيت زيتون بكر ممتاز',
    descAr: 'زيت زيتون بكر ممتاز معصور على البارد في عبوات سعة 5 ليتر (4 × 5 ليتر). نكهة غنية، حموضة منخفضة ومثالي للمطاعم الفاخرة والطهي الرفيع.'
  },
  'tomato-ketchup-squeeze': {
    titleEn: 'TOMATO KETCHUP SQUEEZE',
    descEn: 'Convenient tabletop 340g squeeze bottles of tomato ketchup (12 x 340g). Non-drip flip cap for table service in cafes, diners, and hotel restaurants.',
    titleAr: 'كاتشب طماطم عصر',
    descAr: 'عبوات كاتشب طماطم ضغط سهلة الاستخدام بحجم 340 جرام (12 × 340 جرام). غطاء محكم بالتنقيط مخصص لخدمة الطاولات في الكافيهات والمطاعم.'
  },
  'black-olives-sliced': {
    titleEn: 'BLACK OLIVES SLICED',
    descEn: 'Uniformly sliced dark ripe black olives in brine (6 x 3kg). Ready-to-use ingredient for pizzas, pasta dishes, salads, and bakery toppings.',
    titleAr: 'زيتون أسود شرائح',
    descAr: 'شرائح زيتون أسود ناضجة ومقطعة بانتظام في محلول حفظ (6 × 3 كجم). جاهزة للاستخدام الفوري للبيتزا، الباستا، السلطات والمخبوزات.'
  },
  'black-pepper-powder': {
    titleEn: 'BLACK PEPPER POWDER',
    descEn: 'Coarse ground aromatic black pepper powder in dual-flip shaker jars (12 x 500g). Delivers intense heat and robust aroma for chef seasoning lines.',
    titleAr: 'فلفل أسود مطحون',
    descAr: 'فلفل أسود مطحون نقي وطازج في عبوات رشاش مزدوجة (12 × 500 جرام). يمنح طعماً وحرارة زكية لإعداد التوابل والبهارات في المطابخ الاحترافية.'
  }
}

async function updateAllProductTranslations() {
  const db = getDatabase()
  const abTenantId = 'fd4d2be1-6e2d-48cd-88de-0153ab46bfef'
  const prods = await db.select().from(products).where(eq(products.tenantId, abTenantId))

  let count = 0
  for (const p of prods) {
    const textInfo = PRODUCT_TEXTS[p.slug]
    if (textInfo) {
      const currentTranslations = (p.translations as Record<string, any>) || {}
      const updatedTranslations = {
        ...currentTranslations,
        ar: {
          name: textInfo.titleAr,
          description: textInfo.descAr
        },
        en: {
          name: textInfo.titleEn,
          description: textInfo.descEn
        }
      }

      await db
        .update(products)
        .set({
          title: textInfo.titleEn,
          description: textInfo.descEn,
          translations: updatedTranslations,
          updatedAt: new Date()
        })
        .where(eq(products.id, p.id))

      console.log(`Updated translations for "${textInfo.titleEn}" (${p.slug})`)
      count++
    }
  }
  console.log(`✅ Successfully updated English & Arabic titles and descriptions for ${count} products!`)
}

updateAllProductTranslations().catch(console.error)
