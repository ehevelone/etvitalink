import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async (req) => {
  try {
    // ✅ Get raw body safely
    const raw = await req.text();
    let body = {};
    try {
      body = JSON.parse(raw);
    } catch (e) {
      console.error("Invalid JSON body:", raw);
    }

    // ✅ Ensure we have either imageUrl or base64
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
        JSON.stringify({
          error: "No image provided (need imageUrl or imageBase64)",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // ✅ Call OpenAI Vision
    const response = await client.chat.completions.create({
      model: "gpt-4.1-mini", // Vision-capable model
      messages: [
        {
          role: "system",
          content: `You are an OCR parser for insurance cards. 
Return clean JSON with fields:
- carrier
- policy
- memberId
- group
If unsure, leave fields blank.`,
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Extract insurance policy details from this card." },
            imageInput,
          ],
        },
      ],
      max_tokens: 500,
    });

    // ✅ Parse AI response
    let parsed = {};
    try {
      parsed = JSON.parse(response.choices[0].message.content);
    } catch (e) {
      parsed = { raw: response.choices[0].message.content };
    }

    return new Response(
      JSON.stringify({ success: true, data: parsed }, null, 2),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
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
