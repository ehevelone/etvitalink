import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async (req) => {
  try {
    const raw = await req.text();
    let body = {};
    try {
      body = JSON.parse(raw);
    } catch (e) {
      return new Response(
        JSON.stringify({ error: "Invalid JSON body", raw }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    let imageInput;
    if (body.imageUrl) {
      imageInput = { type: "image_url", image_url: { url: body.imageUrl } };
    } else if (body.imageBase64) {
      imageInput = {
        type: "image_url",
        image_url: { url: `data:image/png;base64,${body.imageBase64}` },
      };
    } else {
      return new Response(
        JSON.stringify({ error: "No image provided (need imageUrl or imageBase64)" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const response = await client.chat.completions.create({
      model: "gpt-4.1-mini", // vision-capable
      messages: [
        {
          role: "system",
          content:
            "You are an assistant that extracts structured fields from insurance cards. " +
            "Return strict JSON with keys: carrier, policy, memberId, group.",
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Extract the details from this insurance card." },
            imageInput,
          ],
        },
      ],
      max_tokens: 500,
    });

    const content = response.choices[0].message.content.trim();
    let parsed = {};
    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = { raw: content };
    }

    return new Response(JSON.stringify(parsed), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: err.message,
        details: err.response?.data || null,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
