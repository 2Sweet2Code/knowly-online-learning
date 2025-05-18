const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// List of components to test
const components = [
  'src/App.tsx',
  'src/components/StudentGradesList.tsx',
  'src/components/dashboard/AnnouncementModal.tsx',
  'src/components/dashboard/DashboardQuestions.tsx'
];

// Create a simple test file
try {
  // Create a test directory
  const testDir = path.join(__dirname, 'test-temp');
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir);
  }

  // Create a minimal package.json
  const packageJson = {
    name: 'test-build',
    private: true,
    type: 'module',
    scripts: {
      build: 'vite build'
    },
    dependencies: {
      'react': '^18.2.0',
      'react-dom': '^18.2.0',
      'vite': '^5.0.0',
      '@vitejs/plugin-react': '^4.2.1',
      'typescript': '^5.0.0'
    }
  };

  fs.writeFileSync(
    path.join(testDir, 'package.json'),
    JSON.stringify(packageJson, null, 2)
  );

  // Create a minimal vite.config.js
  const viteConfig = `
  import { defineConfig } from 'vite';
  import react from '@vitejs/plugin-react';
  import path from 'path';

  export default defineConfig({
    plugins: [react()],
    build: {
      minify: false,
      sourcemap: false,
      rollupOptions: {
        input: path.resolve(__dirname, 'index.html'),
      },
    },
  });
  `;

  fs.writeFileSync(path.join(testDir, 'vite.config.js'), viteConfig);

  // Create a minimal index.html
  const indexHtml = `
  <!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Test Build</title>
    </head>
    <body>
      <div id="root"></div>
      <script type="module" src="./src/main.jsx"></script>
    </body>
  </html>
  `;

  fs.writeFileSync(path.join(testDir, 'index.html'), indexHtml);

  // Create src directory
  const srcDir = path.join(testDir, 'src');
  if (!fs.existsSync(srcDir)) {
    fs.mkdirSync(srcDir);
  }

  // Create a minimal main.jsx
  const mainJsx = `
  import React from 'react';
  import { createRoot } from 'react-dom/client';
  import App from './App';

  const root = createRoot(document.getElementById('root'));
  root.render(<App />);
  `;

  fs.writeFileSync(path.join(srcDir, 'main.jsx'), mainJsx);

  // Create a minimal App.jsx
  const appJsx = `
  import React from 'react';
  
  function App() {
    return (
      <div>
        <h1>Test Build</h1>
      </div>
    );
  }
  
  export default App;
  `;

  fs.writeFileSync(path.join(srcDir, 'App.jsx'), appJsx);

  // Install dependencies
  console.log('Installing dependencies...');
  execSync('npm install', { cwd: testDir, stdio: 'inherit' });

  // Test each component
  for (const component of components) {
    console.log(`\n--- Testing ${component} ---`);
    
    try {
      // Copy the component to test
      const componentPath = path.join(__dirname, component);
      const componentContent = fs.readFileSync(componentPath, 'utf-8');
      
      // Update App.jsx to use the component
      const testAppJsx = `
      import React from 'react';
      import Component from './${component.replace('src/', '')}';
      
      function App() {
        return (
          <div>
            <h1>Testing ${component}</h1>
            <Component />
          </div>
        );
      }
      
      export default App;
      `;
      
      fs.writeFileSync(path.join(srcDir, 'App.jsx'), testAppJsx);
      
      // Try to build
      console.log('Building...');
      execSync('npm run build', { cwd: testDir, stdio: 'inherit' });
      console.log(`✅ ${component} built successfully`);
    } catch (error) {
      console.error(`❌ Error building ${component}:`);
      console.error(error.message);
    }
  }
} catch (error) {
  console.error('Error setting up test environment:');
  console.error(error);
}
