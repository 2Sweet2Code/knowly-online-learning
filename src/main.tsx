import { createRoot } from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';
import i18n from './i18n';
import { Root } from './Root';
import './index.css';

createRoot(document.getElementById("root")!).render(
  <I18nextProvider i18n={i18n}>
    <Root />
  </I18nextProvider>
);
