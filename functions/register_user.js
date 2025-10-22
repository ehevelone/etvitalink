// netlify/functions/register_user.js
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

// ✅ Env vars (already set in Netlify dashboard)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    const { username, password, promoCode, phone } = JSON.parse(event.body);

    if (!username || !password) {
      return { statusCode: 400, body: JSON.stringify({ success: false, error: 'Missing required fields' }) };
    }

    // ✅ Hash password
    const password_hash = await bcrypt.hash(password, 10);

    // ✅ Insert into users table
    const { data, error } = await supabase
      .from('users')
      .insert([
        {
          username,
          password_hash,
          promo_code: promoCode || null,
          phone: phone || null,
        }
      ])
      .select()
      .single();

    if (error) throw error;

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: 'User registered successfully',
        user: { id: data.id, username: data.username, promo_code: data.promo_code }
      })
    };
  } catch (err) {
    console.error('❌ register_user error:', err);
    return { statusCode: 500, body: JSON.stringify({ success: false, error: err.message }) };
  }
};
