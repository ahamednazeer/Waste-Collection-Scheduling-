'use client';

import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icon in Next.js
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface ZoneMapPickerProps {
    latitude?: number | null;
    longitude?: number | null;
    onLocationSelect: (lat: number, lng: number) => void;
}

function LocationMarker({ position, onSelect }: { position: L.LatLng | null, onSelect: (lat: number, lng: number) => void }) {
    const map = useMapEvents({
        click(e) {
            onSelect(e.latlng.lat, e.latlng.lng);
            map.flyTo(e.latlng, map.getZoom());
        },
    });

    useEffect(() => {
        if (position) {
            map.flyTo(position, map.getZoom());
        }
    }, [position, map]);

    return position === null ? null : (
        <>
            <Marker position={position} />
            <Circle
                center={position}
                radius={500} // Default 500m radius visualization
                pathOptions={{ color: '#22c55e', fillColor: '#22c55e', fillOpacity: 0.2 }}
            />
        </>
    );
}

export default function ZoneMapPicker({ latitude, longitude, onLocationSelect }: ZoneMapPickerProps) {
    // Default center (Bangalore based on seed data)
    const defaultCenter: [number, number] = [12.9716, 77.5946];

    const position = latitude && longitude ? new L.LatLng(latitude, longitude) : null;
    const center = position ? [position.lat, position.lng] as [number, number] : defaultCenter;

    return (
        <div className="h-[300px] w-full rounded-lg overflow-hidden border border-slate-700 relative z-0">
            <MapContainer
                center={center}
                zoom={13}
                style={{ height: '100%', width: '100%' }}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <LocationMarker position={position} onSelect={onLocationSelect} />
            </MapContainer>

            {/* Map Instruction Overlay */}
            <div className="absolute top-2 right-2 bg-slate-900/80 backdrop-blur text-xs text-slate-300 px-3 py-1.5 rounded border border-slate-700 z-[400] pointer-events-none">
                Click map to set location
            </div>
        </div>
    );
}
