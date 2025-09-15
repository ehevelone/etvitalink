function ok(obj){return{statusCode:200,headers:{"Content-Type":"application/json"},body:JSON.stringify(obj)}}

exports.handler = async (event) => {
  try {
    if (!process.env.OPENAI_API_KEY) return ok({_error:"OPENAI_API_KEY not set in Netlify env"});

    const body = JSON.parse(event.body || "{}");
    let { imageBase64, debug } = body;
    if (!imageBase64) return ok({_error:"imageBase64 is required"});

    // ensure data URL form for Responses API image input
    if (!/^data:image\\//i.test(imageBase64)) {
      imageBase64 = "data:image/jpeg;base64," + imageBase64;
    }

    // Build a simpler, permissive request
    const req = {
      model: "gpt-4.1",
      temperature: 0,
      response_format: { type: "json_object" }, // <-- simpler than json_schema
      input: [
        {
          role: "system",
          content: "You are a careful medical label parser. If a field is not visible/unclear, return the string 'unknown'. Output must be valid JSON only."
        },
        {
          role: "user",
          content: [
            { type: "input_text", text:
              "From this medication label image, extract these fields:\n" +
              "{name, strength, dose, frequency, pharmacy, doctor}.\n" +
              "If any are unknown, set them to the string 'unknown'. Return only JSON, no extra text."
            },
            { type: "input_image", image_url: imageBase64 }
          ]
        }
      ]
    };

    let resp;
    try {
      resp = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify(req),
      });
    } catch (e) {
      return ok({_error:"Network error calling OpenAI", details:String(e)});
    }

    const text = await resp.text();

    if (!resp.ok) {
      // return full body so we can see exactly what's wrong
      return ok({_error:"OpenAI request failed", status: resp.status, details: text});
    }

    // Responses API often provides output_text; fall back to content/text
    let data = {};
    try { data = JSON.parse(text); } catch {}
    const raw =
      (typeof data.output_text === "string" && data.output_text) ||
      (data.output?.[0]?.content?.[0]?.text ?? "{}");

    let parsed = {};
    try { parsed = JSON.parse(raw); } catch { parsed = {}; }

    const safe = {
      name: s(parsed.name),
      strength: s(parsed.strength),
      dose: s(parsed.dose),
      frequency: s(parsed.frequency),
      pharmacy: s(parsed.pharmacy),
      doctor: s(parsed.doctor),
    };

    return debug ? ok({...safe, _debug: {openai_raw: String(raw).slice(0,2000)}}) : ok(safe);
  } catch (err) {
    return ok({_error:"Unhandled exception", message:String(err), stack:String(err?.stack||"")});
  }
};

function s(v){ if(typeof v!=="string") return "unknown"; const t=v.trim(); return t?t:"unknown"; }
