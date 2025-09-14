const { ConversationService } = require('./dist/services/ConversationService');

async function testConversationFix() {
  console.log('Testing conversation service with provider fallback...');
  
  const conversationService = new ConversationService();
  
  try {
    const result = await conversationService.generateResponse(
      "I'm feeling happy today!",
      {
        userId: 'test-user',
        detectedEmotion: 'happy'
      }
    );
    
    console.log('✅ Conversation generation successful!');
    console.log('Response:', result.response);
    console.log('Suggested Goal:', result.suggestedGoal);
    console.log('Detected Emotion:', result.detectedEmotion);
    
    if (result.error) {
      console.log('⚠️ Warning:', result.error);
    }
    
  } catch (error) {
    console.error('❌ Conversation generation failed:', error.message);
    console.error('Full error:', error);
  }
}

testConversationFix();