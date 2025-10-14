const nodemailer = require("nodemailer");

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

    if (body.agent && body.agent.email) {
      const { agent, user, meds, doctors, body: clientBody, attachments } = body;

      mailOptions.to = agent.email;
      mailOptions.subject = `VitaLink - Documents from ${user || "Client"}`;

      mailOptions.text =
        clientBody ||
        `Hello ${agent.name || "Agent"},\n\nYour client has shared documents.\n`;

      // ✅ Decode base64 attachments
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

      // Still include JSON for backend import
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

    return { statusCode: 400, body: JSON.stringify({ error: "Invalid payload" }) };
  } catch (err) {
    console.error("❌ send_form_email error", err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
