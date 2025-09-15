module.exports = {
  apps: [{
    name: 'neurochat-backend',
    script: 'src/api/server.js',
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'development',
      PORT: 12000
    },
    error_file: 'logs/backend-error.log',
    out_file: 'logs/backend-out.log',
    log_file: 'logs/backend-combined.log',
    time: true
  }]
};