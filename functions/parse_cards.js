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
        JSON.stringify({ error: "Invalid JSON body", received: raw }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!body.imageBase64) {
      return new Response(
        JSON.stringify({ error: "No image provided (need imageBase64)" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 🔹 Step 1: Generate cleaned card image
    console.log("👉 Generating cleaned insurance card image...");
    const cleaned = await client.images.generate({
      model: "gpt-image-1",
      prompt: "Crop to the insurance card, remove background, sharpen text.",
      size: "512x512",
      input: [{ data: body.imageBase64, mime_type: "image/jpeg" }]
    });

    const cleanedBase64 = cleaned.data[0].b64_json;
    console.log("👉 Got cleaned image, length:", cleanedBase64?.length);

    // 🔹 Step 2: Extract metadata
    console.log("👉 Running GPT metadata extraction...");
    const visionResp = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content: `Extract structured info from an insurance card. 
Return ONLY JSON with these keys:
{ "carrier": "", "policy": "", "memberId": "", "group": "", "side": "" }`
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Extract insurance card details." },
            { type: "image_url", image_url: { url: `data:image/jpeg;base64,${cleanedBase64}` } }
          ]
        }
      ],
      max_tokens: 400
    });

    let parsed = {};
    try {
      parsed = JSON.parse(visionResp.choices[0].message.content || "{}");
    } catch {
      parsed = {};
    }

    const normalized = {
      carrier: parsed.carrier || "",
      policy: parsed.policy || "",
      memberId: parsed.memberId || "",
      group: parsed.group || "",
      side: parsed.side || "front"
    };

    console.log("👉 Extracted metadata:", normalized);

    return new Response(
      JSON.stringify({
        card_image_base64: cleanedBase64,
        meta: normalized
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("❌ parse_cards error:", err);
    return new Response(
      JSON.stringify({
        error: err.message || "Unknown error",
        details: err.response?.data || null
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
