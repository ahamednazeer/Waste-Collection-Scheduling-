'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { api } from '@/lib/api';
import { StatusBadge } from '@/components/StatusBadge';
import { Modal } from '@/components/Modal';
import { MapPin, Plus, Pencil, Trash, Pulse } from '@phosphor-icons/react';

interface Zone {
    id: number;
    name: string;
    code: string;
    area_type: string;
    priority_level: string;
    population: number;
    population_density: number;
    latitude: number | null;
    longitude: number | null;
    default_collection_frequency: number;
    is_active: number;
}

export default function ZonesPage() {
    const [zones, setZones] = useState<Zone[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingZone, setEditingZone] = useState<Zone | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        code: '',
        area_type: 'RESIDENTIAL',
        priority_level: 'MEDIUM',
        population: 0,
        population_density: 0,
        latitude: '',
        longitude: '',
        default_collection_frequency: 2,
    });

    useEffect(() => {
        fetchZones();
    }, []);

    async function fetchZones() {
        try {
            const data = await api.getZones();
            setZones(data);
        } catch (error) {
            console.error('Failed to fetch zones:', error);
        } finally {
            setLoading(false);
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const submitData = {
                ...formData,
                latitude: formData.latitude ? parseFloat(formData.latitude) : null,
                longitude: formData.longitude ? parseFloat(formData.longitude) : null,
            };

            if (editingZone) {
                await api.updateZone(editingZone.id, submitData);
            } else {
                await api.createZone(submitData);
            }
            setShowModal(false);
            setEditingZone(null);
            resetForm();
            fetchZones();
        } catch (error: any) {
            alert(error.message);
        }
    };

    const handleEdit = (zone: Zone) => {
        setEditingZone(zone);
        setFormData({
            name: zone.name,
            code: zone.code,
            area_type: zone.area_type,
            priority_level: zone.priority_level,
            population: zone.population,
            population_density: zone.population_density,
            latitude: zone.latitude?.toString() || '',
            longitude: zone.longitude?.toString() || '',
            default_collection_frequency: zone.default_collection_frequency,
        });
        setShowModal(true);
    };

    const handleDelete = async (zone: Zone) => {
        if (confirm(`Delete zone "${zone.name}"?`)) {
            try {
                await api.deleteZone(zone.id);
                fetchZones();
            } catch (error: any) {
                alert(error.message);
            }
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            code: '',
            area_type: 'RESIDENTIAL',
            priority_level: 'MEDIUM',
            population: 0,
            population_density: 0,
            latitude: '',
            longitude: '',
            default_collection_frequency: 2,
        });
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
                <div className="relative">
                    <div className="w-12 h-12 rounded-full border-2 border-slate-700 border-t-green-500 animate-spin" />
                    <Pulse size={24} className="absolute inset-0 m-auto text-green-400 animate-pulse" />
                </div>
                <p className="text-slate-500 font-mono text-xs uppercase tracking-widest animate-pulse">
                    Loading Zones...
                </p>
            </div>
        );
    }

    // Dynamic import for Map component to avoid SSR issues
    const ZoneMapPicker = dynamic(() => import('@/components/ZoneMapPicker'), {
        ssr: false,
        loading: () => <div className="h-[300px] w-full bg-slate-900 animate-pulse rounded-lg border border-slate-700"></div>
    });

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-chivo font-bold uppercase tracking-wider flex items-center gap-3">
                        <MapPin size={28} weight="duotone" className="text-blue-400" />
                        Collection Zones
                    </h1>
                    <p className="text-slate-500 mt-1">Manage waste collection zones and areas</p>
                </div>
                <button
                    onClick={() => { resetForm(); setEditingZone(null); setShowModal(true); }}
                    className="btn-primary flex items-center gap-2"
                >
                    <Plus size={18} />
                    Add Zone
                </button>
            </div>

            {/* Zones Table */}
            <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl overflow-hidden">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-slate-700">
                            <th className="px-4 py-3 text-left text-xs font-mono text-slate-500 uppercase tracking-wider">Code</th>
                            <th className="px-4 py-3 text-left text-xs font-mono text-slate-500 uppercase tracking-wider">Name</th>
                            <th className="px-4 py-3 text-left text-xs font-mono text-slate-500 uppercase tracking-wider">Area Type</th>
                            <th className="px-4 py-3 text-left text-xs font-mono text-slate-500 uppercase tracking-wider">Priority</th>
                            <th className="px-4 py-3 text-left text-xs font-mono text-slate-500 uppercase tracking-wider">Population</th>
                            <th className="px-4 py-3 text-left text-xs font-mono text-slate-500 uppercase tracking-wider">Frequency</th>
                            <th className="px-4 py-3 text-right text-xs font-mono text-slate-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {zones.map((zone) => (
                            <tr key={zone.id} className="border-b border-slate-800 hover:bg-slate-800/50 transition-colors">
                                <td className="px-4 py-3 font-mono text-sm text-blue-400">{zone.code}</td>
                                <td className="px-4 py-3 text-sm text-slate-200">{zone.name}</td>
                                <td className="px-4 py-3"><StatusBadge status={zone.area_type} size="sm" /></td>
                                <td className="px-4 py-3"><StatusBadge status={zone.priority_level} size="sm" /></td>
                                <td className="px-4 py-3 font-mono text-sm text-slate-400">{zone.population.toLocaleString()}</td>
                                <td className="px-4 py-3 font-mono text-sm text-slate-400">{zone.default_collection_frequency}x/week</td>
                                <td className="px-4 py-3 text-right">
                                    <button
                                        onClick={() => handleEdit(zone)}
                                        className="p-2 text-slate-400 hover:text-blue-400 transition-colors"
                                    >
                                        <Pencil size={18} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(zone)}
                                        className="p-2 text-slate-400 hover:text-red-400 transition-colors"
                                    >
                                        <Trash size={18} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {zones.length === 0 && (
                    <div className="p-8 text-center text-slate-500">No zones found. Create your first zone!</div>
                )}
            </div>

            {/* Create/Edit Modal */}
            <Modal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                title={editingZone ? 'Edit Zone' : 'Create Zone'}
                size="lg"
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-slate-400 text-xs uppercase tracking-wider mb-2 font-mono">Zone Code</label>
                            <input
                                type="text"
                                value={formData.code}
                                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                className="input-modern"
                                placeholder="Z001"
                                required
                                disabled={!!editingZone}
                            />
                        </div>
                        <div>
                            <label className="block text-slate-400 text-xs uppercase tracking-wider mb-2 font-mono">Zone Name</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="input-modern"
                                placeholder="Downtown Commercial"
                                required
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-slate-400 text-xs uppercase tracking-wider mb-2 font-mono">Area Type</label>
                            <select
                                value={formData.area_type}
                                onChange={(e) => setFormData({ ...formData, area_type: e.target.value })}
                                className="input-modern"
                            >
                                <option value="RESIDENTIAL">Residential</option>
                                <option value="COMMERCIAL">Commercial</option>
                                <option value="INDUSTRIAL">Industrial</option>
                                <option value="MIXED">Mixed</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-slate-400 text-xs uppercase tracking-wider mb-2 font-mono">Priority Level</label>
                            <select
                                value={formData.priority_level}
                                onChange={(e) => setFormData({ ...formData, priority_level: e.target.value })}
                                className="input-modern"
                            >
                                <option value="LOW">Low</option>
                                <option value="MEDIUM">Medium</option>
                                <option value="HIGH">High</option>
                                <option value="CRITICAL">Critical</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-slate-400 text-xs uppercase tracking-wider mb-2 font-mono">Population</label>
                            <input
                                type="number"
                                value={formData.population}
                                onChange={(e) => setFormData({ ...formData, population: parseInt(e.target.value) || 0 })}
                                className="input-modern"
                                min="0"
                            />
                        </div>
                        <div>
                            <label className="block text-slate-400 text-xs uppercase tracking-wider mb-2 font-mono">Collection Frequency (per week)</label>
                            <input
                                type="number"
                                value={formData.default_collection_frequency}
                                onChange={(e) => setFormData({ ...formData, default_collection_frequency: parseInt(e.target.value) || 1 })}
                                className="input-modern"
                                min="1"
                                max="7"
                            />
                        </div>
                    </div>

                    {/* Map Selection */}
                    <div className="space-y-2">
                        <label className="block text-slate-400 text-xs uppercase tracking-wider font-mono flex items-center justify-between">
                            <span>Location (Click map to set)</span>
                            <span className="text-[10px] text-slate-500">
                                {formData.latitude && formData.longitude
                                    ? `${formData.latitude.toString().slice(0, 7)}, ${formData.longitude.toString().slice(0, 7)}`
                                    : 'No location selected'}
                            </span>
                        </label>
                        <ZoneMapPicker
                            latitude={formData.latitude ? parseFloat(formData.latitude) : null}
                            longitude={formData.longitude ? parseFloat(formData.longitude) : null}
                            onLocationSelect={(lat: number, lng: number) => {
                                setFormData({
                                    ...formData,
                                    latitude: lat.toString(),
                                    longitude: lng.toString()
                                });
                            }}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-slate-400 text-xs uppercase tracking-wider mb-2 font-mono">Latitude</label>
                            <input
                                type="text"
                                value={formData.latitude}
                                onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                                className="input-modern"
                                placeholder="12.9716"
                                readOnly
                            />
                        </div>
                        <div>
                            <label className="block text-slate-400 text-xs uppercase tracking-wider mb-2 font-mono">Longitude</label>
                            <input
                                type="text"
                                value={formData.longitude}
                                onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                                className="input-modern"
                                placeholder="77.5946"
                                readOnly
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">
                            Cancel
                        </button>
                        <button type="submit" className="btn-primary">
                            {editingZone ? 'Update Zone' : 'Create Zone'}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
