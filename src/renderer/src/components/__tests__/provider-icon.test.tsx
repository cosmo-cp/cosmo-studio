import { render, screen } from '@testing-library/react';
import { ModelProviderTypeEnum } from 'core/database/schema/modelProviderSchema';
import { describe, expect, it } from 'vitest';
import ProviderIcon from '../provider-icon';

describe('ProviderIcon', () => {
    it('uses a document-relative asset path for packaged builds', () => {
        render(<ProviderIcon type={ModelProviderTypeEnum.OPENAI} />);

        expect(screen.getByRole('img', { name: 'openai icon' })).toHaveAttribute('src', '/providers/openai.svg');
    });

    it('renders togetherai icon correctly', () => {
        render(<ProviderIcon type={ModelProviderTypeEnum.TOGETHERAI} />);

        expect(screen.getByRole('img', { name: 'togetherai icon' })).toHaveAttribute(
            'src',
            '/providers/togetherai.svg',
        );
    });

    it('renders fireworks icon correctly', () => {
        render(<ProviderIcon type={ModelProviderTypeEnum.FIREWORKS} />);

        expect(screen.getByRole('img', { name: 'fireworks icon' })).toHaveAttribute('src', '/providers/fireworks.svg');
    });

    it('renders voyage icon correctly', () => {
        render(<ProviderIcon type={ModelProviderTypeEnum.VOYAGE} />);

        expect(screen.getByRole('img', { name: 'voyage icon' })).toHaveAttribute('src', '/providers/voyage.svg');
    });
});
