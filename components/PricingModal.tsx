
import React, { useState } from 'react';
import { X, Check, Star, Zap, Crown, ShieldCheck, Volume2, StopCircle, Sparkles, User, Mic } from 'lucide-react';
import { AppLanguage } from '../types';
import { playSampleTTS, stopSpeaking } from '../services/geminiService';

interface PricingModalProps {
  onClose: () => void;
  onSelectPlan: (planId: string) => void;
  language: AppLanguage;
}

const PricingModal: React.FC<PricingModalProps> = ({ onClose, onSelectPlan, language }) => {
  const isKorean = language === AppLanguage.KOREAN;
  const [tier, setTier] = useState<'neural' | 'standard'>('neural');
  const [playingSample, setPlayingSample] = useState<'neural' | 'standard' | null>(null);

  const handlePlaySample = (e: React.MouseEvent, mode: 'neural' | 'standard') => {
      e.stopPropagation();
      if (playingSample === mode) {
          stopSpeaking();
          setPlayingSample(null);
      } else {
          setPlayingSample(mode);
          playSampleTTS(language, mode).then(() => setPlayingSample(null));
      }
  };

  const commonFeatures = [
    isKorean ? "무제한 위치 기반 가이드" : "Unlimited Location Guide",
    isKorean ? "위키백과 심층 정보" : "Wikipedia Deep Dives",
    isKorean ? "현지 맛집 추천" : "Local Food Gems",
  ];

  return (
    <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-gray-50 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden relative flex flex-col max-h-[90vh] border border-gray-200">
        
        {/* Close Button */}
        <button 
          onClick={() => { stopSpeaking(); onClose(); }}
          className="absolute top-4 right-4 p-2 bg-gray-200 hover:bg-gray-300 rounded-full text-gray-600 transition-colors z-20"
        >
          <X size={20} />
        </button>

        {/* Title */}
        <div className="pt-8 px-6 pb-2 text-center">
            <h2 className="text-xl font-extrabold text-gray-900">
                {isKorean ? "오디오 가이드 선택" : "Choose Your Audio Experience"}
            </h2>
            <p className="text-gray-500 text-xs mt-1">
                {isKorean ? "여행 스타일에 맞는 목소리를 선택하세요" : "Select the voice quality that fits your trip"}
            </p>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
            
            {/* 1. TIER SELECTION CARDS (BIG SPLIT) */}
            <div className="grid grid-cols-2 gap-3 mb-6 pt-2">
                {/* Standard Option */}
                <button 
                    onClick={() => { stopSpeaking(); setTier('standard'); }}
                    className={`relative p-4 rounded-2xl border-2 transition-all duration-300 flex flex-col items-center gap-2 text-center ${
                        tier === 'standard' 
                        ? 'bg-white border-blue-500 shadow-xl shadow-blue-100 scale-105 z-10' 
                        : 'bg-gray-100 border-transparent opacity-60 hover:opacity-80 hover:bg-white'
                    }`}
                >
                    <div className={`p-3 rounded-full mb-1 ${tier === 'standard' ? 'bg-blue-100 text-blue-600' : 'bg-gray-200 text-gray-500'}`}>
                        <Volume2 size={24} />
                    </div>
                    <div>
                        <div className="font-bold text-gray-800 text-sm">Standard</div>
                        <div className="text-[10px] text-gray-500 mt-0.5">
                            {isKorean ? "기본 기계음" : "Basic Digital Voice"}
                        </div>
                    </div>
                    {tier === 'standard' && <div className="absolute -top-3 bg-blue-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">Selected</div>}
                </button>

                {/* Premium Option */}
                <button 
                    onClick={() => { stopSpeaking(); setTier('neural'); }}
                    className={`relative p-4 rounded-2xl border-2 transition-all duration-300 flex flex-col items-center gap-2 text-center ${
                        tier === 'neural' 
                        ? 'bg-white border-violet-500 shadow-xl shadow-violet-100 scale-105 z-10' 
                        : 'bg-gray-100 border-transparent opacity-60 hover:opacity-80 hover:bg-white'
                    }`}
                >
                    {/* Shimmer Effect */}
                    {tier === 'neural' && <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/40 to-transparent opacity-50 w-full h-full animate-[shimmer_2s_infinite] rounded-2xl"></div>}
                    
                    <div className={`p-3 rounded-full mb-1 ${tier === 'neural' ? 'bg-violet-100 text-violet-600' : 'bg-gray-200 text-gray-500'}`}>
                        <Sparkles size={24} fill="currentColor" className={tier === 'neural' ? 'animate-pulse' : ''} />
                    </div>
                    <div>
                        <div className="font-bold text-gray-800 text-sm flex items-center justify-center gap-1">
                            Premium <Crown size={10} className="text-yellow-500 fill-yellow-500"/>
                        </div>
                        <div className="text-[10px] text-gray-500 mt-0.5">
                            {isKorean ? "사람 같은 AI 음성" : "Ultra-Realistic AI"}
                        </div>
                    </div>
                    {tier === 'neural' && <div className="absolute -top-3 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm z-20">Best Choice</div>}
                </button>
            </div>

            {/* 2. AUDIO SAMPLE PLAYER */}
            <div className={`mb-6 p-4 rounded-2xl border flex items-center gap-4 transition-colors duration-300 ${
                tier === 'neural' ? 'bg-violet-50 border-violet-100' : 'bg-blue-50 border-blue-100'
            }`}>
                <button 
                    onClick={(e) => handlePlaySample(e, tier)}
                    className={`w-12 h-12 rounded-full flex items-center justify-center text-white shadow-md transition-all active:scale-95 flex-shrink-0 ${
                        tier === 'neural' 
                        ? 'bg-gradient-to-br from-violet-500 to-fuchsia-600 hover:shadow-lg hover:shadow-violet-200' 
                        : 'bg-blue-500 hover:bg-blue-600'
                    }`}
                >
                    {playingSample === tier ? <StopCircle size={24} className="animate-pulse" /> : <Volume2 size={24} />}
                </button>
                <div className="flex-1">
                    <h4 className={`text-sm font-bold ${tier === 'neural' ? 'text-violet-900' : 'text-blue-900'}`}>
                        {tier === 'neural' 
                            ? (isKorean ? "실제 사람 같은 목소리 듣기" : "Hear the Premium Voice") 
                            : (isKorean ? "표준 목소리 듣기" : "Hear the Standard Voice")
                        }
                    </h4>
                    <p className={`text-xs mt-0.5 ${tier === 'neural' ? 'text-violet-600' : 'text-blue-600'}`}>
                        {tier === 'neural' 
                            ? (isKorean ? "마치 현지 친구가 설명해주는 느낌" : "Feels like a local friend guiding you") 
                            : (isKorean ? "정보 전달에 최적화된 또박또박한 톤" : "Clear and concise information")
                        }
                    </p>
                </div>
            </div>

            {/* 3. DURATION & PRICE SELECTION */}
            <div className="space-y-3">
                <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">
                    {isKorean ? "이용권 선택" : "Select Duration"}
                </div>

                {/* 24 Hour Option */}
                <button 
                    onClick={() => onSelectPlan(tier === 'neural' ? 'neural-1day' : 'standard-1day')}
                    className="w-full bg-white border border-gray-200 rounded-2xl p-4 flex items-center justify-between hover:border-gray-300 hover:shadow-md transition-all group"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 group-hover:bg-gray-200 transition-colors">
                            <User size={20} />
                        </div>
                        <div className="text-left">
                            <div className="font-bold text-gray-800 text-sm">
                                {isKorean ? "24시간 패스" : "24-Hour Pass"}
                            </div>
                            <div className="text-[11px] text-gray-400">
                                {isKorean ? "가볍게 하루 체험하기" : "Great for a day trip"}
                            </div>
                        </div>
                    </div>
                    <div className={`text-xl font-bold ${tier === 'neural' ? 'text-violet-600' : 'text-blue-600'}`}>
                        ${tier === 'neural' ? '6.99' : '4.99'}
                    </div>
                </button>

                {/* 72 Hour Option (Featured) */}
                <button 
                    onClick={() => onSelectPlan(tier === 'neural' ? 'neural-3day' : 'standard-3day')}
                    className={`w-full relative rounded-2xl p-1 transition-all group ${
                        tier === 'neural' 
                        ? 'bg-gradient-to-r from-violet-200 to-fuchsia-200 hover:from-violet-300 hover:to-fuchsia-300' 
                        : 'bg-gradient-to-r from-blue-200 to-cyan-200 hover:from-blue-300 hover:to-cyan-300'
                    }`}
                >
                    <div className="bg-white rounded-xl p-4 flex items-center justify-between h-full">
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                                tier === 'neural' ? 'bg-violet-100 text-violet-600' : 'bg-blue-100 text-blue-600'
                            }`}>
                                <Zap size={20} fill="currentColor" />
                            </div>
                            <div className="text-left">
                                <div className="font-bold text-gray-800 text-sm flex items-center gap-2">
                                    {isKorean ? "72시간 패스" : "72-Hour Pass"}
                                    <span className={`text-[9px] px-1.5 py-0.5 rounded text-white font-bold ${
                                        tier === 'neural' ? 'bg-violet-500' : 'bg-blue-500'
                                    }`}>{isKorean ? "할인" : "SAVE"}</span>
                                </div>
                                <div className="text-[11px] text-gray-400">
                                    {isKorean ? "3일 동안 여유롭게 즐기세요" : "Perfect for a weekend getaway"}
                                </div>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className={`text-xl font-black ${tier === 'neural' ? 'text-violet-600' : 'text-blue-600'}`}>
                                ${tier === 'neural' ? '18.99' : '12.99'}
                            </div>
                            {/* MATH CORRECTION: 4.99*3=14.97, 6.99*3=20.97 */}
                            <div className="text-[10px] text-gray-400 line-through">
                                ${tier === 'neural' ? '20.97' : '14.97'}
                            </div>
                        </div>
                    </div>
                </button>
            </div>

            {/* Footer Features */}
            <div className="mt-6 pt-4 border-t border-gray-200">
                <div className="flex flex-wrap gap-x-4 gap-y-2 justify-center">
                    {commonFeatures.map((feat, idx) => (
                    <div key={idx} className="flex items-center gap-1.5 text-gray-500">
                        <Check size={12} className="text-green-500" strokeWidth={3} />
                        <span className="text-[11px] font-medium">{feat}</span>
                    </div>
                    ))}
                </div>
                <div className="mt-4 text-center">
                    <p className="text-[10px] text-gray-400 flex items-center justify-center gap-1">
                    <ShieldCheck size={12} />
                    {isKorean ? "안전한 결제 · 언제든지 취소 가능" : "Secure payment · Cancel anytime"}
                    </p>
                </div>
            </div>

        </div>
      </div>
    </div>
  );
};

export default PricingModal;
