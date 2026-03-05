module.exports = {
    apps: [
        {
            name: "roomet",
            script: "npx",
            args: "tsx server.ts",
            cwd: __dirname,
            env: {
                NODE_ENV: "production",
                PORT: 3005,
            },
            instances: 1,
            exec_mode: "fork",
            watch: false,
            max_memory_restart: "512M",
            log_date_format: "YYYY-MM-DD HH:mm:ss",
            error_file: "./logs/error.log",
            out_file: "./logs/output.log",
            merge_logs: true,
        },
    ],
    deploy: {
        production: {
            "pre-deploy": "npm run build",
        },
    },
};
