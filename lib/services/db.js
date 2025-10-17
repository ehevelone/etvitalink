// functions/services/db.js
console.log("DEBUG connection string:", process.env.SUPABASE_URL);

const { Pool } = require("pg");

// Expecting SUPABASE_URL in your Netlify environment variables
const pool = new Pool({
  connectionString: process.env.SUPABASE_URL,
  ssl: { rejectUnauthorized: false }, // required for Supabase
});

const db = {
  query: (text, params) => pool.query(text, params),
};

module.exports = db;
