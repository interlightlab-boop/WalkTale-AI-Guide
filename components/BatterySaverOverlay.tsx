import React, { useState, useEffect } from 'react';
import { BatteryCharging, Lock, Unlock, Zap } from 'lucide-react';

interface BatterySaverOverlayProps {
  onUnlock: () => void;
  statusText?: string;
}

const BatterySaverOverlay: React.FC<BatterySaverOverlayProps> = ({ onUnlock, statusText = "Audio Guide Active" }) => {
  const [touchCount, setTouchCount] = useState(0);
  
  useEffect(() => {
    // Reset double tap counter if not tapped quickly
    if (touchCount > 0) {
      const timer = setTimeout(() => setTouchCount(0), 400);
      return () => clearTimeout(timer);
    }
  }, [touchCount]);

  const handleTouch = () => {
    if (touchCount === 1) {
      onUnlock();
    } else {
      setTouchCount(prev => prev + 1);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[99999] bg-black flex flex-col items-center justify-center text-white touch-none"
      onClick={handleTouch}
    >
      <div className="flex flex-col items-center opacity-40 animate-pulse">
        <Zap size={48} className="text-yellow-500 mb-4" />
        <h2 className="text-2xl font-bold mb-2">Battery Saver Mode</h2>
        <p className="text-sm text-gray-400 font-mono mb-8">{statusText}</p>
        
        <div className="flex items-center gap-2 border border-gray-700 rounded-full px-4 py-2 bg-gray-900/50">
          <Lock size={16} />
          <span className="text-xs">Double tap to wake</span>
        </div>
      </div>
      
      {/* Burn-in protection: slightly moving footer */}
      <div className="absolute bottom-10 animate-bounce opacity-20">
         <Unlock size={24} />
      </div>
    </div>
  );
};

export default BatterySaverOverlay;