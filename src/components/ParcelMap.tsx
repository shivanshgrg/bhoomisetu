import { divIcon, type Map as LeafletMap } from 'leaflet';
import { useMemo, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import { MapContainer, Marker, Polygon, Polyline, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { Link } from 'react-router-dom';
import {
  DEMO_REFERENCE_DATE,
  STAGE_BY_ID,
  computeConvexHull,
  getParcelCalculatedStatus,
  getProjectCalculatedStatus,
  getParcelFootprintPolygon,
  type AcquisitionParcel,
  type AcquisitionProject,
  type DashboardStatus,
  type ISODateString,
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
// can't consume directly). Kept in step with the badge-* tone colors in
// styles.css so a marker and its popup badge always read as the same status.
const TONE_COLORS: Record<string, string> = {
  success: '#2f6f4f',
  warning: '#b45309',
  danger: '#b3261e',
  info: '#3a5a8c',
  neutral: '#8b8577',
};

type ColorMode = 'project' | 'status';

type ParcelMapProps = {
  parcels: AcquisitionParcel[];
  projects?: AcquisitionProject[];
  // National/state oversight intentionally stops at project status. District
  // and field-officer views retain parcel geometry inside their existing
  // scoped data boundary.
  mode?: 'parcel' | 'project';
  // Step 64: when set to a scrubbed-to-the-past date, marker status is
  // computed against that date rather than today — the caller is expected to
  // already have swapped `parcels` for a time-travel snapshot.
  asOfDate?: ISODateString;
};

function getStatusColor(status: DashboardStatus): string {
  return TONE_COLORS[getBadgeTone(status)] ?? TONE_COLORS.neutral;
}

// Points within this many screen pixels of each other (at the current zoom)
// merge into one cluster. Distances are computed in Leaflet's own projected
// pixel space (map.project), which scales with zoom on its own — so nearby
// parcels naturally separate back into individual markers as the user zooms
// in, with no separate "stop clustering above zoom N" cutoff needed.
const CLUSTER_PIXEL_RADIUS = 46;

type ParcelCluster = {
  key: string;
  lat: number;
  lng: number;
  parcels: AcquisitionParcel[];
};

function clusterParcels(map: LeafletMap, parcels: AcquisitionParcel[], zoom: number): ParcelCluster[] {
  const projected = parcels.map((parcel) => ({
    parcel,
    point: map.project([parcel.coordinates.lat, parcel.coordinates.lng], zoom),
  }));

  const clusters: { parcel: AcquisitionParcel; point: { x: number; y: number } }[][] = [];
  const assigned = new Array(projected.length).fill(false);

  for (let i = 0; i < projected.length; i += 1) {
    if (assigned[i]) continue;
    const group = [projected[i]];
    assigned[i] = true;

    for (let j = i + 1; j < projected.length; j += 1) {
      if (assigned[j]) continue;
      const dx = projected[i].point.x - projected[j].point.x;
      const dy = projected[i].point.y - projected[j].point.y;
      if (Math.sqrt(dx * dx + dy * dy) <= CLUSTER_PIXEL_RADIUS) {
        group.push(projected[j]);
        assigned[j] = true;
      }
    }

    clusters.push(group);
  }

  return clusters.map((group) => ({
    key: group.map(({ parcel }) => parcel.id).join('|'),
    lat: group.reduce((sum, { parcel }) => sum + parcel.coordinates.lat, 0) / group.length,
    lng: group.reduce((sum, { parcel }) => sum + parcel.coordinates.lng, 0) / group.length,
    parcels: group.map(({ parcel }) => parcel),
  }));
}

function makeClusterIcon(count: number) {
  const size = count >= 50 ? 46 : count >= 20 ? 40 : count >= 10 ? 34 : 28;
  return divIcon({
    html: `<span class="cluster-marker-inner">${count}</span>`,
    className: 'cluster-marker',
    iconSize: [size, size],
  });
}

type ParcelMarkersProps = {
  parcels: AcquisitionParcel[];
  colorMode: ColorMode;
  projectColorById: Map<string, string>;
  projectNameById: Map<string, string>;
  asOfDate: ISODateString;
};

// Rendered as a child of MapContainer so it can read the live map instance
// (useMap) and re-cluster whenever the zoom level changes (useMapEvents) —
// at 250+ parcels, one circle marker per parcel is slow to paint and, at a
// state-wide zoom level, visually collapses into an unreadable smear anyway.
function ParcelMarkers({ parcels, colorMode, projectColorById, projectNameById, asOfDate }: ParcelMarkersProps) {
  const map = useMap();
  const [zoom, setZoom] = useState(map.getZoom());

  useMapEvents({
    zoomend: () => setZoom(map.getZoom()),
  });

  const clusters = useMemo(() => clusterParcels(map, parcels, zoom), [map, parcels, zoom]);

  return (
    <>
      {clusters.map((cluster) => {
        if (cluster.parcels.length === 1) {
          const parcel = cluster.parcels[0];
          const calculatedStatus = getParcelCalculatedStatus(parcel, asOfDate);
          const color =
            colorMode === 'project'
              ? projectColorById.get(parcel.projectId) ?? TONE_COLORS.neutral
              : getStatusColor(calculatedStatus.status);

          const footprint = getParcelFootprintPolygon(parcel);

          return (
            <Polygon
              key={cluster.key}
              positions={footprint.map((point) => [point.lat, point.lng] as [number, number])}
              pathOptions={{ color, fillColor: color, fillOpacity: 0.55, weight: 2 }}
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
            </Polygon>
          );
        }

        return (
          <Marker
            key={cluster.key}
            position={[cluster.lat, cluster.lng]}
            icon={makeClusterIcon(cluster.parcels.length)}
            eventHandlers={{
              click: () => {
                const bounds = cluster.parcels.map(
                  (parcel) => [parcel.coordinates.lat, parcel.coordinates.lng] as [number, number],
                );
                map.fitBounds(bounds, { padding: [48, 48], maxZoom: 15 });
              },
            }}
          >
            <Popup>
              <strong>{cluster.parcels.length} parcels</strong>
              <br />
              Click the marker or zoom in to see them individually.
            </Popup>
          </Marker>
        );
      })}
    </>
  );
}

const CADASTRAL_GRID_COLOR = '#8a7a4a';
const CADASTRAL_CELLS_PER_AXIS = 14;

// A Bhu-Naksha-style cadastral block grid: a faint reference lattice over
// the parcel extent. This dataset has no real cadastral block boundaries, so
// the grid is a deterministic subdivision of the parcels' own bounding box —
// disclosed as a reference overlay, not authoritative survey-block geometry
// (same honesty framing as getParcelFootprintPolygon in src/domain/geo.ts).
function buildCadastralGridLines(parcels: AcquisitionParcel[]): [GeoPointTuple, GeoPointTuple][] {
  if (parcels.length === 0) {
    return [];
  }

  const lats = parcels.map((parcel) => parcel.coordinates.lat);
  const lngs = parcels.map((parcel) => parcel.coordinates.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  const latPad = Math.max((maxLat - minLat) * 0.08, 0.01);
  const lngPad = Math.max((maxLng - minLng) * 0.08, 0.01);
  const north = maxLat + latPad;
  const south = minLat - latPad;
  const east = maxLng + lngPad;
  const west = minLng - lngPad;

  const lines: [GeoPointTuple, GeoPointTuple][] = [];

  for (let i = 0; i <= CADASTRAL_CELLS_PER_AXIS; i += 1) {
    const lat = south + ((north - south) * i) / CADASTRAL_CELLS_PER_AXIS;
    lines.push([[lat, west], [lat, east]]);
  }
  for (let i = 0; i <= CADASTRAL_CELLS_PER_AXIS; i += 1) {
    const lng = west + ((east - west) * i) / CADASTRAL_CELLS_PER_AXIS;
    lines.push([[south, lng], [north, lng]]);
  }

  return lines;
}

type GeoPointTuple = [number, number];

export function ParcelMap({ parcels, projects = [], mode = 'parcel', asOfDate = DEMO_REFERENCE_DATE }: ParcelMapProps) {
  const [colorMode, setColorMode] = useState<ColorMode>('project');
  const [showCadastralOverlay, setShowCadastralOverlay] = useState(false);

  const cadastralGridLines = useMemo(() => buildCadastralGridLines(parcels), [parcels]);

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
      {mode === 'parcel' && <div className="map-controls" role="group" aria-label="Marker color scheme">
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
        <button
          type="button"
          className={`map-color-toggle${showCadastralOverlay ? ' map-color-toggle-active' : ''}`}
          aria-pressed={showCadastralOverlay}
          onClick={() => setShowCadastralOverlay((current) => !current)}
        >
          Cadastral overlay
        </button>
      </div>}

      <MapContainer center={center} zoom={parcels.length > 0 ? 9 : 6} className="parcel-map" scrollWheelZoom={false}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {showCadastralOverlay &&
          cadastralGridLines.map((line, index) => (
            <Polyline
              key={`cadastral-${index}`}
              positions={line}
              pathOptions={{ color: CADASTRAL_GRID_COLOR, weight: 1, opacity: 0.45, dashArray: '2 5' }}
              interactive={false}
            />
          ))}

        {(mode === 'project' || colorMode === 'project') &&
          projectBoundaries.map(({ projectId, hull }) => {
            const project = projects.find((item) => item.id === projectId);
            const projectParcels = parcels.filter((parcel) => parcel.projectId === projectId);
            const projectStatus = project ? getProjectCalculatedStatus(project, projectParcels, asOfDate).status : undefined;
            const color = mode === 'project'
              ? projectStatus === 'delayed' ? TONE_COLORS.danger : projectStatus === 'at_risk' ? TONE_COLORS.warning : projectStatus === 'complete' ? TONE_COLORS.success : TONE_COLORS.info
              : projectColorById.get(projectId) ?? TONE_COLORS.neutral;

            return (
              <Polygon
                key={projectId}
                positions={hull.map((point) => [point.lat, point.lng] as [number, number])}
                pathOptions={{ color, fillColor: color, fillOpacity: mode === 'project' ? 0.22 : 0.08, weight: 2 }}
              >
                {mode === 'project' && project && (
                  <Popup>
                    <strong>{project.name}</strong><br />
                    {projectStatus ?? 'on_track'} · {projectParcels.length} parcels<br />
                    <Link to={`/official/project/${project.id}`}>Open project command center</Link>
                  </Popup>
                )}
              </Polygon>
            );
          })}

        {mode === 'parcel' && <ParcelMarkers
          parcels={parcels}
          colorMode={colorMode}
          projectColorById={projectColorById}
          projectNameById={projectNameById}
          asOfDate={asOfDate}
        />}
      </MapContainer>

      {(mode === 'project' || colorMode === 'project') && projectIds.length > 0 && (
        <ul className="map-legend" aria-label="Project color legend">
          {projectIds.map((projectId) => (
            <li key={projectId}>
              <span
                className="map-legend-swatch"
                style={{ background: mode === 'project' ? TONE_COLORS.info : projectColorById.get(projectId) }}
              />
              {projectNameById.get(projectId) ?? projectId}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
