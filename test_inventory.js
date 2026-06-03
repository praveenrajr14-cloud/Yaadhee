const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const assert = require('assert');
const http = require('http');

const DB_PATH = path.join(__dirname, 'yadhee.db');

// Helper to perform HTTP POST requests
function postRequest(url, body) {
    return new Promise((resolve, reject) => {
        const parsedUrl = new URL(url);
        const options = {
            hostname: parsedUrl.hostname,
            port: parsedUrl.port,
            path: parsedUrl.pathname,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(JSON.stringify(body))
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode,
                    body: JSON.parse(data || '{}')
                });
            });
        });

        req.on('error', err => reject(err));
        req.write(JSON.stringify(body));
        req.end();
    });
}

function runTests() {
    console.log("=================================================");
    console.log(" Running Yadhee Inventory System Assertions... ");
    console.log("=================================================\n");

    const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READWRITE, (err) => {
        if (err) {
            console.error("❌ Failed to connect to database:", err.message);
            process.exit(1);
        }
    });

    db.serialize(() => {
        // Assert seeded stocks are correct
        console.log("Assertion 1: Validating initial seeded stock levels...");
        db.all("SELECT id, name, stock_quantity FROM products", [], async (err, products) => {
            assert.ifError(err);
            
            const s1 = products.find(p => p.id === 's1');
            const j1 = products.find(p => p.id === 'j1');
            const j3 = products.find(p => p.id === 'j3');

            console.log(`- Product s1 (Saree) Stock: ${s1.stock_quantity}`);
            console.log(`- Product j1 (Choker) Stock: ${j1.stock_quantity}`);
            console.log(`- Product j3 (Bangles) Stock: ${j3.stock_quantity}`);

            assert.strictEqual(s1.stock_quantity, 3, "s1 stock should be 3!");
            assert.strictEqual(j1.stock_quantity, 1, "j1 stock should be 1!");
            assert.strictEqual(j3.stock_quantity, 2, "j3 stock should be 2!");
            console.log("✅ Seeded stock levels assert successfully.");

            // Start verification server briefly or simulate API
            // Since we know the server might be running, let's run API checks on localhost:3000
            console.log("\nAssertion 2: Testing stock limit protection on checkout...");
            
            // Check out payload requesting more than available stock (4 units of s1, we only have 3!)
            const invalidPayload = {
                name: "Lady Aditi",
                email: "aditi@royal.com",
                phone: "+91 99999 88888",
                address: "Peacock Chambers, Imperial Palace, Jaipur",
                cart: [{ id: "s1", qty: 4 }], // Exceeds available stock (3)
                totalINR: 980000,
                totalUSD: 11800
            };

            try {
                const response = await postRequest('http://localhost:3000/api/checkout', invalidPayload);
                console.log(`- Checkout Exceeded Response Code: ${response.statusCode}`);
                console.log(`- Response Error message: "${response.body.error}"`);
                
                assert.strictEqual(response.statusCode, 400, "Should return 400 Bad Request!");
                assert.ok(response.body.error.includes("Insufficient stock in vault"), "Error message should warn about stock levels!");
                console.log("✅ Overselling check successfully blocked.");

                // Now test successful checkout within limits (1 unit of s1)
                console.log("\nAssertion 3: Testing checkout fulfillment stock deduction...");
                const validPayload = {
                    name: "Lord Vikram",
                    email: "vikram@royal.com",
                    phone: "+91 88888 77777",
                    address: "Viceroy Chambers, City Palace, Udaipur",
                    cart: [{ id: "s1", qty: 1 }], // Within stock limits (3)
                    totalINR: 245000,
                    totalUSD: 2950
                };

                const successRes = await postRequest('http://localhost:3000/api/checkout', validPayload);
                console.log(`- Checkout Successful Response Code: ${successRes.statusCode}`);
                console.log(`- Assigned Order ID: #${successRes.body.orderId}`);
                
                assert.strictEqual(successRes.statusCode, 200, "Should return 200 OK!");
                assert.ok(successRes.body.success, "Should return success true!");
                console.log("✅ Checkout transaction logged successfully.");

                // Query stock again to verify decrement occurred
                console.log("\nAssertion 4: Verifying stock level decremented in database...");
                setTimeout(() => {
                    const checkDb = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READONLY, (checkErr) => {
                        if (checkErr) {
                            console.error(checkErr);
                            process.exit(1);
                        }
                        checkDb.get("SELECT stock_quantity FROM products WHERE id = 's1'", [], (err, row) => {
                            checkDb.close();
                            assert.ifError(err);
                            console.log(`- Updated s1 Stock Level in DB: ${row.stock_quantity} (Expected: 2)`);
                            assert.strictEqual(row.stock_quantity, 2, "s1 stock should have decremented from 3 to 2!");
                            console.log("✅ Inventory level successfully decremented.");

                            console.log("\n=================================================");
                            console.log(" 🎉 All Inventory System Assertions Passed! ");
                            console.log("=================================================");
                            db.close();
                        });
                    });
                }, 1000);

            } catch (err) {
                console.error("❌ API assertions failed because server is offline or connection refused!");
                console.error("Ensure the server is running on http://localhost:3000 before executing assertions.");
                db.close();
            }
        });
    });
}

runTests();
