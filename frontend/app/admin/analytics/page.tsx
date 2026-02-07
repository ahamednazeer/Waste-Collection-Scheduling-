'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { ChartLineUp, Pulse, MapPin } from '@phosphor-icons/react';

interface WasteTrend {
    date: string;
    waste_kg: number;
}

interface ZonePerformance {
    zone_id: number;
    zone_name: string;
    zone_code: string;
    total_waste_kg: number;
    collection_count: number;
}

export default function AnalyticsPage() {
    const [trends, setTrends] = useState<WasteTrend[]>([]);
    const [zonePerformance, setZonePerformance] = useState<ZonePerformance[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    async function fetchData() {
        try {
            const [trendsData, perfData] = await Promise.all([
                api.getWasteTrends(30),
                api.getZonePerformance(),
            ]);
            setTrends(trendsData.data || []);
            setZonePerformance(perfData.zones || []);
        } catch (error) {
            console.error('Failed to fetch analytics:', error);
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
                <div className="relative">
                    <div className="w-12 h-12 rounded-full border-2 border-slate-700 border-t-yellow-500 animate-spin" />
                    <Pulse size={24} className="absolute inset-0 m-auto text-yellow-400 animate-pulse" />
                </div>
                <p className="text-slate-500 font-mono text-xs uppercase tracking-widest animate-pulse">
                    Loading Analytics...
                </p>
            </div>
        );
    }

    const maxWaste = Math.max(...trends.map((t) => t.waste_kg), 1);
    const totalWaste = trends.reduce((sum, t) => sum + t.waste_kg, 0);
    const avgDaily = trends.length > 0 ? totalWaste / trends.length : 0;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-chivo font-bold uppercase tracking-wider flex items-center gap-3">
                    <ChartLineUp size={28} weight="duotone" className="text-yellow-400" />
                    Analytics Dashboard
                </h1>
                <p className="text-slate-500 mt-1">Waste collection performance metrics and trends</p>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-5 text-center">
                    <p className="text-3xl font-bold font-mono text-yellow-400">{(totalWaste / 1000).toFixed(1)}</p>
                    <p className="text-sm text-slate-500 mt-1">Total Waste (Tons, 30 days)</p>
                </div>
                <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-5 text-center">
                    <p className="text-3xl font-bold font-mono text-blue-400">{avgDaily.toFixed(0)}</p>
                    <p className="text-sm text-slate-500 mt-1">Daily Average (kg)</p>
                </div>
                <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-5 text-center">
                    <p className="text-3xl font-bold font-mono text-green-400">{zonePerformance.length}</p>
                    <p className="text-sm text-slate-500 mt-1">Active Zones</p>
                </div>
            </div>

            {/* Waste Trends Chart */}
            <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-6">
                <h3 className="text-sm font-mono text-slate-400 uppercase tracking-widest mb-5 flex items-center gap-2">
                    <ChartLineUp size={16} weight="duotone" />
                    30-Day Waste Collection Trend
                </h3>
                <div className="h-48 flex items-end gap-1">
                    {trends.map((trend, idx) => {
                        const height = (trend.waste_kg / maxWaste) * 100;
                        const date = new Date(trend.date);
                        const isWeekend = date.getDay() === 0 || date.getDay() === 6;

                        return (
                            <div
                                key={idx}
                                className="flex-1 group relative"
                                title={`${trend.date}: ${trend.waste_kg.toFixed(0)} kg`}
                            >
                                <div
                                    className={`w-full rounded-t transition-all hover:opacity-80 ${isWeekend ? 'bg-slate-600' : 'bg-gradient-to-t from-yellow-600 to-yellow-400'
                                        }`}
                                    style={{ height: `${height}%`, minHeight: '2px' }}
                                />
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs font-mono whitespace-nowrap z-10">
                                    {trend.waste_kg.toFixed(0)} kg
                                </div>
                            </div>
                        );
                    })}
                </div>
                <div className="flex justify-between mt-2 text-xs font-mono text-slate-600">
                    <span>{trends[0]?.date || ''}</span>
                    <span>{trends[trends.length - 1]?.date || ''}</span>
                </div>
            </div>

            {/* Zone Performance */}
            <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-6">
                <h3 className="text-sm font-mono text-slate-400 uppercase tracking-widest mb-5 flex items-center gap-2">
                    <MapPin size={16} weight="duotone" />
                    Zone Performance (Last 30 Days)
                </h3>
                <div className="space-y-3">
                    {zonePerformance.slice(0, 10).map((zone) => {
                        const maxZoneWaste = Math.max(...zonePerformance.map((z) => z.total_waste_kg), 1);
                        const percentage = (zone.total_waste_kg / maxZoneWaste) * 100;

                        return (
                            <div key={zone.zone_id} className="flex items-center gap-4">
                                <span className="w-12 text-xs font-mono text-blue-400">{zone.zone_code}</span>
                                <span className="w-40 text-sm text-slate-300 truncate">{zone.zone_name}</span>
                                <div className="flex-1 h-4 bg-slate-700 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-green-600 to-green-400 rounded-full transition-all"
                                        style={{ width: `${percentage}%` }}
                                    />
                                </div>
                                <span className="w-24 text-right text-sm font-mono text-slate-400">
                                    {(zone.total_waste_kg / 1000).toFixed(1)} tons
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
