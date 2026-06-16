const nodemailer = require('nodemailer');

// 🎨 BRAND COLORS
const primaryColor = '#8B2635'; // RongRani Maroon
const secondaryColor = '#C5A059'; // Gold Accent

// 🏁 INITIALIZATION LOGS
const hasBrevoKey = !!process.env.BREVO_API_KEY;
const smtpHost = process.env.SMTP_HOST || process.env.BREVO_SMTP_HOST;
const smtpUser = process.env.SMTP_USER || process.env.BREVO_SMTP_USER;

if (hasBrevoKey) {
  console.log('✅ Brevo (Sendinblue) API Email Service configured');
} else if (smtpHost && smtpUser) {
  const isGmail = smtpHost.includes('gmail.com');
  console.log(`✅ ${isGmail ? 'Gmail' : 'SMTP'} Email Service configured`);
} else {
  console.log('⚠️  Email Service NOT configured (Missing environment variables)');
}

// Email transporter configuration
const createTransporter = () => {
  // Check for Brevo (Sendinblue) Configuration
  const smtpHost = process.env.SMTP_HOST || process.env.BREVO_SMTP_HOST;
  let smtpPort = process.env.SMTP_PORT || process.env.BREVO_SMTP_PORT || 587;

  // Gmail detection
  if (smtpHost && smtpHost.includes('gmail.com')) {
    console.log('📧 Gmail detected, applying Gmail optimization...');
    smtpPort = 587;
  }
  // FORCE PORT 2525 for Brevo on Cloud environments
  else if (smtpHost && smtpHost.includes('brevo.com')) {
    console.log('🚀 Brevo detected, forcing Port 2525 for better reliability...');
    smtpPort = 2525;
  }

  const smtpUser = process.env.SMTP_USER || process.env.BREVO_SMTP_USER;
  const smtpPass = process.env.SMTP_PASS || process.env.BREVO_SMTP_PASS;

  console.log('🔍 Checking Email Config:');
  console.log('Host:', smtpHost);
  console.log('Port:', smtpPort);
  console.log('User:', smtpUser);

  if (smtpHost && smtpUser && smtpPass) {
    const isGmail = smtpHost.includes('gmail.com');
    console.log(`✅ Configuring Email Service: ${isGmail ? 'Gmail' : 'SMTP'} on Port ${smtpPort}`);

    return nodemailer.createTransport({
      host: smtpHost,
      port: Number(smtpPort),
      secure: isGmail ? false : (smtpPort == 465), // Gmail usually uses 587/false or 465/true
      service: isGmail ? 'gmail' : undefined, // Explicitly set gmail service if detected
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
      tls: {
        ciphers: 'SSLv3',
        rejectUnauthorized: false
      },
      family: 4, // Force IPv4 (Fixes some cloud deployment ETIMEDOUT issues)
      connectionTimeout: 30000, // 30 seconds
      greetingTimeout: 30000,
      socketTimeout: 30000,
      debug: true // Enable debug logs
    });
  }

  // SendGrid Fallback
  else if (process.env.SENDGRID_API_KEY) {
    console.log('✅ Email service configured using: SendGrid API');
    return nodemailer.createTransport({
      host: 'smtp.sendgrid.net',
      port: 587,
      secure: false,
      auth: {
        user: 'apikey',
        pass: process.env.SENDGRID_API_KEY,
      },
    });
  }

  // Fallback to Gmail SMTP if nothing else matches
  console.log('⚠️ Email service fallback: Gmail SMTP (Check your .env if this is unintentional)');
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER, // fallback
      pass: process.env.SMTP_PASS, // fallback
    },
  });
};

// ... Email templates code below (keeping it same)
// Helper to wrap content in a clean, responsive design (Daraz Inspired)
const emailBaseTemplate = (title, content, preheader = '') => {
  const frontendUrl = process.env.FRONTEND_URL || 'https://rongrani.vercel.app';
  const logoUrl = `${frontendUrl}/RongRani-Logo.png`; // Updated to correct logo file

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
      <style>
        body { margin: 0; padding: 0; background-color: #f3f4f6; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333333; -webkit-font-smoothing: antialiased; }
        table { border-spacing: 0; width: 100%; border-collapse: collapse; }
        td { padding: 0; }
        img { border: 0; -ms-interpolation-mode: bicubic; }
        .wrapper { width: 100%; table-layout: fixed; background-color: #f3f4f6; padding-bottom: 40px; }
        .main-table { background-color: #ffffff; margin: 0 auto; width: 100%; max-width: 600px; border-spacing: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333333; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
        .header { padding: 40px 0; text-align: center; border-bottom: 3px solid ${primaryColor}; background-color: #ffffff; }
        .logo-container { width: 100px; height: 100px; margin: 0 auto; padding: 5px; background: #ffffff; border-radius: 50%; border: 2px solid ${secondaryColor}; box-shadow: 0 4px 10px rgba(0,0,0,0.1); display: inline-block; overflow: hidden; }
        .logo { width: 100%; height: 100%; object-fit: contain; }
        .content { padding: 40px 30px; background-color: #ffffff; }
        .footer { padding: 35px 20px; text-align: center; background-color: #fcfcfc; border-top: 1px solid #eeeeee; font-size: 13px; color: #666666; }
        .btn { display: inline-block; padding: 14px 30px; background-color: ${primaryColor}; color: #ffffff !important; text-decoration: none; border-radius: 4px; font-weight: bold; text-align: center; font-size: 16px; margin: 25px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); width: auto; min-width: 200px; }
        .btn:hover { background-color: #701e2a; opacity: 0.9; }
        .social-icon { margin: 0 8px; display: inline-block; vertical-align: middle; }
        .highlight-text { color: ${primaryColor}; font-weight: bold; }
        .divider { height: 1px; background-color: #e5e7eb; margin: 20px 0; }
        
        @media screen and (max-width: 600px) {
          .content { padding: 20px 15px; }
          .main-table { width: 100% !important; border-radius: 0; }
          .btn { display: block; width: auto; margin: 20px 0; }
          .product-row td { display: block; width: 100%; text-align: left; padding-bottom: 10px; }
          .product-image { margin-bottom: 10px; }
          h1 { font-size: 22px !important; }
          h2 { font-size: 18px !important; }
        }
      </style>
    </head>
    <body>
      <!-- Hidden Preheader -->
      <div style="display:none; max-height:0; overflow:hidden; mso-hide:all;">
        ${preheader}
      </div>
      
      <div class="wrapper">
        <center>
          <table class="main-table" role="presentation">
            <!-- Header -->
            <tr>
              <td class="header">
                 <a href="${frontendUrl}" target="_blank" style="text-decoration: none;">
                   <div class="logo-container">
                     <img src="${logoUrl}" alt="RongRani" class="logo">
                   </div>
                   <div style="margin-top: 10px; color: ${primaryColor}; font-size: 28px; font-weight: 900; letter-spacing: -1px;">Rong<span style="color: #333333;">Rani</span></div>
                   <div style="color: ${secondaryColor}; font-size: 10px; letter-spacing: 2px; font-weight: bold; margin-top: 5px; text-transform: uppercase;">Elegance in Every Hue</div>
                 </a>
              </td>
            </tr>
            
            <!-- Content -->
            <tr>
              <td class="content">
                ${content}
              </td>
            </tr>
            
            <!-- Footer -->
            <tr>
              <td class="footer">
                <p style="margin-bottom: 15px; font-weight: 600; color: #4b5563;">Stay Connected</p>
                <div style="margin-bottom: 20px;">
                   <a href="https://facebook.com/rongrani" style="text-decoration:none;"><img src="https://cdn-icons-png.flaticon.com/512/145/145802.png" width="24" height="24" alt="FB" class="social-icon"></a>
                   <a href="https://instagram.com/rongrani" style="text-decoration:none;"><img src="https://cdn-icons-png.flaticon.com/512/3955/3955024.png" width="24" height="24" alt="IG" class="social-icon"></a>
                   <a href="https://wa.me/8801851075537" style="text-decoration:none;"><img src="https://cdn-icons-png.flaticon.com/512/3670/3670051.png" width="24" height="24" alt="WA" class="social-icon"></a>
                </div>
                <p style="line-height: 1.5;">
                  <strong>RongRani Gift Shop</strong><br>
                  The Art of Bespoke Gifting<br>
                  Dhaka, Bangladesh
                </p>
                <p style="margin-top: 20px;">&copy; ${new Date().getFullYear()} RongRani. All rights reserved.</p>
                <p style="margin-top: 10px;">
                  <a href="${frontendUrl}" style="color: ${primaryColor}; text-decoration: none;">Visit Store</a> • 
                  <a href="${frontendUrl}/contact" style="color: ${primaryColor}; text-decoration: none;">Contact Support</a>
                </p>
              </td>
            </tr>
          </table>
        </center>
      </div>
    </body>
    </html>
  `;
};

const normalizeImageUrl = (value) => {
  const frontendUrl = (process.env.FRONTEND_URL || 'https://rongrani.vercel.app').replace(/\/+$/, '');
  if (!value) return '';
  if (typeof value === 'object' && value.url) return normalizeImageUrl(value.url);
  if (typeof value !== 'string') return '';
  if (value.startsWith('http://') || value.startsWith('https://')) return value;
  if (value.startsWith('/')) return `${frontendUrl}${value}`;
  return value;
};

// Email templates
const emailTemplates = {
  // Order Confirmation Email
  orderConfirmation: (order) => {
    const products = order.items.map(item => `
      <tr class="product-row" style="border-bottom: 1px solid #f3f4f6;">
        <td style="padding: 15px 0; vertical-align: top; width: 60px;">
          <img src="${normalizeImageUrl(item.image) || 'https://via.placeholder.com/60'}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 4px; border: 1px solid #e5e7eb;">
        </td>
        <td style="padding: 15px 15px; vertical-align: top;">
          <div style="font-weight: 600; color: #111827; font-size: 14px;">${item.name}</div>
          <div style="font-size: 12px; color: #6b7280; margin-top: 4px;">Quantity: ${item.quantity}</div>
        </td>
        <td style="padding: 15px 0; text-align: right; vertical-align: top; font-weight: 600; color: #111827;">
          ৳ ${(item.price * item.quantity).toFixed(2)}
        </td>
      </tr>
    `).join('');

    const shipping = order.shippingAddress || {};
    const address = `${shipping.street || ''}, ${shipping.city || ''} ${shipping.zipCode || ''}`;
    const trackingQuery = order.customerEmail ? `?email=${encodeURIComponent(order.customerEmail)}` : '';

    const content = `
      <div style="text-align: center; margin-bottom: 30px;">
        <img src="https://cdn-icons-png.flaticon.com/512/148/148767.png" style="width: 50px; opacity: 0.8; margin-bottom: 15px;">
        <h2 style="color: #111827; margin: 0; font-size: 24px;">Thank you for your order!</h2>
        <p style="color: #6b7280; margin-top: 8px;">Order #${order.orderId} has been placed successfully.</p>
      </div>

      <div style="background-color: #f9fafb; border-radius: 8px; padding: 20px; border: 1px solid #e5e7eb; margin-bottom: 30px;">
        <h3 style="margin-top: 0; color: #1f2937; font-size: 16px;">Delivery & Payment Details</h3>
        <p style="color: #4b5563; font-size: 14px; line-height: 1.6; margin: 0;">
          <strong>Name:</strong> ${order.name}<br>
          <strong>Phone:</strong> ${shipping.phone || 'N/A'}<br>
          <strong>Address:</strong> ${address}<br>
          <span style="display: block; margin-top: 10px; border-top: 1px dashed #d1d5db; padding-top: 10px;">
            <strong>Payment Method:</strong> ${order.paymentMethod?.toUpperCase().replace('_', ' ') || 'N/A'}<br>
            ${order.paymentDetails?.transactionId ? `<strong>TrxID:</strong> ${order.paymentDetails.transactionId}<br>` : ''}
            ${order.paymentDetails?.senderLastDigits ? `<strong>Sender (Last 4):</strong> ${order.paymentDetails.senderLastDigits}` : ''}
          </span>
        </p>
      </div>

      <h3 style="color: #1f2937; font-size: 16px; border-bottom: 1px solid #e5e7eb; padding-bottom: 10px; margin-bottom: 10px;">Order Summary</h3>
      <table width="100%" cellpadding="0" cellspacing="0">
        ${products}
        
        <tr>
          <td colspan="2" style="padding-top: 20px; text-align: right; color: #6b7280; font-size: 14px;">Subtotal</td>
          <td style="padding-top: 20px; text-align: right; color: #111827; font-weight: 600;">৳ ${order.subtotal?.toFixed(2) || '0.00'}</td>
        </tr>
        <tr>
          <td colspan="2" style="padding-top: 8px; text-align: right; color: #6b7280; font-size: 14px;">Shipping</td>
          <td style="padding-top: 8px; text-align: right; color: #111827; font-weight: 600;">৳ ${order.shipping?.toFixed(2) || '0.00'}</td>
        </tr>
        ${order.discount > 0 ? `
        <tr>
          <td colspan="2" style="padding-top: 8px; text-align: right; color: #10b981; font-size: 14px;">Discount</td>
          <td style="padding-top: 8px; text-align: right; color: #10b981; font-weight: 600;">- ৳ ${order.discount?.toFixed(2)}</td>
        </tr>
        ` : ''}
        <tr>
          <td colspan="2" style="padding-top: 15px; text-align: right; color: #111827; font-size: 16px; font-weight: bold;">Total</td>
          <td style="padding-top: 15px; text-align: right; color: #8B2635; font-size: 18px; font-weight: bold;">৳ ${order.total?.toFixed(2) || '0.00'}</td>
        </tr>
      </table>

      <center style="margin-top: 35px;">
        <a href="${process.env.FRONTEND_URL}/track/${order.orderId}${trackingQuery}" class="btn">Track Your Order</a>
      </center>

      <div style="margin-top: 40px; padding: 25px; background-color: #fff9f0; border-radius: 12px; border: 1px dashed ${secondaryColor}; text-align: center;">
        <h3 style="color: ${primaryColor}; margin-top: 0; font-size: 18px;">A Small Surprise For You!</h3>
        <p style="color: #6b7280; font-size: 14px; margin-bottom: 15px;">Use this code on your next order to get <b>5% OFF</b> as a thank you for shopping with us!</p>
        <div style="display: inline-block; background-color: #ffffff; padding: 10px 25px; border: 2px solid ${primaryColor}; border-radius: 6px; font-family: monospace; font-size: 20px; font-weight: bold; color: ${primaryColor};">RaniLove5</div>
      </div>
    `;

    return emailBaseTemplate(`Order Confirmation - #${order.orderId}`, content, `Thanks for your order #${order.orderId}! Here are the details.`);
  },

  // 2. Order Status Update Email
  orderStatusUpdate: (data) => {
    const statusMessages = {
      processing: {
        title: 'We are preparing your order!',
        message: 'Your items are being packed with care and will be ready for shipment soon.',
        color: '#3b82f6'
      },
      shipped: {
        title: 'Your order is on the way!',
        message: 'Great news! Your package has been handed over to our delivery partner.',
        color: '#f59e0b'
      },
      delivered: {
        title: 'Delivered Successfully!',
        message: 'Your package has arrived. We hope you love your new items!',
        color: '#10b981'
      },
      cancelled: {
        title: 'Order Cancelled',
        message: 'Your order has been cancelled as requested.',
        color: '#ef4444'
      },
    };

    const statusInfo = statusMessages[data.status] || statusMessages.processing;

    const content = `
      <div style="text-align: center; margin-bottom: 30px;">
        <h2 style="color: ${statusInfo.color}; margin-top: 20px;">${statusInfo.title}</h2>
        <p style="font-size: 16px; color: #4b5563;">Hello <strong>${data.name}</strong>, ${statusInfo.message}</p>
      </div>
      
      <div style="background-color: #f9fafb; border-radius: 8px; padding: 25px; margin: 20px 0; text-align: center; border: 1px solid #e5e7eb;">
        <div style="color: #6b7280; font-size: 12px; text-transform: uppercase; font-weight: bold; margin-bottom: 8px;">Order Status</div>
        <div style="font-size: 24px; font-weight: bold; color: ${statusInfo.color}; margin: 5px 0; text-transform: uppercase;">${data.status}</div>
        <div style="margin-top: 15px; color: #4b5563; font-size: 14px;">Order ID: <strong>#${data.orderId}</strong></div>
      </div>

      ${data.trackingNumber ? `
        <div style="text-align: center; margin-bottom: 30px;">
          <p style="font-size: 14px; color: #6b7280;">Tracking Number: <strong>${data.trackingNumber}</strong></p>
        </div>
      ` : ''}

      <center>
        <a href="${process.env.FRONTEND_URL}/track/${data.orderId}${data.trackingQuery || ''}" class="btn">Track Order Status</a>
      </center>
    `;

    return emailBaseTemplate(`Update on Order #${data.orderId}`, content, statusInfo.message);
  },

  // 3. Welcome Email
  welcome: (user) => {
    const content = `
      <div style="text-align: center; margin-bottom: 30px;">
        <h2 style="color: #111827; margin-top: 10px; font-size: 24px;">Welcome to RongRani!</h2>
        <p style="font-size: 16px; color: #4b5563;">Hello <strong>${user.name}</strong>, we are thrilled to have you here.</p>
      </div>

      <div style="background-color: #fff1f2; border: 1px solid #fecdd3; border-radius: 8px; padding: 30px; margin-bottom: 30px; text-align: center;">
        <h3 style="color: #be123c; margin-top: 0;">A Special Gift for You</h3>
        <p style="color: #881337; margin-bottom: 20px;">Use the code below to get 10% off your first order!</p>
        <div style="display: inline-block; background-color: #ffffff; padding: 15px 30px; border: 2px dashed #db2777; border-radius: 4px; font-family: monospace; font-size: 24px; font-weight: bold; color: #be123c;">Rong10</div>
      </div>

      <p style="text-align: center; color: #4b5563; line-height: 1.6;">
        Explore our unique collection of handmade gifts and find the perfect item for your loved ones.
      </p>

      <center>
        <a href="${process.env.FRONTEND_URL}/shop" class="btn">Start Shopping</a>
      </center>
    `;

    return emailBaseTemplate('Welcome to RongRani', content, 'Here is a special gift for you!');
  },

  // 4. Admin Order Notification
  adminOrderNotification: (data) => {
    const products = (data.items || []).map(item => `
      <tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 20px 0;">
          <div style="font-weight: 700; color: #0f172a;">${item.name}</div>
          <div style="font-size: 12px; color: #94a3b8;">Ref Code: Artisan Selection | ${item.quantity} units</div>
        </td>
        <td style="padding: 20px 0; text-align: right; font-weight: 700; color: #0f172a;">
          ৳ ${(item.price * item.quantity).toFixed(2)}
        </td>
      </tr>
    `).join('');

    const content = `
      <div style="border-left: 3px solid #8B2635; padding-left: 25px; margin-bottom: 40px;">
        <h2 class="h-premium" style="font-size: 24px; margin: 0; color: #8B2635;">New Masterpiece Reservation</h2>
        <p style="margin-top: 8px; color: #475569; font-weight: 400; font-size: 15px;">Order #${data.orderId} awaits fulfillment.</p>
      </div>
      
      <div style="background-color: #fafafa; border-radius: 20px; padding: 30px; margin-bottom: 40px; border: 1px solid #f1f5f9;">
        <h4 style="margin: 0 0 20px 0; color: #94a3b8; text-transform: uppercase; font-size: 10px; letter-spacing: 2px; font-weight: 800;">Client Dossier</h4>
        <div style="color: #0f172a; line-height: 2; font-size: 15px;">
          <div style="font-weight: 600; font-size: 18px; font-family: 'Playfair Display', serif;">${data.customerName}</div>
          <div>📧 ${data.customerEmail}</div>
          <div>📞 ${data.customerPhone || 'N/A'}</div>
          <div style="margin-top: 15px; border-top: 1px solid #f1f5f9; padding-top: 15px;">
            <div style="font-weight: 700; color: #8B2635;">💳 PAYMENT: ${data.paymentMethod?.toUpperCase()}</div>
            <div style="font-size: 11px; color: #f59e0b; font-weight: bold; margin-bottom: 5px;">⚠️ STATUS: PENDING VERIFICATION</div>
            ${data.paymentDetails?.transactionId ? `<div style="font-size: 13px;">TrxID: <strong>${data.transactionId || data.paymentDetails.transactionId}</strong></div>` : ''}
            ${data.paymentDetails?.senderLastDigits ? `<div style="font-size: 13px;">Sender: ****${data.senderLastDigits || data.paymentDetails.senderLastDigits}</div>` : ''}
          </div>
          <div style="margin-top: 15px; color: #64748b; font-size: 14px; border-top: 1px solid #f1f5f9; padding-top: 15px;">📍 ${data.shippingAddress}</div>
        </div>
      </div>

      <h4 style="margin: 0 0 10px 0; color: #94a3b8; text-transform: uppercase; font-size: 10px; letter-spacing: 2px; font-weight: 800;">Artisan Summary</h4>
      <table width="100%" border="0" cellspacing="0" cellpadding="0">
        <tbody>
          ${products}
        </tbody>
      </table>
      
      <div style="text-align: right; padding: 30px 0; border-top: 1px solid #f1f5f9; margin-top: 10px;">
        <span style="color: #94a3b8; font-weight: 400; font-size: 13px; text-transform: uppercase; letter-spacing: 1px;">Estimated Allocation</span><br>
        <span style="color: #0f172a; font-size: 32px; font-family: 'Playfair Display', serif;">৳ ${data.total}</span>
      </div>

      <center>
        <a href="${process.env.FRONTEND_URL}/admin/orders" class="btn" style="background: #0f172a;">Review Dossier</a>
      </center>
    `;

    return emailBaseTemplate(`Priority Alert: Reservation #${data.orderId}`, content, `A new curation has been requested by ${data.customerName}.`);
  },

  // 5. Review Request Email
  reviewRequest: (data) => {
    const products = (data.items || []).map(item => `
      <div style="display: inline-block; width: 100px; text-align: center; margin: 10px; vertical-align: top;">
        <img src="${normalizeImageUrl(item.image) || 'https://via.placeholder.com/80'}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 4px; border: 1px solid #e5e7eb;">
        <div style="font-size: 12px; color: #4b5563; margin-top: 8px; line-height: 1.3; overflow: hidden; height: 32px;">${item.name}</div>
      </div>
    `).join('');

    const content = `
      <div style="text-align: center; margin-bottom: 30px;">
        <h2 style="color: #111827; margin-top: 20px;">We'd love to hear from you!</h2>
        <p style="font-size: 16px; color: #4b5563;">Hello <strong>${data.name}</strong>, how was your recent experience with RongRani?</p>
      </div>
      
      ${products ? `
        <div style="text-align: center; margin-bottom: 30px; background: #ffffff; padding: 20px;">
          <h3 style="color: #6b7280; font-size: 14px; text-transform: uppercase; margin-bottom: 20px;">Your Items</h3>
          ${products}
        </div>
      ` : ''}
      
      <p style="font-size: 16px; color: #4b5563; text-align: center; line-height: 1.6;">
        Your feedback helps us improve and helps other customers make better choices.
      </p>

      <center style="margin: 30px 0;">
        <div style="font-size: 32px; letter-spacing: 5px; margin-bottom: 20px; color: #C5A059;">⭐⭐⭐⭐⭐</div>
        <a href="${process.env.FRONTEND_URL}/user/reviews" class="btn">Write a Review</a>
      </center>
    `;

    return emailBaseTemplate('Rate your recent purchase', content, 'We value your feedback!');
  },

  // 6. Low Stock Alert (Admin)
  lowStockAlert: (data) => {
    const content = `
      <div style="background: #ffffff; border-radius: 24px; padding: 40px; border: 1px solid #fee2e2; text-align: center;">
        <div style="display: inline-block; background: #dc2626; color: white; padding: 8px 16px; border-radius: 100px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 25px;">Inventory Integrity</div>
        <h2 class="h-premium" style="color: #0f172a; margin: 0;">Supply Scarcity Alert</h2>
        
        <div class="gold-divider"></div>
        
        <p style="color: #64748b; font-size: 14px; text-transform: uppercase; letter-spacing: 2px; font-weight: 800; margin-bottom: 10px;">Masterpiece</p>
        <h3 style="margin: 0 0 30px 0; color: #0f172a; font-size: 24px; font-family: 'Playfair Display', serif;">${data.name}</h3>
        
        <div style="font-size: 64px; font-weight: 400; color: #dc2626; font-family: 'Playfair Display', serif;">${data.stock}</div>
        <div style="font-size: 12px; color: #94a3b8; font-weight: 800; text-transform: uppercase; letter-spacing: 3px;">Units Remaining in Vault</div>
        
        <div style="margin-top: 40px; border-top: 1px solid #f1f5f9; padding-top: 30px; color: #94a3b8; font-size: 12px; font-weight: 300;">
          REFERENCE Dossier: <span style="font-family: monospace; color: #0f172a;">${data._id}</span>
        </div>
      </div>

      <center>
        <a href="${process.env.FRONTEND_URL}/admin/products" class="btn" style="background: #dc2626;">Execute Restock</a>
      </center>
    `;

    return emailBaseTemplate(`Critical Alert: Scarcity of [${data.name}]`, content, `Immediate action: ${data.name} is nearly depleted.`);
  },

  // 7. Newsletter Welcome Email
  newsletterWelcome: () => {
    const content = `
      <div style="text-align: center; margin-bottom: 30px;">
        <h2 style="color: #111827; margin-top: 10px; font-size: 24px;">You're on the list!</h2>
        <p style="font-size: 16px; color: #4b5563;">Thank you for subscribing to RongRani Newsletter.</p>
      </div>

      <div style="background-color: #fff1f2; border: 1px solid #fecdd3; border-radius: 8px; padding: 30px; margin-bottom: 30px; text-align: center;">
        <h3 style="color: #be123c; margin-top: 0;">Welcome Gift</h3>
        <p style="color: #881337; margin-bottom: 20px;">Enjoy 10% off your next purchase!</p>
        <div style="display: inline-block; background-color: #ffffff; padding: 15px 30px; border: 2px dashed #db2777; border-radius: 4px; font-family: monospace; font-size: 24px; font-weight: bold; color: #be123c;">WELCOME10</div>
      </div>

      <p style="text-align: center; color: #4b5563;">
        You will be the first to know about our new arrivals and exclusive offers.
      </p>

      <center>
        <a href="${process.env.FRONTEND_URL}/shop" class="btn">Start Shopping</a>
      </center>
    `;

    return emailBaseTemplate('Welcome to RongRani Newsletter', content, 'Thanks for subscribing!');
  },

  // 8. Password Reset Email
  passwordReset: (data) => {
    const content = `
      <div style="text-align: center; margin-bottom: 30px;">
        <h2 style="color: #111827; margin-top: 10px;">Reset Your Password</h2>
        <p style="font-size: 16px; color: #4b5563;">Hello <strong>${data.name}</strong>, we received a request to reset your password.</p>
      </div>

      <div style="background-color: #fff7ed; border: 1px solid #fed7aa; border-radius: 8px; padding: 25px; margin-bottom: 30px; text-align: center;">
        <p style="color: #9a3412; font-size: 15px; margin-bottom: 20px;">
          Click the button below to reset your password. This link will expire in 60 minutes.
        </p>
        <center>
          <a href="${data.resetLink}" class="btn" style="background-color: #ea580c; width: auto; min-width: 200px;">Reset Password</a>
        </center>
      </div>

      <p style="text-align: center; color: #6b7280; font-size: 14px;">
        If you didn't ask for this, you can ignore this email. Your password won't be changed.
      </p>
    `;

    return emailBaseTemplate('Reset your RongRani password', content, 'Action required: Reset your password.');
  },

  // 9. Admin: New User Notification
  adminNewUser: (data) => {
    const content = `
      <div style="border-left: 3px solid #8B2635; padding-left: 25px; margin-bottom: 40px;">
        <h2 class="h-premium" style="font-size: 24px; margin: 0; color: #8B2635;">New Member Registered</h2>
        <p style="margin-top: 8px; color: #475569; font-weight: 400; font-size: 15px;">A new account has been established in the RongRani registry.</p>
      </div>
      
      <div style="background-color: #fafafa; border-radius: 20px; padding: 35px; border: 1px solid #f1f5f9;">
        <div style="color: #94a3b8; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; font-weight: 800; margin-bottom: 20px;">Identity Details</div>
        <div style="color: #0f172a; line-height: 2.5; font-size: 16px;">
          <div style="font-weight: 600; font-size: 20px; font-family: 'Playfair Display', serif;">${data.userName}</div>
          <div style="color: #64748b;">📧 ${data.userEmail}</div>
          <div style="color: #64748b; font-size: 14px;">📅 Joined: ${data.registeredAt}</div>
        </div>
      </div>

      <center style="margin-top: 40px;">
        <a href="${process.env.FRONTEND_URL}/admin/users" class="btn" style="background: #0f172a;">Review Registry</a>
      </center>
    `;

    return emailBaseTemplate('Priority: New User Membership', content, `A new member, ${data.userName}, has joined the community.`);
  },

  // 10. Admin: Payment Received Notification
  adminPaymentReceived: (data) => {
    const content = `
      <div style="border-left: 3px solid #10b981; padding-left: 25px; margin-bottom: 40px;">
        <h2 class="h-premium" style="font-size: 24px; margin: 0; color: #10b981;">Funds Successfully Acquired</h2>
        <p style="margin-top: 8px; color: #475569; font-weight: 400; font-size: 15px;">Payment for Reservation #${data.orderId} has been verified.</p>
      </div>
      
      <div style="background-color: #fafafa; border-radius: 20px; padding: 35px; border: 1px solid #f1f5f9;">
        <div style="color: #94a3b8; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; font-weight: 800; margin-bottom: 20px;">Transaction Dossier</div>
        <div style="color: #0f172a; font-size: 16px;">
          <div style="display: flex; justify-content: space-between; padding: 10px 0;">
            <span style="color: #64748b;">Client</span>
            <span style="font-weight: 600;">${data.customerName}</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 10px 0;">
            <span style="color: #64748b;">Amount Acquired</span>
            <span style="font-weight: 600; color: #10b981;">৳${data.amount}</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 10px 0;">
            <span style="color: #64748b;">Portal</span>
            <span style="font-weight: 600;">${data.paymentMethod}</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 10px 0; border-top: 1px solid #f1f5f9; margin-top: 10px; padding-top: 20px;">
            <span style="color: #64748b;">Reference</span>
            <span style="font-family: monospace; font-size: 14px;">${data.transactionId || 'N/A'}</span>
          </div>
        </div>
      </div>

      <center style="margin-top: 40px;">
        <a href="${process.env.FRONTEND_URL}/admin/orders" class="btn" style="background: #10b981;">Review Transaction</a>
      </center>
    `;

    return emailBaseTemplate('Priority: Payment Verification Received', content, `Payment of ৳${data.amount} received for order #${data.orderId}.`);
  },

  // 11. Review Thank You Email
  reviewThankYou: (data) => {
    const content = `
      <div style="text-align: center; margin-bottom: 30px;">
        <h2 style="color: #111827; margin-top: 10px;">Thank You!</h2>
        <p style="font-size: 16px; color: #4b5563;">Dear <strong>${data.name}</strong>, thanks for your feedback.</p>
      </div>

      <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 30px; text-align: center;">
        <p style="color: #6b7280; font-size: 12px; text-transform: uppercase; margin-bottom: 10px;">Your Review</p>
        <p style="font-style: italic; color: #374151; font-size: 16px; line-height: 1.6;">
          "${data.comment.length > 120 ? data.comment.substring(0, 120) + '...' : data.comment}"
        </p>
      </div>

      <div style="background-color: #fce7f3; border: 1px solid #fbcfe8; border-radius: 8px; padding: 30px; margin-bottom: 30px; text-align: center;">
        <h3 style="color: #be185d; margin-top: 0;">A Token of Appreciation</h3>
        <p style="color: #9d174d; margin-bottom: 20px;">Use this code for 5% off your next purchase!</p>
        <div style="display: inline-block; background-color: #ffffff; padding: 10px 20px; border: 2px dashed #db2777; border-radius: 4px; font-family: monospace; font-size: 20px; font-weight: bold; color: #be123c;">GUEST5</div>
      </div>

      <center>
        <a href="${process.env.FRONTEND_URL}/shop" class="btn">Shop Again</a>
      </center>
    `;

    return emailBaseTemplate('Thanks for your feedback!', content, 'Here is a discount code for your next order.');
  },

  // 12. Contact Form Submission (Admin Notification)
  contactForm: (data) => {
    const content = `
      <div style="border-left: 3px solid #8B2635; padding-left: 25px; margin-bottom: 40px;">
        <h2 class="h-premium" style="font-size: 24px; margin: 0; color: #8B2635;">New Contact Message</h2>
        <p style="margin-top: 8px; color: #475569; font-weight: 400; font-size: 15px;">A visitor has reached out via the contact form.</p>
      </div>
      
      <div style="background-color: #fafafa; border-radius: 20px; padding: 35px; border: 1px solid #f1f5f9;">
        <div style="color: #94a3b8; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; font-weight: 800; margin-bottom: 20px;">Sender Details</div>
        <div style="color: #0f172a; line-height: 2; font-size: 15px;">
          <div style="font-weight: 600; font-size: 18px; font-family: 'Playfair Display', serif;">${data.name}</div>
          <div>📧 <a href="mailto:${data.email}" style="color: #8B2635; text-decoration: none;">${data.email}</a></div>
          <div>📞 ${data.phone || 'N/A'}</div>
          <div style="margin-top: 15px; border-top: 1px solid #f1f5f9; padding-top: 15px;">
            <div style="font-weight: 700; color: #0f172a; margin-bottom: 5px;">Subject: ${data.subject}</div>
            <div style="background: #ffffff; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; color: #475569; font-style: italic;">
              "${data.message.replace(/\n/g, '<br>')}"
            </div>
          </div>
        </div>
      </div>

      <center style="margin-top: 40px;">
        <a href="mailto:${data.email}?subject=Re: ${encodeURIComponent(data.subject)}" class="btn" style="background: #0f172a;">Reply to Visitor</a>
      </center>
    `;

    return emailBaseTemplate(`New Message: ${data.subject}`, content, `Message from ${data.name}`);
  },
};

// Send email function
const sendEmail = async (to, subject, template, data, attachments = []) => {
  try {
    // 🚀 USE BREVO API IF API KEY IS AVAILABLE (Most reliable for Cloud/Render)
    if (process.env.BREVO_API_KEY) {
      console.log(`🚀 Using Brevo API to send email to: ${to}`);
      const axios = require('axios');

      let htmlContent;
      if (typeof template === 'string' && emailTemplates[template]) {
        htmlContent = emailTemplates[template](data);
      } else {
        htmlContent = typeof template === 'function' ? template(data) : template;
      }

      // Convert attachments to Brevo API format (Base64)
      const formattedAttachments = attachments.map(att => ({
        content: att.content.toString('base64'),
        name: att.filename
      }));

      const adminEmail = process.env.SUPER_ADMIN_EMAIL;

      const response = await axios.post('https://api.brevo.com/v3/smtp/email', {
        sender: {
          name: process.env.FROM_NAME || 'RongRani',
          email: process.env.FROM_EMAIL || 'info@rongrani.com'
        },
        to: [{ email: to }],
        bcc: adminEmail ? [{ email: adminEmail }] : undefined, // Add BCC to admin
        subject: subject,
        htmlContent: htmlContent,
        attachment: formattedAttachments.length > 0 ? formattedAttachments : undefined
      }, {
        headers: {
          'api-key': process.env.BREVO_API_KEY,
          'Content-Type': 'application/json'
        }
      });

      console.log('✅ Email sent successfully via Brevo API:', response.data.messageId);
      return { success: true, messageId: response.data.messageId };
    }

    // 🕊️ FALLBACK TO SMTP (Current method)
    console.log('🕊️ No API key found, falling back to SMTP...');
    const transporter = createTransporter();

    // Verify connection configuration
    try {
      await transporter.verify();
    } catch {
      console.error('⚠️ SMTP Verify failed, attempting to send anyway...');
    }

    let htmlContent;
    if (typeof template === 'string' && emailTemplates[template]) {
      htmlContent = emailTemplates[template](data);
    } else {
      htmlContent = typeof template === 'function' ? template(data) : template;
    }

    const fromEmail = process.env.FROM_EMAIL || process.env.EMAIL_FROM || 'noreply@rongrani.com';
    const fromName = process.env.FROM_NAME || process.env.EMAIL_FROM_NAME || 'RongRani';

    const mailOptions = {
      from: `"${fromName}" <${fromEmail}>`,
      to,
      subject,
      html: htmlContent,
      attachments
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent via SMTP:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Email failed:', error.response?.data || error.message);
    return { success: false, error: error.message };
  }
};

// Helper functions for specific emails (Using CommonJS exports)
const sendOrderConfirmation = (orderData, attachments = []) => {
  // Normalize data structure if needed
  // Handle Mongoose document (toObject) or plain object
  const order = orderData.toObject ? orderData.toObject() : orderData;

  const customerName = order.user?.name || order.guestInfo?.name || order.billingAddress?.name || 'Customer';
  const customerEmail = order.user?.email || order.guestInfo?.email || order.billingAddress?.email || order.shippingAddress?.email;

  const data = {
    ...order,
    name: customerName,
    orderId: order.orderId || order.orderNumber || order._id,
    total: order.total,
    subtotal: order.subtotal,
    shipping: order.shipping,
    discount: order.discount,
    items: order.items || [],
    shippingAddress: order.shippingAddress
  };

  if (!customerEmail) {
    console.error('❌ No email found for order:', order._id);
    return Promise.resolve({ success: false, error: 'No email found' });
  }

  return sendEmail(
    customerEmail,
    `Order Confirmation - ${data.orderId}`,
    'orderConfirmation',
    data,
    attachments
  );
};

const sendOrderStatusUpdate = (email, name, orderId, status, trackingNumber, trackingQuery) => {
  return sendEmail(
    email,
    `Order Status Update - ${orderId}`,
    'orderStatusUpdate',
    { name, orderId, status, trackingNumber, trackingQuery }
  );
};


const sendReviewRequest = (email, name, orderId, items, trackingQuery) => {
  return sendEmail(
    email,
    `Rate your experience with RongRani! ⭐`,
    'reviewRequest',
    { name, orderId, items, trackingQuery }
  );
};

const sendLowStockAlert = (product) => {
  const adminEmail = process.env.SUPER_ADMIN_EMAIL || process.env.SMTP_USER || 'info.rongrani@gmail.com';
  console.log(`⚠️ Sending Low Stock Alert for ${product.name} to ${adminEmail}`);
  return sendEmail(
    adminEmail,
    `⚠️ Low Stock: ${product.name} (${product.stock} left)`,
    'lowStockAlert',
    product
  );
};

const sendContactMessage = (data) => {
  const adminEmail = process.env.ADMIN_EMAIL || process.env.SMTP_USER || 'info.rongrani@gmail.com';
  return sendEmail(
    adminEmail,
    `New Message: ${data.subject}`,
    'contactForm',
    data
  );
};

module.exports = {
  sendEmail,
  sendOrderConfirmation,
  sendOrderStatusUpdate,
  sendReviewRequest,
  sendLowStockAlert,
  sendContactMessage
};
