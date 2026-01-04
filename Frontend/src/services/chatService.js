/**
 * VitalGuard AI Chat Service
 * 
 * Handles communication with the Ollama-powered AI health assistant
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

class ChatService {
  constructor() {
    this.baseUrl = `${API_BASE_URL}/api/ai-chat`;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Request failed' }));
        throw new Error(error.detail || `HTTP ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`Chat API Error [${endpoint}]:`, error);
      throw error;
    }
  }

  /**
   * Check if Ollama service is available
   */
  async checkStatus() {
    return this.request('/status');
  }

  /**
   * Send a message to the AI assistant
   * @param {string} message - User's message
   * @param {Array} conversationHistory - Previous messages for context
   * @param {string} patientContext - Optional patient vital signs context
   */
  async sendMessage(message, conversationHistory = [], patientContext = null) {
    return this.request('/message', {
      method: 'POST',
      body: JSON.stringify({
        message,
        conversation_history: conversationHistory,
        patient_context: patientContext
      })
    });
  }

  /**
   * Stream a response from the AI assistant
   * @param {string} message - User's message
   * @param {Array} conversationHistory - Previous messages
   * @param {string} patientContext - Optional context
   * @param {function} onChunk - Callback for each chunk received
   */
  async streamMessage(message, conversationHistory = [], patientContext = null, onChunk) {
    const url = `${this.baseUrl}/stream`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          conversation_history: conversationHistory,
          patient_context: patientContext
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              return fullResponse;
            }
            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                fullResponse += parsed.content;
                if (onChunk) {
                  onChunk(parsed.content, fullResponse);
                }
              }
            } catch (e) {
              // Ignore parse errors for incomplete chunks
            }
          }
        }
      }

      return fullResponse;
    } catch (error) {
      console.error('Stream error:', error);
      throw error;
    }
  }

  /**
   * Get diet recommendations for a specific condition
   * @param {string} condition - Health condition
   */
  async getDietRecommendation(condition) {
    return this.request('/diet-recommendation', {
      method: 'POST',
      body: JSON.stringify({ condition })
    });
  }

  /**
   * Get juice/smoothie suggestions for a health goal
   * @param {string} healthGoal - Health goal
   */
  async getJuiceSuggestions(healthGoal) {
    return this.request('/juice-suggestions', {
      method: 'POST',
      body: JSON.stringify({ health_goal: healthGoal })
    });
  }

  /**
   * Get explanation of a vital sign reading
   * @param {string} vitalType - Type of vital sign
   * @param {number} value - Reading value
   * @param {string} unit - Unit of measurement
   */
  async explainVital(vitalType, value, unit) {
    return this.request('/explain-vital', {
      method: 'POST',
      body: JSON.stringify({
        vital_type: vitalType,
        value,
        unit
      })
    });
  }

  // Quick action methods
  async getDiabetesDiet() {
    return this.request('/quick/diabetes-diet');
  }

  async getHypertensionDiet() {
    return this.request('/quick/hypertension-diet');
  }

  async getImmunityJuices() {
    return this.request('/quick/immunity-juices');
  }

  async getEnergyJuices() {
    return this.request('/quick/energy-juices');
  }
}

export const chatService = new ChatService();
export default chatService;
