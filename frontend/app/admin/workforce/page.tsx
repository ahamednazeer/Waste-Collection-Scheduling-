'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { StatusBadge } from '@/components/StatusBadge';
import { Modal } from '@/components/Modal';
import { Users, Plus, Pencil, Trash, Pulse } from '@phosphor-icons/react';

interface Worker {
    id: number;
    employee_id: string;
    first_name: string;
    last_name: string;
    phone: string | null;
    email: string | null;
    role: string;
    skill_level: string;
    status: string;
    is_active: boolean;
    current_week_hours: number;
    current_week_assignments: number;
    total_assignments: number;
}

interface Zone {
    id: number;
    name: string;
    code: string;
}

interface Schedule {
    id: number;
    zone_id: number;
    scheduled_date: string;
    time_window: string;
    status: string;
}

interface Assignment {
    id: number;
    schedule_id: number;
    status: string;
    hours_worked: number;
    waste_collected_kg: number;
}

export default function WorkforcePage() {
    const [workers, setWorkers] = useState<Worker[]>([]);
    const [schedules, setSchedules] = useState<Schedule[]>([]);
    const [zones, setZones] = useState<Zone[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingAssignments, setLoadingAssignments] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [showHoursModal, setShowHoursModal] = useState(false);
    const [showAutoAssignModal, setShowAutoAssignModal] = useState(false);
    const [editingWorker, setEditingWorker] = useState<Worker | null>(null);
    const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [formData, setFormData] = useState({
        employee_id: '',
        first_name: '',
        last_name: '',
        phone: '',
        email: '',
        role: 'COLLECTOR',
        skill_level: 'INTERMEDIATE',
        pin: '',
    });
    const [assignForm, setAssignForm] = useState({
        schedule_id: '',
        assigned_role: '',
    });
    const [hoursForm, setHoursForm] = useState({
        assignment_id: '',
        hours_worked: '',
    });
    const [autoAssignForm, setAutoAssignForm] = useState({
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        drivers_per_schedule: 1,
        collectors_per_schedule: 2,
        supervisors_per_schedule: 0,
    });

    useEffect(() => {
        fetchData();
    }, []);

    async function fetchData() {
        setLoading(true);
        try {
            const [workersData, schedulesData, zonesData] = await Promise.all([
                api.getWorkers(),
                api.getSchedules({ limit: 100 }),
                api.getZones(),
            ]);
            setWorkers(workersData);
            setSchedules(schedulesData);
            setZones(zonesData);
        } catch (error) {
            console.error('Failed to fetch workforce data:', error);
        } finally {
            setLoading(false);
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload: any = {
                employee_id: formData.employee_id,
                first_name: formData.first_name,
                last_name: formData.last_name,
                phone: formData.phone.trim() ? formData.phone.trim() : undefined,
                email: formData.email.trim() ? formData.email.trim() : undefined,
                role: formData.role,
                skill_level: formData.skill_level,
                pin: formData.pin.trim() ? formData.pin.trim() : undefined,
            };
            if (editingWorker) {
                delete payload.employee_id;
                await api.updateWorker(editingWorker.id, payload);
            } else {
                await api.createWorker(payload);
            }
            setShowModal(false);
            setEditingWorker(null);
            resetForm();
            fetchData();
        } catch (error: any) {
            alert(error.message);
        }
    };

    const handleEdit = (worker: Worker) => {
        setEditingWorker(worker);
        setFormData({
            employee_id: worker.employee_id,
            first_name: worker.first_name,
            last_name: worker.last_name,
            phone: worker.phone || '',
            email: worker.email || '',
            role: worker.role,
            skill_level: worker.skill_level,
            pin: '',
        });
        setShowModal(true);
    };

    const handleDelete = async (worker: Worker) => {
        if (confirm(`Remove worker "${worker.first_name} ${worker.last_name}"?`)) {
            try {
                await api.deleteWorker(worker.id);
                fetchData();
            } catch (error: any) {
                alert(error.message);
            }
        }
    };

    const resetForm = () => {
        setFormData({
            employee_id: '',
            first_name: '',
            last_name: '',
            phone: '',
            email: '',
            role: 'COLLECTOR',
            skill_level: 'INTERMEDIATE',
            pin: '',
        });
    };

    const timeWindowLabels: Record<string, string> = {
        EARLY_MORNING: '5:00 - 8:00',
        MORNING: '8:00 - 12:00',
        AFTERNOON: '12:00 - 16:00',
        EVENING: '16:00 - 20:00',
    };

    const getZoneName = (zoneId: number) => {
        const zone = zones.find((z) => z.id === zoneId);
        return zone ? `${zone.code} - ${zone.name}` : `Zone ${zoneId}`;
    };

    const getScheduleLabel = (scheduleId: number) => {
        const schedule = schedules.find((s) => s.id === scheduleId);
        if (!schedule) {
            return `Schedule #${scheduleId}`;
        }
        const date = new Date(schedule.scheduled_date);
        const dateLabel = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const timeLabel = timeWindowLabels[schedule.time_window] || schedule.time_window;
        return `${dateLabel} · ${timeLabel} · ${getZoneName(schedule.zone_id)}`;
    };

    const openAssignModal = (worker: Worker) => {
        setSelectedWorker(worker);
        setAssignForm({
            schedule_id: schedules[0]?.id?.toString() || '',
            assigned_role: worker.role,
        });
        setShowAssignModal(true);
    };

    const openHoursModal = async (worker: Worker) => {
        setSelectedWorker(worker);
        setShowHoursModal(true);
        setLoadingAssignments(true);
        try {
            const data = await api.getWorkerAssignments(worker.id);
            const list = data.assignments || [];
            setAssignments(list);
            setHoursForm({
                assignment_id: list[0]?.id?.toString() || '',
                hours_worked: list[0]?.hours_worked?.toString() || '',
            });
        } catch (error) {
            console.error('Failed to fetch assignments:', error);
        } finally {
            setLoadingAssignments(false);
        }
    };

    const handleAssignSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedWorker || !assignForm.schedule_id) {
            return;
        }
        try {
            await api.createWorkerAssignment(selectedWorker.id, {
                schedule_id: parseInt(assignForm.schedule_id, 10),
                assigned_role: assignForm.assigned_role || selectedWorker.role,
            });
            setShowAssignModal(false);
            setSelectedWorker(null);
            fetchData();
        } catch (error: any) {
            alert(error.message);
        }
    };

    const handleHoursSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedWorker || !hoursForm.assignment_id || !hoursForm.hours_worked) {
            return;
        }
        try {
            await api.updateWorkerAssignment(
                selectedWorker.id,
                parseInt(hoursForm.assignment_id, 10),
                { hours_worked: parseFloat(hoursForm.hours_worked) }
            );
            setShowHoursModal(false);
            setSelectedWorker(null);
            setAssignments([]);
            setHoursForm({ assignment_id: '', hours_worked: '' });
            fetchData();
        } catch (error: any) {
            alert(error.message);
        }
    };

    const handleAutoAssignSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const result = await api.autoAssignWorkers({
                start_date: autoAssignForm.start_date,
                end_date: autoAssignForm.end_date,
                drivers_per_schedule: Number(autoAssignForm.drivers_per_schedule),
                collectors_per_schedule: Number(autoAssignForm.collectors_per_schedule),
                supervisors_per_schedule: Number(autoAssignForm.supervisors_per_schedule),
            });
            setShowAutoAssignModal(false);
            fetchData();
            alert(result.message || 'Auto-assign completed.');
        } catch (error: any) {
            alert(error.message);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
                <div className="relative">
                    <div className="w-12 h-12 rounded-full border-2 border-slate-700 border-t-purple-500 animate-spin" />
                    <Pulse size={24} className="absolute inset-0 m-auto text-purple-400 animate-pulse" />
                </div>
                <p className="text-slate-500 font-mono text-xs uppercase tracking-widest animate-pulse">
                    Loading Workforce...
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-chivo font-bold uppercase tracking-wider flex items-center gap-3">
                        <Users size={28} weight="duotone" className="text-purple-400" />
                        Workforce Management
                    </h1>
                    <p className="text-slate-500 mt-1">Manage workers and crew assignments</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowAutoAssignModal(true)}
                        className="btn-secondary flex items-center gap-2"
                    >
                        Auto Assign
                    </button>
                    <button
                        onClick={() => { resetForm(); setEditingWorker(null); setShowModal(true); }}
                        className="btn-primary flex items-center gap-2"
                    >
                        <Plus size={18} />
                        Add Worker
                    </button>
                </div>
            </div>

            {/* Workers Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {workers.map((worker) => (
                    <div
                        key={worker.id}
                        className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-4 hover:border-slate-600 transition-colors"
                    >
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-600 to-purple-800 flex items-center justify-center text-white font-bold text-lg">
                                    {worker.first_name.charAt(0)}{worker.last_name.charAt(0)}
                                </div>
                                <div>
                                    <p className="font-bold text-slate-200">{worker.first_name} {worker.last_name}</p>
                                    <p className="text-xs font-mono text-slate-500">{worker.employee_id}</p>
                                </div>
                            </div>
                            <div className="flex gap-1">
                                <button
                                    onClick={() => handleEdit(worker)}
                                    className="p-2 text-slate-400 hover:text-blue-400 transition-colors"
                                >
                                    <Pencil size={16} />
                                </button>
                                <button
                                    onClick={() => handleDelete(worker)}
                                    className="p-2 text-slate-400 hover:text-red-400 transition-colors"
                                >
                                    <Trash size={16} />
                                </button>
                            </div>
                        </div>
                        <div className="mt-4 space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-slate-500">Role</span>
                                <StatusBadge status={worker.role} size="sm" />
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-slate-500">Skill</span>
                                <StatusBadge status={worker.skill_level} size="sm" />
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-slate-500">Status</span>
                                <StatusBadge status={worker.status} size="sm" />
                            </div>
                            <div className="flex items-center justify-between pt-2 border-t border-slate-700">
                                <span className="text-xs text-slate-500">This Week</span>
                                <span className="font-mono text-sm text-slate-400">{worker.current_week_hours}h</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-slate-500">Assignments (Week)</span>
                                <span className="font-mono text-sm text-slate-400">{worker.current_week_assignments}</span>
                            </div>
                            <div className="flex items-center justify-between pt-3">
                                <button
                                    onClick={() => openAssignModal(worker)}
                                    disabled={schedules.length === 0}
                                    className={`text-xs font-mono uppercase tracking-wider px-2 py-1 rounded border border-slate-700 text-slate-400 transition-colors ${schedules.length === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:text-slate-200 hover:border-slate-500'}`}
                                >
                                    Assign
                                </button>
                                <button
                                    onClick={() => openHoursModal(worker)}
                                    disabled={worker.total_assignments === 0}
                                    className={`text-xs font-mono uppercase tracking-wider px-2 py-1 rounded border border-slate-700 text-slate-400 transition-colors ${worker.total_assignments === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:text-slate-200 hover:border-slate-500'}`}
                                >
                                    Log Hours
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {workers.length === 0 && (
                <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-8 text-center text-slate-500">
                    No workers found. Add your first worker!
                </div>
            )}

            {/* Create/Edit Modal */}
            <Modal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                title={editingWorker ? 'Edit Worker' : 'Add Worker'}
                size="lg"
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-slate-400 text-xs uppercase tracking-wider mb-2 font-mono">Employee ID</label>
                            <input
                                type="text"
                                value={formData.employee_id}
                                onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                                className="input-modern"
                                placeholder="EMP001"
                                required
                                disabled={!!editingWorker}
                            />
                        </div>
                        <div>
                            <label className="block text-slate-400 text-xs uppercase tracking-wider mb-2 font-mono">Role</label>
                            <select
                                value={formData.role}
                                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                className="input-modern"
                            >
                                <option value="DRIVER">Driver</option>
                                <option value="COLLECTOR">Collector</option>
                                <option value="SUPERVISOR">Supervisor</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-slate-400 text-xs uppercase tracking-wider mb-2 font-mono">First Name</label>
                            <input
                                type="text"
                                value={formData.first_name}
                                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                                className="input-modern"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-slate-400 text-xs uppercase tracking-wider mb-2 font-mono">Last Name</label>
                            <input
                                type="text"
                                value={formData.last_name}
                                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                                className="input-modern"
                                required
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-slate-400 text-xs uppercase tracking-wider mb-2 font-mono">Phone</label>
                            <input
                                type="text"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                className="input-modern"
                                placeholder="+91 9876543210"
                            />
                        </div>
                        <div>
                            <label className="block text-slate-400 text-xs uppercase tracking-wider mb-2 font-mono">Email</label>
                            <input
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className="input-modern"
                                placeholder="worker@example.com"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-slate-400 text-xs uppercase tracking-wider mb-2 font-mono">PIN (optional)</label>
                        <input
                            type="password"
                            value={formData.pin}
                            onChange={(e) => setFormData({ ...formData, pin: e.target.value })}
                            className="input-modern"
                            placeholder="Set or reset worker PIN"
                        />
                        <p className="text-[11px] text-slate-500 mt-2">Leave blank to keep existing PIN.</p>
                    </div>

                    <div>
                        <label className="block text-slate-400 text-xs uppercase tracking-wider mb-2 font-mono">Skill Level</label>
                        <select
                            value={formData.skill_level}
                            onChange={(e) => setFormData({ ...formData, skill_level: e.target.value })}
                            className="input-modern"
                        >
                            <option value="JUNIOR">Junior</option>
                            <option value="INTERMEDIATE">Intermediate</option>
                            <option value="SENIOR">Senior</option>
                            <option value="EXPERT">Expert</option>
                        </select>
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">
                            Cancel
                        </button>
                        <button type="submit" className="btn-primary">
                            {editingWorker ? 'Update Worker' : 'Add Worker'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Assign Worker Modal */}
            <Modal
                isOpen={showAssignModal}
                onClose={() => setShowAssignModal(false)}
                title="Assign Worker"
                size="lg"
            >
                <form onSubmit={handleAssignSubmit} className="space-y-4">
                    <div>
                        <label className="block text-slate-400 text-xs uppercase tracking-wider mb-2 font-mono">Worker</label>
                        <input
                            type="text"
                            value={selectedWorker ? `${selectedWorker.first_name} ${selectedWorker.last_name}` : ''}
                            className="input-modern"
                            readOnly
                        />
                    </div>
                    <div>
                        <label className="block text-slate-400 text-xs uppercase tracking-wider mb-2 font-mono">Schedule</label>
                        <select
                            value={assignForm.schedule_id}
                            onChange={(e) => setAssignForm({ ...assignForm, schedule_id: e.target.value })}
                            className="input-modern"
                            required
                            disabled={schedules.length === 0}
                        >
                            {schedules.map((schedule) => (
                                <option key={schedule.id} value={schedule.id}>
                                    {getScheduleLabel(schedule.id)}
                                </option>
                            ))}
                        </select>
                        {schedules.length === 0 && (
                            <p className="text-xs text-slate-500 mt-2">No schedules available. Generate schedules first.</p>
                        )}
                    </div>
                    <div>
                        <label className="block text-slate-400 text-xs uppercase tracking-wider mb-2 font-mono">Assigned Role</label>
                        <select
                            value={assignForm.assigned_role}
                            onChange={(e) => setAssignForm({ ...assignForm, assigned_role: e.target.value })}
                            className="input-modern"
                        >
                            <option value="DRIVER">Driver</option>
                            <option value="COLLECTOR">Collector</option>
                            <option value="SUPERVISOR">Supervisor</option>
                        </select>
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                        <button type="button" onClick={() => setShowAssignModal(false)} className="btn-secondary">
                            Cancel
                        </button>
                        <button type="submit" className="btn-primary" disabled={schedules.length === 0}>
                            Assign
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Log Hours Modal */}
            <Modal
                isOpen={showHoursModal}
                onClose={() => setShowHoursModal(false)}
                title="Log Hours"
                size="lg"
            >
                <form onSubmit={handleHoursSubmit} className="space-y-4">
                    <div>
                        <label className="block text-slate-400 text-xs uppercase tracking-wider mb-2 font-mono">Worker</label>
                        <input
                            type="text"
                            value={selectedWorker ? `${selectedWorker.first_name} ${selectedWorker.last_name}` : ''}
                            className="input-modern"
                            readOnly
                        />
                    </div>
                    <div>
                        <label className="block text-slate-400 text-xs uppercase tracking-wider mb-2 font-mono">Assignment</label>
                        <select
                            value={hoursForm.assignment_id}
                            onChange={(e) => {
                                const assignment = assignments.find((a) => a.id === parseInt(e.target.value, 10));
                                setHoursForm({
                                    assignment_id: e.target.value,
                                    hours_worked: assignment?.hours_worked?.toString() || '',
                                });
                            }}
                            className="input-modern"
                            required
                            disabled={loadingAssignments || assignments.length === 0}
                        >
                            {assignments.map((assignment) => (
                                <option key={assignment.id} value={assignment.id}>
                                    {getScheduleLabel(assignment.schedule_id)}
                                </option>
                            ))}
                        </select>
                        {loadingAssignments && (
                            <p className="text-xs text-slate-500 mt-2">Loading assignments...</p>
                        )}
                        {!loadingAssignments && assignments.length === 0 && (
                            <p className="text-xs text-slate-500 mt-2">No assignments found for this worker.</p>
                        )}
                    </div>
                    <div>
                        <label className="block text-slate-400 text-xs uppercase tracking-wider mb-2 font-mono">Hours Worked</label>
                        <input
                            type="number"
                            value={hoursForm.hours_worked}
                            onChange={(e) => setHoursForm({ ...hoursForm, hours_worked: e.target.value })}
                            className="input-modern"
                            min="0"
                            step="0.25"
                            placeholder="e.g., 7.5"
                            required
                        />
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                        <button type="button" onClick={() => setShowHoursModal(false)} className="btn-secondary">
                            Cancel
                        </button>
                        <button type="submit" className="btn-primary" disabled={assignments.length === 0 || loadingAssignments}>
                            Save Hours
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Auto-Assign Modal */}
            <Modal
                isOpen={showAutoAssignModal}
                onClose={() => setShowAutoAssignModal(false)}
                title="Auto-Assign Workforce"
                size="lg"
            >
                <form onSubmit={handleAutoAssignSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-slate-400 text-xs uppercase tracking-wider mb-2 font-mono">Start Date</label>
                            <input
                                type="date"
                                value={autoAssignForm.start_date}
                                onChange={(e) => setAutoAssignForm({ ...autoAssignForm, start_date: e.target.value })}
                                className="input-modern"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-slate-400 text-xs uppercase tracking-wider mb-2 font-mono">End Date</label>
                            <input
                                type="date"
                                value={autoAssignForm.end_date}
                                onChange={(e) => setAutoAssignForm({ ...autoAssignForm, end_date: e.target.value })}
                                className="input-modern"
                                required
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="block text-slate-400 text-xs uppercase tracking-wider mb-2 font-mono">Drivers / Schedule</label>
                            <input
                                type="number"
                                min="0"
                                value={autoAssignForm.drivers_per_schedule}
                                onChange={(e) => setAutoAssignForm({ ...autoAssignForm, drivers_per_schedule: parseInt(e.target.value) || 0 })}
                                className="input-modern"
                            />
                        </div>
                        <div>
                            <label className="block text-slate-400 text-xs uppercase tracking-wider mb-2 font-mono">Collectors / Schedule</label>
                            <input
                                type="number"
                                min="0"
                                value={autoAssignForm.collectors_per_schedule}
                                onChange={(e) => setAutoAssignForm({ ...autoAssignForm, collectors_per_schedule: parseInt(e.target.value) || 0 })}
                                className="input-modern"
                            />
                        </div>
                        <div>
                            <label className="block text-slate-400 text-xs uppercase tracking-wider mb-2 font-mono">Supervisors / Schedule</label>
                            <input
                                type="number"
                                min="0"
                                value={autoAssignForm.supervisors_per_schedule}
                                onChange={(e) => setAutoAssignForm({ ...autoAssignForm, supervisors_per_schedule: parseInt(e.target.value) || 0 })}
                                className="input-modern"
                            />
                        </div>
                    </div>
                    <p className="text-xs text-slate-500">Auto-assign uses AVAILABLE workers and balances assignments.</p>
                    <div className="flex justify-end gap-3 pt-2">
                        <button type="button" onClick={() => setShowAutoAssignModal(false)} className="btn-secondary">
                            Cancel
                        </button>
                        <button type="submit" className="btn-primary">
                            Run Auto-Assign
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
