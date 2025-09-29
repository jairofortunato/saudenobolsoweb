#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting Next.js development server...');
console.log('📍 Working directory:', __dirname);
console.log('📅 Time:', new Date().toISOString());

// Check if port 3000 is available
const net = require('net');
const server = net.createServer();

server.listen(3000, (err) => {
  if (err) {
    console.log('❌ Port 3000 is already in use');
    process.exit(1);
  }

  console.log('✅ Port 3000 is available');
  server.close();

  // Start Next.js
  console.log('🔄 Starting Next.js...');

  const nextProcess = spawn('npx', ['next', 'dev'], {
    stdio: 'inherit',
    cwd: __dirname
  });

  nextProcess.on('error', (error) => {
    console.error('❌ Error starting Next.js:', error.message);
  });

  nextProcess.on('exit', (code) => {
    console.log(`📋 Next.js process exited with code ${code}`);
  });

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down...');
    nextProcess.kill('SIGINT');
  });
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log('❌ Port 3000 is already in use. Please kill existing processes:');
    console.log('   lsof -ti:3000 | xargs kill -9');
    console.log('   or');
    console.log('   pkill -f "next dev"');
  } else {
    console.log('❌ Server error:', err.message);
  }
  process.exit(1);
});