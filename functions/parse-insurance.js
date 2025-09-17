import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async (req) => {
  try {
    // ✅ Read raw body
    const raw = await req.text();
    let body = {};
    try {
      body = JSON.parse(raw);
    } catch (e) {
      return new Response(
        JSON.stringify({ error: "Invalid JSON body", received: raw }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // ✅ Ensure we have either imageBase64 or imageUrl
    let imageInput;
    if (body.imageUrl) {
      imageInput = { type: "image_url", image_url: { url: body.imageUrl } };
    } else if (body.imageBase64) {
      imageInput = {
        type: "image_url",
        image_url: { url: `data:image/png;base64,${body.imageBase64}` },
      };
    } else {
      return new Response(
        JSON.stringify({ error: "No image provided (need imageUrl or imageBase64)" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // ✅ Call OpenAI Vision
    const response = await client.chat.completions.create({
      model: "gpt-4.1-mini", // vision-capable
      messages: [
        {
          role: "system",
          content: "You are an assistant that extracts insurance card details from images.",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Extract the following fields from this insurance card: carrier, policy, memberId, group. Return valid JSON only.",
            },
            imageInput,
          ],
        },
      ],
      max_tokens: 500,
    });

    // ✅ Parse AI response safely
    let parsed = {};
    try {
      parsed = JSON.parse(response.choices[0].message.content);
    } catch (e) {
      parsed = { raw: response.choices[0].message.content };
    }

    return new Response(JSON.stringify(parsed), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: err.message,
        details: err.response?.data || null,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
