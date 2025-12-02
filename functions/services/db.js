// functions/services/db.js
const { Pool } = require("pg");

// Try multiple env var names so we don't silently misconfigure
const connectionString =
  process.env.SUPABASE_DB_URL || // preferred explicit Postgres URL
  process.env.DATABASE_URL ||    // common Heroku-style
  process.env.SUPABASE_URL;      // fallback if you reused this

if (!connectionString) {
  console.error(
    "❌ No DB connection string found in SUPABASE_DB_URL / DATABASE_URL / SUPABASE_URL"
  );
}

// Lazy-init pool so errors happen on first query (inside handlers), not at module load
let pool;

function getPool() {
  if (!pool) {
    console.log("🟢 Initializing PG pool…");
    pool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false }, // required for Supabase PG
    });
  }
  return pool;
}

const db = {
  query: async (text, params) => {
    try {
      const client = getPool();
      return await client.query(text, params);
    } catch (err) {
      console.error("❌ DB query error:", err);
      throw err;
    }
  },
};

module.exports = db;
