import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ProviderIcon from '../provider-icon';

describe('ProviderIcon', () => {
    it('uses a document-relative asset path for packaged builds', () => {
        render(<ProviderIcon type="openai" />);

        expect(screen.getByRole('img', { name: 'openai icon' })).toHaveAttribute('src', 'providers/openai.svg');
    });
});
