const { createClient } = require('@supabase/supabase-js');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

async function applyMigrations() {
  // Initialize Supabase client
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://oemwaoaebmwdfrndohmh.supabase.co';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9lbXdhb2FlYm13ZGZybmRvaG1oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM2NzQ2NDgsImV4cCI6MjA1OTI1MDY0OH0.KuPNahbiyWtJbWfLpo96ojHDJ-IY4l_kB842-H35J2E';
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  try {
    console.log('Fetching migrations directory...');
    const migrationsDir = path.join(__dirname, '../supabase/migrations');
    const files = await fs.readdir(migrationsDir);
    
    // Sort files by timestamp to ensure proper order
    const migrationFiles = files
      .filter(file => file.endsWith('.sql'))
      .sort();
    
    console.log(`Found ${migrationFiles.length} migration files`);
    
    // Apply each migration
    for (const file of migrationFiles) {
      console.log(`\nApplying migration: ${file}`);
      const filePath = path.join(migrationsDir, file);
      const sql = await fs.readFile(filePath, 'utf8');
      
      // Split SQL into individual statements
      const statements = sql
        .split(';')
        .map(statement => statement.trim())
        .filter(statement => statement.length > 0);
      
      // Execute each statement
      for (const statement of statements) {
        if (!statement.trim()) continue;
        
        console.log(`Executing statement: ${statement.substring(0, 100)}...`);
        const { error } = await supabase.rpc('sql', { query: statement });
        
        if (error) {
          console.error(`Error executing statement in ${file}:`, error);
          throw new Error(`Migration failed: ${file}`);
        }
      }
      
      console.log(`✅ Successfully applied migration: ${file}`);
    }
    
    console.log('\n🎉 All migrations applied successfully!');
  } catch (error) {
    console.error('Error applying migrations:', error);
    process.exit(1);
  }
}

applyMigrations();
