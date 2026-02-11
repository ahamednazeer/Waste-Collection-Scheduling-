'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, Clock, Pulse, CheckCircle, XCircle, List, Calendar, Hash } from '@phosphor-icons/react';
import { api } from '@/lib/api';

interface ZoneOption {
    id: number;
    code: string;
    name: string;
}

interface ScheduleOption {
    id: number;
    schedule_code?: string;
    zone_id: number;
    scheduled_date: string;
    time_window: string;
    status: string;
    zone_code: string;
    zone_name: string;
}

interface AssignmentItem {
    assignment_id: number;
    schedule_id: number;
    scheduled_date: string;
    time_window: string;
    schedule_status: string;
    assignment_status: string;
    zone_code: string;
    zone_name: string;
    check_in_time?: string | null;
    check_out_time?: string | null;
    hours_worked: number;
    waste_collected_kg: number;
}

const timeWindowLabels: Record<string, string> = {
    EARLY_MORNING: '5:00 - 8:00',
    MORNING: '8:00 - 12:00',
    AFTERNOON: '12:00 - 16:00',
    EVENING: '16:00 - 20:00',
};

const formatDateTime = (value?: string | null) => {
    if (!value) return '--';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return '--';
    return parsed.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

export default function CollectionPage() {
    const router = useRouter();
    const [view, setView] = useState<'check-in' | 'check-out' | 'history'>('check-in');
    const [employeeId, setEmployeeId] = useState('');
    const [pin, setPin] = useState('');
    const [scheduleCode, setScheduleCode] = useState('');
    const [zones, setZones] = useState<ZoneOption[]>([]);
    const [schedules, setSchedules] = useState<ScheduleOption[]>([]);
    const [selectedZoneId, setSelectedZoneId] = useState<string>('');
    const [timeWindow, setTimeWindow] = useState('MORNING');
    const [hoursWorked, setHoursWorked] = useState('');
    const [wasteCollected, setWasteCollected] = useState('');
    const [assignments, setAssignments] = useState<AssignmentItem[]>([]);
    const [loadingSchedules, setLoadingSchedules] = useState(true);
    const [loadingAssignments, setLoadingAssignments] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [roleChecked, setRoleChecked] = useState(false);
    const [isOperator, setIsOperator] = useState(false);
    const [scheduleQuery, setScheduleQuery] = useState('');
    const [scheduleShift, setScheduleShift] = useState('ALL');

    useEffect(() => {
        let mounted = true;
        async function checkRole() {
            try {
                const me = await api.getMe();
                const role = me?.role;
                if (role !== 'OPERATOR') {
                    router.replace('/admin');
                    return;
                }
                if (mounted) {
                    setIsOperator(true);
                }
            } catch (err) {
                router.replace('/');
            } finally {
                if (mounted) {
                    setRoleChecked(true);
                }
            }
        }
        checkRole();
        return () => {
            mounted = false;
        };
    }, [router]);

    useEffect(() => {
        if (!isOperator) return;
        fetchInitData();
    }, [isOperator]);

    useEffect(() => {
        if (!selectedZoneId && zones.length > 0) {
            setSelectedZoneId(zones[0].id.toString());
        }
    }, [selectedZoneId, zones]);

    async function fetchInitData() {
        setLoadingSchedules(true);
        try {
            const today = new Date().toISOString().split('T')[0];
            const [zonesData, schedulesData] = await Promise.all([
                api.getSelfServiceZones(),
                api.getSelfServiceSchedules(today),
            ]);
            setZones(zonesData || []);
            setSchedules(schedulesData.schedules || []);
        } catch (err) {
            console.error('Failed to fetch collection data:', err);
        } finally {
            setLoadingSchedules(false);
        }
    }

    const hasScheduleMatch = () => {
        if (!selectedZoneId || !timeWindow) return false;
        const zoneId = parseInt(selectedZoneId, 10);
        return schedules.some((s) => s.zone_id === zoneId && s.time_window === timeWindow);
    };

    const scheduleAllowed = scheduleCode ? true : hasScheduleMatch();

    const handleCheckIn = async () => {
        setError('');
        setMessage('');
        if (!employeeId || !pin) {
            setError('Employee ID and PIN are required.');
            return;
        }
        if (!scheduleCode && (!selectedZoneId || !timeWindow)) {
            setError('Select a zone and shift, or scan a schedule code.');
            return;
        }
        setSubmitting(true);
        try {
            await api.workerCheckIn({
                employee_id: employeeId.trim(),
                pin: pin.trim(),
                schedule_code: scheduleCode ? scheduleCode.trim() : undefined,
                zone_id: scheduleCode ? undefined : parseInt(selectedZoneId, 10),
                time_window: scheduleCode ? undefined : timeWindow,
            });
            setMessage('Checked in successfully.');
        } catch (err: any) {
            setError(err.message || 'Check-in failed.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleCheckOut = async () => {
        setError('');
        setMessage('');
        if (!employeeId || !pin) {
            setError('Employee ID and PIN are required.');
            return;
        }
        if (!scheduleCode && (!selectedZoneId || !timeWindow)) {
            setError('Select a zone and shift, or scan a schedule code.');
            return;
        }
        setSubmitting(true);
        try {
            await api.workerCheckOut({
                employee_id: employeeId.trim(),
                pin: pin.trim(),
                schedule_code: scheduleCode ? scheduleCode.trim() : undefined,
                zone_id: scheduleCode ? undefined : parseInt(selectedZoneId, 10),
                time_window: scheduleCode ? undefined : timeWindow,
                hours_worked: hoursWorked ? parseFloat(hoursWorked) : undefined,
                waste_collected_kg: wasteCollected ? parseFloat(wasteCollected) : undefined,
            });
            setMessage('Checked out successfully.');
        } catch (err: any) {
            setError(err.message || 'Check-out failed.');
        } finally {
            setSubmitting(false);
        }
    };

    const loadAssignments = async () => {
        setError('');
        setMessage('');
        if (!employeeId || !pin) {
            setError('Employee ID and PIN are required.');
            return;
        }
        setLoadingAssignments(true);
        try {
            const data = await api.getSelfServiceAssignments({
                employee_id: employeeId.trim(),
                pin: pin.trim(),
            });
            setAssignments(data.assignments || []);
            setMessage(`Showing history for ${data.start_date} to ${data.end_date}.`);
        } catch (err: any) {
            setError(err.message || 'Failed to load assignments.');
        } finally {
            setLoadingAssignments(false);
        }
    };

    const filteredSchedules = useMemo(() => {
        let list = schedules;
        const query = scheduleQuery.trim().toLowerCase();
        if (query) {
            list = list.filter((schedule) => {
                const code = (schedule.schedule_code || `SCH-${schedule.id}`).toLowerCase();
                const zoneText = `${schedule.zone_code} ${schedule.zone_name}`.toLowerCase();
                return code.includes(query) || zoneText.includes(query);
            });
        }
        if (scheduleShift !== 'ALL') {
            list = list.filter((schedule) => schedule.time_window === scheduleShift);
        }
        return list;
    }, [schedules, scheduleQuery, scheduleShift]);

    const scheduleList = useMemo(() => filteredSchedules.slice(0, 8), [filteredSchedules]);

    const selectSchedule = (code?: string) => {
        if (!code) return;
        setScheduleCode(code);
        setMessage(`Schedule ${code} selected.`);
    };

    if (!roleChecked) {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
                <div className="relative">
                    <div className="w-12 h-12 rounded-full border-2 border-slate-700 border-t-emerald-500 animate-spin" />
                    <Pulse size={24} className="absolute inset-0 m-auto text-emerald-400 animate-pulse" />
                </div>
                <p className="text-slate-500 font-mono text-xs uppercase tracking-widest animate-pulse">
                    Verifying operator access...
                </p>
            </div>
        );
    }

    if (!isOperator) {
        return null;
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-chivo font-bold uppercase tracking-wider flex items-center gap-3">
                    <MapPin size={28} weight="duotone" className="text-emerald-400" />
                    Collection Operations
                </h1>
                <p className="text-slate-500 mt-1">Operator check-in/out and daily collection status</p>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-6">
                <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-6">
                    <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                        <div>
                            <h2 className="text-lg font-chivo font-bold uppercase tracking-wider">Operator Portal</h2>
                            <p className="text-xs text-slate-500 font-mono mt-1">Demo PIN for seeded workers: 1234</p>
                        </div>
                        <div className="flex gap-2">
                            {(['check-in', 'check-out', 'history'] as const).map((mode) => (
                                <button
                                    key={mode}
                                    onClick={() => setView(mode)}
                                    className={`text-xs font-mono uppercase tracking-wider px-3 py-2 rounded border ${view === mode
                                        ? 'text-slate-100 border-slate-400'
                                        : 'text-slate-400 border-slate-700 hover:text-slate-200 hover:border-slate-500'
                                        }`}
                                >
                                    {mode.replace('-', ' ')}
                                </button>
                            ))}
                        </div>
                    </div>

                    {error && (
                        <div className="bg-red-950/60 border border-red-800 rounded-sm p-3 mb-4 text-sm text-red-400 flex items-center gap-2">
                            <XCircle size={18} />
                            {error}
                        </div>
                    )}

                    {message && (
                        <div className="bg-emerald-950/60 border border-emerald-800 rounded-sm p-3 mb-4 text-sm text-emerald-400 flex items-center gap-2">
                            <CheckCircle size={18} />
                            {message}
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-slate-400 text-xs uppercase tracking-wider mb-2 font-mono">Employee ID</label>
                            <input
                                type="text"
                                value={employeeId}
                                onChange={(e) => setEmployeeId(e.target.value)}
                                className="input-modern"
                                placeholder="EMP001"
                            />
                        </div>
                        <div>
                            <label className="block text-slate-400 text-xs uppercase tracking-wider mb-2 font-mono">PIN</label>
                            <input
                                type="password"
                                value={pin}
                                onChange={(e) => setPin(e.target.value)}
                                className="input-modern"
                                placeholder="••••"
                            />
                        </div>
                    </div>

                    {(view === 'check-in' || view === 'check-out') && (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                <div>
                                    <label className="block text-slate-400 text-xs uppercase tracking-wider mb-2 font-mono">Schedule Code (optional)</label>
                                    <input
                                        type="text"
                                        value={scheduleCode}
                                        onChange={(e) => setScheduleCode(e.target.value)}
                                        className="input-modern"
                                        placeholder="SCH-123"
                                    />
                                    <p className="text-[11px] text-slate-500 mt-2">If a code is provided, zone/shift are ignored.</p>
                                </div>
                                <div>
                                    <label className="block text-slate-400 text-xs uppercase tracking-wider mb-2 font-mono">Zone</label>
                                    <select
                                        value={selectedZoneId}
                                        onChange={(e) => setSelectedZoneId(e.target.value)}
                                        className="input-modern"
                                        disabled={loadingSchedules || zones.length === 0}
                                    >
                                        {zones.map((zone) => (
                                            <option key={zone.id} value={zone.id}>
                                                {zone.code} - {zone.name}
                                            </option>
                                        ))}
                                    </select>
                                    {loadingSchedules && (
                                        <div className="text-xs text-slate-500 mt-2 flex items-center gap-2">
                                            <Pulse size={14} className="animate-pulse" />
                                            Loading zones...
                                        </div>
                                    )}
                                    {!loadingSchedules && zones.length === 0 && (
                                        <div className="text-xs text-slate-500 mt-2">No zones available.</div>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                <div>
                                    <label className="block text-slate-400 text-xs uppercase tracking-wider mb-2 font-mono">Shift</label>
                                    <select
                                        value={timeWindow}
                                        onChange={(e) => setTimeWindow(e.target.value)}
                                        className="input-modern"
                                        disabled={loadingSchedules}
                                    >
                                        {Object.keys(timeWindowLabels).map((key) => (
                                            <option key={key} value={key}>
                                                {timeWindowLabels[key]}
                                            </option>
                                        ))}
                                    </select>
                                    {!scheduleCode && !loadingSchedules && (
                                        <p className={`text-[11px] mt-2 ${hasScheduleMatch() ? 'text-emerald-400' : 'text-yellow-400'}`}>
                                            {hasScheduleMatch() ? 'Schedule available for this zone/shift.' : 'No schedule found for this zone/shift.'}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {view === 'check-out' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                    <div>
                                        <label className="block text-slate-400 text-xs uppercase tracking-wider mb-2 font-mono">Hours Worked (optional)</label>
                                        <input
                                            type="number"
                                            value={hoursWorked}
                                            onChange={(e) => setHoursWorked(e.target.value)}
                                            className="input-modern"
                                            min="0"
                                            step="0.25"
                                            placeholder="e.g., 7.5"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-slate-400 text-xs uppercase tracking-wider mb-2 font-mono">Waste Collected (kg, optional)</label>
                                        <input
                                            type="number"
                                            value={wasteCollected}
                                            onChange={(e) => setWasteCollected(e.target.value)}
                                            className="input-modern"
                                            min="0"
                                            step="0.1"
                                            placeholder="e.g., 1200"
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="flex flex-col md:flex-row gap-3 mt-6">
                                {view === 'check-in' && (
                                    <button
                                        onClick={handleCheckIn}
                                        disabled={submitting || loadingSchedules || !scheduleAllowed}
                                        className="btn-primary flex-1 flex items-center justify-center gap-2"
                                    >
                                        <Clock size={18} />
                                        {submitting ? 'Processing...' : 'Check In'}
                                    </button>
                                )}
                                {view === 'check-out' && (
                                    <button
                                        onClick={handleCheckOut}
                                        disabled={submitting || loadingSchedules || !scheduleAllowed}
                                        className="btn-secondary flex-1 flex items-center justify-center gap-2"
                                    >
                                        <Clock size={18} />
                                        {submitting ? 'Processing...' : 'Check Out'}
                                    </button>
                                )}
                            </div>
                        </>
                    )}

                    {view === 'history' && (
                        <>
                            <div className="flex items-center gap-3 mt-6">
                                <button
                                    onClick={loadAssignments}
                                    disabled={loadingAssignments}
                                    className="btn-primary flex items-center gap-2"
                                >
                                    <List size={18} />
                                    {loadingAssignments ? 'Loading...' : 'Load History'}
                                </button>
                                <span className="text-xs text-slate-500">Default: this week</span>
                            </div>

                            <div className="mt-5 bg-slate-900/40 border border-slate-700/60 rounded-xl overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-slate-700">
                                            <th className="px-4 py-3 text-left text-xs font-mono text-slate-500 uppercase tracking-wider">Date</th>
                                            <th className="px-4 py-3 text-left text-xs font-mono text-slate-500 uppercase tracking-wider">Zone</th>
                                            <th className="px-4 py-3 text-left text-xs font-mono text-slate-500 uppercase tracking-wider">Shift</th>
                                            <th className="px-4 py-3 text-left text-xs font-mono text-slate-500 uppercase tracking-wider">Check In</th>
                                            <th className="px-4 py-3 text-left text-xs font-mono text-slate-500 uppercase tracking-wider">Check Out</th>
                                            <th className="px-4 py-3 text-left text-xs font-mono text-slate-500 uppercase tracking-wider">Status</th>
                                            <th className="px-4 py-3 text-left text-xs font-mono text-slate-500 uppercase tracking-wider">Hours</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {assignments.map((assignment) => {
                                            const date = new Date(assignment.scheduled_date);
                                            return (
                                                <tr key={assignment.assignment_id} className="border-b border-slate-800 hover:bg-slate-800/50 transition-colors">
                                                    <td className="px-4 py-3 font-mono text-sm text-slate-300">
                                                        {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-slate-200">
                                                        {assignment.zone_code} - {assignment.zone_name}
                                                    </td>
                                                    <td className="px-4 py-3 font-mono text-sm text-slate-400">
                                                        {timeWindowLabels[assignment.time_window] || assignment.time_window}
                                                    </td>
                                                    <td className="px-4 py-3 font-mono text-sm text-slate-400">
                                                        {formatDateTime(assignment.check_in_time)}
                                                    </td>
                                                    <td className="px-4 py-3 font-mono text-sm text-slate-400">
                                                        {formatDateTime(assignment.check_out_time)}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-slate-400 uppercase">
                                                        {assignment.assignment_status}
                                                    </td>
                                                    <td className="px-4 py-3 font-mono text-sm text-slate-400">
                                                        {assignment.hours_worked?.toFixed(1) || '0.0'}h
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                                {assignments.length === 0 && (
                                    <div className="p-6 text-center text-slate-500">No assignments found for this period.</div>
                                )}
                            </div>
                        </>
                    )}
                </div>

                <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-mono text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <Calendar size={14} />
                            Today&apos;s Schedules
                        </h3>
                        <button
                            onClick={fetchInitData}
                            className="text-xs font-mono text-slate-400 hover:text-slate-200"
                            disabled={loadingSchedules}
                        >
                            Refresh
                        </button>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                        <div>
                            <label className="block text-slate-400 text-[11px] uppercase tracking-wider mb-2 font-mono">
                                Search
                            </label>
                            <input
                                type="text"
                                value={scheduleQuery}
                                onChange={(e) => setScheduleQuery(e.target.value)}
                                className="input-modern"
                                placeholder="Zone or schedule code"
                            />
                        </div>
                        <div>
                            <label className="block text-slate-400 text-[11px] uppercase tracking-wider mb-2 font-mono">
                                Shift Filter
                            </label>
                            <select
                                value={scheduleShift}
                                onChange={(e) => setScheduleShift(e.target.value)}
                                className="input-modern"
                            >
                                <option value="ALL">All shifts</option>
                                {Object.keys(timeWindowLabels).map((key) => (
                                    <option key={key} value={key}>
                                        {timeWindowLabels[key]}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">
                            Showing {scheduleList.length} of {filteredSchedules.length} schedules
                        </div>
                    </div>

                    {loadingSchedules && (
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                            <Pulse size={14} className="animate-pulse" />
                            Loading schedules...
                        </div>
                    )}

                    {!loadingSchedules && scheduleList.length === 0 && (
                        <div className="text-sm text-slate-500">
                            {schedules.length === 0 ? 'No schedules scheduled for today.' : 'No schedules match the current filters.'}
                        </div>
                    )}

                    <div className="space-y-3">
                        {scheduleList.map((schedule) => {
                            const label = timeWindowLabels[schedule.time_window] || schedule.time_window;
                            const code = schedule.schedule_code || `SCH-${schedule.id}`;
                            return (
                                <div key={schedule.id} className="border border-slate-700/60 rounded-sm p-3 bg-slate-900/40">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                                            <Hash size={12} />
                                            {code}
                                        </div>
                                        <button
                                            onClick={() => selectSchedule(code)}
                                            className="text-xs text-emerald-300 hover:text-emerald-200"
                                        >
                                            Use
                                        </button>
                                    </div>
                                    <div className="text-sm text-slate-200 mt-1">{schedule.zone_code} - {schedule.zone_name}</div>
                                    <div className="text-xs text-slate-500 mt-2 flex items-center gap-2">
                                        <Clock size={12} />
                                        {label}
                                    </div>
                                    <div className="text-[11px] text-slate-500 mt-1 uppercase tracking-wider">
                                        Status: {schedule.status}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
