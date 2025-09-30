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
    const meta = await sharp(imageBuffer).metadata();
    const imgW = meta.width || 0;
    const imgH = meta.height || 0;

    console.log("👉 Original image size:", imgW, imgH);

    // ✅ Step 1: Ask AI for bounding box
    const visionResp = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content: `You are an assistant that finds the bounding box of an insurance card in a photo.
Return JSON only:
{
  "x": int, "y": int, "width": int, "height": int,
  "carrier": "string", "policy": "string",
  "memberId": "string", "group": "string",
  "side": "front" | "back"
}
Rules:
- The card is a RECTANGLE, ignore background (desk, hand, shadows).
- If uncertain, return the full image size instead of guessing.`
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Locate the insurance card and return bounding box + details." },
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

    console.log("👉 AI Parsed:", parsed);

    let { x = 0, y = 0, width = imgW, height = imgH } = parsed;

    // ✅ Step 2: Sanity checks
    let useAI = true;
    if (width <= 50 || height <= 50) useAI = false; // too small
    if (width > imgW * 0.95 && height > imgH * 0.95) useAI = false; // covering whole frame
    if (x < 0 || y < 0 || x + width > imgW || y + height > imgH) useAI = false; // out of bounds

    let croppedBase64, finalMeta;
    try {
      let pipeline = sharp(imageBuffer);

      if (useAI) {
        console.log("👉 Using AI crop:", { x, y, width, height });
        pipeline = pipeline.extract({ left: x, top: y, width, height });
      } else {
        console.log("⚠️ AI box invalid → using Sharp.trim() fallback");
        pipeline = pipeline.trim(); // auto edge detect
      }

      const cropped = await pipeline
        .resize(512, 512, { fit: "cover" })
        .png()
        .toBuffer();

      const croppedInfo = await sharp(cropped).metadata();
      finalMeta = { width: croppedInfo.width, height: croppedInfo.height };
      console.log("👉 Final cropped size:", finalMeta);

      croppedBase64 = cropped.toString("base64");
    } catch (e) {
      console.error("❌ Sharp crop error:", e);
      croppedBase64 = body.imageBase64; // fallback = original
      finalMeta = { width: imgW, height: imgH, fallback: true };
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
        meta: normalized,
        crop_debug: finalMeta  // 👈 debugging info
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
