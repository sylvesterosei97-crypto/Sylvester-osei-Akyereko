import React, { useRef } from 'react';
import { UserIcon, PlusIcon, TrashIcon, CloseIcon } from './Icon';

interface Status {
    data: string;
    type: string;
    timestamp: number;
}

interface StatusViewProps {
    status: Status | null;
    profilePicture: string | null;
    onClose: () => void;
    onSetStatus: (file: File) => void;
    onDeleteStatus: () => void;
}

export const StatusView: React.FC<StatusViewProps> = ({ status, profilePicture, onClose, onSetStatus, onDeleteStatus }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            onSetStatus(file);
        }
    };

    const triggerFileInput = () => {
        fileInputRef.current?.click();
    };

    return (
        <div className="absolute inset-0 bg-gray-900/95 text-white flex flex-col items-center justify-center z-50 p-4">
            <button
                onClick={onClose}
                className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
                aria-label="Close status view"
            >
                <CloseIcon className="h-8 w-8" />
            </button>

            {status ? (
                <div className="w-full h-full flex flex-col items-center justify-center">
                    <header className="absolute top-4 left-4 flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-gray-700 flex items-center justify-center overflow-hidden">
                            {profilePicture ? (
                                <img src={profilePicture} alt="You" className="h-full w-full object-cover" />
                            ) : (
                                <UserIcon className="h-6 w-6 text-gray-300" />
                            )}
                        </div>
                        <div>
                            <p className="font-semibold text-white">My Status</p>
                            <p className="text-xs text-gray-400">
                                {new Date(status.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                        </div>
                    </header>

                    <div className="flex-grow w-full max-w-3xl flex items-center justify-center">
                        {status.type.startsWith('image/') && (
                            <img src={status.data} alt="Status update" className="max-h-[80vh] w-auto object-contain rounded-lg" />
                        )}
                        {status.type.startsWith('video/') && (
                            <video src={status.data} controls autoPlay className="max-h-[80vh] w-auto rounded-lg" />
                        )}
                    </div>

                    <button
                        onClick={onDeleteStatus}
                        className="absolute bottom-6 flex items-center gap-2 text-gray-400 hover:text-red-500 transition-colors"
                        aria-label="Delete status"
                    >
                        <TrashIcon className="h-5 w-5" />
                        <span>Delete</span>
                    </button>
                </div>
            ) : (
                <div className="text-center">
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept="image/*,video/*"
                        className="hidden"
                    />
                    <button
                        onClick={triggerFileInput}
                        className="w-40 h-40 bg-gray-800 rounded-full flex flex-col items-center justify-center text-gray-400 hover:bg-gray-700 hover:text-white transition-all duration-300"
                        aria-label="Add status update"
                    >
                        <PlusIcon className="h-16 w-16 mb-2" />
                        <span className="font-semibold">Add Status</span>
                    </button>
                    <p className="mt-4 text-gray-500">Share a photo or video that disappears in 24 hours.</p>
                </div>
            )}
        </div>
    );
};