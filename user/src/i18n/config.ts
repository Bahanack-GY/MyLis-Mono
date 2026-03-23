import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import fr from './locales/fr.json';

i18n.use(initReactI18next).init({
    fallbackLng: 'fr',
    lng: 'fr',
    resources: {
        en: { translations: en },
        fr: { translations: fr },
    },
    ns: ['translations'],
    defaultNS: 'translations',
});

i18n.languages = ['fr', 'en'];

export default i18n;
