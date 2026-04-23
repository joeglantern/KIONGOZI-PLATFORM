"use client";

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';
import { createClient } from '@/app/utils/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const containerStyle = {
    width: '100%',
    height: '600px',
    borderRadius: '1rem'
};

const center = {
    lat: -1.2921, // Nairobi, Kenya
    lng: 36.8219
};

const CATEGORY_COLORS: Record<string, string> = {
    'Tree Planting': '#16a34a',
    'Town Hall': '#ea580c',
    'Clean Up': '#2563eb',
    'Other': '#64748b'
};

export function ImpactMap() {
    const [points, setPoints] = useState<any[]>([]);
    const [selectedPoint, setSelectedPoint] = useState<any>(null);
    const supabase = useMemo(() => createClient(), []);

    const { isLoaded } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''
    });

    useEffect(() => {
        async function fetchPoints() {
            const { data, error } = await supabase
                .from('impact_points')
                .select('*');

            if (data) setPoints(data);
        }
        fetchPoints();
    }, [supabase]);

    if (!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) {
        return (
            <Card className="p-12 text-center bg-gray-50 border-dashed border-2 flex flex-col items-center justify-center h-[600px]">
                <h3 className="text-xl font-bold text-gray-900 mb-2">Map Configuration Missing</h3>
                <p className="text-gray-600 max-w-md">
                    To enable the Geographic Impact Map, please provide a
                    <code className="mx-1 px-1 bg-gray-200 rounded text-sm text-orange-700 font-mono">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code>
                    in your environment settings.
                </p>
            </Card>
        );
    }

    if (!isLoaded) return <div>Loading Map...</div>;

    return (
        <div className="relative">
            <GoogleMap
                mapContainerStyle={containerStyle}
                center={center}
                zoom={7}
                options={{
                    styles: [
                        {
                            featureType: "poi",
                            elementType: "labels",
                            stylers: [{ visibility: "off" }]
                        }
                    ]
                }}
            >
                {points.map((point) => (
                    <Marker
                        key={point.id}
                        position={{ lat: point.latitude, lng: point.longitude }}
                        onClick={() => setSelectedPoint(point)}
                        icon={
                            point.category === 'Tree Planting'
                                ? 'https://maps.google.com/mapfiles/ms/icons/green-dot.png'
                                : point.category === 'Town Hall'
                                    ? 'https://maps.google.com/mapfiles/ms/icons/orange-dot.png'
                                    : 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png'
                        }
                    />
                ))}

                {selectedPoint && (
                    <InfoWindow
                        position={{ lat: selectedPoint.latitude, lng: selectedPoint.longitude }}
                        onCloseClick={() => setSelectedPoint(null)}
                    >
                        <div className="p-2 max-w-[200px]">
                            <Badge
                                className="mb-2"
                                style={{ backgroundColor: CATEGORY_COLORS[selectedPoint.category] }}
                            >
                                {selectedPoint.category}
                            </Badge>
                            <h4 className="font-bold text-gray-900">{selectedPoint.title}</h4>
                            <p className="text-sm text-gray-600 line-clamp-2">{selectedPoint.description}</p>
                        </div>
                    </InfoWindow>
                )}
            </GoogleMap>
        </div>
    );
}
