import { ModelProviderTypeEnum } from 'core/database/schema/modelProviderSchema';
import { cn } from '@/lib/utils';
import Image from 'next/image';

type ProviderIconProps = {
    type: ModelProviderTypeEnum;
    size?: number;
    theme?: string;
    className?: string;
};

// Uses document-relative asset paths so icons resolve in packaged file:// exports.
const ProviderIcon = ({ type, size = 20, theme, className }: ProviderIconProps) => {
    const iconPath = `providers/${type}.svg`;

    return (
        <div className={cn('mr-2 inline-flex items-center justify-center', className)}>
            <Image
                title={type}
                src={iconPath}
                alt={`${type} icon`}
                width={size}
                height={size}
                unoptimized
                style={{ backgroundColor: theme === 'dark' ? 'white' : 'transparent' }}
                className="rounded-sm"
            />
        </div>
    );
};

export default ProviderIcon;
