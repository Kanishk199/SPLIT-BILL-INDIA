const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting BillSplit India Backend (:3001) & Frontend (:5173)...\n');

const be = spawn('pnpm', ['run', 'dev'], {
  cwd: path.join(__dirname, 'backend'),
  stdio: 'inherit',
  shell: true,
});

const fe = spawn('pnpm', ['run', 'dev'], {
  cwd: path.join(__dirname, 'frontend'),
  stdio: 'inherit',
  shell: true,
});

const cleanExit = () => {
  console.log('\n🛑 Shutting down both servers...');
  be.kill();
  fe.kill();
  process.exit();
};

process.on('SIGINT', cleanExit);
process.on('SIGTERM', cleanExit);
