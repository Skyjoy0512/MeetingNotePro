const {health, processAudio, generateSummary, askAI} = require('./audio-processor');

// Firebase Functions のエクスポート
exports.health = health;
exports.processAudio = processAudio;
exports.generateSummary = generateSummary;
exports.askAI = askAI;