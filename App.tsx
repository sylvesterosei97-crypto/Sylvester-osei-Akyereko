import React, { useState, useEffect, useRef } from 'react';
import { Chat } from '@google/genai';
import { Message, Role } from './types';
import { createChat } from './services/geminiService';
import { Header } from './components/Header';
import { ChatBubble } from './components/ChatBubble';
import { MessageInput } from './components/MessageInput';
import { CallView } from './components/CallView';
import { SignInView } from './components/SignInView';
import { StatusView } from './components/StatusView';
import { SendMediaView } from './components/SendMediaView';
import { sendMediaMessage } from './services/messagingService';

interface Status {
    data: string;
    type: string;
    timestamp: number;
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [chat, setChat] = useState<Chat | null>(null);
  const [isCalling, setIsCalling] = useState(false);
  const [callMode, setCallMode] = useState<'audio' | 'video' | null>(null);
  const [status, setStatus] = useState<Status | null>(null);
  const [isStatusViewOpen, setIsStatusViewOpen] = useState(false);
  const [isSendMediaViewOpen, setIsSendMediaViewOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const storedAuthStatus = localStorage.getItem('isAuthenticated');
    if (storedAuthStatus === 'true') {
      setIsAuthenticated(true);
      
      const storedProfilePicture = localStorage.getItem('profilePicture');
      if (storedProfilePicture) {
          setProfilePicture(storedProfilePicture);
      }

      const storedStatus = localStorage.getItem('statusUpdate');
      if (storedStatus) {
        const parsedStatus: Status = JSON.parse(storedStatus);
        // Status expires after 24 hours
        if (Date.now() - parsedStatus.timestamp < 24 * 60 * 60 * 1000) {
            setStatus(parsedStatus);
        } else {
            localStorage.removeItem('statusUpdate');
        }
      }
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
        setChat(createChat());
        setMessages([
            {
                id: 'initial-message',
                role: Role.MODEL,
                text: "Hello! I'm HITMi, your friendly guide. How can I help you today?",
                timestamp: Date.now(),
            }
        ]);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSignInSuccess = () => {
    localStorage.setItem('isAuthenticated', 'true');
    setIsAuthenticated(true);
  };

  const handleSignOut = () => {
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('profilePicture');
    localStorage.removeItem('statusUpdate');
    setIsAuthenticated(false);
    setProfilePicture(null);
    setStatus(null);
    setMessages([]);
    setChat(null);
  }
  
  const handleSetProfilePicture = (base64: string) => {
      localStorage.setItem('profilePicture', base64);
      setProfilePicture(base64);
  }

  const handleSetStatus = (file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
        const newStatus: Status = {
            data: reader.result as string,
            type: file.type,
            timestamp: Date.now(),
        };
        localStorage.setItem('statusUpdate', JSON.stringify(newStatus));
        setStatus(newStatus);
        setIsStatusViewOpen(false); // Close view after setting status
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteStatus = () => {
      localStorage.removeItem('statusUpdate');
      setStatus(null);
      setIsStatusViewOpen(false); // Close view after deleting status
  }

  const handleSendMessage = async (text: string) => {
    if (!chat) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: Role.USER,
      text,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
        const responseStream = await chat.sendMessageStream({ message: text });
        let modelResponseText = '';
        const modelMessageId = `model-${Date.now()}`;
        
        setMessages((prev) => [
            ...prev,
            {
                id: modelMessageId,
                role: Role.MODEL,
                text: '',
                timestamp: Date.now(),
            },
        ]);

        for await (const chunk of responseStream) {
            modelResponseText += chunk.text;
            setMessages((prev) =>
                prev.map((msg) =>
                    msg.id === modelMessageId ? { ...msg, text: modelResponseText } : msg
                )
            );
        }

    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: Role.MODEL,
        text: 'Sorry, something went wrong. Please try again.',
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSendMedia = async (recipient: string, mediaData: string, mediaType: Message['mediaType']) => {
    try {
      await sendMediaMessage(recipient, mediaType!);
      
      const mediaMessage: Message = {
        id: `media-${Date.now()}`,
        role: Role.USER,
        text: `Sent ${mediaType} to ${recipient}`,
        timestamp: Date.now(),
        mediaData: mediaData,
        mediaType: mediaType,
      };
      setMessages((prev) => [...prev, mediaMessage]);
      setIsSendMediaViewOpen(false);
    } catch (error) {
       console.error("Failed to send media:", error);
       // Here you could show an error to the user in the SendMediaView
       throw error;
    }
  };

  const handleStartAudioCall = () => {
    setCallMode('audio');
    setIsCalling(true);
  };

  const handleStartVideoCall = () => {
    setCallMode('video');
    setIsCalling(true);
  };
  
  const handleEndCall = (transcriptionHistory: string[]) => {
      if(transcriptionHistory.length > 0) {
        const transcriptionText = "Here's a summary of our call:\n```\n" + transcriptionHistory.join('\n') + "\n```";
        const transcriptionMessage: Message = {
            id: `call-summary-${Date.now()}`,
            role: Role.MODEL,
            text: transcriptionText,
            timestamp: Date.now(),
        };
        setMessages(prev => [...prev, transcriptionMessage]);
      }
      setCallMode(null);
      setIsCalling(false);
  };

  if (!isAuthenticated) {
    return <SignInView onSignInSuccess={handleSignInSuccess} />;
  }

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-gray-200 font-sans">
        <Header 
            onStartAudioCall={handleStartAudioCall} 
            onStartVideoCall={handleStartVideoCall} 
            onSignOut={handleSignOut}
            isCalling={isCalling} 
            isAuthenticated={isAuthenticated}
            profilePicture={profilePicture}
            onSetProfilePicture={handleSetProfilePicture}
            onOpenStatusView={() => setIsStatusViewOpen(true)}
            hasStatus={!!status}
        />
        <main className="flex-1 overflow-y-auto p-4">
            <div className="max-w-4xl mx-auto">
                {messages.map((message) => (
                    <ChatBubble key={message.id} message={message} profilePicture={profilePicture} />
                ))}
                <div ref={messagesEndRef} />
            </div>
        </main>
        <MessageInput onSendMessage={handleSendMessage} isLoading={isLoading} onOpenSendMedia={() => setIsSendMediaViewOpen(true)} />
        {isCalling && callMode && <CallView mode={callMode} onEndCall={handleEndCall} />}
        {isStatusViewOpen && (
            <StatusView
                status={status}
                profilePicture={profilePicture}
                onClose={() => setIsStatusViewOpen(false)}
                onSetStatus={handleSetStatus}
                onDeleteStatus={handleDeleteStatus}
            />
        )}
        {isSendMediaViewOpen && (
            <SendMediaView 
              onClose={() => setIsSendMediaViewOpen(false)}
              onSend={handleSendMedia}
            />
        )}
    </div>
  );
}

export default App;