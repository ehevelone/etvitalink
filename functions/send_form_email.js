const nodemailer = require("nodemailer");
const fs = require("fs");

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

    // -------------------
    // 🧑‍⚕️ User sends signed HIPAA & SOA with data
    // -------------------
    if (body.agent && body.agent.email) {
      const { agent, user, meds, doctors, body: clientBody, attachments } = body;

      mailOptions.to = agent.email;
      mailOptions.subject = `VitaLink - Documents from ${user || "Client"}`;

      // Use body text from Flutter if provided
      if (clientBody) {
        mailOptions.text = clientBody;
      } else {
        mailOptions.text = `Hello ${agent.name || "Agent"},

Your client has shared the following via VitaLink:

- HIPAA & SOA Authorization: ✅ Signed
- Medications: ${meds?.length || 0} items
- Doctors: ${doctors?.length || 0} items

Please review the attached PDF, CSV, and JSON exports.`;
      }

      // Attach PDF + CSV if paths exist
      if (attachments && Array.isArray(attachments)) {
        attachments.forEach((att) => {
          if (att.path && fs.existsSync(att.path)) {
            mailOptions.attachments.push({
              filename: att.name || "file",
              path: att.path,
            });
          }
        });
      }

      // Attach JSON snapshots for system import
      mailOptions.attachments.push({
        filename: "Meds.json",
        content: JSON.stringify(meds || [], null, 2),
      });
      mailOptions.attachments.push({
        filename: "Doctors.json",
        content: JSON.stringify(doctors || [], null, 2),
      });

      await transporter.sendMail(mailOptions);

      return {
        statusCode: 200,
        body: JSON.stringify({ success: true, sent: "signed", agent: agent.email }),
      };
    }

    // -------------------
    // ❌ Invalid
    // -------------------
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Invalid payload" }),
    };

  } catch (err) {
    console.error("❌ send_form_email error", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
