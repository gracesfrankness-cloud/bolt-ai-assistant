
import React, { useEffect, useRef } from 'react';
import type { TranscriptMessage } from '../types';
import { MessageSource } from '../types';

interface ConversationDisplayProps {
  transcript: TranscriptMessage[];
}

const GeminiIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 w-6 h-6 text-blue-400">
        <path d="M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16z"/>
        <path d="M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"/>
        <path d="M18 12h-2"/>
        <path d="M8 12H6"/>
    </svg>
);

const UserIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 w-6 h-6 text-green-400">
        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
        <circle cx="12" cy="7" r="4"/>
    </svg>
);

const FormattedMessage: React.FC<{ text: string }> = ({ text }) => {
  const parts = text.split(/(\*\*.*?\*\*)/g).filter(Boolean);

  return (
    <p className="text-gray-50 whitespace-pre-wrap">
      {parts.map((part, index) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={index}>{part.slice(2, -2)}</strong>;
        }
        return <React.Fragment key={index}>{part}</React.Fragment>;
      })}
    </p>
  );
};


const ConversationDisplay: React.FC<ConversationDisplayProps> = ({ transcript }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcript]);

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-6 p-4 bg-gray-800/50 rounded-lg">
      {transcript.length === 0 ? (
        <div className="flex items-center justify-center h-full text-gray-500 text-center px-4">
          <p>Type a message or press the microphone button to start a conversation.</p>
        </div>
      ) : (
        transcript.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start gap-4 ${
              msg.source === MessageSource.USER ? 'justify-end' : 'justify-start'
            }`}
          >
            {msg.source === MessageSource.GEMINI && <GeminiIcon />}
            <div
              className={`max-w-xl p-3 rounded-xl ${
                msg.source === MessageSource.USER
                  ? 'bg-green-600/50 rounded-br-none'
                  : 'bg-blue-600/50 rounded-bl-none'
              } ${msg.id === 'user-interim' ? 'opacity-70' : ''}`}
            >
              <FormattedMessage text={msg.text} />
            </div>
            {msg.source === MessageSource.USER && <UserIcon />}
          </div>
        ))
      )}
    </div>
  );
};

export default ConversationDisplay;
