'use client';

import React, { useEffect, useState } from 'react';
import { Recycle, Clock, Pulse, CheckCircle, XCircle, List } from '@phosphor-icons/react';
import { api } from '@/lib/api';

interface ZoneOption {
    id: number;
    code: string;
    name: string;
}

interface ScheduleOption {
    id: number;
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

export default function WorkerCheckInPage() {
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

    useEffect(() => {
        fetchInitData();
    }, []);

    async function fetchInitData() {
        setLoadingSchedules(true);
        try {
            const today = new Date().toISOString().split('T')[0];
            const [zonesData, schedulesData] = await Promise.all([
                api.getSelfServiceZones(),
                api.getSelfServiceSchedules(today),
            ]);
            setZones(zonesData || []);
            const list = schedulesData.schedules || [];
            setSchedules(list);
            if (zonesData?.length) {
                setSelectedZoneId(zonesData[0].id.toString());
            }
        } catch (err) {
            console.error('Failed to fetch self-service data:', err);
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
            setError('Select a zone and shift, or scan a schedule QR code.');
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
            setError('Select a zone and shift, or scan a schedule QR code.');
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

    return (
        <div
            className="min-h-screen flex items-center justify-center bg-cover bg-center relative px-4"
            style={{ backgroundImage: 'linear-gradient(to bottom right, #0b1220, #111827)' }}
        >
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" />
            <div className="relative z-10 w-full max-w-3xl">
                <div className="bg-slate-900/90 border border-slate-700 rounded-sm p-8 backdrop-blur-md">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-emerald-700 flex items-center justify-center">
                            <Recycle size={28} className="text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-chivo font-bold uppercase tracking-wider">Worker Portal</h1>
                            <p className="text-slate-500 text-sm">Secure self-service check-in/out</p>
                        </div>
                    </div>
                    <div className="mb-5 text-xs text-slate-500 font-mono">
                        Demo PIN for seeded workers: <span className="text-slate-300">1234</span>
                    </div>

                    <div className="flex gap-3 mb-6">
                        <button
                            onClick={() => setView('check-in')}
                            className={`text-xs font-mono uppercase tracking-wider px-3 py-2 rounded border ${view === 'check-in'
                                ? 'text-slate-100 border-slate-400'
                                : 'text-slate-400 border-slate-700 hover:text-slate-200 hover:border-slate-500'
                                }`}
                        >
                            Check In
                        </button>
                        <button
                            onClick={() => setView('check-out')}
                            className={`text-xs font-mono uppercase tracking-wider px-3 py-2 rounded border ${view === 'check-out'
                                ? 'text-slate-100 border-slate-400'
                                : 'text-slate-400 border-slate-700 hover:text-slate-200 hover:border-slate-500'
                                }`}
                        >
                            Check Out
                        </button>
                        <button
                            onClick={() => setView('history')}
                            className={`text-xs font-mono uppercase tracking-wider px-3 py-2 rounded border ${view === 'history'
                                ? 'text-slate-100 border-slate-400'
                                : 'text-slate-400 border-slate-700 hover:text-slate-200 hover:border-slate-500'
                                }`}
                        >
                            History
                        </button>
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
                                    <label className="block text-slate-400 text-xs uppercase tracking-wider mb-2 font-mono">Schedule QR/Code (optional)</label>
                                    <input
                                        type="text"
                                        value={scheduleCode}
                                        onChange={(e) => setScheduleCode(e.target.value)}
                                        className="input-modern"
                                        placeholder="SCH-123"
                                    />
                                    <p className="text-[11px] text-slate-500 mt-2">If a QR code is scanned, zone/shift are ignored.</p>
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
                                <>
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
                                </>
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

                            <div className="mt-5 bg-slate-800/40 border border-slate-700/60 rounded-xl overflow-x-auto">
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
            </div>
        </div>
    );
}
