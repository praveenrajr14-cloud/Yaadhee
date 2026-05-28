/* -------------------------------------------------------------
   YADHEE HERITAGE - SMART MARKETING RECOVERY INTEGRATION TESTS
   ------------------------------------------------------------- */

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

function getAbandonedCartRecord(email) {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READONLY, (err) => {
            if (err) return reject(err);
        });
        db.get("SELECT * FROM abandoned_carts WHERE customer_email = ? AND recovered != 2 ORDER BY id DESC LIMIT 1", [email], (err, row) => {
            db.close();
            if (err) return reject(err);
            resolve(row);
        });
    });
}

async function runTests() {
    console.log("=================================================");
    console.log(" Running Yadhee Marketing Recovery Assertions... ");
    console.log("=================================================\n");

    const email = "abandoned_patron@heritage.com";
    const syncPayload = {
        name: "Lady Anjali",
        email: email,
        phone: "+91 97777 66666",
        address: "Golden Wing, Maharaja Chambers, Udaipur",
        cart: [{ id: "s1", qty: 1, name: "The Crimson Rajkumari Saree" }],
        totalINR: 245000,
        totalUSD: 2950
    };

    try {
        // --- TEST 1: Real-time background Abandoned Cart sync POST ---
        console.log("Assertion 1: Testing real-time abandoned cart synchronization...");
        const syncResponse = await postRequest('http://localhost:3000/api/abandoned-cart', syncPayload);
        
        console.log(`- Sync Response Code: ${syncResponse.statusCode}`);
        console.log(`- Sync Success: ${syncResponse.body.success}`);
        console.log(`- Assigned Draft Cart ID: #${syncResponse.body.id}`);

        assert.strictEqual(syncResponse.statusCode, 200, "Sync endpoint should return 200 OK!");
        assert.strictEqual(syncResponse.body.success, true, "Sync response success flag should be true!");

        const draftCartId = syncResponse.body.id;

        // Verify active cart exists in database
        const dbRecord = await getAbandonedCartRecord(email);
        console.log(`- DB record verified: customer is ${dbRecord.customer_name}, recovered state is ${dbRecord.recovered}`);
        assert.ok(dbRecord, "Abandoned cart record must exist in DB!");
        assert.strictEqual(dbRecord.customer_name, "Lady Anjali", "Record customer name should match payload!");
        assert.strictEqual(dbRecord.recovered, 0, "Initial recovered state must be 0 (Abandoned)!");
        console.log("✅ Background abandoned cart synced and logged successfully.");

        // --- TEST 2: simulated marketing recovery follow-up ---
        console.log("\nAssertion 2: Simulating 10% discount recovery email dispatch...");
        
        // Wait briefly for file system sync
        await new Promise(r => setTimeout(r, 500));

        // To call checkAdminAuth protected route, we'll simulate the POST directly since we are testing backend logic.
        // Wait, checkAdminAuth is protected. Let's see if we can trigger the POST. 
        // Oh, checkAdminAuth requires req.session.isAdmin to be true. In a programmatic HTTP request, we don't have session cookies active.
        // But we can test it programmatically by running direct database updates and email generation via requiring config, or we can see if we bypass checkAdminAuth.
        // Since we are validating server logic, let's look at how we can authenticate.
        // In Express, we can log in by POSTing to /admin/login to get a session cookie, and passing it in headers!
        // Yes, let's login programmatically to get the cookie!
        console.log("Logging in programmatically to secure session cookies...");
        const loginPayload = "username=admin&password=YadheeRoyal2026!";
        const parsedUrl = new URL('http://localhost:3000/admin/login');
        const loginOptions = {
            hostname: parsedUrl.hostname,
            port: parsedUrl.port,
            path: parsedUrl.pathname,
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(loginPayload)
            }
        };

        const cookiePromise = new Promise((resolve, reject) => {
            const req = http.request(loginOptions, (res) => {
                const cookies = res.headers['set-cookie'] || [];
                resolve(cookies.map(c => c.split(';')[0]).join('; '));
            });
            req.on('error', err => reject(err));
            req.write(loginPayload);
            req.end();
        });

        const authCookie = await cookiePromise;
        console.log(`- Secured Admin auth session cookie: ${authCookie ? "SUCCESS" : "FAILED"}`);
        assert.ok(authCookie, "Must obtain authenticated session cookies!");

        // Now dispatch POST recovery with session cookies!
        console.log("\nAssertion 3: Dispatching recovery action with auth session...");
        const recoverOptions = {
            hostname: 'localhost',
            port: 3000,
            path: `/api/admin/abandoned-cart/recover/${draftCartId}`,
            method: 'POST',
            headers: {
                'Cookie': authCookie
            }
        };

        const recoverPromise = new Promise((resolve, reject) => {
            const req = http.request(recoverOptions, (res) => {
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
            req.end();
        });

        const recoverRes = await recoverPromise;
        console.log(`- Recovery Response Code: ${recoverRes.statusCode}`);
        console.log(`- Recovery Local Path: ${recoverRes.body.localPath}`);
        
        assert.strictEqual(recoverRes.statusCode, 200, "Recovery endpoint should return 200 OK!");
        assert.ok(recoverRes.body.success, "Recovery success flag should be true!");

        // Verify recovered state is updated to 1
        const updatedRecord = await getAbandonedCartRecord(email);
        console.log(`- DB record state after recovery: ${updatedRecord.recovered} (Expected: 1)`);
        assert.strictEqual(updatedRecord.recovered, 1, "Recovered state must be updated to 1 (Discount Sent)!");
        console.log("✅ DB recovery state successfully updated.");

        // Verify HTML visual email log is written to assets/emails/
        const expectedEmailPath = path.join(__dirname, "assets", "emails", `recovery-${draftCartId}.html`);
        const emailExists = fs.existsSync(expectedEmailPath);
        console.log(`- HTML recovery email log exists: ${emailExists}`);
        assert.ok(emailExists, "Recovery HTML email log must be created on disk!");
        
        const emailContent = fs.readFileSync(expectedEmailPath, 'utf-8');
        assert.ok(emailContent.includes("YADHEE10"), "Follow-up email must include discount code YADHEE10!");
        console.log("✅ Visual follow-up email logs successfully compiled and validated.");

        console.log("\n=================================================");
        console.log(" 🎉 All Smart Marketing Assertions Passed! ");
        console.log("=================================================");
        process.exit(0);

    } catch (err) {
        console.error("\n❌ Marketing Recovery assertions failed!");
        console.error(err);
        process.exit(1);
    }
}

runTests();
