import OpenAI from "openai";
import FormData from "form-data";   // ✅ Needed for multipart body
// import fetch from "node-fetch";  // Optional: global fetch already works in Netlify Node 20+

const OPENAI_KEY = process.env.OPENAI_API_KEY;
const client = new OpenAI({ apiKey: OPENAI_KEY });

async function editImageBuffer(bufferBase64, prompt, size = "1024x1024") {
  const form = new FormData();
  const buffer = Buffer.from(bufferBase64, "base64");
  form.append("image", buffer, { filename: "card.jpg", contentType: "image/jpeg" });
  form.append("prompt", prompt);
  form.append("size", size);
  form.append("response_format", "b64_json");

  const res = await fetch("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: { Authorization: `Bearer ${OPENAI_KEY}` },
    body: form,
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Image edit failed ${res.status}: ${txt}`);
  }

  const json = await res.json();
  if (!json?.data?.[0]?.b64_json) throw new Error("No edited image returned");
  return json.data[0].b64_json;
}

async function extractCardFieldsFromImage(client, cleanedBase64) {
  const systemMsg = {
    role: "system",
    content:
      "You are an assistant that extracts structured fields from an insurance card image. " +
      "Return ONLY valid JSON with keys: carrier, policy, memberId, group, side."
  };

  const dataUrl = `data:image/jpeg;base64,${cleanedBase64}`;
  const userMsg = {
    role: "user",
    content: [
      { type: "text", text: "Extract insurance card details into JSON." },
      { type: "image_url", image_url: { url: dataUrl } }
    ]
  };

  const visionResp = await client.chat.completions.create({
    model: "gpt-4.1-mini",
    messages: [systemMsg, userMsg],
    max_tokens: 512,
  });

  const raw = visionResp?.choices?.[0]?.message?.content;
  if (!raw) throw new Error("No content in vision response");

  try {
    return JSON.parse(raw);
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error("Vision model returned no valid JSON.");
  }
}

export default async (req) => {
  try {
    const raw = await req.text();
    let body = {};
    try {
      body = JSON.parse(raw);
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body", received: raw }), {
        status: 400, headers: { "Content-Type": "application/json" }
      });
    }

    if (!body.imageBase64) {
      return new Response(JSON.stringify({ error: "No imageBase64 provided" }), {
        status: 400, headers: { "Content-Type": "application/json" }
      });
    }

    console.log("👉 Calling images/edits...");
    const editPrompt =
      "Crop tightly to the insurance card bounds, remove background, increase contrast and sharpen text.";
    const cleanedBase64 = await editImageBuffer(body.imageBase64, editPrompt);
    console.log("👉 Received edited image, bytes:", cleanedBase64?.length || 0);

    console.log("👉 Extracting fields via vision/chat...");
    const parsed = await extractCardFieldsFromImage(client, cleanedBase64);

    const normalized = {
      carrier: parsed.carrier || "",
      policy: parsed.policy || "",
      memberId: parsed.memberId || parsed.member_id || "",
      group: parsed.group || "",
      side: parsed.side || "front",
    };

    console.log("👉 Parsed metadata:", normalized);

    return new Response(
      JSON.stringify({ card_image_base64: cleanedBase64, meta: normalized }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("❌ parse_cards error:", err);
    return new Response(JSON.stringify({ error: err.message || "Unknown error" }), {
      status: 500, headers: { "Content-Type": "application/json" }
    });
  }
};
