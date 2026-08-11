import { getDatabase } from '../lib/db.js'
import { products } from '../modules/catalog/catalog.schema.js'
import { eq } from 'drizzle-orm'

interface FullProductDataWithArabicSpecs {
  titleEn: string
  descEn: string
  titleAr: string
  descAr: string
  specs: Record<string, string>
}

const BILINGUAL_PRODUCT_DATA: Record<string, FullProductDataWithArabicSpecs> = {
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
      netWeightAr: '15.12 ليتر (4 جالون × 3.78 ليتر)',
      brand: 'Best Foods / Classic Chef',
      brandAr: 'بيست فودز / كلاسيك شيف',
      origin: 'Saudi Arabia',
      originAr: 'المملكة العربية السعودية',
      shelfLife: '12 Months',
      shelfLifeAr: '12 شهراً',
      storage: 'Store in a cool dry place below 25°C. Refrigerate after opening.',
      storageAr: 'يحفظ في مكان بارد وجاف أقل من 25 درجة مئوية. يحفظ بالثلاجة بعد الفتح.',
      certifications: 'Halal Certified, HACCP Approved',
      certificationsAr: 'شهادة حلال، معتمد HACCP',
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
      netWeightAr: '18 كجم (6 سطل × 3 كجم)',
      brand: "Chef's Choice",
      brandAr: 'شفس تشويس',
      origin: 'USA',
      originAr: 'الولايات المتحدة الأمريكية',
      shelfLife: '15 Months',
      shelfLifeAr: '15 شهراً',
      storage: 'Store in a cool dry place. Keep refrigerated after opening.',
      storageAr: 'يحفظ في مكان بارد وجاف. يحفظ بالثلاجة بعد الفتح.',
      certifications: 'Halal Certified',
      certificationsAr: 'شهادة حلال',
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
      netWeightAr: '8 كجم (1000 ظرف × 8 جرام)',
      brand: 'Daily Fresh / Abdullah Bakheet',
      brandAr: 'ديلي فريش / عبد الله بخيت',
      origin: 'Saudi Arabia',
      originAr: 'المملكة العربية السعودية',
      shelfLife: '12 Months',
      shelfLifeAr: '12 شهراً',
      storage: 'Store in a cool dry place away from direct sunlight.',
      storageAr: 'يحفظ في مكان بارد وجاف بعيداً عن أشعة الشمس المباشرة.',
      certifications: 'Halal Certified, ISO 22000',
      certificationsAr: 'شهادة حلال، ISO 22000',
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
      netWeightAr: '5.67 ليتر (12 زجاجة × 473 مل)',
      brand: 'Food Service Standard',
      brandAr: 'ستاندارد الخدمات الغذائية',
      origin: 'Saudi Arabia',
      originAr: 'المملكة العربية السعودية',
      shelfLife: '24 Months',
      shelfLifeAr: '24 شهراً',
      storage: 'Store at ambient room temperature.',
      storageAr: 'يحفظ في درجة حرارة الغرفة العادية.',
      certifications: 'Halal Certified, Food Grade 5% Acidity',
      certificationsAr: 'شهادة حلال، تركيز حموضة 5%',
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
      netWeightAr: '6 ليتر (12 زجاجة × 500 مل)',
      brand: "Chef's Gourmet",
      brandAr: 'شفس غورميه',
      origin: 'USA',
      originAr: 'الولايات المتحدة الأمريكية',
      shelfLife: '18 Months',
      shelfLifeAr: '18 شهراً',
      storage: 'Store in a cool dry place. Refrigerate after opening.',
      storageAr: 'يحفظ في مكان بارد وجاف. يحفظ بالثلاجة بعد الفتح.',
      certifications: 'Halal Certified',
      certificationsAr: 'شهادة حلال',
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
      netWeightAr: '15.12 ليتر (4 جالون × 3.78 ليتر)',
      brand: 'Standard Foodservice',
      brandAr: 'ستاندارد الخدمات الغذائية',
      origin: 'Saudi Arabia',
      originAr: 'المملكة العربية السعودية',
      shelfLife: '24 Months',
      shelfLifeAr: '24 شهراً',
      storage: 'Store in ambient conditions away from heat.',
      storageAr: 'يحفظ في ظروف جافة بعيداً عن الحرارة.',
      certifications: 'Halal Certified, 5% Acidity',
      certificationsAr: 'شهادة حلال، حموضة 5%',
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
      netWeightAr: '10 كجم (4 أكياس × 2.5 كجم)',
      brand: 'BelClass Premium',
      brandAr: 'بيلكلاس فاخر',
      origin: 'Belgium',
      originAr: 'بلجيكا',
      shelfLife: '24 Months',
      shelfLifeAr: '24 شهراً',
      storage: 'Keep frozen at -18°C or below. Do not refreeze once thawed.',
      storageAr: 'يحفظ مجمد عند درجة حرارة -18 مئوية أو أقل.',
      certifications: 'Halal Certified, European Quality Grade A',
      certificationsAr: 'شهادة حلال، جودة أوروبية فئة A',
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
      netWeightAr: '20 كجم (4 سطل × 5 كجم)',
      brand: 'Orchard Harvest',
      brandAr: 'أورشار هارفست',
      origin: 'Egypt / KSA',
      originAr: 'مصر / المملكة العربية السعودية',
      shelfLife: '12 Months',
      shelfLifeAr: '12 شهراً',
      storage: 'Store in a cool dry place. Keep submersed in brine.',
      storageAr: 'يحفظ في مكان بارد وجاف غامراً بالمحلول الملحي.',
      certifications: 'Halal Certified',
      certificationsAr: 'شهادة حلال',
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
      netWeightAr: '20 كجم (4 جالون × 5 كجم)',
      brand: 'KitchenPro Commercial',
      brandAr: 'كيتشن برو تجاري',
      origin: 'Saudi Arabia',
      originAr: 'المملكة العربية السعودية',
      shelfLife: '12 Months',
      shelfLifeAr: '12 شهراً',
      storage: 'Store in a cool dry area. Refrigerate after opening.',
      storageAr: 'يحفظ في مكان بارد وجاف. يحفظ بالثلاجة بعد الفتح.',
      certifications: 'Halal Certified, HACCP Approved',
      certificationsAr: 'شهادة حلال، معتمد HACCP',
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
      netWeightAr: '18 كجم (6 علب × 3 كجم)',
      brand: "Chef's Choice",
      brandAr: 'شفس تشويس',
      origin: 'Egypt',
      originAr: 'مصر',
      shelfLife: '18 Months',
      shelfLifeAr: '18 شهراً',
      storage: 'Store unopened at room temperature. Keep refrigerated once opened.',
      storageAr: 'يحفظ المغلق في درجة حرارة الغرفة. يحفظ بالثلاجة بعد الفتح.',
      certifications: 'Halal Certified',
      certificationsAr: 'شهادة حلال',
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
      netWeightAr: '9.6 كجم (24 علبة × 400 جرام)',
      brand: 'Golden Harvest',
      brandAr: 'جولدن هارفست',
      origin: 'Thailand / USA',
      originAr: 'تايلاند / الولايات المتحدة',
      shelfLife: '24 Months',
      shelfLifeAr: '24 شهراً',
      storage: 'Store in a cool dry place.',
      storageAr: 'يحفظ في مكان بارد وجاف.',
      certifications: 'Halal Certified, Non-GMO',
      certificationsAr: 'شهادة حلال، غير معدل وراثياً',
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
      netWeightAr: '20 ليتر (4 عبوات معدنية × 5 ليتر)',
      brand: 'Mediterranean Harvest',
      brandAr: 'مديترينيان هارفست',
      origin: 'Spain / Tunisia',
      originAr: 'إسبانيا / تونس',
      shelfLife: '24 Months',
      shelfLifeAr: '24 شهراً',
      storage: 'Store in a cool dark place away from heat and light.',
      storageAr: 'يحفظ في مكان بارد ومظلم بعيداً عن الضوء والحرارة.',
      certifications: 'Halal Certified, First Cold Pressed, Max Acidity 0.8%',
      certificationsAr: 'شهادة حلال، عصرة أولى على البارد',
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
      netWeightAr: '4.08 كجم (12 عبوة عصر × 340 جرام)',
      brand: 'Daily Fresh Tableware',
      brandAr: 'ديلي فريش للموائد',
      origin: 'Saudi Arabia',
      originAr: 'المملكة العربية السعودية',
      shelfLife: '12 Months',
      shelfLifeAr: '12 شهراً',
      storage: 'Store in a cool dry place. Refrigerate after opening.',
      storageAr: 'يحفظ في مكان بارد وجاف. يحفظ بالثلاجة بعد الفتح.',
      certifications: 'Halal Certified',
      certificationsAr: 'شهادة حلال',
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
      netWeightAr: '18 كجم (6 عبوات × 3 كجم)',
      brand: 'Mediterranean Harvest',
      brandAr: 'مديترينيان هارفست',
      origin: 'Spain / Egypt',
      originAr: 'إسبانيا / مصر',
      shelfLife: '18 Months',
      shelfLifeAr: '18 شهراً',
      storage: 'Store in a cool dry place. Keep submerged in brine once opened.',
      storageAr: 'يحفظ في مكان بارد وجاف غامراً بالمحلول الملحي بعد الفتح.',
      certifications: 'Halal Certified',
      certificationsAr: 'شهادة حلال',
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
      netWeightAr: '6 كجم (12 عبوة رشاش × 500 جرام)',
      brand: "Chef's Spice Line",
      brandAr: 'ماركة توابل الشيف',
      origin: 'India / Vietnam',
      originAr: 'الهند / فيتنام',
      shelfLife: '24 Months',
      shelfLifeAr: '24 شهراً',
      storage: 'Store in a dry place away from heat and humidity.',
      storageAr: 'يحفظ في مكان جاف بعيداً عن الحرارة والرطوبة.',
      certifications: 'Halal Certified, Pure 100% Black Pepper',
      certificationsAr: 'شهادة حلال، فلفل أسود نقي 100%',
      arabicName: 'فلفل أسود مطحون'
    }
  }
}

async function populateBilingualProductData() {
  const db = getDatabase()
  const abTenantId = 'fd4d2be1-6e2d-48cd-88de-0153ab46bfef'
  const prods = await db.select().from(products).where(eq(products.tenantId, abTenantId))

  let count = 0
  for (const p of prods) {
    const item = BILINGUAL_PRODUCT_DATA[p.slug]
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

      console.log(`Updated bilingual specs & translations for "${item.titleEn}" (${p.slug})`)
      count++
    }
  }
  console.log(`🎉 Successfully updated ${count} products with full bilingual specifications and translations!`)
}

populateBilingualProductData().catch(console.error)
