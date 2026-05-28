const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const session = require('express-session');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { generateInvoicePDF, sendInvoiceEmail } = require('./utils/document_helper');
const config = require('./config');

const app = express();
const PORT = process.env.PORT || 3000;

// In production (Fly.io), DB lives on a persistent volume mounted at /data
// In development, it lives alongside the source files
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'yadhee.db');

// Auto-seed DB on first boot if the file doesn't exist yet (Fly.io cold start)
if (!fs.existsSync(DB_PATH)) {
    console.log('[Bootstrap] Database not found — running db_init.js to seed...');
    try {
        // Temporarily point db_init to the volume path by setting env before requiring
        process.env.DB_PATH = DB_PATH;
        require('./db_init');
        console.log('[Bootstrap] Database seeded successfully.');
    } catch (e) {
        console.error('[Bootstrap] db_init failed:', e.message);
    }
}

// Ensure assets directory exists for uploads
const assetsDir = path.join(__dirname, 'assets');
if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
}

// Database Connection helper
function getDbConnection() {
    return new sqlite3.Database(DB_PATH);
}

// Self-healing database migrations: automatically ensure stock_quantity & invoice_path columns exist
(function() {
    const db = new sqlite3.Database(DB_PATH);
    db.run("ALTER TABLE products ADD COLUMN stock_quantity INTEGER DEFAULT 5", [], (err) => {
        db.run("ALTER TABLE orders ADD COLUMN invoice_path TEXT", [], (err) => {
            db.run(`
                CREATE TABLE IF NOT EXISTS abandoned_carts (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    customer_name TEXT,
                    customer_email TEXT,
                    customer_phone TEXT,
                    shipping_address TEXT,
                    cart_data TEXT,
                    total_price_inr INTEGER,
                    total_price_usd INTEGER,
                    recovered INTEGER DEFAULT 0,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `, [], (err) => {
                db.close();
            });
        });
    });
})();

// Multer Storage Configuration for Admin Image Uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, assetsDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, 'prod-' + uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// Configure View Engine & Middleware
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Session Management
app.use(session({
    secret: 'yadhee_secret_key_heritage_2026_royal',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));

// Serve Static Files from Root (preserves assets/ hero_saree.png, style.css, script.js references)
app.use(express.static(__dirname));

// Expose configurations globally to all EJS templates
app.use((req, res, next) => {
    res.locals.whatsappPhone = config.WHATSAPP_PHONE;
    res.locals.lowStockThreshold = config.LOW_STOCK_THRESHOLD;
    next();
});

// Custom Secure Admin Session Middleware
function checkAdminAuth(req, res, next) {
    if (req.session && req.session.isAdmin) {
        return next();
    }
    res.redirect('/admin/login');
}

// Helper: Secure SHA256 fallback logic if needed, but we used bcrypt for admin_users in db_init.js
// So we will stick to standard bcryptjs verification!
function verifyAdminPassword(password, storedHash) {
    // We will verify using bcrypt
    return bcrypt.compareSync(password, storedHash);
}

// -------------------------------------------------------------
// I. STOREFRONT PAGES (DYNAMICALLY RENDERED)
// -------------------------------------------------------------

// Home page
app.get('/', (req, res) => {
    const db = getDbConnection();
    db.all('SELECT * FROM products WHERE is_active = 1', [], (err, products) => {
        db.close();
        if (err) {
            console.error(err);
            return res.status(500).send("Internal Server Error");
        }
        
        // Parse specs JSON for each product
        const parsedProducts = products.map(p => ({
            ...p,
            specs: JSON.parse(p.specs || '{}')
        }));

        res.render('index', { products: parsedProducts });
    });
});

// Sarees collection catalog
app.get('/sarees', (req, res) => {
    const db = getDbConnection();
    db.all("SELECT * FROM products WHERE category = 'saree' AND is_active = 1", [], (err, products) => {
        db.close();
        if (err) {
            console.error(err);
            return res.status(500).send("Internal Server Error");
        }
        
        const parsedProducts = products.map(p => ({
            ...p,
            specs: JSON.parse(p.specs || '{}')
        }));

        res.render('sarees', { products: parsedProducts });
    });
});

// Jewels collection catalog
app.get('/jewels', (req, res) => {
    const db = getDbConnection();
    db.all("SELECT * FROM products WHERE category = 'jewel' AND is_active = 1", [], (err, products) => {
        db.close();
        if (err) {
            console.error(err);
            return res.status(500).send("Internal Server Error");
        }
        
        const parsedProducts = products.map(p => ({
            ...p,
            specs: JSON.parse(p.specs || '{}')
        }));

        res.render('jewels', { products: parsedProducts });
    });
});

// New Arrivals catalog
app.get('/new-arrivals', (req, res) => {
    const db = getDbConnection();
    db.all("SELECT * FROM products WHERE is_active = 1 ORDER BY rowid DESC LIMIT 6", [], (err, products) => {
        db.close();
        if (err) {
            console.error(err);
            return res.status(500).send("Internal Server Error");
        }
        
        const parsedProducts = products.map(p => ({
            ...p,
            specs: JSON.parse(p.specs || '{}')
        }));

        res.render('new-arrivals', { products: parsedProducts });
    });
});

// Our Story page
app.get('/about', (req, res) => {
    res.render('about');
});

// Contact page
app.get('/contact', (req, res) => {
    res.render('contact');
});


// -------------------------------------------------------------
// II. CLIENT-FACING REST APIS
// -------------------------------------------------------------

// Fetch all products API (used by search / filter logic)
app.get('/api/products', (req, res) => {
    const db = getDbConnection();
    db.all('SELECT * FROM products WHERE is_active = 1', [], (err, rows) => {
        db.close();
        if (err) return res.status(500).json({ error: err.message });
        
        const parsed = rows.map(r => ({
            ...r,
            specs: JSON.parse(r.specs || '{}')
        }));
        res.json(parsed);
    });
});

// Fetch single product API
app.get('/api/products/:id', (req, res) => {
    const db = getDbConnection();
    db.get('SELECT * FROM products WHERE id = ? AND is_active = 1', [req.params.id], (err, row) => {
        db.close();
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: "Product not found" });
        
        row.specs = JSON.parse(row.specs || '{}');
        res.json(row);
    });
});

// Post-checkout asynchronous document & email dispatch engine
function processPostCheckoutDocs(orderId, order, items) {
    generateInvoicePDF(order, items)
        .then((pdfPath) => {
            console.log(`[Document Pipeline] Generated PDF invoice at: ${pdfPath}`);
            
            // Save invoice reference to database
            const db = getDbConnection();
            db.run("UPDATE orders SET invoice_path = ? WHERE id = ?", [pdfPath, orderId], (err) => {
                db.close();
                if (err) {
                    console.error(`[Document Pipeline] Failed to save invoice path in DB for Order #${orderId}:`, err.message);
                } else {
                    console.log(`[Document Pipeline] Invoice path saved in DB for Order #${orderId}`);
                }
                
                // Dispatch email with invoice attachment
                sendInvoiceEmail(order, pdfPath)
                    .then((res) => {
                        if (res.success) {
                            console.log(`[Document Pipeline] Email dispatch completed successfully.`);
                            if (res.previewUrl) {
                                console.log(`[Document Pipeline] Live test email preview URL: ${res.previewUrl}`);
                            }
                        } else {
                            console.error(`[Document Pipeline] Email dispatch returned failure: ${res.error}`);
                        }
                    })
                    .catch((emailErr) => {
                        console.error(`[Document Pipeline] Critical error in email dispatch:`, emailErr);
                    });
            });
        })
        .catch((pdfErr) => {
            console.error(`[Document Pipeline] Critical error in PDF generation for Order #${orderId}:`, pdfErr);
        });
}

// Simulated payment gateway processor (100% Mock, no external APIs)
function processMockPayment(cardDetails, forceOutcome = 'success') {
    return new Promise((resolve, reject) => {
        // Simulate a minor network latency of 300ms
        setTimeout(() => {
            if (forceOutcome === 'failure') {
                return reject(new Error("Insured Escrow Protocol declined transaction. Payment Authorization Failed."));
            }
            resolve({
                transactionId: "YDH-TXN-" + Math.floor(10000000 + Math.random() * 90000000),
                status: "Success",
                authorizedAmount: cardDetails.amount
            });
        }, 300);
    });
}

// Create dynamic Checkout transaction API with inventory check and deductions
app.post('/api/checkout', (req, res) => {
    const { name, email, phone, address, cart, totalINR, totalUSD, paymentForceOutcome } = req.body;
    
    if (!name || !email || !phone || !address || !cart || cart.length === 0) {
        return res.status(400).json({ error: "Incomplete checkout information." });
    }

    const db = getDbConnection();
    
    // Step 1: Pre-checkout validation of stock levels
    const itemIds = cart.map(item => item.id);
    const placeholders = itemIds.map(() => '?').join(',');
    
    db.all(`SELECT id, name, stock_quantity FROM products WHERE id IN (${placeholders})`, itemIds, (err, dbProducts) => {
        if (err) {
            db.close();
            console.error("Stock check error:", err);
            return res.status(500).json({ error: "Failed to validate catalog stock levels." });
        }
        
        // Check stock availability
        for (const item of cart) {
            const dbProd = dbProducts.find(p => p.id === item.id);
            if (!dbProd) {
                db.close();
                return res.status(404).json({ error: `Masterpiece with ID ${item.id} not found in our catalog.` });
            }
            if (dbProd.stock_quantity < item.qty) {
                db.close();
                return res.status(400).json({ 
                    error: `Insufficient stock in vault for "${dbProd.name}". Available stock: ${dbProd.stock_quantity}. You requested: ${item.qty}.` 
                });
            }
        }
        
        // Step 2: Trigger mock payment gateway processing
        processMockPayment({ amount: totalINR }, paymentForceOutcome || 'success')
            .then((paymentRes) => {
                console.log(`[Payment Gateway] Simulated payment APPROVED. Txn ID: ${paymentRes.transactionId}`);

                // Apply 5% Sovereign Discount server-side (billing parity with frontend)
                const DISCOUNT_RATE = 0.05;
                const finalTotalINR = Math.round(totalINR * (1 - DISCOUNT_RATE));
                const finalTotalUSD = parseFloat((totalUSD * (1 - DISCOUNT_RATE)).toFixed(2));
                console.log(`[Discount] Applied 5% sovereign discount: ₹${totalINR} → ₹${finalTotalINR} | $${totalUSD} → $${finalTotalUSD}`);

                // Step 3: Perform order insertion and stock updates inside transaction
                db.serialize(() => {
                    db.run("BEGIN TRANSACTION");

                    db.run(`
                        INSERT INTO orders (customer_name, customer_email, customer_phone, shipping_address, total_price_inr, total_price_usd)
                        VALUES (?, ?, ?, ?, ?, ?)
                    `, [name, email, phone, address, finalTotalINR, finalTotalUSD], function (err) {
                        if (err) {
                            db.run("ROLLBACK");
                            db.close();
                            console.error("Order Insert Error:", err.message);
                            return res.status(500).json({ error: "Failed to log secure dispatch order." });
                        }

                        const orderId = this.lastID;
                        let completedItems = 0;
                        let hasError = false;
                        const orderItemsDetails = [];

                        function checkCompleted() {
                            completedItems++;
                            if (completedItems === cart.length) {
                                if (hasError) {
                                    db.run("ROLLBACK", () => {
                                        db.close();
                                    });
                                    return res.status(500).json({ error: "Fulfillment inventory allocation processing error." });
                                } else {
                                    db.run("COMMIT", () => {
                                        db.close();
                                        // Trigger the asynchronous document generation and email pipeline post-checkout
                                        processPostCheckoutDocs(orderId, {
                                            id: orderId,
                                            customer_name: name,
                                            customer_email: email,
                                            customer_phone: phone,
                                            shipping_address: address,
                                            total_price_inr: finalTotalINR,
                                            total_price_usd: finalTotalUSD
                                        }, orderItemsDetails);

                                        // Also, mark any active abandoned cart for this email as converted/recovered (2)
                                        const dbAC = new sqlite3.Database(DB_PATH);
                                        dbAC.run("UPDATE abandoned_carts SET recovered = 2 WHERE customer_email = ?", [email], (err) => {
                                            dbAC.close();
                                        });
                                    });
                                    return res.json({ success: true, orderId: orderId });
                                }
                            }
                        }

                        cart.forEach((item) => {
                            db.get("SELECT price_inr, price_usd, name, type, category FROM products WHERE id = ?", [item.id], (err, prod) => {
                                if (err || !prod) {
                                    hasError = true;
                                    checkCompleted();
                                } else {
                                    orderItemsDetails.push({
                                        product_id: item.id,
                                        name: prod.name,
                                        type: prod.type,
                                        category: prod.category,
                                        quantity: item.qty,
                                        price_inr: prod.price_inr,
                                        price_usd: prod.price_usd
                                    });

                                    // Insert order item
                                    db.run(`
                                        INSERT INTO order_items (order_id, product_id, quantity, price_inr, price_usd)
                                        VALUES (?, ?, ?, ?, ?)
                                    `, [orderId, item.id, item.qty, prod.price_inr, prod.price_usd], (err) => {
                                        if (err) {
                                            hasError = true;
                                            checkCompleted();
                                        } else {
                                            // Deduct inventory
                                            db.run(`
                                                UPDATE products 
                                                SET stock_quantity = stock_quantity - ? 
                                                WHERE id = ?
                                            `, [item.qty, item.id], (err) => {
                                                if (err) {
                                                    hasError = true;
                                                }
                                                checkCompleted();
                                            });
                                        }
                                    });
                                }
                            });
                        });
                    });
                });
            })
            .catch((paymentErr) => {
                db.close();
                console.warn(`[Payment Gateway] Simulated payment DECLINED: ${paymentErr.message}`);

                // Record in abandoned_carts table as active (0) since user typed info but transaction failed
                const dbAC = new sqlite3.Database(DB_PATH);
                dbAC.run(`
                    INSERT INTO abandoned_carts (customer_name, customer_email, customer_phone, shipping_address, cart_data, total_price_inr, total_price_usd, recovered)
                    VALUES (?, ?, ?, ?, ?, ?, ?, 0)
                `, [name, email, phone, address, JSON.stringify(cart), totalINR, totalUSD], (err) => {
                    dbAC.close();
                });

                return res.status(402).json({ 
                    error: `Payment Authorization Failure: Insufficient funds or card declined by Insured Escrow Protocol. Please try again.` 
                });
            });
    });
});

// Virtual Atelier Consultation Request API
app.post('/api/atelier', (req, res) => {
    const { name, email, interest, message } = req.body;
    if (!name || !email || !interest) {
        return res.status(400).json({ error: "Please fill in all required fields." });
    }

    const db = getDbConnection();
    db.run(`
        INSERT INTO atelier_bookings (client_name, client_email, interest_type, message)
        VALUES (?, ?, ?, ?)
    `, [name, email, interest, message], function (err) {
        db.close();
        if (err) {
            console.error(err);
            return res.status(500).json({ error: "Failed to transmit booking." });
        }
        res.json({ success: true });
    });
});

// Newsletter Subscription API
app.post('/api/newsletter', (req, res) => {
    const { email } = req.body;
    if (!email) {
        return res.status(400).json({ error: "Email portal required." });
    }

    const db = getDbConnection();
    db.run(`
        INSERT INTO newsletter_subscribers (email)
        VALUES (?)
    `, [email], function (err) {
        db.close();
        if (err) {
            // Check for SQLite UNIQUE constraint error
            if (err.message.includes("UNIQUE")) {
                return res.json({ success: true, message: "Already subscribed." });
            }
            console.error(err);
            return res.status(500).json({ error: "Failed to subscribe." });
        }
        res.json({ success: true });
    });
});

// Real-time Abandoned Cart Sync Endpoint
app.post('/api/abandoned-cart', (req, res) => {
    const { name, email, phone, address, cart, totalINR, totalUSD } = req.body;
    if (!email) {
        return res.status(400).json({ error: "Email required for cart secure registry." });
    }

    const db = getDbConnection();
    // Check if an active abandoned cart already exists for this email (where recovered != 2)
    db.get("SELECT id FROM abandoned_carts WHERE customer_email = ? AND recovered != 2 ORDER BY id DESC LIMIT 1", [email], (err, row) => {
        if (err) {
            db.close();
            console.error(err);
            return res.status(500).json({ error: "Database error." });
        }

        if (row) {
            // Update existing record
            db.run(`
                UPDATE abandoned_carts 
                SET customer_name = ?, customer_phone = ?, shipping_address = ?, cart_data = ?, total_price_inr = ?, total_price_usd = ?
                WHERE id = ?
            `, [name, phone, address, JSON.stringify(cart), totalINR, totalUSD, row.id], function(err) {
                db.close();
                if (err) {
                    console.error(err);
                    return res.status(500).json({ error: "Failed to update draft cart." });
                }
                res.json({ success: true, updated: true, id: row.id });
            });
        } else {
            // Insert new record
            db.run(`
                INSERT INTO abandoned_carts (customer_name, customer_email, customer_phone, shipping_address, cart_data, total_price_inr, total_price_usd, recovered)
                VALUES (?, ?, ?, ?, ?, ?, ?, 0)
            `, [name, email, phone, address, JSON.stringify(cart), totalINR, totalUSD], function(err) {
                db.close();
                if (err) {
                    console.error(err);
                    return res.status(500).json({ error: "Failed to log draft cart." });
                }
                res.json({ success: true, updated: false, id: this.lastID });
            });
        }
    });
});

// Marketing Recovery Follow-up Action
app.post('/api/admin/abandoned-cart/recover/:id', checkAdminAuth, (req, res) => {
    const cartId = req.params.id;
    const db = getDbConnection();

    db.get("SELECT * FROM abandoned_carts WHERE id = ?", [cartId], (err, cartRecord) => {
        if (err || !cartRecord) {
            db.close();
            return res.status(404).json({ error: "Abandoned cart registry not found." });
        }

        // Set recovered = 1 (Discount Email Sent)
        db.run("UPDATE abandoned_carts SET recovered = 1 WHERE id = ?", [cartId], (err) => {
            db.close();
            if (err) {
                console.error(err);
                return res.status(500).json({ error: "Failed to update recovery state." });
            }

            // Simulate recovery discount follow-up email
            const customerName = cartRecord.customer_name || "Valued Patron";
            const customerEmail = cartRecord.customer_email;
            
            // Build visual fallback email log in assets/emails/
            const emailsDir = path.join(__dirname, 'assets', 'emails');
            if (!fs.existsSync(emailsDir)) {
                fs.mkdirSync(emailsDir, { recursive: true });
            }

            let cartItemsList = '';
            try {
                const items = JSON.parse(cartRecord.cart_data || '[]');
                items.forEach(it => {
                    cartItemsList += `<li><strong>${it.name || 'Masterpiece'}</strong> (Qty: ${it.qty})</li>`;
                });
            } catch(e) {
                cartItemsList = '<li>Signature Weaves & Jewels</li>';
            }

            const emailHTML = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: 'Cinzel', 'Georgia', serif; background-color: #FAF8F5; color: #2A2425; padding: 2rem; }
                    .email-card { background: white; border: 1px solid #C5A059; border-radius: 12px; max-width: 600px; margin: 0 auto; padding: 2.5rem; box-shadow: 0 4px 15px rgba(0,0,0,0.02); }
                    .brand { text-align: center; border-bottom: 1px solid #FAF6EE; padding-bottom: 1.5rem; }
                    .title { font-size: 1.5rem; text-align: center; color: #7A0C1E; margin-top: 1.5rem; }
                    .content { font-family: 'Montserrat', sans-serif; font-size: 0.9rem; line-height: 1.6; margin-top: 1.5rem; }
                    .coupon-box { text-align: center; margin: 2rem 0; padding: 1.5rem; border: 1.5px dashed #C5A059; background-color: #FAF8F5; }
                    .coupon-code { font-size: 1.4rem; font-weight: bold; color: #7A0C1E; letter-spacing: 0.1em; }
                    .footer { font-family: 'Montserrat', sans-serif; font-size: 0.72rem; color: #8E877D; text-align: center; margin-top: 2.5rem; border-top: 1px solid #FAF6EE; padding-top: 1.5rem; }
                </style>
            </head>
            <body>
                <div class="email-card">
                    <div class="brand">
                        <h2 style="margin:0; letter-spacing:0.15em;">YADHEE</h2>
                        <p style="margin:5px 0 0 0; font-size:0.6rem; color:#8E877D; letter-spacing:0.05em; text-transform:uppercase;">Weaves of Antiquity, Gold of Gods</p>
                    </div>
                    <h3 class="title">Secured Acquisitions Recovery Notice</h3>
                    <div class="content">
                        <p>Dear ${customerName},</p>
                        <p>We noticed that during your recent visit to Yadhee Heritage, you left behind some exquisite masterpieces in your shopping bag:</p>
                        <ul>
                            ${cartItemsList}
                        </ul>
                        <p>As a gesture of our appreciation for your interest in our generational silk weaves and hand-chased ornaments, we have authorized a **10% Sovereign Discount** on these pieces.</p>
                        <div class="coupon-box">
                            <p style="margin:0 0 10px 0; font-size:0.8rem; font-weight:600; color:#C5A059;">YOUR PERSONAL RECOVERY KEY</p>
                            <span class="coupon-code">YADHEE10</span>
                            <p style="margin:10px 0 0 0; font-size:0.75rem; color:#8E877D;">Apply this code at checkout to secure your 10% sovereign discount.</p>
                        </div>
                        <p>If you have any questions or require custom atelier fitting details, our master stylists are ready to assist you.</p>
                    </div>
                    <div class="footer">
                        <p>&copy; 2026 Yadhee Luxury Heritage Pvt. Ltd. All rights reserved. Crafted in slow fashion.</p>
                    </div>
                </div>
            </body>
            </html>
            `;

            const logPath = path.join(emailsDir, `recovery-${cartId}.html`);
            fs.writeFileSync(logPath, emailHTML);
            console.log(`[Marketing Recovery] Saved visual recovery email to: ${logPath}`);

            // Optional: send simulated email via nodemailer Ethereal sandboxed SMTP!
            const nodemailer = require('nodemailer');
            nodemailer.createTestAccount().then(testAccount => {
                const transporter = nodemailer.createTransport({
                    host: 'smtp.ethereal.email',
                    port: 587,
                    secure: false,
                    auth: {
                        user: testAccount.user,
                        pass: testAccount.pass
                    }
                });

                const mailOptions = {
                    from: '"Yadhee Heritage" <atelier@yadhee.com>',
                    to: customerEmail,
                    subject: 'Acquisition Recovery Notice - Secure 10% Sovereign Discount',
                    html: emailHTML
                };

                transporter.sendMail(mailOptions).then(info => {
                    console.log(`[Marketing SMTP] Recovery email sent successfully to: ${customerEmail}`);
                    const previewUrl = nodemailer.getTestMessageUrl(info);
                    console.log(`[Marketing SMTP] Live preview URL: ${previewUrl}`);
                    
                    res.json({ 
                        success: true, 
                        previewUrl: previewUrl, 
                        localPath: `/assets/emails/recovery-${cartId}.html` 
                    });
                }).catch(err => {
                    console.error("Nodemailer error:", err);
                    res.json({ success: true, localPath: `/assets/emails/recovery-${cartId}.html` });
                });
            }).catch(err => {
                console.error("Ethereal creation error:", err);
                res.json({ success: true, localPath: `/assets/emails/recovery-${cartId}.html` });
            });
        });
    });
});


// -------------------------------------------------------------
// III. SECURE ADMIN BACKEND (PROTECTED VIEW ROUTES)
// -------------------------------------------------------------

// Admin login GET
app.get('/admin/login', (req, res) => {
    if (req.session.isAdmin) {
        return res.redirect('/admin');
    }
    res.render('admin_login', { error: null });
});

// Admin login POST
app.post('/admin/login', (req, res) => {
    const { username, password } = req.body;
    const db = getDbConnection();

    db.get('SELECT * FROM admin_users WHERE username = ?', [username], (err, user) => {
        db.close();
        if (err) {
            return res.render('admin_login', { error: "Database authentication error." });
        }
        
        // Simple secure password verification
        const salt = "yadhee_royal_salt_2026";
        let inputHash;
        if (user) {
            // We supports standard SHA256 hashed fallback as well as bcrypt
            // First we try standard bcrypt since it was generated by bcryptjs in db_init.js
            try {
                if (bcrypt.compareSync(password, user.password_hash)) {
                    req.session.isAdmin = true;
                    return res.redirect('/admin');
                }
            } catch(e) {
                // Hashing mismatch or raw fallback
            }

            // Fallback: SHA256 validation if database was initialized with standard sha256
            const crypto = require('crypto');
            inputHash = crypto.createHash('sha256').update(password + salt).digest('hex');
            if (inputHash === user.password_hash) {
                req.session.isAdmin = true;
                return res.redirect('/admin');
            }
        }

        res.render('admin_login', { error: "Invalid sovereign credentials." });
    });
});

// Admin Dashboard Route with dynamic low stock metric
app.get('/admin', checkAdminAuth, (req, res) => {
    const db = getDbConnection();
    
    // Fetch stats
    db.get("SELECT COUNT(*) as order_count, SUM(total_price_inr) as total_inr, SUM(total_price_usd) as total_usd FROM orders", [], (err, stats) => {
        db.get("SELECT COUNT(*) as booking_count FROM atelier_bookings WHERE status = 'Pending'", [], (err, bookingStats) => {
            db.get("SELECT COUNT(*) as low_stock_count FROM products WHERE stock_quantity < ? AND is_active = 1", [config.LOW_STOCK_THRESHOLD], (err, lowStockStats) => {
                db.all("SELECT * FROM products ORDER BY category, id", [], (err, products) => {
                    db.all("SELECT * FROM orders ORDER BY id DESC", [], (err, orders) => {
                        db.all("SELECT * FROM atelier_bookings ORDER BY id DESC", [], (err, bookings) => {
                            db.all("SELECT * FROM newsletter_subscribers ORDER BY id DESC", [], (err, subscribers) => {
                                db.all("SELECT * FROM abandoned_carts ORDER BY id DESC", [], (err, abandonedCarts) => {
                                    db.close();
                                    
                                    const parsedProducts = products.map(p => ({
                                        ...p,
                                        specs: JSON.parse(p.specs || '{}')
                                    }));

                                    res.render('admin_dashboard', {
                                        stats: {
                                            order_count: stats.order_count || 0,
                                            total_inr: stats.total_inr || 0,
                                            total_usd: stats.total_usd || 0,
                                            pending_bookings: bookingStats.booking_count || 0,
                                            low_stock: lowStockStats.low_stock_count || 0
                                        },
                                        products: parsedProducts,
                                        orders: orders || [],
                                        bookings: bookings || [],
                                        subscribers: subscribers || [],
                                        abandonedCarts: abandonedCarts || []
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    });
});

// Admin Logout
app.get('/admin/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/admin/login');
});

// -------------------------------------------------------------
// IV. SECURE ADMIN ACTION APIS (PRODUCTS, ORDERS, BOOKINGS CRUD)
// -------------------------------------------------------------

// Add product with stock quantity
app.post('/admin/products/add', checkAdminAuth, upload.single('product_image'), (req, res) => {
    const { id, category, subcategory, name, type, price_inr, price_usd, tag, description, spec_keys, spec_values, stock_quantity } = req.body;
    
    let image_url = 'assets/hero_saree.png'; // default fallback
    if (req.file) {
        image_url = 'assets/' + req.file.filename;
    }

    // Parse specs array into JSON dictionary
    const specsObj = {};
    if (Array.isArray(spec_keys)) {
        for (let i = 0; i < spec_keys.length; i++) {
            if (spec_keys[i].trim() !== '') {
                specsObj[spec_keys[i].trim()] = spec_values[i] ? spec_values[i].trim() : '';
            }
        }
    } else if (spec_keys && spec_keys.trim() !== '') {
        specsObj[spec_keys.trim()] = spec_values ? spec_values.trim() : '';
    }

    const db = getDbConnection();
    db.run(`
        INSERT INTO products (id, category, subcategory, name, type, price_inr, price_usd, image_url, tag, description, specs, stock_quantity)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [id, category, subcategory, name, type, parseInt(price_inr), parseInt(price_usd), image_url, tag, description, JSON.stringify(specsObj), parseInt(stock_quantity || 5)], function (err) {
        db.close();
        if (err) {
            console.error(err);
            // Handle duplicate id error
            return res.status(400).send("Database error inserting product. Please check if ID is unique.");
        }
        res.redirect('/admin');
    });
});

// Edit product details with stock quantity
app.post('/admin/products/edit/:id', checkAdminAuth, upload.single('product_image'), (req, res) => {
    const originalId = req.params.id;
    const { category, subcategory, name, type, price_inr, price_usd, tag, description, spec_keys, spec_values, stock_quantity } = req.body;

    const specsObj = {};
    if (Array.isArray(spec_keys)) {
        for (let i = 0; i < spec_keys.length; i++) {
            if (spec_keys[i].trim() !== '') {
                specsObj[spec_keys[i].trim()] = spec_values[i] ? spec_values[i].trim() : '';
            }
        }
    } else if (spec_keys && spec_keys.trim() !== '') {
        specsObj[spec_keys.trim()] = spec_values ? spec_values.trim() : '';
    }

    const db = getDbConnection();

    // Check if new image uploaded
    if (req.file) {
        const image_url = 'assets/' + req.file.filename;
        db.run(`
            UPDATE products
            SET category=?, subcategory=?, name=?, type=?, price_inr=?, price_usd=?, image_url=?, tag=?, description=?, specs=?, stock_quantity=?
            WHERE id=?
        `, [category, subcategory, name, type, parseInt(price_inr), parseInt(price_usd), image_url, tag, description, JSON.stringify(specsObj), parseInt(stock_quantity || 5), originalId], function (err) {
            db.close();
            if (err) console.error(err);
            res.redirect('/admin');
        });
    } else {
        db.run(`
            UPDATE products
            SET category=?, subcategory=?, name=?, type=?, price_inr=?, price_usd=?, tag=?, description=?, specs=?, stock_quantity=?
            WHERE id=?
        `, [category, subcategory, name, type, parseInt(price_inr), parseInt(price_usd), tag, description, JSON.stringify(specsObj), parseInt(stock_quantity || 5), originalId], function (err) {
            db.close();
            if (err) console.error(err);
            res.redirect('/admin');
        });
    }
});

// Soft Delete product (Toggle is_active visibility)
app.post('/admin/products/delete/:id', checkAdminAuth, (req, res) => {
    const id = req.params.id;
    const db = getDbConnection();
    db.run('UPDATE products SET is_active = 0 WHERE id = ?', [id], function (err) {
        db.close();
        if (err) console.error(err);
        res.redirect('/admin');
    });
});

// Update Order fulfillment status
app.post('/admin/orders/status/:id', checkAdminAuth, (req, res) => {
    const id = req.params.id;
    const { status } = req.body;
    
    const db = getDbConnection();
    db.run('UPDATE orders SET status = ? WHERE id = ?', [status, id], function (err) {
        db.close();
        if (err) console.error(err);
        res.redirect('/admin');
    });
});

// Update Atelier booking status
app.post('/admin/bookings/status/:id', checkAdminAuth, (req, res) => {
    const id = req.params.id;
    const { status } = req.body;

    const db = getDbConnection();
    db.run('UPDATE atelier_bookings SET status = ? WHERE id = ?', [status, id], function (err) {
        db.close();
        if (err) console.error(err);
        res.redirect('/admin');
    });
});

// Expose order details API to check items inside admin modal easily
app.get('/api/orders/:id', checkAdminAuth, (req, res) => {
    const db = getDbConnection();
    db.all(`
        SELECT oi.*, p.name, p.type, p.image_url
        FROM order_items oi
        JOIN products p ON oi.product_id = p.id
        WHERE oi.order_id = ?
    `, [req.params.id], (err, rows) => {
        db.close();
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Secure GET download invoice endpoint
app.get('/admin/orders/invoice/:id', checkAdminAuth, (req, res) => {
    const orderId = req.params.id;
    const db = getDbConnection();
    db.get("SELECT invoice_path FROM orders WHERE id = ?", [orderId], (err, row) => {
        db.close();
        if (err || !row) {
            return res.status(404).send("Invoice not found in the archives.");
        }
        if (!row.invoice_path) {
            return res.status(404).send("Invoice file has not been compiled yet.");
        }
        
        const absolutePath = path.join(__dirname, row.invoice_path);
        if (fs.existsSync(absolutePath)) {
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `inline; filename="YDH-Invoice-${orderId}.pdf"`);
            return res.sendFile(absolutePath);
        } else {
            return res.status(404).send("Invoice file was not found on our secure disks.");
        }
    });
});

// Start application
app.listen(PORT, () => {
    console.log(`\n============================================================`);
    console.log(` Yadhee Royal Full-Stack MVP online on http://localhost:${PORT}`);
    console.log(`============================================================\n`);
});
