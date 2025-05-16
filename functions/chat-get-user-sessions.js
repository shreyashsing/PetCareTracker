// Import the actual handler from the nested directory
const { handler } = require('./api/chat/get-user-sessions');

// Export the handler directly to make it available at /.netlify/functions/chat-get-user-sessions
exports.handler = handler; 