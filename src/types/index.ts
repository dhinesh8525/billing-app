/**
 * Application Type Definitions
 *
 * Centralized type definitions for the billing application.
 * These types extend Prisma types and provide API response/request shapes.
 */

import { Decimal } from "decimal.js"
import {
  User,
  Product,
  Category,
  Invoice,
  InvoiceItem,
  Party,
  Settings,
  BankAccount,
  Role,
  InvoiceStatus,
  TransactionType,
} from "@prisma/client"

// Re-export Prisma types for convenience
export type { User, Product, Category, Invoice, InvoiceItem, Party, Settings, BankAccount }
export { Role, InvoiceStatus, TransactionType }

// ============================================================================
// API Response Types
// ============================================================================

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

// ============================================================================
// Product Types
// ============================================================================

export interface ProductWithCategory extends Product {
  category: Category | null
}

export interface CreateProductInput {
  name: string
  sku: string
  description?: string
  price: number
  costPrice?: number
  stock?: number
  minStock?: number
  unit?: string
  hsn?: string
  taxRate?: number
  categoryId?: string
}

export interface UpdateProductInput extends Partial<CreateProductInput> {
  isActive?: boolean
}

export interface ProductSearchResult {
  id: string
  name: string
  sku: string
  price: number
  stock: number
  unit: string
  taxRate: number | null
}

// ============================================================================
// Invoice Types
// ============================================================================

export interface InvoiceWithItems extends Invoice {
  items: InvoiceItem[]
  createdBy: Pick<User, "id" | "name" | "email">
  party?: Party | null
}

export interface CreateInvoiceItemInput {
  productId: string
  quantity: number
  unitPrice?: number // Override product price if needed
  discount?: number
}

export interface CreateInvoiceInput {
  type?: TransactionType
  partyId?: string
  customerName?: string
  customerPhone?: string
  customerEmail?: string
  items: CreateInvoiceItemInput[]
  discountPercent?: number
  notes?: string
  paymentMode?: string
  amountPaid?: number
  isInterstate?: boolean // For IGST calculation
}

export interface InvoiceCalculation {
  subtotal: number
  taxRate: number
  cgst: number
  sgst: number
  igst: number
  taxAmount: number
  discountAmount: number
  roundOff: number
  total: number
}

// ============================================================================
// Party Types
// ============================================================================

export interface CreatePartyInput {
  name: string
  phone?: string
  email?: string
  gstin?: string
  pan?: string
  billingAddress?: string
  shippingAddress?: string
  type?: "customer" | "supplier" | "both"
  openingBalance?: number
  creditLimit?: number
  creditDays?: number
}

export interface UpdatePartyInput extends Partial<CreatePartyInput> {
  isActive?: boolean
}

// ============================================================================
// Settings Types
// ============================================================================

export interface BusinessSettings {
  businessName: string
  gstin?: string
  pan?: string
  address: string
  phone: string
  email?: string
  logo?: string
  tagline?: string
  signature?: string
}

export interface TaxSettings {
  defaultTaxRate: number
  enableGST: boolean
  gstType: "regular" | "composition"
  stateCode?: string
}

export interface InvoiceSettings {
  salePrefix: string
  purchasePrefix: string
  termsAndConditions?: string
  thankYouMessage?: string
  enableRoundOff: boolean
  showHSN: boolean
}

export interface AppSettings {
  business: BusinessSettings
  tax: TaxSettings
  invoice: InvoiceSettings
}

// ============================================================================
// Dashboard Types
// ============================================================================

export interface DashboardStats {
  totalSales: number
  totalPurchases: number
  totalExpenses: number
  receivables: number
  payables: number
  stockValue: number
  todaySales: number
  todayTransactions: number
}

export interface LowStockItem {
  id: string
  name: string
  sku: string
  stock: number
  minStock: number
}

export interface RecentTransaction {
  id: string
  invoiceNumber: string
  type: TransactionType
  partyName: string | null
  total: number
  createdAt: Date
}

// ============================================================================
// Cart Types (Frontend)
// ============================================================================

export interface CartItem {
  productId: string
  name: string
  sku: string
  price: number
  quantity: number
  stock: number
  unit: string
  taxRate: number
  discount: number
  lineTotal: number
}

export interface Cart {
  items: CartItem[]
  subtotal: number
  discountPercent: number
  discountAmount: number
  taxAmount: number
  cgst: number
  sgst: number
  igst: number
  roundOff: number
  total: number
}

// ============================================================================
// Filter Types
// ============================================================================

export interface ProductFilters {
  search?: string
  categoryId?: string
  isActive?: boolean
  lowStock?: boolean
}

export interface InvoiceFilters {
  type?: TransactionType
  status?: InvoiceStatus
  paymentStatus?: string
  partyId?: string
  startDate?: Date
  endDate?: Date
  search?: string
}

export interface PaginationParams {
  page?: number
  pageSize?: number
  sortBy?: string
  sortOrder?: "asc" | "desc"
}

// ============================================================================
// Utility Types
// ============================================================================

export type DecimalLike = Decimal | number | string

export interface SelectOption {
  value: string
  label: string
}
