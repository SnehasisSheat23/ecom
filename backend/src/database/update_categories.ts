import { getDatabase } from '../lib/db.js'
import { categories } from '../modules/categories/categories.schema.js'
import { eq } from 'drizzle-orm'

const ARABIC_NAME_MAP: Record<string, string> = {
  'ketchup': 'كاتشب طماطم',
  'vinegar': 'خل طعام أبيض',
  'pickles': 'مخللات متنوعة',
  'sauces-dressing': 'صلصات وتتبيلات فاخرة',
  'canned-fruits-vegetables': 'فواكه وخضروات معلبة',
  'oils': 'زيوت طعام فاخرة',
  'olives': 'زيتون مخلل فاخر',
  'french-fries': 'بطاطس مقلية ممتازة',
  'powdered-spices': 'بهارات وتوابل مطحونة',
  'dairy-items': 'منتجات ألبان وأجبان',
  'cakes': 'كيك وحلويات فاخرة',
  'birthday-cakes': 'كيك عيد ميلاد',
  'anniversary-cakes': 'كيك مناسبات وزفاف',
  'chocolate-cakes': 'كيك الشوكولاتة',
  'cupcakes': 'كب كيك فاخر',
  'combos': 'مجموعات هدايا وتخفيضات',
  'plants': 'نباتات وزهور',
  'flowers': 'زهور طبيعية'
}

function getArabicName(name: string, slug: string): string {
  if (ARABIC_NAME_MAP[slug]) return ARABIC_NAME_MAP[slug]
  
  const lower = name.toLowerCase()
  if (lower.includes('ketchup')) return 'كاتشب طماطم'
  if (lower.includes('vinegar')) return 'خل طعام'
  if (lower.includes('pickle')) return 'مخلل طعام'
  if (lower.includes('sauce') || lower.includes('dressing')) return 'صلصة وتتبيلة'
  if (lower.includes('canned') || lower.includes('corn')) return 'معلبات غدائية'
  if (lower.includes('oil')) return 'زيت طعام'
  if (lower.includes('olive')) return 'زيتون'
  if (lower.includes('fries') || lower.includes('potato')) return 'بطاطس مقلية'
  if (lower.includes('spice') || lower.includes('pepper')) return 'توابل وبهارات'
  if (lower.includes('cheese') || lower.includes('dairy')) return 'أجبان وألبان'
  if (lower.includes('chocolate')) return 'كيك شوكولاتة فاخر'
  if (lower.includes('birthday')) return 'كيك عيد ميلاد'
  if (lower.includes('theme')) return `كيك بمفهوم ${name.replace(/theme|cakes/gi, '').trim()}`
  if (lower.includes('cake')) return `كيك ${name.replace(/cakes|cake/gi, '').trim()}`
  if (lower.includes('gift') || lower.includes('combo')) return 'هدايا ومجموعات ممتازة'
  
  return `فئة ${name}`
}

async function run() {
  const db = getDatabase()
  const allCats = await db.select().from(categories)
  console.log(`Found ${allCats.length} categories to update.`)

  let updatedCount = 0

  for (const cat of allCats) {
    const arName = getArabicName(cat.name, cat.slug)
    const engDesc = `Premium quality ${cat.name} supplied by Abdullah Bakheet Trading Company (Riyadh, KSA, Est. 2004). Serving top restaurants, hotels, caterers, and wholesalers across the Kingdom with trusted international brands.`
    const arDesc = `<p dir="rtl">تأمين أجود منتجات <strong>${arName}</strong> المقدمة من شركة عبد الله بخيت للتجارة (الرياض، المملكة العربية السعودية، تأسست عام 2004). نلبي احتياجات أرقى المطاعم، الفنادق، شركات التموين والإعاشة وتجار الجملة بأعلى معايير الجودة العالمية.</p>`

    const newTranslations = {
      ...(cat.translations as Record<string, any> || {}),
      ar: {
        name: arName,
        description: arDesc
      }
    }

    await db
      .update(categories)
      .set({
        description: engDesc,
        translations: newTranslations,
        updatedAt: new Date()
      })
      .where(eq(categories.id, cat.id))

    updatedCount++
  }

  console.log(`✅ Successfully updated ${updatedCount} categories with English and Arabic translations!`)
  process.exit(0)
}

run().catch((err) => {
  console.error('Error updating categories:', err)
  process.exit(1)
})
