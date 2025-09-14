import { supabase, Database } from '../supabase';
import { DatabaseUtils, DatabaseError } from '../connection';

export interface Message {
  id: string;
  session_id: string;
  user_id: string;
  speaker: 'user' | 'numa' | 'system';
  content: string;
  emotion?: string;
  emotion_confidence?: number;
  timestamp: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export class MessageRepository {
  /**
   * Create a new message
   */
  static async create(messageData: Database['public']['Tables']['messages']['Insert']): Promise<Message> {
    try {
      if (!DatabaseUtils.isValidUUID(messageData.user_id)) {
        throw new DatabaseError('Invalid user ID format');
      }

      if (!DatabaseUtils.isValidUUID(messageData.session_id)) {
        throw new DatabaseError('Invalid session ID format');
      }

      const response = await supabase
        .from('messages')
        .insert(messageData)
        .select()
        .single();

      return DatabaseUtils.parseResponse(response, 'message creation');
    } catch (error) {
      console.error('Error creating message:', error);
      throw error;
    }
  }

  /**
   * Get messages by session ID
   */
  static async findBySessionId(
    sessionId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<Message[]> {
    try {
      if (!DatabaseUtils.isValidUUID(sessionId)) {
        throw new DatabaseError('Invalid session ID format');
      }

      const response = await supabase
        .from('messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('timestamp', { ascending: true })
        .range(offset, offset + limit - 1);

      return DatabaseUtils.parseResponse(response, 'messages lookup by session');
    } catch (error) {
      console.error('Error finding messages by session ID:', error);
      throw error;
    }
  }

  /**
   * Get messages by user ID across all sessions
   */
  static async findByUserId(
    userId: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<Message[]> {
    try {
      if (!DatabaseUtils.isValidUUID(userId)) {
        throw new DatabaseError('Invalid user ID format');
      }

      const response = await supabase
        .from('messages')
        .select('*')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false })
        .range(offset, offset + limit - 1);

      return DatabaseUtils.parseResponse(response, 'messages lookup by user');
    } catch (error) {
      console.error('Error finding messages by user ID:', error);
      throw error;
    }
  }

  /**
   * Get recent messages for conversation context
   */
  static async getRecentMessages(
    sessionId: string,
    count: number = 10
  ): Promise<Message[]> {
    try {
      if (!DatabaseUtils.isValidUUID(sessionId)) {
        throw new DatabaseError('Invalid session ID format');
      }

      const response = await supabase
        .from('messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('timestamp', { ascending: false })
        .limit(count);

      const messages = DatabaseUtils.parseResponse(response, 'recent messages lookup');
      
      // Return in chronological order (oldest first)
      return messages.reverse();
    } catch (error) {
      console.error('Error getting recent messages:', error);
      throw error;
    }
  }

  /**
   * Get conversation history for AI context
   */
  static async getConversationHistory(
    userId: string,
    sessionId?: string,
    maxMessages: number = 20
  ): Promise<Array<{ speaker: string; content: string; timestamp: string }>> {
    try {
      if (!DatabaseUtils.isValidUUID(userId)) {
        throw new DatabaseError('Invalid user ID format');
      }

      let query = supabase
        .from('messages')
        .select('speaker, content, timestamp')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false })
        .limit(maxMessages);

      // If session ID provided, get messages from that session
      if (sessionId) {
        if (!DatabaseUtils.isValidUUID(sessionId)) {
          throw new DatabaseError('Invalid session ID format');
        }
        query = query.eq('session_id', sessionId);
      }

      const response = await query;
      const messages = DatabaseUtils.parseResponse(response, 'conversation history lookup');
      
      // Return in chronological order (oldest first)
      return messages.reverse();
    } catch (error) {
      console.error('Error getting conversation history:', error);
      throw error;
    }
  }

  /**
   * Create a pair of messages (user + AI response)
   */
  static async createConversationPair(
    sessionId: string,
    userId: string,
    userMessage: string,
    aiResponse: string,
    emotion?: string,
    emotionConfidence?: number,
    metadata?: Record<string, any>
  ): Promise<{ userMessage: Message; aiMessage: Message }> {
    try {
      const timestamp = new Date().toISOString();

      // Create user message
      const userMessageData: Database['public']['Tables']['messages']['Insert'] = {
        session_id: sessionId,
        user_id: userId,
        speaker: 'user',
        content: DatabaseUtils.sanitizeInput(userMessage),
        timestamp,
        metadata: metadata || {}
      };

      // Create AI message
      const aiMessageData: Database['public']['Tables']['messages']['Insert'] = {
        session_id: sessionId,
        user_id: userId,
        speaker: 'numa',
        content: DatabaseUtils.sanitizeInput(aiResponse),
        emotion,
        emotion_confidence: emotionConfidence,
        timestamp: new Date(Date.now() + 1000).toISOString(), // 1 second later
        metadata: metadata || {}
      };

      // Insert both messages
      const [userMsg, aiMsg] = await Promise.all([
        this.create(userMessageData),
        this.create(aiMessageData)
      ]);

      return {
        userMessage: userMsg,
        aiMessage: aiMsg
      };
    } catch (error) {
      console.error('Error creating conversation pair:', error);
      throw error;
    }
  }

  /**
   * Update message metadata
   */
  static async updateMetadata(
    id: string,
    metadata: Record<string, any>
  ): Promise<Message> {
    try {
      if (!DatabaseUtils.isValidUUID(id)) {
        throw new DatabaseError('Invalid message ID format');
      }

      const response = await supabase
        .from('messages')
        .update({ metadata })
        .eq('id', id)
        .select()
        .single();

      return DatabaseUtils.parseResponse(response, 'message metadata update');
    } catch (error) {
      console.error('Error updating message metadata:', error);
      throw error;
    }
  }

  /**
   * Get message statistics for a user
   */
  static async getMessageStats(userId: string): Promise<{
    totalMessages: number;
    userMessages: number;
    aiMessages: number;
    averageMessageLength: number;
    mostCommonEmotion: string | null;
  }> {
    try {
      if (!DatabaseUtils.isValidUUID(userId)) {
        throw new DatabaseError('Invalid user ID format');
      }

      // Get total messages
      const totalResponse = await supabase
        .from('messages')
        .select('id', { count: 'exact' })
        .eq('user_id', userId);

      // Get user messages
      const userResponse = await supabase
        .from('messages')
        .select('id', { count: 'exact' })
        .eq('user_id', userId)
        .eq('speaker', 'user');

      // Get AI messages
      const aiResponse = await supabase
        .from('messages')
        .select('id', { count: 'exact' })
        .eq('user_id', userId)
        .eq('speaker', 'numa');

      // Get message lengths for average
      const lengthResponse = await supabase
        .from('messages')
        .select('content')
        .eq('user_id', userId);

      // Get emotions for most common
      const emotionResponse = await supabase
        .from('messages')
        .select('emotion')
        .eq('user_id', userId)
        .not('emotion', 'is', null);

      const totalMessages = totalResponse.count || 0;
      const userMessages = userResponse.count || 0;
      const aiMessages = aiResponse.count || 0;

      // Calculate average message length
      const messages = lengthResponse.data || [];
      const totalLength = messages.reduce((sum, msg) => sum + (msg.content?.length || 0), 0);
      const averageMessageLength = messages.length > 0 ? Math.round(totalLength / messages.length) : 0;

      // Find most common emotion
      const emotions = emotionResponse.data?.map(m => m.emotion).filter(e => e !== null) || [];
      const emotionCounts: Record<string, number> = {};
      emotions.forEach(emotion => {
        if (emotion) {
          emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
        }
      });

      const mostCommonEmotion = Object.keys(emotionCounts).length > 0
        ? Object.keys(emotionCounts).reduce((a, b) => emotionCounts[a] > emotionCounts[b] ? a : b)
        : null;

      return {
        totalMessages,
        userMessages,
        aiMessages,
        averageMessageLength,
        mostCommonEmotion,
      };
    } catch (error) {
      console.error('Error getting message stats:', error);
      throw error;
    }
  }

  /**
   * Delete messages by session ID
   */
  static async deleteBySessionId(sessionId: string): Promise<void> {
    try {
      if (!DatabaseUtils.isValidUUID(sessionId)) {
        throw new DatabaseError('Invalid session ID format');
      }

      const response = await supabase
        .from('messages')
        .delete()
        .eq('session_id', sessionId);

      if (response.error) {
        DatabaseUtils.handleError(response.error, 'messages deletion');
      }
    } catch (error) {
      console.error('Error deleting messages by session ID:', error);
      throw error;
    }
  }

  /**
   * Find message by ID
   */
  static async findById(id: string): Promise<Message | null> {
    try {
      if (!DatabaseUtils.isValidUUID(id)) {
        throw new DatabaseError('Invalid message ID format');
      }

      const response = await supabase
        .from('messages')
        .select('*')
        .eq('id', id)
        .single();

      if (response.error && response.error.code === 'PGRST116') {
        // No rows returned
        return null;
      }

      return DatabaseUtils.parseResponse(response, 'message lookup');
    } catch (error) {
      console.error('Error finding message by ID:', error);
      throw error;
    }
  }
}