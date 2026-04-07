#!/usr/bin/env node

/**
 * Icon Generator Script
 *
 * Generates placeholder PNG icons from the SVG icon.
 * In production, replace these with properly designed icons.
 *
 * Usage: node scripts/generate-icons.js
 *
 * Note: This requires sharp to be installed:
 *   npm install sharp --save-dev
 */

const fs = require("fs")
const path = require("path")

const sizes = [72, 96, 128, 144, 152, 192, 384, 512]
const iconsDir = path.join(__dirname, "../public/icons")

// Check if sharp is available
let sharp
try {
  sharp = require("sharp")
} catch {
  console.log("Sharp not installed. Creating placeholder icons...")
  createPlaceholders()
  process.exit(0)
}
const svgPath = path.join(iconsDir, "icon.svg")

async function generateIcons() {
  if (!fs.existsSync(svgPath)) {
    console.error("SVG icon not found at", svgPath)
    process.exit(1)
  }

  const svgBuffer = fs.readFileSync(svgPath)

  for (const size of sizes) {
    const outputPath = path.join(iconsDir, `icon-${size}x${size}.png`)
    await sharp(svgBuffer).resize(size, size).png().toFile(outputPath)
    console.log(`Generated: icon-${size}x${size}.png`)
  }

  console.log("Done! All icons generated.")
}

function createPlaceholders() {
  // Create minimal 1x1 PNG placeholders
  // Real icons should be properly designed
  const pngHeader = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
    0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xde, 0x00, 0x00, 0x00,
    0x0c, 0x49, 0x44, 0x41, 0x54, 0x08, 0xd7, 0x63, 0x48, 0x89, 0xb6, 0x00,
    0x00, 0x01, 0x5d, 0x00, 0xc9, 0xf4, 0x72, 0x3b, 0xf9, 0x00, 0x00, 0x00,
    0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
  ])

  for (const size of sizes) {
    const outputPath = path.join(iconsDir, `icon-${size}x${size}.png`)
    if (!fs.existsSync(outputPath)) {
      fs.writeFileSync(outputPath, pngHeader)
      console.log(`Created placeholder: icon-${size}x${size}.png`)
    }
  }

  console.log("Placeholder icons created. Replace with real icons for production.")
}

generateIcons().catch(console.error)
