export enum Role {
  USER = 'user',
  PEER = 'peer',
}

export interface Message {
  id: string;
  sender: string;
  recipient: string;
  text: string;
  timestamp: number;
  mediaData?: string;
  mediaType?: 'image' | 'video' | 'location';
}
