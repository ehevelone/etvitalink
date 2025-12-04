const nodemailer = require("nodemailer");
const db = require("../services/db"); // ✅ Add DB

exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587", 10),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    let mailOptions = {
      from: `"VitaLink" <${process.env.SMTP_USER}>`,
      subject: "",
      to: "",
      text: "",
      attachments: [],
    };

    // 🧑‍⚕️ User sends signed HIPAA & SOA
    if (body.agent && body.agent.email) {
      const { agent, user, meds, doctors, body: clientBody, attachments } = body;

      mailOptions.to = agent.email;
      mailOptions.subject = `VitaLink - Documents from ${user || "Client"}`;

      if (clientBody) {
        mailOptions.text = clientBody;
      } else {
        const medsCount = (meds && meds.length) || 0;
        const doctorsCount = (doctors && doctors.length) || 0;
        mailOptions.text = `Hello ${agent.name || "Agent"},

Your client ${user || "Client"} has shared their completed intake info:

• HIPAA & SOA Authorization: ✅ Signed
• Medications: ${medsCount}
• Doctors: ${doctorsCount}

Attachments include:
• Signed authorization PDF
• Medication/doctor lists
• JSON export for record keeping

- VitaLink`;
      }

      // ✅ Attach uploaded files
      if (attachments && Array.isArray(attachments)) {
        attachments.forEach((att) => {
          if (att.content) {
            mailOptions.attachments.push({
              filename: att.name || "file",
              content: Buffer.from(att.content, "base64"),
            });
          }
        });
      }

      // ✅ JSON snapshots
      mailOptions.attachments.push({
        filename: "Meds.json",
        content: JSON.stringify(meds || [], null, 2),
      });
      mailOptions.attachments.push({
        filename: "Doctors.json",
        content: JSON.stringify(doctors || [], null, 2),
      });

      // 🚀 Send the email
      await transporter.sendMail(mailOptions);

      // ✅ Mark user complete for this AEP year
      await db.query(
        `UPDATE users 
         SET status = 'complete', 
             last_review_year = EXTRACT(YEAR FROM CURRENT_DATE)
         WHERE LOWER(email) = LOWER($1)`,
        [user]
      );

      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          sent: "signed",
          agent: agent.email,
        }),
      };
    }

    return { statusCode: 400, body: JSON.stringify({ error: "Invalid payload" }) };
  } catch (err) {
    console.error("❌ send_form_email error", err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
