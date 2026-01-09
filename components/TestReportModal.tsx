
import React, { useState } from 'react';
import { X, Clock, Map, Mic2, Cpu, FileText, ScrollText, DollarSign, MapPin, Navigation, Users, TrendingUp, AlertTriangle } from 'lucide-react';
import { TourSessionReport } from '../types';

interface TestReportModalProps {
  report: TourSessionReport;
  onClose: () => void;
}

const TestReportModal: React.FC<TestReportModalProps> = ({ report, onClose }) => {
  const [projectionCount, setProjectionCount] = useState(1000); // Default projection: 1k users

  const formatTime = (seconds: number) => {
    const totalSec = Math.round(seconds);
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins}m ${secs}s`;
  };

  const formatDist = (meters: number) => {
    return meters > 1000 
      ? `${(meters / 1000).toFixed(2)} km` 
      : `${Math.round(meters)} m`;
  };

  const formatTimestamp = (ts: number) => {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  // --- 💰 UNIT ECONOMICS CALCULATOR (Revised) ---
  const EXCHANGE_RATE = 1380; // 1 USD = 1380 KRW
  
  // 1. AI Costs (Gemini 1.5 Flash Pricing)
  // Input: $0.075 / 1M tokens, Output: $0.30 / 1M tokens
  const RATE_INPUT_TOKEN = 0.075; 
  const RATE_OUTPUT_TOKEN = 0.30; 
  
  // 2. TTS Costs
  // Standard: $4.00 / 1M chars, Neural: $16.00 / 1M chars
  const RATE_TTS_STANDARD = 4.00; 
  const RATE_TTS_NEURAL = 16.00;  

  // 3. Google Maps Costs (Standard Pricing)
  // Prices per 1000 requests
  const RATE_MAP_LOAD = 7.00;     // Maps JavaScript API
  const RATE_GEOCODING = 5.00;    // Geocoding API
  const RATE_PLACES = 32.00;      // Places API (Nearby Search) - THE EXPENSIVE ONE
  const RATE_DIRECTIONS = 5.00;   // Directions API

  // --- CALCULATION ---
  const costInput = (report.stats.totalLlmInputTokens / 1000000) * RATE_INPUT_TOKEN;
  const costOutput = (report.stats.totalLlmOutputTokens / 1000000) * RATE_OUTPUT_TOKEN;
  const costTts = (report.stats.totalTtsCharacters / 1000000) * (report.ttsMode === 'neural' ? RATE_TTS_NEURAL : RATE_TTS_STANDARD);
  
  const costMapLoad = (report.stats.mapsUsage.mapLoads / 1000) * RATE_MAP_LOAD;
  const costGeocoding = (report.stats.mapsUsage.geocodingCalls / 1000) * RATE_GEOCODING;
  const costPlaces = (report.stats.mapsUsage.placesCalls / 1000) * RATE_PLACES;
  const costDirections = (report.stats.mapsUsage.directionsCalls / 1000) * RATE_DIRECTIONS;

  const totalAiCost = costInput + costOutput + costTts;
  const totalMapsCost = costMapLoad + costGeocoding + costPlaces + costDirections;
  const totalUsd = totalAiCost + totalMapsCost;
  const totalKrw = Math.round(totalUsd * EXCHANGE_RATE);

  // Projections
  const projectedUsd = totalUsd * projectionCount;
  const projectedKrw = Math.round(projectedUsd * EXCHANGE_RATE);

  return (
    <div className="fixed inset-0 z-[10000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-gray-900 text-white px-6 py-5 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <ScrollText className="text-blue-400" />
              Final Cost Report
            </h2>
            <p className="text-gray-400 text-xs mt-1">
              Session ID: {new Date(report.startTime).getTime().toString().slice(-6)}
            </p>
          </div>
          <button onClick={onClose} className="p-2 bg-gray-800 hover:bg-gray-700 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-gray-50">
          
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200">
              <div className="flex items-center gap-2 text-gray-500 text-xs font-bold mb-2 uppercase">
                <Clock size={14} /> Duration
              </div>
              <div className="text-2xl font-black text-gray-900">
                {formatTime(report.durationSeconds)}
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200">
              <div className="flex items-center gap-2 text-gray-500 text-xs font-bold mb-2 uppercase">
                <Map size={14} /> Distance
              </div>
              <div className="text-2xl font-black text-gray-900">
                {formatDist(report.totalDistanceMeters)}
              </div>
            </div>
          </div>
          
          {/* 🔥 REAL COST CARD */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 relative overflow-hidden">
             <div className="absolute top-0 right-0 p-2 opacity-10">
                 <DollarSign size={80} className="text-green-500" />
             </div>
             <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
               <DollarSign size={16} className="text-green-600" /> 
               Total Session Cost
            </h3>
            <div className="flex justify-between items-end border-b border-gray-100 pb-4 mb-4">
                <div>
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Estimated Bill (KRW)</p>
                    <p className="text-4xl font-black text-gray-900">₩{totalKrw.toLocaleString()}</p>
                    <p className="text-xs text-gray-400 mt-1 font-mono">${totalUsd.toFixed(5)} USD</p>
                </div>
            </div>
            
            {/* Breakdown */}
            <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center">
                    <span className="text-gray-600 flex items-center gap-2"><Cpu size={14} /> AI & TTS</span>
                    <span className="font-bold text-gray-900">${totalAiCost.toFixed(5)}</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-gray-600 flex items-center gap-2"><MapPin size={14} /> Maps API</span>
                    <span className={`font-bold ${totalMapsCost > totalAiCost ? 'text-red-600' : 'text-gray-900'}`}>${totalMapsCost.toFixed(5)}</span>
                </div>
            </div>
          </div>

          {/* 🚀 BUSINESS PROJECTION CARD (New!) */}
          <div className="bg-gradient-to-br from-indigo-900 to-blue-900 p-5 rounded-2xl shadow-lg text-white relative overflow-hidden">
             <div className="absolute top-0 right-0 p-3 opacity-10">
                 <TrendingUp size={100} className="text-white" />
             </div>
             
             <div className="flex justify-between items-center mb-4 relative z-10">
                <h3 className="text-sm font-bold flex items-center gap-2">
                   <Users size={16} className="text-yellow-400" /> 
                   Scale Projection
                </h3>
                <select 
                    value={projectionCount}
                    onChange={(e) => setProjectionCount(Number(e.target.value))}
                    className="bg-white/10 text-xs font-bold border border-white/20 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-white/30 text-white"
                >
                    <option value="100" className="text-gray-900">100 Users</option>
                    <option value="1000" className="text-gray-900">1,000 Users</option>
                    <option value="10000" className="text-gray-900">10,000 Users</option>
                </select>
             </div>

             <div className="mb-4 relative z-10">
                 <p className="text-xs text-indigo-200 mb-1">Projected Cost ({projectionCount.toLocaleString()} users)</p>
                 <p className="text-3xl font-black text-white">₩{projectedKrw.toLocaleString()}</p>
                 <p className="text-xs text-indigo-300 font-mono mt-1">${projectedUsd.toFixed(2)} USD</p>
             </div>

             {/* Warnings based on cost */}
             {totalMapsCost > totalAiCost && (
                 <div className="bg-red-500/20 border border-red-400/30 rounded-lg p-3 flex items-start gap-2 relative z-10">
                     <AlertTriangle size={16} className="text-red-300 flex-shrink-0 mt-0.5" />
                     <div className="text-xs text-red-100">
                         <strong>High Maps Cost Alert:</strong><br/>
                         Places API ($32/1k) is driving {((totalMapsCost/totalUsd)*100).toFixed(0)}% of costs. Reduce frequency.
                     </div>
                 </div>
             )}
          </div>

          {/* 🗺️ DETAILED MAPS COST ANALYSIS */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200">
            <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
               <MapPin size={16} className="text-red-500" /> Google Maps API Usage
            </h3>
            <div className="space-y-3">
                <div className="flex justify-between items-center p-2 bg-red-50 rounded-lg border border-red-100">
                    <div className="text-xs text-red-900">
                        <span className="font-bold block">Places API (Restaurant)</span>
                        <span className="text-[10px] text-red-400">$32.00 / 1k requests</span>
                    </div>
                    <div className="text-right">
                        <div className="text-sm font-bold text-red-700">{report.stats.mapsUsage.placesCalls} calls</div>
                        <div className="text-[10px] text-red-500 font-mono">${costPlaces.toFixed(4)}</div>
                    </div>
                </div>

                <div className="flex justify-between items-center p-2 bg-gray-50 rounded-lg border border-gray-100">
                    <div className="text-xs text-gray-700">
                        <span className="font-bold block">Geocoding (Address)</span>
                        <span className="text-[10px] text-gray-400">$5.00 / 1k requests</span>
                    </div>
                    <div className="text-right">
                        <div className="text-sm font-bold text-gray-900">{report.stats.mapsUsage.geocodingCalls} calls</div>
                        <div className="text-[10px] text-gray-500 font-mono">${costGeocoding.toFixed(4)}</div>
                    </div>
                </div>

                <div className="flex justify-between items-center p-2 bg-gray-50 rounded-lg border border-gray-100">
                    <div className="text-xs text-gray-700">
                        <span className="font-bold block">Directions (Routing)</span>
                        <span className="text-[10px] text-gray-400">$5.00 / 1k requests</span>
                    </div>
                    <div className="text-right">
                        <div className="text-sm font-bold text-gray-900">{report.stats.mapsUsage.directionsCalls} calls</div>
                        <div className="text-[10px] text-gray-500 font-mono">${costDirections.toFixed(4)}</div>
                    </div>
                </div>
            </div>
          </div>

          {/* 🧠 AI COST ANALYSIS */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200">
            <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
               <Cpu size={16} className="text-purple-600" /> AI Consumption (Gemini + TTS)
            </h3>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center p-2 bg-purple-50 rounded-lg border border-purple-100">
                <div className="text-xs text-purple-900">
                   <span className="font-bold block">LLM Input</span>
                   <span className="text-[10px] text-purple-400">{report.stats.totalLlmInputTokens.toLocaleString()} tokens</span>
                </div>
                <div className="text-right">
                   <div className="text-[10px] text-purple-700 font-mono">${costInput.toFixed(4)}</div>
                </div>
              </div>

              <div className="flex justify-between items-center p-2 bg-purple-50 rounded-lg border border-purple-100">
                <div className="text-xs text-purple-900">
                   <span className="font-bold block">LLM Output</span>
                   <span className="text-[10px] text-purple-400">{report.stats.totalLlmOutputTokens.toLocaleString()} tokens</span>
                </div>
                <div className="text-right">
                   <div className="text-[10px] text-purple-700 font-mono">${costOutput.toFixed(4)}</div>
                </div>
              </div>

              <div className="flex justify-between items-center p-2 bg-blue-50 rounded-lg border border-blue-100">
                <div className="text-xs text-blue-900">
                   <span className="font-bold block">TTS ({report.ttsMode})</span>
                   <span className="text-[10px] text-blue-400">{report.stats.totalTtsCharacters.toLocaleString()} chars</span>
                </div>
                <div className="text-right">
                   <div className="text-[10px] text-blue-700 font-mono">${costTts.toFixed(4)}</div>
                </div>
              </div>
            </div>
          </div>

          {/* 📜 NEW: NARRATION LOG SECTION */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200">
            <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
               <FileText size={16} className="text-gray-600" /> Tour Narration Log
            </h3>
            
            {report.narrations.length === 0 ? (
                <div className="text-center py-6 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                    <p className="text-xs text-gray-400">No narrations generated during this session.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {report.narrations.map((log, idx) => (
                        <div key={idx} className="flex gap-3 text-xs border-b border-gray-50 last:border-0 pb-3 last:pb-0">
                            <div className="min-w-[60px] text-gray-400 font-mono text-[10px] pt-0.5">
                                {formatTimestamp(log.timestamp)}
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                                        log.category === 'landmark' ? 'bg-blue-100 text-blue-600' :
                                        log.category === 'story' ? 'bg-purple-100 text-purple-600' :
                                        log.category === 'greeting' ? 'bg-green-100 text-green-600' :
                                        'bg-gray-100 text-gray-600'
                                    }`}>
                                        {log.category}
                                    </span>
                                    <span className="font-bold text-gray-900 truncate max-w-[150px]">{log.title}</span>
                                </div>
                                <p className="text-gray-600 line-clamp-2 leading-relaxed">
                                    {log.text}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
          </div>

        </div>

        <div className="p-4 bg-white border-t border-gray-100">
            <p className="text-[10px] text-center text-gray-400 mb-3">
                * Prices based on Google Cloud Standard Pay-as-you-go rates.
            </p>
            <button 
                onClick={onClose}
                className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold text-sm hover:bg-gray-800 transition-colors"
            >
                Close Report
            </button>
        </div>
      </div>
    </div>
  );
};

export default TestReportModal;
