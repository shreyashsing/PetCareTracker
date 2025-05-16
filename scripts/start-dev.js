/**
 * Development startup script that runs both Netlify Functions and Expo in separate processes
 * 
 * Usage:
 * node scripts/start-dev.js
 */

const { spawn } = require('child_process');
const path = require('path');
const readline = require('readline');

console.log('=== PetCareTracker Development Environment ===');
console.log('Starting Netlify Functions and Expo App...\n');

// Define commands
const commands = {
  netlify: {
    command: 'npx',
    args: ['netlify', 'dev', '--port', '8888', '--host', '0.0.0.0'],
    name: 'NETLIFY',
    color: '\x1b[36m' // Cyan
  },
  expo: {
    command: 'npm',
    args: ['start'],
    name: 'EXPO',
    color: '\x1b[35m' // Magenta
  }
};

// Function to create a prefixed logger for each process
function createLogger(prefix, color) {
  return (data) => {
    const lines = data.toString().trim().split('\n');
    lines.forEach(line => {
      if (line.trim()) {
        console.log(`${color}[${prefix}]\x1b[0m ${line}`);
      }
    });
  };
}

// Start each process
Object.values(commands).forEach(({ command, args, name, color }) => {
  console.log(`${color}[${name}]\x1b[0m Starting process: ${command} ${args.join(' ')}`);
  
  const process = spawn(command, args, {
    cwd: path.resolve(__dirname, '..'),
    shell: true
  });
  
  const log = createLogger(name, color);
  
  process.stdout.on('data', log);
  process.stderr.on('data', log);
  
  process.on('error', (error) => {
    console.error(`${color}[${name}]\x1b[0m Failed to start: ${error.message}`);
  });
  
  process.on('close', (code) => {
    console.log(`${color}[${name}]\x1b[0m Process exited with code ${code}`);
  });
});

console.log('\n\x1b[33m[INFO]\x1b[0m Press Ctrl+C to stop all processes');

// Handle process exit
process.on('SIGINT', () => {
  console.log('\n\x1b[33m[INFO]\x1b[0m Shutting down all processes...');
  process.exit();
}); 