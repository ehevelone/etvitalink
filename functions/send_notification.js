// functions/send_notification.js
const db = require("./services/db");
const admin = require("firebase-admin");

let serviceAccount = {};
try {
  serviceAccount = JSON.parse(process.env.FCM_SERVICE_ACCOUNT || "{}");
} catch (e) {
  console.error("❌ Invalid FCM_SERVICE_ACCOUNT JSON");
}

// ✅ Initialize Firebase once
if (!admin.apps.length && serviceAccount.project_id) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

function reply(statusCode, obj) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
    },
    body: JSON.stringify(obj),
  };
}

exports.handler = async (event) => {
  try {
    // ✅ CORS preflight
    if (event.httpMethod === "OPTIONS") {
      return reply(200, {});
    }

    // ✅ Enforce POST
    if (event.httpMethod !== "POST") {
      return reply(405, {
        success: false,
        error: "Method Not Allowed",
      });
    }

    // ✅ Safe body parsing
    let body = {};
    try {
      if (event.isBase64Encoded) {
        body = JSON.parse(
          Buffer.from(event.body, "base64").toString("utf8")
        );
      } else {
        body = JSON.parse(event.body || "{}");
      }
    } catch (e) {
      return reply(400, {
        success: false,
        error: "Invalid request body",
      });
    }

    const { agentEmail } = body;
    if (!agentEmail) {
      return reply(400, {
        success: false,
        error: "Missing agentEmail",
      });
    }

    // ✅ Get agent
    const agentRes = await db.query(
      `
      SELECT id, name
      FROM agents
      WHERE LOWER(email) = LOWER($1)
      LIMIT 1
      `,
      [agentEmail.trim()]
    );

    if (!agentRes.rows.length) {
      return reply(404, {
        success: false,
        error: "Agent not found",
      });
    }

    const agent = agentRes.rows[0];

    // ✅ Get users linked to agent
    const usersRes = await db.query(
      `SELECT id FROM users WHERE agent_id = $1`,
      [agent.id]
    );

    if (!usersRes.rows.length) {
      return reply(404, {
        success: false,
        error: "No users linked to this agent",
      });
    }

    const userIds = usersRes.rows.map((u) => u.id);

    // ✅ Get device tokens
    const devicesRes = await db.query(
      `
      SELECT device_token
      FROM user_devices
      WHERE user_id = ANY($1::int[])
        AND device_token IS NOT NULL
      `,
      [userIds]
    );

    if (!devicesRes.rows.length) {
      return reply(404, {
        success: false,
        error: "No registered devices for these users",
      });
    }

    const tokens = devicesRes.rows.map((d) => d.device_token);

    // ✅ Send FCM multicast
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

    return reply(200, {
      success: true,
      message: "Notifications sent ✅",
      successCount: response.successCount,
      failureCount: response.failureCount,
      totalDevices: tokens.length,
    });

  } catch (err) {
    console.error("❌ send_notification error:", err);
    return reply(500, {
      success: false,
      error: "Server error while sending notifications ❌",
    });
  }
};
