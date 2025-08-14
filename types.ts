
export enum MessageSource {
  USER = 'user',
  GEMINI = 'gemini',
}

export interface TranscriptMessage {
  id: string;
  source: MessageSource;
  text: string;
  sources?: { uri: string; title: string }[];
}

export enum LiveStatus {
  IDLE = 'Idle',
  CONNECTING = 'Connecting...',
  LISTENING = 'Listening',
  THINKING = 'Thinking',
  SPEAKING = 'Speaking',
  ERROR = 'Error',
}
