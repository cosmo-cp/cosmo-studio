import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {ModelProviderTypeEnum} from 'core/database/schema/modelProviderSchema';
import ProviderIcon from '../provider-icon';

describe('ProviderIcon', () => {
    it('uses a document-relative asset path for packaged builds', () => {
        render(<ProviderIcon type={ModelProviderTypeEnum.OPENAI} />);

        expect(screen.getByRole('img', { name: 'openai icon' })).toHaveAttribute('src', '/providers/openai.svg');
    });
});
