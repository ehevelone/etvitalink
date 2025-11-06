// functions/send_notification.js
const db = require("../services/db");
const admin = require("firebase-admin");

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

    // ✅ Get agent info
    const agentRes = await db.query(
      `SELECT id, name
       FROM public.agents
       WHERE LOWER(email) = LOWER($1)
       LIMIT 1`,
      [agentEmail]
    );

    if (!agentRes.rows.length) {
      return reply(false, { error: "Agent not found" });
    }
    const agent = agentRes.rows[0];

    // ✅ Get all users linked to this agent
    const usersRes = await db.query(
      `SELECT id FROM public.users WHERE agent_id = $1`,
      [agent.id]
    );

    if (!usersRes.rows.length) {
      return reply(false, { error: "No users linked to this agent" });
    }

    const userIds = usersRes.rows.map(u => u.id);

    // ✅ Get device tokens for these users
    const devicesRes = await db.query(
      `SELECT device_token
       FROM public.user_devices
       WHERE user_id = ANY($1::int[])
       AND device_token IS NOT NULL`,
      [userIds]
    );

    if (!devicesRes.rows.length) {
      return reply(false, { error: "No registered devices for these users" });
    }

    const tokens = devicesRes.rows.map(d => d.device_token);

    // ✅ Send notification
    const message = {
      notification: {
        title: `Message from ${agent.name || "Your Agent"}`,
        body: "⏰ Time to send your Medicare information!",
      },
      tokens,
      data: {
        click_action: "FLUTTER_NOTIFICATION_CLICK",
        route: "/authorization_form",
      },
    };

    const response = await admin.messaging().sendEachForMulticast(message);

    return reply(true, {
      message: "✅ Notifications sent",
      successCount: response.successCount,
      failureCount: response.failureCount,
      totalDevices: tokens.length,
    });

  } catch (err) {
    console.error("❌ send_notification error:", err);
    return reply(false, { error: "Server error: " + err.message });
  }
};
