module.exports = {
  apps: [
    {
      name: 'mylis-whisper',
      script: 'venv/bin/python',
      args: 'server.py',
      cwd: '/var/www/MyLIS/whisper-service',
      env: {
        WHISPER_MODEL: 'large-v3',
        PORT: '9001',
      },
    },
  ],
};
