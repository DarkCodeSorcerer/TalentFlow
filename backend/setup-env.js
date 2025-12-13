// Script to create .env file for backend
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');
const envContent = `PORT=5000
MONGO_URI=mongodb://localhost:27017/ats
JWT_SECRET=super_secret_key_change_in_production
CORS_ORIGIN=http://localhost:5173
`;

if (!fs.existsSync(envPath)) {
  fs.writeFileSync(envPath, envContent);
  console.log('✅ Created backend/.env file');
  console.log('📝 Please verify the values are correct for your setup');
} else {
  console.log('⚠️  backend/.env already exists');
  console.log('📝 Please verify it contains:');
  console.log('   PORT=5000');
  console.log('   MONGO_URI=mongodb://localhost:27017/ats');
  console.log('   JWT_SECRET=super_secret_key_change_in_production');
  console.log('   CORS_ORIGIN=http://localhost:5173');
}

