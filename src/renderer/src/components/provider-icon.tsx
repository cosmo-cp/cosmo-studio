import { cn } from '@/lib/utils';
import { ModelProviderTypeEnum } from 'core/database/schema/modelProviderSchema';
import Image from 'next/image';

type ProviderIconProps = {
    type: ModelProviderTypeEnum;
    size?: number;
    theme?: string;
    className?: string;
};

const ProviderIcon = ({ type, size = 20, theme, className }: ProviderIconProps) => {
    const iconPath = `/providers/${type}.svg`;

    return (
        <Image
            title={type}
            src={iconPath}
            alt={`${type} icon`}
            width={size}
            height={size}
            unoptimized
            style={{ backgroundColor: theme === 'dark' ? 'white' : 'transparent' }}
            className={cn('mr-2 rounded-sm', className)}
        />
    );
};

export default ProviderIcon;
