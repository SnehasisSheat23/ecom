import { Hono } from 'hono'
import { CategoriesService } from './categories.service.js'

const categoriesService = new CategoriesService()

export const categoriesRoutes = new Hono()

// GET /api/v1/categories - List categories (with optional ?tree=true and ?lang=en|ar)
categoriesRoutes.get('/', async (c) => {
  const lang = (c.req.query('lang') as 'en' | 'ar') || 'en'
  const tree = c.req.query('tree') === 'true'

  const result = await categoriesService.getCategories({ lang, tree })
  return c.json({ success: true, data: result })
})

// GET /api/v1/categories/:idOrSlug - Get category by ID or Slug with subcategories
categoriesRoutes.get('/:idOrSlug', async (c) => {
  const idOrSlug = c.req.param('idOrSlug')
  const lang = (c.req.query('lang') as 'en' | 'ar') || 'en'

  const category = await categoriesService.getCategoryByIdOrSlug(idOrSlug, lang)
  if (!category) {
    return c.json({ success: false, error: 'Category not found' }, 404)
  }
  return c.json({ success: true, data: category })
})

// POST /api/v1/categories - Create category
categoriesRoutes.post('/', async (c) => {
  try {
    const body = await c.req.json()
    const category = await categoriesService.createCategory(body)
    return c.json({ success: true, data: category }, 201)
  } catch (err: any) {
    return c.json({ success: false, error: err.message || 'Failed to create category' }, 400)
  }
})

// Update category handler (supports both PUT and PATCH)
const handleUpdateCategory = async (c: any) => {
  try {
    const id = c.req.param('id')
    const body = await c.req.json()
    const updated = await categoriesService.updateCategory(id, body)
    if (!updated) {
      return c.json({ success: false, error: 'Category not found' }, 404)
    }
    return c.json({ success: true, data: updated })
  } catch (err: any) {
    return c.json({ success: false, error: err.message || 'Failed to update category' }, 400)
  }
}

categoriesRoutes.put('/:id', handleUpdateCategory)
categoriesRoutes.patch('/:id', handleUpdateCategory)

// DELETE /api/v1/categories/:id - Delete category
categoriesRoutes.delete('/:id', async (c) => {
  const id = c.req.param('id')
  const deleted = await categoriesService.deleteCategory(id)
  if (!deleted) {
    return c.json({ success: false, error: 'Category not found' }, 404)
  }
  return c.json({ success: true, message: 'Category deleted', data: deleted })
})
