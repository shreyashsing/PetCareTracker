// Import the actual handler from the nested directory
const { handler } = require('./api/chat/add-message');

// Export the handler directly to make it available at /.netlify/functions/chat-add-message
exports.handler = handler; 