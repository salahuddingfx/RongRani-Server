/**
 * Delivery Charge Configuration
 * Single source of truth for all delivery calculations
 * NEVER hardcode these values in frontend
 */

const DELIVERY_CONFIG = {
  // Free delivery threshold (in Taka)
  FREE_DELIVERY_LIMIT: 2500,
  
  // Delivery charges by region (in Taka)
  COXS_BAZAR_CHARGE: 70,
  OUTSIDE_COXS_BAZAR_CHARGE: 150,
  
  // Districts and areas that fall under Cox's Bazar delivery
  COXS_BAZAR_DISTRICTS: [
    'cox\'s bazar',
    'cox bazar',
  ],
  
  // Delivery providers
  PROVIDERS: {
    LOCAL: 'LOCAL',           // Local delivery service
    STEADFAST: 'STEADFAST',   // Steadfast courier
    PATHAO: 'PATHAO',         // Pathao courier
  },
};

module.exports = DELIVERY_CONFIG;
