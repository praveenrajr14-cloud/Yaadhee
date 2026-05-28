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

function getStockLevel(productId) {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READONLY, (err) => {
            if (err) return reject(err);
        });
        db.get("SELECT stock_quantity FROM products WHERE id = ?", [productId], (err, row) => {
            db.close();
            if (err) return reject(err);
            resolve(row ? row.stock_quantity : null);
        });
    });
}

async function runTests() {
    console.log("=================================================");
    console.log(" Running Yadhee Mock Payment Assertions... ");
    console.log("=================================================\n");

    const failPayload = {
        name: "Lady Maya",
        email: "maya@royal.com",
        phone: "+91 95555 66666",
        address: "Mirror Pavilion, City Palace, Jaipur",
        cart: [{ id: "j3", qty: 1 }], // Hemlata Filigree Bangles (Initial stock: 2)
        totalINR: 420000,
        totalUSD: 5050,
        paymentForceOutcome: "failure" // Forced Failure!
    };

    try {
        const initialStock = await getStockLevel("j3");
        console.log(`Initial stock for j3 before tests: ${initialStock}`);

        // --- TEST 1: Payment Gateway Forced FAILURE ---
        console.log("\nAssertion 1: Testing payment gateway forced FAILURE outcome...");
        const failResponse = await postRequest('http://localhost:3000/api/checkout', failPayload);
        
        console.log(`- Checkout Fail Code: ${failResponse.statusCode}`);
        console.log(`- Response Error: "${failResponse.body.error}"`);

        assert.strictEqual(failResponse.statusCode, 402, "Should return 402 Payment Required on failure!");
        assert.ok(failResponse.body.error.includes("Payment Authorization Failure"), "Should return credit decline message!");

        // Verify stock level remains exactly unchanged
        const stockAfterFail = await getStockLevel("j3");
        console.log(`- Stock level after decline: ${stockAfterFail} (Expected: ${initialStock})`);
        assert.strictEqual(stockAfterFail, initialStock, "Stock level must NOT decrement on payment failure!");
        console.log("✅ Payment failure safely aborted without touching catalog stock.");


        // --- TEST 2: Payment Gateway Forced SUCCESS ---
        console.log("\nAssertion 2: Testing payment gateway forced SUCCESS outcome...");
        const successPayload = {
            ...failPayload,
            paymentForceOutcome: "success" // Forced Success!
        };

        const successResponse = await postRequest('http://localhost:3000/api/checkout', successPayload);
        console.log(`- Checkout Success Code: ${successResponse.statusCode}`);
        console.log(`- Response success: ${successResponse.body.success}`);
        console.log(`- Assigned Order ID: #${successResponse.body.orderId}`);

        assert.strictEqual(successResponse.statusCode, 200, "Should return 200 OK!");
        assert.strictEqual(successResponse.body.success, true, "Should return success true!");
        
        const orderId = successResponse.body.orderId;

        console.log("\nWaiting 3 seconds for asynchronous document & email pipeline to complete...");
        await new Promise(r => setTimeout(r, 3000));

        // Verify stock level decremented
        const stockAfterSuccess = await getStockLevel("j3");
        console.log(`- Stock level after success: ${stockAfterSuccess} (Expected: ${initialStock - 1})`);
        assert.strictEqual(stockAfterSuccess, initialStock - 1, "Stock level must decrement by 1 on payment success!");
        console.log("✅ Stock level successfully decremented.");

        // Verify PDF invoice compiled
        const expectedPdfPath = path.join(__dirname, "assets", "invoices", `invoice-${orderId}.pdf`);
        const pdfExists = fs.existsSync(expectedPdfPath);
        console.log(`- PDF Invoice exists on disk: ${pdfExists}`);
        assert.ok(pdfExists, "PDF Invoice should be generated upon payment success!");
        console.log("✅ Professional PDF invoice generated successfully.");

        console.log("\n=================================================");
        console.log(" 🎉 All Payment Gateway Assertions Passed! ");
        console.log("=================================================");
        process.exit(0);

    } catch (err) {
        console.error("\n❌ Mock Payment assertions failed!");
        console.error(err);
        process.exit(1);
    }
}

runTests();
