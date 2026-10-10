import { Fragment, useMemo, useState } from 'react';
import { Circle, CircleMarker, MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import { divIcon, type LatLngExpression } from 'leaflet';
import type { Incident, StaffMember } from '../lib/security-data';
import type { Language } from '../pages/experiences';
import 'leaflet/dist/leaflet.css';

export const HARAM_CENTER: LatLngExpression = [21.4225, 39.8262];

const gates = [
  { id: 'king-fahd', name: { en: 'King Fahd Gate', ar: 'بوابة الملك فهد' }, risk: 'high', level: 86, point: [21.4219, 39.8248] as LatLngExpression, labelPoint: [21.42255, 39.8248] as LatLngExpression, radius: 125 },
  { id: 'east-plaza', name: { en: 'East Plaza', ar: 'الساحة الشرقية' }, risk: 'medium', level: 57, point: [21.42325, 39.8280] as LatLngExpression, labelPoint: [21.42395, 39.8280] as LatLngExpression, radius: 105 },
  { id: 'ajyad', name: { en: 'Ajyad', ar: 'أجياد' }, risk: 'low', level: 29, point: [21.41995, 39.8272] as LatLngExpression, labelPoint: [21.4206, 39.8272] as LatLngExpression, radius: 92 },
] as const;

const namedPlaces: Array<{ terms: string[]; point: [number, number] }> = [
  { terms: ['king fahd', 'بوابة الملك فهد'], point: [21.4219, 39.8248] },
  { terms: ['east plaza', 'eastern courtyard', 'eastern plaza', 'الساحة الشرقية'], point: [21.42325, 39.8280] },
  { terms: ['ajyad', 'أجياد'], point: [21.41995, 39.8272] },
  { terms: ['king abdulaziz', 'بوابة الملك عبدالعزيز'], point: [21.4234, 39.8232] },
  { terms: ['mataf', 'المطاف'], point: [21.4224, 39.82625] },
  { terms: ['western arcade', 'west arcade'], point: [21.4220, 39.8235] },
  { terms: ['operations base'], point: [21.4251, 39.8260] },
];

export function locationCoordinates(location: string): [number, number] {
  const normalized = location.toLocaleLowerCase();
  const known = namedPlaces.find((place) => place.terms.some((term) => normalized.includes(term)));
  if (known) return known.point;
  let hash = 0;
  for (let i = 0; i < location.length; i += 1) hash = (hash * 31 + location.charCodeAt(i)) | 0;
  const latOffset = (((Math.abs(hash) % 1000) / 1000) - 0.5) * 0.006;
  const lonOffset = (((Math.abs((hash * 17) | 0) % 1000) / 1000) - 0.5) * 0.008;
  return [21.4225 + latOffset, 39.8262 + lonOffset];
}

const staffPositions: Record<string, [number, number]> = {
  'ST-1042': [21.4230, 39.8272], 'ST-1086': [21.4234, 39.8232],
  'ST-1121': [21.4220, 39.8235], 'ST-1138': [21.4227, 39.8267],
  'ST-1194': [21.4251, 39.8260], 'ST-1227': [21.4201, 39.8270],
};

export type PositionedUnit = { person: StaffMember; position: [number, number] };

type OperationsMapProps = {
  incidents: Incident[];
  units: PositionedUnit[];
  lang: Language;
  density: number[];
};

export function OperationsMap({ incidents, units, lang, density }: OperationsMapProps) {
  const [tilesFailed, setTilesFailed] = useState(false);
  const [tilesLoaded, setTilesLoaded] = useState(false);
  const zoneLabels = useMemo(() => gates.map((gate, index) => ({
    ...gate, level: density[index] ?? gate.level,
    icon: divIcon({
      className: 'zone-marker',
      html: `<div class="zone-label ${gate.risk}"><span>${lang === 'ar' ? gate.name.ar : gate.name.en}</span><b>${gate.risk === 'high' ? (lang === 'ar' ? 'مرتفع' : 'HIGH') : gate.risk === 'medium' ? (lang === 'ar' ? 'متوسط' : 'MED') : (lang === 'ar' ? 'منخفض' : 'LOW')}</b></div>`,
      iconSize: [155, 26], iconAnchor: [77, 13],
    }),
  })), [lang, density]);

  return <div className="ops-map" data-testid="map-operations">
    <MapContainer center={HARAM_CENTER} zoom={16} minZoom={14} maxZoom={19} scrollWheelZoom zoomControl aria-label={lang === 'ar' ? 'خريطة توضيحية لمنطقة الحرم' : 'Map around Al-Masjid al-Haram'}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        className="dark-map-tiles"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        eventHandlers={{ tileload: () => setTilesLoaded(true), tileerror: () => setTilesFailed(true) }}
      />
      {zoneLabels.map((gate) => <Fragment key={`crowd-${gate.id}`}>
        <Circle center={gate.point} radius={gate.radius} pathOptions={{ color: gate.risk === 'high' ? '#ed665b' : gate.risk === 'medium' ? '#e4bb51' : '#68bd88', fillColor: gate.risk === 'high' ? '#e95349' : gate.risk === 'medium' ? '#e5b63e' : '#4caf75', fillOpacity: 0.16 + gate.level / 650, weight: 1, opacity: .74, className: 'map-pulse' }} />
        <CircleMarker center={gate.point} radius={5 + gate.level / 18} pathOptions={{ color: gate.risk === 'high' ? '#f07a68' : gate.risk === 'medium' ? '#e9c35f' : '#7ad398', fillColor: gate.risk === 'high' ? '#e75c50' : gate.risk === 'medium' ? '#dfb13e' : '#4cae6a', fillOpacity: .35, weight: 1.5 }} />
        <Marker position={gate.labelPoint} icon={gate.icon}><Popup><div className="popup-title">{lang === 'ar' ? gate.name.ar : gate.name.en}</div><div className="popup-line"><b>{lang === 'ar' ? 'مستوى الكثافة' : 'Estimated density'}:</b> {gate.level}% · {lang === 'ar' ? 'توضيحي' : 'illustrative'}</div><div className="popup-line"><b>{lang === 'ar' ? 'التوقع' : 'Trend'}:</b> {gate.risk === 'high' ? (lang === 'ar' ? 'ازدحام مرتفع' : 'High crowding') : gate.risk === 'medium' ? (lang === 'ar' ? 'حركة معتدلة' : 'Moderate flow') : (lang === 'ar' ? 'حركة منخفضة' : 'Lower footfall')}</div><div className="popup-line">{lang === 'ar' ? 'تحديث توضيحي' : 'Demo update'} · {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div></Popup></Marker>
      </Fragment>)}
      {units.map(({ person, position }) => <Marker key={person.id} position={position} icon={divIcon({ className: 'unit-div-icon', html: '<div class="unit-marker" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3 20 6v5c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z"/><path d="m9 12 2 2 4-4"/></svg></div>', iconSize: [27, 27], iconAnchor: [13, 13] })}>
        <Popup><div className="popup-title">{person.name}</div><div className="popup-line"><b>{lang === 'ar' ? 'الدور' : 'Role'}:</b> {person.role}</div><div className="popup-line"><b>{lang === 'ar' ? 'الحالة' : 'Status'}:</b> {person.status === 'Available' ? (lang === 'ar' ? 'متاح' : 'Available') : person.status === 'Assigned' ? (lang === 'ar' ? 'مكلّف' : 'Assigned') : (lang === 'ar' ? 'غير متاح' : 'Unavailable')}</div><div className="popup-line"><b>{lang === 'ar' ? 'الموقع' : 'Location'}:</b> {person.location}</div><div className="popup-line">{lang === 'ar' ? 'موقع متحرك للمحاكاة فقط' : 'Simulated position only'}</div></Popup>
      </Marker>)}
      {incidents.map((incident) => <Marker key={incident.id} position={locationCoordinates(incident.location)} icon={divIcon({ className: 'alert-div-icon', html: '<div class="alert-marker" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.3 3.9 2.7 17a2 2 0 0 0 1.7 3h15.2a2 2 0 0 0 1.7-3l-7.6-13.1a2 2 0 0 0-3.4 0Z"/></svg></div>', iconSize: [25, 25], iconAnchor: [12, 22] })}>
        <Popup><div className="popup-title">{incident.id.startsWith('SIM-') ? (lang === 'ar' ? 'تنبيه محاكاة' : 'Simulated alert') : incident.reportedBy === 'Guest' ? (lang === 'ar' ? 'بلاغ زائر' : 'Guest report') : (lang === 'ar' ? 'بلاغ عمليات' : 'Open incident')} · {incident.id}</div><div className="popup-line"><b>{lang === 'ar' ? 'النوع' : 'Type'}:</b> {incident.type}</div><div className="popup-line"><b>{lang === 'ar' ? 'الحالة' : 'Status'}:</b> {incident.status === 'Open' ? (lang === 'ar' ? 'مفتوح' : 'Open') : (lang === 'ar' ? 'مكلّف' : `Assigned${incident.assignedStaff ? ` · ${incident.assignedStaff}` : ''}`)}</div><div className="popup-line"><b>{lang === 'ar' ? 'الموقع' : 'Location'}:</b> {incident.location}</div>{incident.description && <div className="popup-line"><b>{lang === 'ar' ? 'التفاصيل' : 'Details'}:</b> {incident.description}</div>}<div className="popup-line"><b>{lang === 'ar' ? 'وقت البلاغ' : 'Reported'}:</b> {incident.createdAt}</div></Popup>
      </Marker>)}
    </MapContainer>
    {!tilesLoaded && !tilesFailed && <div className="tile-loading" role="status" data-testid="map-tile-loading">{lang === 'ar' ? 'جارٍ تحميل خريطة الأساس…' : 'Loading public map tiles…'}</div>}
    {tilesFailed && <div className="tile-status" role="status" data-testid="map-tile-warning">{lang === 'ar' ? 'تعذر تحميل بعض خرائط الأساس العامة؛ تبقى طبقات المحاكاة والعلامات متاحة.' : 'Some public base-map tiles could not load. Demo crowd layers and markers remain available.'}</div>}
  </div>;
}

export function initialUnitPositions(staff: StaffMember[]): PositionedUnit[] {
  return staff.map((person, index) => ({
    person,
    position: staffPositions[person.id] ?? [21.4225 + ((index % 3) - 1) * 0.001, 39.8262 + (((index + 1) % 3) - 1) * 0.001],
  }));
}
