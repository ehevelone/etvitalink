import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async (req) => {
  try {
    const raw = await req.text();
    let body = {};
    try {
      body = JSON.parse(raw);
    } catch (err) {
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
        JSON.stringify({
          error: "No image provided (need imageUrl or imageBase64)",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const response = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content:
            "You are an assistant that extracts structured fields from insurance cards.",
        },
        {
          role: "user",
          content: [
            imageInput,
            {
              type: "text",
              text: `Extract the following fields from this insurance card image: 
- carrier
- policy
- memberId
- group

Respond ONLY with a JSON object. Example:
{"carrier":"Aetna","policy":"123456","memberId":"ABC789","group":"GRP001"}`,
            },
          ],
        },
      ],
      max_tokens: 500,
    });

    const parsed = JSON.parse(response.choices[0].message.content);

    return new Response(JSON.stringify(parsed), {
      status: 200,
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
