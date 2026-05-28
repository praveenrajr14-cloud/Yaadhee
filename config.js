/* -------------------------------------------------------------
   YADHEE HERITAGE CONFIGURATIONS
   ------------------------------------------------------------- */

module.exports = {
    // Target WhatsApp Phone Number (with country code, no symbols)
    WHATSAPP_PHONE: process.env.WHATSAPP_PHONE || "919999988888",

    // Configurable Inventory Alert Threshold (products with stock below this get flagged)
    LOW_STOCK_THRESHOLD: parseInt(process.env.LOW_STOCK_THRESHOLD) || 3
};
