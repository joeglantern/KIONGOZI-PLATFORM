'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = 'en' | 'sw' | 'ar' | 'sheng';

interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    dir: 'ltr' | 'rtl';
    t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
    en: {
        'nav.home': 'Home',
        'nav.browse': 'Browse Courses',
        'nav.my_learning': 'My Learning',
        'nav.impact_map': 'Impact Map',
        'nav.instructor_panel': 'Instructor Panel',
        'nav.profile': 'Profile',
        'nav.settings': 'Settings',
        'nav.sign_out': 'Sign Out',
        'nav.sign_in': 'Sign In',
        'nav.get_started': 'Get Started',
        'nav.community': 'Community',
        'nav.library': 'Research Library',
        'nav.policies': 'Policies',
        'nav.pulse': 'Policy Pulse',
        'nav.dashboard': 'Dashboard',
        'nav.admin': 'Admin Portal',
        'search.placeholder': 'Search documents...',
        'search.button': 'Search',
        'filter.all': 'All',
        'filter.clear': 'Clear Filters',
        'filter.title': 'Filters',
        'btn.back': 'Back',
        'btn.download': 'Download Brief',
        'btn.translate': 'Translate comment',
        'btn.submitting': 'Submitting...',
        'btn.submit': 'Submit',
        'deliberation.title': 'Twin Green Youth Initiative Deliberation',
        'deliberation.track1': 'Youth Inclusion in Funding',
        'deliberation.track2': 'Youth Inclusion in Governance',
        'deliberation.consensus': 'Consensus Recommendations',
        'deliberation.input_placeholder': 'Share your recommendation or solution...',
        'poll.vote_now': 'Vote Now',
        'poll.results': 'Poll Results',
        'poll.comments': 'Discussion',
        'accessibility.high_contrast': 'High Contrast',
        'accessibility.font_size': 'Text Size',
        'accessibility.low_latency': 'Low Latency Mode',
        'accessibility.title': 'Accessibility Settings',
        'admin.title': 'Admin Control Panel',
    },
    sw: {
        'nav.home': 'Mwanzo',
        'nav.browse': 'Vinjari Kozi',
        'nav.my_learning': 'Masomo Yangu',
        'nav.impact_map': 'Ramani ya Athari',
        'nav.instructor_panel': 'Jopo la Mkufunzi',
        'nav.profile': 'Wasifu',
        'nav.settings': 'Mipangilio',
        'nav.sign_out': 'Ondoka',
        'nav.sign_in': 'Ingia',
        'nav.get_started': 'Anza Sasa',
        'nav.community': 'Jumuiya',
        'nav.library': 'Maktaba ya Utafiti',
        'nav.policies': 'Sera',
        'nav.pulse': 'Mdundo wa Sera',
        'nav.dashboard': 'Mbao ya Uendeshaji',
        'nav.admin': 'Tovuti ya Msimamizi',
        'search.placeholder': 'Tafuta hati...',
        'search.button': 'Tafuta',
        'filter.all': 'Zote',
        'filter.clear': 'Futa Vichungi',
        'filter.title': 'Vichungi',
        'btn.back': 'Rudi',
        'btn.download': 'Pakua Muhtasari',
        'btn.translate': 'Tafsiri maoni',
        'btn.submitting': 'Inatuma...',
        'btn.submit': 'Tuma',
        'deliberation.title': 'Mjadala wa Vijana wa Twin Green Initiative',
        'deliberation.track1': 'Ushirikishwaji wa Vijana katika Ufadhili',
        'deliberation.track2': 'Ushirikishwaji wa Vijana katika Uongozi',
        'deliberation.consensus': 'Mapendekezo ya Makubaliano',
        'deliberation.input_placeholder': 'Shiriki pendekezo au suluhisho lako...',
        'poll.vote_now': 'Piga Kura Sasa',
        'poll.results': 'Matokeo ya Kura',
        'poll.comments': 'Majadiliano',
        'accessibility.high_contrast': 'Tofauti ya Juu',
        'accessibility.font_size': 'Ukubwa wa Maandishi',
        'accessibility.low_latency': 'Hali ya Muunganisho wa Chini',
        'accessibility.title': 'Mipangilio ya Ufikiaji',
        'admin.title': 'Jopo la Usimamizi',
    },
    ar: {
        'nav.home': 'الرئيسية',
        'nav.browse': 'تصفح الدورات',
        'nav.my_learning': 'تعليمي',
        'nav.impact_map': 'خريطة التأثير',
        'nav.instructor_panel': 'لوحة المعلم',
        'nav.profile': 'الملف الشخصي',
        'nav.settings': 'الإعدادات',
        'nav.sign_out': 'تسجيل الخروج',
        'nav.sign_in': 'تسجيل الدخول',
        'nav.get_started': 'البدء',
        'nav.community': 'المجتمع',
        'nav.library': 'مكتبة الأبحاث',
        'nav.policies': 'السياسات',
        'nav.pulse': 'نبض السياسات',
        'nav.dashboard': 'لوحة القيادة',
        'nav.admin': 'بوابة المسؤول',
        'search.placeholder': 'البحث عن المستندات...',
        'search.button': 'بحث',
        'filter.all': 'الكل',
        'filter.clear': 'مسح التصفية',
        'filter.title': 'تصفية',
        'btn.back': 'رجوع',
        'btn.download': 'تحميل الملخص',
        'btn.translate': 'ترجمة التعليق',
        'btn.submitting': 'جاري الإرسال...',
        'btn.submit': 'إرسال',
        'deliberation.title': 'تداول مبادرة الشباب الأخضر المزدوجة',
        'deliberation.track1': 'إشراك الشباب في التمويل',
        'deliberation.track2': 'إشراك الشباب في الحوكمة وصنع القرار',
        'deliberation.consensus': 'توصيات التوافق',
        'deliberation.input_placeholder': 'شارك بتوصيتك أو الحل المقترح...',
        'poll.vote_now': 'صوّت الآن',
        'poll.results': 'نتائج الاستطلاع',
        'poll.comments': 'المناقشة',
        'accessibility.high_contrast': 'تباين عالٍ',
        'accessibility.font_size': 'حجم الخط',
        'accessibility.low_latency': 'وضع الاستجابة السريعة',
        'accessibility.title': 'إعدادات سهولة الوصول',
        'admin.title': 'لوحة التحكم الإدارية',
    },
    sheng: {
        'nav.home': 'Base',
        'nav.browse': 'Saka Kozi',
        'nav.my_learning': 'Kusoma Yangu',
        'nav.impact_map': 'Rada ya Athari',
        'nav.instructor_panel': 'Dach ya Mkufunzi',
        'nav.profile': 'Profile',
        'nav.settings': 'Mipangilio',
        'nav.sign_out': 'Kutoka',
        'nav.sign_in': 'Kuingia',
        'nav.get_started': 'Anza Form',
        'nav.community': 'Jamo',
        'nav.library': 'Riba Library',
        'nav.policies': 'Sera',
        'nav.pulse': 'Policy Pulse',
        'nav.dashboard': 'Dach',
        'nav.admin': 'Rada ya Admin',
        'search.placeholder': 'Saka madao...',
        'search.button': 'Saka',
        'filter.all': 'Zote',
        'filter.clear': 'Futa ma-filter',
        'filter.title': 'Ma-filter',
        'btn.back': 'Rudi',
        'btn.download': 'Chapa Brief',
        'btn.translate': 'Translate compe',
        'btn.submitting': 'Inatuma...',
        'btn.submit': 'Tuma',
        'deliberation.title': 'Twin Green Vijana Deliberation',
        'deliberation.track1': 'Vijana kuingizwa kwa Doba/Funding',
        'deliberation.track2': 'Vijana kuingizwa kwa Uongozi/Governance',
        'deliberation.consensus': 'Mapendekezo za Form',
        'deliberation.input_placeholder': 'Share wazo yako ya form...',
        'poll.vote_now': 'Piga Kura Sasa',
        'poll.results': 'Matokeo ya Kura',
        'poll.comments': 'Stori/Discussions',
        'accessibility.high_contrast': 'High Contrast',
        'accessibility.font_size': 'Size ya text',
        'accessibility.low_latency': 'Hali ya Low Latency',
        'accessibility.title': 'Accessibility Settings',
        'admin.title': 'Admin Panel',
    }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
    const [language, setLanguageState] = useState<Language>('en');

    useEffect(() => {
        // Load language from localStorage if client side
        const savedLang = localStorage.getItem('kiongozi-lang') as Language;
        if (savedLang && (savedLang === 'en' || savedLang === 'sw' || savedLang === 'ar' || savedLang === 'sheng')) {
            setLanguageState(savedLang);
        }
    }, []);

    const setLanguage = (lang: Language) => {
        setLanguageState(lang);
        localStorage.setItem('kiongozi-lang', lang);
    };

    const dir = language === 'ar' ? 'rtl' : 'ltr';

    useEffect(() => {
        // Update document dir and lang attributes
        document.documentElement.dir = dir;
        document.documentElement.lang = language;
    }, [language, dir]);

    const t = (key: string): string => {
        return translations[language]?.[key] || translations['en']?.[key] || key;
    };

    return (
        <LanguageContext.Provider value={{ language, setLanguage, dir, t }}>
            <div dir={dir} lang={language}>
                {children}
            </div>
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    const context = useContext(LanguageContext);
    if (context === undefined) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
}
