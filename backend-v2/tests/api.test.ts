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
    // Check root category has children (subcategories)
    const saucesCat = tree.find((c: any) => c.slug === 'sauces-dressing')
    expect(saucesCat).toBeDefined()
    expect(saucesCat.children.length).toBeGreaterThan(0)
  })

  it('should list products with English & AED default formatting', async () => {
    const res = await productsService.getProducts({ lang: 'en', currency: 'AED' })
    expect(res.items).toBeDefined()
    expect(res.items.length).toBeGreaterThan(0)
    expect(res.items[0].currency).toBe('AED')
    expect(res.items[0].title).toBeDefined()
  })

  it('should resolve product in Arabic & USD pricing', async () => {
    const res = await productsService.getProductByIdOrSlug('EVOO-500ML', 'ar', 'USD')
    expect(res).not.toBeNull()
    expect(res?.currency).toBe('USD')
    expect(res?.title).toBeDefined()
    expect(res?.price).toBeGreaterThan(0)
  })

  it('should support SAR, INR, GBP, and EUR currency resolution', async () => {
    const sarRes = await productsService.getProductByIdOrSlug('EVOO-500ML', 'en', 'SAR')
    expect(sarRes?.currency).toBe('SAR')
    expect(sarRes?.price).toBeGreaterThan(0)

    const inrRes = await productsService.getProductByIdOrSlug('EVOO-500ML', 'en', 'INR')
    expect(inrRes?.currency).toBe('INR')
    expect(inrRes?.price).toBeGreaterThan(0)

    const gbpRes = await productsService.getProductByIdOrSlug('EVOO-500ML', 'en', 'GBP')
    expect(gbpRes?.currency).toBe('GBP')
    expect(gbpRes?.price).toBeGreaterThan(0)

    const eurRes = await productsService.getProductByIdOrSlug('EVOO-500ML', 'en', 'EUR')
    expect(eurRes?.currency).toBe('EUR')
    expect(eurRes?.price).toBeGreaterThan(0)
  })

  it('should validate MOQ and MOQ Step constraints', async () => {
    // MOQ is 5, Step is 5 for EVOO-500ML
    const valid = productsService.validateMoq(5, 5, 10)
    expect(valid.valid).toBe(true)

    const invalidMin = productsService.validateMoq(5, 5, 3)
    expect(invalidMin.valid).toBe(false)
    expect(invalidMin.reason).toContain('at least minimum order quantity of 5')

    const invalidStep = productsService.validateMoq(5, 5, 7)
    expect(invalidStep.valid).toBe(false)
    expect(invalidStep.reason).toContain('increments of 5')
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
})
