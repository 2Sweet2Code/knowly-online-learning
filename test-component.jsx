
import React from 'react';
console.log('Testing src/components/dashboard/DashboardQuestions.tsx');

try {
  // Try to import the component
  import('./src/components/dashboard/DashboardQuestions.tsx').then(module => {
    console.log('✅ Successfully imported src/components/dashboard/DashboardQuestions.tsx');
  }).catch(error => {
    console.error('❌ Error importing src/components/dashboard/DashboardQuestions.tsx:');
    console.error(error);
  });
} catch (error) {
  console.error('❌ Error in test for src/components/dashboard/DashboardQuestions.tsx:');
  console.error(error);
}

export default function TestComponent() {
  return <div>Testing src/components/dashboard/DashboardQuestions.tsx</div>;
}
