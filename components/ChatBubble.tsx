import React from 'react';
import { Message, Role } from '../types';
import { UserIcon, ModelIcon } from './Icon';

const MediaContent: React.FC<{ message: Message }> = ({ message }) => {
    if (!message.mediaData || !message.mediaType) {
        return null;
    }

    if (message.mediaType === 'image') {
        return <img src={message.mediaData} alt="User upload" className="mt-2 rounded-lg max-w-xs" />;
    }

    if (message.mediaType === 'video') {
        return <video src={message.mediaData} controls className="mt-2 rounded-lg max-w-xs" />;
    }

    if (message.mediaType === 'location') {
        const [lat, lon] = message.mediaData.split(',');
        const mapUrl = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=15/${lat}/${lon}`;
        // Using a static map image for preview
        const staticMapUrl = `https://static-maps.yandex.ru/1.x/?lang=en-US&ll=${lon},${lat}&z=15&l=map&size=300,200`;

        return (
            <a href={mapUrl} target="_blank" rel="noopener noreferrer" className="mt-2 block">
                <img src={staticMapUrl} alt="Map of location" className="rounded-lg border border-gray-600" />
            </a>
        );
    }
    
    return null;
};


const ChatBubbleContent: React.FC<{ text: string }> = ({ text }) => {
    // A simple regex to split by markdown code blocks
    const parts = text.split(/(```[\s\S]*?```)/g);

    return (
        <div className="text-sm sm:text-base leading-relaxed space-y-2">
            {parts.map((part, index) => {
                if (part.startsWith('```') && part.endsWith('```')) {
                    const code = part.slice(3, -3).trim();
                    const language = code.split('\n')[0].trim();
                    const codeContent = code.substring(language.length).trim();
                    return (
                        <pre key={index} className="bg-gray-800 rounded-md p-3 my-2 overflow-x-auto">
                            <code className="font-mono text-sm text-cyan-400">{codeContent}</code>
                        </pre>
                    );
                }
                return <p key={index}>{part}</p>;
            })}
        </div>
    );
};

export const ChatBubble: React.FC<{ message: Message; profilePicture: string | null }> = ({ message, profilePicture }) => {
  const isUser = message.role === Role.USER;
  const bubbleClasses = isUser
    ? 'bg-blue-600 text-white rounded-l-2xl rounded-tr-2xl'
    : 'bg-gray-700 text-gray-200 rounded-r-2xl rounded-tl-2xl';
  const containerClasses = isUser ? 'justify-end' : 'justify-start';
  
  const ModelAvatar = ModelIcon;

  return (
    <div className={`flex items-start gap-3 my-4 ${containerClasses}`}>
      {!isUser && (
        <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gray-600 flex items-center justify-center">
          <ModelAvatar className="h-5 w-5 text-gray-300" />
        </div>
      )}
      <div className={`max-w-md md:max-w-2xl px-5 py-3 shadow-sm ${bubbleClasses}`}>
        {message.text && <ChatBubbleContent text={message.text} />}
        <MediaContent message={message} />
      </div>
       {isUser && (
        <div className="flex-shrink-0 h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center overflow-hidden">
          {profilePicture ? (
            <img src={profilePicture} alt="You" className="h-full w-full object-cover" />
          ) : (
            <UserIcon className="h-5 w-5 text-white" />
          )}
        </div>
      )}
    </div>
  );
};
