const Order = require('../models/Order');

/**
 * Fraud Detection Utility
 * Analyzes order data to detect potential fraud or spam
 */
const detectFraud = async (orderData, ipAddress) => {
    const risks = [];
    let riskLevel = 'Low';

    const {
        guestInfo,
        shippingAddress,
        total
    } = orderData;

    const phone = shippingAddress?.phone || guestInfo?.phone || '';
    const name = shippingAddress?.name || guestInfo?.name || '';

    // 1. Phone Number Validation (Bangladesh)
    // Must start with 01, followed by 3-9, and be exactly 11 digits
    const bdPhoneRegex = /^01[3-9]\d{8}$/;
    if (phone && !bdPhoneRegex.test(phone.replace(/\s+/g, ''))) {
        risks.push('Invalid Bangladeshi phone number format');
        riskLevel = 'Medium';
    }

    // 2. Suspicious Keyword Check
    const suspiciousKeywords = ['test', 'fake', 'asdf', 'qwerty', 'admin', 'demo', '1234', 'null', 'undefined'];
    const fullText = `${name} ${shippingAddress?.street} ${shippingAddress?.city}`.toLowerCase();

    const foundKeywords = suspiciousKeywords.filter(word => fullText.includes(word));
    if (foundKeywords.length > 0) {
        risks.push(`Suspicious keywords found: ${foundKeywords.join(', ')}`);
        riskLevel = 'High';
    }

    // 3. High Value Order Alert
    // If order is above 20,000 BDT, flag for manual review (not necessarily fraud, but high risk)
    if (total > 20000) {
        risks.push('High value order (> 20k BDT)');
        if (riskLevel === 'Low') riskLevel = 'Medium';
    }

    // 4. Rate Limiting (Spam Check)
    // Check for orders from same IP or Phone in the last 30 minutes
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

    // Build query: Same IP OR Same Phone
    const spamQuery = {
        createdAt: { $gte: thirtyMinutesAgo },
        $or: []
    };

    if (ipAddress) spamQuery.$or.push({ ipAddress });
    if (phone) spamQuery.$or.push({ 'shippingAddress.phone': phone });
    // Also check guestInfo phone if it exists
    if (phone) spamQuery.$or.push({ 'guestInfo.phone': phone });

    if (spamQuery.$or.length > 0) {
        const recentOrdersCount = await Order.countDocuments(spamQuery);

        if (recentOrdersCount >= 3) {
            risks.push(`Spam Detected: ${recentOrdersCount} orders placed in last 30 mins from this device/number`);
            riskLevel = 'High';
        } else if (recentOrdersCount >= 1) {
            // Just a note for rapid ordering
            // risks.push('Multiple orders placed recently'); 
        }
    }

    // 5. Critical: "Critical" if multiple High risk factors
    if (riskLevel === 'High' && risks.length >= 2) {
        riskLevel = 'Critical';
    }

    return {
        riskLevel,
        reasons: risks
    };
};

module.exports = { detectFraud };
