import { getPool } from '../lib/db.js'

interface SubCategoryData {
  en: string
  ar: string
  slug: string
  descriptionEn?: string
  descriptionAr?: string
}

interface ParentCategoryData {
  en: string
  ar: string
  slug: string
  descriptionEn?: string
  descriptionAr?: string
  displayOrder: number
  subcategories: SubCategoryData[]
}

const NEW_CATEGORY_TREE: ParentCategoryData[] = [
  {
    en: "Sauces, Condiments & Dressings",
    ar: "الصلصات والتوابل والصلصات الجافة",
    slug: "sauces-condiments",
    descriptionEn: "Ketchup, mayonnaise, specialty hot sauces, soy sauces, vinegars, and dry condiments.",
    descriptionAr: "كاتشب، مايونيز، صلصات حارة، صوص الصويا، الخل، والمرق والتوابل الجافة.",
    displayOrder: 1,
    subcategories: [
      {
        en: "Ketchup & Table Condiments",
        ar: "الكاتشب ومستلزمات المائدة",
        slug: "ketchup-condiments",
        descriptionEn: "Portion sachets, table bottles, and 5kg foodservice gallons.",
        descriptionAr: "أظرف سفرات، قوارير مائدة، وجوالين 5 كجم لقطاع المطاعم."
      },
      {
        en: "Mayonnaise & Salad Dressings",
        ar: "المايونيز وتتبيلات السلطة",
        slug: "mayo-dressings",
        descriptionEn: "Bulk mayonnaise, portion packs, BBQ sauce, and French dressing.",
        descriptionAr: "مايونيز جملة وسفرات، صوص الشواء، وتتبيلة فرنسية."
      },
      {
        en: "Hot Sauces & Chili Pastes",
        ar: "الشطة والصلصات الحارة",
        slug: "hot-sauces",
        descriptionEn: "Habanero, ghost pepper, sriracha, and sweet pepper paste.",
        descriptionAr: "هابانيرو، شبح، سريراتشا، ومعجون فلفل حلو."
      },
      {
        en: "Asian & Specialty Sauces",
        ar: "الصلصات الآسيوية والمتخصصة",
        slug: "asian-sauces",
        descriptionEn: "Light, dark, and mushroom soy sauces, and oyster sauce.",
        descriptionAr: "صوص الصويا الفاتح والداكن وبالفطر، وصلصة المحار."
      },
      {
        en: "Vinegars",
        ar: "الخل بأنواعه",
        slug: "vinegars",
        descriptionEn: "White vinegar, rice vinegar, and balsamic vinegar.",
        descriptionAr: "خل أبيض، خل أرز، وخل بلسمي فاخر."
      },
      {
        en: "Cheese Sauces & Specialty Mixes",
        ar: "صلصات الجبن والخلطات",
        slug: "cheese-sauces",
        descriptionEn: "Commercial cheddar cheese sauce and creamy blends.",
        descriptionAr: "صلصة جبن شيدر تجارية وخلطات كريمية."
      },
      {
        en: "Dry Condiments & Bouillons",
        ar: "المرق والتوابل الجافة",
        slug: "dry-condiments",
        descriptionEn: "Chicken bouillon, beef bouillon, demi-glace, and instant mashed potatoes.",
        descriptionAr: "مرق دجاج، مرق لحم، ديمي جلاس، وبطاطس مهروسة فورية."
      }
    ]
  },
  {
    en: "Pickles, Olives & Canned Goods",
    ar: "المخللات والزيتون والمعلبات",
    slug: "pickles-olives-canned",
    descriptionEn: "Pickles, Spanish & Greek olives, canned fruits, and preserved vegetables.",
    descriptionAr: "مخللات، زيتون يوناني وإسباني، فواكه معلبة، وخضروات محفوظة.",
    displayOrder: 2,
    subcategories: [
      {
        en: "Pickles & Relishes",
        ar: "المخللات والريلش",
        slug: "pickles-relishes",
        descriptionEn: "Dill pickle chips, whole gherkins, baby gherkins, sweet relish, and jalapeños.",
        descriptionAr: "رقائق مخلل، خيار مخلل كامل وصغير، ريلش حلو، وشرائح هالابينو."
      },
      {
        en: "Olives",
        ar: "الزيتون",
        slug: "olives",
        descriptionEn: "Kalamata olives, Greek black olives, and sliced Spanish green/black olives.",
        descriptionAr: "زيتون كالاماتا، زيتون أسود يوناني، وزيتون إسباني مقطع شرائح."
      },
      {
        en: "Canned Fruits",
        ar: "الفواكه المعلبة",
        slug: "canned-fruits",
        descriptionEn: "Peach halves, pineapple slices, and pear halves in heavy syrup.",
        descriptionAr: "أنصاف خوخ، شرائح أناناس، وأنصاف كمثرى في شراب مركز."
      },
      {
        en: "Canned & Preserved Vegetables",
        ar: "الخضروات المعلبة والمحفوظة",
        slug: "canned-vegetables",
        descriptionEn: "Sliced mushrooms, sweet corn, sundried tomatoes, and edamame.",
        descriptionAr: "فطر مقطع، ذرة حلوة، طماطم مجففة، وإدامامي."
      }
    ]
  },
  {
    en: "Cooking Oils & Fats",
    ar: "زيوت ودهون الطهي",
    slug: "cooking-oils",
    descriptionEn: "Sunflower oil, corn oil, frying oil, and extra virgin olive oil.",
    descriptionAr: "زيت دوار الشمس، زيت الذرة، زيت القلي، وزيت زيتون بكر ممتاز.",
    displayOrder: 3,
    subcategories: [
      {
        en: "Sunflower & Corn Oils",
        ar: "زيت دوار الشمس والذرة",
        slug: "sunflower-corn-oil",
        descriptionEn: "Afia and Elita sunflower & corn oils in retail bottles and 17L tins.",
        descriptionAr: "زيوت عافية وإليتا في عبوات استهلاكية وتنك 17 لتر."
      },
      {
        en: "Frying & Cooking Oils",
        ar: "زيوت القلي والطبخ",
        slug: "frying-oils",
        descriptionEn: "Al Arabi and Halah high-smoke-point frying and cooking oils.",
        descriptionAr: "زيوت العربي وهالة عالية الجودة المخصصة للقلي العميق والطبخ."
      },
      {
        en: "Olive Oil & Specialty Oils",
        ar: "زيت الزيتون والزيوت المتخصصة",
        slug: "olive-oil",
        descriptionEn: "Extra virgin olive oil and cold-pressed specialty blends.",
        descriptionAr: "زيت زيتون بكر ممتاز معصور على البارد."
      }
    ]
  },
  {
    en: "Spices, Herbs & Seasonings",
    ar: "البهارات والأعشاب والتتبيلات",
    slug: "spices-seasonings",
    descriptionEn: "Pure powdered spices, coarse peppercorns, herbs, and custom seasoning blends.",
    descriptionAr: "بهارات مطحونة نقية، حبوب فلفل خشنة، أعشاب مجففة، وخلطات تتبيل.",
    displayOrder: 4,
    subcategories: [
      {
        en: "Powdered Spices",
        ar: "البهارات المطحونة",
        slug: "powdered-spices",
        descriptionEn: "Garlic powder, chili powder, cayenne pepper, onion powder, and MSG.",
        descriptionAr: "مسحوق الثوم، الفلفل الأحمر، الكايين، البصل، وغلوتامات الصوديوم."
      },
      {
        en: "Coarse Spices & Peppercorns",
        ar: "البهارات الخشنة والفلفل",
        slug: "coarse-spices",
        descriptionEn: "Ground & coarse black pepper, peppercorn melange, and ground chipotle.",
        descriptionAr: "فلفل أسود خشن ومطحون، خليط حبوب الفلفل، وفلفل شيبوتلي."
      },
      {
        en: "Dried Herbs & Leaves",
        ar: "الأعشاب وأوراق الطهي",
        slug: "dried-herbs",
        descriptionEn: "Basil leaves, oregano, thyme, rosemary, and parsley flakes.",
        descriptionAr: "أوراق ريحان، أوريغانو، زعتر، إكليل الجبل، وبقدونس مجفف."
      },
      {
        en: "Blended Seasonings",
        ar: "خلطات التوابل الجاهزة",
        slug: "seasoning-blends",
        descriptionEn: "Badia Cajun, Complete Seasoning, Taco/Fajita, and Poultry seasonings.",
        descriptionAr: "بهارات كاجون باديا، البهارات الشاملة، تاكو/فاهيتا، وتوابل الدواجن."
      },
      {
        en: "Bulk & Traditional Spices",
        ar: "بهارات الجملة والخلطات التقليدية",
        slug: "bulk-spices",
        descriptionEn: "Sumac, green thyme, seven spices, and Kabsa & Biryani bulk spice bags.",
        descriptionAr: "سماق، زعتر أخضر، بهارات سبع، وبهارات كبسة وبرياني عبوات جملة 5 كجم."
      }
    ]
  },
  {
    en: "Dairy & Plant-Based Products",
    ar: "منتجات الألبان والبدائل النباتية",
    slug: "dairy-products",
    descriptionEn: "Cheeses, pure butter, milk powders, whipping creams, and plant-based milks.",
    descriptionAr: "أجبان، زبدة طبيعية، حليب مجفف، كريمة خفق، وبدائل الحليب النباتي.",
    displayOrder: 5,
    subcategories: [
      {
        en: "Cheeses",
        ar: "الأجبان",
        slug: "cheeses",
        descriptionEn: "Akawi cheese, mascarpone, mozzarella pearls, and processed cheese blocks.",
        descriptionAr: "جبن عكاوي، ماسكاربوني، كرات الموزاريلا، وقوالب الجبن."
      },
      {
        en: "Butter & Pastry Fats",
        ar: "الزبدة ودهون المخابز",
        slug: "butter-fats",
        descriptionEn: "Saputo unsalted butter 25kg, pastry butter sheets, and roasting spray.",
        descriptionAr: "زبدة سابوتو غير مملحة 25 كجم، رقائق زبدة الكرواسون، وبخاخ الشواء."
      },
      {
        en: "Milk & Creams",
        ar: "الحليب والكريمة",
        slug: "milk-creams",
        descriptionEn: "Anchor milk powder 25kg, Nadec long-life UHT milk, and whipping cream.",
        descriptionAr: "حليب أنكور مجفف 25 كجم، حليب نادك طويل الأجل، وكريمة خفق."
      },
      {
        en: "Plant-Based & Barista Milks",
        ar: "الحليب النباتي والباريسيتا",
        slug: "plant-based-milks",
        descriptionEn: "Alpro Barista coconut, soya, almond, and oat milks for coffee & tea.",
        descriptionAr: "حليب ألبرو باريستا جوز الهند، الصويا، اللوز، والشوفان للمقاهي."
      }
    ]
  },
  {
    en: "Frozen Foods",
    ar: "الأطعمة المجمدة",
    slug: "frozen-foods",
    descriptionEn: "French fries, frozen beef & veal cuts, poultry, and seafood.",
    descriptionAr: "بطاطس مقلية، لحوم ولحم عجل مجمد، دواجن، ومأكولات بحرية.",
    displayOrder: 6,
    subcategories: [
      {
        en: "Potatoes & French Fries",
        ar: "البطاطس المقلية والمتبلة",
        slug: "potatoes-fries",
        descriptionEn: "Straight cut fries (9x9, 7x7), seasoned wedges, and crisscut waffle fries.",
        descriptionAr: "بطاطس مستقيمة، أجنحة بطاطس متبلة، وبطاطس كريس كت."
      },
      {
        en: "Frozen Meat & Veal",
        ar: "اللحوم ولحم العجل المجمد",
        slug: "frozen-meats",
        descriptionEn: "Beef forequarters, topside, striploin, veal legs, and carcasses.",
        descriptionAr: "أرباع لحم بقر، توب سايد، سيقان ولحوم ذبائح العجل."
      },
      {
        en: "Frozen Poultry",
        ar: "الدواجن المجمدة",
        slug: "frozen-poultry",
        descriptionEn: "Whole chicken, chicken drumsticks, and chicken leg quarters 10kg.",
        descriptionAr: "دجاج كامل، أفخاذ دجاج، وأرباع دجاج مجمدة 10 كجم."
      },
      {
        en: "Frozen Seafood",
        ar: "المأكولات البحرية المجمدة",
        slug: "frozen-seafood",
        descriptionEn: "Skin-off frozen shrimp, Kani Osaka crab sticks, octopus (tako), and scallops.",
        descriptionAr: "جمبري بدون قشر، أصابع كابوريا كاني أوساكا، أخطبوط تاكو، وإسكالوب."
      },
      {
        en: "Frozen Asian Specialties",
        ar: "المنتجات الآسيوية المجمدة",
        slug: "asian-frozen",
        descriptionEn: "Osaka frozen udon noodles and miso paste.",
        descriptionAr: "نودلز أودون مجمدة أوساكا ومعجون ميسو."
      }
    ]
  },
  {
    en: "Pasta, Bakery & Sweeteners",
    ar: "المكرونة ومستلزمات المخابز والمحليات",
    slug: "pasta-bakery",
    descriptionEn: "Italian pasta cuts, bakery yeast, pure maple syrup, and natural honey.",
    descriptionAr: "مكرونة إيطالية، خميرة المخابز، شراب القيقب الصافي، والعسل الطبيعي.",
    displayOrder: 7,
    subcategories: [
      {
        en: "Pasta & Noodles",
        ar: "المكرونة والنودلز",
        slug: "pasta-noodles",
        descriptionEn: "Fettuccine, penne rigate, elbow, fusilli, and lasagna sheets.",
        descriptionAr: "فيتوتشيني، بيني ريجاتي، مكرونة كوع، فوسيلي، وشرائح لازانيا."
      },
      {
        en: "Bakery Yeast & Essentials",
        ar: "خميرة المخابز والمحسنات",
        slug: "bakery-yeast",
        descriptionEn: "Saf-Instant yeast Gold & Red (500g) and bread improvers.",
        descriptionAr: "خميرة ساف الفورية الذهبية والحمراء (500 جم) ومحسنات الخبز."
      },
      {
        en: "Honey & Syrups",
        ar: "العسل والشراب",
        slug: "honey-syrups",
        descriptionEn: "Pure maple syrup 250ml & 1L, natural honey, and pancake syrups.",
        descriptionAr: "شراب قيقب صافي 250 مل و1 لتر، عسل طبيعي، وشراب البانكيك."
      }
    ]
  },
  {
    en: "Beverages & Packaged Water",
    ar: "المشروبات والمياه المعبأة",
    slug: "beverages-water",
    descriptionEn: "Evian, Acqua Panna, S.Pellegrino, Perrier, and Twinings fine teas.",
    descriptionAr: "مياه إيفيان، أكوا بانا، سان بيليجرينو، بيريه، وشاي تويننجز الفاخر.",
    displayOrder: 8,
    subcategories: [
      {
        en: "Premium Still Mineral Water",
        ar: "المياه الطبيعية غير الغازية",
        slug: "still-water",
        descriptionEn: "Evian and Acqua Panna in glass bottles and PET packs.",
        descriptionAr: "مياه إيفيان وأكوا بانا الطبيعية في قوارير زجاجية وعبوات بلاستيكية."
      },
      {
        en: "Sparkling Mineral Water",
        ar: "المياه الفوارة",
        slug: "sparkling-water",
        descriptionEn: "Perrier and S.Pellegrino natural sparkling mineral water.",
        descriptionAr: "مياه بيريه وسان بيليجرينو المعدنية الفوارة."
      },
      {
        en: "Tea & Herbal Infusions",
        ar: "الشاي والأعشاب",
        slug: "tea-infusions",
        descriptionEn: "Twinings English Breakfast, Earl Grey, Green Tea Mint, and Chamomile.",
        descriptionAr: "شاي تويننجز إنجليزي، إيرل غري، شاي أخضر بالنعناع، وبابونج نقي."
      }
    ]
  }
]

// Mapping helper to find best matching subcategory or category for existing products
const PRODUCT_MAPPING: Record<string, string> = {
  'CHEDDAR-CHEESE-SAUCE-3KG': 'cheese-sauces',
  'TOMATO-KETCHUP-SACHET-1000': 'ketchup-condiments',
  'WHITE-VINEGAR-BOTTLE-473ML': 'vinegars',
  'BARBECUE-SAUCE-BOTTLE-500ML': 'mayo-dressings',
  'SWEET-CORN-CANNED-3KG': 'canned-vegetables',
  'BLACK-OLIVES-SLICED-3KG': 'olives',
  'FRENCH-FRIES-STRAIGHT-CUT-2.5KG': 'potatoes-fries',
  'BLACK-PEPPER-POWDER-1KG': 'powdered-spices',
  'EVOO-500ML': 'olive-oil',
  'DATES-MEDJOOL-1KG': 'canned-vegetables',
  'PREMIUM-BASMATI-RICE-5KG': 'pasta-noodles'
}

async function runSeed() {
  const pool = getPool()

  console.log('🚀 Starting Category Hierarchy Database Migration...')

  try {
    // 1. Temporarily unset product category references so foreign keys don't block deletion
    console.log('🔄 Unlinking existing products from old categories...')
    await pool.query(`UPDATE v2_products SET category_id = NULL`)

    // 2. Delete existing categories
    console.log('🗑️ Deleting old categories...')
    await pool.query(`DELETE FROM v2_categories`)

    // 3. Insert new parent categories and subcategories
    const slugToIdMap = new Map<string, string>()

    for (const parent of NEW_CATEGORY_TREE) {
      console.log(`📁 Inserting parent category: ${parent.en}...`)
      const parentRes = await pool.query(
        `INSERT INTO v2_categories (translations, status, display_order)
         VALUES ($1, 'active', $2)
         RETURNING id`,
        [
          JSON.stringify({
            en: { name: parent.en, slug: parent.slug, description: parent.descriptionEn },
            ar: { name: parent.ar, slug: parent.slug, description: parent.descriptionAr }
          }),
          parent.displayOrder
        ]
      )

      const parentId = parentRes.rows[0].id
      slugToIdMap.set(parent.slug, parentId)

      // Insert subcategories
      let subOrder = 1
      for (const sub of parent.subcategories) {
        console.log(`  ↳ 📄 Inserting subcategory: ${sub.en}...`)
        const subRes = await pool.query(
          `INSERT INTO v2_categories (parent_id, translations, status, display_order)
           VALUES ($1, $2, 'active', $3)
           RETURNING id`,
          [
            parentId,
            JSON.stringify({
              en: { name: sub.en, slug: sub.slug, description: sub.descriptionEn },
              ar: { name: sub.ar, slug: sub.slug, description: sub.descriptionAr }
            }),
            subOrder++
          ]
        )
        slugToIdMap.set(sub.slug, subRes.rows[0].id)
      }
    }

    console.log(`✅ Inserted ${slugToIdMap.size} total categories & subcategories!`)

    // 4. Re-link existing products to new subcategories
    console.log('🔗 Re-linking products to new categories...')
    const prodsRes = await pool.query(`SELECT id, sku, translations->'en'->>'title' as title FROM v2_products`)
    
    for (const prod of prodsRes.rows) {
      const targetSlug = PRODUCT_MAPPING[prod.sku]
      if (targetSlug && slugToIdMap.has(targetSlug)) {
        const catId = slugToIdMap.get(targetSlug)
        await pool.query(`UPDATE v2_products SET category_id = $1 WHERE id = $2`, [catId, prod.id])
        console.log(`  ✓ Linked product '${prod.title}' (${prod.sku}) -> ${targetSlug}`)
      } else {
        // Fallback: match by title keywords or assign to first category
        const titleLower = (prod.title || '').toLowerCase()
        let fallbackSlug = 'sauces-condiments'
        if (titleLower.includes('cheese') || titleLower.includes('butter') || titleLower.includes('milk')) fallbackSlug = 'cheeses'
        else if (titleLower.includes('olive')) fallbackSlug = 'olives'
        else if (titleLower.includes('fries') || titleLower.includes('chicken') || titleLower.includes('meat')) fallbackSlug = 'potatoes-fries'
        else if (titleLower.includes('pepper') || titleLower.includes('spice')) fallbackSlug = 'powdered-spices'
        else if (titleLower.includes('oil')) fallbackSlug = 'cooking-oils'

        const catId = slugToIdMap.get(fallbackSlug) || slugToIdMap.get('sauces-condiments')
        await pool.query(`UPDATE v2_products SET category_id = $1 WHERE id = $2`, [catId, prod.id])
        console.log(`  ✓ Linked product '${prod.title}' (${prod.sku}) -> fallback: ${fallbackSlug}`)
      }
    }

    console.log('🎉 Category reset and re-linking completed successfully!')
  } catch (err) {
    console.error('❌ Error during category migration:', err)
  } finally {
    await pool.end()
  }
}

runSeed()
