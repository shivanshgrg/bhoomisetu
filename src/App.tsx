import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { OfficialShell } from './components/OfficialShell';
import { RequireRole } from './components/RequireRole';
import { AccessRestrictedPage } from './pages/AccessRestrictedPage';
import { ActionCenterPage } from './pages/ActionCenterPage';
import { AuditExportPage } from './pages/AuditExportPage';
import { AuthPage } from './pages/AuthPage';
import { BulkImportPage } from './pages/BulkImportPage';
import { CompensationPage } from './pages/CompensationPage';
import { DocumentReviewQueuePage } from './pages/DocumentReviewQueuePage';
import { DemoModePage } from './pages/DemoModePage';
import { LandingPage } from './pages/LandingPage';
import { LandownerPage } from './pages/LandownerPage';
import { LandownerStatusPage } from './pages/LandownerStatusPage';
import { NationalDashboardPage } from './pages/NationalDashboardPage';
import { NoticeGeneratorPage } from './pages/NoticeGeneratorPage';
import { ObjectionFilingPage } from './pages/ObjectionFilingPage';
import { OfficialPage } from './pages/OfficialPage';
import { ParcelDetailPage } from './pages/ParcelDetailPage';
import { ProjectCommandCenterPage } from './pages/ProjectCommandCenterPage';
import { ReportsPage } from './pages/ReportsPage';
import { RAndRPage } from './pages/RAndRPage';
import type { AppRole } from './domain';

// Any signed-in official-side role except landowner. `official`/`parcel/:id`
// (the district-scoped views) accept all four; `national` is further
// restricted below to the two roles that see the unscoped national rollup.
const OFFICIAL_ROLES: AppRole[] = ['national_admin', 'state_authority', 'district_officer', 'field_officer'];
const NATIONAL_ROLES: AppRole[] = ['national_admin', 'state_authority'];
const LANDOWNER_ROLES: AppRole[] = ['landowner'];

export default function App() {
  return (
    <Routes>
      <Route index element={<LandingPage />} />
      <Route path="auth" element={<AuthPage />} />
      <Route element={<AppShell />}>
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
          <Route path="parcel/:id" element={<RequireRole allowedRoles={['field_officer']}><ParcelDetailPage /></RequireRole>} />
          <Route path="project/:id" element={<ProjectCommandCenterPage />} />
          <Route path="parcel/:id/notice" element={<NoticeGeneratorPage />} />
          <Route path="parcel/:id/audit-export" element={<AuditExportPage />} />
          <Route path="action-center" element={<ActionCenterPage />} />
          <Route path="document-review" element={<DocumentReviewQueuePage />} />
          <Route path="demo" element={<DemoModePage />} />
          <Route path="compensation" element={<CompensationPage />} />
          <Route path="r-and-r" element={<RAndRPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="bulk-import" element={<BulkImportPage />} />
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
        <Route
          path="landowner"
          element={
            <RequireRole allowedRoles={LANDOWNER_ROLES}>
              <LandownerPage />
            </RequireRole>
          }
        />
        <Route
          path="landowner/status/:id"
          element={
            <RequireRole allowedRoles={LANDOWNER_ROLES}>
              <LandownerStatusPage />
            </RequireRole>
          }
        />
        <Route
          path="landowner/status/:id/objection-filing/:objectionId"
          element={
            <RequireRole allowedRoles={LANDOWNER_ROLES}>
              <ObjectionFilingPage />
            </RequireRole>
          }
        />
        <Route
          path="landowner/*"
          element={
            <RequireRole allowedRoles={LANDOWNER_ROLES}>
              <LandownerPage />
            </RequireRole>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
