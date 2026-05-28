const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

// Respects DB_PATH env var so Fly.io volume path (/data/yadhee.db) is used in production
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'yadhee.db');

function initDb() {
    console.log("Initializing Yadhee Heritage database...");
    
    const db = new sqlite3.Database(DB_PATH, (err) => {
        if (err) {
            console.error("Database connection error:", err.message);
            process.exit(1);
        }
    });

    db.serialize(() => {
        // Create tables sequentially
        db.run(`
            CREATE TABLE IF NOT EXISTS products (
                id TEXT PRIMARY KEY,
                category TEXT NOT NULL,
                subcategory TEXT NOT NULL,
                name TEXT NOT NULL,
                type TEXT NOT NULL,
                price_inr INTEGER NOT NULL,
                price_usd INTEGER NOT NULL,
                image_url TEXT NOT NULL,
                tag TEXT,
                description TEXT NOT NULL,
                specs TEXT NOT NULL,
                stock_quantity INTEGER DEFAULT 5,
                is_active INTEGER DEFAULT 1
            )
        `);

        db.run(`
            CREATE TABLE IF NOT EXISTS orders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                customer_name TEXT NOT NULL,
                customer_email TEXT NOT NULL,
                customer_phone TEXT NOT NULL,
                shipping_address TEXT NOT NULL,
                total_price_inr INTEGER NOT NULL,
                total_price_usd INTEGER NOT NULL,
                status TEXT NOT NULL DEFAULT 'Pending',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        db.run(`
            CREATE TABLE IF NOT EXISTS order_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                order_id INTEGER NOT NULL,
                product_id TEXT NOT NULL,
                quantity INTEGER NOT NULL,
                price_inr INTEGER NOT NULL,
                price_usd INTEGER NOT NULL,
                FOREIGN KEY (order_id) REFERENCES orders (id)
            )
        `);

        db.run(`
            CREATE TABLE IF NOT EXISTS atelier_bookings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                client_name TEXT NOT NULL,
                client_email TEXT NOT NULL,
                interest_type TEXT NOT NULL,
                message TEXT,
                status TEXT NOT NULL DEFAULT 'Pending',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        db.run(`
            CREATE TABLE IF NOT EXISTS newsletter_subscribers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        db.run(`
            CREATE TABLE IF NOT EXISTS admin_users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL
            )
        `);

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
        `, () => {
            // This callback runs after the schema has been set up successfully.
            // Let's seed now!
            seedData(db);
        });
    });
}

function seedData(db) {
    const adminUser = 'admin';
    const adminPass = 'YadheeRoyal2026!';
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(adminPass, salt);

    db.get('SELECT id FROM admin_users WHERE username = ?', [adminUser], (err, row) => {
        if (err) {
            console.error("Error reading admin_users table:", err.message);
            return;
        }
        if (!row) {
            db.run('INSERT INTO admin_users (username, password_hash) VALUES (?, ?)', [adminUser, hashedPassword], (err) => {
                if (err) {
                    console.error("Error seeding admin user:", err.message);
                } else {
                    console.log(`Default admin user seeded: ${adminUser}`);
                }
            });
        } else {
            console.log("Admin user already exists.");
        }
    });

    const productsToSeed = [
        {
            id: "s1",
            category: "saree",
            subcategory: "kanchipuram",
            name: "The Crimson Rajkumari Saree",
            type: "Kanchipuram Silk",
            price_inr: 245000,
            price_usd: 2950,
            image_url: "assets/hero_saree.png",
            tag: "Royal Bestseller",
            stock_quantity: 3,
            description: "The ultimate royal bridal centerpiece. Hand-loomed over 3 months using high-density pure Mulberry silk and certified 22-carat gold zari threads. Designed with legendary elephant and temple courtyard patterns on the heavy crimson border. Brings majestic grandeur to any heritage occasion.",
            specs: {
                "Craftsmanship": "Generational Hand-Loom",
                "Material": "100% Pure Mulberry Silk",
                "Gold Thread": "Certified 22k Gold Zari Weave",
                "Weaving Duration": "95 Loom Hours",
                "Origin": "Kanchipuram, Tamil Nadu"
            }
        },
        {
            id: "s2",
            category: "saree",
            subcategory: "banarasi",
            name: "Emerald Mayura Brocade",
            type: "Banarasi Silk",
            price_inr: 195000,
            price_usd: 2350,
            image_url: "assets/saree_green.png",
            tag: "",
            stock_quantity: 8,
            description: "A shimmering vision of dark emerald green adorned with rich floral motifs and exquisite hand-embroidered peacock borders. Formulated from premium Banarasi satin-silk, creating an exceptionally fluid drape that catches warm lighting with subtle golden gradients.",
            specs: {
                "Craftsmanship": "Traditional Brocade Looming",
                "Material": "Banarasi Satin Silk",
                "Gold Thread": "Real Silver Zari dipped in Gold",
                "Weaving Duration": "72 Loom Hours",
                "Origin": "Varanasi, Uttar Pradesh"
            }
        },
        {
            id: "s3",
            category: "saree",
            subcategory: "organza",
            name: "Swarna Alabaster Zari Saree",
            type: "Heritage Organza-Silk",
            price_inr: 220000,
            price_usd: 2650,
            image_url: "assets/saree_ivory.png",
            tag: "",
            stock_quantity: 5,
            description: "A highly sophisticated visual pairing of pure alabaster ivory organza and deep gold thread work. Delicate, semi-translucent drape engineered with structural silk borders for comfortable, ethereal bridal movements. Adorned with floral vines on the pallu.",
            specs: {
                "Craftsmanship": "Organza Filigree Looming",
                "Material": "Mulberry Organza Silk Blend",
                "Gold Thread": "Champagne Gold Zari Threads",
                "Weaving Duration": "85 Loom Hours",
                "Origin": "Dharmavaram, Andhra Pradesh"
            }
        },
        {
            id: "j1",
            category: "jewel",
            subcategory: "temple", // Updated to match filter data-filter="temple"
            name: "Mandira Temple Choker Set",
            type: "Antique Temple Gold",
            price_inr: 680000,
            price_usd: 8200,
            image_url: "assets/hero_jewel.png",
            tag: "Signature Masterpiece",
            stock_quantity: 1,
            description: "A heavy, majestic masterpiece sculpted by our chief heritage goldsmith. Employs ancient repoussé craftsmanship to sculpt detailed temple goddess structures out of solid 22k gold, encrusted with brilliant hand-cut uncut diamonds (Polki), crimson rubies, and delicate hanging natural pearls.",
            specs: {
                "Sculpting Craft": "Hand-Chased Repoussé",
                "Base Metal": "BIS Hallmarked 22k Gold",
                "Gemstones": "Natural Burma Rubies & Polki Diamonds",
                "Weight": "112 Grams Gold Net",
                "Dispatch Care": "Sovereign Certificate Registry"
            }
        },
        {
            id: "j2",
            category: "jewel",
            subcategory: "polki", // Updated to match filter data-filter="polki"
            name: "Mayura Polki Jhumkas",
            type: "Heritage 22k Gold",
            price_inr: 340000,
            price_usd: 4100,
            image_url: "assets/jewel_earrings.png",
            tag: "",
            stock_quantity: 6,
            description: "Classic double-dome chandelier jhumka earrings featuring intricate filigree gold-work. Encrusted with flat-cut polki diamonds, rubies, and finished with clusters of shimmering natural emerald beads that sway gently with movement.",
            specs: {
                "Sculpting Craft": "Heritage Jadau Filigree",
                "Base Metal": "BIS Hallmarked 22k Gold",
                "Gemstones": "Flat-Cut Polki Diamonds & Emerald Beads",
                "Weight": "48 Grams Gold Net",
                "Dispatch Care": "Premium Velvet Heirlooms Box"
            }
        },
        {
            id: "j3",
            category: "jewel",
            subcategory: "bangles", // Matches data-filter="bangles"
            name: "Hemlata Filigree Bangles",
            type: "Gold Filigree Fillets",
            price_inr: 420000,
            price_usd: 5050,
            image_url: "assets/jewel_bangles.png",
            tag: "",
            stock_quantity: 2,
            description: "An exquisite stack of four hand-carved heritage gold bangles, engineered with a secure antique lock system. Standard sizing (adjustable via custom request), showing fine detailed gold filigree wires woven into royal peacock crest motifs.",
            specs: {
                "Sculpting Craft": "Fine Thread Filigree Gold",
                "Base Metal": "BIS Hallmarked 22k Gold",
                "Details": "Set of 4 Interlocking Bangles",
                "Weight": "65 Grams Gold Net",
                "Dispatch Care": "Sovereign Registry Included"
            }
        },
        {
            id: "s4",
            category: "saree",
            subcategory: "organza",
            name: "The Madhurika Royal Georgette Saree",
            type: "Handloom Kaddi Georgette",
            price_inr: 178000,
            price_usd: 2150,
            image_url: "assets/saree_ivory.png",
            tag: "New Arrival",
            stock_quantity: 2,
            description: "An exquisite hand-woven georgette saree featuring intricate silver and gold zari work inspired by traditional Madhurika weaves. Hand-loomed with precision and elegance for a modern, fluid drape.",
            specs: {
                "Craftsmanship": "Generational Handloom Curation",
                "Material": "100% Pure Kaddi Georgette Silk",
                "Gold Thread": "Tested Silver Zari dipped in Gold",
                "Weaving Duration": "68 Loom Hours",
                "Origin": "Varanasi, Uttar Pradesh"
            }
        }
    ];

    let seededCount = 0;

    productsToSeed.forEach((p) => {
        db.get('SELECT id FROM products WHERE id = ?', [p.id], (err, row) => {
            if (err) {
                console.error("Error reading products table:", err.message);
                checkClose();
                return;
            }
            if (!row) {
                db.run(`
                    INSERT INTO products (id, category, subcategory, name, type, price_inr, price_usd, image_url, tag, description, specs, stock_quantity)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    p.id,
                    p.category,
                    p.subcategory,
                    p.name,
                    p.type,
                    p.price_inr,
                    p.price_usd,
                    p.image_url,
                    p.tag,
                    p.description,
                    JSON.stringify(p.specs),
                    p.stock_quantity
                ], (err) => {
                    if (err) {
                        console.error(`Error seeding product ${p.name}:`, err.message);
                    } else {
                        console.log(`Product seeded: ${p.name} (${p.id})`);
                    }
                    checkClose();
                });
            } else {
                // Update
                db.run(`
                    UPDATE products
                    SET category=?, subcategory=?, name=?, type=?, price_inr=?, price_usd=?, image_url=?, tag=?, description=?, specs=?, stock_quantity=?
                    WHERE id=?
                `, [
                    p.category,
                    p.subcategory,
                    p.name,
                    p.type,
                    p.price_inr,
                    p.price_usd,
                    p.image_url,
                    p.tag,
                    p.description,
                    JSON.stringify(p.specs),
                    p.stock_quantity,
                    p.id
                ], (err) => {
                    if (err) {
                        console.error(`Error updating product ${p.name}:`, err.message);
                    } else {
                        console.log(`Product updated: ${p.name} (${p.id})`);
                    }
                    checkClose();
                });
            }
        });
    });

    function checkClose() {
        seededCount++;
        if (seededCount === productsToSeed.length) {
            db.close((err) => {
                if (err) {
                    console.error("Error closing database:", err.message);
                } else {
                    console.log("Database initialized and fully seeded successfully.");
                }
            });
        }
    }
}

initDb();
