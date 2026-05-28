import sqlite3
import json
import os
import hashlib

DATABASE = 'yadhee.db'

# Simple secure helper using SHA256 with salt if werkzeug is not installed,
# but we will use standard hashlib for database setup to guarantee compatibility.
def hash_password(password):
    salt = "yadhee_royal_salt_2026"
    db_hash = hashlib.sha256((password + salt).encode('utf-8')).hexdigest()
    return db_hash

def init_db():
    print("Initializing Yadhee Heritage database...")
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()

    # 1. Products Table
    cursor.execute('''
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
            is_active INTEGER DEFAULT 1
        )
    ''')

    # 2. Orders Table
    cursor.execute('''
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
    ''')

    # 3. Order Items Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS order_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id INTEGER NOT NULL,
            product_id TEXT NOT NULL,
            quantity INTEGER NOT NULL,
            price_inr INTEGER NOT NULL,
            price_usd INTEGER NOT NULL,
            FOREIGN KEY (order_id) REFERENCES orders (id)
        )
    ''')

    # 4. Atelier Bookings Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS atelier_bookings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            client_name TEXT NOT NULL,
            client_email TEXT NOT NULL,
            interest_type TEXT NOT NULL,
            message TEXT,
            status TEXT NOT NULL DEFAULT 'Pending',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # 5. Newsletter Subscribers Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS newsletter_subscribers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # 6. Admin Users Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS admin_users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL
        )
    ''')

    conn.commit()
    print("Database tables created successfully.")

    # Seed Admin User
    admin_user = "admin"
    admin_pass = "YadheeRoyal2026!"
    hashed_pass = hash_password(admin_pass)

    cursor.execute('SELECT id FROM admin_users WHERE username = ?', (admin_user,))
    if not cursor.fetchone():
        cursor.execute('INSERT INTO admin_users (username, password_hash) VALUES (?, ?)', (admin_user, hashed_pass))
        print(f"Default admin user created: {admin_user}")
    else:
        print("Admin user already exists.")

    # Seed Products from the existing script.js mock data
    products_to_seed = [
        {
            "id": "s1",
            "category": "saree",
            "subcategory": "kanchipuram",
            "name": "The Crimson Rajkumari Saree",
            "type": "Kanchipuram Silk",
            "price_inr": 245000,
            "price_usd": 2950,
            "image_url": "assets/hero_saree.png",
            "tag": "Royal Bestseller",
            "description": "The ultimate royal bridal centerpiece. Hand-loomed over 3 months using high-density pure Mulberry silk and certified 22-carat gold zari threads. Designed with legendary elephant and temple courtyard patterns on the heavy crimson border. Brings majestic grandeur to any heritage occasion.",
            "specs": {
                "Craftsmanship": "Generational Hand-Loom",
                "Material": "100% Pure Mulberry Silk",
                "Gold Thread": "Certified 22k Gold Zari Weave",
                "Weaving Duration": "95 Loom Hours",
                "Origin": "Kanchipuram, Tamil Nadu"
            }
        },
        {
            "id": "s2",
            "category": "saree",
            "subcategory": "banarasi",
            "name": "Emerald Mayura Brocade",
            "type": "Banarasi Silk",
            "price_inr": 195000,
            "price_usd": 2350,
            "image_url": "assets/saree_green.png",
            "tag": "",
            "description": "A shimmering vision of dark emerald green adorned with rich floral motifs and exquisite hand-embroidered peacock borders. Formulated from premium Banarasi satin-silk, creating an exceptionally fluid drape that catches warm lighting with subtle golden gradients.",
            "specs": {
                "Craftsmanship": "Traditional Brocade Looming",
                "Material": "Banarasi Satin Silk",
                "Gold Thread": "Real Silver Zari dipped in Gold",
                "Weaving Duration": "72 Loom Hours",
                "Origin": "Varanasi, Uttar Pradesh"
            }
        },
        {
            "id": "s3",
            "category": "saree",
            "subcategory": "organza",
            "name": "Swarna Alabaster Zari Saree",
            "type": "Heritage Organza-Silk",
            "price_inr": 220000,
            "price_usd": 2650,
            "image_url": "assets/saree_ivory.png",
            "tag": "",
            "description": "A highly sophisticated visual pairing of pure alabaster ivory organza and deep gold thread work. Delicate, semi-translucent drape engineered with structural silk borders for comfortable, ethereal bridal movements. Adorned with floral vines on the pallu.",
            "specs": {
                "Craftsmanship": "Organza Filigree Looming",
                "Material": "Mulberry Organza Silk Blend",
                "Gold Thread": "Champagne Gold Zari Threads",
                "Weaving Duration": "85 Loom Hours",
                "Origin": "Dharmavaram, Andhra Pradesh"
            }
        },
        {
            "id": "j1",
            "category": "jewel",
            "subcategory": "choker",
            "name": "Mandira Temple Choker Set",
            "type": "Antique Temple Gold",
            "price_inr": 680000,
            "price_usd": 8200,
            "image_url": "assets/hero_jewel.png",
            "tag": "Signature Masterpiece",
            "description": "A heavy, majestic masterpiece sculpted by our chief heritage goldsmith. Employs ancient repoussé craftsmanship to sculpt detailed temple goddess structures out of solid 22k gold, encrusted with brilliant hand-cut uncut diamonds (Polki), crimson rubies, and delicate hanging natural pearls.",
            "specs": {
                "Sculpting Craft": "Hand-Chased Repoussé",
                "Base Metal": "BIS Hallmarked 22k Gold",
                "Gemstones": "Natural Burma Rubies & Polki Diamonds",
                "Weight": "112 Grams Gold Net",
                "Dispatch Care": "Sovereign Certificate Registry"
            }
        },
        {
            "id": "j2",
            "category": "jewel",
            "subcategory": "earrings",
            "name": "Mayura Polki Jhumkas",
            "type": "Heritage 22k Gold",
            "price_inr": 340000,
            "price_usd": 4100,
            "image_url": "assets/jewel_earrings.png",
            "tag": "",
            "description": "Classic double-dome chandelier jhumka earrings featuring intricate filigree gold-work. Encrusted with flat-cut polki diamonds, rubies, and finished with clusters of shimmering natural emerald beads that sway gently with movement.",
            "specs": {
                "Sculpting Craft": "Heritage Jadau Filigree",
                "Base Metal": "BIS Hallmarked 22k Gold",
                "Gemstones": "Flat-Cut Polki Diamonds & Emerald Beads",
                "Weight": "48 Grams Gold Net",
                "Dispatch Care": "Premium Velvet Heirlooms Box"
            }
        },
        {
            "id": "j3",
            "category": "jewel",
            "subcategory": "bangles",
            "name": "Hemlata Filigree Bangles",
            "type": "Gold Filigree Fillets",
            "price_inr": 420000,
            "price_usd": 5050,
            "image_url": "assets/jewel_bangles.png",
            "tag": "",
            "description": "An exquisite stack of four hand-carved heritage gold bangles, engineered with a secure antique lock system. Standard sizing (adjustable via custom request), showing fine detailed gold filigree wires woven into royal peacock crest motifs.",
            "specs": {
                "Sculpting Craft": "Fine Thread Filigree Gold",
                "Base Metal": "BIS Hallmarked 22k Gold",
                "Details": "Set of 4 Interlocking Bangles",
                "Weight": "65 Grams Gold Net",
                "Dispatch Care": "Sovereign Registry Included"
            }
        }
    ]

    for p in products_to_seed:
        cursor.execute('SELECT id FROM products WHERE id = ?', (p["id"],))
        if not cursor.fetchone():
            cursor.execute('''
                INSERT INTO products (id, category, subcategory, name, type, price_inr, price_usd, image_url, tag, description, specs)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                p["id"],
                p["category"],
                p["subcategory"],
                p["name"],
                p["type"],
                p["price_inr"],
                p["price_usd"],
                p["image_url"],
                p["tag"],
                p["description"],
                json.dumps(p["specs"])
            ))
            print(f"Product seeded: {p['name']} ({p['id']})")
        else:
            # Update to ensure data matches
            cursor.execute('''
                UPDATE products
                SET category=?, subcategory=?, name=?, type=?, price_inr=?, price_usd=?, image_url=?, tag=?, description=?, specs=?
                WHERE id=?
            ''', (
                p["category"],
                p["subcategory"],
                p["name"],
                p["type"],
                p["price_inr"],
                p["price_usd"],
                p["image_url"],
                p["tag"],
                p["description"],
                json.dumps(p["specs"]),
                p["id"]
            ))

    conn.commit()
    conn.close()
    print("Database seeding completed.")

if __name__ == '__main__':
    init_db()
