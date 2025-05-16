// Import the actual handler from the nested directory
const { handler } = require('./api/chat/delete-session');

// Export the handler directly to make it available at /.netlify/functions/chat-delete-session
exports.handler = handler; 