const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Set to true to enable verbose output
const VERBOSE = false;

// List of files to test (relative to src directory)
const filesToTest = [
  'src/App.tsx',
  'src/components/StudentGradesList.tsx',
  'src/components/dashboard/AnnouncementModal.tsx',
  'src/components/dashboard/DashboardQuestions.tsx',
  // Add more files as needed
];

// Create a temporary directory for testing
const tempDir = path.join(__dirname, 'temp-test');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir);
}

// Create a minimal package.json for testing
const packageJson = {
  name: 'temp-test',
  private: true,
  type: 'module',
  scripts: {
    build: 'vite build',
  },
  dependencies: {
    react: '^18.2.0',
    'react-dom': '^18.2.0',
    'react-router-dom': '^6.0.0',
    '@vitejs/plugin-react': '^4.2.1',
    vite: '^5.0.0',
    typescript: '^5.0.0',
    '@tanstack/react-query': '^4.0.0',
    '@supabase/supabase-js': '^2.0.0',
    'lucide-react': '^0.100.0',
  },
};

fs.writeFileSync(
  path.join(tempDir, 'package.json'),
  JSON.stringify(packageJson, null, 2)
);

// Create a minimal vite.config.js
const viteConfig = `
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '..', 'src'),
    },
  },
  build: {
    minify: false,
    sourcemap: false,
    commonjsOptions: {
      esmExternals: true,
    },
  },
});
`;

fs.writeFileSync(path.join(tempDir, 'vite.config.js'), viteConfig);

// Create a minimal index.html
const indexHtml = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Test</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="./src/main.jsx"></script>
  </body>
</html>
`;

fs.writeFileSync(path.join(tempDir, 'index.html'), indexHtml);

// Create a minimal src directory
const srcDir = path.join(tempDir, 'src');
if (!fs.existsSync(srcDir)) {
  fs.mkdirSync(srcDir);
}

// Create a minimal main.jsx
const mainJsx = `
import React from 'react';
import { createRoot } from 'react-dom/client';
import TestComponent from './TestComponent';

const root = createRoot(document.getElementById('root'));
root.render(<TestComponent />);
`;

fs.writeFileSync(path.join(srcDir, 'main.jsx'), mainJsx);

// Test each file
console.log('Starting component tests...\n');

for (const file of filesToTest) {
  const fileName = path.basename(file);
  const testComponentPath = path.join(srcDir, 'TestComponent.jsx');
  
  try {
    // Create a components directory if it doesn't exist
    const componentsDir = path.join(tempDir, 'src', 'components');
    if (!fs.existsSync(componentsDir)) {
      fs.mkdirSync(componentsDir, { recursive: true });
    }
    
    // Copy the file to test into the components directory
    const destPath = path.join(componentsDir, fileName);
    fs.copyFileSync(path.join(__dirname, file), destPath);
    
    // Create a test component that imports the file
    const testComponent = `
import React from 'react';

try {
  // Try to import the component dynamically to catch any import errors
  const Component = React.lazy(() => import('./components/${fileName.replace('.tsx', '')}'));
  
  export default function TestComponent() {
    return (
      <div>
        <h1>Testing ${fileName}</h1>
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
        <h1>Error loading ${fileName}</h1>
        <pre>{error.message}</pre>
        <pre>{error.stack}</pre>
      </div>
    );
  }
}
`;
    
    fs.writeFileSync(testComponentPath, testComponent);
    
    console.log(`Testing ${file}...`);
    
    // Try to build
    try {
      execSync('npm install', { 
        cwd: tempDir, 
        stdio: VERBOSE ? 'inherit' : 'pipe' 
      });
      const buildOutput = execSync('npm run build', { 
        cwd: tempDir, 
        stdio: 'pipe' 
      }).toString();
      
      if (VERBOSE) {
        console.log(buildOutput);
      }
    } catch (error) {
      console.error(`❌ Error details for ${file}:`);
      console.error(error.stderr?.toString() || error.message);
      throw error;
    }
    
    console.log(`✅ ${file} built successfully\n`);
  } catch (error) {
    console.error(`❌ Error in ${file}:`);
    console.error(error.message);
    console.log('');
  }
}

console.log('Testing complete.');
