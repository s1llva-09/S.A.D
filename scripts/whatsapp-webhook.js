(() => {
    const WEBHOOK_URL =
        window.PETRA_WHATSAPP_WEBHOOK_URL ||
        window.SAD_WHATSAPP_WEBHOOK_URL ||
        "https://kailane.app.n8n.cloud/webhook/b30814bd-010d-4197-9508-0a4a9f417435-envia-resposta";

    function normalizePhone(value) {
        return String(value || "").replace(/\D/g, "");
    }

    async function sendMessage(payload) {
        if (!WEBHOOK_URL) {
            throw new Error("Configure a URL do webhook do WhatsApp em `window.PETRA_WHATSAPP_WEBHOOK_URL`.");
        }

        const response = await fetch(WEBHOOK_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        });

        const rawText = await response.text();
        let parsedData = null;

        try {
            parsedData = rawText ? JSON.parse(rawText) : null;
        } catch (error) {
            parsedData = rawText || null;
        }

        if (!response.ok) {
            const errorMessage =
                parsedData?.message ||
                parsedData?.error ||
                `Webhook retornou ${response.status}.`;
            throw new Error(errorMessage);
        }

        return parsedData;
    }

    const webhookApi = {
        normalizePhone,
        sendMessage,
        hasConfig() {
            return Boolean(WEBHOOK_URL);
        },
    };

    window.petraWhatsAppWebhook = webhookApi;
    window.sadWhatsAppWebhook = webhookApi;
})();
