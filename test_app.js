const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const assert = require('assert');

const DB_PATH = path.join(__dirname, 'yadhee.db');

function runTests() {
    console.log("Running Yadhee Full-Stack Verification tests...");
    console.log(`Target database: ${DB_PATH}`);

    const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READWRITE, (err) => {
        if (err) {
            console.error("❌ Failed to connect to database:", err.message);
            process.exit(1);
        }
    });

    db.serialize(() => {
        // Test 1: Verify tables exist
        console.log("\nTest 1: Verifying tables existence...");
        db.all("SELECT name FROM sqlite_master WHERE type='table'", [], (err, tables) => {
            assert.ifError(err);
            const tableNames = tables.map(t => t.name);
            console.log("Found tables:", tableNames);
            
            const expectedTables = ['products', 'orders', 'order_items', 'atelier_bookings', 'newsletter_subscribers', 'admin_users'];
            expectedTables.forEach(t => {
                assert.ok(tableNames.includes(t), `Table ${t} is missing!`);
            });
            console.log("✅ All required database tables exist.");
        });

        // Test 2: Verify seeded products
        console.log("\nTest 2: Verifying seeded products...");
        db.all("SELECT * FROM products WHERE is_active = 1", [], (err, products) => {
            assert.ifError(err);
            console.log(`Seeded active products count: ${products.length}`);
            assert.strictEqual(products.length, 6, "Seeded product count should be 6!");
            
            // Check properties of s1
            const s1 = products.find(p => p.id === 's1');
            assert.ok(s1, "Product s1 (Crimson Rajkumari) is missing!");
            assert.strictEqual(s1.category, 'saree');
            assert.strictEqual(s1.price_inr, 245000);
            
            // Verify specs are JSON formatted
            const specsObj = JSON.parse(s1.specs);
            assert.strictEqual(specsObj.Origin, 'Kanchipuram, Tamil Nadu');
            console.log("✅ Seeded products match expectations.");
        });

        // Test 3: Verify admin user
        console.log("\nTest 3: Verifying admin user...");
        db.get("SELECT * FROM admin_users WHERE username = 'admin'", [], (err, admin) => {
            assert.ifError(err);
            assert.ok(admin, "Admin user 'admin' is missing!");
            assert.ok(admin.password_hash, "Admin hash is missing!");
            console.log("✅ Admin credentials populated.");
        });
    });

    setTimeout(() => {
        db.close((err) => {
            if (err) {
                console.error("❌ Failed to close database:", err.message);
            } else {
                console.log("\n🎉 All database tests passed successfully!");
            }
        });
    }, 1500);
}

runTests();
