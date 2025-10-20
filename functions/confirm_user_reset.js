// functions/confirm_user_reset.js
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

exports.handler = async (event) => {
  try {
    const { token, newPassword } = JSON.parse(event.body || "{}");
    if (!token || !newPassword) {
      return { statusCode: 400, body: JSON.stringify({ success: false, error: "Missing token or password" }) };
    }

    // Lookup user by token
    const { data: user, error } = await supabase
      .from("users")
      .select("id, reset_expires")
      .eq("reset_token", token)
      .single();

    if (error || !user) {
      return { statusCode: 400, body: JSON.stringify({ success: false, error: "Invalid token" }) };
    }

    // Expired?
    if (!user.reset_expires || new Date(user.reset_expires) < new Date()) {
      return { statusCode: 400, body: JSON.stringify({ success: false, error: "Token expired" }) };
    }

    // Hash new password
    const hash = await bcrypt.hash(newPassword, 10);

    // Update DB: set new hash, clear token
    await supabase
      .from("users")
      .update({
        password_hash: hash,
        reset_token: null,
        reset_expires: null,
      })
      .eq("id", user.id);

    return { statusCode: 200, body: JSON.stringify({ success: true, message: "Password reset successful" }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ success: false, error: err.message }) };
  }
};
