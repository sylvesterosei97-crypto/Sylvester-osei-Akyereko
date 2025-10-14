import React, { useState, useRef, useEffect } from 'react';
import { SendIcon, MicrophoneIcon, PaperclipIcon } from './Icon';

interface MessageInputProps {
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  onOpenSendMedia: () => void;
}

// Check for SpeechRecognition API
// FIX: Cast window to any to access browser-specific SpeechRecognition APIs.
const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
const recognition = SpeechRecognition ? new SpeechRecognition() : null;

if (recognition) {
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
}


export const MessageInput: React.FC<MessageInputProps> = ({ onSendMessage, isLoading, onOpenSendMedia }) => {
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const scrollHeight = textarea.scrollHeight;
      textarea.style.height = `${scrollHeight}px`;
    }
  }, [input]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onSendMessage(input.trim());
      setInput('');
      if (isListening) {
        setIsListening(false);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as unknown as React.FormEvent);
    }
  };

  const handleVoiceInput = () => {
    if (!recognition) return;
    setIsListening(prev => !prev);
  };
  
  useEffect(() => {
    if (!recognition) return;
    
    if (isListening) {
      recognition.start();
    } else {
      recognition.stop();
    }

    // FIX: Use 'any' for the event type as SpeechRecognitionEvent is not universally defined in TS.
    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }
      setInput(prevInput => prevInput + finalTranscript);
    };

    // FIX: Use 'any' for the event type as SpeechRecognitionErrorEvent is not universally defined in TS.
    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      if (isListening) {
        // In some browsers, `continuous` is not truly continuous.
        // Restart it if we are still in listening mode.
        recognition.start();
      }
    };
    
    return () => {
        recognition.stop();
    }

  }, [isListening]);

  return (
    <div className="bg-gray-800 p-4 border-t border-gray-700">
      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto flex items-end space-x-3">
        <div className="flex-grow bg-gray-700 rounded-2xl flex items-end p-1">
          <button
              type="button"
              onClick={onOpenSendMedia}
              disabled={isLoading}
              className="p-2 text-gray-400 hover:text-white transition-colors"
              aria-label="Attach file or location"
            >
              <PaperclipIcon className="h-6 w-6" />
          </button>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isListening ? "Listening..." : "Type your message..."}
            rows={1}
            className="w-full bg-transparent p-2 text-gray-100 placeholder-gray-400 focus:outline-none resize-none max-h-40"
            disabled={isLoading}
          />
          {recognition && (
             <button
                type="button"
                onClick={handleVoiceInput}
                disabled={isLoading}
                className="p-2 text-gray-400 hover:text-white transition-colors"
                aria-label={isListening ? 'Stop listening' : 'Start listening'}
              >
                <MicrophoneIcon className={`h-6 w-6 ${isListening ? 'text-red-500 animate-pulse' : ''}`} />
              </button>
          )}
        </div>
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="bg-blue-600 text-white rounded-full p-3 flex-shrink-0 disabled:bg-blue-300 disabled:cursor-not-allowed hover:bg-blue-500 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          <SendIcon className="h-6 w-6" />
        </button>
      </form>
    </div>
  );
};
