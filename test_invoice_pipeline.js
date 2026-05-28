const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const assert = require('assert');
const http = require('http');
const fs = require('fs');

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
    console.log(" Running Yadhee Invoice Pipeline Assertions... ");
    console.log("=================================================\n");

    const validPayload = {
        name: "Maharani Gayatri Devi",
        email: "gayatridevi@royal.com",
        phone: "+91 91111 22222",
        address: "Lilly Pool Chambers, Rambagh Palace, Jaipur",
        cart: [
            { id: "s1", qty: 1 }, // Crimson Rajkumari Saree - ₹245,000
            { id: "j2", qty: 1 }  // Mayura Polki Jhumkas - ₹340,000
        ],
        totalINR: 585000,
        totalUSD: 7050
    };

    console.log("Assertion 1: Simulating successful customer checkout transaction...");
    postRequest('http://localhost:3000/api/checkout', validPayload)
        .then(async (response) => {
            console.log(`- Checkout Response Code: ${response.statusCode}`);
            console.log(`- Response success: ${response.body.success}`);
            console.log(`- Assigned Order ID: #${response.body.orderId}`);

            assert.strictEqual(response.statusCode, 200, "Should return 200 OK!");
            assert.strictEqual(response.body.success, true, "Should return success: true!");
            const orderId = response.body.orderId;
            
            console.log("\nWaiting 3 seconds for asynchronous document & email pipeline to complete...");
            await new Promise(r => setTimeout(r, 3000));

            const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READONLY, (err) => {
                if (err) {
                    console.error("❌ Failed to connect to database:", err.message);
                    process.exit(1);
                }
            });

            console.log("\nAssertion 2: Verifying database order contains secure invoice path...");
            db.get("SELECT invoice_path, customer_name FROM orders WHERE id = ?", [orderId], (err, row) => {
                assert.ifError(err);
                console.log(`- Database customer: ${row.customer_name}`);
                console.log(`- Database invoice path: ${row.invoice_path}`);
                
                assert.ok(row.invoice_path, "invoice_path should not be empty!");
                assert.ok(row.invoice_path.includes(`invoice-${orderId}.pdf`), "invoice_path should match invoice naming format!");
                console.log("✅ Database invoice reference verified successfully.");

                console.log("\nAssertion 3: Verifying PDF invoice file exists on disk and is valid...");
                const absolutePdfPath = path.join(__dirname, row.invoice_path);
                const fileExists = fs.existsSync(absolutePdfPath);
                console.log(`- PDF Invoice file location: ${absolutePdfPath}`);
                console.log(`- File exists on disk: ${fileExists}`);
                
                assert.ok(fileExists, "PDF Invoice file should physically exist!");
                const stats = fs.statSync(absolutePdfPath);
                console.log(`- File size: ${stats.size} bytes`);
                assert.ok(stats.size > 500, "PDF Invoice should not be empty!");

                // Read binary header to check PDF signature
                const buffer = Buffer.alloc(4);
                const fd = fs.openSync(absolutePdfPath, 'r');
                fs.readSync(fd, buffer, 0, 4, 0);
                fs.closeSync(fd);
                const isPdf = buffer.toString() === '%PDF';
                console.log(`- Valid PDF Magic Signature (%PDF): ${isPdf}`);
                assert.ok(isPdf, "File header should match PDF magic signature!");
                console.log("✅ PDF invoice structure validated successfully.");

                console.log("\nAssertion 4: Verifying HTML visual log email exists on disk...");
                const expectedEmailPath = path.join(__dirname, 'assets', 'emails', `email-${orderId}.html`);
                const emailExists = fs.existsSync(expectedEmailPath);
                console.log(`- HTML email visualizer location: ${expectedEmailPath}`);
                console.log(`- Email file exists: ${emailExists}`);
                
                assert.ok(emailExists, "HTML email visualization file should exist!");
                const emailStats = fs.statSync(expectedEmailPath);
                assert.ok(emailStats.size > 100, "HTML email should contain readable logs!");
                console.log("✅ Visual email logs validated successfully.");

                console.log("\n=================================================");
                console.log(" 🎉 All Document & Email assertions passed! ");
                console.log("=================================================");
                db.close();
                process.exit(0);
            });
        })
        .catch((err) => {
            console.error("\n❌ API assertions failed because server is offline or connection was refused!");
            console.error("Please make sure the server is booted up on http://localhost:3000 before running this test script.");
            process.exit(1);
        });
}

runTests();
