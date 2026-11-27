'use client';

import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import type { LucideIcon } from 'lucide-react';
import type { JSX, ReactNode } from 'react';

interface PageEmptyStateProps {
    icon: LucideIcon;
    title: string;
    description: ReactNode;
    action?: ReactNode;
}

// Keep route-level empty screens visually consistent across page entry points and page-content shells.
export function PageEmptyState({ icon: Icon, title, description, action }: PageEmptyStateProps): JSX.Element {
    return (
        <div className="flex h-full flex-1 flex-col items-center justify-center">
            <Empty>
                <EmptyHeader>
                    <EmptyMedia variant="icon">
                        <Icon />
                    </EmptyMedia>
                    <EmptyTitle>{title}</EmptyTitle>
                    <EmptyDescription>{description}</EmptyDescription>
                </EmptyHeader>
                {action ? <EmptyContent>{action}</EmptyContent> : null}
            </Empty>
        </div>
    );
}
