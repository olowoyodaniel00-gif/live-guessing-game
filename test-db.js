require('dotenv').config();
const { MongoClient } = require('mongodb');

console.log('=== Testing MongoDB Connection ===');
console.log('1. Checking .env file...');

if (!process.env.MONGODB_URI) {
    console.log('❌ MONGODB_URI not found in .env');
    console.log('Make sure your .env file has: MONGODB_URI=your_connection_string');
    process.exit(1);
}

console.log('✅ MONGODB_URI found!');
console.log('2. Attempting to connect...');

async function testConnection() {
    try {
        const client = new MongoClient(process.env.MONGODB_URI);
        await client.connect();
        console.log('✅ Successfully connected to MongoDB!');
        console.log('🎉 Your database is ready to use!');
        await client.close();
    } catch (error) {
        console.error('❌ Connection failed:', error.message);
        console.log('\nCommon fixes:');
        console.log('- Check your password in .env file');
        console.log('- Make sure IP address is whitelisted (0.0.0.0/0)');
        console.log('- Verify the cluster name is correct');
        console.log('- Make sure there are no spaces or quotes in .env');
    }
}

testConnection();