'use client';

import React from 'react';
import { GearSix } from '@phosphor-icons/react';

export default function SettingsPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-chivo font-bold uppercase tracking-wider flex items-center gap-3">
                    <GearSix size={28} weight="duotone" className="text-blue-400" />
                    Settings
                </h1>
                <p className="text-slate-500 mt-1">System preferences and configuration</p>
            </div>

            <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-6">
                <h3 className="text-sm font-mono text-slate-400 uppercase tracking-widest mb-3">Coming Soon</h3>
                <p className="text-slate-400 text-sm">
                    This area will include system settings, notification preferences, and security options.
                </p>
            </div>
        </div>
    );
}
