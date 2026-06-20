const { spawn, execSync } = require('child_process');

const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';

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

if (isProduction) {
  console.log('Production/Render environment detected.');
  console.log('Installing server dependencies...');
  try {
    execSync('npm run install-server', { stdio: 'inherit' });
  } catch (err) {
    console.error('Failed to install server dependencies:', err);
    process.exit(1);
  }
  console.log('Starting backend server...');
  run('node server/index.js', 'server');
} else {
  console.log('Local development environment detected. Starting both client and server...');
  run('npm run dev --prefix client', 'client');
  run('npm run dev --prefix server', 'server');
}
