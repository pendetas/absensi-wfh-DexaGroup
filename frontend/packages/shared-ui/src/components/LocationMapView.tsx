import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useRef } from 'react';
import { cn } from '../lib/cn';
import { locationPrecision } from '../lib/location';
import type { LocationMapProps } from './LocationMap';

const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>';
// Shows the whole of Indonesia when there is nothing to show yet.
const INDONESIA: L.LatLngBoundsExpression = [
  [-11, 95],
  [6, 141],
];

/**
 * Dots are drawn shapes, not image pins, so no marker assets are needed.
 * Hidden from screen readers: the place name next to it carries the same information.
 */
export default function LocationMapView({ points, className, onPointClick }: LocationMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const map = L.map(containerRef.current, {
      zoomControl: true,
      attributionControl: true,
      scrollWheelZoom: false,
    });
    L.tileLayer(TILE_URL, { attribution: ATTRIBUTION, maxZoom: 19 }).addTo(map);
    mapRef.current = map;
    layerRef.current = L.layerGroup().addTo(map);
    // A dialog or drawer may still be animating to its final size.
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(containerRef.current);
    return () => {
      observer.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();

    for (const point of points) {
      const center: L.LatLngExpression = [point.latitude, point.longitude];
      if (point.accuracyMeters !== null && point.accuracyMeters > 30) {
        L.circle(center, {
          radius: point.accuracyMeters,
          color: point.color,
          weight: 1,
          fillOpacity: 0.08,
          interactive: false,
        }).addTo(layer);
      }
      const dot = L.circleMarker(center, {
        radius: 8,
        color: '#ffffff',
        weight: 2.5,
        fillColor: point.color,
        fillOpacity: 1,
      })
        .bindTooltip(point.label, { direction: 'top', offset: [0, -8] })
        .addTo(layer);
      if (onPointClick) dot.on('click', () => onPointClick(point));
    }

    if (points.length === 0) {
      map.fitBounds(INDONESIA);
    } else if (points.length === 1) {
      const [point] = points;
      const zoom = locationPrecision(point) === 'precise' ? 15 : 11;
      map.setView([point.latitude, point.longitude], zoom);
    } else {
      map.fitBounds(L.latLngBounds(points.map((p) => [p.latitude, p.longitude])), {
        padding: [28, 28],
        maxZoom: 15,
      });
    }
  }, [points, onPointClick]);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className={cn('z-0 overflow-hidden rounded-lg border border-line bg-surface', className)}
    />
  );
}
