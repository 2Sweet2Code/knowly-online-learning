import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Initialize i18n
i18n
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    debug: false,
    interpolation: {
      escapeValue: false, // Not needed for React as it escapes by default
    },
    resources: {
      en: {
        translation: {
          // Add your English translations here
        }
      },
      sq: {
        translation: {
          // Add your Albanian translations here
        }
      }
    }
  });

export default i18n;
