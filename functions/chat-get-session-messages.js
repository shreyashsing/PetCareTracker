// Import the actual handler from the nested directory
const { handler } = require('./api/chat/get-session-messages');

// Export the handler directly to make it available at /.netlify/functions/chat-get-session-messages
exports.handler = handler; 