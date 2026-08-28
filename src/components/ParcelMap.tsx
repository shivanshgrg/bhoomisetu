import { useMemo, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import { CircleMarker, MapContainer, Polygon, Popup, TileLayer } from 'react-leaflet';
import { Link } from 'react-router-dom';
import {
  STAGE_BY_ID,
  computeConvexHull,
  getParcelCalculatedStatus,
  type AcquisitionParcel,
  type AcquisitionProject,
  type DashboardStatus,
} from '../domain';
import { getBadgeTone, getStatusIcon, getStatusLabel } from '../pages/statusDisplay';

const FALLBACK_CENTER: [number, number] = [21.1458, 79.0882];

// Stable, visually distinct colors for project boundaries/markers — cycles
// if there are ever more projects than colors. Not tied to any CSS variable
// since Leaflet SVG layers need plain hex/rgba values, not custom properties.
const PROJECT_COLORS = [
  '#2f6f4f',
  '#1d4e89',
  '#b1740f',
  '#7a3b69',
  '#3c8c8c',
  '#8a3324',
  '#556b2f',
  '#4b3869',
];

// Mirrors statusDisplay.ts's getBadgeTone tone names to actual map colors
// (that file only produces CSS class names, which Leaflet's SVG layers
// can't consume directly).
const TONE_COLORS: Record<string, string> = {
  success: '#237345',
  warning: '#9d6415',
  danger: '#a73730',
  info: '#235c96',
  neutral: '#5b6b68',
};

type ColorMode = 'project' | 'status';

type ParcelMapProps = {
  parcels: AcquisitionParcel[];
  projects?: AcquisitionProject[];
};

function getStatusColor(status: DashboardStatus): string {
  return TONE_COLORS[getBadgeTone(status)] ?? TONE_COLORS.neutral;
}

export function ParcelMap({ parcels, projects = [] }: ParcelMapProps) {
  const [colorMode, setColorMode] = useState<ColorMode>('project');

  const center: [number, number] =
    parcels.length > 0
      ? [
          parcels.reduce((sum, parcel) => sum + parcel.coordinates.lat, 0) / parcels.length,
          parcels.reduce((sum, parcel) => sum + parcel.coordinates.lng, 0) / parcels.length,
        ]
      : FALLBACK_CENTER;

  const projectIds = useMemo(
    () => Array.from(new Set(parcels.map((parcel) => parcel.projectId))).sort(),
    [parcels],
  );

  const projectColorById = useMemo(() => {
    const colorById = new Map<string, string>();
    projectIds.forEach((projectId, index) => {
      colorById.set(projectId, PROJECT_COLORS[index % PROJECT_COLORS.length]);
    });
    return colorById;
  }, [projectIds]);

  const projectNameById = useMemo(() => {
    const nameById = new Map<string, string>();
    projects.forEach((project) => nameById.set(project.id, project.name));
    return nameById;
  }, [projects]);

  const projectBoundaries = useMemo(
    () =>
      projectIds
        .map((projectId) => {
          const points = parcels
            .filter((parcel) => parcel.projectId === projectId)
            .map((parcel) => parcel.coordinates);
          const hull = computeConvexHull(points);

          return { projectId, hull };
        })
        .filter((boundary) => boundary.hull.length >= 3),
    [parcels, projectIds],
  );

  return (
    <div>
      <div className="map-controls" role="group" aria-label="Marker color scheme">
        <button
          type="button"
          className={`map-color-toggle${colorMode === 'project' ? ' map-color-toggle-active' : ''}`}
          aria-pressed={colorMode === 'project'}
          onClick={() => setColorMode('project')}
        >
          Color by project
        </button>
        <button
          type="button"
          className={`map-color-toggle${colorMode === 'status' ? ' map-color-toggle-active' : ''}`}
          aria-pressed={colorMode === 'status'}
          onClick={() => setColorMode('status')}
        >
          Color by status
        </button>
      </div>

      <MapContainer center={center} zoom={parcels.length > 0 ? 9 : 6} className="parcel-map" scrollWheelZoom={false}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {colorMode === 'project' &&
          projectBoundaries.map(({ projectId, hull }) => {
            const color = projectColorById.get(projectId) ?? TONE_COLORS.neutral;

            return (
              <Polygon
                key={projectId}
                positions={hull.map((point) => [point.lat, point.lng] as [number, number])}
                pathOptions={{ color, fillColor: color, fillOpacity: 0.08, weight: 2 }}
              />
            );
          })}

        {parcels.map((parcel) => {
          const calculatedStatus = getParcelCalculatedStatus(parcel);
          const color =
            colorMode === 'project'
              ? projectColorById.get(parcel.projectId) ?? TONE_COLORS.neutral
              : getStatusColor(calculatedStatus.status);

          return (
            <CircleMarker
              key={parcel.id}
              center={[parcel.coordinates.lat, parcel.coordinates.lng]}
              radius={7}
              pathOptions={{ color, fillColor: color, fillOpacity: 0.85, weight: 2 }}
            >
              <Popup>
                <strong>{parcel.surveyNumber}</strong>
                <br />
                {parcel.village}, {parcel.district}
                <br />
                {projectNameById.get(parcel.projectId) ?? parcel.projectId}
                <br />
                {STAGE_BY_ID[parcel.currentStage].label} ·{' '}
                <span className={`badge badge-${getBadgeTone(calculatedStatus.status)}`}>
                  {getStatusIcon(calculatedStatus.status)} {getStatusLabel(calculatedStatus.status)}
                </span>
                <br />
                <Link to={`/official/parcel/${parcel.id}`}>View parcel</Link>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>

      {colorMode === 'project' && projectIds.length > 0 && (
        <ul className="map-legend" aria-label="Project color legend">
          {projectIds.map((projectId) => (
            <li key={projectId}>
              <span
                className="map-legend-swatch"
                style={{ background: projectColorById.get(projectId) }}
              />
              {projectNameById.get(projectId) ?? projectId}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
