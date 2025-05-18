
import React from 'react';

try {
  // Try to import the component dynamically to catch any import errors
  const Component = React.lazy(() => import('./components/DashboardQuestions'));
  
  export default function TestComponent() {
    return (
      <div>
        <h1>Testing DashboardQuestions.tsx</h1>
        <React.Suspense fallback={<div>Loading...</div>}>
          <Component />
        </React.Suspense>
      </div>
    );
  }
} catch (error) {
  // If there's an error importing, show it in the UI
  export default function TestComponent() {
    return (
      <div>
        <h1>Error loading DashboardQuestions.tsx</h1>
        <pre>{error.message}</pre>
        <pre>{error.stack}</pre>
      </div>
    );
  }
}
