/**
 * Razorpay Client Utilities
 *
 * Frontend utilities for Razorpay checkout integration.
 * Handles loading the Razorpay script and opening checkout modal.
 */

declare global {
  interface Window {
    Razorpay: RazorpayConstructor
  }
}

interface RazorpayConstructor {
  new (options: RazorpayOptions): RazorpayInstance
}

interface RazorpayInstance {
  open(): void
  close(): void
  on(event: string, callback: () => void): void
}

interface RazorpayOptions {
  key: string
  amount?: number
  currency?: string
  name: string
  description?: string
  image?: string
  order_id?: string
  subscription_id?: string
  prefill?: {
    name?: string
    email?: string
    contact?: string
  }
  notes?: Record<string, string>
  theme?: {
    color?: string
  }
  modal?: {
    ondismiss?: () => void
    escape?: boolean
    confirm_close?: boolean
  }
  handler: (response: RazorpayResponse) => void
}

interface RazorpayResponse {
  razorpay_payment_id: string
  razorpay_order_id?: string
  razorpay_subscription_id?: string
  razorpay_signature: string
}

/**
 * Load Razorpay checkout script
 */
export function loadRazorpayScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("Razorpay can only be loaded in browser"))
      return
    }

    if (window.Razorpay) {
      resolve()
      return
    }

    const script = document.createElement("script")
    script.src = "https://checkout.razorpay.com/v1/checkout.js"
    script.async = true

    script.onload = () => resolve()
    script.onerror = () => reject(new Error("Failed to load Razorpay script"))

    document.body.appendChild(script)
  })
}

/**
 * Checkout response types
 */
export interface SubscriptionCheckoutResponse {
  type: "subscription"
  subscriptionId: string
  keyId: string
  tenantName: string
  tenantEmail: string
  planName: string
  amount: number
  currency: string
  shortUrl: string
}

export interface OrderCheckoutResponse {
  type: "order"
  orderId: string
  amount: number
  currency: string
  keyId: string
  tenantName: string
  tenantEmail: string
  planName: string
  notes: Record<string, string>
}

export interface FreeCheckoutResponse {
  success: true
  message: string
  subscription: unknown
}

export type CheckoutResponse =
  | SubscriptionCheckoutResponse
  | OrderCheckoutResponse
  | FreeCheckoutResponse

/**
 * Open Razorpay checkout for subscription
 */
export async function openSubscriptionCheckout(
  data: SubscriptionCheckoutResponse,
  options: {
    onSuccess: (response: {
      subscriptionId: string
      paymentId: string
      signature: string
    }) => void
    onError?: (error: Error) => void
    onDismiss?: () => void
    themeColor?: string
    logo?: string
  }
): Promise<void> {
  await loadRazorpayScript()

  const razorpay = new window.Razorpay({
    key: data.keyId,
    subscription_id: data.subscriptionId,
    name: "Billing App",
    description: `Subscribe to ${data.planName}`,
    image: options.logo,
    prefill: {
      name: data.tenantName,
      email: data.tenantEmail,
    },
    theme: {
      color: options.themeColor || "#3b82f6",
    },
    modal: {
      ondismiss: options.onDismiss,
      escape: true,
      confirm_close: true,
    },
    handler: (response) => {
      options.onSuccess({
        subscriptionId: response.razorpay_subscription_id!,
        paymentId: response.razorpay_payment_id,
        signature: response.razorpay_signature,
      })
    },
  })

  razorpay.on("payment.failed", () => {
    options.onError?.(new Error("Payment failed"))
  })

  razorpay.open()
}

/**
 * Open Razorpay checkout for order (upgrades)
 */
export async function openOrderCheckout(
  data: OrderCheckoutResponse,
  options: {
    onSuccess: (response: {
      orderId: string
      paymentId: string
      signature: string
    }) => void
    onError?: (error: Error) => void
    onDismiss?: () => void
    themeColor?: string
    logo?: string
  }
): Promise<void> {
  await loadRazorpayScript()

  const razorpay = new window.Razorpay({
    key: data.keyId,
    order_id: data.orderId,
    amount: data.amount,
    currency: data.currency,
    name: "Billing App",
    description: `Upgrade to ${data.planName}`,
    image: options.logo,
    prefill: {
      name: data.tenantName,
      email: data.tenantEmail,
    },
    notes: data.notes,
    theme: {
      color: options.themeColor || "#3b82f6",
    },
    modal: {
      ondismiss: options.onDismiss,
      escape: true,
      confirm_close: true,
    },
    handler: (response) => {
      options.onSuccess({
        orderId: response.razorpay_order_id!,
        paymentId: response.razorpay_payment_id,
        signature: response.razorpay_signature,
      })
    },
  })

  razorpay.on("payment.failed", () => {
    options.onError?.(new Error("Payment failed"))
  })

  razorpay.open()
}

/**
 * Verify payment with backend
 */
export async function verifySubscriptionPayment(data: {
  subscriptionId: string
  paymentId: string
  signature: string
}): Promise<{ success: boolean; message: string }> {
  const response = await fetch("/api/checkout/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "subscription",
      razorpaySubscriptionId: data.subscriptionId,
      razorpayPaymentId: data.paymentId,
      razorpaySignature: data.signature,
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || "Verification failed")
  }

  return response.json()
}

/**
 * Verify order payment with backend
 */
export async function verifyOrderPayment(data: {
  orderId: string
  paymentId: string
  signature: string
  planId: string
}): Promise<{ success: boolean; message: string }> {
  const response = await fetch("/api/checkout/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "order",
      razorpayOrderId: data.orderId,
      razorpayPaymentId: data.paymentId,
      razorpaySignature: data.signature,
      planId: data.planId,
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || "Verification failed")
  }

  return response.json()
}
