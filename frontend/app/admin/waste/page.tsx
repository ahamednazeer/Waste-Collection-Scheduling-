'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Modal } from '@/components/Modal';
import { StatusBadge } from '@/components/StatusBadge';
import { Recycle, Plus, Pulse } from '@phosphor-icons/react';

interface Zone {
    id: number;
    name: string;
    code: string;
}

interface WasteRecord {
    id: number;
    zone_id: number;
    date: string;
    waste_quantity_kg: number;
    waste_type: string;
    fill_level_percent: number | null;
    is_actual: boolean;
}

interface WasteSummary {
    total_records: number;
    total_waste_kg: number;
    avg_waste_kg: number;
    max_waste_kg: number;
    min_waste_kg: number;
}

const WASTE_TYPES = ['MIXED', 'ORGANIC', 'RECYCLABLE', 'HAZARDOUS'] as const;

export default function WastePage() {
    const [records, setRecords] = useState<WasteRecord[]>([]);
    const [zones, setZones] = useState<Zone[]>([]);
    const [summary, setSummary] = useState<WasteSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [filters, setFilters] = useState({
        zoneId: 'all',
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
    });
    const [formData, setFormData] = useState({
        zone_id: '',
        date: new Date().toISOString().split('T')[0],
        waste_quantity_kg: '',
        waste_type: 'MIXED',
        fill_level_percent: '',
    });

    useEffect(() => {
        fetchZones();
    }, []);

    useEffect(() => {
        fetchRecords();
        fetchSummary();
    }, [filters.zoneId, filters.startDate, filters.endDate]);

    useEffect(() => {
        if (!formData.zone_id && zones.length > 0) {
            setFormData((prev) => ({ ...prev, zone_id: zones[0].id.toString() }));
        }
    }, [zones, formData.zone_id]);

    async function fetchZones() {
        try {
            const data = await api.getZones();
            setZones(data);
        } catch (error) {
            console.error('Failed to fetch zones:', error);
        }
    }

    async function fetchRecords() {
        setLoading(true);
        try {
            const params: { zone_id?: number; start_date?: string; end_date?: string; limit?: number } = {
                limit: 200,
            };
            if (filters.zoneId !== 'all') {
                params.zone_id = parseInt(filters.zoneId, 10);
            }
            if (filters.startDate) {
                params.start_date = filters.startDate;
            }
            if (filters.endDate) {
                params.end_date = filters.endDate;
            }
            const data = await api.getWasteRecords(params);
            setRecords(data);
        } catch (error) {
            console.error('Failed to fetch waste records:', error);
        } finally {
            setLoading(false);
        }
    }

    async function fetchSummary() {
        try {
            const zoneId = filters.zoneId !== 'all' ? parseInt(filters.zoneId, 10) : undefined;
            const data = await api.getWasteSummary(zoneId);
            setSummary(data);
        } catch (error) {
            console.error('Failed to fetch waste summary:', error);
        }
    }

    const getZoneLabel = (zoneId: number) => {
        const zone = zones.find((z) => z.id === zoneId);
        return zone ? `${zone.code} - ${zone.name}` : `Zone ${zoneId}`;
    };

    const resetForm = () => {
        setFormData({
            zone_id: zones[0]?.id?.toString() || '',
            date: new Date().toISOString().split('T')[0],
            waste_quantity_kg: '',
            waste_type: 'MIXED',
            fill_level_percent: '',
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload = {
                zone_id: parseInt(formData.zone_id, 10),
                date: formData.date,
                waste_quantity_kg: parseFloat(formData.waste_quantity_kg),
                waste_type: formData.waste_type,
                fill_level_percent: formData.fill_level_percent ? parseFloat(formData.fill_level_percent) : null,
                is_actual: true,
            };
            await api.createWasteRecord(payload);
            setShowModal(false);
            resetForm();
            fetchRecords();
            fetchSummary();
        } catch (error: any) {
            alert(error.message);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
                <div className="relative">
                    <div className="w-12 h-12 rounded-full border-2 border-slate-700 border-t-blue-500 animate-spin" />
                    <Pulse size={24} className="absolute inset-0 m-auto text-blue-400 animate-pulse" />
                </div>
                <p className="text-slate-500 font-mono text-xs uppercase tracking-widest animate-pulse">
                    Loading Waste Records...
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-chivo font-bold uppercase tracking-wider flex items-center gap-3">
                        <Recycle size={28} weight="duotone" className="text-blue-400" />
                        Waste Records
                    </h1>
                    <p className="text-slate-500 mt-1">Track and manage waste collection data</p>
                </div>
                <button
                    onClick={() => { resetForm(); setShowModal(true); }}
                    className="btn-primary flex items-center gap-2"
                >
                    <Plus size={18} />
                    Add Record
                </button>
            </div>

            {/* Filters */}
            <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-slate-400 text-xs uppercase tracking-wider mb-2 font-mono">Zone</label>
                        <select
                            value={filters.zoneId}
                            onChange={(e) => setFilters({ ...filters, zoneId: e.target.value })}
                            className="input-modern"
                        >
                            <option value="all">All Zones</option>
                            {zones.map((zone) => (
                                <option key={zone.id} value={zone.id}>
                                    {zone.code} - {zone.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-slate-400 text-xs uppercase tracking-wider mb-2 font-mono">Start Date</label>
                        <input
                            type="date"
                            value={filters.startDate}
                            onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                            className="input-modern"
                        />
                    </div>
                    <div>
                        <label className="block text-slate-400 text-xs uppercase tracking-wider mb-2 font-mono">End Date</label>
                        <input
                            type="date"
                            value={filters.endDate}
                            onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                            className="input-modern"
                        />
                    </div>
                </div>
            </div>

            {/* Summary Stats */}
            {summary && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-5 text-center">
                        <p className="text-3xl font-bold font-mono text-blue-400">{summary.total_records.toLocaleString()}</p>
                        <p className="text-sm text-slate-500 mt-1">Total Records (Actual)</p>
                    </div>
                    <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-5 text-center">
                        <p className="text-3xl font-bold font-mono text-green-400">{summary.total_waste_kg.toFixed(0)}</p>
                        <p className="text-sm text-slate-500 mt-1">Total Waste (kg)</p>
                    </div>
                    <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-5 text-center">
                        <p className="text-3xl font-bold font-mono text-yellow-400">{summary.avg_waste_kg.toFixed(0)}</p>
                        <p className="text-sm text-slate-500 mt-1">Average Waste (kg)</p>
                    </div>
                    <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-5 text-center">
                        <p className="text-3xl font-bold font-mono text-purple-400">{summary.max_waste_kg.toFixed(0)}</p>
                        <p className="text-sm text-slate-500 mt-1">Max Waste (kg)</p>
                    </div>
                </div>
            )}

            {/* Records Table */}
            <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl overflow-hidden">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-slate-700">
                            <th className="px-4 py-3 text-left text-xs font-mono text-slate-500 uppercase tracking-wider">Date</th>
                            <th className="px-4 py-3 text-left text-xs font-mono text-slate-500 uppercase tracking-wider">Zone</th>
                            <th className="px-4 py-3 text-left text-xs font-mono text-slate-500 uppercase tracking-wider">Waste Type</th>
                            <th className="px-4 py-3 text-left text-xs font-mono text-slate-500 uppercase tracking-wider">Quantity</th>
                            <th className="px-4 py-3 text-left text-xs font-mono text-slate-500 uppercase tracking-wider">Fill Level</th>
                            <th className="px-4 py-3 text-left text-xs font-mono text-slate-500 uppercase tracking-wider">Source</th>
                        </tr>
                    </thead>
                    <tbody>
                        {records.map((record) => {
                            const date = new Date(record.date);
                            return (
                                <tr key={record.id} className="border-b border-slate-800 hover:bg-slate-800/50 transition-colors">
                                    <td className="px-4 py-3 font-mono text-sm text-slate-300">
                                        {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-slate-200">{getZoneLabel(record.zone_id)}</td>
                                    <td className="px-4 py-3">
                                        <StatusBadge status={record.waste_type} size="sm" />
                                    </td>
                                    <td className="px-4 py-3 font-mono text-sm text-slate-400">
                                        {record.waste_quantity_kg.toFixed(0)} kg
                                    </td>
                                    <td className="px-4 py-3 font-mono text-sm text-slate-400">
                                        {record.fill_level_percent !== null && record.fill_level_percent !== undefined
                                            ? `${record.fill_level_percent.toFixed(0)}%`
                                            : '-'}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`inline-flex items-center font-mono uppercase tracking-wider rounded border text-xs px-2 py-0.5 ${record.is_actual
                                                ? 'text-green-400 bg-green-950/40 border-green-800/40'
                                                : 'text-yellow-400 bg-yellow-950/40 border-yellow-800/40'
                                            }`}>
                                            {record.is_actual ? 'Actual' : 'Predicted'}
                                        </span>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                {records.length === 0 && (
                    <div className="p-8 text-center text-slate-500">No waste records found for the selected filters.</div>
                )}
            </div>

            {/* Create Record Modal */}
            <Modal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                title="Add Waste Record"
                size="lg"
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-slate-400 text-xs uppercase tracking-wider mb-2 font-mono">Zone</label>
                            <select
                                value={formData.zone_id}
                                onChange={(e) => setFormData({ ...formData, zone_id: e.target.value })}
                                className="input-modern"
                                required
                            >
                                {zones.map((zone) => (
                                    <option key={zone.id} value={zone.id}>
                                        {zone.code} - {zone.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-slate-400 text-xs uppercase tracking-wider mb-2 font-mono">Date</label>
                            <input
                                type="date"
                                value={formData.date}
                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                className="input-modern"
                                required
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-slate-400 text-xs uppercase tracking-wider mb-2 font-mono">Waste Quantity (kg)</label>
                            <input
                                type="number"
                                value={formData.waste_quantity_kg}
                                onChange={(e) => setFormData({ ...formData, waste_quantity_kg: e.target.value })}
                                className="input-modern"
                                min="0"
                                step="0.1"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-slate-400 text-xs uppercase tracking-wider mb-2 font-mono">Waste Type</label>
                            <select
                                value={formData.waste_type}
                                onChange={(e) => setFormData({ ...formData, waste_type: e.target.value })}
                                className="input-modern"
                            >
                                {WASTE_TYPES.map((type) => (
                                    <option key={type} value={type}>
                                        {type}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-slate-400 text-xs uppercase tracking-wider mb-2 font-mono">Fill Level (%)</label>
                        <input
                            type="number"
                            value={formData.fill_level_percent}
                            onChange={(e) => setFormData({ ...formData, fill_level_percent: e.target.value })}
                            className="input-modern"
                            min="0"
                            max="100"
                            step="0.1"
                            placeholder="Optional"
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">
                            Cancel
                        </button>
                        <button type="submit" className="btn-primary">
                            Add Record
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
