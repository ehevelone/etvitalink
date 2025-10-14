import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async (req) => {
  try {
    // ✅ Get raw body
    const raw = await req.text();
    let body = {};
    try {
      body = JSON.parse(raw);
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON body", received: raw }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // ✅ Ensure we have image input
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

    // ✅ Call OpenAI Vision model
    const response = await client.chat.completions.create({
      model: "gpt-4.1-mini", // Vision-capable
      messages: [
        {
          role: "system",
          content: `You are an assistant that extracts structured insurance information from an insurance card.
Output strictly JSON with keys: carrier, policy, memberId, group.`,
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

    // ✅ Parse AI response
    const rawContent = response.choices[0].message.content;
    let parsed;
    try {
      parsed = JSON.parse(rawContent);
    } catch {
      parsed = { rawText: rawContent }; // fallback
    }

    return new Response(JSON.stringify({ data: parsed }), {
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
