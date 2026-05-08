import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypeScript from 'eslint-config-next/typescript';

const eslintConfig = [
    ...nextCoreWebVitals,
    ...nextTypeScript,
    {
        ignores: [
            'src/components/ai-elements/**',
            'src/components/ui/**',
            'src/renderer/components/ai-elements/**',
            'src/renderer/components/ui/**',
        ],
    },
];

export default eslintConfig;
