function respOK(obj) {
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(obj),
  };
}

exports.handler = async (event) => {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return respOK({ _error: "OPENAI_API_KEY not set in Netlify env" });
    }

    const body = JSON.parse(event.body || "{}");
    let { imageBase64, debug } = body;

    if (!imageBase64) {
      return respOK({ _error: "imageBase64 is required" });
    }

    // Accept raw base64 or data URL
    if (!/^data:image\//i.test(imageBase64)) {
      imageBase64 = "data:image/jpeg;base64," + imageBase64;
    }

    let oiResp;
    try {
      oiResp = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4.1",
          temperature: 0,
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
                  doctor: { type: "string" },
                },
                required: ["name","strength","dose","frequency","pharmacy","doctor"],
                additionalProperties: false,
              },
            },
          },
          input: [
            { role: "system", content: "You are a medical label parser. If a field is not visible, return 'unknown'. Output must match the schema." },
            {
              role: "user",
              content: [
                { type: "input_text", text: "Extract {name, strength, dose, frequency, pharmacy, doctor}. If unknown, use 'unknown' exactly." },
                { type: "input_image", image_url: imageBase64 }
              ],
            },
          ],
        }),
      });
    } catch (netErr) {
      return respOK({ _error: "Network error calling OpenAI", details: String(netErr) });
    }

    const text = await oiResp.text();

    if (!oiResp.ok) {
      return respOK({
        _error: "OpenAI request failed",
        status: oiResp.status,
        details: text?.slice(0, 2000)
      });
    }

    // Try to parse the Responses API wrapper
    let data = {};
    try { data = JSON.parse(text); } catch {}

    const raw =
      (typeof data.output_text === "string" && data.output_text) ||
      data.output?.[0]?.content?.[0]?.text ||
      "{}";

    let parsed = {};
    try { parsed = JSON.parse(raw); } catch {}

    const safe = {
      name: toStr(parsed.name),
      strength: toStr(parsed.strength),
      dose: toStr(parsed.dose),
      frequency: toStr(parsed.frequency),
      pharmacy: toStr(parsed.pharmacy),
      doctor: toStr(parsed.doctor),
    };

    if (debug) {
      return respOK({ ...safe, _debug: { openai_raw_text: String(raw).slice(0, 2000) } });
    }
    return respOK(safe);
  } catch (err) {
    return respOK({ _error: "Unhandled exception", message: String(err), stack: String(err?.stack || "") });
  }
};

function toStr(v) {
  if (typeof v !== "string") return "unknown";
  const t = v.trim();
  return t ? t : "unknown";
}
