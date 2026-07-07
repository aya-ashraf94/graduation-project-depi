const emitToConversation = (req, conversationId, event, data) => {
  const io = req.app.get("io");
  if (io) {
    io.to(conversationId).emit(event, data);
  }
};

const emitMessage = (req, conversationId, message) => {
  emitToConversation(req, conversationId, "new_message", message);
};

module.exports = { emitToConversation, emitMessage };
