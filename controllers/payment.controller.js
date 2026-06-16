const axios = require('axios');
const Order = require('../models/Order');

// ==================== BKASH CONFIG ====================
const BKASH_BASE_URL = process.env.BKASH_BASE_URL || 'https://tokenized.sandbox.bka.sh/v1.2.0-beta';
const BKASH_APP_KEY = process.env.BKASH_APP_KEY;
const BKASH_APP_SECRET = process.env.BKASH_APP_SECRET;
const BKASH_USERNAME = process.env.BKASH_USERNAME;
const BKASH_PASSWORD = process.env.BKASH_PASSWORD;

// ==================== NAGAD CONFIG ====================
const NAGAD_BASE_URL = process.env.NAGAD_BASE_URL || 'http://sandbox.mynagad.com:10080/remote-payment-gateway-1.0/api/dfs';
const NAGAD_MERCHANT_ID = process.env.NAGAD_MERCHANT_ID;

// ==================== SSLCOMMERZ CONFIG ====================
const SSL_BASE_URL = process.env.NODE_ENV === 'production'
    ? 'https://securepay.sslcommerz.com'
    : 'https://sandbox.sslcommerz.com';
const SSL_STORE_ID = process.env.SSLCOMMERZ_STORE_ID;
const SSL_STORE_PASS = process.env.SSLCOMMERZ_STORE_PASSWORD;

/**
 * Get bKash Authorization Token
 */
const getBkashToken = async () => {
    try {
        const response = await axios.post(
            `${BKASH_BASE_URL}/tokenized/checkout/token/grant`,
            {
                app_key: BKASH_APP_KEY,
                app_secret: BKASH_APP_SECRET,
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    username: BKASH_USERNAME,
                    password: BKASH_PASSWORD,
                },
            }
        );
        return response.data.id_token;
    } catch (error) {
        console.error('bKash Token Error:', error.response?.data || error.message);
        throw new Error('Failed to get bKash authorization token');
    }
};

/**
 * bKash Payment Initiation
 */
const initBkash = async (order, amount, customerInfo) => {
    const token = await getBkashToken();
    const response = await axios.post(
        `${BKASH_BASE_URL}/tokenized/checkout/create`,
        {
            mode: '0011',
            payerReference: order.shippingAddress.phone || customerInfo.phone,
            callbackURL: `${process.env.BACKEND_URL}/api/payment/bkash/callback`, // Backend callback
            amount: amount.toString(),
            currency: 'BDT',
            intent: 'sale',
            merchantInvoiceNumber: order._id.toString(),
        },
        {
            headers: {
                'Content-Type': 'application/json',
                Authorization: token,
                'X-APP-Key': BKASH_APP_KEY,
            },
        }
    );

    if (response.data.statusCode === '0000') {
        return { url: response.data.bkashURL, paymentID: response.data.paymentID };
    } else {
        throw new Error(response.data.statusMessage || 'bKash initiation failed');
    }
};

/**
 * Nagad Payment Initiation (Placeholder for full implementation)
 */
const initNagad = async (order, amount) => {
    // Nagad requires sensitive RSA encryption. For now, we return a mock or basic init.
    // In production, we'd use the full signature process.
    try {
        const orderId = order._id.toString();
        const response = await axios.post(
            `${NAGAD_BASE_URL}/check-out/initialize/${NAGAD_MERCHANT_ID}/${orderId}`,
            {
                merchantId: NAGAD_MERCHANT_ID,
                orderId: orderId,
                amount: amount.toString(),
                dateTime: Date.now(),
                challenge: Math.random().toString(36).substring(7),
            },
            {
                headers: { 'X-KM-Api-Version': 'v-0.2.0' }
            }
        );
        // This is simplified. Real Nagad init redirects after complex setup.
        return { url: response.data.url || '#', paymentID: response.data.paymentRefId };
    } catch (error) {
        console.error('Nagad Init Error:', error.response?.data || error.message);
        throw new Error('Nagad merchant initiation failed');
    }
};

/**
 * SSLCommerz Payment Initiation
 */
const initSSL = async (order, amount) => {
    const paymentData = {
        store_id: SSL_STORE_ID,
        store_passwd: SSL_STORE_PASS,
        total_amount: amount,
        currency: 'BDT',
        tran_id: order._id.toString(),
        success_url: `${process.env.BACKEND_URL}/api/payment/ssl/success`,
        fail_url: `${process.env.BACKEND_URL}/api/payment/ssl/fail`,
        cancel_url: `${process.env.BACKEND_URL}/api/payment/ssl/cancel`,
        cus_name: order.shippingAddress.name,
        cus_email: order.shippingAddress.email || 'customer@example.com',
        cus_phone: order.shippingAddress.phone,
        cus_add1: order.shippingAddress.street || 'Dhaka',
        cus_city: order.shippingAddress.city || 'Dhaka',
        cus_country: 'Bangladesh',
        ship_name: order.shippingAddress.name,
        ship_add1: order.shippingAddress.street,
        ship_city: order.shippingAddress.city,
        ship_state: order.shippingAddress.city,
        ship_postcode: order.shippingAddress.zipCode,
        ship_country: 'Bangladesh',
        product_name: 'RongRani Order',
        product_category: 'Gifts',
        product_profile: 'general',
    };

    const response = await axios.post(
        `${SSL_BASE_URL}/gwprocess/v4/api.php`,
        new URLSearchParams(paymentData).toString(),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    if (response.data.status === 'SUCCESS' && response.data.GatewayPageURL) {
        return { url: response.data.GatewayPageURL };
    } else {
        throw new Error(response.data.failedreason || 'SSLCommerz initiation failed');
    }
};

/**
 * GENERIC PAYMENT INITIATIONGateway
 */
exports.initPayment = async (req, res) => {
    try {
        const { orderId } = req.body;
        const order = await Order.findById(orderId);

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        const amount = order.total;
        const method = order.paymentMethod; // Get method from the saved order

        let result = {};

        switch (method) {
            case 'bkash':
                result = await initBkash(order, amount, { phone: order.shippingAddress.phone });
                break;
            case 'nagad':
                result = await initNagad(order, amount);
                break;
            case 'sslcommerz':
                result = await initSSL(order, amount);
                break;
            default:
                return res.status(400).json({ success: false, message: 'Unsupported payment gateway' });
        }

        res.json({ success: true, url: result.url, paymentID: result.paymentID });
    } catch (error) {
        console.error('Payment Error:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * bKash Execution (Called after user enters PIN)
 */
exports.bkashCallback = async (req, res) => {
    const { paymentID, status } = req.query;

    if (status !== 'success') {
        return res.redirect(`${process.env.FRONTEND_URL}/payment/failed?id=${paymentID}`);
    }

    try {
        const token = await getBkashToken();
        const response = await axios.post(
            `${BKASH_BASE_URL}/tokenized/checkout/execute`,
            { paymentID },
            {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: token,
                    'X-APP-Key': BKASH_APP_KEY,
                },
            }
        );

        if (response.data.statusCode === '0000' && response.data.transactionStatus === 'Completed') {
            const order = await Order.findById(response.data.merchantInvoiceNumber);
            if (order) {
                order.paymentStatus = 'paid';
                order.isPaid = true;
                order.paidAt = new Date();
                order.paymentDetails = {
                    transactionId: response.data.trxID,
                    paymentMethod: 'bKash Auto',
                };
                await order.save();
                return res.redirect(`${process.env.FRONTEND_URL}/payment/success?orderId=${order._id}`);
            }
        }
        res.redirect(`${process.env.FRONTEND_URL}/payment/failed`);
    } catch (error) {
        console.error('bKash Execute Error:', error.message);
        res.redirect(`${process.env.FRONTEND_URL}/payment/error`);
    }
};

/**
 * SSL Success Callback
 */
exports.sslSuccess = async (req, res) => {
    const { tran_id, val_id, bank_tran_id } = req.body;
    try {
        const order = await Order.findById(tran_id);
        if (order) {
            order.paymentStatus = 'paid';
            order.isPaid = true;
            order.paidAt = new Date();
            order.paymentDetails = {
                transactionId: bank_tran_id || val_id,
                paymentMethod: 'SSLCommerz',
            };
            await order.save();
            return res.redirect(`${process.env.FRONTEND_URL}/payment/success?orderId=${order._id}`);
        }
        res.redirect(`${process.env.FRONTEND_URL}/payment/failed`);
    } catch (_) {
        res.redirect(`${process.env.FRONTEND_URL}/payment/error`);
    }
};
