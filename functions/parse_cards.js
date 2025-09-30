import OpenAI from "openai";
import sharp from "sharp";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async (req) => {
  try {
    // ✅ Parse request body
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

    const imageBuffer = Buffer.from(body.imageBase64, "base64");

    // ✅ Step 1: Ask AI for bounding box
    const visionResp = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content: `You are an assistant that finds the bounding box of an insurance card in a photo. 
Always return JSON like:
{ "x": int, "y": int, "width": int, "height": int,
  "carrier": "string", "policy": "string", "memberId": "string", "group": "string", "side": "front" | "back" }`
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Locate the insurance card and return its bounding box and details." },
            { type: "image_url", image_url: { url: `data:image/jpeg;base64,${body.imageBase64}` } }
          ]
        }
      ],
      max_tokens: 500,
      response_format: { type: "json_object" }
    });

    let parsed = {};
    try {
      parsed = JSON.parse(visionResp.choices[0].message.content || "{}");
    } catch {
      parsed = {};
    }

    const { x = 0, y = 0, width = 0, height = 0 } = parsed;

    // ✅ Step 2: Crop with Sharp
    let croppedBase64;
    try {
      const cropped = await sharp(imageBuffer)
        .extract({ left: x, top: y, width, height })
        .resize(512, 512, { fit: "cover" })
        .png()
        .toBuffer();

      croppedBase64 = cropped.toString("base64");
    } catch (e) {
      console.error("Sharp crop error:", e);
      croppedBase64 = body.imageBase64; // fallback = original
    }

    // ✅ Step 3: Normalize meta
    const normalized = {
      carrier: parsed.carrier || "",
      policy: parsed.policy || "",
      memberId: parsed.memberId || "",
      group: parsed.group || "",
      side: parsed.side || "front"
    };

    return new Response(
      JSON.stringify({
        card_image_base64: croppedBase64,
        meta: normalized
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("parse_cards error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
