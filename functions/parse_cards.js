import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async (req) => {
  try {
    // ✅ Parse request body
    const raw = await req.text();
    let body = {};
    try {
      body = JSON.parse(raw);
    } catch {
      console.error("❌ Invalid JSON:", raw);
      return new Response(
        JSON.stringify({ error: "Invalid JSON body", received: raw }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!body.imageBase64) {
      console.error("❌ No imageBase64 in request");
      return new Response(
        JSON.stringify({ error: "No image provided (need imageBase64)" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // ✅ Step 1: Clean up the card (simulate background removal & sharpening)
    console.log("👉 Calling OpenAI images.generate for cleanup...");
    const cleaned = await client.images.generate({
      model: "gpt-image-1",
      prompt: `Clean this insurance card photo. Keep only the card, remove the background, and sharpen text. 
Here is the raw image in base64: ${body.imageBase64}`,
      size: "512x512",
      response_format: "b64_json"
    });

    const cleanedBase64 = cleaned.data[0].b64_json;
    console.log("👉 Got cleaned image from OpenAI (length:", cleanedBase64?.length, ")");

    // ✅ Step 2: Extract structured info from the card using GPT
    console.log("👉 Calling OpenAI chat.completions for metadata extraction...");
    const visionResp = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content: `You are an assistant that extracts structured information from an insurance card.
Always return valid JSON with keys:
{
  "carrier": "string",
  "policy": "string",
  "memberId": "string",
  "group": "string",
  "side": "front" | "back"
}`
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Extract insurance card information from this image (base64 included)." },
            { type: "text", text: body.imageBase64 }
          ]
        }
      ],
      max_tokens: 400,
      response_format: { type: "json_object" }
    });

    let parsed = {};
    try {
      parsed = JSON.parse(visionResp.choices[0].message.content || "{}");
    } catch (e) {
      console.error("❌ Failed to parse JSON from GPT:", visionResp.choices[0].message.content);
      parsed = {};
    }

    // ✅ Normalize fields
    const normalized = {
      carrier: parsed.carrier || "",
      policy: parsed.policy || "",
      memberId: parsed.memberId || "",
      group: parsed.group || "",
      side: parsed.side || "front"
    };

    console.log("👉 Extracted metadata:", normalized);

    // ✅ Return cleaned image + extracted info
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
