/**
 * Settings Service
 *
 * Business logic for application settings management.
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
 */
export class SettingsService {
  /**
   * Get all settings merged with defaults
   */
  static async getAll(): Promise<AppSettings> {
    const settings = await prisma.settings.findMany()

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
   * Get a specific setting by key
   */
  static async get<K extends keyof AppSettings>(key: K): Promise<AppSettings[K]> {
    const setting = await prisma.settings.findUnique({
      where: { key },
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
   * Update a specific setting
   */
  static async update<K extends keyof AppSettings>(
    key: K,
    value: Partial<AppSettings[K]>
  ): Promise<AppSettings[K]> {
    // Get current value
    const current = await this.get(key)

    // Merge with new value
    const merged = {
      ...current,
      ...value,
    }

    // Upsert the setting
    await prisma.settings.upsert({
      where: { key },
      update: { value: merged as object },
      create: { key, value: merged as object },
    })

    return merged
  }

  /**
   * Update all settings at once
   */
  static async updateAll(settings: Partial<AppSettings>): Promise<AppSettings> {
    const updates: Promise<unknown>[] = []

    if (settings.business) {
      updates.push(this.update("business", settings.business))
    }
    if (settings.tax) {
      updates.push(this.update("tax", settings.tax))
    }
    if (settings.invoice) {
      updates.push(this.update("invoice", settings.invoice))
    }

    await Promise.all(updates)

    return this.getAll()
  }

  /**
   * Get the default tax rate
   */
  static async getDefaultTaxRate(): Promise<number> {
    const tax = await this.get("tax")
    return tax.defaultTaxRate
  }

  /**
   * Get invoice prefix by type
   */
  static async getInvoicePrefix(
    type: "sale" | "purchase" | "expense"
  ): Promise<string> {
    const invoice = await this.get("invoice")

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
   * Check if GST is enabled
   */
  static async isGSTEnabled(): Promise<boolean> {
    const tax = await this.get("tax")
    return tax.enableGST
  }

  /**
   * Get business info for invoice header
   */
  static async getBusinessInfo() {
    return this.get("business")
  }

  /**
   * Reset settings to defaults
   */
  static async reset(key?: keyof AppSettings): Promise<void> {
    if (key) {
      await prisma.settings.delete({
        where: { key },
      }).catch(() => {
        // Ignore if doesn't exist
      })
    } else {
      await prisma.settings.deleteMany()
    }
  }
}

export default SettingsService
