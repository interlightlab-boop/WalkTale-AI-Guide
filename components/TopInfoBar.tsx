
import React from 'react';
import { Navigation } from 'lucide-react';

interface TopInfoBarProps {
  destinationName: string;
  distance?: number; // meters
  duration?: number; // seconds
  isWalking: boolean;
}

const TopInfoBar: React.FC<TopInfoBarProps> = ({ 
  destinationName, 
  distance, 
  duration, 
  isWalking 
}) => {
  if (!destinationName) return null;

  const formatDistance = (meters: number) => {
    if (meters >= 1000) return `${(meters / 1000).toFixed(1)}km`;
    return `${Math.round(meters)}m`;
  };

  const formatDuration = (seconds: number) => {
    const min = Math.round(seconds / 60);
    if (min < 1) return '1 min';
    if (min >= 60) {
      const h = Math.floor(min / 60);
      const m = min % 60;
      return `${h}h ${m}m`;
    }
    return `${min} min`;
  };

  return (
    <div className="absolute top-4 left-4 right-4 z-[1000] animate-in slide-in-from-top-5 duration-500 ease-out">
      <div className="glass bg-white/80 rounded-[20px] p-4 flex items-center justify-between shadow-lg shadow-black/5 border border-white/60">
        
        {/* Left: Destination Info */}
        <div className="flex-1 min-w-0 mr-4">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-600 uppercase tracking-wider mb-1">
            <div className={`w-2 h-2 rounded-full ${isWalking ? 'bg-indigo-500 animate-pulse' : 'bg-slate-300'}`}></div>
            {isWalking ? "Navigating to" : "Destination"}
          </div>
          <h2 className="text-lg font-bold text-slate-900 truncate leading-tight tracking-tight">
            {destinationName}
          </h2>
        </div>

        {/* Right: Route Stats */}
        {(distance !== undefined && duration !== undefined) && (
          <div className="flex flex-col items-end flex-shrink-0 bg-slate-50/80 px-3 py-2 rounded-xl border border-slate-100/50">
            <div className="text-xl font-black text-slate-800 leading-none">
              {formatDuration(duration)}
            </div>
            <div className="text-xs font-semibold text-slate-400 mt-1">
              {formatDistance(distance)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TopInfoBar;
