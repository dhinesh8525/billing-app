import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { Decimal } from "decimal.js"

/**
 * Merge Tailwind CSS classes with proper precedence
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format number as Indian Rupee currency
 */
export function formatCurrency(amount: number | string | Decimal): string {
  const num = typeof amount === "string" ? parseFloat(amount) :
              amount instanceof Decimal ? amount.toNumber() : amount

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num)
}

/**
 * Format number with Indian number system (lakhs, crores)
 */
export function formatIndianNumber(num: number): string {
  return new Intl.NumberFormat("en-IN").format(num)
}

/**
 * Format date in Indian format (DD/MM/YYYY)
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d)
}

/**
 * Format date with time
 */
export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d)
}

/**
 * Generate invoice number with prefix and date
 * Format: INV-YYYYMM-XXXX
 */
export function generateInvoiceNumber(sequence: number, prefix = "INV"): string {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const seq = String(sequence).padStart(4, "0")
  return `${prefix}-${year}${month}-${seq}`
}

/**
 * Calculate GST components (CGST + SGST for intrastate, IGST for interstate)
 */
export function calculateGST(
  subtotal: number,
  taxRate: number,
  isInterstate = false
): { cgst: number; sgst: number; igst: number; total: number } {
  const taxAmount = (subtotal * taxRate) / 100

  if (isInterstate) {
    return {
      cgst: 0,
      sgst: 0,
      igst: taxAmount,
      total: taxAmount,
    }
  }

  return {
    cgst: taxAmount / 2,
    sgst: taxAmount / 2,
    igst: 0,
    total: taxAmount,
  }
}

/**
 * Round off to nearest rupee (standard Indian billing practice)
 */
export function roundOff(amount: number): { rounded: number; adjustment: number } {
  const rounded = Math.round(amount)
  return {
    rounded,
    adjustment: rounded - amount,
  }
}

/**
 * Debounce function for search inputs
 */
export function debounce<T extends (...args: Parameters<T>) => ReturnType<T>>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null

  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

/**
 * Safely parse JSON with fallback
 */
export function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json) as T
  } catch {
    return fallback
  }
}

/**
 * Generate a random SKU
 */
export function generateSKU(prefix = "SKU"): string {
  const random = Math.random().toString(36).substring(2, 8).toUpperCase()
  return `${prefix}-${random}`
}

/**
 * Truncate text with ellipsis
 */
export function truncate(str: string, length: number): string {
  if (str.length <= length) return str
  return str.slice(0, length) + "..."
}

/**
 * Check if a value is empty (null, undefined, empty string, empty array)
 */
export function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return true
  if (typeof value === "string" && value.trim() === "") return true
  if (Array.isArray(value) && value.length === 0) return true
  if (typeof value === "object" && Object.keys(value).length === 0) return true
  return false
}

/**
 * Convert Prisma Decimal to number safely
 */
export function toNumber(value: Decimal | number | string | null | undefined): number {
  if (value === null || value === undefined) return 0
  if (typeof value === "number") return value
  if (typeof value === "string") return parseFloat(value) || 0
  if (value instanceof Decimal) return value.toNumber()
  return 0
}
