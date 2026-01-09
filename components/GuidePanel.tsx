import React, { useState, useEffect, useRef } from 'react';
import { PlaceOfInterest, AppLanguage, ChatMessage, Coordinates, RestaurantRecommendation } from '../types';
import { Navigation, MapPin, Globe, Search, ImageOff, Radio, ChevronUp, ChevronDown, MessageCircle, Mic, Send, Bot, BatteryCharging, Utensils, Loader2, Star, X, ExternalLink, BookOpen, Crown, Layers, Sparkles, Heart, Activity, Infinity, Mail, StopCircle, RotateCcw, AlertCircle, AlertTriangle, Camera, Book, Play, Pause } from 'lucide-react';
import { askAiGuide, speakText, getAiRecommendedRestaurants, getFoodSearchLimitInfo, stopSpeaking, getGeminiStatus, testGeminiConnection, getPhotoSpots, generateTravelDiary } from '../services/geminiService';
import { logEvent, getUserStats } from '../services/analyticsService';

export interface GuidePanelProps {
  isWalking: boolean;
  currentPoi: PlaceOfInterest | null;
  onStartWalking: () => void;
  onStopWalking: () => void;
  hasDestination: boolean;
  language: AppLanguage;
  currentLocation: Coordinates;
  onOpenLangSettings: () => void;
  onOpenApiSettings: () => void;
  onToggleBatterySaver: () => void;
  onOpenPricing: () => void;
  mapType: 'roadmap' | 'hybrid';
  onToggleMapType: () => void;
  onOpenAnalytics: () => void;
  routeInfo?: { distance: number; duration: number } | null;
  onAddPois?: (pois: PlaceOfInterest[]) => void;
}

const UI_TEXT = {
  [AppLanguage.ENGLISH]: {
    guide: "Guide",
    start: "Start Tour",
    end: "End Tour",
    where: "Where to?",
    searchPrompt: "Search or tap a place on map",
    ready: "Ready to Explore",
    pressStart: "Press Start to begin audio tour",
    scanning: "Scanning...",
    walk: "Walk around to find stories",
    look: "Looking for interesting places...",
    foodTitle: "Nearby Eats",
    noFood: "No recommendations found nearby.",
    diary: "Travel Diary",
    wiki: "Read on Wikipedia",
    openMap: "Open Map",
    play: "Playing",
    aiSource: "AI Generated Content",
    travelStory: "Travel Story"
  },
  [AppLanguage.KOREAN]: {
    guide: "가이드",
    start: "투어 시작",
    end: "투어 종료",
    where: "어디로 갈까요?",
    searchPrompt: "장소를 검색하거나 지도에서 선택하세요",
    ready: "탐험 준비 완료",
    pressStart: "시작 버튼을 눌러 투어를 시작하세요",
    scanning: "탐색 중...",
    walk: "주변을 걸으며 이야기를 찾아보세요",
    look: "흥미로운 장소를 찾는 중...",
    foodTitle: "주변 맛집",
    noFood: "추천 식당을 찾을 수 없습니다.",
    diary: "여행 일기",
    wiki: "위키백과 더보기",
    openMap: "지도 열기",
    play: "재생 중",
    aiSource: "AI 생성 콘텐츠",
    travelStory: "여행 이야기"
  },
  [AppLanguage.JAPANESE]: {
    guide: "ガイド",
    start: "ツアー開始",
    end: "ツアー終了",
    where: "どこへ行きますか？",
    searchPrompt: "場所を検索または地図で選択",
    ready: "準備完了",
    pressStart: "開始ボタンを押してツアーを始めましょう",
    scanning: "スキャン中...",
    walk: "歩いて物語を見つけましょう",
    look: "面白い場所を探しています...",
    foodTitle: "近くのグルメ",
    noFood: "近くのおすすめが見つかりません。",
    diary: "旅行日記",
    wiki: "ウィキペディア",
    openMap: "地図を開く",
    play: "再生中",
    aiSource: "AI生成コンテンツ",
    travelStory: "旅の物語"
  },
  // Default fallback for others
  [AppLanguage.CHINESE]: { guide: "指南", start: "开始", end: "结束", where: "去哪里？", searchPrompt: "搜索地点", ready: "准备就好", pressStart: "按开始", scanning: "扫描中...", walk: "四处走走", look: "寻找中...", foodTitle: "附近美食", noFood: "无推荐", diary: "日记", wiki: "维基百科", openMap: "打开地图", play: "播放中", aiSource: "AI生成", travelStory: "故事" },
  [AppLanguage.SPANISH]: { guide: "Guía", start: "Comenzar", end: "Terminar", where: "¿A dónde?", searchPrompt: "Buscar lugar", ready: "Listo", pressStart: "Presiona Inicio", scanning: "Escaneando...", walk: "Camina para encontrar", look: "Buscando...", foodTitle: "Comida", noFood: "Sin recomendaciones", diary: "Diario", wiki: "Wikipedia", openMap: "Abrir mapa", play: "Reproduciendo", aiSource: "Generado por IA", travelStory: "Historia" },
  [AppLanguage.FRENCH]: { guide: "Guide", start: "Démarrer", end: "Fin", where: "Où aller ?", searchPrompt: "Chercher un lieu", ready: "Prêt", pressStart: "Appuyez sur Démarrer", scanning: "Scan...", walk: "Marchez pour découvrir", look: "Recherche...", foodTitle: "Nourriture", noFood: "Aucune recommandation", diary: "Journal", wiki: "Wikipédia", openMap: "Ouvrir carte", play: "Lecture", aiSource: "Généré par IA", travelStory: "Histoire" },
  [AppLanguage.GERMAN]: { guide: "Führer", start: "Start", end: "Ende", where: "Wohin?", searchPrompt: "Ort suchen", ready: "Bereit", pressStart: "Start drücken", scanning: "Scannen...", walk: "Herumlaufen", look: "Suchen...", foodTitle: "Essen", noFood: "Keine Empfehlungen", diary: "Tagebuch", wiki: "Wikipedia", openMap: "Karte öffnen", play: "Wiedergabe", aiSource: "AI Generiert", travelStory: "Reisegeschichte" },
  [AppLanguage.ARABIC]: { guide: "دليل", start: "بدء", end: "إنهاء", where: "إلى أين؟", searchPrompt: "بحث عن مكان", ready: "جاهز", pressStart: "اضغط ابدأ", scanning: "مسح...", walk: "تجول", look: "بحث...", foodTitle: "طعام", noFood: "لا توصيات", diary: "مذكرات", wiki: "ويكيبيديا", openMap: "فتح الخريطة", play: "تشغيل", aiSource: "تم إنشاؤه بواسطة AI", travelStory: "قصة سفر" },
  [AppLanguage.THAI]: { guide: "ไกด์", start: "เริ่ม", end: "จบ", where: "ไปไหน?", searchPrompt: "ค้นหา", ready: "พร้อม", pressStart: "กดเริ่ม", scanning: "กำลังสแกน...", walk: "เดินสำรวจ", look: "กำลังหา...", foodTitle: "อาหาร", noFood: "ไม่พบคำแนะนำ", diary: "ไดอารี่", wiki: "วิกิพีเดีย", openMap: "เปิดแผนที่", play: "กำลังเล่น", aiSource: "สร้างโดย AI", travelStory: "เรื่องราวการเดินทาง" },
  [AppLanguage.VIETNAMESE]: { guide: "Hướng dẫn", start: "Bắt đầu", end: "Kết thúc", where: "Đi đâu?", searchPrompt: "Tìm kiếm", ready: "Sẵn sàng", pressStart: "Nhấn Bắt đầu", scanning: "Đang quét...", walk: "Đi bộ để tìm", look: "Đang tìm...", foodTitle: "Đồ ăn", noFood: "Không có đề xuất", diary: "Nhật ký", wiki: "Wikipedia", openMap: "Mở bản đồ", play: "Đang phát", aiSource: "Tạo bởi AI", travelStory: "Câu chuyện du lịch" }
};

const getTranslation = (lang: AppLanguage) => (UI_TEXT as any)[lang] || UI_TEXT[AppLanguage.ENGLISH];

const GuidePanel: React.FC<GuidePanelProps> = ({
  isWalking,
  currentPoi,
  onStartWalking,
  onStopWalking,
  hasDestination,
  language,
  currentLocation,
  onOpenLangSettings,
  onToggleBatterySaver,
  onOpenPricing,
  mapType,
  onToggleMapType,
  onOpenAnalytics,
  onAddPois
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  
  // Chat State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Restaurant Search State
  const [isSearchingFood, setIsSearchingFood] = useState(false);
  const [showFoodModal, setShowFoodModal] = useState(false);
  const [recommendedRestaurants, setRecommendedRestaurants] = useState<RestaurantRecommendation[]>([]);
  const [remainingFoodSearches, setRemainingFoodSearches] = useState<number>(10);
  const [limitReachedError, setLimitReachedError] = useState(false);

  // Diary State
  const [showDiaryModal, setShowDiaryModal] = useState(false);
  const [diaryContent, setDiaryContent] = useState("");
  const [isGeneratingDiary, setIsGeneratingDiary] = useState(false);

  // Analytics State
  const [isLiked, setIsLiked] = useState(false);
  
  // Playback State
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  
  // Connection Status State
  const [aiStatus, setAiStatus] = useState<'unknown' | 'connected' | 'error'>('unknown');

  // Swipe Logic Refs
  const touchStartY = useRef<number | null>(null);
  const touchEndY = useRef<number | null>(null);
  const minSwipeDistance = 50; 
  
  const t = getTranslation(language);

  useEffect(() => {
    if (currentPoi) {
      if (isVisible) setIsExpanded(true);
      setIsLiked(false);
      setIsAudioPlaying(true);
      logEvent('POI_VIEW', { 
          targetName: currentPoi.name, 
          category: currentPoi.category,
          location: currentPoi.location
      });
    } 
  }, [currentPoi]);

  useEffect(() => {
      if(isChatOpen && chatEndRef.current) {
          chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
  }, [chatHistory, isChatOpen]);

  useEffect(() => {
      const info = getFoodSearchLimitInfo();
      setRemainingFoodSearches(info.remaining);
      const interval = setInterval(() => {
          setAiStatus(getGeminiStatus());
      }, 2000);
      return () => clearInterval(interval);
  }, []);

  const toggleExpand = () => setIsExpanded(!isExpanded);

  const onTouchStart = (e: React.TouchEvent) => {
    touchEndY.current = null;
    touchStartY.current = e.targetTouches[0].clientY;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    touchEndY.current = e.targetTouches[0].clientY;
  };

  const onTouchEnd = () => {
    if (!touchStartY.current || !touchEndY.current) return;
    const distance = touchStartY.current - touchEndY.current;
    const isSwipeUp = distance > minSwipeDistance;
    const isSwipeDown = distance < -minSwipeDistance;

    if (isSwipeUp) setIsExpanded(true);
    if (isSwipeDown) {
        if (isExpanded) setIsExpanded(false);
        else setIsVisible(false);
    }
  };

  const handleSendMessage = async () => {
      if(!chatInput.trim()) return;
      const userMsg: ChatMessage = { id: Date.now().toString(), sender: 'user', text: chatInput, timestamp: Date.now() };
      setChatHistory(prev => [...prev, userMsg]);
      setChatInput("");
      setIsAiThinking(true);
      const currentCoords = currentPoi?.location || currentLocation; 
      const responseText = await askAiGuide(userMsg.text, currentCoords, language);
      setIsAiThinking(false);
      const aiMsg: ChatMessage = { id: (Date.now() + 1).toString(), sender: 'ai', text: responseText, timestamp: Date.now() };
      setChatHistory(prev => [...prev, aiMsg]);
      await speakText(responseText, language);
  };

  const handleMicClick = () => {
      if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
          alert("Your browser does not support speech recognition.");
          return;
      }
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.lang = language === AppLanguage.KOREAN ? 'ko-KR' : 'en-US';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onresult = (event: any) => setChatInput(event.results[0][0].transcript);
      recognition.start();
  };

  const handleFindFood = async () => {
      if (isSearchingFood) return;
      setIsSearchingFood(true);
      setLimitReachedError(false);
      try {
          const recs = await getAiRecommendedRestaurants(currentLocation, language);
          setRecommendedRestaurants(recs);
          setShowFoodModal(true);
      } catch (e: any) {
          if (e.message === "DAILY_LIMIT_REACHED") {
              setLimitReachedError(true);
              setShowFoodModal(true);
          }
      } finally {
          setIsSearchingFood(false);
          const info = getFoodSearchLimitInfo();
          setRemainingFoodSearches(info.remaining);
      }
  };

  const handleFindPhotoSpots = async () => {
      if (!onAddPois) return;
      alert(language === AppLanguage.KOREAN ? "📸 주변 포토 스팟을 찾는 중입니다..." : "📸 Finding photo spots...");
      const spots = await getPhotoSpots(currentLocation);
      if (spots.length > 0) {
          onAddPois(spots);
          alert(language === AppLanguage.KOREAN ? `${spots.length}개의 포토 스팟을 찾았습니다! 지도에서 확인하세요.` : `Found ${spots.length} photo spots! Check the map.`);
      } else {
          alert(language === AppLanguage.KOREAN ? "근처에 포토 스팟이 없습니다." : "No photo spots found nearby.");
      }
  };

  const handleGenerateDiary = async () => {
      setIsGeneratingDiary(true);
      setShowDiaryModal(true);
      const stats = getUserStats(); 
      const visited = stats.likedPlaces.length > 0 ? stats.likedPlaces : ["WalkTale Tour"];
      const diary = await generateTravelDiary(visited, language);
      setDiaryContent(diary);
      setIsGeneratingDiary(false);
  };

  const handleRestaurantClick = (searchQuery: string) => {
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(searchQuery)}`, '_blank');
  };

  const handleLike = () => {
      if (currentPoi && !isLiked) {
          setIsLiked(true);
          logEvent('POI_LIKE', { targetName: currentPoi.name, category: currentPoi.category });
      }
  };

  const handleSendFeedback = () => {
      const subject = `[WalkTale Feedback] ${currentLocation.lat.toFixed(4)}, ${currentLocation.lng.toFixed(4)}`;
      const body = `Location: ${currentLocation.lat}, ${currentLocation.lng}\nLanguage: ${language}`;
      window.location.href = `mailto:support@walktale.ai?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const handleStopAudio = (e: React.MouseEvent) => {
      e.stopPropagation();
      stopSpeaking();
      setIsAudioPlaying(false);
  };

  const handleReplayAudio = async (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!currentPoi) return;
      setIsAudioPlaying(true);
      await speakText(currentPoi.description, language, currentPoi.name);
      setIsAudioPlaying(false); 
  };

  const getDisplayTitle = (name: string) => {
      if (!name) return "";
      if (name.toLowerCase().includes('chat topic')) return t.travelStory;
      return name;
  };

  const ToolButton = ({ onClick, icon: Icon, colorClass, badge }: any) => (
      <button 
          onClick={(e) => { e.stopPropagation(); onClick(); }}
          className={`relative p-3.5 rounded-full backdrop-blur-md shadow-sm border border-white/50 transition-all hover:scale-105 active:scale-95 ${colorClass}`}
      >
          <Icon size={20} strokeWidth={2} />
          {badge}
      </button>
  );

  return (
    <>
      {!isVisible && (
         <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-[400] animate-in zoom-in duration-300">
             <button
                 onClick={() => setIsVisible(true)}
                 className="glass bg-white/80 text-slate-800 shadow-xl px-5 py-3 rounded-full flex items-center gap-2 font-bold text-sm hover:scale-105 active:scale-95 transition-all"
             >
                 <ChevronUp size={18} className="text-indigo-600" />
                 {t.guide}
                 {isWalking && <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse ml-1" />}
             </button>
         </div>
      )}

      {showDiaryModal && (
          <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in" onClick={() => setShowDiaryModal(false)}>
              <div className="bg-white w-full max-w-sm rounded-[32px] p-6 relative shadow-2xl" onClick={e => e.stopPropagation()}>
                  <button onClick={() => setShowDiaryModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X size={20}/></button>
                  <div className="flex items-center gap-2 mb-4 text-purple-600">
                      <Book size={24} />
                      <h3 className="font-bold text-lg text-slate-900">{t.diary}</h3>
                  </div>
                  <div className="bg-purple-50/50 rounded-2xl p-4 min-h-[200px] max-h-[50vh] overflow-y-auto custom-scrollbar text-sm leading-relaxed text-slate-700 whitespace-pre-wrap font-medium">
                      {isGeneratingDiary ? (
                          <div className="flex flex-col items-center justify-center h-full py-10 gap-2 text-slate-400">
                              <Loader2 size={32} className="animate-spin text-purple-400" />
                              <p className="text-xs">Writing your story...</p>
                          </div>
                      ) : diaryContent}
                  </div>
                  <button onClick={() => { navigator.clipboard.writeText(diaryContent); alert("Copied!"); }} className="w-full mt-4 py-3 bg-purple-600 text-white rounded-xl font-bold shadow-lg shadow-purple-200 active:scale-95 transition-transform">
                      Copy to Clipboard
                  </button>
              </div>
          </div>
      )}

      {showFoodModal && (
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-md flex items-end sm:items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setShowFoodModal(false)}>
            <div className="bg-white w-full max-w-sm rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
                <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-orange-50/50">
                    <h3 className="font-bold text-slate-900 flex items-center gap-2 text-lg">
                        <div className="p-2 bg-orange-100 rounded-full text-orange-600"><Utensils size={18} /></div>
                        {t.foodTitle}
                    </h3>
                    <button onClick={() => setShowFoodModal(false)} className="p-2 text-slate-400 hover:text-slate-600 bg-white rounded-full shadow-sm"><X size={20} /></button>
                </div>
                <div className="p-4 overflow-y-auto custom-scrollbar bg-slate-50/50 flex-1">
                    {limitReachedError ? (
                        <div className="text-center py-10 px-6">
                             <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4"><AlertTriangle size={32} className="text-red-500" /></div>
                             <h3 className="text-lg font-bold text-slate-900 mb-2">Limit Reached</h3>
                             <p className="text-sm text-slate-500">Daily limit exceeded. Try again tomorrow.</p>
                        </div>
                    ) : recommendedRestaurants.length === 0 ? (
                        <div className="text-center py-12">
                            <Utensils size={48} className="mx-auto text-slate-200 mb-4" />
                            <p className="text-slate-500 font-medium">{t.noFood}</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {recommendedRestaurants.map((rest, idx) => (
                                <button key={idx} onClick={() => handleRestaurantClick(rest.searchQuery)} className="w-full text-left bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-lg hover:border-orange-200 transition-all group relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-16 h-16 bg-orange-50 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-150 group-hover:bg-orange-100"></div>
                                    <div className="relative z-10">
                                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                            <h4 className="font-bold text-slate-900 text-lg group-hover:text-orange-600 transition-colors leading-tight mr-1">{rest.name}</h4>
                                            {rest.rating && rest.rating > 0 && (
                                                <span className="flex items-center gap-1 text-xs font-bold text-slate-700 bg-yellow-100 px-1.5 py-0.5 rounded-md">
                                                    <Star size={10} fill="currentColor" className="text-yellow-500" />
                                                    {rest.rating}
                                                </span>
                                            )}
                                            {rest.distance && (
                                                <span className="flex items-center gap-1 text-xs font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-md">
                                                    <MapPin size={10} />
                                                    {rest.distance}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 mb-3">
                                            <span className="text-[10px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-bold">{rest.cuisine}</span>
                                            <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-bold flex items-center gap-1"><Sparkles size={8} fill="currentColor" className="text-purple-400" /> AI Pick</span>
                                        </div>
                                        <p className="text-xs text-slate-600 leading-relaxed mb-3 bg-slate-50 p-2 rounded-lg border border-slate-100">"{rest.reason}"</p>
                                        <div className="flex items-center gap-1.5 text-xs text-blue-600 font-bold group-hover:underline"><ExternalLink size={14} /> View on Google Maps</div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
      )}

      <div 
        className={`fixed bottom-0 left-0 right-0 z-[500] glass bg-white/85 backdrop-blur-xl rounded-t-[32px] shadow-[0_-10px_40px_rgba(0,0,0,0.1)] transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] flex flex-col border-t border-white/50`}
        style={{ height: '75vh', transform: !isVisible ? 'translateY(120%)' : isExpanded ? 'translateY(0)' : 'translateY(calc(100% - 170px))' }}
      >
        <div onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd} onClick={(e) => { if (!touchStartY.current || !touchEndY.current || Math.abs(touchStartY.current - touchEndY.current) < 10) toggleExpand(); }} className="w-full relative flex items-center justify-center pt-5 pb-3 bg-transparent cursor-grab active:cursor-grabbing touch-none">
            <div className="w-12 h-1.5 bg-slate-200/80 rounded-full"></div>
            
            {aiStatus === 'error' && (
                <button onClick={(e) => { e.stopPropagation(); testGeminiConnection(); }} className="absolute right-6 top-4 flex items-center gap-1.5 bg-red-50 text-red-600 px-3 py-1.5 rounded-full text-xs font-bold border border-red-100 animate-pulse">
                    <AlertCircle size={14} /> AI Error
                </button>
            )}
        </div>

        <div className="px-6 pb-6 overflow-y-auto custom-scrollbar flex-1">
          
          <div className="flex justify-between items-center mb-6 overflow-x-auto no-scrollbar py-2">
             <div className="flex gap-3">
                <ToolButton onClick={onToggleBatterySaver} icon={BatteryCharging} colorClass="bg-emerald-50 text-emerald-600 hover:bg-emerald-100" />
                <ToolButton 
                    onClick={handleFindFood} 
                    icon={isSearchingFood ? Loader2 : Utensils} 
                    colorClass="bg-orange-50 text-orange-600 hover:bg-orange-100" 
                    badge={remainingFoodSearches < 20 ? <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full text-white text-[9px] font-bold flex items-center justify-center shadow border border-white">{remainingFoodSearches}</div> : null} 
                />
                <ToolButton onClick={handleFindPhotoSpots} icon={Camera} colorClass="bg-pink-50 text-pink-600 hover:bg-pink-100" />
                <ToolButton onClick={handleGenerateDiary} icon={Book} colorClass="bg-purple-50 text-purple-600 hover:bg-purple-100" />
                {onToggleMapType && <ToolButton onClick={onToggleMapType} icon={Layers} colorClass={mapType === 'hybrid' ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-50 text-slate-500'} />}
                <ToolButton onClick={handleSendFeedback} icon={Mail} colorClass="bg-blue-50 text-blue-600 hover:bg-blue-100" />
                {onOpenAnalytics && <ToolButton onClick={onOpenAnalytics} icon={Activity} colorClass="bg-slate-50 text-slate-600 hover:bg-slate-100" />}
            </div>
            
            <div className="flex gap-2 pl-4 border-l border-slate-200 ml-2">
                <ToolButton onClick={onOpenPricing} icon={Crown} colorClass="bg-amber-50 text-amber-600 hover:bg-amber-100 border-amber-200" />
                <ToolButton onClick={onOpenLangSettings} icon={Globe} colorClass="bg-indigo-50 text-indigo-600 hover:bg-indigo-100" />
            </div>
          </div>

          <div className="mb-6">
             <button 
                onClick={(e) => { e.stopPropagation(); isWalking ? onStopWalking() : onStartWalking(); }} 
                disabled={!hasDestination && !isWalking} 
                className={`w-full flex items-center justify-center gap-3 px-6 py-4 rounded-2xl font-bold text-lg text-white transition-all transform active:scale-[0.98] shadow-lg ${!hasDestination && !isWalking ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none' : isWalking ? 'bg-gradient-to-r from-red-500 to-rose-600 hover:shadow-red-200' : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:shadow-indigo-200'}`}
             >
              {isWalking ? <>{t.end}</> : <><Navigation size={20} fill="currentColor" /> {t.start}</>}
            </button>
          </div>

          <div className="space-y-4">
              {isWalking && currentPoi ? (
                <div className="animate-in fade-in slide-in-from-bottom-5 duration-500">
                   <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-2 text-indigo-600 text-[11px] font-bold uppercase tracking-wider bg-indigo-50 px-2.5 py-1.5 rounded-lg border border-indigo-100/50">
                          <MapPin size={12} />
                          {currentPoi.category}
                      </div>
                      <div className="flex items-center gap-3">
                        <button onClick={handleLike} className={`p-2 rounded-full transition-all ${isLiked ? 'bg-red-50 text-red-500 scale-110 shadow-sm' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}>
                            <Heart size={20} fill={isLiked ? "currentColor" : "none"} />
                        </button>
                        {currentPoi.googleMapsUrl && <a href={currentPoi.googleMapsUrl} target="_blank" rel="noreferrer" className="text-xs text-slate-400 hover:text-indigo-600 font-medium underline decoration-slate-300 underline-offset-2 transition-colors">{t.openMap}</a>}
                      </div>
                   </div>
                   
                   <h2 className="text-2xl font-black text-slate-900 mb-4 leading-tight tracking-tight">{getDisplayTitle(currentPoi.name)}</h2>
                   
                   <div className="relative rounded-2xl overflow-hidden mb-5 w-full aspect-video bg-slate-100 shadow-inner group">
                      {currentPoi.imageUrl ? (
                          <img src={currentPoi.imageUrl} alt={currentPoi.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.parentElement?.classList.add('bg-slate-100'); }} />
                      ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50 text-indigo-200"><ImageOff size={40} /></div>
                      )}
                      
                      <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/60 to-transparent flex items-end justify-between">
                          <div className="flex gap-1 items-end h-4 pb-1">
                             {isAudioPlaying && (
                                <>
                                <div className="w-1 bg-white animate-[bounce_1s_infinite] h-2 rounded-full"></div>
                                <div className="w-1 bg-white animate-[bounce_1.2s_infinite] h-4 rounded-full"></div>
                                <div className="w-1 bg-white animate-[bounce_0.8s_infinite] h-3 rounded-full"></div>
                                <span className="text-[10px] text-white/90 font-medium ml-1.5">{t.play}</span>
                                </>
                             )}
                          </div>
                          <div className="flex gap-2">
                             {isAudioPlaying ? (
                                  <button onClick={handleStopAudio} className="w-10 h-10 bg-white text-black rounded-full flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all">
                                      <Pause size={18} fill="currentColor" />
                                  </button>
                             ) : (
                                  <button onClick={handleReplayAudio} className="w-10 h-10 bg-white/90 backdrop-blur text-indigo-600 rounded-full flex items-center justify-center shadow-lg hover:bg-white hover:scale-105 active:scale-95 transition-all">
                                      <Play size={18} fill="currentColor" className="ml-0.5" />
                                  </button>
                             )}
                          </div>
                      </div>
                   </div>

                   <div className="prose prose-sm prose-slate max-w-none mb-4">
                       <p className="text-slate-700 text-[15px] leading-relaxed font-normal">{currentPoi.description}</p>
                   </div>

                   {currentPoi.wikipediaUrl && (
                       <a href={currentPoi.wikipediaUrl} target="_blank" rel="noreferrer" className="flex items-center justify-between px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-slate-700 font-semibold text-sm hover:bg-slate-100 hover:border-slate-200 transition-all shadow-sm group">
                           <span className="flex items-center gap-2"><BookOpen size={16} className="text-slate-400 group-hover:text-indigo-500 transition-colors" /> {t.wiki}</span>
                           <ExternalLink size={14} className="text-slate-300 group-hover:text-slate-500" />
                       </a>
                   )}

                   <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end items-center gap-2">
                       <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-md">
                           <Sparkles size={10} className="text-purple-400" /> {t.aiSource}
                       </span>
                   </div>
                </div>
              ) : isWalking ? (
                <div className="text-center py-6">
                   {!isExpanded ? (
                       <p className="text-sm text-slate-500 flex items-center justify-center gap-2 font-medium animate-pulse"><Radio size={16} className="text-indigo-500" /> {t.look}</p>
                   ) : (
                       <div className="py-8 bg-indigo-50/30 rounded-3xl border border-indigo-100/50 flex flex-col items-center">
                           <div className="relative w-16 h-16 mb-4">
                               <div className="absolute inset-0 bg-indigo-500 rounded-full opacity-10 animate-ping"></div>
                               <div className="relative w-full h-full bg-white rounded-full flex items-center justify-center shadow-md text-indigo-600">
                                   <Radio size={28} />
                               </div>
                           </div>
                           <h3 className="font-bold text-slate-900 text-lg mb-1">{t.scanning}</h3>
                           <p className="text-sm text-slate-500">{t.walk}</p>
                       </div>
                   )}
                </div>
              ) : (
                <div className={`text-center transition-opacity duration-300 ${isExpanded ? 'opacity-100 py-10' : 'opacity-100 py-2'}`}>
                  {!hasDestination ? (
                      <div className="flex flex-col items-center">
                          {isExpanded && <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-400"><Search size={32} /></div>}
                          <h3 className={`font-bold text-slate-800 ${isExpanded ? 'text-xl mb-2' : 'text-base mb-1'}`}>{t.where}</h3>
                          <p className="text-slate-500 text-sm">{t.searchPrompt}</p>
                      </div>
                  ) : (
                      <div className="flex flex-col items-center">
                          {isExpanded && <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mb-4 text-indigo-600 shadow-sm"><Navigation size={32} /></div>}
                          <h3 className={`font-bold text-slate-800 ${isExpanded ? 'text-xl mb-2' : 'text-base mb-1'}`}>{t.ready}</h3>
                          {isExpanded && <p className="text-slate-500 text-sm">{t.pressStart}</p>}
                      </div>
                  )}
                </div>
              )}
          </div>
        </div>
      </div>
    </>
  );
};

export default GuidePanel;
