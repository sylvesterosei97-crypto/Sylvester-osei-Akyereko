import React, { useState, useRef } from 'react';
import { Message } from '../types';
import { CloseIcon, LocationIcon, PhotoIcon, VideoIcon } from './Icon';

interface SendMediaViewProps {
    onClose: () => void;
    onSend: (recipient: string, mediaData: string, mediaType: Message['mediaType']) => Promise<void>;
}

type Step = 'recipient' | 'select_media' | 'preview';
type MediaType = 'location' | 'image' | 'video';

export const SendMediaView: React.FC<SendMediaViewProps> = ({ onClose, onSend }) => {
    const [step, setStep] = useState<Step>('recipient');
    const [recipient, setRecipient] = useState('');
    const [mediaType, setMediaType] = useState<MediaType | null>(null);
    const [mediaData, setMediaData] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    const handleSetRecipient = () => {
        if (!recipient || !/^\+?[1-9]\d{1,14}$/.test(recipient)) {
            setError("Please enter a valid phone number.");
            return;
        }
        setError(null);
        setStep('select_media');
    };

    const handleSelectMedia = (type: MediaType) => {
        setMediaType(type);
        if (type === 'location') {
            setIsLoading(true);
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    setMediaData(`${latitude},${longitude}`);
                    setIsLoading(false);
                    setStep('preview');
                },
                (err) => {
                    setError('Could not get location. Please enable location services.');
                    setIsLoading(false);
                }
            );
        } else {
            fileInputRef.current?.click();
        }
    };
    
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            if ((mediaType === 'image' && !file.type.startsWith('image/')) || (mediaType === 'video' && !file.type.startsWith('video/'))) {
                setError(`Please select a valid ${mediaType} file.`);
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                setMediaData(reader.result as string);
                setStep('preview');
            };
            reader.readAsDataURL(file);
        }
    };
    
    const handleSend = async () => {
        if (!recipient || !mediaData || !mediaType) return;
        setIsLoading(true);
        setError(null);
        try {
            await onSend(recipient, mediaData, mediaType);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to send. Please try again.");
            setIsLoading(false);
        }
    };

    const reset = () => {
        setStep('recipient');
        setRecipient('');
        setMediaType(null);
        setMediaData(null);
        setError(null);
        setIsLoading(false);
    }
    
    const renderContent = () => {
        switch(step) {
            case 'recipient':
                return (
                    <div>
                        <h2 className="text-2xl font-bold text-center mb-6">Send a Message</h2>
                        <label htmlFor="phone" className="block text-sm font-medium text-gray-400 mb-2">
                           Recipient's Phone Number
                        </label>
                        <input
                            id="phone"
                            type="tel"
                            value={recipient}
                            onChange={(e) => setRecipient(e.target.value)}
                            placeholder="+1 (555) 555-5555"
                            className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                        <button onClick={handleSetRecipient} className="w-full mt-4 py-2 px-4 bg-blue-600 hover:bg-blue-700 rounded-md font-medium">
                            Continue
                        </button>
                    </div>
                );
            case 'select_media':
                return (
                    <div>
                        <h2 className="text-xl font-bold text-center mb-1">Send to {recipient}</h2>
                        <p className="text-gray-400 text-center mb-6">What would you like to send?</p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <button onClick={() => handleSelectMedia('location')} disabled={isLoading} className="bg-gray-700 hover:bg-gray-600 p-6 rounded-lg flex flex-col items-center justify-center space-y-2 transition-colors">
                                <LocationIcon className="h-10 w-10" />
                                <span>{isLoading ? 'Getting...' : 'Location'}</span>
                            </button>
                             <button onClick={() => handleSelectMedia('image')} className="bg-gray-700 hover:bg-gray-600 p-6 rounded-lg flex flex-col items-center justify-center space-y-2 transition-colors">
                                <PhotoIcon className="h-10 w-10" />
                                <span>Photo</span>
                            </button>
                             <button onClick={() => handleSelectMedia('video')} className="bg-gray-700 hover:bg-gray-600 p-6 rounded-lg flex flex-col items-center justify-center space-y-2 transition-colors">
                                <VideoIcon className="h-10 w-10" />
                                <span>Video</span>
                            </button>
                        </div>
                    </div>
                );
            case 'preview':
                return (
                     <div>
                        <h2 className="text-xl font-bold text-center mb-4">Preview</h2>
                        <div className="bg-gray-800 p-4 rounded-lg flex items-center justify-center mb-4 min-h-[250px]">
                            {mediaType === 'image' && <img src={mediaData!} alt="Preview" className="max-h-64 rounded-md" />}
                            {mediaType === 'video' && <video src={mediaData!} controls className="max-h-64 rounded-md" />}
                            {mediaType === 'location' && (
                                <img 
                                  src={`https://static-maps.yandex.ru/1.x/?lang=en-US&ll=${mediaData!.split(',')[1]},${mediaData!.split(',')[0]}&z=15&l=map&size=400,250`} 
                                  alt="Map preview"
                                  className="rounded-md"
                                />
                            )}
                        </div>
                         <button onClick={handleSend} disabled={isLoading} className="w-full mt-4 py-2 px-4 bg-blue-600 hover:bg-blue-700 rounded-md font-medium disabled:bg-blue-400 disabled:cursor-not-allowed">
                            {isLoading ? 'Sending...' : `Send to ${recipient}`}
                        </button>
                    </div>
                );
        }
    }

    return (
        <div className="absolute inset-0 bg-gray-900/95 text-white flex flex-col items-center justify-center z-50 p-4">
             <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept={mediaType === 'image' ? 'image/*' : 'video/*'}
                className="hidden"
            />
            <div className="bg-gray-800 p-8 rounded-lg shadow-2xl w-full max-w-md relative">
                <button onClick={onClose} className="absolute top-3 right-3 text-gray-400 hover:text-white">
                    <CloseIcon className="h-6 w-6" />
                </button>
                 {step !== 'recipient' && (
                    <button onClick={reset} className="absolute top-3 left-3 text-sm text-blue-400 hover:underline">
                        Start Over
                    </button>
                 )}
                {renderContent()}
                {error && <p className="mt-4 text-center text-sm text-red-400">{error}</p>}
            </div>
        </div>
    );
};
