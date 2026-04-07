/**
 * Razorpay Configuration
 *
 * Initializes and exports the Razorpay client instance.
 * Requires RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET environment variables.
 */

import Razorpay from "razorpay"

// Validate environment variables
const keyId = process.env.RAZORPAY_KEY_ID
const keySecret = process.env.RAZORPAY_KEY_SECRET

if (!keyId || !keySecret) {
  console.warn(
    "⚠️  Razorpay credentials not configured. Payment features will be disabled."
  )
}

/**
 * Razorpay client instance
 * Use this for all Razorpay API calls
 */
export const razorpay = keyId && keySecret
  ? new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    })
  : null

/**
 * Check if Razorpay is configured
 */
export function isRazorpayConfigured(): boolean {
  return razorpay !== null
}

/**
 * Get Razorpay public key for frontend
 */
export function getRazorpayKeyId(): string | null {
  return keyId || null
}

/**
 * Razorpay webhook secret for signature verification
 */
export const razorpayWebhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || ""
