const nodemailer = require("nodemailer");

exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");

    // ✅ Setup mailer (from Netlify env vars)
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
    // 👩‍💻 Agent sends unsigned blank forms
    // -------------------
    if (body.formType && body.recipient) {
      const formType = body.formType.toUpperCase();
      mailOptions.to = body.recipient;
      mailOptions.subject = `VitaLink - Please Review ${formType} Form`;
      mailOptions.text = `Hello,

Your insurance agent has sent you a ${formType} form to review and sign.

Please open your VitaLink app to complete the signing process.

- VitaLink`;

      // TODO: attach PDF template for HIPAA / SOA if you have static files
      // e.g. mailOptions.attachments.push({ filename: "HIPAA.pdf", path: `${__dirname}/templates/HIPAA.pdf` });

      await transporter.sendMail(mailOptions);

      return {
        statusCode: 200,
        body: JSON.stringify({ success: true, sent: "unsigned", type: formType }),
      };
    }

    // -------------------
    // 🧑‍⚕️ User sends signed forms & data to agent
    // -------------------
    if (body.agent && body.agent.email) {
      const { agent, hipaa, soa, meds, doctors } = body;

      mailOptions.to = agent.email;
      mailOptions.subject = `VitaLink - Documents from ${agent.name || "Client"}`;
      mailOptions.text = `Hello ${agent.name || "Agent"},

Your client has shared the following via VitaLink:

- HIPAA: ${hipaa?.signedAt ? `Signed at ${hipaa.signedAt}` : "Not signed"}
- SOA: ${soa?.signedAt ? `Signed at ${soa.signedAt}` : "Not signed"}
- Medications: ${meds?.length || 0} items
- Doctors: ${doctors?.length || 0} items

Please log into VitaLink or review attachments below.`;


      // Optional attachments if you’re storing base64 paths
      if (hipaa?.path) {
        mailOptions.attachments.push({
          filename: "HIPAA_Signed.png",
          path: hipaa.path,
        });
      }
      if (soa?.path) {
        mailOptions.attachments.push({
          filename: "SOA_Signed.png",
          path: soa.path,
        });
      }

      // Save meds/doctors JSON as text attachment
      mailOptions.attachments.push({
        filename: "Meds.json",
        content: JSON.stringify(meds, null, 2),
      });
      mailOptions.attachments.push({
        filename: "Doctors.json",
        content: JSON.stringify(doctors, null, 2),
      });

      await transporter.sendMail(mailOptions);

      return {
        statusCode: 200,
        body: JSON.stringify({ success: true, sent: "signed", agent: agent.email }),
      };
    }

    // -------------------
    // ❌ Invalid request
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
