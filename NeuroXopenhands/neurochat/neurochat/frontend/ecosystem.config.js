module.exports = {
  apps: [{
    name: 'neurochat-frontend',
    script: 'server.js',
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
    max_memory_restart: '200M',
    env: {
      NODE_ENV: 'development',
      PORT: 8080
    },
    error_file: 'frontend-error.log',
    out_file: 'frontend-out.log',
    log_file: 'frontend-combined.log',
    time: true
  }]
};