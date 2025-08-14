import React, { useState, useCallback } from 'react';
import { useGeminiLive } from './hooks/useGeminiLive';
import type { TranscriptMessage } from './types';
import { LiveStatus } from './types';
import ConversationDisplay from './components/ConversationDisplay';
import StatusBar from './components/StatusBar';
import ControlPanel from './components/ControlPanel';

const App: React.FC = () => {
  const [transcript, setTranscript] = useState<TranscriptMessage[]>([]);
  const [status, setStatus] = useState<LiveStatus>(LiveStatus.IDLE);
  const [error, setError] = useState<string | null>(null);

  const handleTranscriptUpdate = useCallback((newMessages: TranscriptMessage[]) => {
    setTranscript(newMessages);
  }, []);

  const handleStatusUpdate = useCallback((newStatus: LiveStatus) => {
    setStatus(newStatus);
  }, []);

  const handleError = useCallback((errorMessage: string) => {
    setError(errorMessage);
    setStatus(LiveStatus.ERROR);
  }, []);

  const { isListening, toggleListening, sendTextMessage } = useGeminiLive({
    onTranscriptUpdate: handleTranscriptUpdate,
    onStatusUpdate: handleStatusUpdate,
    onError: handleError,
  });

  const handleToggleListening = () => {
    setError(null);
    toggleListening();
  };
  
  const handleSendMessage = (message: string) => {
    if (!message.trim()) return;
    setError(null);
    sendTextMessage(message);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white font-sans">
      <header className="p-4 text-center border-b border-gray-700">
        <h1 className="text-2xl font-bold text-gray-100">Revolt Motors AI Assistant</h1>
      </header>
      
      <main className="flex-1 flex flex-col p-4 overflow-hidden">
        <StatusBar status={status} error={error} />
        <ConversationDisplay transcript={transcript} />
      </main>
      
      <footer className="p-4 border-t border-gray-700 flex justify-center">
        <ControlPanel
          isListening={isListening}
          status={status}
          onToggleListening={handleToggleListening}
          onSendMessage={handleSendMessage}
        />
      </footer>
    </div>
  );
};

export default App;