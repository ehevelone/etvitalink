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
        image_url: { url: `data:image/jpeg;base64,${body.imageBase64}` },
      };
    } else {
      return new Response(
        JSON.stringify({
          error: "No image provided (need imageUrl or imageBase64)",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // ✅ (Optional) Extract text fields — but we won’t use them in Flutter
    const response = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content: `You are an assistant that extracts structured information from the front/back of insurance cards.
Always return valid JSON with keys:
{
  "carrier": "string",
  "policy": "string",
  "memberId": "string",
  "group": "string",
  "side": "front" | "back"
}`,
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Extract insurance card information." },
            imageInput,
          ],
        },
      ],
      max_tokens: 300,
      response_format: { type: "json_object" },
    });

    let parsed = {};
    try {
      parsed = JSON.parse(response.choices[0].message.content || "{}");
    } catch {
      parsed = {};
    }

    const normalized = {
      carrier: parsed.carrier || "",
      policy: parsed.policy || "",
      memberId: parsed.memberId || "",
      group: parsed.group || "",
      side: parsed.side || "front",
    };

    // ✅ Call OpenAI Images API to crop card
    const crop = await client.images.generate({
      model: "gpt-image-1",
      prompt: "Crop this image tightly to only show the insurance card. Remove all background.",
      size: "512x512",
      response_format: "b64_json",
      image: [imageInput.image_url.url], // reuse same uploaded image
    });

    const croppedBase64 = crop.data[0].b64_json;

    // ✅ Return only cropped image (meta included if you want it later)
    return new Response(
      JSON.stringify({
        card_image_base64: croppedBase64,  // 👈 MAIN payload
        meta: normalized                   // optional, can be ignored
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("parse_cards error:", err);
    return new Response(
      JSON.stringify({
        error: err.message,
        details: err.response?.data || null,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
