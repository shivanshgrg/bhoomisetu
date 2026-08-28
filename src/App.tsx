import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { LandingPage } from './pages/LandingPage';
import { LandownerPage } from './pages/LandownerPage';
import { LandownerStatusPage } from './pages/LandownerStatusPage';
import { NationalDashboardPage } from './pages/NationalDashboardPage';
import { OfficialPage } from './pages/OfficialPage';
import { ParcelDetailPage } from './pages/ParcelDetailPage';

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<LandingPage />} />
        <Route path="official" element={<OfficialPage />} />
        <Route path="official/national" element={<NationalDashboardPage />} />
        <Route path="official/parcel/:id" element={<ParcelDetailPage />} />
        <Route path="official/*" element={<OfficialPage />} />
        <Route path="landowner" element={<LandownerPage />} />
        <Route path="landowner/status/:id" element={<LandownerStatusPage />} />
        <Route path="landowner/*" element={<LandownerPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
