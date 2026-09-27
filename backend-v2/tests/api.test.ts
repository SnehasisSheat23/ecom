import { describe, it, expect } from 'vitest'
import { ProductsService } from '../src/modules/products/products.service.js'
import { CategoriesService } from '../src/modules/categories/categories.service.js'
import { CustomersService } from '../src/modules/customers/customers.service.js'
import { OrdersService } from '../src/modules/orders/orders.service.js'

describe('Backend V2 4-Module Architecture Tests', () => {
  const productsService = new ProductsService()
  const categoriesService = new CategoriesService()
  const customersService = new CustomersService()
  const ordersService = new OrdersService()

  it('should fetch category tree with subcategories', async () => {
    const tree = await categoriesService.getCategories({ tree: true, lang: 'en' })
    expect(tree).toBeDefined()
    expect(tree.length).toBeGreaterThan(0)
    const catWithChildren = tree.find((c: any) => c.children && c.children.length > 0)
    if (catWithChildren) {
      expect(catWithChildren.children.length).toBeGreaterThan(0)
    }
  })

  it('should list products with English & AED default formatting', async () => {
    const res = await productsService.getProducts({ lang: 'en', currency: 'AED' })
    expect(res.items).toBeDefined()
    expect(res.items.length).toBeGreaterThan(0)
    expect(res.items[0].currency).toBe('AED')
    expect(res.items[0].title).toBeDefined()
  })

  it('should resolve product in Arabic & USD pricing', async () => {
    const list = await productsService.getProducts({ lang: 'en', limit: 1 })
    const sample = list.items[0]
    const res = await productsService.getProductByIdOrSlug(sample.id, 'ar', 'USD')
    expect(res).not.toBeNull()
    expect(res?.currency).toBe('USD')
    expect(res?.title).toBeDefined()
    expect(res?.price).toBeGreaterThan(0)
  })

  it('should support SAR, INR, GBP, and EUR currency resolution', async () => {
    const list = await productsService.getProducts({ lang: 'en', limit: 1 })
    const sample = list.id ? sample : list.items[0]
    const sarRes = await productsService.getProductByIdOrSlug(sample.id, 'en', 'SAR')
    expect(sarRes?.currency).toBe('SAR')
    expect(sarRes?.price).toBeGreaterThan(0)

    const inrRes = await productsService.getProductByIdOrSlug(sample.id, 'en', 'INR')
    expect(inrRes?.currency).toBe('INR')
    expect(inrRes?.price).toBeGreaterThan(0)

    const gbpRes = await productsService.getProductByIdOrSlug(sample.id, 'en', 'GBP')
    expect(gbpRes?.currency).toBe('GBP')
    expect(gbpRes?.price).toBeGreaterThan(0)

    const eurRes = await productsService.getProductByIdOrSlug(sample.id, 'en', 'EUR')
    expect(eurRes?.currency).toBe('EUR')
    expect(eurRes?.price).toBeGreaterThan(0)
  })

  it('should validate MOQ and MOQ Step constraints', async () => {
    const list = await productsService.getProducts({ lang: 'en', limit: 1 })
    const sample = list.items[0]
    const valid = await productsService.validateMoq(sample.id, (sample.moq || 1) + (sample.moqStep || 1))
    expect(valid.valid).toBe(true)

    const invalidMin = await productsService.validateMoq(sample.id, 0)
    expect(invalidMin.valid).toBe(false)
  })

  it('should create customer and manage address book', async () => {
    const customer = await customersService.createCustomer({
      email: `test-${Date.now()}@example.com`,
      firstName: 'Hamdan',
      lastName: 'Al-Maktoum',
      phone: '+971500000000',
    })
    expect(customer.id).toBeDefined()

    const address = await customersService.addAddress(customer.id, {
      label: 'Office',
      recipientName: 'Hamdan Al-Maktoum',
      addressLine1: 'Downtown Dubai, Business Bay',
      city: 'Dubai',
      country: 'United Arab Emirates',
      isDefault: true,
    })
    expect(address.id).toBeDefined()

    const customerDetails = await customersService.getCustomerById(customer.id)
    expect(customerDetails?.addresses.length).toBe(1)
  })

  it('should place order and enforce MOQ validation', async () => {
    const product = await productsService.getProductByIdOrSlug('EVOO-500ML')
    expect(product).not.toBeNull()

    // Placing order with valid quantity (10)
    const order = await ordersService.createOrder({
      currency: 'AED',
      shippingCost: 15,
      items: [
        {
          productId: product!.id,
          quantity: 10,
        },
      ],
    })

    expect(order).not.toBeNull()
    expect(order?.status).toBe('PENDING')
    expect(order?.items.length).toBe(1)
    expect(order?.items[0].quantity).toBe(10)

    // Updating status
    const updated = await ordersService.updateOrderStatus(order!.id, 'shipped')
    expect(updated?.status).toBe('shipped')
  })

  it('should create product, update title, and persist title changes accurately', async () => {
    const created = await productsService.createProduct({
      title: 'Initial Product Title',
      price: 25,
      currency: 'SAR',
    })
    expect(created.id).toBeDefined()
    expect(created.title).toBe('Initial Product Title')

    // Update the title
    const updated = await productsService.updateProduct(created.id, {
      title: 'Updated Brand New Product Title',
      translations: {
        en: {
          title: 'Initial Product Title', // Simulate stale translations in payload
          description: '',
          slug: 'initial-product-title',
        },
      },
    })
    expect(updated).not.toBeNull()
    expect(updated?.title).toBe('Updated Brand New Product Title')

    // Fetch by ID to confirm database persistence
    const fetched = await productsService.getProductByIdOrSlug(created.id, 'en', 'SAR')
    expect(fetched).not.toBeNull()
    expect(fetched?.title).toBe('Updated Brand New Product Title')

    // Cleanup
    await productsService.deleteProduct(created.id)
  })
})
