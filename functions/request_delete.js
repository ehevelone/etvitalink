// functions/request_delete.js
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY // ⚠️ Service key
);

function ok(msg) {
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ success: true, message: msg }),
  };
}

function fail(msg, code = 400) {
  return {
    statusCode: code,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ success: false, error: msg }),
  };
}

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") return fail("Method not allowed", 405);

    const { username, email } = JSON.parse(event.body || "{}");
    if (!username && !email) {
      return fail("Username or email is required ❌");
    }

    // 🔎 Try to delete from users
    if (username) {
      const { data, error } = await supabase
        .from("users")
        .delete()
        .eq("username", username);

      if (error) {
        console.error("❌ Error deleting user:", error);
        return fail("Failed to delete user ❌");
      }
      if (data && data.length > 0) {
        return ok("User account deleted successfully ✅");
      }
    }

    // 🔎 Try to delete from agents
    if (email) {
      const { data, error } = await supabase
        .from("agents")
        .delete()
        .eq("email", email);

      if (error) {
        console.error("❌ Error deleting agent:", error);
        return fail("Failed to delete agent ❌");
      }
      if (data && data.length > 0) {
        return ok("Agent account deleted successfully ✅");
      }
    }

    return fail("No matching account found ❌", 404);
  } catch (err) {
    console.error("❌ Error in request_delete:", err);
    return fail("Server error during account deletion ❌", 500);
  }
};
