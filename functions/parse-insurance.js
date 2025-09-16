import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async (req) => {
  try {
    const raw = await req.text();
    let body = {};
    try {
      body = JSON.parse(raw);
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON body", receivedBody: raw }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // ✅ Ensure we have either imageUrl or imageBase64
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

    // ✅ Call OpenAI Vision model
    const response = await client.chat.completions.create({
      model: "gpt-4.1-mini", // vision-capable
      messages: [
        {
          role: "system",
          content: `You are an OCR parser for US health insurance cards. 
Always return a valid JSON object with these keys only:
{
  "carrier": string,
  "policy": string,
  "memberId": string,
  "group": string
}
If a field is not present, return it as an empty string. Do not include extra text or explanations.`,
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Extract insurance details from this card:" },
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
    } catch {
      parsed = { error: "Invalid JSON from model", raw: response.choices[0].message.content };
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
