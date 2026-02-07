import React from 'react';

interface StatusBadgeProps {
    status: string;
    size?: 'sm' | 'md';
}

const statusColors: Record<string, string> = {
    // Schedule statuses
    PLANNED: 'status-pending',
    IN_PROGRESS: 'status-in-progress',
    COMPLETED: 'status-success',
    CANCELLED: 'status-failed',
    DELAYED: 'status-warning',

    // Vehicle statuses
    AVAILABLE: 'status-success',
    IN_SERVICE: 'status-in-progress',
    MAINTENANCE: 'status-warning',
    OUT_OF_SERVICE: 'status-failed',

    // Worker statuses
    ON_DUTY: 'status-in-progress',
    ON_LEAVE: 'status-warning',
    INACTIVE: 'status-failed',

    // Priority levels
    LOW: 'text-slate-400 bg-slate-800/50 border-slate-600',
    MEDIUM: 'status-pending',
    HIGH: 'status-warning',
    CRITICAL: 'status-failed',

    // Default
    DEFAULT: 'text-slate-400 bg-slate-800/50 border-slate-600',
};

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
    const colorClass = statusColors[status?.toUpperCase()] || statusColors.DEFAULT;
    const sizeClass = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-xs px-2.5 py-1';

    return (
        <span className={`inline-flex items-center font-mono uppercase tracking-wider rounded border ${colorClass} ${sizeClass}`}>
            {status?.replace(/_/g, ' ') || 'Unknown'}
        </span>
    );
}
