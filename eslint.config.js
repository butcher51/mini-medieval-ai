export default [
    {
        files: ["**/*.js"],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: "module",
            globals: {
                // Browser globals
                window: "readonly",
                document: "readonly",
                console: "readonly",
                requestAnimationFrame: "readonly",
                cancelAnimationFrame: "readonly",
                Image: "readonly",
                localStorage: "readonly",
                fetch: "readonly",
                setTimeout: "readonly",
                clearTimeout: "readonly",
                // Node globals (for server.js)
                process: "readonly",
                __dirname: "readonly",
            },
        },
        rules: {
            // Recommended base rules
            "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
            "no-undef": "error",
            "no-console": "off",
            "prefer-const": "warn",
            "no-var": "error",

            // Code quality
            eqeqeq: ["error", "always"],
            curly: ["error", "all"],
            "no-eval": "error",
            "no-implied-eval": "error",

            // Style preferences
            semi: ["warn", "always"],
            quotes: ["warn", "double", { avoidEscape: true }],
            indent: ["warn", 4],
            "comma-dangle": ["warn", "always-multiline"],
        },
    },
];
