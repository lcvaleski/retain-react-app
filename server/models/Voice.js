const mongoose = require('mongoose');

const voiceSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  voiceId: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Voice', voiceSchema); 