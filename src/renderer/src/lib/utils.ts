import { clsx, type ClassValue } from 'clsx';
import { format, isThisWeek, isThisYear, isToday, isYesterday } from 'date-fns';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

// Keep history timestamps compact and consistent across sidebar history views.
export function formatHistoryTimestamp(timestamp: Date | null): string {
    if (!timestamp) {
        return '';
    }

    if (isToday(timestamp)) {
        return format(timestamp, 'h:mm a');
    }
    if (isYesterday(timestamp)) {
        return 'Yesterday';
    }
    if (isThisWeek(timestamp)) {
        return format(timestamp, 'EEEE');
    }
    if (isThisYear(timestamp)) {
        return format(timestamp, 'MMM d');
    }
    return format(timestamp, 'dd/MM/yy');
}
