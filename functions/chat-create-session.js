// Import the actual handler from the nested directory
const { handler } = require('./api/chat/create-session');

// Export the handler directly to make it available at /.netlify/functions/chat-create-session
exports.handler = handler; 