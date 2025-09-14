// netlify/functions/parse-label.js
// Node 18+ has fetch built-in; no need for node-fetch

function json(statusCode, obj) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(obj),
  };
}
const strOrUnknown = v => (typeof v === "string" && v.trim() ? v.trim() : "unknown");

export async function handler(event) {
  try {
    const body = JSON.parse(event.body || "{}");
    let { imageBase64, debug } = body || {};

    if (!imageBase64) return json(400, { error: "imageBase64 is required" });

    // Accept either raw base64 or data URL; normalize to full data URL
    if (!/^data:image\//i.test(imageBase64)) {
      // guess jpeg if unknown; OpenAI accepts data URLs
      imageBase64 = `data:image/jpeg;base64,${imageBase64}`;
    }

    // Call OpenAI
    const resp = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4.1",
        temperature: 0,
        // Force strict JSON so parsing won't fail
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "MedicationLabelExtraction",
            schema: {
              type: "object",
              properties: {
                name: { type: "string" },
                strength: { type: "string" },
                dose: { type: "string" },
                frequency: { type: "string" },
                pharmacy: { type: "string" },
                doctor: { type: "string" }
              },
              required: ["name","strength","dose","frequency","pharmacy","doctor"],
              additionalProperties: false
            }
          }
        },
        input: [
          { role: "system",
            content: "You are a medical label parser. Read the medication label image. If a field is not visible, return the string 'unknown'. Output must strictly conform to the JSON schema."
          },
          {
            role: "user",
            content: [
              { type: "input_text",
                text: "Extract: {name, strength, dose, frequency, pharmacy, doctor}. If unknown, use 'unknown' exactly." },
              { type: "input_image",
                image_url: imageBase64 } // <-- data URL here
            ]
          }
        ]
      }),
    });

    const text = await resp.text(); // always read body for logging
    if (!resp.ok) {
      console.error("OpenAI error", resp.status, text);
      return json(502, { error: "OpenAI request failed", status: resp.status, details: text.slice(0, 500) });
    }

    let data;
    try { data = JSON.parse(text); } catch { data = {}; }

    const raw =
      (typeof data.output_text === "string" && data.output_text) ||
      data.output?.[0]?.content?.[0]?.text ||
      "{}";

    let parsed;
    try { parsed = JSON.parse(raw); }
    catch (e) {
      console.warn("JSON parse failed; raw:", raw);
      parsed = {};
    }

    const safe = {
      name: strOrUnknown(parsed.name),
      strength: strOrUnknown(parsed.strength),
      dose: strOrUnknown(parsed.dose),
      frequency: strOrUnknown(parsed.frequency),
      pharmacy: strOrUnknown(parsed.pharmacy),
      doctor: strOrUnknown(parsed.doctor),
    };

    // Optional debug echo to client (first 200 chars to avoid giant logs)
    if (debug) {
      return json(200, { ...safe, _debug: { openai_raw: raw.slice(0, 500) } });
    }

    return json(200, safe);
  } catch (err) {
    console.error("Function error:", err);
    return json(500, { error: err.message, stack: err.stack });
  }
}
