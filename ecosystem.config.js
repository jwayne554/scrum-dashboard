module.exports = {
  apps: [{
    name: 'scrum-dashboard',
    script: 'npm',
    args: 'run start:prod',
    cwd: '/app/scrum-dashboard',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'development',
      PORT: 3001
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3001,
      DATABASE_URL: 'file:./data/prod.db'
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};