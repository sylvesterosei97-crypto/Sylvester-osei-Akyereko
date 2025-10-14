export enum Role {
  USER = 'user',
  MODEL = 'model',
}

// FIX: Add and export the Message interface to resolve import errors across the application.
export interface Message {
  id: string;
  role: Role;
  text: string;
  timestamp: number;
  mediaData?: string;
  mediaType?: 'image' | 'video' | 'location';
}
