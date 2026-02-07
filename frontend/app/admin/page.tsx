'use client';

import React, { useEffect, useState } from 'react';
import { DataCard } from '@/components/DataCard';
import { api } from '@/lib/api';
import {
    MapPin,
    Truck,
    Users,
    Recycle,
    Calendar,
    ChartLineUp,
    Pulse,
    Gauge,
    Sparkle,
    ArrowSquareOut
} from '@phosphor-icons/react';

interface DashboardStats {
    total_zones: number;
    total_vehicles: number;
    total_workers: number;
    active_schedules: number;
    completed_today: number;
    total_waste_collected_kg: number;
    collection_efficiency: number;
    avg_route_utilization: number;
}

interface KPIMetrics {
    collection_efficiency: number;
    route_utilization: number;
    workforce_productivity: number;
    on_time_completion_rate: number;
    fuel_efficiency: number;
}

export default function AdminDashboard() {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [kpis, setKpis] = useState<KPIMetrics | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchData() {
            try {
                const [statsData, kpisData] = await Promise.all([
                    api.getDashboardStats(),
                    api.getKPIs(),
                ]);
                setStats(statsData);
                setKpis(kpisData);
            } catch (error) {
                console.error('Failed to fetch data:', error);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, []);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
                <div className="relative">
                    <div className="w-12 h-12 rounded-full border-2 border-slate-700 border-t-green-500 animate-spin" />
                    <Pulse size={24} className="absolute inset-0 m-auto text-green-400 animate-pulse" />
                </div>
                <p className="text-slate-500 font-mono text-xs uppercase tracking-widest animate-pulse">
                    Loading Dashboard...
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl font-chivo font-bold uppercase tracking-wider flex items-center gap-3">
                    <Gauge size={28} weight="duotone" className="text-green-400" />
                    System Overview
                </h1>
                <p className="text-slate-500 mt-1">Real-time waste collection management dashboard</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <DataCard
                    title="Collection Zones"
                    value={stats?.total_zones || 0}
                    icon={MapPin}
                    color="blue"
                />
                <DataCard
                    title="Active Vehicles"
                    value={stats?.total_vehicles || 0}
                    icon={Truck}
                    color="green"
                />
                <DataCard
                    title="Workforce"
                    value={stats?.total_workers || 0}
                    icon={Users}
                    color="purple"
                />
                <DataCard
                    title="Active Schedules"
                    value={stats?.active_schedules || 0}
                    icon={Calendar}
                    color="yellow"
                />
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-6 relative overflow-hidden">
                    <Sparkle size={80} weight="duotone" className="absolute -right-4 -top-4 text-slate-700/20" />
                    <h3 className="text-sm font-mono text-slate-400 uppercase tracking-widest mb-5 flex items-center gap-2">
                        <ChartLineUp size={16} weight="duotone" />
                        Key Performance Indicators
                    </h3>
                    <div className="space-y-4 relative z-10">
                        <div className="flex items-center justify-between">
                            <span className="text-slate-400 text-sm">Collection Efficiency</span>
                            <div className="flex items-center gap-3">
                                <div className="w-32 h-2 bg-slate-700 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full"
                                        style={{ width: `${kpis?.collection_efficiency || 0}%` }}
                                    />
                                </div>
                                <span className="text-slate-100 font-mono font-bold">{kpis?.collection_efficiency || 0}%</span>
                            </div>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-slate-400 text-sm">Route Utilization</span>
                            <div className="flex items-center gap-3">
                                <div className="w-32 h-2 bg-slate-700 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full"
                                        style={{ width: `${kpis?.route_utilization || 0}%` }}
                                    />
                                </div>
                                <span className="text-slate-100 font-mono font-bold">{kpis?.route_utilization || 0}%</span>
                            </div>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-slate-400 text-sm">On-Time Completion</span>
                            <div className="flex items-center gap-3">
                                <div className="w-32 h-2 bg-slate-700 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-yellow-500 to-yellow-400 rounded-full"
                                        style={{ width: `${kpis?.on_time_completion_rate || 0}%` }}
                                    />
                                </div>
                                <span className="text-slate-100 font-mono font-bold">{kpis?.on_time_completion_rate || 0}%</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-6 relative overflow-hidden">
                    <Sparkle size={80} weight="duotone" className="absolute -right-4 -top-4 text-slate-700/20" />
                    <h3 className="text-sm font-mono text-slate-400 uppercase tracking-widest mb-5 flex items-center gap-2">
                        <ArrowSquareOut size={16} weight="duotone" />
                        Quick Actions
                    </h3>
                    <div className="grid grid-cols-2 gap-3 relative z-10">
                        <button
                            onClick={() => window.location.href = '/admin/zones'}
                            className="bg-gradient-to-br from-blue-900/40 to-blue-950/60 border border-blue-700/30 hover:border-blue-600/50 rounded-xl px-4 py-3 text-blue-300 font-bold text-sm uppercase tracking-wider transition-all hover:scale-[1.02]"
                        >
                            Manage Zones
                        </button>
                        <button
                            onClick={() => window.location.href = '/admin/predictions'}
                            className="bg-gradient-to-br from-purple-900/40 to-purple-950/60 border border-purple-700/30 hover:border-purple-600/50 rounded-xl px-4 py-3 text-purple-300 font-bold text-sm uppercase tracking-wider transition-all hover:scale-[1.02]"
                        >
                            View Predictions
                        </button>
                        <button
                            onClick={() => window.location.href = '/admin/schedules'}
                            className="bg-gradient-to-br from-green-900/40 to-green-950/60 border border-green-700/30 hover:border-green-600/50 rounded-xl px-4 py-3 text-green-300 font-bold text-sm uppercase tracking-wider transition-all hover:scale-[1.02]"
                        >
                            Create Schedule
                        </button>
                        <button
                            onClick={() => window.location.href = '/admin/analytics'}
                            className="bg-gradient-to-br from-yellow-900/40 to-yellow-950/60 border border-yellow-700/30 hover:border-yellow-600/50 rounded-xl px-4 py-3 text-yellow-300 font-bold text-sm uppercase tracking-wider transition-all hover:scale-[1.02]"
                        >
                            Analytics
                        </button>
                    </div>
                </div>
            </div>

            {/* Today's Summary */}
            <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-6">
                <h3 className="text-sm font-mono text-slate-400 uppercase tracking-widest mb-5 flex items-center gap-2">
                    <Recycle size={16} weight="duotone" />
                    Today&apos;s Collection Summary
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center">
                        <p className="text-4xl font-bold font-mono text-green-400">{stats?.completed_today || 0}</p>
                        <p className="text-sm text-slate-500 mt-1">Collections Completed</p>
                    </div>
                    <div className="text-center">
                        <p className="text-4xl font-bold font-mono text-blue-400">
                            {((stats?.total_waste_collected_kg || 0) / 1000).toFixed(1)}
                        </p>
                        <p className="text-sm text-slate-500 mt-1">Tons Collected (30 days)</p>
                    </div>
                    <div className="text-center">
                        <p className="text-4xl font-bold font-mono text-yellow-400">
                            {kpis?.fuel_efficiency || 0}
                        </p>
                        <p className="text-sm text-slate-500 mt-1">Avg Fuel Efficiency (km/L)</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
