const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// List of files to test (relative to src directory)
const filesToTest = [
  'src/App.tsx',
  'src/components/StudentGradesList.tsx',
  'src/components/dashboard/AnnouncementModal.tsx',
  'src/components/dashboard/DashboardQuestions.tsx',
];

// Create a test component for each file
filesToTest.forEach(file => {
  const fileName = path.basename(file);
  const testFile = path.join(__dirname, 'test-component.jsx');
  
  // Create a simple test component
  const testComponent = `
import React from 'react';
console.log('Testing ${file}');

try {
  // Try to import the component
  import('./${file}').then(module => {
    console.log('✅ Successfully imported ${file}');
  }).catch(error => {
    console.error('❌ Error importing ${file}:');
    console.error(error);
  });
} catch (error) {
  console.error('❌ Error in test for ${file}:');
  console.error(error);
}

export default function TestComponent() {
  return <div>Testing ${file}</div>;
}
`;
  
  // Write the test component
  fs.writeFileSync(testFile, testComponent);
  
  console.log('\n--- Testing ${file} ---');
  
  try {
    // Run the test component with ts-node
    execSync('npx tsx test-component.jsx', { 
      stdio: 'inherit',
      cwd: __dirname 
    });
  } catch (error) {
    console.error('❌ Test failed for ${file}');
  }
});

console.log('\nTesting complete.');
