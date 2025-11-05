// functions/send_notification.js
const db = require("../services/db");
const admin = require("firebase-admin");

// Firebase Credentials from Netlify ENV
const serviceAccount = JSON.parse(process.env.FCM_SERVICE_ACCOUNT || "{}");

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
      return reply(false, { error: "Method Not Allowed" });
    }

    const { agentEmail } = JSON.parse(event.body || "{}");
    if (!agentEmail) return reply(false, { error: "Missing agentEmail" });

    // 1️⃣ Get agent record
    const agentRes = await db.query(
      `SELECT id, name FROM agents WHERE LOWER(email) = LOWER($1) LIMIT 1`,
      [agentEmail]
    );
    if (!agentRes.rows.length) return reply(false, { error: "Agent not found" });
    const agent = agentRes.rows[0];

    // 2️⃣ Determine Medicare processing year
    const now = new Date();
    const currentYear = now.getFullYear();
    const cycleYear = (now.getMonth() + 1) <= 3 ? currentYear - 1 : currentYear;

    // 3️⃣ Reset users who haven't submitted for this year's cycle
    await db.query(
      `UPDATE users
       SET status = 'not_started'
       WHERE agent_id = $1
       AND (last_review_year IS NULL OR last_review_year < $2)`,
      [agent.id, cycleYear]
    );

    // 4️⃣ Select only users who have NOT submitted this year
    const usersRes = await db.query(
      `SELECT id FROM users
       WHERE agent_id = $1
       AND status = 'not_started'`,
      [agent.id]
    );

    if (!usersRes.rows.length) {
      return reply(true, { message: "✅ Everyone is already completed for this cycle!" });
    }

    const userIds = usersRes.rows.map((u) => u.id);

    // 5️⃣ Fetch tokens for those users
    const devicesRes = await db.query(
      `SELECT device_token
       FROM user_devices
       WHERE user_id = ANY($1::int[])
       AND device_token IS NOT NULL`,
      [userIds]
    );

    if (!devicesRes.rows.length) {
      return reply(false, { error: "No registered devices to notify" });
    }

    const deviceTokens = devicesRes.rows.map((d) => d.device_token);

    // 6️⃣ Build notification
    const message = {
      notification: {
        title: `Message from ${agent.name || "Your Agent"}`,
        body: "⏰ Time to send your Medicare information!",
      },
      tokens: deviceTokens,
      data: {
        click_action: "FLUTTER_NOTIFICATION_CLICK",
        route: "/authorization_form",
      },
    };

    // 7️⃣ Send it
    const response = await admin.messaging().sendEachForMulticast(message);

    return reply(true, {
      message: "✅ Notifications sent",
      usersContacted: userIds.length,
      successCount: response.successCount,
      failureCount: response.failureCount,
    });

  } catch (err) {
    console.error("❌ send_notification error:", err);
    return reply(false, { error: "Server error: " + err.message });
  }
};
