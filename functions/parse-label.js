import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async (req) => {
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;

    let imageInput;
    if (body.imageUrl) {
      imageInput = { type: "image_url", image_url: body.imageUrl };
    } else if (body.imageBase64) {
      imageInput = {
        type: "image_url",
        image_url: `data:image/png;base64,${body.imageBase64}`,
      };
    } else {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "No image provided (need imageUrl or imageBase64)" }),
      };
    }

    const response = await client.chat.completions.create({
      model: "gpt-4.1-mini", // Vision-capable model
      messages: [
        {
          role: "system",
          content:
            "You are a medical label parser. Always respond in valid JSON only, no text outside JSON.",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Extract details from this medication label. Return JSON with keys: name, dose, frequency, prescribing_doctor, pharmacy.",
            },
            imageInput,
          ],
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 500,
    });

    const parsed = JSON.parse(response.choices[0].message.content);

    return {
      statusCode: 200,
      body: JSON.stringify({
        version: "v3-json-strict",
        data: parsed,
      }),
    };
  } catch (err) {
    console.error("Parse-label error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: err.message,
        details: err.response?.data || null,
      }),
    };
  }
};
