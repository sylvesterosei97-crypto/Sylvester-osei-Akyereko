/**
 * Mocks sending a verification code to a phone number.
 * In a real app, this would integrate with an SMS service like Twilio or Firebase Auth.
 * @param phoneNumber The phone number to send the code to.
 * @returns A promise that resolves when the code is "sent".
 */
export const sendVerificationCode = (phoneNumber: string): Promise<void> => {
    console.log(`Sending verification code to ${phoneNumber}`);
    return new Promise((resolve) => {
        setTimeout(() => {
            console.log("Verification code sent (mocked).");
            resolve();
        }, 1500); // Simulate network delay
    });
};

/**
 * Mocks verifying a 6-digit code.
 * In a real app, this would check the code against the one sent to the user.
 * For this mock, the code is hardcoded to "123456".
 * @param code The 6-digit code entered by the user.
 * @returns A promise that resolves on successful verification or rejects on failure.
 */
export const verifyCode = (code: string): Promise<void> => {
    console.log(`Verifying code: ${code}`);
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            if (code === '123456') {
                console.log("Code verified successfully (mocked).");
                resolve();
            } else {
                console.log("Code verification failed (mocked).");
                reject(new Error("Invalid verification code. Please try again."));
            }
        }, 1500); // Simulate network delay
    });
};