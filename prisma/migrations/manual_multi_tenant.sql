-- Multi-Tenant Migration
-- This migration adds multi-tenant support while preserving existing data

-- ============================================================================
-- STEP 1: Create new tables
-- ============================================================================

-- Create Tenant table
CREATE TABLE IF NOT EXISTS "Tenant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL UNIQUE,
    "email" TEXT,
    "phone" TEXT,
    "logo" TEXT,
    "gstin" TEXT,
    "pan" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "pincode" TEXT,
    "razorpayCustomerId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "Tenant_slug_idx" ON "Tenant"("slug");
CREATE INDEX IF NOT EXISTS "Tenant_isActive_idx" ON "Tenant"("isActive");

-- Create TenantMembership table
CREATE TABLE IF NOT EXISTS "TenantMembership" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'MEMBER',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TenantMembership_userId_tenantId_key" UNIQUE ("userId", "tenantId"),
    CONSTRAINT "TenantMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TenantMembership_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "TenantMembership_userId_idx" ON "TenantMembership"("userId");
CREATE INDEX IF NOT EXISTS "TenantMembership_tenantId_idx" ON "TenantMembership"("tenantId");

-- Create Plan table
CREATE TABLE IF NOT EXISTS "Plan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL UNIQUE,
    "description" TEXT,
    "price" DECIMAL(10,2) NOT NULL,
    "billingInterval" TEXT NOT NULL DEFAULT 'MONTHLY',
    "features" JSONB NOT NULL,
    "razorpayPlanId" TEXT UNIQUE,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPopular" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "Plan_isActive_sortOrder_idx" ON "Plan"("isActive", "sortOrder");

-- Create Subscription table
CREATE TABLE IF NOT EXISTS "Subscription" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL UNIQUE,
    "planId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'TRIALING',
    "trialEndsAt" TIMESTAMP(3),
    "currentPeriodStart" TIMESTAMP(3) NOT NULL,
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "cancelledAt" TIMESTAMP(3),
    "razorpaySubscriptionId" TEXT UNIQUE,
    "razorpayCustomerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Subscription_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Subscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "Subscription_status_idx" ON "Subscription"("status");
CREATE INDEX IF NOT EXISTS "Subscription_currentPeriodEnd_idx" ON "Subscription"("currentPeriodEnd");

-- Create Payment table
CREATE TABLE IF NOT EXISTS "Payment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "subscriptionId" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" TEXT NOT NULL,
    "razorpayPaymentId" TEXT UNIQUE,
    "razorpayOrderId" TEXT,
    "razorpaySignature" TEXT,
    "metadata" JSONB,
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Payment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "Payment_tenantId_idx" ON "Payment"("tenantId");
CREATE INDEX IF NOT EXISTS "Payment_status_idx" ON "Payment"("status");
CREATE INDEX IF NOT EXISTS "Payment_createdAt_idx" ON "Payment"("createdAt");

-- ============================================================================
-- STEP 2: Create default tenant and plan
-- ============================================================================

-- Insert default tenant
INSERT INTO "Tenant" ("id", "name", "slug", "email", "isActive", "createdAt", "updatedAt")
VALUES ('default-tenant-001', 'Default Business', 'default', 'admin@billing.local', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;

-- Insert free plan
INSERT INTO "Plan" ("id", "name", "slug", "description", "price", "billingInterval", "features", "isActive", "sortOrder", "createdAt", "updatedAt")
VALUES (
    'plan-free-001',
    'Free',
    'free',
    'Free plan with basic features',
    0,
    'MONTHLY',
    '{"maxProducts": 50, "maxInvoices": 100, "maxParties": 25, "maxUsers": 2, "features": ["basic_billing", "inventory_tracking"]}',
    true,
    0,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT ("slug") DO NOTHING;

-- Insert pro plan
INSERT INTO "Plan" ("id", "name", "slug", "description", "price", "billingInterval", "features", "isActive", "isPopular", "sortOrder", "createdAt", "updatedAt")
VALUES (
    'plan-pro-001',
    'Pro',
    'pro',
    'Pro plan for growing businesses',
    999,
    'MONTHLY',
    '{"maxProducts": 500, "maxInvoices": -1, "maxParties": -1, "maxUsers": 5, "features": ["basic_billing", "inventory_tracking", "reports", "multi_user", "gst_filing"]}',
    true,
    true,
    1,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT ("slug") DO NOTHING;

-- Insert enterprise plan
INSERT INTO "Plan" ("id", "name", "slug", "description", "price", "billingInterval", "features", "isActive", "sortOrder", "createdAt", "updatedAt")
VALUES (
    'plan-enterprise-001',
    'Enterprise',
    'enterprise',
    'Enterprise plan for large businesses',
    2999,
    'MONTHLY',
    '{"maxProducts": -1, "maxInvoices": -1, "maxParties": -1, "maxUsers": -1, "features": ["basic_billing", "inventory_tracking", "reports", "multi_user", "gst_filing", "api_access", "priority_support", "custom_branding"]}',
    true,
    2,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT ("slug") DO NOTHING;

-- Create subscription for default tenant
INSERT INTO "Subscription" ("id", "tenantId", "planId", "status", "currentPeriodStart", "currentPeriodEnd", "createdAt", "updatedAt")
VALUES (
    'sub-default-001',
    'default-tenant-001',
    'plan-free-001',
    'ACTIVE',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP + INTERVAL '1 year',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT ("tenantId") DO NOTHING;

-- ============================================================================
-- STEP 3: Add tenantId column to existing tables (nullable first)
-- ============================================================================

-- Add tenantId to Category (if not exists)
ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;

-- Add tenantId to Product (if not exists)
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;

-- Add tenantId to Party (if not exists)
ALTER TABLE "Party" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;

-- Add tenantId to Invoice (if not exists)
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;

-- Add tenantId to Settings (if not exists)
ALTER TABLE "Settings" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;

-- Add tenantId to BankAccount (if not exists)
ALTER TABLE "BankAccount" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;

-- ============================================================================
-- STEP 4: Migrate existing data to default tenant
-- ============================================================================

UPDATE "Category" SET "tenantId" = 'default-tenant-001' WHERE "tenantId" IS NULL;
UPDATE "Product" SET "tenantId" = 'default-tenant-001' WHERE "tenantId" IS NULL;
UPDATE "Party" SET "tenantId" = 'default-tenant-001' WHERE "tenantId" IS NULL;
UPDATE "Invoice" SET "tenantId" = 'default-tenant-001' WHERE "tenantId" IS NULL;
UPDATE "Settings" SET "tenantId" = 'default-tenant-001' WHERE "tenantId" IS NULL;
UPDATE "BankAccount" SET "tenantId" = 'default-tenant-001' WHERE "tenantId" IS NULL;

-- ============================================================================
-- STEP 5: Make tenantId NOT NULL and add foreign keys
-- ============================================================================

ALTER TABLE "Category" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "Product" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "Party" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "Invoice" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "Settings" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "BankAccount" ALTER COLUMN "tenantId" SET NOT NULL;

-- Add foreign keys (ignore if exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Category_tenantId_fkey') THEN
        ALTER TABLE "Category" ADD CONSTRAINT "Category_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Product_tenantId_fkey') THEN
        ALTER TABLE "Product" ADD CONSTRAINT "Product_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Party_tenantId_fkey') THEN
        ALTER TABLE "Party" ADD CONSTRAINT "Party_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Invoice_tenantId_fkey') THEN
        ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Settings_tenantId_fkey') THEN
        ALTER TABLE "Settings" ADD CONSTRAINT "Settings_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BankAccount_tenantId_fkey') THEN
        ALTER TABLE "BankAccount" ADD CONSTRAINT "BankAccount_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- ============================================================================
-- STEP 6: Update unique constraints to be tenant-scoped
-- ============================================================================

-- Drop old unique constraints
ALTER TABLE "Category" DROP CONSTRAINT IF EXISTS "Category_name_key";
ALTER TABLE "Product" DROP CONSTRAINT IF EXISTS "Product_sku_key";
ALTER TABLE "Party" DROP CONSTRAINT IF EXISTS "Party_phone_key";
ALTER TABLE "Invoice" DROP CONSTRAINT IF EXISTS "Invoice_invoiceNumber_key";
ALTER TABLE "Settings" DROP CONSTRAINT IF EXISTS "Settings_key_key";

-- Add new tenant-scoped unique constraints
CREATE UNIQUE INDEX IF NOT EXISTS "Category_tenantId_name_key" ON "Category"("tenantId", "name");
CREATE UNIQUE INDEX IF NOT EXISTS "Product_tenantId_sku_key" ON "Product"("tenantId", "sku");
CREATE UNIQUE INDEX IF NOT EXISTS "Party_tenantId_phone_key" ON "Party"("tenantId", "phone") WHERE "phone" IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "Invoice_tenantId_invoiceNumber_key" ON "Invoice"("tenantId", "invoiceNumber");
CREATE UNIQUE INDEX IF NOT EXISTS "Settings_tenantId_key_key" ON "Settings"("tenantId", "key");

-- ============================================================================
-- STEP 7: Add tenant indexes for query performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS "Category_tenantId_idx" ON "Category"("tenantId");
CREATE INDEX IF NOT EXISTS "Category_tenantId_name_idx" ON "Category"("tenantId", "name");

CREATE INDEX IF NOT EXISTS "Product_tenantId_idx" ON "Product"("tenantId");
CREATE INDEX IF NOT EXISTS "Product_tenantId_name_idx" ON "Product"("tenantId", "name");
CREATE INDEX IF NOT EXISTS "Product_tenantId_sku_idx" ON "Product"("tenantId", "sku");
CREATE INDEX IF NOT EXISTS "Product_tenantId_isActive_name_idx" ON "Product"("tenantId", "isActive", "name");
CREATE INDEX IF NOT EXISTS "Product_tenantId_stock_idx" ON "Product"("tenantId", "stock");

CREATE INDEX IF NOT EXISTS "Party_tenantId_idx" ON "Party"("tenantId");
CREATE INDEX IF NOT EXISTS "Party_tenantId_name_idx" ON "Party"("tenantId", "name");
CREATE INDEX IF NOT EXISTS "Party_tenantId_type_idx" ON "Party"("tenantId", "type");
CREATE INDEX IF NOT EXISTS "Party_tenantId_currentBalance_idx" ON "Party"("tenantId", "currentBalance");

CREATE INDEX IF NOT EXISTS "Invoice_tenantId_idx" ON "Invoice"("tenantId");
CREATE INDEX IF NOT EXISTS "Invoice_tenantId_invoiceNumber_idx" ON "Invoice"("tenantId", "invoiceNumber");
CREATE INDEX IF NOT EXISTS "Invoice_tenantId_type_idx" ON "Invoice"("tenantId", "type");
CREATE INDEX IF NOT EXISTS "Invoice_tenantId_status_idx" ON "Invoice"("tenantId", "status");
CREATE INDEX IF NOT EXISTS "Invoice_tenantId_invoiceDate_idx" ON "Invoice"("tenantId", "invoiceDate");
CREATE INDEX IF NOT EXISTS "Invoice_tenantId_createdAt_idx" ON "Invoice"("tenantId", "createdAt");
CREATE INDEX IF NOT EXISTS "Invoice_tenantId_paymentStatus_idx" ON "Invoice"("tenantId", "paymentStatus");
CREATE INDEX IF NOT EXISTS "Invoice_tenantId_type_status_invoiceDate_idx" ON "Invoice"("tenantId", "type", "status", "invoiceDate");

CREATE INDEX IF NOT EXISTS "Settings_tenantId_idx" ON "Settings"("tenantId");
CREATE INDEX IF NOT EXISTS "Settings_tenantId_key_idx" ON "Settings"("tenantId", "key");

CREATE INDEX IF NOT EXISTS "BankAccount_tenantId_idx" ON "BankAccount"("tenantId");
CREATE INDEX IF NOT EXISTS "BankAccount_tenantId_type_idx" ON "BankAccount"("tenantId", "type");
CREATE INDEX IF NOT EXISTS "BankAccount_tenantId_isActive_idx" ON "BankAccount"("tenantId", "isActive");

-- ============================================================================
-- STEP 8: Link existing users to default tenant
-- ============================================================================

INSERT INTO "TenantMembership" ("id", "userId", "tenantId", "role", "isDefault", "joinedAt")
SELECT
    'tm-' || "id",
    "id",
    'default-tenant-001',
    CASE WHEN "role" = 'ADMIN' THEN 'OWNER' ELSE 'MEMBER' END,
    true,
    CURRENT_TIMESTAMP
FROM "User"
WHERE NOT EXISTS (
    SELECT 1 FROM "TenantMembership" WHERE "TenantMembership"."userId" = "User"."id"
);

-- ============================================================================
-- DONE!
-- ============================================================================
