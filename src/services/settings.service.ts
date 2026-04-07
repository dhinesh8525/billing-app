/**
 * Settings Service
 *
 * Business logic for application settings management.
 *
 * MULTI-TENANT: All operations are scoped to tenantId
 */

import { prisma } from "@/lib/db"
import { AppSettings } from "@/validations/settings.schema"

// Default settings values
const defaultSettings: AppSettings = {
  business: {
    businessName: "My Business",
    address: "",
    phone: null,
    email: null,
    gstin: null,
    pan: null,
    logo: null,
    tagline: null,
    signature: null,
  },
  tax: {
    defaultTaxRate: 18,
    enableGST: true,
    gstType: "regular",
    stateCode: null,
  },
  invoice: {
    salePrefix: "INV",
    purchasePrefix: "PUR",
    expensePrefix: "EXP",
    termsAndConditions: null,
    thankYouMessage: "Thank you for your business!",
    enableRoundOff: true,
    showHSN: true,
    showDiscount: true,
    printFormat: "a4",
  },
}

/**
 * Settings Service class with static methods for settings operations
 * All methods require tenantId for multi-tenant isolation
 */
export class SettingsService {
  /**
   * Get all settings merged with defaults (tenant-scoped)
   */
  static async getAll(tenantId: string): Promise<AppSettings> {
    const settings = await prisma.settings.findMany({
      where: { tenantId }, // CRITICAL: Always filter by tenant
    })

    const settingsMap = new Map(
      settings.map((s) => [s.key, s.value as Record<string, unknown>])
    )

    return {
      business: {
        ...defaultSettings.business,
        ...(settingsMap.get("business") || {}),
      },
      tax: {
        ...defaultSettings.tax,
        ...(settingsMap.get("tax") || {}),
      },
      invoice: {
        ...defaultSettings.invoice,
        ...(settingsMap.get("invoice") || {}),
      },
    } as AppSettings
  }

  /**
   * Get a specific setting by key (tenant-scoped)
   */
  static async get<K extends keyof AppSettings>(tenantId: string, key: K): Promise<AppSettings[K]> {
    const setting = await prisma.settings.findFirst({
      where: { key, tenantId }, // CRITICAL: Always filter by tenant
    })

    if (!setting) {
      return defaultSettings[key]
    }

    return {
      ...defaultSettings[key],
      ...(setting.value as object),
    } as AppSettings[K]
  }

  /**
   * Update a specific setting (tenant-scoped)
   */
  static async update<K extends keyof AppSettings>(
    tenantId: string,
    key: K,
    value: Partial<AppSettings[K]>
  ): Promise<AppSettings[K]> {
    // Get current value
    const current = await this.get(tenantId, key)

    // Merge with new value
    const merged = {
      ...current,
      ...value,
    }

    // Find existing setting
    const existing = await prisma.settings.findFirst({
      where: { key, tenantId },
    })

    if (existing) {
      // Update existing
      await prisma.settings.update({
        where: { id: existing.id },
        data: { value: merged as object },
      })
    } else {
      // Create new
      await prisma.settings.create({
        data: { tenantId, key, value: merged as object },
      })
    }

    return merged
  }

  /**
   * Update all settings at once (tenant-scoped)
   */
  static async updateAll(tenantId: string, settings: Partial<AppSettings>): Promise<AppSettings> {
    const updates: Promise<unknown>[] = []

    if (settings.business) {
      updates.push(this.update(tenantId, "business", settings.business))
    }
    if (settings.tax) {
      updates.push(this.update(tenantId, "tax", settings.tax))
    }
    if (settings.invoice) {
      updates.push(this.update(tenantId, "invoice", settings.invoice))
    }

    await Promise.all(updates)

    return this.getAll(tenantId)
  }

  /**
   * Get the default tax rate (tenant-scoped)
   */
  static async getDefaultTaxRate(tenantId: string): Promise<number> {
    const tax = await this.get(tenantId, "tax")
    return tax.defaultTaxRate
  }

  /**
   * Get invoice prefix by type (tenant-scoped)
   */
  static async getInvoicePrefix(
    tenantId: string,
    type: "sale" | "purchase" | "expense"
  ): Promise<string> {
    const invoice = await this.get(tenantId, "invoice")

    switch (type) {
      case "sale":
        return invoice.salePrefix
      case "purchase":
        return invoice.purchasePrefix
      case "expense":
        return invoice.expensePrefix
      default:
        return "INV"
    }
  }

  /**
   * Check if GST is enabled (tenant-scoped)
   */
  static async isGSTEnabled(tenantId: string): Promise<boolean> {
    const tax = await this.get(tenantId, "tax")
    return tax.enableGST
  }

  /**
   * Get business info for invoice header (tenant-scoped)
   */
  static async getBusinessInfo(tenantId: string) {
    return this.get(tenantId, "business")
  }

  /**
   * Reset settings to defaults (tenant-scoped)
   */
  static async reset(tenantId: string, key?: keyof AppSettings): Promise<void> {
    if (key) {
      await prisma.settings.deleteMany({
        where: { key, tenantId }, // CRITICAL: Always filter by tenant
      }).catch(() => {
        // Ignore if doesn't exist
      })
    } else {
      await prisma.settings.deleteMany({
        where: { tenantId }, // CRITICAL: Always filter by tenant
      })
    }
  }
}

export default SettingsService
