'use client';

import React, { useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { api } from '@/lib/api';
import {
    Recycle,
    SignOut,
    Gauge,
    MapPin,
    Truck,
    Users,
    Calendar,
    ChartLineUp,
    List,
    Brain
} from '@phosphor-icons/react';

interface MenuItem {
    icon: React.ElementType;
    label: string;
    path: string;
}

interface DashboardLayoutProps {
    children: ReactNode;
    userRole?: string;
    userName?: string;
    userEmail?: string;
}

const MIN_WIDTH = 60;
const COLLAPSED_WIDTH = 64;
const DEFAULT_WIDTH = 64;
const MAX_WIDTH = 320;

const menuItemsByRole: Record<string, MenuItem[]> = {
    ADMIN: [
        { icon: Gauge, label: 'Dashboard', path: '/admin' },
        { icon: MapPin, label: 'Zones', path: '/admin/zones' },
        { icon: Recycle, label: 'Waste Data', path: '/admin/waste' },
        { icon: Brain, label: 'Predictions', path: '/admin/predictions' },
        { icon: Calendar, label: 'Schedules', path: '/admin/schedules' },
        { icon: Truck, label: 'Vehicles', path: '/admin/vehicles' },
        { icon: Users, label: 'Workforce', path: '/admin/workforce' },
        { icon: ChartLineUp, label: 'Analytics', path: '/admin/analytics' },
    ],
    SUPERVISOR: [
        { icon: Gauge, label: 'Dashboard', path: '/admin' },
        { icon: MapPin, label: 'Zones', path: '/admin/zones' },
        { icon: Recycle, label: 'Waste Data', path: '/admin/waste' },
        { icon: Brain, label: 'Predictions', path: '/admin/predictions' },
        { icon: Calendar, label: 'Schedules', path: '/admin/schedules' },
        { icon: Users, label: 'Workforce', path: '/admin/workforce' },
        { icon: ChartLineUp, label: 'Analytics', path: '/admin/analytics' },
    ],
    OPERATOR: [
        { icon: Gauge, label: 'Dashboard', path: '/admin' },
        { icon: Calendar, label: 'My Schedule', path: '/admin/schedules' },
        { icon: MapPin, label: 'Collection', path: '/admin/collection' },
    ],
};

export default function DashboardLayout({
    children,
    userRole: propRole,
    userName: propName,
    userEmail: propEmail,
}: DashboardLayoutProps) {
    const router = useRouter();
    const pathname = usePathname();

    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_WIDTH);
    const [isResizing, setIsResizing] = useState(false);
    const [isHidden, setIsHidden] = useState(false);
    const sidebarRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const savedWidth = localStorage.getItem('sidebarWidth');
        const savedHidden = localStorage.getItem('sidebarHidden');
        if (savedWidth) setSidebarWidth(parseInt(savedWidth));
        if (savedHidden === 'true') setIsHidden(true);
    }, []);

    useEffect(() => {
        if (!isResizing) {
            localStorage.setItem('sidebarWidth', sidebarWidth.toString());
            localStorage.setItem('sidebarHidden', isHidden.toString());
        }
    }, [sidebarWidth, isHidden, isResizing]);

    const startResizing = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        setIsResizing(true);
    }, []);

    const stopResizing = useCallback(() => {
        setIsResizing(false);
    }, []);

    const resize = useCallback((e: MouseEvent) => {
        if (isResizing && sidebarRef.current) {
            const newWidth = e.clientX;
            if (newWidth < MIN_WIDTH) {
                setIsHidden(true);
                setSidebarWidth(COLLAPSED_WIDTH);
            } else {
                setIsHidden(false);
                const clampedWidth = Math.min(MAX_WIDTH, Math.max(COLLAPSED_WIDTH, newWidth));
                setSidebarWidth(clampedWidth);
            }
        }
    }, [isResizing]);

    useEffect(() => {
        window.addEventListener('mousemove', resize);
        window.addEventListener('mouseup', stopResizing);
        return () => {
            window.removeEventListener('mousemove', resize);
            window.removeEventListener('mouseup', stopResizing);
        };
    }, [resize, stopResizing]);

    useEffect(() => {
        async function checkAuth() {
            if (propRole) {
                setUser({ role: propRole, first_name: propName, email: propEmail });
                setLoading(false);
                return;
            }

            try {
                const userData = await api.getMe();
                setUser(userData);
            } catch (error) {
                console.error('Auth check failed', error);
                router.replace('/');
            } finally {
                setLoading(false);
            }
        }
        checkAuth();
    }, [pathname, propRole, propName, propEmail, router]);

    const handleLogout = () => {
        api.clearToken();
        router.push('/');
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="text-center space-y-4">
                    <Recycle size={48} className="text-green-500 animate-pulse mx-auto" />
                    <div className="text-slate-500 font-mono text-sm animate-pulse">VERIFYING CREDENTIALS...</div>
                </div>
            </div>
        );
    }

    const role = propRole || user?.role || 'OPERATOR';
    const name = propName || (user ? `${user.first_name} ${user.last_name || ''}` : 'User');
    const email = propEmail || user?.email || 'user@wastecollect.com';
    const menuItems = menuItemsByRole[role] || menuItemsByRole.OPERATOR;

    const isCollapsed = sidebarWidth < 150;
    const showLabels = sidebarWidth >= 150 && !isHidden;

    return (
        <div className="min-h-screen bg-slate-950 flex">
            <div className="scanlines" />

            {/* Sidebar */}
            <aside
                ref={sidebarRef}
                className={`print:hidden bg-slate-900 border-r border-slate-800 h-screen sticky top-0 flex flex-col z-50 transition-all ${isResizing ? 'transition-none' : 'duration-200'
                    } ${isHidden ? 'w-0 overflow-hidden border-0' : ''}`}
                style={{ width: isHidden ? 0 : sidebarWidth }}
            >
                {/* Header */}
                <div className={`p-4 border-b border-slate-800 flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
                    <Recycle size={28} weight="duotone" className="text-green-400 flex-shrink-0" />
                    {showLabels && (
                        <div className="overflow-hidden">
                            <h1 className="font-chivo font-bold text-sm uppercase tracking-wider whitespace-nowrap">Waste Collection</h1>
                            <p className="text-xs text-slate-500 font-mono">{role.replace('_', ' ')}</p>
                        </div>
                    )}
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-2 overflow-y-auto overflow-x-hidden">
                    <ul className="space-y-1">
                        {menuItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = pathname === item.path;
                            return (
                                <li key={item.path}>
                                    <button
                                        onClick={() => router.push(item.path)}
                                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-sm transition-all duration-150 text-sm font-medium ${isCollapsed ? 'justify-center' : ''
                                            } ${isActive
                                                ? 'text-green-400 bg-green-950/50 border-l-2 border-green-400'
                                                : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
                                            }`}
                                        title={isCollapsed ? item.label : undefined}
                                    >
                                        <Icon size={20} weight="duotone" className="flex-shrink-0" />
                                        {showLabels && <span className="truncate">{item.label}</span>}
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                </nav>

                {/* Logout */}
                <div className="p-2 border-t border-slate-800">
                    <button
                        onClick={handleLogout}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 text-red-400 hover:text-red-300 hover:bg-slate-800 rounded-sm transition-all duration-150 text-sm font-medium ${isCollapsed ? 'justify-center' : ''
                            }`}
                        title={isCollapsed ? 'Sign Out' : undefined}
                    >
                        <SignOut size={20} className="flex-shrink-0" />
                        {showLabels && 'Sign Out'}
                    </button>
                </div>

                {/* Resize Handle */}
                <div
                    className="absolute right-0 top-0 h-full w-1 cursor-ew-resize hover:bg-green-500/50 active:bg-green-500 transition-colors z-50"
                    onMouseDown={startResizing}
                    style={{ transform: 'translateX(50%)' }}
                />
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto relative z-10">
                {/* Header */}
                <div className="print:hidden backdrop-blur-md bg-slate-950/80 border-b border-slate-700 sticky top-0 z-40">
                    <div className="flex items-center justify-between px-6 py-4">
                        <div className="flex items-center gap-4">
                            {isHidden && (
                                <button
                                    onClick={() => { setIsHidden(false); setSidebarWidth(DEFAULT_WIDTH); }}
                                    className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
                                    title="Show Sidebar"
                                >
                                    <List size={24} />
                                </button>
                            )}
                            <div>
                                <h2 className="font-chivo font-bold text-xl uppercase tracking-wider">Dashboard</h2>
                                <p className="text-xs text-slate-400 font-mono mt-1">Welcome back, {name}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="text-right hidden sm:block">
                                <p className="text-xs text-slate-500 uppercase tracking-wider font-mono">Logged in as</p>
                                <p className="text-sm font-mono text-slate-300">{email}</p>
                            </div>
                            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-green-600 to-green-800 flex items-center justify-center text-white font-bold text-sm shadow-lg">
                                {name?.charAt(0).toUpperCase() || 'U'}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Page Content */}
                <div className="p-6">
                    {children}
                </div>
            </main>

            {/* Overlay when resizing */}
            {isResizing && (
                <div className="fixed inset-0 z-[100] cursor-ew-resize" />
            )}
        </div>
    );
}
