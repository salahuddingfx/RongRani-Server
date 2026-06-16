/**
 * Delivery Calculation Utility
 * Single function to calculate delivery charges across the entire system
 * Backend-only logic, never expose raw calculations to frontend
 */

const DELIVERY_CONFIG = require('../config/deliveryConfig');

/**
 * Calculate delivery charge based on location and subtotal
 * @param {Object} params - Calculation parameters
 * @param {number} params.subtotal - Order subtotal (before discount)
 * @param {string} params.district - Shipping district
 * @param {string} params.city - Shipping city
 * @returns {Object} Delivery calculation result
 * @example
 * calculateDelivery({
 *   subtotal: 3000,
 *   district: 'Dhaka',
 *   city: 'Dhaka'
 * })
 * // Returns:
 * // {
 * //   charge: 0,
 * //   label: 'ফ্রি ডেলিভারি (সারা বাংলাদেশ)',
 * //   isFree: true,
 * //   provider: 'STEADFAST'
 * // }
 */
function calculateDelivery({ subtotal = 0, district = '', city = '', settings = null } = {}) {
  // Normalize inputs
  const districtLower = (district || '').toString().trim().toLowerCase();
  const cityLower = (city || '').toString().trim().toLowerCase();

  // effective config values (DB settings override static config)
  const insideCharge = settings?.chittagongFee ?? DELIVERY_CONFIG.COXS_BAZAR_CHARGE;
  const outsideCharge = settings?.outsideChittagongFee ?? DELIVERY_CONFIG.OUTSIDE_COXS_BAZAR_CHARGE;
  const freeThreshold = settings?.freeShippingThreshold ?? DELIVERY_CONFIG.FREE_DELIVERY_LIMIT;

  // Check if it's Cox's Bazar area
  const isCoxsBazar =
    districtLower.includes('cox') ||
    cityLower.includes('cox') ||
    DELIVERY_CONFIG.COXS_BAZAR_DISTRICTS.some(d => districtLower.includes(d) || cityLower.includes(d));

  // Check if eligible for free delivery
  const isFreeDelivery = subtotal >= freeThreshold;

  // Calculate charge
  let charge = 0;
  let label = '';
  let provider = DELIVERY_CONFIG.PROVIDERS.STEADFAST;

  if (isFreeDelivery) {
    // Free delivery for all Bangladesh
    charge = 0;
    label = 'ফ্রি ডেলিভারি (সারা বাংলাদেশ)'; // Free Delivery (All Bangladesh)
    provider = DELIVERY_CONFIG.PROVIDERS.STEADFAST;
  } else if (isCoxsBazar) {
    // Cox's Bazar area delivery
    charge = insideCharge;
    label = `কক্সবাজার সিটির ভিতরে ডেলিভারি (৳${charge})`; // Cox's Bazar City Delivery
    provider = DELIVERY_CONFIG.PROVIDERS.LOCAL;
  } else {
    // Outside Cox's Bazar delivery
    charge = outsideCharge;
    label = `কক্সবাজার সিটির বাইরে ডেলিভারি (৳${charge})`; // Outside Cox's Bazar City Delivery
    provider = DELIVERY_CONFIG.PROVIDERS.STEADFAST;
  }

  return {
    charge,
    label,
    isFree: isFreeDelivery,
    provider,
    // Additional useful fields
    threshold: freeThreshold,
    subtotal,
    eligibleForFree: subtotal >= freeThreshold,
  };
}

/**
 * Get delivery info for display (localization-friendly)
 * @param {Object} delivery - Delivery calculation result from calculateDelivery()
 * @returns {Object} User-friendly delivery info
 */
function getDeliveryDisplay(delivery) {
  if (!delivery) return null;

  return {
    charge: delivery.charge,
    label: delivery.label,
    isFree: delivery.isFree,
    amountNeededForFree: Math.max(0, (delivery.threshold || DELIVERY_CONFIG.FREE_DELIVERY_LIMIT) - (delivery.subtotal || 0)),
  };
}

/**
 * Validate delivery calculation (internal use)
 * @param {Object} delivery - Delivery calculation result
 * @returns {boolean} Whether calculation is valid
 */
function isValidDelivery(delivery) {
  return (
    delivery &&
    typeof delivery.charge === 'number' &&
    delivery.charge >= 0 &&
    typeof delivery.isFree === 'boolean' &&
    delivery.label &&
    Object.values(DELIVERY_CONFIG.PROVIDERS).includes(delivery.provider)
  );
}

module.exports = {
  calculateDelivery,
  getDeliveryDisplay,
  isValidDelivery,
  DELIVERY_CONFIG,
};
