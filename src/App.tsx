import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { OfficialShell } from './components/OfficialShell';
import { RequireRole } from './components/RequireRole';
import { AccessRestrictedPage } from './pages/AccessRestrictedPage';
import { ActionCenterPage } from './pages/ActionCenterPage';
import { LandingPage } from './pages/LandingPage';
import { LandownerPage } from './pages/LandownerPage';
import { LandownerStatusPage } from './pages/LandownerStatusPage';
import { NationalDashboardPage } from './pages/NationalDashboardPage';
import { OfficialPage } from './pages/OfficialPage';
import { ParcelDetailPage } from './pages/ParcelDetailPage';
import { ReportsPage } from './pages/ReportsPage';
import type { AppRole } from './domain';

// Any signed-in official-side role except landowner. `official`/`parcel/:id`
// (the district-scoped views) accept all four; `national` is further
// restricted below to the two roles that see the unscoped national rollup.
const OFFICIAL_ROLES: AppRole[] = ['national_admin', 'state_authority', 'district_officer', 'field_officer'];
const NATIONAL_ROLES: AppRole[] = ['national_admin', 'state_authority'];

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<LandingPage />} />
        <Route
          path="official"
          element={
            <RequireRole allowedRoles={OFFICIAL_ROLES}>
              <OfficialShell />
            </RequireRole>
          }
        >
          <Route index element={<OfficialPage />} />
          <Route
            path="national"
            element={
              <RequireRole allowedRoles={NATIONAL_ROLES}>
                <NationalDashboardPage />
              </RequireRole>
            }
          />
          <Route path="parcel/:id" element={<ParcelDetailPage />} />
          <Route path="action-center" element={<ActionCenterPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="*" element={<OfficialPage />} />
        </Route>
        <Route
          path="official/access-restricted"
          element={
            <OfficialShell>
              <AccessRestrictedPage />
            </OfficialShell>
          }
        />
        <Route path="landowner" element={<LandownerPage />} />
        <Route path="landowner/status/:id" element={<LandownerStatusPage />} />
        <Route path="landowner/*" element={<LandownerPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
