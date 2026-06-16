const axios = require('axios');

class SteadfastService {
  constructor() {
    this.apiKey = process.env.STEADFAST_API_KEY;
    this.apiSecret = process.env.STEADFAST_API_SECRET;
    this.baseURL = process.env.STEADFAST_BASE_URL || 'https://portal.packzy.com/api/v1';
    this.isConfigured = !!(this.apiKey && this.apiSecret);

    if (!this.isConfigured) {
      console.log('⚠️  Steadfast Courier API not configured');
      console.log('   To enable: Set STEADFAST_API_KEY and STEADFAST_API_SECRET in .env');
    } else {
      console.log('✅ Steadfast Courier API configured');
    }

    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Api-Key': this.apiKey,
        'Secret-Key': this.apiSecret,
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
    });
  }

  /**
   * Create a new delivery order in Steadfast
   */
  async createOrder(orderData) {
    try {
      if (!this.isConfigured) {
        return {
          success: false,
          error: 'Steadfast API not configured. Please add credentials to .env file.',
        };
      }

      // Prepare payload according to Steadfast API format
      const payload = {
        invoice: orderData.invoice || `CHG-${Date.now()}`,
        recipient_name: orderData.recipientName,
        recipient_phone: orderData.recipientPhone,
        recipient_address: orderData.recipientAddress,
        cod_amount: orderData.codAmount || 0,
        note: orderData.note || '',
      };

      if (orderData.recipientEmail) payload.recipient_email = orderData.recipientEmail;
      if (orderData.alternatePhone) payload.recipient_phone_2 = orderData.alternatePhone;
      if (orderData.itemDescription) payload.item_description = orderData.itemDescription;
      if (orderData.weightKg) payload.weight = orderData.weightKg;
      if (orderData.deliveryType) payload.delivery_type = orderData.deliveryType;
      if (orderData.parcelValue) payload.parcel_value = orderData.parcelValue;

      console.log('📦 Creating Steadfast order:', payload.invoice);

      const response = await this.client.post('/create_order', payload);

      // Log full response for debugging
      console.log('🚚 Steadfast API Response:', JSON.stringify(response.data, null, 2));

      // Check if consignment works (Steadfast sometimes returns 200 even on logical error)
      if (response.data && response.data.consignment && response.data.consignment.consignment_id) {
        console.log('✅ Steadfast order created successfully:', response.data.consignment.consignment_id);

        return {
          success: true,
          data: response.data,
          consignmentId: response.data.consignment.consignment_id,
          trackingCode: response.data.consignment.tracking_code,
          message: 'Order sent to Steadfast Courier successfully!',
        };
      } else {
        console.error('❌ Steadfast Error (No Consignment ID):', response.data);
        // Try to find an error message in the response
        const errorMsg = response.data.errors ? JSON.stringify(response.data.errors) :
          (response.data.message || 'Unknown error from CourierAPI');

        return {
          success: false,
          error: errorMsg,
          details: response.data,
        };
      }
    } catch (error) {
      const errorDetails = error.response?.data;
      const errorMessage = typeof errorDetails === 'string' && errorDetails.includes('<!DOCTYPE html>')
        ? 'Steadfast API returned HTML (likely Cloudflare block). Check User-Agent/URL.'
        : (errorDetails?.message || error.message);

      console.error('❌ Steadfast Create Order Error:', errorMessage);
      if (typeof errorDetails !== 'string') {
        console.error('Details:', JSON.stringify(errorDetails, null, 2));
      }

      return {
        success: false,
        error: errorMessage,
        details: typeof errorDetails === 'object' ? errorDetails : { rawResponse: 'HTML Response Truncated' },
      };
    }
  }

  /**
   * Track delivery status by consignment ID
   */
  async trackOrder(consignmentId) {
    try {
      if (!this.isConfigured) {
        return {
          success: false,
          error: 'Steadfast API not configured',
        };
      }

      const response = await this.client.get(`/status_by_cid/${consignmentId}`);

      return {
        success: true,
        data: response.data,
        status: response.data.delivery_status,
      };
    } catch (error) {
      const errorDetails = error.response?.data;
      const errorMessage = typeof errorDetails === 'string' && errorDetails.includes('<!DOCTYPE html>')
        ? 'Steadfast API returned HTML (likely Cloudflare block).'
        : (errorDetails?.message || error.message);

      console.error('❌ Steadfast Track Order Error:', errorMessage);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Get delivery charge estimate
   */
  async getDeliveryCharge(cod_amount = 0) {
    try {
      if (!this.isConfigured) {
        // Return default charges if not configured
        return {
          success: false,
          charge: 60,
          error: 'Using default charges',
        };
      }

      const response = await this.client.post('/get_delivery_charge', {
        cod_amount,
      });

      return {
        success: true,
        charge: response.data.delivery_charge,
        data: response.data,
      };
    } catch (error) {
      const errorDetails = error.response?.data;
      const errorMessage = typeof errorDetails === 'string' && errorDetails.includes('<!DOCTYPE html>')
        ? 'Steadfast API returned HTML (likely Cloudflare block).'
        : (errorDetails?.message || error.message);

      console.error('❌ Steadfast Get Charge Error:', errorMessage);
      return {
        success: false,
        error: errorMessage,
        charge: 60, // Fallback to default
      };
    }
  }

  /**
   * Cancel an order
   */
  async cancelOrder(trackingCode) {
    try {
      if (!this.isConfigured) {
        return {
          success: false,
          error: 'Steadfast API not configured',
        };
      }

      const response = await this.client.post('/cancel_order', {
        tracking_code: trackingCode,
      });

      return {
        success: true,
        data: response.data,
        message: 'Order cancelled successfully',
      };
    } catch (error) {
      const errorDetails = error.response?.data;
      const errorMessage = typeof errorDetails === 'string' && errorDetails.includes('<!DOCTYPE html>')
        ? 'Steadfast API returned HTML (likely Cloudflare block).'
        : (errorDetails?.message || error.message);

      console.error('❌ Steadfast Cancel Order Error:', errorMessage);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Check balance
   */
  async checkBalance() {
    try {
      if (!this.isConfigured) {
        return {
          success: false,
          error: 'Steadfast API not configured',
        };
      }

      const response = await this.client.get('/get_balance');

      return {
        success: true,
        balance: response.data.current_balance,
        data: response.data,
      };
    } catch (error) {
      const errorDetails = error.response?.data;
      const errorMessage = typeof errorDetails === 'string' && errorDetails.includes('<!DOCTYPE html>')
        ? 'Steadfast API returned HTML (likely Cloudflare block).'
        : (errorDetails?.message || error.message);

      console.error('❌ Steadfast Balance Check Error:', errorMessage);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }
}

module.exports = new SteadfastService();
