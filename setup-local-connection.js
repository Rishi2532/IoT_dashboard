/**
 * Local Database Connection Setup Script
 * 
 * This script helps configure the application to use a local PostgreSQL database
 * that has been set up and populated in pgAdmin.
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// Update these values with your actual local PostgreSQL credentials
const dbConfig = {
  host: 'localhost',
  port: 5432,
  database: 'water_scheme_dashboard', // Your database name in pgAdmin
  user: 'postgres', // Default PostgreSQL user, change if different
  password: 'Salunke@123' // Replace with your actual password
};

// Create .env file with database configuration
const envContent = `# Database connection information
DATABASE_URL=postgresql://${dbConfig.user}:${dbConfig.password}@${dbConfig.host}:${dbConfig.port}/${dbConfig.database}
PGHOST=${dbConfig.host}
PGUSER=${dbConfig.user}
PGPASSWORD=${dbConfig.password}
PGDATABASE=${dbConfig.database}
PGPORT=${dbConfig.port}
`;

// Write to .env file
fs.writeFileSync(path.join(__dirname, '.env'), envContent);
console.log('✅ Created .env file with your database configuration');

// Update local adapter to use your configuration
const localAdapterPath = path.join(__dirname, 'server', 'local-adapter.js');
let localAdapterContent = fs.readFileSync(localAdapterPath, 'utf8');

// Replace connection details (simplified approach - modify as needed)
localAdapterContent = localAdapterContent.replace(
  /const host = '.*?';/,
  `const host = '${dbConfig.host}';`
);
localAdapterContent = localAdapterContent.replace(
  /const database = '.*?';/,
  `const database = '${dbConfig.database}';`
);
localAdapterContent = localAdapterContent.replace(
  /const user = '.*?';/,
  `const user = '${dbConfig.user}';`
);
localAdapterContent = localAdapterContent.replace(
  /const password = '.*?';/,
  `const password = '${dbConfig.password}';`
);
localAdapterContent = localAdapterContent.replace(
  /const port = \d+;/,
  `const port = ${dbConfig.port};`
);

fs.writeFileSync(localAdapterPath, localAdapterContent);
console.log('✅ Updated local adapter with your database configuration');

// Test database connection
console.log('🔍 Testing database connection...');
exec('node test-local-db.js', (error, stdout, stderr) => {
  if (error) {
    console.error('❌ Error testing database connection:', error.message);
    console.error('Please check your database credentials and ensure PostgreSQL is running');
    return;
  }
  
  console.log('✅ Database connection successful!');
  console.log(stdout);
  
  console.log('\n🚀 Ready to run the application!');
  console.log('Run the following command to start:');
  console.log('  npm run dev');
  console.log('\nThe application will use the data from your pgAdmin database.');
});