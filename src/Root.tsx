import { Toaster } from './components/ui/toaster';
import { ToastProvider } from './components/ui/toast';
import App from './App';

export const Root = () => (
  <ToastProvider>
    <App />
    <Toaster />
  </ToastProvider>
);
