
import React, { useEffect, useState } from 'react';
import { X, TrendingUp, Map, Heart, Clock, PieChart, Activity, DollarSign, Calculator, CalendarDays, Flame, User, Footprints } from 'lucide-react';
import { getDashboardData } from '../services/analyticsService';
import { UserStats } from '../types';

interface AnalyticsDashboardProps {
  onClose: () => void;
}

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ onClose }) => {
  const [stats, setStats] = useState<UserStats | null>(null);
  // Three tiers of simulation: Normal (General), Heavy (Active), Extreme (Super Heavy)
  const [viewMode, setViewMode] = useState<'normal' | 'heavy' | 'extreme'>('extreme');

  useEffect(() => {
    setStats(getDashboardData());
  }, []);

  if (!stats) return null;

  // Format time
  const formatTime = (secs: number) => {
      const m = Math.floor(secs / 60);
      return `${m} mins`;
  };

  const formatDist = (meters: number) => {
      if (meters > 1000) return `${(meters/1000).toFixed(1)} km`;
      return `${Math.round(meters)} m`;
  };

  // --- UNIT ECONOMICS CALCULATION ---
  let totalDist = 0;
  let label = "";
  let icon = null;

  if (viewMode === 'normal') {
      // 🚶 GENERAL TOURIST
      // 2 hours * 4km/h = 8km
      totalDist = 8000;
      label = "General Tourist (2h)";
      icon = <User size={12} />;
  } else if (viewMode === 'heavy') {
      // 🏃 ACTIVE EXPLORER
      // 6 hours * 4.5km/h = 27km
      totalDist = 27000;
      label = "Active Explorer (6h)";
      icon = <Footprints size={12} />;
  } else {
      // 🔥 SUPER HEAVY USER (10 HOURS)
      // 10 hours * 5km/h = 50km
      totalDist = 50000;
      label = "Heavy User (10h)";
      icon = <Flame size={12} />;
  }
  
  // 120m trigger logic (Based on app config)
  const triggers = Math.ceil(totalDist / 120);
  
  // Avg chars per narration (Chatty Persona = ~600 chars)
  const charsUsed = triggers * 600; 
  
  // Costs (Blended Rate per 1M chars equivalent)
  // Includes: 
  // 1. Google Maps (Geocoding/Places amortized)
  // 2. Gemini Flash Latest (Input/Output)
  // 3. TTS (Standard vs Neural)
  
  const RATE_STANDARD = 8.50;  // Standard TTS ($4) + LLM/Maps Buffer ($4.5)
  const RATE_PREMIUM = 24.00;  // Neural TTS ($16) + LLM/Maps Buffer ($8 - higher quality)

  const costStandard = (charsUsed / 1000000) * RATE_STANDARD;
  const costPremium = (charsUsed / 1000000) * RATE_PREMIUM;
  
  // Revenue (Assuming 24h Pass used fully)
  const priceStandard = 4.99;
  const pricePremium = 18.99; // 3-Day pass price often used by heavy users, but let's assume worst case 1-day heavy usage.
  
  // Net Revenue (Plan Price - 15% App Store Fee)
  const revStandard = priceStandard * 0.85; 
  const revPremium = pricePremium * 0.85;

  const profitStandard = revStandard - costStandard;
  const profitPremium = revPremium - costPremium;

  return (
    <div className="fixed inset-0 z-[9999] bg-gray-100 flex flex-col animate-in slide-in-from-bottom-10 duration-300">
      
      {/* Header */}
      <div className="bg-gray-900 text-white px-6 py-5 flex justify-between items-center shadow-md">
        <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
                <Activity className="text-green-400" /> 
                Biz Dashboard
            </h2>
            <p className="text-gray-400 text-xs mt-1">
                Real-time Unit Economics & Usage
            </p>
        </div>
        <button onClick={onClose} className="p-2 bg-gray-800 hover:bg-gray-700 rounded-full transition-colors">
            <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        
        {/* 🔥 UNIT ECONOMICS CARD */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200">
             <div className="flex justify-between items-center mb-4">
                 <div className="flex items-center gap-2 text-gray-800 font-bold">
                    <Calculator size={18} className="text-emerald-600" />
                    Profit Simulator
                </div>
                {/* Toggle Scenarios */}
                <div className="flex bg-gray-100 p-1 rounded-lg gap-1">
                    <button 
                        onClick={() => setViewMode('normal')}
                        className={`px-3 py-1 text-xs font-bold rounded-md transition-all flex items-center gap-1 ${viewMode === 'normal' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400'}`}
                        title="General User (2h)"
                    >
                        <User size={12} /> 2H
                    </button>
                    <button 
                        onClick={() => setViewMode('heavy')}
                        className={`px-3 py-1 text-xs font-bold rounded-md transition-all flex items-center gap-1 ${viewMode === 'heavy' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400'}`}
                        title="Active User (6h)"
                    >
                        <Footprints size={12} /> 6H
                    </button>
                    <button 
                        onClick={() => setViewMode('extreme')}
                        className={`px-3 py-1 text-xs font-bold rounded-md transition-all flex items-center gap-1 ${viewMode === 'extreme' ? 'bg-red-500 text-white shadow-sm' : 'text-gray-400'}`}
                        title="Extreme User (10h)"
                    >
                        <Flame size={12} fill="currentColor" /> 10H
                    </button>
                </div>
            </div>
            
            {/* Scenario Info */}
            <div className={`p-3 rounded-xl border mb-4 flex justify-between items-center transition-colors duration-300 ${
                viewMode === 'normal' ? 'bg-blue-50 border-blue-100' : 
                viewMode === 'heavy' ? 'bg-orange-50 border-orange-100' : 
                'bg-red-50 border-red-100'
            }`}>
                <div>
                     <p className="text-xs text-gray-500 mb-0.5 font-bold uppercase tracking-wider flex items-center gap-1">
                        {icon} Scenario: {label}
                     </p>
                     <p className="text-sm font-bold text-gray-900">{formatDist(totalDist)} <span className="text-gray-500 font-normal">walked</span></p>
                </div>
                 <div className="text-right">
                     <p className="text-xs text-gray-500 mb-0.5">API Triggers</p>
                     <p className="text-sm font-bold text-gray-900">{triggers} points</p>
                 </div>
            </div>

            <div className="space-y-3">
                {/* Standard Plan Analysis */}
                <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-100 hover:border-blue-200 transition-colors">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-bold text-gray-700">Standard Pass</span>
                            <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 rounded">${priceStandard}</span>
                        </div>
                        <p className="text-[10px] text-gray-400">Cost: ${costStandard.toFixed(2)} | Net Rev: ${revStandard.toFixed(2)}</p>
                    </div>
                    <div className="text-right">
                        <p className={`text-lg font-bold ${profitStandard > 0 ? 'text-blue-600' : 'text-red-600'}`}>
                            ${profitStandard.toFixed(2)}
                        </p>
                        <p className={`text-[10px] font-bold ${((profitStandard/revStandard)*100) > 30 ? 'text-green-500' : 'text-blue-400'}`}>
                            {((profitStandard/revStandard)*100).toFixed(0)}% Margin
                        </p>
                    </div>
                </div>

                {/* Premium Plan Analysis */}
                <div className="flex items-center justify-between p-3 bg-violet-50/50 rounded-xl border border-violet-100 relative overflow-hidden">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-bold text-violet-800">Premium Pass</span>
                            <span className="text-[10px] bg-violet-100 text-violet-600 px-1.5 rounded">${pricePremium}</span>
                        </div>
                        <p className="text-[10px] text-violet-400">Cost: ${costPremium.toFixed(2)} | Net Rev: ${revPremium.toFixed(2)}</p>
                    </div>
                    <div className="text-right">
                        <p className={`text-lg font-bold ${profitPremium > 0 ? 'text-violet-700' : 'text-red-600'}`}>
                            ${profitPremium.toFixed(2)}
                        </p>
                        <p className={`text-[10px] font-bold ${((profitPremium/revPremium)*100) > 30 ? 'text-green-600' : 'text-violet-500'}`}>
                            {((profitPremium/revPremium)*100).toFixed(0)}% Margin
                        </p>
                    </div>
                </div>
            </div>
            
            <div className="mt-4 pt-3 border-t border-gray-100 grid grid-cols-2 gap-4 text-center">
                 <div>
                     <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">10h Usage Status</p>
                     <p className="text-xs font-bold text-gray-700">
                         {profitStandard > 0 ? "Profitable" : "Loss Leader"}
                     </p>
                 </div>
                 <div>
                     <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Risk Level</p>
                     <p className={`text-xs font-bold ${viewMode === 'extreme' ? 'text-orange-500' : 'text-green-500'}`}>
                         {viewMode === 'extreme' ? 'Moderate' : 'Very Low'}
                     </p>
                 </div>
            </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200">
                <div className="flex items-center gap-2 text-gray-500 text-xs font-bold mb-2 uppercase">
                    <Clock size={14} /> Total Engagement
                </div>
                <div className="text-2xl font-black text-gray-900">
                    {formatTime(stats.totalListeningTimeSeconds)}
                </div>
                <div className="text-xs text-green-600 font-medium mt-1">
                    +12% vs last session
                </div>
            </div>

            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200">
                <div className="flex items-center gap-2 text-gray-500 text-xs font-bold mb-2 uppercase">
                    <Map size={14} /> Exploration
                </div>
                <div className="text-2xl font-black text-gray-900">
                    {formatDist(stats.totalDistanceMeters)}
                </div>
                <div className="text-xs text-blue-600 font-medium mt-1">
                    {stats.placesVisited} Places Visited
                </div>
            </div>
        </div>

        {/* Interest Graph (Visualized as Bars) */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200">
            <div className="flex items-center gap-2 text-gray-800 font-bold mb-4">
                <PieChart size={18} className="text-purple-600" />
                Interest Categories
            </div>
            <div className="space-y-3">
                {Object.entries(stats.topCategories).length === 0 ? (
                    <p className="text-sm text-gray-400 italic">No category data yet.</p>
                ) : (
                    (Object.entries(stats.topCategories) as [string, number][])
                        .sort(([,a], [,b]) => b - a)
                        .map(([cat, count]) => {
                            const max = Math.max(...(Object.values(stats.topCategories) as number[]));
                            const percent = (count / max) * 100;
                            return (
                                <div key={cat} className="space-y-1">
                                    <div className="flex justify-between text-xs font-medium text-gray-600">
                                        <span className="capitalize">{cat}</span>
                                        <span>{count} visits</span>
                                    </div>
                                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-purple-500 rounded-full" 
                                            style={{ width: `${percent}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })
                )}
            </div>
        </div>

        {/* Liked Places (The "Golden Data") */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200">
             <div className="flex items-center gap-2 text-gray-800 font-bold mb-4">
                <Heart size={18} className="text-red-500" />
                User Preferences (Likes)
            </div>
            {stats.likedPlaces.length === 0 ? (
                <div className="text-center py-6 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                    <p className="text-sm text-gray-400">User hasn't liked any places yet.</p>
                </div>
            ) : (
                <ul className="space-y-2">
                    {stats.likedPlaces.map((place, idx) => (
                        <li key={idx} className="flex items-center gap-3 p-3 bg-red-50/50 rounded-xl border border-red-100">
                            <span className="text-red-500 font-bold text-xs">#{idx+1}</span>
                            <span className="text-gray-800 font-medium text-sm">{place}</span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
        
        <div className="h-6"></div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
