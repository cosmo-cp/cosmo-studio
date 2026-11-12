import { Badge } from '@/components/ui/badge';
import type { Task } from 'core/dto';
import { Archive, Ban, CheckCircle2, CircleDashed, Loader2, XCircle } from 'lucide-react';
import React from 'react';

interface TaskStatusBadgeProps {
    status: Task['status'];
    className?: string;
}

export function TaskStatusBadge({ status, className }: TaskStatusBadgeProps) {
    switch (status) {
        case 'in_progress':
            return (
                <Badge
                    variant="default"
                    className={`bg-blue-600 text-white hover:bg-blue-600/90 gap-1.5 ${className ?? ''}`}
                >
                    <Loader2 className="size-3 animate-spin" />
                    <span>In Progress</span>
                </Badge>
            );
        case 'done':
            return (
                <Badge
                    variant="default"
                    className={`bg-emerald-600 text-white hover:bg-emerald-600/90 gap-1.5 ${className ?? ''}`}
                >
                    <CheckCircle2 className="size-3" />
                    <span>Done</span>
                </Badge>
            );
        case 'failed':
            return (
                <Badge variant="destructive" className={`gap-1.5 ${className ?? ''}`}>
                    <XCircle className="size-3" />
                    <span>Failed</span>
                </Badge>
            );
        case 'cancelled':
            return (
                <Badge
                    variant="secondary"
                    className={`bg-amber-600/15 text-amber-600 dark:text-amber-400 border border-amber-600/30 gap-1.5 ${className ?? ''}`}
                >
                    <Ban className="size-3" />
                    <span>Cancelled</span>
                </Badge>
            );
        case 'closed':
            return (
                <Badge variant="outline" className={`text-muted-foreground gap-1.5 ${className ?? ''}`}>
                    <Archive className="size-3" />
                    <span>Closed</span>
                </Badge>
            );
        case 'not_started':
        default:
            return (
                <Badge variant="secondary" className={`text-muted-foreground gap-1.5 ${className ?? ''}`}>
                    <CircleDashed className="size-3" />
                    <span>Not Started</span>
                </Badge>
            );
    }
}
