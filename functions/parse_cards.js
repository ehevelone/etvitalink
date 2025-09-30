// parse_cards.js
import OpenAI from "openai";
import fetch from "node-fetch"; // Netlify Node runtime generally has fetch; include if your env needs it

const OPENAI_KEY = process.env.OPENAI_API_KEY;
const client = new OpenAI({ apiKey: OPENAI_KEY });

// Helper: post the image to OpenAI images/edits endpoint using multipart/form-data
async function editImageBuffer(bufferBase64, prompt, size = "1024x1024") {
  // Build a FormData body with a binary file named "image"
  const form = new FormData();
  const buffer = Buffer.from(bufferBase64, "base64");
  // Create a Blob/ File compatible object. Node's FormData accepts Buffer with filename.
  form.append("image", buffer, { filename: "card.jpg", contentType: "image/jpeg" });
  form.append("prompt", prompt);
  form.append("size", size);
  form.append("response_format", "b64_json"); // we want base64 back

  const res = await fetch("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_KEY}`,
      // NOTE: do NOT set Content-Type here; fetch will set multipart boundary
    },
    body: form,
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Image edit failed ${res.status}: ${txt}`);
  }

  const json = await res.json();
  // Expect json.data[0].b64_json
  if (!json?.data?.[0]?.b64_json) throw new Error("No edited image returned");
  return json.data[0].b64_json;
}

// Helper: ask a vision/chat model to return structured JSON from the image.
// We'll try the "image-as-data-url" approach first; if the model rejects the
// data URL we fall back to returning an error the caller can use to upload image to S3
async function extractCardFieldsFromImage(client, cleanedBase64) {
  // Build the messages (system + user)
  const systemMsg = {
    role: "system",
    content:
      "You are an assistant that extracts structured fields from an insurance card image. " +
      "Return ONLY valid JSON (no prose) with keys: carrier, policy, memberId, group, side. " +
      "If a field cannot be found, return empty string for that field.",
  };

  // user message includes the image as a data URL (many vision-capable models accept this)
  const dataUrl = `data:image/jpeg;base64,${cleanedBase64}`;
  const userMsg = {
    role: "user",
    content: [
      { type: "text", text: "Extract insurance card details into JSON." },
      { type: "image_url", image_url: { url: dataUrl } },
    ],
  };

  // Some models that support vision accept that. Try it.
  try {
    const visionResp = await client.chat.completions.create({
      model: "gpt-4.1-mini", // pick a vision-capable model in your account
      messages: [systemMsg, userMsg],
      max_tokens: 512,
    });

    const raw = visionResp?.choices?.[0]?.message?.content;
    // If the model returned something, try parse
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        return parsed;
      } catch (e) {
        // Model returned non-JSON or additional commentary; try to extract JSON from text
        const match = raw.match(/\{[\s\S]*\}/);
        if (match) {
          try {
            return JSON.parse(match[0]);
          } catch (ee) {
            // fall through to throwing below
          }
        }
        throw new Error("Vision model returned no valid JSON.");
      }
    } else {
      throw new Error("No content in vision response.");
    }
  } catch (err) {
    // If the model rejects the data URL or otherwise fails, bubble up a helpful message
    throw new Error(
      `Vision/chat extraction failed: ${err.message || err}. ` +
        "If this repeats, consider uploading the edited image temporarily to a public URL (S3) and passing that URL to the model instead."
    );
  }
}

// Netlify-style handler signature: export default async (req) => new Response(...)
export default async (req) => {
  try {
    const raw = await req.text();
    let body = {};
    try {
      body = JSON.parse(raw);
    } catch (e) {
      return new Response(JSON.stringify({ error: "Invalid JSON body", received: raw }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!body.imageBase64) {
      return new Response(JSON.stringify({ error: "No imageBase64 provided" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 1) Edit the image (do a crop/clean/sharpen prompt)
    const editPrompt =
      "Crop tightly to the insurance card bounds, remove background, increase contrast and sharpen text for OCR. Keep all printed and typed text legible.";

    console.log("👉 Calling images/edits...");
    const cleanedBase64 = await editImageBuffer(body.imageBase64, editPrompt, "1024x1024");
    console.log("👉 Received edited image, bytes:", cleanedBase64?.length || 0);

    // 2) Use chat/vision to extract structured JSON from edited image
    console.log("👉 Extracting fields via vision/chat...");
    let parsed = {};
    try {
      parsed = await extractCardFieldsFromImage(client, cleanedBase64);
    } catch (e) {
      console.error("❌ Vision extraction failed:", e.message || e);
      return new Response(
        JSON.stringify({
          error:
            "Vision extraction failed. See details. You can also upload cleaned image to S3 and call the function with imageUrl to allow the model to fetch it.",
          details: e.message,
          card_image_base64: cleanedBase64,
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // 3) Normalise fields to safe strings
    const normalized = {
      carrier: parsed.carrier || "",
      policy: parsed.policy || "",
      memberId: parsed.memberId || parsed.member_id || parsed.member || "",
      group: parsed.group || "",
      side: parsed.side || "front",
    };

    console.log("👉 Parsed metadata:", normalized);

    return new Response(
      JSON.stringify({
        card_image_base64: cleanedBase64,
        meta: normalized,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("❌ parse_cards error:", err);
    return new Response(
      JSON.stringify({
        error: err.message || "Unknown error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
