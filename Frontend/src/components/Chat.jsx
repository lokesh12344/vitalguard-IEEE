import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import api, { socketService } from '../services/api';
import { 
  MessageCircle, 
  X, 
  Send, 
  User, 
  Clock,
  Check,
  CheckCheck,
  ChevronLeft
} from 'lucide-react';

const Chat = ({ isOpen, onClose, currentUser }) => {
  const [contacts, setContacts] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [typingUser, setTypingUser] = useState(null);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load contacts and conversations when chat opens
  useEffect(() => {
    if (isOpen && currentUser?.id) {
      loadContacts();
      loadConversations();
      loadUnreadCount();

      // Subscribe to personal chat room
      const socket = socketService.getSocket();
      if (socket) {
        socket.emit('subscribe_chat', { user_id: currentUser.id });

        // Listen for incoming messages
        socket.on('chat:message', handleIncomingMessage);
        socket.on('chat:typing', handleTyping);
        socket.on('chat:stop_typing', handleStopTyping);
        socket.on('chat:read', handleMessageRead);
      }

      return () => {
        if (socket) {
          socket.off('chat:message', handleIncomingMessage);
          socket.off('chat:typing', handleTyping);
          socket.off('chat:stop_typing', handleStopTyping);
          socket.off('chat:read', handleMessageRead);
          socket.emit('unsubscribe_chat', { user_id: currentUser.id });
        }
      };
    }
  }, [isOpen, currentUser?.id]);

  const handleIncomingMessage = (data) => {
    console.log('📩 Incoming chat message:', data);
    // If the message is from the currently selected contact, add it to messages
    if (selectedContact && data.sender_id === selectedContact.id) {
      setMessages(prev => [...prev, {
        id: data.id || Date.now(),
        senderId: data.sender_id,
        receiverId: data.receiver_id,
        senderName: data.sender_name || selectedContact.name,
        message: data.message,
        timestamp: data.timestamp || new Date().toISOString(),
        status: 'delivered'
      }]);
      // Mark as read
      api.markMessagesAsRead(currentUser.id, data.sender_id);
    } else {
      // Update unread count
      setUnreadCount(prev => prev + 1);
    }
    // Refresh conversations list
    loadConversations();
  };

  const handleTyping = (data) => {
    if (selectedContact && data.sender_id === selectedContact.id) {
      setTypingUser(data.sender_name);
    }
  };

  const handleStopTyping = (data) => {
    if (selectedContact && data.sender_id === selectedContact.id) {
      setTypingUser(null);
    }
  };

  const handleMessageRead = (data) => {
    // Update message status to read
    if (data.reader_id === selectedContact?.id) {
      setMessages(prev => prev.map(msg => 
        msg.senderId === currentUser.id ? { ...msg, status: 'read' } : msg
      ));
    }
  };

  const loadContacts = async () => {
    try {
      const data = await api.getChatContacts(currentUser.id);
      setContacts(data || []);
    } catch (error) {
      console.error('Failed to load contacts:', error);
    }
  };

  const loadConversations = async () => {
    try {
      const data = await api.getChatConversations(currentUser.id);
      setConversations(data || []);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    }
  };

  const loadUnreadCount = async () => {
    try {
      const data = await api.getUnreadMessageCount(currentUser.id);
      setUnreadCount(data?.unread_count || 0);
    } catch (error) {
      console.error('Failed to load unread count:', error);
    }
  };

  const selectContact = async (contact) => {
    setSelectedContact(contact);
    setLoading(true);
    try {
      const data = await api.getChatMessages(currentUser.id, contact.id);
      const formattedMessages = (data || []).map(msg => ({
        id: msg.id,
        senderId: msg.sender_id,
        receiverId: msg.receiver_id,
        senderName: msg.sender_name,
        message: msg.message,
        timestamp: msg.timestamp,
        status: msg.status?.toLowerCase() || 'sent'
      }));
      setMessages(formattedMessages);
      
      // Mark messages as read
      await api.markMessagesAsRead(currentUser.id, contact.id);
      loadUnreadCount();
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedContact) return;

    const tempMessage = {
      id: Date.now(),
      senderId: currentUser.id,
      receiverId: selectedContact.id,
      message: newMessage,
      timestamp: new Date().toISOString(),
      status: 'sending'
    };

    // Optimistically add message
    setMessages(prev => [...prev, tempMessage]);
    setNewMessage('');

    // Stop typing indicator
    const socket = socketService.getSocket();
    if (socket) {
      socket.emit('stop_typing', {
        receiver_id: selectedContact.id,
        sender_id: currentUser.id
      });
    }

    try {
      const response = await api.sendChatMessage(
        currentUser.id,
        selectedContact.id,
        tempMessage.message
      );
      
      // Update message with server response
      setMessages(prev => prev.map(msg => 
        msg.id === tempMessage.id 
          ? { ...msg, id: response.id, status: 'sent' }
          : msg
      ));
    } catch (error) {
      console.error('Failed to send message:', error);
      // Mark as failed
      setMessages(prev => prev.map(msg =>
        msg.id === tempMessage.id
          ? { ...msg, status: 'failed' }
          : msg
      ));
    }
  };

  const handleTypingIndicator = (e) => {
    setNewMessage(e.target.value);
    
    const socket = socketService.getSocket();
    if (socket && selectedContact) {
      // Clear previous timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Send typing indicator
      socket.emit('typing', {
        receiver_id: selectedContact.id,
        sender_id: currentUser.id,
        sender_name: currentUser.name
      });

      // Stop typing after 2 seconds of no input
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('stop_typing', {
          receiver_id: selectedContact.id,
          sender_id: currentUser.id
        });
      }, 2000);
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getRoleBadge = (role) => {
    const colors = {
      doctor: 'bg-blue-100 text-blue-700',
      caretaker: 'bg-purple-100 text-purple-700',
      patient: 'bg-green-100 text-green-700'
    };
    return colors[role?.toLowerCase()] || 'bg-gray-100 text-gray-700';
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'read':
        return <CheckCheck className="w-3 h-3 text-blue-500" />;
      case 'delivered':
      case 'sent':
        return <Check className="w-3 h-3 text-gray-400" />;
      case 'sending':
        return <Clock className="w-3 h-3 text-gray-300 animate-pulse" />;
      default:
        return null;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-3xl h-[600px] flex flex-col bg-white dark:bg-gray-900 shadow-2xl">
        {/* Header */}
        <CardHeader className="border-b flex flex-row items-center justify-between py-3 px-4">
          <div className="flex items-center gap-3">
            {selectedContact && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setSelectedContact(null)}
                className="md:hidden"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
            )}
            <MessageCircle className="w-5 h-5 text-blue-500" />
            <CardTitle className="text-lg">
              {selectedContact ? selectedContact.name : 'Messages'}
            </CardTitle>
            {selectedContact && (
              <Badge className={getRoleBadge(selectedContact.role)}>
                {selectedContact.role}
              </Badge>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </CardHeader>

        <div className="flex flex-1 overflow-hidden">
          {/* Contacts/Conversations List */}
          <div className={`w-full md:w-1/3 border-r overflow-y-auto ${selectedContact ? 'hidden md:block' : ''}`}>
            {/* Contacts Section */}
            <div className="p-3 border-b bg-gray-50 dark:bg-gray-800">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-300">Contacts</h3>
            </div>
            {contacts.length > 0 ? (
              <div className="divide-y">
                {contacts.map(contact => (
                  <div
                    key={contact.id}
                    onClick={() => selectContact(contact)}
                    className={`p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                      selectedContact?.id === contact.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-medium">
                        {contact.name?.charAt(0) || 'U'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-sm truncate">{contact.name}</p>
                          <Badge variant="outline" className={`text-xs ${getRoleBadge(contact.role)}`}>
                            {contact.role}
                          </Badge>
                        </div>
                        {contact.email && (
                          <p className="text-xs text-gray-500 truncate">{contact.email}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center text-gray-500 text-sm">
                No contacts available
              </div>
            )}
          </div>

          {/* Messages Area */}
          <div className={`flex-1 flex flex-col ${!selectedContact ? 'hidden md:flex' : ''}`}>
            {selectedContact ? (
              <>
                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 dark:bg-gray-950">
                  {loading ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    </div>
                  ) : messages.length > 0 ? (
                    <>
                      {messages.map((msg, index) => {
                        const isMine = msg.senderId === currentUser.id;
                        const showDate = index === 0 || 
                          formatDate(msg.timestamp) !== formatDate(messages[index - 1]?.timestamp);
                        
                        return (
                          <React.Fragment key={msg.id}>
                            {showDate && (
                              <div className="text-center my-3">
                                <span className="text-xs text-gray-500 bg-white dark:bg-gray-800 px-3 py-1 rounded-full">
                                  {formatDate(msg.timestamp)}
                                </span>
                              </div>
                            )}
                            <div className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                              <div className={`max-w-[75%] ${
                                isMine 
                                  ? 'bg-blue-500 text-white rounded-l-xl rounded-tr-xl' 
                                  : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-r-xl rounded-tl-xl shadow-sm'
                              } px-4 py-2`}>
                                {!isMine && msg.senderName && (
                                  <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1">
                                    {msg.senderName}
                                  </p>
                                )}
                                <p className="text-sm whitespace-pre-wrap break-words">{msg.message}</p>
                                <div className={`flex items-center justify-end gap-1 mt-1 ${
                                  isMine ? 'text-blue-100' : 'text-gray-400'
                                }`}>
                                  <span className="text-xs">{formatTime(msg.timestamp)}</span>
                                  {isMine && getStatusIcon(msg.status)}
                                </div>
                              </div>
                            </div>
                          </React.Fragment>
                        );
                      })}
                      {typingUser && (
                        <div className="flex justify-start">
                          <div className="bg-gray-200 dark:bg-gray-700 px-4 py-2 rounded-xl">
                            <div className="flex items-center gap-1">
                              <span className="text-sm text-gray-600 dark:text-gray-300">
                                {typingUser} is typing
                              </span>
                              <span className="flex gap-1">
                                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></span>
                                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></span>
                                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                      <div ref={messagesEndRef} />
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500">
                      <MessageCircle className="w-12 h-12 mb-2 opacity-20" />
                      <p className="text-sm">No messages yet</p>
                      <p className="text-xs">Start a conversation with {selectedContact.name}</p>
                    </div>
                  )}
                </div>

                {/* Input Area */}
                <div className="p-3 border-t bg-white dark:bg-gray-900">
                  <div className="flex gap-2">
                    <Input
                      value={newMessage}
                      onChange={handleTypingIndicator}
                      onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                      placeholder="Type a message..."
                      className="flex-1"
                    />
                    <Button 
                      onClick={sendMessage} 
                      disabled={!newMessage.trim()}
                      className="bg-blue-500 hover:bg-blue-600"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
                <MessageCircle className="w-16 h-16 mb-4 opacity-20" />
                <p className="text-lg font-medium">Select a conversation</p>
                <p className="text-sm">Choose a contact to start messaging</p>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};

// Chat Button Component for Dashboard Layouts
export const ChatButton = ({ onClick, unreadCount = 0 }) => {
  return (
    <Button
      onClick={onClick}
      variant="outline"
      className="relative flex items-center gap-2 bg-white dark:bg-gray-800 hover:bg-gray-50"
    >
      <MessageCircle className="w-5 h-5" />
      <span className="hidden sm:inline">Messages</span>
      {unreadCount > 0 && (
        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </Button>
  );
};

export default Chat;
