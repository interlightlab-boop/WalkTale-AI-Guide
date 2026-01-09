
import React, { useState, useEffect } from 'react';
import { AppLanguage } from '../types';
import { MapPin, Headphones, Globe, ArrowRight, Compass, Download, Smartphone, X, Share, PlusSquare, MoreVertical, Sparkles } from 'lucide-react';

interface OnboardingScreenProps {
  onComplete: (language: AppLanguage) => void;
}

// Translations preserved
const TRANSLATIONS: Record<AppLanguage, { title: string, subtitle: string, start: string, route: string, audio: string, langLabel: string, install: string, installDesc: string, guideTitle: string, guideIOS: string, guideAndroid: string, close: string }> = {
  [AppLanguage.KOREAN]: {
    title: "WalkTale AI",
    subtitle: "당신만의 AI 현지 가이드.\n도시의 숨겨진 이야기를 발견하세요.",
    start: "여행 시작하기",
    route: "스마트 경로",
    audio: "오디오 가이드",
    langLabel: "언어 선택",
    install: "앱 설치하기",
    installDesc: "더 빠르고 편하게 이용하세요",
    guideTitle: "앱 설치 방법",
    guideIOS: "브라우저 하단의 '공유' 버튼을 누르고\n'홈 화면에 추가'를 선택하세요.",
    guideAndroid: "브라우저 메뉴(점 3개)를 누르고\n'앱 설치' 또는 '홈 화면에 추가'를 선택하세요.",
    close: "닫기"
  },
  [AppLanguage.ENGLISH]: {
    title: "WalkTale AI",
    subtitle: "Your personal AI local guide.\nWalk the city, uncover hidden stories.",
    start: "Start Exploring",
    route: "Smart Routes",
    audio: "Audio Guide",
    langLabel: "Select Language",
    install: "Install App",
    installDesc: "For a better experience",
    guideTitle: "How to Install",
    guideIOS: "Tap the 'Share' button below\nand select 'Add to Home Screen'.",
    guideAndroid: "Tap the browser menu (3 dots)\nand select 'Install App' or 'Add to Home Screen'.",
    close: "Close"
  },
  [AppLanguage.JAPANESE]: {
    title: "WalkTale AI",
    subtitle: "あなただけのAI現地ガイド。\n歩くだけで、隠れた物語をお話しします。",
    start: "探検を始める",
    route: "スマート経路",
    audio: "音声ガイド",
    langLabel: "言語選択",
    install: "アプリをインストール",
    installDesc: "より快適に利用するために",
    guideTitle: "インストール方法",
    guideIOS: "共有ボタンをタップして\n「ホーム画面に追加」を選択してください。",
    guideAndroid: "メニュー（3つの点）をタップして\n「アプリをインストール」を選択してください。",
    close: "閉じる"
  },
  [AppLanguage.CHINESE]: {
    title: "WalkTale AI",
    subtitle: "您的专属AI导游。\n漫步城市，为您讲述隐藏的故事。",
    start: "开始探索",
    route: "智能路线",
    audio: "语音导览",
    langLabel: "选择语言",
    install: "安装应用",
    installDesc: "获得更好的体验",
    guideTitle: "安装说明",
    guideIOS: "点击分享按钮\n选择“添加到主屏幕”。",
    guideAndroid: "点击菜单按钮\n选择“安装应用”或“添加到主屏幕”。",
    close: "关闭"
  },
  [AppLanguage.VIETNAMESE]: {
    title: "WalkTale AI",
    subtitle: "Hướng dẫn viên AI địa phương của bạn.\nChỉ cần đi bộ, chúng tôi sẽ kể những câu chuyện ẩn giấu.",
    start: "Bắt đầu khám phá",
    route: "Lộ trình thông minh",
    audio: "Hướng dẫn âm thanh",
    langLabel: "Chọn ngôn ngữ",
    install: "Cài đặt ứng dụng",
    installDesc: "Để có trải nghiệm tốt hơn",
    guideTitle: "Cách cài đặt",
    guideIOS: "Nhấn nút Chia sẻ\nvà chọn 'Thêm vào màn hình chính'.",
    guideAndroid: "Nhấn menu trình duyệt\nvà chọn 'Cài đặt ứng dụng'.",
    close: "Đóng"
  },
  [AppLanguage.THAI]: {
    title: "WalkTale AI",
    subtitle: "ไกด์ท้องถิ่น AI ส่วนตัวของคุณ\nเดินชมเมือง แล้วให้เราเล่าเรื่องราวที่ซ่อนอยู่",
    start: "เริ่มการสำรวจ",
    route: "เส้นทางอัจฉริยะ",
    audio: "ออดิโอไกด์",
    langLabel: "เลือกภาษา",
    install: "ติดตั้งแอป",
    installDesc: "เพื่อประสบการณ์ที่ดีกว่า",
    guideTitle: "วิธีติดตั้ง",
    guideIOS: "แตะปุ่มแชร์\nแล้วเลือก 'เพิ่มไปยังหน้าจอโฮม'",
    guideAndroid: "แตะเมนูเบราว์เซอร์\nแล้วเลือก 'ติดตั้งแอป'",
    close: "ปิด"
  },
  [AppLanguage.SPANISH]: {
    title: "WalkTale AI",
    subtitle: "Tu guía local personal con IA.\nCamina por la ciudad y deja que te contemos las historias ocultas.",
    start: "Empezar a explorar",
    route: "Rutas inteligentes",
    audio: "Audioguía",
    langLabel: "Seleccionar idioma",
    install: "Instalar App",
    installDesc: "Para una mejor experiencia",
    guideTitle: "Cómo instalar",
    guideIOS: "Toca el botón Compartir\ny selecciona 'Añadir a pantalla de inicio'.",
    guideAndroid: "Toca el menú del navegador\ny selecciona 'Instalar aplicación'.",
    close: "Cerrar"
  },
  [AppLanguage.FRENCH]: {
    title: "WalkTale AI",
    subtitle: "Votre guide local IA personnel.\nPromenez-vous et laissez-nous vous raconter les histoires cachées.",
    start: "Commencer l'exploration",
    route: "Itinéraires intelligents",
    audio: "Audio Guide",
    langLabel: "Choisir la langue",
    install: "Installer l'app",
    installDesc: "Pour une meilleure expérience",
    guideTitle: "Comment installer",
    guideIOS: "Appuyez sur Partager\net sélectionnez 'Sur l'écran d'accueil'.",
    guideAndroid: "Appuyez sur le menu\net sélectionnez 'Installer l'application'.",
    close: "Fermer"
  },
  [AppLanguage.GERMAN]: {
    title: "WalkTale AI",
    subtitle: "Ihr persönlicher AI-Reiseführer.\nSpazieren Sie durch die Stadt und entdecken Sie verborgene Geschichten.",
    start: "Erkundung starten",
    route: "Smarte Routen",
    audio: "Audioguide",
    langLabel: "Sprache wählen",
    install: "App installieren",
    installDesc: "Für ein besseres Erlebnis",
    guideTitle: "Installation",
    guideIOS: "Tippen Sie auf Teilen\nund wählen Sie 'Zum Home-Bildschirm'.",
    guideAndroid: "Tippen Sie auf das Menü\nund wählen Sie 'App installieren'.",
    close: "Schließen"
  },
  [AppLanguage.ARABIC]: {
    title: "WalkTale AI",
    subtitle: "دليلك المحلي بالذكاء الاصطناعي.\nامشِ في المدينة، ودعنا نروي لك القصص المخفية.",
    start: "بدء الاستكشاف",
    route: "طرق ذكية",
    audio: "دليل صوتي",
    langLabel: "اختر اللغة",
    install: "تثبيت التطبيق",
    installDesc: "للحصول على تجربة أفضل",
    guideTitle: "كيفية التثبيت",
    guideIOS: "اضغط على زر المشاركة\nواختر 'إضافة إلى الشاشة الرئيسية'.",
    guideAndroid: "اضغط على القائمة\nواختر 'تثبيت التطبيق'.",
    close: "إغلاق"
  }
};

const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onComplete }) => {
  const [selectedLang, setSelectedLang] = useState<AppLanguage>(AppLanguage.ENGLISH);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstructionModal, setShowInstructionModal] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  
  const t = TRANSLATIONS[selectedLang];

  useEffect(() => {
    const userAgent = window.navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(userAgent));
    const handler = (e: any) => { e.preventDefault(); setDeferredPrompt(e); };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleStart = () => {
      // 🔥 FIX: Renamed storage key to 'walktale_lang'
      localStorage.setItem('walktale_lang', selectedLang);
      onComplete(selectedLang);
  };

  const handleInstallClick = async () => {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        setDeferredPrompt(null);
    } else {
        setShowInstructionModal(true);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-900 flex flex-col items-center justify-center overflow-hidden">
      
      {/* 🔮 Premium Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900 z-0"></div>
      <div className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] bg-indigo-500/20 rounded-full blur-[100px] animate-pulse"></div>
      <div className="absolute bottom-[-20%] right-[-20%] w-[80%] h-[80%] bg-purple-500/20 rounded-full blur-[100px] animate-pulse delay-700"></div>

      {/* Content Container */}
      <div className="relative z-10 w-full max-w-sm px-6 py-8 flex flex-col h-full justify-center">
        
        {/* Logo Area */}
        <div className="flex flex-col items-center mb-10">
            <div className="relative w-24 h-24 mb-6">
                <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-3xl shadow-2xl rotate-6 opacity-80"></div>
                <div className="absolute inset-0 bg-white/10 backdrop-blur-xl rounded-3xl shadow-inner border border-white/20 -rotate-3 flex items-center justify-center">
                    <Compass size={48} className="text-white drop-shadow-md" strokeWidth={1.5} />
                </div>
                <div className="absolute -bottom-2 -right-2 bg-white rounded-2xl p-2.5 shadow-lg shadow-indigo-500/30">
                    <Headphones size={20} className="text-indigo-600" />
                </div>
            </div>
            
            <h1 className="text-4xl font-black text-white tracking-tight text-center mb-3 drop-shadow-sm">
                {t.title}
            </h1>
            <p className="text-indigo-200 text-center text-sm leading-relaxed whitespace-pre-line max-w-[280px]">
                {t.subtitle}
            </p>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-2 gap-3 mb-8">
            <div className="bg-white/5 backdrop-blur-md border border-white/10 p-4 rounded-2xl flex flex-col items-center gap-2 text-center">
                <div className="p-2 bg-white/10 rounded-full text-indigo-300"><MapPin size={20} /></div>
                <span className="text-xs font-semibold text-white/90">{t.route}</span>
            </div>
            <div className="bg-white/5 backdrop-blur-md border border-white/10 p-4 rounded-2xl flex flex-col items-center gap-2 text-center">
                <div className="p-2 bg-white/10 rounded-full text-purple-300"><Sparkles size={20} /></div>
                <span className="text-xs font-semibold text-white/90">{t.audio}</span>
            </div>
        </div>

        {/* Install Banner */}
        <button 
            onClick={handleInstallClick}
            className="w-full bg-white/5 hover:bg-white/10 backdrop-blur-sm border border-white/10 p-3 rounded-2xl mb-6 flex items-center gap-4 transition-all group active:scale-95"
        >
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-2.5 rounded-xl text-white shadow-lg">
                <Smartphone size={20} />
            </div>
            <div className="text-left flex-1">
                <div className="text-white font-bold text-sm">{t.install}</div>
                <div className="text-indigo-200 text-xs">{t.installDesc}</div>
            </div>
            <div className="bg-white/10 rounded-full p-1.5 text-white/70 group-hover:text-white transition-colors">
                <Download size={16} />
            </div>
        </button>

        {/* Language Selection */}
        <div className="space-y-3 mb-8">
            <label className="text-xs font-bold text-indigo-200 uppercase tracking-wider pl-1 flex items-center gap-1.5">
                <Globe size={12} /> {t.langLabel}
            </label>
            <div className="relative">
                <select 
                    value={selectedLang}
                    onChange={(e) => setSelectedLang(e.target.value as AppLanguage)}
                    className="w-full appearance-none bg-white/10 backdrop-blur-md border border-white/20 text-white py-3.5 px-4 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                >
                    {Object.values(AppLanguage).map((lang) => (
                        <option key={lang} value={lang} className="text-slate-900 bg-white">{lang}</option>
                    ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-white/50">
                    <ArrowRight size={16} className="rotate-90" />
                </div>
            </div>
        </div>

        {/* CTA Button */}
        <button
            onClick={handleStart}
            className="w-full bg-white text-indigo-900 py-4 rounded-2xl font-bold text-lg shadow-xl shadow-indigo-900/20 flex items-center justify-center gap-2 active:scale-95 transition-all hover:bg-indigo-50"
        >
            {t.start} <ArrowRight size={20} />
        </button>
        
        <p className="text-center text-[10px] text-white/30 mt-4">
            Location & Microphone access required.
        </p>
      </div>

      {/* Modal Overlay */}
      {showInstructionModal && (
          <div className="fixed inset-0 z-[10000] bg-black/80 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-200" onClick={() => setShowInstructionModal(false)}>
              <div className="bg-white w-full max-w-sm rounded-[32px] p-6 relative shadow-2xl" onClick={e => e.stopPropagation()}>
                  <button onClick={() => setShowInstructionModal(false)} className="absolute top-4 right-4 p-2 bg-slate-100 rounded-full text-slate-400 hover:text-slate-600"><X size={18}/></button>
                  
                  <div className="text-center pt-2">
                      <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mb-5 mx-auto text-indigo-600 shadow-sm">
                          {isIOS ? <Share size={30} /> : <MoreVertical size={30} />}
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 mb-2">{t.guideTitle}</h3>
                      <p className="text-slate-500 text-sm leading-relaxed whitespace-pre-line mb-8">
                          {isIOS ? t.guideIOS : t.guideAndroid}
                      </p>
                      <button onClick={() => setShowInstructionModal(false)} className="w-full py-3.5 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors">
                          {t.close}
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default OnboardingScreen;
