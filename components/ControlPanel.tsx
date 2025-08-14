import React, { useState } from 'react';
import type { LiveStatus } from '../types';
import { LiveStatus as StatusEnum } from '../types';

interface ControlPanelProps {
  isListening: boolean;
  status: LiveStatus;
  onToggleListening: () => void;
  onSendMessage: (message: string) => void;
}

const MicrophoneIcon: React.FC<{className?: string}> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
    <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
    <line x1="12" y1="19" x2="12" y2="22"></line>
  </svg>
);

const StopIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="6" y="6" width="12" height="12" rx="2"></rect>
    </svg>
);

const SendIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="22" y1="2" x2="11" y2="13"></line>
    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
  </svg>
);


const ControlPanel: React.FC<ControlPanelProps> = ({ isListening, status, onToggleListening, onSendMessage }) => {
  const [inputValue, setInputValue] = useState('');
  const isBusy = status === StatusEnum.CONNECTING || status === StatusEnum.THINKING || isListening;

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() && !isBusy) {
      onSendMessage(inputValue.trim());
      setInputValue('');
    }
  };

  return (
    <div className="flex items-center justify-center gap-4 w-full max-w-3xl">
      <form onSubmit={handleFormSubmit} className="flex-1 flex items-center bg-gray-800 rounded-full">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Type a message to Bolt..."
          disabled={isBusy}
          className="flex-1 w-full bg-transparent border-none text-white placeholder-gray-500 px-5 py-3 focus:outline-none focus:ring-0 disabled:opacity-70"
          aria-label="Chat input"
        />
        <button
          type="submit"
          disabled={!inputValue.trim() || isBusy}
          className="p-3 text-white disabled:text-gray-600 enabled:hover:text-blue-400 transition-colors"
          aria-label="Send message"
        >
          <SendIcon className="w-6 h-6" />
        </button>
      </form>

      <button
        onClick={onToggleListening}
        disabled={status === StatusEnum.CONNECTING || status === StatusEnum.THINKING}
        className={`relative flex items-center justify-center w-16 h-16 shrink-0 rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed ${
          isListening ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
        } ${isListening ? 'pulse-animate' : ''}`}
        aria-label={isListening ? 'Stop listening' : 'Start conversation'}
      >
        {isListening ? <StopIcon className="w-8 h-8 text-white" /> : <MicrophoneIcon className="w-8 h-8 text-white" />}
      </button>
    </div>
  );
};

export default ControlPanel;