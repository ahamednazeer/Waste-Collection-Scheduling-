'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Brain, Sparkle, Pulse, ChartLineUp } from '@phosphor-icons/react';

interface Prediction {
    zone_id: number;
    zone_name: string;
    date: string;
    predicted_waste_kg: number;
    waste_type?: string;
}

interface ZonePrediction {
    zone_id: number;
    zone_name: string;
    predictions: {
        date: string;
        predicted_waste_kg: number;
        confidence: number;
    }[];
}

export default function PredictionsPage() {
    const [zones, setZones] = useState<any[]>([]);
    const [selectedZone, setSelectedZone] = useState<number | null>(null);
    const [zonePredictions, setZonePredictions] = useState<ZonePrediction | null>(null);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);

    useEffect(() => {
        fetchZones();
    }, []);

    useEffect(() => {
        if (selectedZone) {
            fetchZonePredictions(selectedZone);
        }
    }, [selectedZone]);

    async function fetchZones() {
        try {
            const data = await api.getZones();
            setZones(data);
            if (data.length > 0) {
                setSelectedZone(data[0].id);
            }
        } catch (error) {
            console.error('Failed to fetch zones:', error);
        } finally {
            setLoading(false);
        }
    }

    async function fetchZonePredictions(zoneId: number) {
        try {
            const data = await api.getZonePredictions(zoneId, 14);
            setZonePredictions(data);
        } catch (error) {
            console.error('Failed to fetch predictions:', error);
        }
    }

    async function handleGeneratePredictions() {
        setGenerating(true);
        try {
            const today = new Date().toISOString().split('T')[0];
            const endDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            await api.generatePredictions(today, endDate);
            if (selectedZone) {
                fetchZonePredictions(selectedZone);
            }
            alert('Predictions generated successfully!');
        } catch (error: any) {
            alert(error.message);
        } finally {
            setGenerating(false);
        }
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
                <div className="relative">
                    <div className="w-12 h-12 rounded-full border-2 border-slate-700 border-t-purple-500 animate-spin" />
                    <Pulse size={24} className="absolute inset-0 m-auto text-purple-400 animate-pulse" />
                </div>
                <p className="text-slate-500 font-mono text-xs uppercase tracking-widest animate-pulse">
                    Loading Predictions...
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-chivo font-bold uppercase tracking-wider flex items-center gap-3">
                        <Brain size={28} weight="duotone" className="text-purple-400" />
                        Waste Predictions
                    </h1>
                    <p className="text-slate-500 mt-1">AI-powered waste generation forecasting</p>
                </div>
                <button
                    onClick={handleGeneratePredictions}
                    disabled={generating}
                    className="btn-primary flex items-center gap-2"
                >
                    <Sparkle size={18} />
                    {generating ? 'Generating...' : 'Generate Predictions'}
                </button>
            </div>

            {/* Zone Selection */}
            <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-4">
                <label className="block text-slate-400 text-xs uppercase tracking-wider mb-2 font-mono">Select Zone</label>
                <select
                    value={selectedZone || ''}
                    onChange={(e) => setSelectedZone(parseInt(e.target.value))}
                    className="input-modern max-w-md"
                >
                    {zones.map((zone) => (
                        <option key={zone.id} value={zone.id}>
                            {zone.code} - {zone.name}
                        </option>
                    ))}
                </select>
            </div>

            {/* Predictions Display */}
            {zonePredictions && (
                <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-6">
                    <h3 className="text-sm font-mono text-slate-400 uppercase tracking-widest mb-5 flex items-center gap-2">
                        <ChartLineUp size={16} weight="duotone" />
                        14-Day Forecast: {zonePredictions.zone_name}
                    </h3>

                    <div className="grid grid-cols-7 gap-2">
                        {zonePredictions.predictions.slice(0, 14).map((pred, idx) => {
                            const date = new Date(pred.date);
                            const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
                            const dayNum = date.getDate();
                            const isWeekend = date.getDay() === 0 || date.getDay() === 6;

                            return (
                                <div
                                    key={idx}
                                    className={`p-3 rounded-lg border text-center transition-all hover:scale-105 ${isWeekend
                                            ? 'bg-slate-900/50 border-slate-700'
                                            : 'bg-gradient-to-br from-purple-900/30 to-purple-950/50 border-purple-800/30'
                                        }`}
                                >
                                    <p className="text-xs font-mono text-slate-500">{dayName}</p>
                                    <p className="text-lg font-bold text-slate-200">{dayNum}</p>
                                    <p className="text-sm font-mono text-purple-400 mt-2">
                                        {pred.predicted_waste_kg.toFixed(0)}
                                    </p>
                                    <p className="text-xs text-slate-600">kg</p>
                                    <div className="mt-2">
                                        <div className="w-full h-1 bg-slate-700 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-purple-500 to-purple-400 rounded-full"
                                                style={{ width: `${pred.confidence * 100}%` }}
                                            />
                                        </div>
                                        <p className="text-xs text-slate-600 mt-1">{(pred.confidence * 100).toFixed(0)}%</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Summary Stats */}
                    <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-slate-700">
                        <div className="text-center">
                            <p className="text-2xl font-bold font-mono text-purple-400">
                                {zonePredictions.predictions.reduce((sum, p) => sum + p.predicted_waste_kg, 0).toFixed(0)}
                            </p>
                            <p className="text-xs text-slate-500 mt-1">Total Predicted (kg)</p>
                        </div>
                        <div className="text-center">
                            <p className="text-2xl font-bold font-mono text-blue-400">
                                {(zonePredictions.predictions.reduce((sum, p) => sum + p.predicted_waste_kg, 0) / zonePredictions.predictions.length).toFixed(0)}
                            </p>
                            <p className="text-xs text-slate-500 mt-1">Daily Average (kg)</p>
                        </div>
                        <div className="text-center">
                            <p className="text-2xl font-bold font-mono text-green-400">
                                {(zonePredictions.predictions.reduce((sum, p) => sum + p.confidence, 0) / zonePredictions.predictions.length * 100).toFixed(0)}%
                            </p>
                            <p className="text-xs text-slate-500 mt-1">Avg Confidence</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
