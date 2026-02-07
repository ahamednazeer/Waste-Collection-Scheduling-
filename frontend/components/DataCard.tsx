import React from 'react';

interface DataCardProps {
    title: string;
    value: string | number;
    icon: React.ElementType;
    trend?: {
        value: number;
        isPositive: boolean;
    };
    color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple';
}

const colorClasses = {
    blue: 'text-blue-400 bg-blue-950/30',
    green: 'text-green-400 bg-green-950/30',
    yellow: 'text-yellow-400 bg-yellow-950/30',
    red: 'text-red-400 bg-red-950/30',
    purple: 'text-purple-400 bg-purple-950/30',
};

export function DataCard({ title, value, icon: Icon, trend, color = 'blue' }: DataCardProps) {
    return (
        <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-5 relative overflow-hidden group hover:border-slate-600 transition-colors">
            <div className="flex items-start justify-between">
                <div className="space-y-2">
                    <p className="text-xs font-mono text-slate-500 uppercase tracking-wider">{title}</p>
                    <p className="text-3xl font-bold font-mono text-slate-100">{value}</p>
                    {trend && (
                        <p className={`text-xs font-mono ${trend.isPositive ? 'text-green-400' : 'text-red-400'}`}>
                            {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
                        </p>
                    )}
                </div>
                <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
                    <Icon size={24} weight="duotone" />
                </div>
            </div>
            <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <Icon size={100} weight="fill" />
            </div>
        </div>
    );
}
