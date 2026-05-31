const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

// In production (Fly.io), store generated files on the persistent volume
// In development, store alongside source in assets/
const dataDir = process.env.DATA_DIR || path.join(__dirname, '..', 'assets');

// Ensure assets directories exist
const invoicesDir = path.join(dataDir, 'invoices');
if (!fs.existsSync(invoicesDir)) {
    fs.mkdirSync(invoicesDir, { recursive: true });
}

const emailsDir = path.join(dataDir, 'emails');
if (!fs.existsSync(emailsDir)) {
    fs.mkdirSync(emailsDir, { recursive: true });
}

/**
 * Dynamically builds a premium PDF invoice with the brand's aesthetic.
 * @param {Object} order The order record from SQLite
 * @param {Array} items The list of purchased order items
 * @returns {Promise<string>} Relative path to the generated PDF
 */
function generateInvoicePDF(order, items) {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ margin: 50, size: 'A4' });
            const orderId = order.id;
            const pdfPath = path.join(invoicesDir, `invoice-${orderId}.pdf`);
            const writeStream = fs.createWriteStream(pdfPath);

            doc.pipe(writeStream);

            // Premium Brand Colors
            const colorCrimson = '#7A0C1E';
            const colorGold = '#C5A059';
            const colorCharcoal = '#2A2425';
            const colorGrayLight = '#DDD9D2';

            // 1. Header Branding Centered (Text Font Only)
            doc.font('Times-BoldItalic')
               .fontSize(28)
               .fillColor(colorCrimson)
               .text('Yadhee', { align: 'center', characterSpacing: 1 });
            doc.y = 65;

            doc.font('Times-Italic')
               .fontSize(9)
               .fillColor(colorGold)
               .text('HERITAGE OF WEAVES & JEWELS', { align: 'center', characterSpacing: 1.5 })
               .moveDown(0.5);

            // Elegant Gold Divider Bar
            doc.moveTo(50, doc.y)
               .lineTo(545, doc.y)
               .strokeColor(colorGold)
               .lineWidth(1.5)
               .stroke()
               .moveDown(1.5);

            // 2. Metadata Billing Grid (50pt margin -> width 495pt -> column boundaries)
            const metadataStartY = doc.y;
            
            // Left Column: Customer details
            doc.font('Helvetica-Bold')
               .fontSize(10)
               .fillColor(colorGold)
               .text('BILL TO:', 50, metadataStartY)
               .font('Helvetica-Bold')
               .fontSize(11)
               .fillColor(colorCharcoal)
               .text(order.customer_name, 50, metadataStartY + 15)
               .font('Helvetica')
               .fontSize(9)
               .text(`Email: ${order.customer_email}`, 50, metadataStartY + 30)
               .text(`Phone: ${order.customer_phone}`, 50, metadataStartY + 42)
               .text('Shipping Address:', 50, metadataStartY + 55)
               .font('Helvetica-Oblique')
               .text(order.shipping_address, 50, metadataStartY + 67, { width: 230 });

            // Right Column: Invoice/Order records
            doc.font('Helvetica-Bold')
               .fontSize(10)
               .fillColor(colorGold)
               .text('ORDER SUMMARY:', 330, metadataStartY)
               .font('Helvetica-Bold')
               .fontSize(10)
               .fillColor(colorCharcoal)
               .text(`Invoice Ref: YDH-2026-INV-${orderId}`, 330, metadataStartY + 15)
               .font('Helvetica')
               .fontSize(9)
               .text(`Order Date: ${new Date(order.created_at || Date.now()).toLocaleString()}`, 330, metadataStartY + 30)
               .text(`Status: Paid & Verified`, 330, metadataStartY + 42)
               .text(`Order Code: YDH-ORD-2026-${orderId}`, 330, metadataStartY + 54);

            doc.moveDown(7.5);

            // Light gray divider
            doc.moveTo(50, doc.y)
               .lineTo(545, doc.y)
               .strokeColor(colorGrayLight)
               .lineWidth(0.5)
               .stroke()
               .moveDown(1);

            // 3. Itemized Table
            const tableHeaderY = doc.y;
            doc.font('Helvetica-Bold').fontSize(9).fillColor(colorGold);
            doc.text('Masterpiece Description', 50, tableHeaderY);
            doc.text('Category/Craft', 260, tableHeaderY);
            doc.text('Qty', 350, tableHeaderY);
            doc.text('Unit Price (INR)', 390, tableHeaderY, { width: 75, align: 'right' });
            doc.text('Total (INR)', 470, tableHeaderY, { width: 75, align: 'right' });

            doc.moveTo(50, tableHeaderY + 15)
               .lineTo(545, tableHeaderY + 15)
               .strokeColor(colorGold)
               .lineWidth(1)
               .stroke();

            doc.y = tableHeaderY + 22;

            let subtotalINR = 0;

            items.forEach((item) => {
                const itemTotalINR = item.price_inr * item.quantity;
                subtotalINR += itemTotalINR;
                
                const rowY = doc.y;
                doc.font('Helvetica-Bold').fontSize(9).fillColor(colorCharcoal)
                   .text(item.name || `Signature Item (${item.product_id})`, 50, rowY, { width: 200 });
                
                doc.font('Helvetica').fontSize(9)
                   .text(item.type || 'Heritage Design', 260, rowY)
                   .text(item.quantity.toString(), 350, rowY)
                   .text(`₹${item.price_inr.toLocaleString('en-IN')}`, 390, rowY, { width: 75, align: 'right' })
                   .text(`₹${itemTotalINR.toLocaleString('en-IN')}`, 470, rowY, { width: 75, align: 'right' });
                
                doc.moveDown(1.5);
                
                // Draw bottom border for rows
                doc.moveTo(50, doc.y)
                   .lineTo(545, doc.y)
                   .strokeColor(colorGrayLight)
                   .lineWidth(0.5)
                   .stroke()
                   .moveDown(0.8);
            });

            // 4. Summaries and Calculations
            doc.moveDown(1);
            const summaryStartY = doc.y;
            
            // Left summary column: Brand promise
            doc.font('Helvetica-Oblique')
               .fontSize(8)
               .fillColor(colorGold)
               .text('Premium Packaging & Shipping Included.', 50, summaryStartY)
               .text('All prices inclusive of custom protective packaging, velvet box casings,', 50, summaryStartY + 12)
               .text('and fully insured express shipping.', 50, summaryStartY + 22);

            // Right summary column: Math and subtotals
            const taxRate = 0.18; // 18% Luxury GST
            const gstINR = Math.round(subtotalINR * taxRate);
            const grandTotalINR = subtotalINR + gstINR;
            const totalUSD = order.total_price_usd;

            const labelX = 350;
            const valueX = 470;
            
            // Subtotal
            doc.font('Helvetica-Bold').fontSize(9).fillColor(colorCharcoal)
               .text('Subtotal:', labelX, summaryStartY, { width: 110, align: 'right' })
               .font('Helvetica')
               .text(`₹${subtotalINR.toLocaleString('en-IN')}`, valueX, summaryStartY, { width: 75, align: 'right' });

            // GST (18%)
            doc.font('Helvetica-Bold')
               .text('Luxury GST (18%):', labelX, summaryStartY + 15, { width: 110, align: 'right' })
               .font('Helvetica')
               .text(`₹${gstINR.toLocaleString('en-IN')}`, valueX, summaryStartY + 15, { width: 75, align: 'right' });

            // Courier
            doc.font('Helvetica-Bold')
               .text('Courier (Insured):', labelX, summaryStartY + 30, { width: 110, align: 'right' })
               .font('Helvetica-Bold')
               .fillColor('#67C23A')
               .text('FREE', valueX, summaryStartY + 30, { width: 75, align: 'right' });

            // Divider before Total
            doc.moveTo(350, summaryStartY + 45)
               .lineTo(545, summaryStartY + 45)
               .strokeColor(colorGold)
               .lineWidth(1)
               .stroke();

            // Grand Total INR
            doc.font('Helvetica-Bold')
               .fontSize(11)
               .fillColor(colorCrimson)
               .text('Grand Total (INR):', labelX, summaryStartY + 52, { width: 110, align: 'right' })
               .text(`₹${grandTotalINR.toLocaleString('en-IN')}`, valueX, summaryStartY + 52, { width: 75, align: 'right' });

            // Grand Total USD
            doc.font('Helvetica-Bold')
               .fontSize(9)
               .fillColor(colorGold)
               .text('USD Equivalent:', labelX, summaryStartY + 68, { width: 110, align: 'right' })
               .text(`$${totalUSD.toLocaleString()}`, valueX, summaryStartY + 68, { width: 75, align: 'right' });

            // 5. Footer Signature Notes
            doc.moveTo(50, 715)
               .lineTo(545, 715)
               .strokeColor(colorGold)
               .lineWidth(0.5)
               .stroke();

            doc.font('Times-Italic')
               .fontSize(9)
               .fillColor(colorGold)
               .text("Thank you for shopping at Yadhee.", 50, 725, { align: 'center' });

            doc.font('Helvetica')
               .fontSize(7)
               .fillColor('#8E877D')
               .text('Yadhee Support • support@yadhee.com', 50, 740, { align: 'center' });

            doc.end();

            writeStream.on('finish', () => {
                resolve(`/assets/invoices/invoice-${orderId}.pdf`);
            });

            writeStream.on('error', (err) => {
                reject(err);
            });
        } catch (err) {
            reject(err);
        }
    });
}

/**
 * Dispatches an automated elegant email to the customer attaching the generated invoice PDF.
 * Supports sandbox visual testing locally and ethereal mock inboxes.
 * @param {Object} order The order record from SQLite
 * @param {string} invoicePath Relative path to the generated PDF
 * @returns {Promise<Object>} Status object with review links
 */
async function sendInvoiceEmail(order, invoicePath) {
    const orderId = order.id;
    const absolutePdfPath = path.join(__dirname, '..', invoicePath);
    
    // HTML email template with matching Crimson/Gold premium theme
    const htmlEmail = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@1,300;1,600&display=swap" rel="stylesheet">
        <style>
            body {
                font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
                background-color: #FDFBF7;
                color: #2A2425;
                margin: 0;
                padding: 0;
            }
            .wrapper {
                max-width: 600px;
                margin: 20px auto;
                background-color: #FFFFFF;
                border: 1px solid #C5A059;
                padding: 40px;
            }
            .header {
                text-align: center;
                border-bottom: 2px solid #C5A059;
                padding-bottom: 20px;
                margin-bottom: 30px;
            }
            .logo {
                font-family: 'Cormorant Garamond', Georgia, serif;
                font-size: 36px;
                font-style: italic;
                font-weight: 300;
                letter-spacing: 0.05em;
                color: #7A0C1E;
                margin: 0;
            }
            .subtitle {
                font-size: 10px;
                letter-spacing: 0.3em;
                color: #C5A059;
                text-transform: uppercase;
                margin-top: 5px;
            }
            .title {
                font-size: 18px;
                color: #7A0C1E;
                margin-bottom: 20px;
                text-transform: uppercase;
                letter-spacing: 0.05em;
            }
            p {
                font-size: 14px;
                line-height: 1.6;
                color: #2A2425;
                font-weight: 300;
            }
            .order-meta {
                background-color: #F4F1EC;
                padding: 15px;
                border-left: 4px solid #7A0C1E;
                margin: 20px 0;
                font-size: 13px;
                line-height: 1.5;
            }
            .footer {
                margin-top: 40px;
                padding-top: 20px;
                border-top: 1px solid #DDD9D2;
                text-align: center;
                font-size: 11px;
                color: #8E877D;
            }
            .signature {
                font-family: Georgia, serif;
                font-style: italic;
                color: #C5A059;
                font-size: 15px;
                margin-top: 20px;
            }
        </style>
    </head>
    <body>
            <div class="header">
                <div class="logo" style="font-family: 'Cormorant Garamond', Georgia, serif; font-size: 36px; font-style: italic; font-weight: 300; letter-spacing: 0.05em; color: #7A0C1E; text-align: center; margin: 0 auto 5px auto;">Yadhee</div>
                <div class="subtitle">Heritage of Weaves & Jewels</div>
            </div>
            
            <div class="title">Order Confirmed</div>
            
            <p>Dear <strong>${order.customer_name}</strong>,</p>
            
            <p>Thank you for your order! We have received your payment and are preparing your items for delivery.</p>
            
            <div class="order-meta">
                <strong>Order ID:</strong> YDH-2026-INV-${orderId}<br>
                <strong>Contact Email:</strong> ${order.customer_email}<br>
                <strong>Phone Number:</strong> ${order.customer_phone}<br>
                <strong>Shipping Address:</strong> ${order.shipping_address}<br>
                <strong>Total Price:</strong> ₹${order.total_price_inr.toLocaleString('en-IN')} (approx. $${order.total_price_usd.toLocaleString()} USD)
            </div>
            
            <p>For your records, we have attached your official PDF invoice to this email.</p>
            
            <p>If you have any questions or require custom stitching, please contact our support team at your convenience.</p>
            
            <p class="signature">Best regards,</p>
            <p style="font-weight: bold; color: #7A0C1E; margin-top: 5px;">The Yadhee Team</p>
            
            <div class="footer">
                Yadhee Support • Yadhee Team<br>
                This is an automated receipt email.
            </div>
        </div>
    </body>
    </html>
    `;

    // Save visual copy of E-mail in local filesystem for visual validation
    const mockEmailPath = path.join(emailsDir, `email-${orderId}.html`);
    fs.writeFileSync(mockEmailPath, htmlEmail, 'utf8');
    console.log(`[Email Mock] Saved visual log email to: ${mockEmailPath}`);

    try {
        let transporter;
        let testAccount;
        
        try {
            // Setup testing SMTP account from Ethereal Email sandbox
            testAccount = await nodemailer.createTestAccount();
            transporter = nodemailer.createTransport({
                host: 'smtp.ethereal.email',
                port: 587,
                secure: false, 
                auth: {
                    user: testAccount.user,
                    pass: testAccount.pass
                }
            });
            console.log(`[SMTP Configured] Using Ethereal sandbox SMTP portal: ${testAccount.user}`);
        } catch(smtpSetupErr) {
            console.warn(`[SMTP Offline] SMTP creation skipped (${smtpSetupErr.message}). Logging files locally.`);
        }

        if (transporter) {
            // Dispatch SMTP message
            const info = await transporter.sendMail({
                from: '"Yadhee Heritage Curators" <receipts@yadhee.com>',
                to: order.customer_email,
                subject: `Your Yadhee Heritage Sovereign Order Invoice - #YDH-2026-INV-${orderId}`,
                html: htmlEmail,
                attachments: [
                    {
                        filename: `YDH-Invoice-${orderId}.pdf`,
                        path: absolutePdfPath
                    }
                ]
            });

            console.log(`[SMTP Success] Email dispatched successfully to: ${order.customer_email}`);
            const previewUrl = nodemailer.getTestMessageUrl(info);
            console.log(`[SMTP Live Preview] View inbox dispatch: ${previewUrl}`);
            return { success: true, previewUrl: previewUrl, emailPath: `/assets/emails/email-${orderId}.html` };
        } else {
            console.log(`[SMTP Offline Log] Email generated offline for customer: ${order.customer_email}`);
            return { success: true, previewUrl: null, emailPath: `/assets/emails/email-${orderId}.html` };
        }
    } catch(err) {
        console.error(`[Email Dispatch Error] Failed to send email: ${err.message}`);
        return { success: false, error: err.message, emailPath: `/assets/emails/email-${orderId}.html` };
    }
}

module.exports = {
    generateInvoicePDF,
    sendInvoiceEmail
};
