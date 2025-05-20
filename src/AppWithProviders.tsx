import * as React from 'react';
import { I18nextProvider } from 'react-i18next';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthProvider';
import { ToastProvider, ToastViewport } from '@/components/ui/toast';
import i18n from './i18n';
import App from './App';

interface AppWithProvidersProps {
  queryClient: QueryClient;
}

export const AppWithProviders: React.FC<AppWithProvidersProps> = ({ queryClient }) => (
  <React.StrictMode>
    <BrowserRouter>
      <I18nextProvider i18n={i18n}>
        <QueryClientProvider client={queryClient}>
          <ToastProvider>
            <AuthProvider>
              <App />
            </AuthProvider>
            <ToastViewport />
          </ToastProvider>
        </QueryClientProvider>
      </I18nextProvider>
    </BrowserRouter>
  </React.StrictMode>
);
