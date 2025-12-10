// functions/parse_insurance.js
const OpenAI = require("openai");

// ✅ OpenAI client
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function reply(statusCode, obj) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(obj),
  };
}

exports.handler = async (event) => {
  try {
    // ✅ Enforce POST
    if (event.httpMethod !== "POST") {
      return reply(405, { success: false, error: "Method Not Allowed" });
    }

    // ✅ Safe body parsing (mobile + Netlify)
    let body = {};
    try {
      if (event.isBase64Encoded) {
        body = JSON.parse(
          Buffer.from(event.body, "base64").toString("utf8")
        );
      } else {
        body = JSON.parse(event.body || "{}");
      }
    } catch (e) {
      return reply(400, {
        success: false,
        error: "Invalid JSON body",
      });
    }

    // ✅ Validate image input
    let imageInput;
    if (body.imageUrl) {
      imageInput = {
        type: "image_url",
        image_url: { url: body.imageUrl },
      };
    } else if (body.imageBase64) {
      imageInput = {
        type: "image_url",
        image_url: {
          url: `data:image/png;base64,${body.imageBase64}`,
        },
      };
    } else {
      return reply(400, {
        success: false,
        error: "No image provided (imageUrl or imageBase64 required)",
      });
    }

    // ✅ Call OpenAI Vision
    const response = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content:
            "You extract structured insurance data. Respond ONLY with valid JSON having keys: carrier, policy, memberId, group.",
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Extract insurance info from this image." },
            imageInput,
          ],
        },
      ],
      max_tokens: 500,
    });

    const rawContent = response.choices[0].message.content;

    // ✅ Try to parse AI output
    let parsed;
    try {
      parsed = JSON.parse(rawContent);
    } catch {
      parsed = { rawText: rawContent };
    }

    return reply(200, {
      success: true,
      data: parsed,
    });

  } catch (err) {
    console.error("❌ parse_insurance error:", err);
    return reply(500, {
      success: false,
      error: "Server error",
      details: err.message,
    });
  }
};
