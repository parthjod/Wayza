module.exports = {
  apps: [
    {
      name: 'wayza-api',
      script: './dist/server.js',
      instances: 1,
      exec_mode: 'fork',
      node_args: '--max-old-space-size=400',
      env_production: {
        NODE_ENV: 'production',
        PORT: 4000,
      },
      env_development: {
        NODE_ENV: 'development',
        PORT: 4000,
      },
      watch: false,
      max_memory_restart: '450M',
      error_file: './logs/error.log',
      out_file: './logs/output.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
  ],
};
