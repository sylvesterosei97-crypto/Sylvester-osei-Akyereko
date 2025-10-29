import React, { useRef } from 'react';
import { UserIcon, StatusIcon, DownloadIcon, ArrowLeftIcon } from './Icon';

interface HeaderProps {
  chatPartner: string;
  onGoBack: () => void;
  profilePicture: string | null;
  onSetProfilePicture: (base64: string) => void;
  onOpenStatusView: () => void;
  hasStatus: boolean;
  canInstall: boolean;
  onInstallApp: () => void;
}

export const Header: React.FC<HeaderProps> = ({ 
    chatPartner,
    onGoBack,
    profilePicture,
    onSetProfilePicture,
    onOpenStatusView,
    hasStatus,
    canInstall,
    onInstallApp
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleProfilePictureChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onSetProfilePicture(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
    
  return (
    <header className="bg-gray-900/80 backdrop-blur-sm shadow-md sticky top-0 z-10 border-b border-gray-700">
      <div className="max-w-4xl mx-auto px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
           <button onClick={onGoBack} className="text-gray-400 hover:text-white transition-colors" aria-label="Go back">
                <ArrowLeftIcon className="h-6 w-6" />
           </button>
           <div className="h-8 w-8 rounded-full bg-gray-600 flex items-center justify-center">
                <UserIcon className="h-5 w-5 text-gray-300" />
           </div>
           <span className="text-lg font-semibold text-white tracking-wider">{chatPartner}</span>
        </div>
        <div className="flex items-center space-x-4">
            <button
                onClick={onOpenStatusView}
                className="relative text-gray-400 hover:text-white transition-colors"
                aria-label="View Status"
            >
                <StatusIcon className="h-6 w-6" />
                {hasStatus && (
                    <div className="absolute top-0 right-0 h-2 w-2 rounded-full bg-blue-500 ring-2 ring-gray-900"></div>
                )}
            </button>
            {canInstall && (
                <button
                    onClick={onInstallApp}
                    className="text-gray-400 hover:text-white transition-colors"
                    aria-label="Install App"
                >
                    <DownloadIcon className="h-6 w-6" />
                </button>
            )}
             <div className="ml-2 border-l border-gray-700 pl-4">
                 <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleProfilePictureChange}
                    accept="image/*"
                    className="hidden"
                />
                <button
                    onClick={() => fileInputRef.current?.click()}
                    className="h-9 w-9 rounded-full bg-gray-700 flex items-center justify-center hover:bg-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-blue-400"
                    aria-label="Change profile picture"
                >
                    {profilePicture ? (
                        <img src={profilePicture} alt="User Profile" className="h-full w-full rounded-full object-cover" />
                    ) : (
                        <UserIcon className="h-6 w-6 text-gray-300" />
                    )}
                </button>
            </div>
        </div>
      </div>
    </header>
  );
};
