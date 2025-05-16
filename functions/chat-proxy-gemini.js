// Import the actual handler from the nested directory
const { handler } = require('./api/chat/proxy-gemini');

// Export the handler directly to make it available at /.netlify/functions/chat-proxy-gemini
exports.handler = handler; 