/**
 * Database Seed Script
 *
 * Populates the database with sample data for development and testing.
 * Run with: npx prisma db seed
 */

import { PrismaClient, Role, TransactionType, InvoiceStatus } from "@prisma/client"
import { hash } from "bcryptjs"
import { Decimal } from "decimal.js"

const prisma = new PrismaClient()

async function main() {
  console.log("🌱 Starting database seed...")

  // ============================================================================
  // USERS
  // ============================================================================
  console.log("Creating users...")

  const adminPassword = await hash("Admin123!", 12)
  const staffPassword = await hash("Staff123!", 12)

  const admin = await prisma.user.upsert({
    where: { email: "admin@billing.local" },
    update: {},
    create: {
      email: "admin@billing.local",
      name: "Admin User",
      passwordHash: adminPassword,
      role: Role.ADMIN,
    },
  })

  const staff = await prisma.user.upsert({
    where: { email: "staff@billing.local" },
    update: {},
    create: {
      email: "staff@billing.local",
      name: "Staff User",
      passwordHash: staffPassword,
      role: Role.STAFF,
    },
  })

  console.log(`✅ Created users: ${admin.email}, ${staff.email}`)

  // ============================================================================
  // CATEGORIES
  // ============================================================================
  console.log("Creating categories...")

  const categories = await Promise.all([
    prisma.category.upsert({
      where: { name: "Electronics" },
      update: {},
      create: { name: "Electronics", description: "Electronic devices and accessories" },
    }),
    prisma.category.upsert({
      where: { name: "Groceries" },
      update: {},
      create: { name: "Groceries", description: "Food and household essentials" },
    }),
    prisma.category.upsert({
      where: { name: "Clothing" },
      update: {},
      create: { name: "Clothing", description: "Apparel and fashion items" },
    }),
    prisma.category.upsert({
      where: { name: "Home & Garden" },
      update: {},
      create: { name: "Home & Garden", description: "Home improvement and garden supplies" },
    }),
    prisma.category.upsert({
      where: { name: "Office Supplies" },
      update: {},
      create: { name: "Office Supplies", description: "Stationery and office equipment" },
    }),
  ])

  const [electronics, groceries, clothing, homeGarden, office] = categories
  console.log(`✅ Created ${categories.length} categories`)

  // ============================================================================
  // PRODUCTS
  // ============================================================================
  console.log("Creating products...")

  const productsData = [
    // Electronics
    { name: "Wireless Mouse", sku: "ELEC-001", price: 599, costPrice: 350, stock: 50, minStock: 10, unit: "pcs", hsn: "8471", taxRate: 18, categoryId: electronics.id },
    { name: "USB-C Cable", sku: "ELEC-002", price: 299, costPrice: 150, stock: 100, minStock: 20, unit: "pcs", hsn: "8544", taxRate: 18, categoryId: electronics.id },
    { name: "Bluetooth Earbuds", sku: "ELEC-003", price: 1499, costPrice: 800, stock: 30, minStock: 5, unit: "pcs", hsn: "8518", taxRate: 18, categoryId: electronics.id },
    { name: "Power Bank 10000mAh", sku: "ELEC-004", price: 999, costPrice: 550, stock: 25, minStock: 5, unit: "pcs", hsn: "8507", taxRate: 18, categoryId: electronics.id },

    // Groceries
    { name: "Basmati Rice 5kg", sku: "GROC-001", price: 450, costPrice: 380, stock: 80, minStock: 15, unit: "bag", hsn: "1006", taxRate: 5, categoryId: groceries.id },
    { name: "Cooking Oil 1L", sku: "GROC-002", price: 180, costPrice: 150, stock: 100, minStock: 20, unit: "bottle", hsn: "1507", taxRate: 5, categoryId: groceries.id },
    { name: "Sugar 1kg", sku: "GROC-003", price: 50, costPrice: 42, stock: 150, minStock: 30, unit: "kg", hsn: "1701", taxRate: 5, categoryId: groceries.id },
    { name: "Tea 500g", sku: "GROC-004", price: 280, costPrice: 220, stock: 60, minStock: 10, unit: "pack", hsn: "0902", taxRate: 5, categoryId: groceries.id },

    // Clothing
    { name: "Cotton T-Shirt", sku: "CLTH-001", price: 499, costPrice: 250, stock: 40, minStock: 8, unit: "pcs", hsn: "6109", taxRate: 12, categoryId: clothing.id },
    { name: "Denim Jeans", sku: "CLTH-002", price: 1299, costPrice: 700, stock: 25, minStock: 5, unit: "pcs", hsn: "6203", taxRate: 12, categoryId: clothing.id },
    { name: "Formal Shirt", sku: "CLTH-003", price: 899, costPrice: 450, stock: 30, minStock: 5, unit: "pcs", hsn: "6205", taxRate: 12, categoryId: clothing.id },
    { name: "Sports Socks (3 pairs)", sku: "CLTH-004", price: 199, costPrice: 100, stock: 70, minStock: 15, unit: "pack", hsn: "6115", taxRate: 12, categoryId: clothing.id },

    // Home & Garden
    { name: "LED Bulb 9W", sku: "HOME-001", price: 99, costPrice: 55, stock: 200, minStock: 50, unit: "pcs", hsn: "8539", taxRate: 18, categoryId: homeGarden.id },
    { name: "Garden Hose 15m", sku: "HOME-002", price: 799, costPrice: 450, stock: 15, minStock: 3, unit: "pcs", hsn: "3917", taxRate: 18, categoryId: homeGarden.id },
    { name: "Plant Pot Medium", sku: "HOME-003", price: 149, costPrice: 80, stock: 50, minStock: 10, unit: "pcs", hsn: "6914", taxRate: 18, categoryId: homeGarden.id },
    { name: "Cleaning Spray 500ml", sku: "HOME-004", price: 120, costPrice: 70, stock: 80, minStock: 20, unit: "bottle", hsn: "3402", taxRate: 18, categoryId: homeGarden.id },

    // Office Supplies
    { name: "Notebook A4 200 pages", sku: "OFFC-001", price: 85, costPrice: 45, stock: 100, minStock: 20, unit: "pcs", hsn: "4820", taxRate: 12, categoryId: office.id },
    { name: "Ballpoint Pen (Pack of 10)", sku: "OFFC-002", price: 120, costPrice: 60, stock: 60, minStock: 15, unit: "pack", hsn: "9608", taxRate: 12, categoryId: office.id },
    { name: "Stapler with Pins", sku: "OFFC-003", price: 199, costPrice: 100, stock: 40, minStock: 8, unit: "pcs", hsn: "8305", taxRate: 18, categoryId: office.id },
    { name: "A4 Paper Ream (500 sheets)", sku: "OFFC-004", price: 350, costPrice: 280, stock: 50, minStock: 10, unit: "ream", hsn: "4802", taxRate: 12, categoryId: office.id },
  ]

  for (const product of productsData) {
    await prisma.product.upsert({
      where: { sku: product.sku },
      update: {},
      create: product,
    })
  }

  console.log(`✅ Created ${productsData.length} products`)

  // ============================================================================
  // PARTIES (Customers/Suppliers)
  // ============================================================================
  console.log("Creating parties...")

  const parties = await Promise.all([
    prisma.party.upsert({
      where: { phone: "9876543210" },
      update: {},
      create: {
        name: "Ramesh Kumar",
        phone: "9876543210",
        email: "ramesh@example.com",
        type: "customer",
        billingAddress: "123 MG Road, Bangalore - 560001",
        currentBalance: 2500,
      },
    }),
    prisma.party.upsert({
      where: { phone: "9876543211" },
      update: {},
      create: {
        name: "Suresh Traders",
        phone: "9876543211",
        email: "suresh.traders@example.com",
        gstin: "29AABCU9603R1ZM",
        type: "supplier",
        billingAddress: "45 Industrial Area, Phase 2, Bangalore - 560058",
        currentBalance: -15000,
        creditLimit: 50000,
        creditDays: 30,
      },
    }),
    prisma.party.upsert({
      where: { phone: "9876543212" },
      update: {},
      create: {
        name: "Priya Electronics",
        phone: "9876543212",
        email: "priya.electronics@example.com",
        gstin: "29AABCP1234R1ZN",
        type: "both",
        billingAddress: "78 Commercial Street, Bangalore - 560001",
        currentBalance: 5000,
        creditLimit: 100000,
        creditDays: 15,
      },
    }),
  ])

  console.log(`✅ Created ${parties.length} parties`)

  // ============================================================================
  // SETTINGS
  // ============================================================================
  console.log("Creating settings...")

  const settingsData = [
    {
      key: "business",
      value: {
        businessName: "Demo Billing Store",
        gstin: "29AABCB1234A1ZP",
        address: "123 Main Street, Bangalore - 560001, Karnataka",
        phone: "9876543200",
        email: "contact@demobilling.com",
        tagline: "Your Trusted Billing Partner",
      },
    },
    {
      key: "tax",
      value: {
        defaultTaxRate: 18,
        enableGST: true,
        gstType: "regular",
        stateCode: "29",
      },
    },
    {
      key: "invoice",
      value: {
        salePrefix: "INV",
        purchasePrefix: "PUR",
        expensePrefix: "EXP",
        termsAndConditions: "1. Goods once sold will not be taken back.\n2. Payment due within 15 days of invoice date.\n3. Interest @ 18% p.a. will be charged on overdue payments.",
        thankYouMessage: "Thank you for your business!",
        enableRoundOff: true,
        showHSN: true,
        showDiscount: true,
        printFormat: "a4",
      },
    },
  ]

  for (const setting of settingsData) {
    await prisma.settings.upsert({
      where: { key: setting.key },
      update: { value: setting.value },
      create: setting,
    })
  }

  console.log(`✅ Created ${settingsData.length} settings`)

  // ============================================================================
  // BANK ACCOUNTS
  // ============================================================================
  console.log("Creating bank accounts...")

  const bankAccounts = await Promise.all([
    prisma.bankAccount.create({
      data: {
        name: "Cash in Hand",
        type: "cash",
        balance: 35400,
        isDefault: true,
      },
    }),
    prisma.bankAccount.create({
      data: {
        name: "HDFC Bank Account",
        accountNumber: "1234567890",
        bankName: "HDFC Bank",
        ifsc: "HDFC0001234",
        type: "bank",
        balance: 1742445,
      },
    }),
    prisma.bankAccount.create({
      data: {
        name: "UPI - PhonePe",
        upiId: "business@ybl",
        type: "upi",
        balance: 0,
      },
    }),
  ])

  console.log(`✅ Created ${bankAccounts.length} bank accounts`)

  // ============================================================================
  // SAMPLE INVOICE
  // ============================================================================
  console.log("Creating sample invoice...")

  const products = await prisma.product.findMany({ take: 3 })

  if (products.length >= 3) {
    const invoiceItems = products.map((p, index) => ({
      productId: p.id,
      productName: p.name,
      productSku: p.sku,
      hsn: p.hsn,
      unit: p.unit,
      unitPrice: p.price,
      quantity: index + 1,
      taxRate: p.taxRate || new Decimal(18),
      taxAmount: p.price.mul(p.taxRate || 18).div(100).mul(index + 1),
      discount: new Decimal(0),
      lineTotal: p.price.mul(index + 1).mul(1 + (p.taxRate?.toNumber() || 18) / 100),
    }))

    const subtotal = invoiceItems.reduce(
      (sum, item) => sum.plus(item.unitPrice.mul(item.quantity)),
      new Decimal(0)
    )
    const taxAmount = invoiceItems.reduce(
      (sum, item) => sum.plus(item.taxAmount),
      new Decimal(0)
    )
    const total = subtotal.plus(taxAmount)
    const roundedTotal = Math.round(total.toNumber())
    const roundOff = new Decimal(roundedTotal).minus(total)

    await prisma.invoice.create({
      data: {
        invoiceNumber: "INV-202604-0001",
        type: TransactionType.SALE,
        status: InvoiceStatus.COMPLETED,
        partyId: parties[0].id,
        subtotal,
        taxRate: new Decimal(18),
        cgst: taxAmount.div(2),
        sgst: taxAmount.div(2),
        igst: new Decimal(0),
        taxAmount,
        discountPercent: new Decimal(0),
        discountAmount: new Decimal(0),
        roundOff,
        total: new Decimal(roundedTotal),
        amountPaid: new Decimal(roundedTotal),
        paymentMode: "cash",
        paymentStatus: "paid",
        createdById: staff.id,
        items: {
          create: invoiceItems,
        },
      },
    })

    console.log("✅ Created sample invoice: INV-202604-0001")
  }

  console.log("\n✨ Database seeding completed!")
  console.log("\n📋 Login credentials:")
  console.log("   Admin: admin@billing.local / Admin123!")
  console.log("   Staff: staff@billing.local / Staff123!")
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
