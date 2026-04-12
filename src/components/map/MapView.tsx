import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default marker icons
import iconUrl from "leaflet/dist/images/marker-icon.png";
import iconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";

L.Icon.Default.mergeOptions({ iconUrl, iconRetinaUrl, shadowUrl });

const pickupIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png",
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const dropoffIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const driverIcon = new L.DivIcon({
  html: `<div style="background: hsl(142, 76%, 36%); width: 32px; height: 32px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9L18 10l-2.7-3.6A2 2 0 0 0 13.7 5H6.3a2 2 0 0 0-1.6.8L2 9.5 1.5 11c-.8.2-1.5 1-1.5 1.9V16c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>
  </div>`,
  className: "",
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -18],
});

export interface DriverMarker {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

interface MapClickHandlerProps {
  onMapClick?: (lat: number, lng: number) => void;
}

function MapClickHandler({ onMapClick }: MapClickHandlerProps) {
  useMapEvents({
    click(e) {
      onMapClick?.(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// Auto-fit map bounds to show all markers
function AutoFitBounds({
  pickup,
  dropoff,
}: {
  pickup?: { lat: number; lng: number } | null;
  dropoff?: { lat: number; lng: number } | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (pickup && dropoff) {
      const bounds = L.latLngBounds(
        [pickup.lat, pickup.lng],
        [dropoff.lat, dropoff.lng]
      );
      map.flyToBounds(bounds.pad(0.3), { duration: 0.8, maxZoom: 16 });
    } else if (pickup) {
      map.flyTo([pickup.lat, pickup.lng], 15, { duration: 0.6 });
    } else if (dropoff) {
      map.flyTo([dropoff.lat, dropoff.lng], 15, { duration: 0.6 });
    }
  }, [pickup?.lat, pickup?.lng, dropoff?.lat, dropoff?.lng, map]);

  return null;
}

interface MapViewProps {
  center?: [number, number];
  zoom?: number;
  pickup?: { lat: number; lng: number } | null;
  dropoff?: { lat: number; lng: number } | null;
  drivers?: DriverMarker[];
  onMapClick?: (lat: number, lng: number) => void;
  className?: string;
  children?: React.ReactNode;
}

export function MapView({
  center = [-6.2088, 106.8456],
  zoom = 14,
  pickup,
  dropoff,
  drivers = [],
  onMapClick,
  className = "w-full h-full",
  children,
}: MapViewProps) {
  return (
    <MapContainer center={center} zoom={zoom} className={className} zoomControl={false}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {onMapClick && <MapClickHandler onMapClick={onMapClick} />}
      <AutoFitBounds pickup={pickup} dropoff={dropoff} />
      {pickup && (
        <Marker position={[pickup.lat, pickup.lng]} icon={pickupIcon}>
          <Popup>Pick-up location</Popup>
        </Marker>
      )}
      {dropoff && (
        <Marker position={[dropoff.lat, dropoff.lng]} icon={dropoffIcon}>
          <Popup>Drop-off location</Popup>
        </Marker>
      )}
      {drivers.map((d) => (
        <Marker key={d.id} position={[d.lat, d.lng]} icon={driverIcon}>
          <Popup>{d.name}</Popup>
        </Marker>
      ))}
      {children}
    </MapContainer>
  );
}
