import React, { useState } from 'react';
import { sendVerificationCode, verifyCode } from '../services/authService';
import { ModelIcon } from './Icon';

interface SignInViewProps {
    onSignInSuccess: (phoneNumber: string) => void;
}

type SignInStep = 'phone' | 'code';

export const SignInView: React.FC<SignInViewProps> = ({ onSignInSuccess }) => {
    const [step, setStep] = useState<SignInStep>('phone');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [verificationCode, setVerificationCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSendCode = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!phoneNumber || !/^\+?[1-9]\d{1,14}$/.test(phoneNumber)) {
            setError("Please enter a valid phone number.");
            return;
        }
        setIsLoading(true);
        try {
            await sendVerificationCode(phoneNumber);
            setStep('code');
        } catch (err) {
            setError("Failed to send verification code. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyCode = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
         if (verificationCode.length !== 6) {
            setError("Please enter a 6-digit verification code.");
            return;
        }
        setIsLoading(true);
        try {
            await verifyCode(verificationCode);
            onSignInSuccess(phoneNumber);
        } catch (err) {
            setError(err instanceof Error ? err.message : "An unknown error occurred.");
        } finally {
            setIsLoading(false);
        }
    };

    const renderPhoneStep = () => (
        <form onSubmit={handleSendCode} className="space-y-6">
            <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-400">
                    Phone Number
                </label>
                <div className="mt-1">
                    <input
                        id="phone"
                        name="phone"
                        type="tel"
                        autoComplete="tel"
                        required
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="+1 (555) 555-5555"
                        className="w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>
            </div>

            <div>
                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-blue-500 disabled:bg-blue-400 disabled:cursor-not-allowed"
                >
                    {isLoading ? 'Sending...' : 'Send Code'}
                </button>
            </div>
        </form>
    );

     const renderCodeStep = () => (
        <form onSubmit={handleVerifyCode} className="space-y-6">
             <div>
                <p className="text-sm text-center text-gray-400">
                    Enter the 6-digit code sent to {phoneNumber}.
                    <br />
                    (Hint: the code is 123456)
                </p>
            </div>
            <div>
                <label htmlFor="code" className="block text-sm font-medium text-gray-400">
                    Verification Code
                </label>
                <div className="mt-1">
                    <input
                        id="code"
                        name="code"
                        type="text"
                        maxLength={6}
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                        required
                        className="w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white text-center tracking-[0.5em] focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>
            </div>

            <div>
                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-blue-500 disabled:bg-blue-400 disabled:cursor-not-allowed"
                >
                    {isLoading ? 'Verifying...' : 'Verify Code'}
                </button>
            </div>
            <div className="text-center">
                <button onClick={() => setStep('phone')} type="button" className="text-sm text-blue-400 hover:underline">
                    Back
                </button>
            </div>
        </form>
    );

    return (
        <div className="min-h-screen bg-gray-900 flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
                <div className="text-center">
                    <ModelIcon className="mx-auto h-12 w-auto text-blue-400" />
                    <h2 className="mt-6 text-3xl font-extrabold text-white">
                        Sign in to HITMi
                    </h2>
                </div>
                <div className="mt-8 bg-gray-800 shadow-lg rounded-lg p-8">
                    {step === 'phone' ? renderPhoneStep() : renderCodeStep()}
                     {error && (
                        <p className="mt-4 text-center text-sm text-red-400">{error}</p>
                    )}
                </div>
            </div>
        </div>
    );
};
