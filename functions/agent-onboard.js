// functions/agent-onboard.js
exports.handler = async (event) => {
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      success: true,
      message: "Agent onboarding endpoint is live 🚀"
    })
  };
};
