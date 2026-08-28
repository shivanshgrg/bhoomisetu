import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { repository } from '../data';
import { getAlerts, type Alert, type ParcelOwner } from '../domain';
import { useLanguage } from '../i18n/LanguageContext';
import { uiText } from '../i18n/translations';
import { SmsPreviewPanel } from './SmsPreviewPanel';

export function NotificationCenter() {
  const { t } = useLanguage();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [ownersByParcelId, setOwnersByParcelId] = useState<Map<string, ParcelOwner>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  async function loadAlerts() {
    setIsLoading(true);
    const parcels = await repository.listParcels();
    setAlerts(getAlerts(parcels));
    setOwnersByParcelId(new Map(parcels.map((parcel) => [parcel.id, parcel.owner])));
    setIsLoading(false);
  }

  useEffect(() => {
    loadAlerts();
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    loadAlerts();

    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div className="notification-center" ref={panelRef}>
      <button
        className="nav-link notification-bell"
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        aria-label={`${t(uiText.notifications.bellLabel)} (${alerts.length})`}
      >
        <span aria-hidden="true">🔔</span>
        {alerts.length > 0 && <span className="notification-count">{alerts.length}</span>}
      </button>
      {isOpen && (
        <div className="notification-panel" role="menu">
          <p className="notification-panel-title">{t(uiText.notifications.panelTitle)}</p>
          {isLoading ? (
            <p className="notification-empty">{t(uiText.notifications.loading)}</p>
          ) : alerts.length === 0 ? (
            <p className="notification-empty">{t(uiText.notifications.emptyState)}</p>
          ) : (
            <ul className="notification-list">
              {alerts.map((alert) => {
                const owner = ownersByParcelId.get(alert.parcelId);
                return (
                  <li className={`notification-item notification-${alert.severity}`} key={alert.id}>
                    <Link to={`/official/parcel/${alert.parcelId}`} onClick={() => setIsOpen(false)}>
                      {alert.message}
                    </Link>
                    {owner && (
                      <SmsPreviewPanel
                        ownerLanguage={owner.preferredLanguage}
                        event={{
                          kind: 'alert',
                          surveyNumber: alert.surveyNumber,
                          alertType: alert.type,
                          detail: alert.message,
                        }}
                        triggerLabel={t(uiText.sms.triggerLabel)}
                      />
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
