import React, { useEffect, useRef, useState } from 'react';
import * as L from 'leaflet';
import { MapPin, ExternalLink, Navigation } from 'lucide-react';
import { Complaint } from '../types';
import { StatusBadge } from './StatusBadge';
import { PriorityBadge } from './PriorityBadge';

interface Props {
  complaints: Complaint[];
  selectedComplaintId?: string | null;
  onSelectComplaint?: (complaint: Complaint) => void;
  height?: string;
  zoom?: number;
  center?: [number, number];
}

export const LeafletMap: React.FC<Props> = ({
  complaints,
  selectedComplaintId,
  onSelectComplaint,
  height = '500px',
  zoom = 13,
  center = [37.768, -122.425],
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const [mapError, setMapError] = useState(false);

  // Complaints with valid coordinates
  const geoComplaints = complaints.filter(
    (c) => typeof c.latitude === 'number' && typeof c.longitude === 'number'
  );

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Prevent double instantiation
    if (!mapInstanceRef.current) {
      try {
        const map = L.map(mapContainerRef.current, {
          center: center,
          zoom: zoom,
          zoomControl: true,
          scrollWheelZoom: true,
        });

        // OpenStreetMap free standard tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | CivicPulse',
        }).addTo(map);

        const markersLayer = L.layerGroup().addTo(map);
        markersLayerRef.current = markersLayer;
        mapInstanceRef.current = map;
      } catch (err) {
        console.warn('Leaflet map initialization notice:', err);
        setMapError(true);
      }
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update markers when complaints or selection changes
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;

    markersLayerRef.current.clearLayers();

    const bounds = L.latLngBounds([]);

    geoComplaints.forEach((c) => {
      const lat = c.latitude!;
      const lng = c.longitude!;
      bounds.extend([lat, lng]);

      const isSelected = selectedComplaintId === c.id;

      // Color based on status
      let pinColor = '#0d9488'; // teal
      let pinBorder = '#115e59';
      if (c.status === 'Resolved') {
        pinColor = '#10b981'; // emerald
        pinBorder = '#047857';
      } else if (c.status === 'In Progress') {
        pinColor = '#f59e0b'; // amber
        pinBorder = '#d97706';
      } else if (c.priority === 'Critical') {
        pinColor = '#e11d48'; // rose
        pinBorder = '#be123c';
      }

      const customIcon = L.divIcon({
        className: 'custom-civic-pin',
        html: `
          <div style="
            position: relative;
            width: ${isSelected ? '32px' : '26px'};
            height: ${isSelected ? '32px' : '26px'};
            background-color: ${pinColor};
            border: 3px solid ${isSelected ? '#ffffff' : pinBorder};
            box-shadow: 0 4px 10px rgba(0,0,0,0.3);
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: transform 0.2s;
          ">
            <div style="
              width: 8px;
              height: 8px;
              background-color: white;
              border-radius: 50%;
              transform: rotate(45deg);
            "></div>
          </div>
        `,
        iconSize: [30, 30],
        iconAnchor: [15, 30],
        popupAnchor: [0, -32],
      });

      const marker = L.marker([lat, lng], { icon: customIcon });

      const popupContent = `
        <div style="font-family: inherit; font-size: 13px; max-width: 240px; padding: 2px;">
          <div style="font-size: 11px; font-weight: 700; color: #0d9488; margin-bottom: 4px;">${c.reference}</div>
          <div style="font-weight: 600; color: #0f172a; margin-bottom: 6px; line-height: 1.3;">${c.title}</div>
          <div style="font-size: 12px; color: #64748b; margin-bottom: 8px;">${c.address}</div>
          <div style="display: flex; gap: 6px; align-items: center; margin-bottom: 6px;">
            <span style="font-size: 10px; background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-weight: 600;">${c.status}</span>
            <span style="font-size: 10px; background: #e0f2fe; color: #0369a1; padding: 2px 6px; border-radius: 4px; font-weight: 600;">${c.priority}</span>
          </div>
        </div>
      `;

      marker.bindPopup(popupContent);

      marker.on('click', () => {
        if (onSelectComplaint) {
          onSelectComplaint(c);
        }
      });

      markersLayerRef.current?.addLayer(marker);
    });

    if (geoComplaints.length > 0 && bounds.isValid()) {
      mapInstanceRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }
  }, [complaints, selectedComplaintId]);

  // If map error occurred or no geolocation library support, render high-fidelity locality cards
  if (mapError || geoComplaints.length === 0) {
    return (
      <div
        style={{ height }}
        className="w-full bg-slate-900 text-slate-100 rounded-2xl p-6 flex flex-col justify-between relative overflow-hidden shadow-inner border border-slate-800"
      >
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px]" />

        <div className="relative z-10 flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-teal-400" />
            <h3 className="font-semibold text-white text-base">Civic Geographic Distribution</h3>
          </div>
          <span className="text-xs bg-teal-950 text-teal-300 border border-teal-800 px-2.5 py-1 rounded-full font-medium">
            {complaints.length} Reported Incidents
          </span>
        </div>

        <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 my-4 overflow-y-auto max-h-[340px] pr-2">
          {complaints.slice(0, 9).map((c) => (
            <div
              key={c.id}
              onClick={() => onSelectComplaint?.(c)}
              className="p-3 bg-slate-800/80 border border-slate-700/80 rounded-xl hover:border-teal-500/60 cursor-pointer transition-all hover:bg-slate-800"
            >
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-mono font-bold text-teal-400">{c.reference}</span>
                <span className="text-[11px] text-slate-400">{c.locality}</span>
              </div>
              <p className="text-sm font-medium text-slate-200 line-clamp-1 mb-2">{c.title}</p>
              <div className="flex items-center justify-between text-xs">
                <StatusBadge status={c.status} size="sm" />
                <PriorityBadge priority={c.priority} size="sm" showIcon={false} />
              </div>
            </div>
          ))}
        </div>

        <div className="relative z-10 text-xs text-slate-400 flex items-center justify-between pt-3 border-t border-slate-800">
          <span>San Francisco Metropolitan Metro District</span>
          <span className="flex items-center gap-1 text-teal-400">
            <Navigation className="w-3.5 h-3.5" /> Live Geo Index
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-slate-200 shadow-sm" style={{ height }}>
      <div ref={mapContainerRef} className="w-full h-full z-10" />

      {/* Map Legend Overlay */}
      <div className="absolute bottom-4 left-4 z-20 bg-white/95 backdrop-blur-xs p-3 rounded-xl border border-slate-200/90 shadow-md text-xs space-y-1.5 max-w-[200px]">
        <div className="font-semibold text-slate-800 text-[11px] uppercase tracking-wider mb-1">Status Legend</div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <span className="text-slate-600">Resolved ({complaints.filter((c) => c.status === 'Resolved').length})</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          <span className="text-slate-600">In Progress ({complaints.filter((c) => c.status === 'In Progress').length})</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-600" />
          <span className="text-slate-600">Critical Safety Alert</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-teal-600" />
          <span className="text-slate-600">Submitted / Active</span>
        </div>
      </div>
    </div>
  );
};
