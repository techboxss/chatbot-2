import React, { useState } from 'react';
import { ChatInterface } from './components/ChatInterface';
import { Dashboard } from './components/Dashboard';

export default function App() {
  const [view, setView] = useState<'chat' | 'dashboard'>('chat');
  const [preFillText, setPreFillText] = useState<string>('');

  const handleServiceRequest = (text: string) => {
    setPreFillText(text);
    setView('chat');
  };

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col">
      {view === 'chat' ? (
        <ChatInterface 
          onDashboardToggle={() => setView('dashboard')} 
          preFillText={preFillText}
          onPreFillHandled={() => setPreFillText('')}
        />
      ) : (
        <Dashboard 
          onBack={() => setView('chat')} 
          onRequestService={handleServiceRequest}
        />
      )}
    </div>
  );
}

