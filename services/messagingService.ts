import { Message } from "../types";

/**
 * Mocks sending a media message to a phone number.
 * In a real app, this would use a service like Twilio to send an MMS.
 * @param phoneNumber The recipient's phone number.
 * @param mediaType The type of media being sent ('location', 'image', 'video').
 * @returns A promise that resolves when the message is "sent".
 */
export const sendMediaMessage = (phoneNumber: string, mediaType: Message['mediaType']): Promise<void> => {
    console.log(`Sending ${mediaType} to ${phoneNumber}`);
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            if (phoneNumber) {
                 console.log(`Successfully sent ${mediaType} to ${phoneNumber} (mocked).`);
                 resolve();
            } else {
                 console.error("Send failed: No phone number provided (mocked).");
                 reject(new Error("No phone number provided."));
            }
        }, 2000); // Simulate network delay
    });
};
