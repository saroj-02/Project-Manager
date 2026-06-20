const { spawn } = require('child_process');

function run(fullCommand, label) {
  const child = spawn(fullCommand, {
    stdio: 'inherit',
    shell: true
  });

  child.on('error', (err) => {
    console.error(`[${label}] Failed to start:`, err);
  });

  child.on('close', (code) => {
    console.log(`[${label}] Exited with code ${code}`);
    if (code !== 0) {
      process.exit(code || 1);
    }
  });

  return child;
}

console.log('Starting development servers for client and server...');
run('npm run dev --prefix client', 'client');
run('npm run dev --prefix server', 'server');
