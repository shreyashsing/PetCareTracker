// Import the actual handler from the nested directory
const { handler } = require('./api/chat/get-messages');

// Export the handler directly to make it available at /.netlify/functions/chat-get-messages
exports.handler = handler; 