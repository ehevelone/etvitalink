// functions/weekly_report.js
const db = require("../services/db");  // ✅ corrected path
const nodemailer = require("nodemailer");

exports.handler = async () => {
  try {
    console.log("✅ Weekly report fired at:", new Date().toISOString());

    // 1. Query redemption stats grouped by agent
    const result = await db.query(`
      SELECT a.name, a.email, COUNT(r.id) AS redemptions
      FROM agents a
      LEFT JOIN promo_codes pc ON pc.agent_id = a.id
      LEFT JOIN redemptions r ON r.promo_code = pc.code
      GROUP BY a.name, a.email
      ORDER BY redemptions DESC;
    `);

    // 2. Format results as a table
    const rows = result.rows;
    let report = "📊 Weekly Agent Report\n\n";
    rows.forEach(r => {
      report += `${r.name} (${r.email}): ${r.redemptions} deployments\n`;
    });

    // 3. Email transporter
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // 4. Send the email
    await transporter.sendMail({
      from: `"VitaLink Reports" <${process.env.SMTP_USER}>`,
      to: "ehevelone@gmail.com", // 📩 admin email
      subject: "Weekly VitaLink Agent Report",
      text: report,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, message: "Report sent", rows }),
    };
  } catch (err) {
    console.error("❌ Weekly report error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
