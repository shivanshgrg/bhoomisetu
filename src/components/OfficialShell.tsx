import type { ReactNode } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';
import { uiText, type TranslationEntry } from '../i18n/translations';

type SidebarItem = {
  to: string;
  label: TranslationEntry;
  end?: boolean;
};

// Overview and Reports each get their own destination; Projects and R&R are
// deliberately the same destination (the National Dashboard already covers
// both project progress and R&R rollups — there's no separate R&R page yet).
const SIDEBAR_ITEMS: SidebarItem[] = [
  { to: '/official', label: uiText.officialShell.overviewLabel, end: true },
  { to: '/official/action-center', label: uiText.officialShell.actionCenterLabel },
  { to: '/official/national', label: uiText.officialShell.projectsLabel },
  { to: '/official/national', label: uiText.officialShell.rAndRLabel },
  { to: '/official/reports', label: uiText.officialShell.reportsLabel },
];

type OfficialShellProps = {
  // When provided, renders these instead of the routed <Outlet/>. Used only
  // by the unguarded `/official/access-restricted` route so it can share
  // this shell's sidebar chrome without being nested inside the RequireRole-
  // guarded route subtree (nesting it there would redirect back to itself
  // for any role outside OFFICIAL_ROLES, looping forever).
  children?: ReactNode;
};

export function OfficialShell({ children }: OfficialShellProps) {
  const { t } = useLanguage();

  return (
    <div className="official-shell">
      <aside className="official-sidebar" aria-label="Official navigation">
        <nav>
          {SIDEBAR_ITEMS.map((item) => (
            <NavLink
              className={({ isActive }) => (isActive ? 'sidebar-link active' : 'sidebar-link')}
              end={item.end}
              key={`${item.to}-${item.label.en}`}
              to={item.to}
            >
              {t(item.label)}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="official-content">{children ?? <Outlet />}</div>
    </div>
  );
}
