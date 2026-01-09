import React, { useState } from 'react';
import { Key, Save, Map, Bot, CheckCircle2, AlertTriangle, ExternalLink, CreditCard, ShieldAlert } from 'lucide-react';

interface ApiKeySetupProps {
  onSave: (mapsKey: string, aiKey: string) => void;
  hasGeminiKey?: boolean;
}

const ApiKeySetup: React.FC<ApiKeySetupProps> = ({ onSave, hasGeminiKey = false }) => {
  const [mapsKey, setMapsKey] = useState('');
  const [aiKey, setAiKey] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mapsKey.trim() && (hasGeminiKey || aiKey.trim())) {
      onSave(mapsKey.trim(), aiKey.trim());
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-blue-600 px-6 py-5 text-white">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-white/20 rounded-lg">
                <Key className="h-6 w-6 text-white" />
             </div>
             <div>
                <h2 className="text-xl font-bold">API 키 설정이 필요합니다</h2>
                <p className="text-blue-100 text-xs mt-0.5">정확한 도보 경로와 AI 가이드를 위해 키를 입력해주세요.</p>
             </div>
          </div>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar">
            
            {/* Google Maps Requirement Guide */}
            <div className="mb-6 bg-blue-50 border border-blue-100 rounded-xl p-4">
                <h3 className="text-sm font-bold text-blue-900 mb-3 flex items-center gap-2">
                    <Map size={16} /> 방금 보신 화면 설정법 (중요!)
                </h3>
                
                {/* Critical Tip for REQUEST_DENIED */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-3 text-xs text-green-800 flex gap-2">
                    <CheckCircle2 size={20} className="flex-shrink-0 text-green-600" />
                    <div>
                        <strong>설정을 아주 잘하셨습니다!</strong>
                        <p className="mt-1 leading-relaxed">
                             방금 화면에서 <strong>'애플리케이션 제한사항'</strong>을 <strong>'없음(None)'</strong>으로 두셨다면 완벽합니다. 이제 <strong>[완료]</strong>를 누르고 생성된 키를 복사해오세요.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-gray-700">
                    <div className="flex items-center gap-2 bg-white px-2 py-1.5 rounded border border-blue-100">
                        <CheckCircle2 size={14} className="text-green-600" /> Maps JavaScript API
                    </div>
                    <div className="flex items-center gap-2 bg-white px-2 py-1.5 rounded border border-blue-100 font-bold text-blue-800 ring-1 ring-blue-200">
                        <CheckCircle2 size={14} className="text-green-600" /> Places API
                    </div>
                    <div className="flex items-center gap-2 bg-white px-2 py-1.5 rounded border border-blue-100">
                        <CheckCircle2 size={14} className="text-green-600" /> Directions API
                    </div>
                    <div className="flex items-center gap-2 bg-white px-2 py-1.5 rounded border border-blue-100">
                        <CheckCircle2 size={14} className="text-green-600" /> Geocoding API
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
            {/* Maps Key Input */}
            <div>
                <label className="block text-sm font-bold text-gray-800 mb-1.5">
                    Google Maps API Key
                </label>
                <div className="relative">
                    <input
                        type="text"
                        required
                        value={mapsKey}
                        onChange={(e) => setMapsKey(e.target.value)}
                        className="block w-full pl-4 pr-3 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-mono text-sm"
                        placeholder="AIzaSy..."
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        {mapsKey.length > 10 ? <CheckCircle2 className="text-green-500" size={18}/> : <span className="text-gray-300 text-xs">Required</span>}
                    </div>
                </div>
            </div>

            {/* Gemini Key Input (Conditional) */}
            {!hasGeminiKey && (
                <div>
                    <label className="block text-sm font-bold text-gray-800 mb-1.5 flex justify-between items-center">
                        <span>Gemini API Key</span>
                        <span className="text-xs font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded">Generative Language API</span>
                    </label>
                    <div className="relative">
                        <input
                            type="text"
                            required={!hasGeminiKey}
                            value={aiKey}
                            onChange={(e) => setAiKey(e.target.value)}
                            className="block w-full pl-4 pr-3 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-mono text-sm"
                            placeholder="AIzaSy..."
                        />
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                            {aiKey.length > 10 ? <CheckCircle2 className="text-green-500" size={18}/> : <span className="text-gray-300 text-xs">Required</span>}
                        </div>
                    </div>

                    {/* Google Cloud Credit Instructions */}
                    <div className="mt-3 text-xs text-gray-600 bg-orange-50 p-3 rounded-lg border border-orange-100 space-y-2">
                        <div className="flex items-start gap-1.5 text-orange-800 font-bold mb-1">
                            <CreditCard size={14} className="flex-shrink-0 mt-0.5" />
                            <span>Google Cloud $300 크레딧(유료 계정) 사용법:</span>
                        </div>
                        <ol className="list-decimal pl-5 space-y-1.5 leading-relaxed">
                            <li>
                                <a href="https://console.cloud.google.com/" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">Google Cloud Console</a> 왼쪽 메뉴(≡)에서 <strong>API 및 서비스</strong> &gt; <strong>사용자 인증 정보(Credentials)</strong>로 이동합니다.
                            </li>
                            <li>
                                <strong>[+ 자격 증명 만들기]</strong> &gt; <strong>'API 키'</strong>를 선택하세요.
                            </li>
                            <li>
                                생성된 키(AIza...)를 복사하여 아래에 입력하세요.
                            </li>
                        </ol>
                        <p className="text-[11px] text-gray-500 mt-2 border-t border-orange-200 pt-2">
                            * 결제 계정이 없으면 무료 티어(Google AI Studio) 키를 사용하셔도 됩니다.
                        </p>
                    </div>
                </div>
            )}
            
            {hasGeminiKey && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-3">
                    <CheckCircle2 className="text-green-600" size={20} />
                    <div className="text-xs text-green-800">
                        <span className="font-bold">Gemini API 키가 감지되었습니다.</span>
                        <br/>지도 키만 입력하시면 됩니다.
                    </div>
                </div>
            )}

            <button
                type="submit"
                disabled={!mapsKey || (!hasGeminiKey && !aiKey)}
                className="w-full flex justify-center items-center gap-2 py-4 px-4 mt-4 border border-transparent rounded-xl shadow-lg shadow-blue-200 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-300 disabled:shadow-none disabled:cursor-not-allowed transition-all transform active:scale-[0.98]"
            >
                <Save size={18} />
                저장하고 시작하기
            </button>
            </form>
        </div>
      </div>
    </div>
  );
};

export default ApiKeySetup;