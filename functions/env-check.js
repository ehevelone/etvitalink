exports.handler = async () => {
  const present = !!process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.startsWith("sk-");
  return {
    statusCode: 200,
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({
      has_OPENAI_API_KEY: present,
      sample_prefix: process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.substring(0,7) : null
    }),
  };
};
