import React, { useState, useEffect, useRef } from 'react';
import { Message, Role } from './types';
import { Header } from './components/Header';
import { ChatBubble } from './components/ChatBubble';
import { MessageInput } from './components/MessageInput';
import { SignInView } from './components/SignInView';
import { StatusView } from './components/StatusView';
import { SendMediaView } from './components/SendMediaView';
import { sendMediaMessage } from './services/messagingService';
import { ModelIcon, SignOutIcon, PlusIcon, UserIcon } from './components/Icon';

interface Status {
    data: string;
    type: string;
    timestamp: number;
}

// Helper to create a consistent, sorted key for conversations in localStorage
const getChatKey = (user1: string, user2: string): string => {
    const sorted = [user1, user2].sort();
    return `chat_history_${sorted[0]}_${sorted[1]}`;
};

function App() {
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeChatPartner, setActiveChatPartner] = useState<string | null>(null);
  const [conversations, setConversations] = useState<string[]>([]);
  const [newChatNumber, setNewChatNumber] = useState('');
  
  const [status, setStatus] = useState<Status | null>(null);
  const [isStatusViewOpen, setIsStatusViewOpen] = useState(false);
  const [isSendMediaViewOpen, setIsSendMediaViewOpen] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load initial state from localStorage
  useEffect(() => {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      setCurrentUser(storedUser);
      
      const storedProfilePicture = localStorage.getItem(`profilePicture_${storedUser}`);
      if (storedProfilePicture) {
          setProfilePicture(storedProfilePicture);
      }

      const storedStatus = localStorage.getItem(`statusUpdate_${storedUser}`);
      if (storedStatus) {
        const parsedStatus: Status = JSON.parse(storedStatus);
        if (Date.now() - parsedStatus.timestamp < 24 * 60 * 60 * 1000) {
            setStatus(parsedStatus);
        } else {
            localStorage.removeItem(`statusUpdate_${storedUser}`);
        }
      }
    }
  }, []);

  // Load conversations for the current user
  useEffect(() => {
    if (currentUser) {
      const keys = Object.keys(localStorage);
      const userConversations = new Set<string>();
      keys.forEach(key => {
        if (key.startsWith('chat_history_')) {
          const participants = key.replace('chat_history_', '').split('_');
          if (participants.includes(currentUser)) {
            const partner = participants.find(p => p !== currentUser);
            if(partner) userConversations.add(partner);
          }
        }
      });
      setConversations(Array.from(userConversations));
    }
  }, [currentUser]);

  // Load messages for the active chat
  useEffect(() => {
    if (activeChatPartner && currentUser) {
      const key = getChatKey(currentUser, activeChatPartner);
      const storedMessages = localStorage.getItem(key);
      setMessages(storedMessages ? JSON.parse(storedMessages) : []);
    } else {
      setMessages([]);
    }
  }, [activeChatPartner, currentUser]);

  // Listen for storage events to update chat in real-time across tabs
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (currentUser && activeChatPartner && event.key === getChatKey(currentUser, activeChatPartner)) {
        const newMessages = event.newValue ? JSON.parse(event.newValue) : [];
        setMessages(newMessages);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [currentUser, activeChatPartner]);

  // PWA install prompt handler
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSignInSuccess = (phoneNumber: string) => {
    localStorage.setItem('currentUser', phoneNumber);
    setCurrentUser(phoneNumber);
  };

  const handleSignOut = () => {
    localStorage.removeItem('currentUser');
    setCurrentUser(null);
    setActiveChatPartner(null);
    setProfilePicture(null);
    setStatus(null);
    setMessages([]);
  }
  
  const handleSetProfilePicture = (base64: string) => {
    if (!currentUser) return;
    localStorage.setItem(`profilePicture_${currentUser}`, base64);
    setProfilePicture(base64);
  }

  const handleSetStatus = (file: File) => {
    if (!currentUser) return;
    const reader = new FileReader();
    reader.onloadend = () => {
        const newStatus: Status = {
            data: reader.result as string,
            type: file.type,
            timestamp: Date.now(),
        };
        localStorage.setItem(`statusUpdate_${currentUser}`, JSON.stringify(newStatus));
        setStatus(newStatus);
        setIsStatusViewOpen(false);
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteStatus = () => {
    if (!currentUser) return;
    localStorage.removeItem(`statusUpdate_${currentUser}`);
    setStatus(null);
    setIsStatusViewOpen(false);
  }

  const handleSendMessage = async (text: string) => {
    if (!currentUser || !activeChatPartner) return;
    setIsLoading(true);
    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      sender: currentUser,
      recipient: activeChatPartner,
      text,
      timestamp: Date.now(),
    };
    
    const key = getChatKey(currentUser, activeChatPartner);
    const currentMessages = messages || [];
    const updatedMessages = [...currentMessages, newMessage];
    
    localStorage.setItem(key, JSON.stringify(updatedMessages));
    setMessages(updatedMessages);
    setIsLoading(false);
  };
  
  const handleSendMedia = async (recipient: string, mediaData: string, mediaType: Message['mediaType']) => {
    if (!currentUser) return;
    try {
      await sendMediaMessage(recipient, mediaType!);
      
      const mediaMessage: Message = {
        id: `media-${Date.now()}`,
        sender: currentUser,
        recipient: recipient,
        text: ``, // Media messages may not have text
        timestamp: Date.now(),
        mediaData: mediaData,
        mediaType: mediaType,
      };
      
      const key = getChatKey(currentUser, recipient);
      const storedMessages = localStorage.getItem(key);
      const currentMessages = storedMessages ? JSON.parse(storedMessages) : [];
      const updatedMessages = [...currentMessages, mediaMessage];
      localStorage.setItem(key, JSON.stringify(updatedMessages));
      
      // If the media was sent in the active chat, update the view
      if(recipient === activeChatPartner) {
        setMessages(updatedMessages);
      }
      
      setIsSendMediaViewOpen(false);
    } catch (error) {
       console.error("Failed to send media:", error);
       throw error;
    }
  };

  const handleInstallApp = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);
    setInstallPrompt(null);
  };

  const handleStartNewChat = () => {
      if(newChatNumber && /^\+?[1-9]\d{1,14}$/.test(newChatNumber)) {
          if(!conversations.includes(newChatNumber)) {
              setConversations(prev => [...prev, newChatNumber]);
          }
          setActiveChatPartner(newChatNumber);
          setNewChatNumber('');
      } else {
          alert('Please enter a valid phone number.');
      }
  };

  if (!currentUser) {
    return <SignInView onSignInSuccess={handleSignInSuccess} />;
  }

  if (!activeChatPartner) {
    return (
        <div className="flex flex-col h-screen bg-gray-900 text-gray-200 font-sans">
            <header className="bg-gray-800 shadow-md p-4 flex items-center justify-between border-b border-gray-700">
                <div className="flex items-center gap-3">
                    <ModelIcon className="h-8 w-8 text-blue-400" />
                    <h1 className="text-xl font-bold">My Chats</h1>
                </div>
                 <button onClick={handleSignOut} className="text-gray-400 hover:text-white transition-colors" aria-label="Sign Out">
                    <SignOutIcon className="h-6 w-6" />
                </button>
            </header>
            <div className="p-4 space-y-3">
                <div className="flex gap-2">
                    <input 
                        type="tel"
                        value={newChatNumber}
                        onChange={(e) => setNewChatNumber(e.target.value)}
                        placeholder="Start new chat with number..."
                        className="flex-grow bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                    <button onClick={handleStartNewChat} className="bg-blue-600 p-3 rounded-md hover:bg-blue-500 transition-colors">
                        <PlusIcon className="h-6 w-6 text-white"/>
                    </button>
                </div>
            </div>
            <main className="flex-1 overflow-y-auto">
                {conversations.length > 0 ? (
                    <ul>
                        {conversations.map(partner => (
                            <li key={partner}>
                                <button onClick={() => setActiveChatPartner(partner)} className="w-full text-left p-4 flex items-center gap-4 hover:bg-gray-800 transition-colors border-b border-gray-800">
                                   <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center">
                                        <UserIcon className="h-6 w-6 text-gray-300" />
                                   </div>
                                   <span className="font-semibold text-lg">{partner}</span>
                                </button>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <div className="text-center text-gray-500 mt-20">
                        <p>No conversations yet.</p>
                        <p>Start a new chat to begin messaging.</p>
                    </div>
                )}
            </main>
        </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-gray-200 font-sans">
        <Header 
            chatPartner={activeChatPartner}
            onGoBack={() => setActiveChatPartner(null)}
            profilePicture={profilePicture}
            onSetProfilePicture={handleSetProfilePicture}
            onOpenStatusView={() => setIsStatusViewOpen(true)}
            hasStatus={!!status}
            canInstall={!!installPrompt}
            onInstallApp={handleInstallApp}
        />
        <main className="flex-1 overflow-y-auto p-4">
            <div className="max-w-4xl mx-auto">
                {messages.map((message) => (
                    <ChatBubble key={message.id} message={message} profilePicture={profilePicture} currentUser={currentUser}/>
                ))}
                <div ref={messagesEndRef} />
            </div>
        </main>
        <MessageInput onSendMessage={handleSendMessage} isLoading={isLoading} onOpenSendMedia={() => setIsSendMediaViewOpen(true)} />
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
