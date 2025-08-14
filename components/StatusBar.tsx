
import React from 'react';
import type { LiveStatus } from '../types';

interface StatusBarProps {
  status: LiveStatus;
  error: string | null;
}

const StatusBar: React.FC<StatusBarProps> = ({ status, error }) => {
  const getStatusColor = () => {
    if (error) return 'bg-red-500';
    switch (status) {
      case 'Listening':
      case 'Speaking':
        return 'bg-blue-500';
      case 'Thinking':
      case 'Connecting...':
        return 'bg-yellow-500';
      case 'Idle':
        return 'bg-gray-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="flex items-center justify-center mb-4 p-2 rounded-md bg-gray-800">
      <div className={`w-3 h-3 rounded-full mr-3 ${getStatusColor()}`}></div>
      <span className="text-sm font-medium text-gray-300">
        {error ? `Error: ${error}` : `Status: ${status}`}
      </span>
    </div>
  );
};

export default StatusBar;