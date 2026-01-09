import React from 'react';
import { AppLanguage } from '../types';
import { AlertTriangle, MapPinOff, ArrowRight, X } from 'lucide-react';

interface RestrictedRegionModalProps {
  onContinue: () => void;
  onCancel: () => void;
  language: AppLanguage;
  isPricingAction: boolean; // True if triggered by clicking the "Payment/Pricing" button
}

const UI_TEXT = {
  [AppLanguage.KOREAN]: {
    title: "지도 서비스 제한 지역",
    warning: "현재 위치는 Google 지도 데이터가 제한된 국가입니다.",
    desc: "한국, 중국 등 일부 국가에서는 정부 정책으로 인해 다음 기능이 제한될 수 있습니다:",
    list: [
        "지도 로딩 속도 저하 또는 좌표 오차",
        "도보 내비게이션 정확도 감소",
        "일부 장소(POI) 정보 누락"
    ],
    pricingWarning: "결제 전, 해당 지역에서의 서비스 제한 사항을 반드시 확인해주세요.",
    confirm: "이해했습니다",
    cancel: "취소"
  },
  [AppLanguage.ENGLISH]: {
    title: "Limited Service Region",
    warning: "Google Maps services are restricted in this region.",
    desc: "In countries like South Korea and China, mapping features may be limited due to local regulations:",
    list: [
        "Slower map loading or GPS offsets",
        "Reduced walking navigation accuracy",
        "Missing Place of Interest (POI) data"
    ],
    pricingWarning: "Please acknowledge these limitations before purchasing.",
    confirm: "I Understand",
    cancel: "Cancel"
  },
  [AppLanguage.JAPANESE]: {
    title: "サービス制限地域",
    warning: "この地域ではGoogleマップの機能が制限されています。",
    desc: "韓国や中国など一部の国では、以下の制限が発生する可能性があります：",
    list: [
        "地図の読み込み遅延や座標のズレ",
        "徒歩ナビゲーションの精度低下",
        "一部の場所（POI）情報の欠落"
    ],
    pricingWarning: "購入前にこれらの制限をご確認ください。",
    confirm: "理解しました",
    cancel: "キャンセル"
  },
  [AppLanguage.CHINESE]: {
    title: "服务受限区域",
    warning: "此区域的 Google 地图服务受限。",
    desc: "在韩国和中国等国家，由于当地法规，可能会出现以下限制：",
    list: [
        "地图加载缓慢或坐标偏移",
        "步行导航准确性降低",
        "缺少兴趣点 (POI) 信息"
    ],
    pricingWarning: "购买前请确认这些限制。",
    confirm: "我明白了",
    cancel: "取消"
  },
  [AppLanguage.VIETNAMESE]: {
    title: "Khu vực hạn chế",
    warning: "Dịch vụ bản đồ bị hạn chế ở khu vực này.",
    desc: "Tại các quốc gia như Hàn Quốc và Trung Quốc, tính năng có thể bị giới hạn:",
    list: [
        "Tải bản đồ chậm hoặc lệch GPS",
        "Giảm độ chính xác điều hướng đi bộ",
        "Thiếu thông tin địa điểm (POI)"
    ],
    pricingWarning: "Vui lòng xác nhận hạn chế này trước khi mua.",
    confirm: "Tôi hiểu",
    cancel: "Hủy"
  },
  [AppLanguage.THAI]: {
    title: "พื้นที่บริการจำกัด",
    warning: "Google Maps มีข้อจำกัดในพื้นที่นี้",
    desc: "ในประเทศเช่นเกาหลีใต้และจีน ฟีเจอร์อาจถูกจำกัด:",
    list: [
        "โหลดแผนที่ช้าหรือ GPS คลาดเคลื่อน",
        "ความแม่นยำในการนำทางลดลง",
        "ข้อมูลสถานที่บางแห่งอาจหายไป"
    ],
    pricingWarning: "โปรดยอมรับข้อจำกัดนี้ก่อนชำระเงิน",
    confirm: "เข้าใจแล้ว",
    cancel: "ยกเลิก"
  },
  [AppLanguage.SPANISH]: {
    title: "Región de servicio limitado",
    warning: "Los servicios de mapas están restringidos aquí.",
    desc: "En países como Corea del Sur y China, las funciones pueden estar limitadas:",
    list: [
        "Carga lenta o desvíos de GPS",
        "Menor precisión en navegación a pie",
        "Falta de información de lugares (POI)"
    ],
    pricingWarning: "Confirme estas limitaciones antes de pagar.",
    confirm: "Entendido",
    cancel: "Cancelar"
  },
  [AppLanguage.FRENCH]: {
    title: "Région à service limité",
    warning: "Les services Google Maps sont restreints ici.",
    desc: "En Corée du Sud et en Chine, les fonctionnalités peuvent être limitées :",
    list: [
        "Chargement lent ou décalage GPS",
        "Précision de navigation réduite",
        "Manque d'infos sur les lieux (POI)"
    ],
    pricingWarning: "Veuillez confirmer ces limitations avant d'acheter.",
    confirm: "J'ai compris",
    cancel: "Annuler"
  },
  [AppLanguage.GERMAN]: {
    title: "Eingeschränkte Region",
    warning: "Google Maps-Dienste sind hier eingeschränkt.",
    desc: "In Ländern wie Südkorea und China können Funktionen eingeschränkt sein:",
    list: [
        "Langsames Laden oder GPS-Versatz",
        "Reduzierte Genauigkeit der Navigation",
        "Fehlende Ortsinformationen (POI)"
    ],
    pricingWarning: "Bitte bestätigen Sie diese Einschränkungen vor dem Kauf.",
    confirm: "Verstanden",
    cancel: "Abbrechen"
  },
  [AppLanguage.ARABIC]: {
    title: "منطقة خدمة محدودة",
    warning: "خدمات خرائط Google مقيدة هنا.",
    desc: "في بلدان مثل كوريا الجنوبية والصين، قد تكون الميزات محدودة:",
    list: [
        "تحميل بطيء للخرائط",
        "دقة ملاحة منخفضة",
        "بيانات الأماكن مفقودة"
    ],
    pricingWarning: "يرجى تأكيد القيود قبل الشراء.",
    confirm: "فهمت",
    cancel: "إلغاء"
  }
};

const RestrictedRegionModal: React.FC<RestrictedRegionModalProps> = ({ onContinue, onCancel, language, isPricingAction }) => {
  const t = UI_TEXT[language] || UI_TEXT[AppLanguage.ENGLISH];

  return (
    <div className="fixed inset-0 z-[10000] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden relative">
        
        {/* Header */}
        <div className="bg-orange-50 p-6 pb-4 border-b border-orange-100 flex items-start gap-4">
            <div className="p-3 bg-orange-100 rounded-full text-orange-600 flex-shrink-0">
                <MapPinOff size={24} />
            </div>
            <div>
                <h2 className="text-lg font-bold text-gray-900 leading-tight">
                    {t.title}
                </h2>
                <p className="text-orange-700 text-xs mt-1 font-medium">
                    {t.warning}
                </p>
            </div>
            {!isPricingAction && (
                <button onClick={onCancel} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                    <X size={20} />
                </button>
            )}
        </div>

        {/* Content */}
        <div className="p-6">
            <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                {t.desc}
            </p>

            <ul className="space-y-2 mb-6">
                {t.list.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs text-gray-700 bg-gray-50 p-2 rounded-lg border border-gray-100">
                        <AlertTriangle size={14} className="text-orange-500 mt-0.5 flex-shrink-0" />
                        <span>{item}</span>
                    </li>
                ))}
            </ul>

            {isPricingAction && (
                <div className="mb-6 p-3 bg-blue-50 border border-blue-100 rounded-xl text-blue-800 text-xs font-bold text-center">
                    {t.pricingWarning}
                </div>
            )}

            <div className="flex gap-3">
                {isPricingAction && (
                    <button 
                        onClick={onCancel}
                        className="flex-1 py-3.5 rounded-xl border border-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-50 transition-colors"
                    >
                        {t.cancel}
                    </button>
                )}
                <button 
                    onClick={onContinue}
                    className="flex-1 py-3.5 rounded-xl bg-gray-900 text-white font-bold text-sm hover:bg-gray-800 transition-colors shadow-lg flex items-center justify-center gap-2"
                >
                    {t.confirm} <ArrowRight size={16} />
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default RestrictedRegionModal;