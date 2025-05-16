// Import the actual handler from the nested directory
const { handler } = require('./api/chat/send-message');

// Export the handler directly to make it available at /.netlify/functions/chat-send-message
exports.handler = handler; 