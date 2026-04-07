/**
 * Multi-Tenant Migration Script
 *
 * This script migrates existing single-tenant data to the new multi-tenant architecture.
 * It creates a default tenant and assigns all existing data to it.
 *
 * Run with: npx ts-node prisma/migrations/migrate-to-multi-tenant.ts
 */

import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  console.log("🚀 Starting multi-tenant migration...")

  // 1. Check if default tenant already exists
  const existingTenant = await prisma.tenant.findUnique({
    where: { slug: "default" },
  })

  if (existingTenant) {
    console.log("✅ Default tenant already exists, skipping creation")
    return
  }

  // 2. Create default tenant
  console.log("📦 Creating default tenant...")
  const defaultTenant = await prisma.tenant.create({
    data: {
      name: "Default Business",
      slug: "default",
      email: "admin@billing.local",
      isActive: true,
    },
  })
  console.log(`✅ Created tenant: ${defaultTenant.id}`)

  // 3. Create default plan (Free)
  console.log("📋 Creating default plan...")
  const freePlan = await prisma.plan.upsert({
    where: { slug: "free" },
    update: {},
    create: {
      name: "Free",
      slug: "free",
      description: "Free plan with basic features",
      price: 0,
      billingInterval: "MONTHLY",
      features: {
        maxProducts: 50,
        maxInvoices: 100,
        maxParties: 25,
        maxUsers: 2,
        features: ["basic_billing", "inventory_tracking"],
      },
      isActive: true,
      sortOrder: 0,
    },
  })
  console.log(`✅ Created Free plan: ${freePlan.id}`)

  // 4. Create subscription for default tenant
  console.log("💳 Creating subscription for default tenant...")
  const now = new Date()
  const oneYearLater = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate())

  await prisma.subscription.create({
    data: {
      tenantId: defaultTenant.id,
      planId: freePlan.id,
      status: "ACTIVE",
      currentPeriodStart: now,
      currentPeriodEnd: oneYearLater,
    },
  })
  console.log("✅ Created subscription")

  // 5. Link all existing users to default tenant
  console.log("👥 Linking users to default tenant...")
  const users = await prisma.user.findMany()

  for (const user of users) {
    await prisma.tenantMembership.upsert({
      where: {
        userId_tenantId: {
          userId: user.id,
          tenantId: defaultTenant.id,
        },
      },
      update: {},
      create: {
        userId: user.id,
        tenantId: defaultTenant.id,
        role: user.role === "ADMIN" ? "OWNER" : "MEMBER",
        isDefault: true,
      },
    })
  }
  console.log(`✅ Linked ${users.length} users`)

  console.log("\n✨ Migration completed successfully!")
  console.log(`\nDefault Tenant ID: ${defaultTenant.id}`)
  console.log("All existing data has been assigned to the default tenant.")
}

main()
  .catch((e) => {
    console.error("❌ Migration failed:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
