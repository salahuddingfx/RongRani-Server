const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const generateInvoice = async (order) => {
  // Fetch QR Code for Tracking
  let qrBuffer = null;
  try {
    const frontendUrl = process.env.FRONTEND_URL || 'https://rongrani.vercel.app';
    const trackingUrl = `${frontendUrl}/track/${order.orderId || order._id}`;
    const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(trackingUrl)}`;
    const response = await axios.get(qrApiUrl, { responseType: 'arraybuffer' });
    qrBuffer = Buffer.from(response.data);
  } catch (error) {
    console.error('Error generating QR code for invoice:', error.message);
  }

  const frontendUrl = (process.env.FRONTEND_URL || 'https://rongrani.vercel.app').replace(/\/+$/, '');

  const resolveImageUrl = (value) => {
    if (!value) return '';
    if (typeof value === 'object' && value.url) return resolveImageUrl(value.url);
    if (typeof value !== 'string') return '';
    if (value.startsWith('http://') || value.startsWith('https://')) return value;
    if (value.startsWith('/')) return `${frontendUrl}${value}`;
    return value;
  };

  const fetchImageBuffer = async (url) => {
    if (!url) return null;
    try {
      const response = await axios.get(url, { responseType: 'arraybuffer', timeout: 8000 });
      return Buffer.from(response.data);
    } catch (error) {
      console.warn('Invoice image fetch failed:', error.message);
      return null;
    }
  };

  const imageBuffers = await Promise.all(order.items.map(async (item) => {
    const productImage = resolveImageUrl(item.product?.images?.[0]) || resolveImageUrl(item.image);
    return fetchImageBuffer(productImage);
  }));

  return new Promise((resolve, reject) => {
    try {
      const displayOrderId = (order.orderId || '').toString().trim() || order._id.toString().slice(-7).toUpperCase();
      const doc = new PDFDocument({ size: 'A4', margin: 40 });
      const buffers = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      // Premium Colors (Refined)
      const colors = {
        royalMaroon: '#8B2635',
        bespokeGold: '#C5A059', // Gold for accents
        midnight: '#1E293B',    // Softer black
        slate: '#64748B',       // Muted text
        cream: '#FAFAF9',       // Very light bg
        lightGray: '#F1F5F9',
        success: '#10B981',
        danger: '#EF4444'
      };

      // --- Helper Functions for Consistent Layout ---
      const drawHeader = (pageNum) => {
        // Top Accent Line
        doc.rect(0, 0, 595, 6).fill(colors.royalMaroon);

        // Header Logo
        const logoPath = path.join(__dirname, '../../public/RongRani-Logo.png');
        if (fs.existsSync(logoPath)) {
          // Circular Logo Clipping
          doc.save();
          doc.circle(65, 55, 25).clip();
          doc.image(logoPath, 40, 30, { width: 50 });
          doc.restore();

          // Optional: Add a subtle gold border around the circle
          doc.circle(65, 55, 25).lineWidth(1).stroke(colors.bespokeGold);
        }

        // Brand Name
        doc.fillColor(colors.royalMaroon).font('Helvetica-Bold').fontSize(26).text('RongRani', 100, 35);

        // Tagline
        doc.fillColor(colors.bespokeGold).font('Helvetica').fontSize(8);
        doc.text('E L E G A N C E   I N   E V E R Y   H U E', 100, 62, { characterSpacing: 1 });

        // Invoice Header Block (Only on first page)
        if (pageNum === 1) {
          doc.rect(400, 30, 155, 45, 4).fill(colors.royalMaroon);
          doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(18).text('INVOICE', 400, 38, { align: 'center', width: 155 });
          doc.fontSize(7).font('Helvetica').fillColor('#FFFFFF').text('OFFICIAL MANIFEST', 400, 58, { align: 'center', width: 155, characterSpacing: 1 });

          doc.fillColor(colors.slate).fontSize(8).text(`ID: #${displayOrderId}`, 290, 85, { align: 'right', width: 200 });

          if (qrBuffer) {
            doc.image(qrBuffer, 505, 85, { width: 50 });
            doc.fontSize(6).fillColor(colors.bespokeGold).text('Scan to Track', 505, 138, { width: 50, align: 'center' });
          }
        } else {
          // Smaller identifier on subsequent pages
          doc.fillColor(colors.slate).fontSize(8).text(`Invoice #${displayOrderId} - Page ${pageNum}`, 400, 40, { align: 'right', width: 155 });
        }

        // Navigation Line
        doc.rect(40, 140, 515, 2).fill(colors.royalMaroon);
        doc.rect(40, 142, 515, 12).fill(colors.lightGray);
        doc.fillColor(colors.royalMaroon).font('Helvetica-Bold').fontSize(7).text('QUALITY • AUTHENTICITY • ELEGANCE', 40, 145, { align: 'center', width: 515, characterSpacing: 2 });
      };

      const drawFooter = () => {
        const footerY = 780;
        doc.rect(40, footerY - 5, 515, 1).fill(colors.lightGray);
        doc.fontSize(7).fillColor(colors.slate).text('Thank you for choosing RongRani. For support, contact 01851075537', 40, footerY, { align: 'center', width: 515 });
        doc.fillColor(colors.royalMaroon).font('Helvetica-Bold').text('FB: /rongrani • IG: @rongrani • WA: +8801851075537 • www.rongrani.com', 40, footerY + 12, { align: 'center', width: 515 });
      };

      const drawTableHeader = (yPos) => {
        doc.rect(40, yPos, 515, 25).fill(colors.cream);
        doc.fontSize(8).font('Helvetica-Bold').fillColor(colors.royalMaroon);
        doc.text('DESCRIPTION', 55, yPos + 8);
        doc.text('QTY', 320, yPos + 8, { width: 40, align: 'center' });
        doc.text('UNIT PRICE', 380, yPos + 8, { width: 60, align: 'right' });
        doc.text('AMOUNT', 460, yPos + 8, { width: 90, align: 'right' });
      };

      // --- Page 1 Initialization ---
      let currentPage = 1;
      drawHeader(currentPage);

      // CRITICAL: Force cursor to skip header height so content doesn't jump
      const infoY = 175;
      doc.y = infoY;

      // Watermark (Background)
      const logoPath = path.join(__dirname, '../../public/RongRani-Logo.png');
      if (fs.existsSync(logoPath)) {
        doc.save();
        doc.opacity(0.015);
        doc.image(logoPath, 147, 300, { width: 300 });
        doc.restore();
      }

      // Client & Order Info
      doc.fontSize(8).font('Helvetica-Bold').fillColor(colors.bespokeGold).text('BILLED TO', 40, infoY);
      const shipping = order.shippingAddress || {};
      doc.fontSize(11).font('Helvetica-Bold').fillColor(colors.midnight).text(shipping.name || 'Valued Guest', 40, infoY + 12);
      doc.fontSize(7.5).font('Helvetica').fillColor(colors.slate).lineGap(1);
      doc.text(shipping.phone || '', 40, infoY + 26);
      if (shipping.email) doc.text(shipping.email);
      const addressLines = [shipping.street, shipping.city, shipping.district].filter(Boolean);
      doc.text(addressLines.join(', '), { width: 250 });

      const rightColX = 350;
      doc.fontSize(8).font('Helvetica-Bold').fillColor(colors.bespokeGold).text('ORDER DETAILS', rightColX, infoY);
      const orderDate = new Date(order.createdAt).toLocaleDateString('en-BD', { day: 'numeric', month: 'short', year: 'numeric' });

      const drawField = (label, value, y) => {
        doc.fontSize(7.5).fillColor(colors.slate).text(label, rightColX, y);
        doc.fontSize(7.5).fillColor(colors.midnight).text(value, rightColX + 90, y, { align: 'right', width: 110 });
      };

      drawField('Date:', orderDate, infoY + 12);
      drawField('Method:', (order.paymentMethod || '').toUpperCase(), infoY + 24);
      drawField('Status:', (order.paymentStatus || 'Pending').toUpperCase(), infoY + 36);
      drawField('Courier:', 'Standard', infoY + 48);

      // PAID STAMP (if applicable)
      if (order.paymentStatus === 'paid' || order.isPaid) {
        doc.save();
        doc.rotate(-15, { origin: [500, 180] });
        doc.rect(460, 160, 80, 25).fill('#10B981');
        doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(12).text('PAID', 460, 167, { width: 80, align: 'center' });
        doc.restore();
      }

      // --- Itemization Table ---
      let tableY = 265;
      drawTableHeader(tableY);
      let currentY = tableY + 30;

      order.items.forEach((item, index) => {
        const productData = item.product || {};
        const textWidth = 230;
        const imageBuffer = imageBuffers[index];
        const displayName = item.name || productData.name || 'Item';
        const displaySku = productData.sku || item.sku;
        const mainTextHeight = doc.heightOfString(displayName, { width: textWidth, font: 'Helvetica-Bold', size: 9 });
        const skuTextHeight = displaySku ? doc.heightOfString(`SKU: ${displaySku}`, { width: textWidth, font: 'Helvetica', size: 7 }) : 0;
        const descTextHeight = productData.description ? doc.heightOfString(productData.description, { width: textWidth, font: 'Helvetica', size: 7 }) : 0;
        const rowHeight = Math.max(36, mainTextHeight + skuTextHeight + descTextHeight + 10);

        if (currentY + rowHeight > 740) {
          drawFooter();
          doc.addPage();
          currentPage++;
          drawHeader(currentPage);
          doc.y = 160;
          currentY = 160;
          drawTableHeader(currentY);
          currentY += 30;
        }

        doc.moveTo(40, currentY + rowHeight).lineTo(555, currentY + rowHeight).strokeColor(colors.lightGray).lineWidth(0.5).stroke();

        if (imageBuffer) {
          try {
            doc.image(imageBuffer, 45, currentY + 4, { width: 30, height: 30 });
          } catch (error) {
            console.warn('Invoice image render failed:', error.message);
          }
        }

        let textCursorY = currentY + 4;
        doc.fillColor(colors.midnight).font('Helvetica-Bold').fontSize(9).text(displayName, 85, textCursorY, { width: textWidth });
        textCursorY += mainTextHeight + 1;
        if (displaySku) {
          doc.fillColor(colors.slate).font('Helvetica').fontSize(7).text(`SKU: ${displaySku}`, 85, textCursorY, { width: textWidth });
          textCursorY += skuTextHeight + 1;
        }
        if (productData.description) {
          doc.fillColor(colors.slate).font('Helvetica').fontSize(7).text(productData.description, 85, textCursorY, { width: textWidth });
        }
        doc.fillColor(colors.midnight).font('Helvetica').fontSize(9);
        doc.text(item.quantity, 320, currentY + (rowHeight / 2 - 4.5), { width: 40, align: 'center' });
        doc.text(item.price.toLocaleString(), 380, currentY + (rowHeight / 2 - 4.5), { width: 60, align: 'right' });
        doc.font('Helvetica-Bold').text((item.price * item.quantity).toLocaleString(), 460, currentY + (rowHeight / 2 - 4.5), { width: 90, align: 'right' });
        currentY += rowHeight;
      });

      // --- Financial Summary ---
      if (currentY + 80 > 740) {
        drawFooter();
        doc.addPage();
        currentPage++;
        drawHeader(currentPage);
        currentY = 160;
      }

      currentY += 15;
      const drawSum = (label, value, isTotal = false) => {
        doc.fontSize(isTotal ? 11 : 8.5).font(isTotal ? 'Helvetica-Bold' : 'Helvetica').fillColor(isTotal ? colors.royalMaroon : colors.slate).text(label, 350, currentY, { width: 100, align: 'right' });
        doc.fillColor(isTotal ? colors.royalMaroon : colors.midnight).text(value, 460, currentY, { width: 90, align: 'right' });
        currentY += isTotal ? 22 : 15;
      };

      drawSum('Subtotal:', `Tk ${order.subtotal.toLocaleString()}`);

      const isShipPaid = order.delivery?.isShippingPaid;
      drawSum(
        isShipPaid ? 'Shipping (Paid):' : 'Shipping:',
        isShipPaid ? 'Tk 0 (Paid)' : `Tk ${(order.shipping || 0).toLocaleString()}`
      );

      if (order.discount > 0) drawSum('Discount:', `- Tk ${order.discount.toLocaleString()}`);

      doc.moveTo(370, currentY).lineTo(555, currentY).strokeColor(colors.royalMaroon).lineWidth(1).stroke();
      currentY += 8;
      drawSum('Total Amount:', `Tk ${order.total.toLocaleString()}`, true);

      // --- Signatures ---
      const sigY = 740;
      doc.moveTo(40, sigY).lineTo(170, sigY).strokeColor(colors.slate).lineWidth(0.5).stroke();
      doc.fontSize(7).font('Helvetica').fillColor(colors.slate).text('ADMIN SIGNATURE', 40, sigY + 5, { align: 'center', width: 130 });

      // Customer stylized signature name
      doc.font('Times-Italic').fontSize(14).fillColor(colors.midnight).text(shipping.name || 'Customer Name', 232, sigY - 18, { align: 'center', width: 130 });
      doc.moveTo(232, sigY).lineTo(362, sigY).strokeColor(colors.slate).lineWidth(0.5).stroke();
      doc.fontSize(7).font('Helvetica').fillColor(colors.slate).text('CUSTOMER SIGNATURE', 232, sigY + 5, { align: 'center', width: 130 });

      doc.font('Times-Italic').fontSize(16).fillColor(colors.royalMaroon).text('RongRani', 425, sigY - 18, { align: 'center', width: 130 });
      doc.moveTo(425, sigY).lineTo(555, sigY).strokeColor(colors.slate).lineWidth(0.5).stroke();
      doc.fontSize(7).font('Helvetica').fillColor(colors.slate).text('AUTHORIZED SIGNATURE', 425, sigY + 5, { align: 'center', width: 130 });

      drawFooter();

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

const generateReport = (data, type) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const buffers = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });

      // Header
      doc.fontSize(20).text('RongRani', { align: 'center' });
      doc.fontSize(14).text(`${type} Report`, { align: 'center' });
      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, { align: 'center' });
      doc.moveDown();

      // Report content based on type
      if (type === 'Sales') {
        doc.fontSize(12);
        doc.text(`Total Orders: ${data.totalOrders}`);
        doc.text(`Total Revenue: $${data.totalRevenue.toFixed(2)}`);
        doc.text(`Average Order Value: $${data.averageOrderValue.toFixed(2)}`);
        doc.moveDown();

        // Monthly breakdown
        if (data.monthlyData) {
          doc.text('Monthly Sales:');
          data.monthlyData.forEach(month => {
            doc.text(`${month.month}: $${month.revenue.toFixed(2)} (${month.orders} orders)`);
          });
        }
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = {
  generateInvoice,
  generateReport,
};