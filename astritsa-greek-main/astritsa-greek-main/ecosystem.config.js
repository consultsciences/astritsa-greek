// PM2 process config for Astritsa.
//
// Run:  pm2 start ecosystem.config.js && pm2 save
//
// IMPORTANT: keep instances at 1. The app persists to a single JSON file
// (data/db.json) with synchronous writes; cluster mode would race on it.

module.exports = {
  apps: [
    {
      name: 'astritsa',
      script: 'server.js',
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      max_memory_restart: '300M',
      time: true,
      env: {
        NODE_ENV: 'production',
        PORT: 3000
        // All other settings come from your shell environment or an
        // env file sourced before `pm2 start` (see DEPLOY.md).
      },
      out_file: 'logs/out.log',
      error_file: 'logs/err.log',
      merge_logs: true
    }
  ]
};