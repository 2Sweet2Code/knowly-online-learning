import { createRoot } from 'react-dom/client';
import { QueryClient } from '@tanstack/react-query';
import { AppWithProviders } from './AppWithProviders';
import './index.css';

// Create a client
const queryClient = new QueryClient();

// Render the app
const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Failed to find the root element');

const root = createRoot(rootElement);
root.render(<AppWithProviders queryClient={queryClient} />);
