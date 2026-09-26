module.exports = {
  apps: [
    {
      name: 'dubai-admin-panel',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3001',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
    },
  ],
};
