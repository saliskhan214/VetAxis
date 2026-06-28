import express from "express";
import path from "path";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";

// Simple in-memory storage to track active payment sessions in sandbox mode
interface PaymentSession {
  token: string;
  userId: string;
  planId: string;
  price: number;
  status: "pending" | "completed" | "failed";
  createdAt: number;
}

const activeSessions: Record<string, PaymentSession> = {};

// Use the environment variable or a safe fallback secret for Sandbox testing
const SAFE_PAY_WEBHOOK_SECRET = process.env.SAFE_PAY_WEBHOOK_SECRET || "sandbox_secret_key_123456";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Crucial: Use express.json() but preserve raw body for webhook verification if needed
  app.use(express.json({
    verify: (req: any, res, buf) => {
      req.rawBody = buf;
    }
  }));

  // CORS headers
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, X-SFPY-SIGNATURE");
    res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });

  // ─────────────────────────────────────────────────────────────────
  // PAYMENT API ENDPOINTS
  // ─────────────────────────────────────────────────────────────────

  // Healthcheck
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", mode: "full-stack" });
  });

  // 1. Create Checkout Session (Frontend to Backend)
  app.post("/api/payments/create-session", (req, res) => {
    const { userId, planId, price } = req.body;

    if (!userId || !planId || !price) {
      return res.status(400).json({ error: "Missing required fields: userId, planId, price" });
    }

    // Generate a secure transaction token
    const token = "va_track_" + crypto.randomBytes(16).toString("hex");

    // Store in active sessions memory
    activeSessions[token] = {
      token,
      userId,
      planId,
      price,
      status: "pending",
      createdAt: Date.now()
    };

    // Calculate simulated checkout URL
    const baseUrl = process.env.APP_URL || `http://localhost:${PORT}`;
    const checkoutUrl = `${baseUrl}/checkout?token=${token}`;

    console.log(`[Payment] Session created for User: ${userId}, Plan: ${planId}, Token: ${token}`);

    res.json({
      success: true,
      token,
      checkoutUrl,
      amount: price,
      currency: "PKR"
    });
  });

  // 2. Retrieve Payment Session Details (Used by Checkout Page & Callback Verification)
  app.get("/api/payments/session/:token", (req, res) => {
    const { token } = req.params;
    const session = activeSessions[token];

    if (!session) {
      return res.status(404).json({ error: "Payment session not found" });
    }

    res.json(session);
  });

  // 3. Simulated Payment Execution (Invoked by Checkout UI to model real-time gateways)
  app.post("/api/payments/execute", (req, res) => {
    const { token, paymentMethod, mobileNumber } = req.body;
    const session = activeSessions[token];

    if (!session) {
      return res.status(404).json({ error: "Payment session not found" });
    }

    if (session.status !== "pending") {
      return res.status(400).json({ error: "This transaction has already been processed" });
    }

    // Update status to completed
    session.status = "completed";

    // ───────────────────────────────────────────────────────────────
    // WEBHOOK SIMULATION (Modeling Step 4 & 5)
    // ───────────────────────────────────────────────────────────────
    // Build the webhook payload exactly like a real payment gateway (e.g. Safepay or Rapid)
    const webhookPayload = {
      event: "payment.completed",
      timestamp: Date.now(),
      data: {
        token: session.token,
        amount: session.price,
        currency: "PKR",
        status: "success",
        payment_method: paymentMethod || "card",
        customer_phone: mobileNumber || "",
        metadata: {
          userId: session.userId,
          planId: session.planId
        }
      }
    };

    // Compute HMAC-SHA256 signature using our shared Webhook Secret
    const signature = crypto
      .createHmac("sha256", SAFE_PAY_WEBHOOK_SECRET)
      .update(JSON.stringify(webhookPayload))
      .digest("hex");

    // In a real gateway, this webhook is triggered via a background POST request.
    // We will execute a background POST call to our own webhook handler to fully exercise
    // the security signature validation pipeline!
    const baseUrl = process.env.APP_URL || `http://localhost:${PORT}`;
    
    // Call our webhook route internally/externally
    fetch(`${baseUrl}/api/payments/webhook`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-SFPY-SIGNATURE": signature
      },
      body: JSON.stringify(webhookPayload)
    })
    .then(async (webhookRes) => {
      const responseText = await webhookRes.text();
      console.log(`[Webhook Background Callback] Handled: Status ${webhookRes.status}, Response: "${responseText}"`);
    })
    .catch((err) => {
      console.error("[Webhook Background Callback] Failed to dispatch webhook:", err);
    });

    res.json({
      success: true,
      message: "Payment authorized successfully",
      token: session.token,
      redirectUrl: `${baseUrl}/payment-callback?token=${session.token}&status=success`
    });
  });

  // 4. Secure Webhook Listener (Step 4 & 5 - Real Payment Gateway Verification Endpoint)
  app.post("/api/payments/webhook", (req: any, res) => {
    const signatureHeader = req.headers["x-sfpy-signature"];
    const payload = req.body;

    if (!signatureHeader) {
      console.warn("[Webhook Security Alert] Received webhook with missing X-SFPY-SIGNATURE header.");
      return res.status(401).json({ error: "Missing signature header" });
    }

    // Secure Verification: Recompute HMAC-SHA256 signature over the raw body or payload
    const stringifiedPayload = typeof payload === "string" ? payload : JSON.stringify(payload);
    const expectedSignature = crypto
      .createHmac("sha256", SAFE_PAY_WEBHOOK_SECRET)
      .update(stringifiedPayload)
      .digest("hex");

    // Constant-time comparison to prevent timing attacks
    const sigBuffer = Buffer.from(signatureHeader, "utf-8");
    const expectedBuffer = Buffer.from(expectedSignature, "utf-8");

    let isValid = false;
    if (sigBuffer.length === expectedBuffer.length) {
      isValid = crypto.timingSafeEqual(sigBuffer, expectedBuffer);
    }

    if (!isValid) {
      console.error("[Webhook Security Alert] Signature mismatch! Hook call rejected.");
      return res.status(403).json({ error: "Invalid signature" });
    }

    // Success! Read event type
    const eventType = payload.event;
    if (eventType === "payment.completed" && payload.data?.status === "success") {
      const { token, metadata } = payload.data;
      console.log(`[Webhook Security Success] Signature Verified! Payment completed for token ${token}. User ID: ${metadata?.userId}, Plan: ${metadata?.planId}`);
      
      // In a live system, you would execute the DB write here. E.g.:
      // await db.collection('users').doc(metadata.userId).update({ subscriptionTier: metadata.planId, subscriptionExpiresAt: ... })
      
      return res.status(200).send("Webhook received and premium privileges granted successfully.");
    }

    res.status(400).send("Event not handled or incomplete transaction.");
  });

  // ─────────────────────────────────────────────────────────────────
  // VITE DEVELOPMENT MIDDLEWARE OR STATIC PRODUCTION ASSETS
  // ─────────────────────────────────────────────────────────────────
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[VetAxis Backend] Full-stack Server listening on http://localhost:${PORT}`);
  });
}

startServer();
