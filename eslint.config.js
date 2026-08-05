'use strict';

const js = require('@eslint/js');
const { FlatCompat } = require('@eslint/eslintrc');

const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all,
});

module.exports = [
    {
        ignores: [
            '**/node_modules/**',
            '.vite/**',
            'coverage/**',
            'dist/**',
            'eslint.config.js',
            'out/**',
            'src/renderer/**',
            'package-lock.json',
            'yarn.lock',
            'pnpm-lock.yaml',
        ],
    },
    ...compat.config(require('./.eslintrc.json')),
];
