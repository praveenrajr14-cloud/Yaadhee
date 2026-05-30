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

            // 1. Header Branding Centered
            const logoPath = path.join(dataDir, 'logo.jpg');
            if (fs.existsSync(logoPath)) {
                // Centering a 120 width image: (595 - 120) / 2 = 237.5
                doc.image(logoPath, 237.5, 30, { width: 120 });
                doc.y = 80;
            } else {
                doc.font('Times-Bold')
                   .fontSize(28)
                   .fillColor(colorCrimson)
                   .text('Y A D H E E', { align: 'center' });
            }

            doc.font('Times-Roman')
               .fontSize(9)
               .fillColor(colorGold)
               .text('HERITAGE OF WEAVES & JEWELS', { align: 'center', characterSpacing: 2 })
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
               .text('Shipping Transit Address:', 50, metadataStartY + 55)
               .font('Helvetica-Oblique')
               .text(order.shipping_address, 50, metadataStartY + 67, { width: 230 });

            // Right Column: Invoice/Order records
            doc.font('Helvetica-Bold')
               .fontSize(10)
               .fillColor(colorGold)
               .text('SOVEREIGN RECORD:', 330, metadataStartY)
               .font('Helvetica-Bold')
               .fontSize(10)
               .fillColor(colorCharcoal)
               .text(`Invoice Ref: YDH-2026-INV-${orderId}`, 330, metadataStartY + 15)
               .font('Helvetica')
               .fontSize(9)
               .text(`Order Date: ${new Date(order.created_at || Date.now()).toLocaleString()}`, 330, metadataStartY + 30)
               .text(`Status: Paid & Verified`, 330, metadataStartY + 42)
               .text(`Insurance Code: YDH-REG-2026-${orderId}`, 330, metadataStartY + 54);

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
               .text('Sovereign Luxury Protocol Applied.', 50, summaryStartY)
               .text('All prices inclusive of custom protective packaging, velvet box casings,', 50, summaryStartY + 12)
               .text('and fully insured overnight courier transport registry.', 50, summaryStartY + 22);

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
               .text("Thank you for patronizing Yadhee's heritage weaves and jewels.", 50, 725, { align: 'center' });

            doc.font('Helvetica')
               .fontSize(7)
               .fillColor('#8E877D')
               .text('Yadhee Atelier Udaipur Corridor • Royal Courier Dispatch Unit • support@yadhee.com', 50, 740, { align: 'center' });

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
                font-family: Georgia, serif;
                font-size: 32px;
                font-weight: bold;
                letter-spacing: 0.2em;
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
        <div class="wrapper">
            <div class="header">
                <div class="logo">
                    <img src="https://yaadhee-1.onrender.com/assets/logo.jpg" alt="YADHEE" style="height: 50px; width: auto; display: block; margin: 0 auto 10px auto; object-fit: contain;">
                </div>
                <div class="subtitle">Heritage of Weaves & Jewels</div>
            </div>
            
            <div class="title">Sovereign Dispatch Confirmed</div>
            
            <p>Esteemed <strong>${order.customer_name}</strong>,</p>
            
            <p>It is our distinct honor to inform you that your secure transaction has successfully passed validation in our vaults. Our master artisans are preparing your selected pieces for courier delivery.</p>
            
            <div class="order-meta">
                <strong>Dispatch Reference:</strong> YDH-2026-INV-${orderId}<br>
                <strong>Patron Coordinates:</strong> ${order.customer_email} | ${order.customer_phone}<br>
                <strong>Insured Transit Address:</strong> ${order.shipping_address}<br>
                <strong>Total Value:</strong> ₹${order.total_price_inr.toLocaleString('en-IN')} (approx. $${order.total_price_usd.toLocaleString()} USD)
            </div>
            
            <p>For your records, we have compiled and securely sealed your <strong>official PDF purchase invoice</strong>. You will find it attached directly to this dispatch notification.</p>
            
            <p>Should your bespoke selections require customization adjustments or custom stitching, please schedule a private design consultation in our Bespoke Atelier Registry at your convenience.</p>
            
            <p class="signature">With warm regards from our loom to your legacy,</p>
            <p style="font-weight: bold; color: #7A0C1E; margin-top: 5px;">The Curators of Yadhee</p>
            
            <div class="footer">
                Yadhee Royal Heritage Atelier Udaipur Corridor • Sovereign Registry Division<br>
                This is a secured automated receipt transaction message.
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
