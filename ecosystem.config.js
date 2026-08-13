module.exports = {
    apps: [
        {
            name: 'vl-nextjs-purchase-survey',
            script: 'node_modules/.bin/next',
            args: 'start',
            cwd: '/var/viladomat/vl-nextjs-purchase-survey',
            instances: 1,
            autorestart: true,
            watch: false,
            max_memory_restart: '1G',
            env: {
                NODE_ENV: 'development',
            },
            env_production: {
                NODE_ENV: 'production',
            },
        },
    ],
};
