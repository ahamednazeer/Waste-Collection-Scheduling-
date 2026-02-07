'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { StatusBadge } from '@/components/StatusBadge';
import { Modal } from '@/components/Modal';
import { Truck, Plus, Pencil, Trash, Pulse } from '@phosphor-icons/react';

interface Vehicle {
    id: number;
    registration_number: string;
    vehicle_type: string;
    capacity_kg: number;
    current_load_kg: number;
    fuel_efficiency_km_per_liter: number;
    status: string;
    is_active: boolean;
    total_km_driven: number;
}

export default function VehiclesPage() {
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
    const [formData, setFormData] = useState({
        registration_number: '',
        vehicle_type: 'MEDIUM_TRUCK',
        capacity_kg: 5000,
        fuel_efficiency_km_per_liter: 8,
        current_load_kg: 0,
        total_km_driven: 0,
    });

    useEffect(() => {
        fetchVehicles();
    }, []);

    async function fetchVehicles() {
        try {
            const data = await api.getVehicles();
            setVehicles(data);
        } catch (error) {
            console.error('Failed to fetch vehicles:', error);
        } finally {
            setLoading(false);
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingVehicle) {
                await api.updateVehicle(editingVehicle.id, formData);
            } else {
                await api.createVehicle(formData);
            }
            setShowModal(false);
            setEditingVehicle(null);
            resetForm();
            fetchVehicles();
        } catch (error: any) {
            alert(error.message);
        }
    };

    const handleEdit = (vehicle: Vehicle) => {
        setEditingVehicle(vehicle);
        setFormData({
            registration_number: vehicle.registration_number,
            vehicle_type: vehicle.vehicle_type,
            capacity_kg: vehicle.capacity_kg,
            fuel_efficiency_km_per_liter: vehicle.fuel_efficiency_km_per_liter,
            current_load_kg: vehicle.current_load_kg,
            total_km_driven: vehicle.total_km_driven,
        });
        setShowModal(true);
    };

    const handleDelete = async (vehicle: Vehicle) => {
        if (confirm(`Remove vehicle "${vehicle.registration_number}"?`)) {
            try {
                await api.deleteVehicle(vehicle.id);
                fetchVehicles();
            } catch (error: any) {
                alert(error.message);
            }
        }
    };

    const resetForm = () => {
        setFormData({
            registration_number: '',
            vehicle_type: 'MEDIUM_TRUCK',
            capacity_kg: 5000,
            fuel_efficiency_km_per_liter: 8,
            current_load_kg: 0,
            total_km_driven: 0,
        });
    };

    const vehicleTypeLabels: Record<string, string> = {
        SMALL_TRUCK: 'Small Truck (3T)',
        MEDIUM_TRUCK: 'Medium Truck (5T)',
        LARGE_TRUCK: 'Large Truck (8T)',
        COMPACTOR: 'Compactor (10T)',
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
                <div className="relative">
                    <div className="w-12 h-12 rounded-full border-2 border-slate-700 border-t-green-500 animate-spin" />
                    <Pulse size={24} className="absolute inset-0 m-auto text-green-400 animate-pulse" />
                </div>
                <p className="text-slate-500 font-mono text-xs uppercase tracking-widest animate-pulse">
                    Loading Vehicles...
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-chivo font-bold uppercase tracking-wider flex items-center gap-3">
                        <Truck size={28} weight="duotone" className="text-green-400" />
                        Fleet Management
                    </h1>
                    <p className="text-slate-500 mt-1">Manage collection vehicles and fleet</p>
                </div>
                <button
                    onClick={() => { resetForm(); setEditingVehicle(null); setShowModal(true); }}
                    className="btn-primary flex items-center gap-2"
                >
                    <Plus size={18} />
                    Add Vehicle
                </button>
            </div>

            {/* Vehicles Table */}
            <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl overflow-hidden">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-slate-700">
                            <th className="px-4 py-3 text-left text-xs font-mono text-slate-500 uppercase tracking-wider">Registration</th>
                            <th className="px-4 py-3 text-left text-xs font-mono text-slate-500 uppercase tracking-wider">Type</th>
                            <th className="px-4 py-3 text-left text-xs font-mono text-slate-500 uppercase tracking-wider">Capacity</th>
                            <th className="px-4 py-3 text-left text-xs font-mono text-slate-500 uppercase tracking-wider">Current Load</th>
                            <th className="px-4 py-3 text-left text-xs font-mono text-slate-500 uppercase tracking-wider">Status</th>
                            <th className="px-4 py-3 text-left text-xs font-mono text-slate-500 uppercase tracking-wider">Total KM</th>
                            <th className="px-4 py-3 text-right text-xs font-mono text-slate-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {vehicles.map((vehicle) => (
                            <tr key={vehicle.id} className="border-b border-slate-800 hover:bg-slate-800/50 transition-colors">
                                <td className="px-4 py-3 font-mono text-sm text-green-400">{vehicle.registration_number}</td>
                                <td className="px-4 py-3 text-sm text-slate-300">{vehicleTypeLabels[vehicle.vehicle_type] || vehicle.vehicle_type}</td>
                                <td className="px-4 py-3 font-mono text-sm text-slate-400">{vehicle.capacity_kg.toLocaleString()} kg</td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                        <div className="w-16 h-2 bg-slate-700 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-green-600 to-green-400 rounded-full"
                                                style={{ width: `${(vehicle.current_load_kg / vehicle.capacity_kg) * 100}%` }}
                                            />
                                        </div>
                                        <span className="text-xs font-mono text-slate-500">
                                            {((vehicle.current_load_kg / vehicle.capacity_kg) * 100).toFixed(0)}%
                                        </span>
                                    </div>
                                </td>
                                <td className="px-4 py-3"><StatusBadge status={vehicle.status} size="sm" /></td>
                                <td className="px-4 py-3 font-mono text-sm text-slate-400">{vehicle.total_km_driven.toLocaleString()}</td>
                                <td className="px-4 py-3 text-right">
                                    <button
                                        onClick={() => handleEdit(vehicle)}
                                        className="p-2 text-slate-400 hover:text-blue-400 transition-colors"
                                    >
                                        <Pencil size={18} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(vehicle)}
                                        className="p-2 text-slate-400 hover:text-red-400 transition-colors"
                                    >
                                        <Trash size={18} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {vehicles.length === 0 && (
                    <div className="p-8 text-center text-slate-500">No vehicles found. Add your first vehicle!</div>
                )}
            </div>

            {/* Modal */}
            <Modal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                title={editingVehicle ? 'Edit Vehicle' : 'Add Vehicle'}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-slate-400 text-xs uppercase tracking-wider mb-2 font-mono">Registration Number</label>
                        <input
                            type="text"
                            value={formData.registration_number}
                            onChange={(e) => setFormData({ ...formData, registration_number: e.target.value })}
                            className="input-modern"
                            placeholder="KA-01-WM-1001"
                            required
                            disabled={!!editingVehicle}
                        />
                    </div>

                    <div>
                        <label className="block text-slate-400 text-xs uppercase tracking-wider mb-2 font-mono">Vehicle Type</label>
                        <select
                            value={formData.vehicle_type}
                            onChange={(e) => setFormData({ ...formData, vehicle_type: e.target.value })}
                            className="input-modern"
                        >
                            <option value="SMALL_TRUCK">Small Truck (Up to 3T)</option>
                            <option value="MEDIUM_TRUCK">Medium Truck (3-5T)</option>
                            <option value="LARGE_TRUCK">Large Truck (5-8T)</option>
                            <option value="COMPACTOR">Compactor (8-10T)</option>
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-slate-400 text-xs uppercase tracking-wider mb-2 font-mono">Capacity (kg)</label>
                            <input
                                type="number"
                                value={formData.capacity_kg}
                                onChange={(e) => setFormData({ ...formData, capacity_kg: parseInt(e.target.value) || 0 })}
                                className="input-modern"
                                min="1000"
                            />
                        </div>
                        <div>
                            <label className="block text-slate-400 text-xs uppercase tracking-wider mb-2 font-mono">Fuel Efficiency (km/L)</label>
                            <input
                                type="number"
                                value={formData.fuel_efficiency_km_per_liter}
                                onChange={(e) => setFormData({ ...formData, fuel_efficiency_km_per_liter: parseFloat(e.target.value) || 0 })}
                                className="input-modern"
                                step="0.1"
                                min="1"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-slate-400 text-xs uppercase tracking-wider mb-2 font-mono">Current Load (kg)</label>
                            <input
                                type="number"
                                value={formData.current_load_kg}
                                onChange={(e) => setFormData({ ...formData, current_load_kg: parseFloat(e.target.value) || 0 })}
                                className="input-modern"
                                min="0"
                                step="0.1"
                            />
                        </div>
                        <div>
                            <label className="block text-slate-400 text-xs uppercase tracking-wider mb-2 font-mono">Total KM Driven</label>
                            <input
                                type="number"
                                value={formData.total_km_driven}
                                onChange={(e) => setFormData({ ...formData, total_km_driven: parseFloat(e.target.value) || 0 })}
                                className="input-modern"
                                min="0"
                                step="0.1"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">
                            Cancel
                        </button>
                        <button type="submit" className="btn-primary">
                            {editingVehicle ? 'Update Vehicle' : 'Add Vehicle'}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
