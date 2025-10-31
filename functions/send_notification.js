// functions/send_notification.js
const db = require("../services/db");
const admin = require("firebase-admin");

// ✅ Load service account JSON from Netlify env
const serviceAccount = JSON.parse(process.env.FCM_SERVICE_ACCOUNT || "{}");

// ✅ Initialize Firebase Admin SDK once
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

function reply(success, obj = {}) {
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ success, ...obj }),
  };
}

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Method Not Allowed" };
    }

    const { agentEmail } = JSON.parse(event.body || "{}");
    if (!agentEmail) {
      return reply(false, { error: "Missing agentEmail" });
    }

    // 1️⃣ Get the agent by email
    const agentRes = await db.query(
      "SELECT id, name FROM agents WHERE email = $1 LIMIT 1",
      [agentEmail]
    );
    if (!agentRes.rows.length) {
      return reply(false, { error: "Agent not found" });
    }
    const agent = agentRes.rows[0];

    // 2️⃣ Get all users tied to that agent
    const usersRes = await db.query(
      "SELECT id FROM users WHERE agent_id = $1",
      [agent.id]
    );
    if (!usersRes.rows.length) {
      return reply(false, { error: "No users registered for this agent" });
    }
    const userIds = usersRes.rows.map((u) => u.id);

    // 3️⃣ Get devices for those users
    const devicesRes = await db.query(
      `SELECT device_token 
       FROM user_devices 
       WHERE user_id = ANY($1::int[]) 
       AND device_token IS NOT NULL`,
      [userIds]
    );
    if (!devicesRes.rows.length) {
      return reply(false, { error: "No registered devices for these users" });
    }
    const deviceTokens = devicesRes.rows.map((d) => d.device_token);

    // 4️⃣ Hardcoded push notification payload
    const message = {
      notification: {
        title: `Message from ${agent.name || "Your Agent"}`,
        body: "⏰ Time to send your information to your agent!",
      },
      tokens: deviceTokens,
      data: {
        click_action: "FLUTTER_NOTIFICATION_CLICK",
        route: "/authorization_form", // ✅ always routes user to HIPAA form
      },
    };

    const response = await admin.messaging().sendMulticast(message);

    return reply(true, {
      message: "Notification sent ✅",
      successCount: response.successCount,
      failureCount: response.failureCount,
    });
  } catch (err) {
    console.error("❌ send_notification error:", err);
    return reply(false, { error: "Server error: " + err.message });
  }
};
