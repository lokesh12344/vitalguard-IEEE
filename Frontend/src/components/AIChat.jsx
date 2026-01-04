import React, { useState, useRef, useEffect } from 'react';
import { 
  MessageCircle, 
  Send, 
  X, 
  Bot, 
  User, 
  Loader2, 
  AlertCircle,
  Apple,
  Heart,
  Zap,
  Shield,
  Sparkles,
  Minimize2,
  Maximize2,
  Activity,
  FileText,
  Upload,
  CheckCircle
} from 'lucide-react';
import chatService from '../services/chatService';
import { api } from '../services/api';

// Quick action buttons for common queries
const quickActions = [
  { 
    id: 'diabetes', 
    label: 'Diabetes Diet', 
    icon: Apple, 
    color: 'bg-orange-100 text-orange-700 hover:bg-orange-200',
    action: 'getDiabetesDiet'
  },
  { 
    id: 'hypertension', 
    label: 'BP Diet', 
    icon: Heart, 
    color: 'bg-red-100 text-red-700 hover:bg-red-200',
    action: 'getHypertensionDiet'
  },
  { 
    id: 'immunity', 
    label: 'Immunity Juices', 
    icon: Shield, 
    color: 'bg-green-100 text-green-700 hover:bg-green-200',
    action: 'getImmunityJuices'
  },
  { 
    id: 'energy', 
    label: 'Energy Boost', 
    icon: Zap, 
    color: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200',
    action: 'getEnergyJuices'
  },
];

// Sample suggested prompts
const suggestedPrompts = [
  "What foods should I eat for better heart health?",
  "Suggest juices for improving digestion",
  "What is a normal blood pressure reading?",
  "Diet tips for managing cholesterol",
  "Natural remedies for better sleep",
];

export default function AIChat({ patientContext = null, patientId = null }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hello! I'm VitalGuard AI, your health assistant. I can help you with:\n\n• Diet recommendations for various conditions\n• Healthy juice and smoothie suggestions\n• Understanding your vital signs\n• **📄 Analyzing medical reports** - Upload a PDF and I'll explain it simply!\n• General wellness advice\n\nHow can I assist you today?"
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(null);
  const [error, setError] = useState(null);
  const [streamingMessage, setStreamingMessage] = useState('');
  const [vitals, setVitals] = useState(null);
  const [vitalsLoading, setVitalsLoading] = useState(false);
  const [vitalsFetched, setVitalsFetched] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);

  // Format vitals for display
  const formatVitalsMessage = (vitalsData) => {
    if (!vitalsData) return null;
    
    const hr = vitalsData.heart_rate?.value || vitalsData.heart_rate || 'N/A';
    const spo2 = vitalsData.spo2?.value || vitalsData.spo2 || 'N/A';
    const temp = vitalsData.temperature?.value || vitalsData.temperature || 'N/A';
    const bpSys = vitalsData.blood_pressure?.systolic || vitalsData.blood_pressure_systolic || 'N/A';
    const bpDia = vitalsData.blood_pressure?.diastolic || vitalsData.blood_pressure_diastolic || 'N/A';
    
    return `📊 **Your Current Vitals:**\n\n❤️ Heart Rate: ${hr} bpm\n🫁 SpO2: ${spo2}%\n🌡️ Temperature: ${temp}°F\n🩸 Blood Pressure: ${bpSys}/${bpDia} mmHg\n\nI can analyze these readings and provide health recommendations. Feel free to ask me anything!`;
  };

  // Generate context string for AI from vitals
  const generateVitalsContext = (vitalsData) => {
    if (!vitalsData) return patientContext;
    
    const hr = vitalsData.heart_rate?.value || vitalsData.heart_rate || 'unknown';
    const spo2 = vitalsData.spo2?.value || vitalsData.spo2 || 'unknown';
    const temp = vitalsData.temperature?.value || vitalsData.temperature || 'unknown';
    const bpSys = vitalsData.blood_pressure?.systolic || vitalsData.blood_pressure_systolic || 'unknown';
    const bpDia = vitalsData.blood_pressure?.diastolic || vitalsData.blood_pressure_diastolic || 'unknown';
    
    return `Patient vitals - Heart Rate: ${hr} bpm, SpO2: ${spo2}%, Temperature: ${temp}°F, Blood Pressure: ${bpSys}/${bpDia} mmHg. ${patientContext || ''}`;
  };

  // Check Ollama connection status
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const status = await chatService.checkStatus();
        setIsConnected(status.connected);
        if (!status.connected) {
          setError('AI service is offline. Please ensure Ollama is running.');
        } else {
          setError(null);
        }
      } catch (err) {
        setIsConnected(false);
        setError('Cannot connect to AI service.');
      }
    };

    if (isOpen) {
      checkConnection();
    }
  }, [isOpen]);

  // Fetch patient vitals when chat opens (one-time fetch)
  useEffect(() => {
    const fetchVitals = async () => {
      if (!patientId || vitalsFetched) return;
      
      setVitalsLoading(true);
      try {
        const vitalsData = await api.getCurrentVitals(patientId);
        setVitals(vitalsData);
        setVitalsFetched(true);
        
        // Add vitals message to chat
        const vitalsMessage = formatVitalsMessage(vitalsData);
        if (vitalsMessage) {
          setMessages(prev => [
            ...prev,
            {
              role: 'assistant',
              content: vitalsMessage,
              isVitals: true
            }
          ]);
        }
      } catch (err) {
        console.error('Failed to fetch vitals:', err);
        // Don't show error to user, just continue without vitals
      } finally {
        setVitalsLoading(false);
      }
    };

    if (isOpen && patientId && !vitalsFetched) {
      fetchVitals();
    }
  }, [isOpen, patientId, vitalsFetched]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingMessage]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && !isMinimized) {
      inputRef.current?.focus();
    }
  }, [isOpen, isMinimized]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setError(null);
    
    // Add user message
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);
    setStreamingMessage('');

    try {
      // Get conversation history (last 10 messages for context)
      const history = messages.slice(-10).map(m => ({
        role: m.role,
        content: m.content
      }));

      // Use streaming for better UX - include vitals context
      const contextWithVitals = generateVitalsContext(vitals);
      const finalResponse = await chatService.streamMessage(
        userMessage,
        history,
        contextWithVitals,
        (chunk, fullText) => {
          setStreamingMessage(fullText);
        }
      );

      // Add final response
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: finalResponse || 'I apologize, but I could not generate a response. Please try again.'
      }]);
      setStreamingMessage('');
    } catch (err) {
      console.error('Chat error:', err);
      setError(err.message || 'Failed to get response');
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'I encountered an error. Please make sure Ollama is running and try again.'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAction = async (action) => {
    if (isLoading) return;
    
    setIsLoading(true);
    setError(null);

    try {
      let response;
      let queryLabel;

      switch (action) {
        case 'getDiabetesDiet':
          queryLabel = 'Diet recommendations for diabetes';
          response = await chatService.getDiabetesDiet();
          setMessages(prev => [
            ...prev, 
            { role: 'user', content: queryLabel },
            { role: 'assistant', content: response.recommendation }
          ]);
          break;
        case 'getHypertensionDiet':
          queryLabel = 'Diet recommendations for hypertension';
          response = await chatService.getHypertensionDiet();
          setMessages(prev => [
            ...prev, 
            { role: 'user', content: queryLabel },
            { role: 'assistant', content: response.recommendation }
          ]);
          break;
        case 'getImmunityJuices':
          queryLabel = 'Juices for boosting immunity';
          response = await chatService.getImmunityJuices();
          setMessages(prev => [
            ...prev, 
            { role: 'user', content: queryLabel },
            { role: 'assistant', content: response.suggestions }
          ]);
          break;
        case 'getEnergyJuices':
          queryLabel = 'Juices for energy boost';
          response = await chatService.getEnergyJuices();
          setMessages(prev => [
            ...prev, 
            { role: 'user', content: queryLabel },
            { role: 'assistant', content: response.suggestions }
          ]);
          break;
        default:
          break;
      }
    } catch (err) {
      setError(err.message || 'Failed to get recommendation');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestedPrompt = (prompt) => {
    setInput(prompt);
    inputRef.current?.focus();
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Handle PDF file selection
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        setError('Please select a PDF file');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB');
        return;
      }
      setSelectedFile(file);
      setError(null);
    }
  };

  // Handle PDF upload and analysis
  const handleUploadReport = async () => {
    if (!selectedFile || uploadingFile) return;

    setUploadingFile(true);
    setError(null);

    // Add user message showing file upload
    setMessages(prev => [...prev, { 
      role: 'user', 
      content: `📄 Uploaded report: ${selectedFile.name}`,
      isFileUpload: true
    }]);

    try {
      const response = await chatService.analyzeReport(selectedFile);
      
      // Add AI analysis response
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: response.analysis,
        isReportAnalysis: true
      }]);
      
      // Clear selected file
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      console.error('Report analysis error:', err);
      setError(err.message || 'Failed to analyze report');
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `❌ Sorry, I couldn't analyze the report. ${err.message || 'Please try again.'}`
      }]);
    } finally {
      setUploadingFile(false);
    }
  };

  // Cancel file selection
  const handleCancelFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Floating chat button
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center text-white hover:scale-110 z-50"
        title="Chat with VitalGuard AI"
      >
        <MessageCircle className="w-6 h-6" />
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white animate-pulse"></span>
      </button>
    );
  }

  return (
    <div 
      className={`fixed bottom-6 right-6 bg-white rounded-2xl shadow-2xl z-50 transition-all duration-300 flex flex-col ${
        isMinimized ? 'w-80 h-14' : 'w-96 h-[600px]'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-t-2xl text-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-semibold">VitalGuard AI</h3>
            <span className="text-xs text-white/80 flex items-center gap-1">
              {isConnected === null ? (
                'Checking...'
              ) : isConnected ? (
                <>
                  <span className="w-2 h-2 bg-green-300 rounded-full"></span>
                  Online
                </>
              ) : (
                <>
                  <span className="w-2 h-2 bg-red-400 rounded-full"></span>
                  Offline
                </>
              )}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
          >
            {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Quick Actions */}
          <div className="p-3 border-b bg-gray-50 flex gap-2 overflow-x-auto">
            {quickActions.map((action) => (
              <button
                key={action.id}
                onClick={() => handleQuickAction(action.action)}
                disabled={isLoading || !isConnected}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${action.color} disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <action.icon className="w-3.5 h-3.5" />
                {action.label}
              </button>
            ))}
          </div>

          {/* Error Banner */}
          {error && (
            <div className="px-4 py-2 bg-red-50 border-b border-red-100 flex items-center gap-2 text-red-700 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{error}</span>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Vitals loading indicator */}
            {vitalsLoading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-gradient-to-r from-teal-500 to-cyan-500 text-white">
                  <Activity className="w-4 h-4 animate-pulse" />
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-2xl rounded-bl-md px-4 py-2.5">
                  <p className="text-sm text-blue-700 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Fetching your vitals...
                  </p>
                </div>
              </div>
            )}
            
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  message.role === 'user' 
                    ? 'bg-teal-100 text-teal-600' 
                    : message.isVitals
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white'
                    : 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white'
                }`}>
                  {message.role === 'user' ? <User className="w-4 h-4" /> : message.isVitals ? <Activity className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>
                <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                  message.role === 'user'
                    ? 'bg-teal-500 text-white rounded-br-md'
                    : message.isVitals
                    ? 'bg-blue-50 border border-blue-200 text-gray-800 rounded-bl-md'
                    : 'bg-gray-100 text-black rounded-bl-md'
                }`}>
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                </div>
              </div>
            ))}
            
            {/* Streaming message */}
            {streamingMessage && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-gradient-to-r from-teal-500 to-cyan-500 text-white">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="max-w-[75%] rounded-2xl rounded-bl-md px-4 py-2.5 bg-gray-100 text-black">
                  <p className="text-sm whitespace-pre-wrap">{streamingMessage}</p>
                  <span className="inline-block w-2 h-4 bg-teal-500 animate-pulse ml-1"></span>
                </div>
              </div>
            )}
            
            {/* Loading indicator */}
            {isLoading && !streamingMessage && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-gradient-to-r from-teal-500 to-cyan-500 text-white">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="bg-gray-100 rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex gap-1.5">
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Suggested Prompts */}
          {messages.length <= 1 && (
            <div className="px-4 pb-2">
              <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Try asking:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {suggestedPrompts.slice(0, 3).map((prompt, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestedPrompt(prompt)}
                    className="text-xs px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-full transition-colors truncate max-w-full"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="p-4 border-t bg-white rounded-b-2xl">
            {/* File Selection Preview */}
            {selectedFile && (
              <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2 text-blue-700">
                  <FileText className="w-5 h-5" />
                  <div>
                    <p className="text-sm font-medium truncate max-w-[180px]">{selectedFile.name}</p>
                    <p className="text-xs text-blue-500">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleUploadReport}
                    disabled={uploadingFile || !isConnected}
                    className="px-3 py-1.5 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 disabled:opacity-50 flex items-center gap-1"
                  >
                    {uploadingFile ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        Analyze
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleCancelFile}
                    disabled={uploadingFile}
                    className="p-1.5 text-gray-500 hover:text-red-500 disabled:opacity-50"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
            
            <div className="flex gap-2">
              {/* Hidden file input */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept=".pdf"
                className="hidden"
              />
              
              {/* Upload PDF Button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading || uploadingFile || !isConnected}
                className="w-10 h-10 border border-gray-200 text-gray-500 rounded-xl flex items-center justify-center hover:bg-gray-50 hover:border-teal-500 hover:text-teal-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:border-gray-200 disabled:hover:text-gray-500"
                title="Upload PDF Report"
              >
                <Upload className="w-5 h-5" />
              </button>
              
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask about diet, health tips, or upload a report..."
                disabled={isLoading || uploadingFile || !isConnected}
                className="flex-1 resize-none border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-black focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed"
                rows={1}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading || uploadingFile || !isConnected}
                className="w-10 h-10 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-xl flex items-center justify-center hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-2 text-center">
              📄 Upload PDF reports for analysis • Powered by Ollama
            </p>
          </div>
        </>
      )}
    </div>
  );
}
