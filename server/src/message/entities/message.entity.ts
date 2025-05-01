export class Message {
  id: string;
  roomId: string;
  sender: string;
  content: string;
  type: 'audio' | 'text' | 'image' | 'alert';
  created_at: string;
  updated_at: string;
}
