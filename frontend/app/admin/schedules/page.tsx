'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { StatusBadge } from '@/components/StatusBadge';
import { Calendar, Plus, Pulse, Sparkle } from '@phosphor-icons/react';

interface Schedule {
    id: number;
    zone_id: number;
    vehicle_id: number | null;
    scheduled_date: string;
    time_window: string;
    expected_waste_kg: number | null;
    actual_waste_kg: number | null;
    status: string;
    priority: number;
}

export default function SchedulesPage() {
    const [schedules, setSchedules] = useState<Schedule[]>([]);
    const [zones, setZones] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [dateRange, setDateRange] = useState({
        start: new Date().toISOString().split('T')[0],
        end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    });

    useEffect(() => {
        fetchData();
    }, []);

    async function fetchData() {
        try {
            const [schedulesData, zonesData] = await Promise.all([
                api.getSchedules({ limit: 50 }),
                api.getZones(),
            ]);
            setSchedules(schedulesData);
            setZones(zonesData);
        } catch (error) {
            console.error('Failed to fetch data:', error);
        } finally {
            setLoading(false);
        }
    }

    async function handleGenerateSchedules() {
        setGenerating(true);
        try {
            await api.generateSchedules(dateRange.start, dateRange.end);
            fetchData();
            alert('Schedules generated successfully!');
        } catch (error: any) {
            alert(error.message);
        } finally {
            setGenerating(false);
        }
    }

    const getZoneName = (zoneId: number) => {
        const zone = zones.find((z) => z.id === zoneId);
        return zone ? `${zone.code} - ${zone.name}` : `Zone ${zoneId}`;
    };

    const timeWindowLabels: Record<string, string> = {
        EARLY_MORNING: '5:00 - 8:00',
        MORNING: '8:00 - 12:00',
        AFTERNOON: '12:00 - 16:00',
        EVENING: '16:00 - 20:00',
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
                <div className="relative">
                    <div className="w-12 h-12 rounded-full border-2 border-slate-700 border-t-green-500 animate-spin" />
                    <Pulse size={24} className="absolute inset-0 m-auto text-green-400 animate-pulse" />
                </div>
                <p className="text-slate-500 font-mono text-xs uppercase tracking-widest animate-pulse">
                    Loading Schedules...
                </p>
            </div>
        );
    }

    // Group schedules by date
    const schedulesByDate: Record<string, Schedule[]> = {};
    schedules.forEach((s) => {
        if (!schedulesByDate[s.scheduled_date]) {
            schedulesByDate[s.scheduled_date] = [];
        }
        schedulesByDate[s.scheduled_date].push(s);
    });

    const sortedDates = Object.keys(schedulesByDate).sort();

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-chivo font-bold uppercase tracking-wider flex items-center gap-3">
                        <Calendar size={28} weight="duotone" className="text-green-400" />
                        Collection Schedules
                    </h1>
                    <p className="text-slate-500 mt-1">Manage and generate collection schedules</p>
                </div>
            </div>

            {/* Generate Schedules */}
            <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-4">
                <h3 className="text-sm font-mono text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Sparkle size={16} weight="duotone" />
                    Auto-Generate Schedules
                </h3>
                <div className="flex items-end gap-4">
                    <div>
                        <label className="block text-slate-400 text-xs uppercase tracking-wider mb-2 font-mono">Start Date</label>
                        <input
                            type="date"
                            value={dateRange.start}
                            onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                            className="input-modern"
                        />
                    </div>
                    <div>
                        <label className="block text-slate-400 text-xs uppercase tracking-wider mb-2 font-mono">End Date</label>
                        <input
                            type="date"
                            value={dateRange.end}
                            onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                            className="input-modern"
                        />
                    </div>
                    <button
                        onClick={handleGenerateSchedules}
                        disabled={generating}
                        className="btn-success flex items-center gap-2"
                    >
                        <Plus size={18} />
                        {generating ? 'Generating...' : 'Generate Schedules'}
                    </button>
                </div>
            </div>

            {/* Schedules by Date */}
            {sortedDates.length > 0 ? (
                <div className="space-y-6">
                    {sortedDates.map((dateStr) => {
                        const date = new Date(dateStr);
                        const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
                        const formattedDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                        const daySchedules = schedulesByDate[dateStr];

                        return (
                            <div key={dateStr} className="bg-slate-800/40 border border-slate-700/60 rounded-xl overflow-hidden">
                                <div className="bg-slate-900/50 px-4 py-3 border-b border-slate-700">
                                    <h3 className="font-chivo font-bold uppercase tracking-wider text-sm flex items-center gap-3">
                                        <span className="text-green-400">{dayName}</span>
                                        <span className="text-slate-500 font-mono">{formattedDate}</span>
                                        <span className="ml-auto text-xs font-mono text-slate-600">
                                            {daySchedules.length} collection{daySchedules.length !== 1 ? 's' : ''}
                                        </span>
                                    </h3>
                                </div>
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-slate-700">
                                            <th className="px-4 py-2 text-left text-xs font-mono text-slate-500 uppercase tracking-wider">Code</th>
                                            <th className="px-4 py-2 text-left text-xs font-mono text-slate-500 uppercase tracking-wider">Zone</th>
                                            <th className="px-4 py-2 text-left text-xs font-mono text-slate-500 uppercase tracking-wider">Time Window</th>
                                            <th className="px-4 py-2 text-left text-xs font-mono text-slate-500 uppercase tracking-wider">Expected Waste</th>
                                            <th className="px-4 py-2 text-left text-xs font-mono text-slate-500 uppercase tracking-wider">Priority</th>
                                            <th className="px-4 py-2 text-left text-xs font-mono text-slate-500 uppercase tracking-wider">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {daySchedules.map((schedule) => (
                                            <tr key={schedule.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                                                <td className="px-4 py-3 font-mono text-xs text-blue-400">SCH-{schedule.id}</td>
                                                <td className="px-4 py-3 text-sm text-slate-200">{getZoneName(schedule.zone_id)}</td>
                                                <td className="px-4 py-3 font-mono text-sm text-slate-400">
                                                    {timeWindowLabels[schedule.time_window] || schedule.time_window}
                                                </td>
                                                <td className="px-4 py-3 font-mono text-sm text-slate-400">
                                                    {schedule.expected_waste_kg ? `${schedule.expected_waste_kg.toFixed(0)} kg` : '-'}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${schedule.priority >= 4 ? 'bg-red-950 text-red-400' :
                                                            schedule.priority >= 3 ? 'bg-yellow-950 text-yellow-400' :
                                                                'bg-slate-800 text-slate-400'
                                                        }`}>
                                                        {schedule.priority}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3"><StatusBadge status={schedule.status} size="sm" /></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-8 text-center text-slate-500">
                    No schedules found. Generate schedules to get started!
                </div>
            )}
        </div>
    );
}
