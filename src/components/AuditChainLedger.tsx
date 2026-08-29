import { useEffect, useMemo, useState } from 'react';
import { buildAuditChain, isAuditChainSupported, verifyAuditChain, type AuditChainLink } from '../domain';
import type { StageHistoryEntry } from '../domain';
import { useLanguage } from '../i18n/LanguageContext';
import { officialRoleLabels, stageLabels, uiText } from '../i18n/translations';
import { Badge, Button, DataTable, EmptyState } from './ui';

type AuditChainLedgerProps = {
  history: StageHistoryEntry[];
};

const TAMPERED_NOTE_SUFFIX = ' [altered after sealing]';

function truncateHash(hash: string): string {
  return `${hash.slice(0, 10)}…`;
}

export function AuditChainLedger({ history }: AuditChainLedgerProps) {
  const { t } = useLanguage();
  const supported = useMemo(() => isAuditChainSupported(), []);
  const sortedHistory = useMemo(() => [...history].sort((first, second) => first.enteredOn.localeCompare(second.enteredOn)), [history]);

  const [sealedHashes, setSealedHashes] = useState<string[] | undefined>(undefined);
  const [displayHistory, setDisplayHistory] = useState<StageHistoryEntry[]>(sortedHistory);
  const [links, setLinks] = useState<AuditChainLink[] | undefined>(undefined);
  const [isTampered, setIsTampered] = useState(false);

  useEffect(() => {
    if (!supported) {
      return;
    }

    let isCancelled = false;

    setDisplayHistory(sortedHistory);
    setIsTampered(false);

    buildAuditChain(sortedHistory).then((sealedLinks) => {
      if (isCancelled) {
        return;
      }
      setSealedHashes(sealedLinks.map((link) => link.hash));
      setLinks(sealedLinks);
    });

    return () => {
      isCancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortedHistory, supported]);

  function handleSimulateTamper() {
    if (!sealedHashes || displayHistory.length === 0) {
      return;
    }

    const mutated = displayHistory.map((entry, index) =>
      index === 0 ? { ...entry, note: `${entry.note}${TAMPERED_NOTE_SUFFIX}` } : entry,
    );
    setDisplayHistory(mutated);
    setIsTampered(true);
    verifyAuditChain(mutated, sealedHashes).then(setLinks);
  }

  function handleReset() {
    if (!sealedHashes) {
      return;
    }
    setDisplayHistory(sortedHistory);
    setIsTampered(false);
    verifyAuditChain(sortedHistory, sealedHashes).then(setLinks);
  }

  if (!supported) {
    return (
      <DataTable
        caption={t(uiText.auditChain.historyCaption)}
        columns={[
          t(uiText.auditChain.colStage),
          t(uiText.auditChain.colEntered),
          t(uiText.auditChain.colExited),
          t(uiText.auditChain.colHandledBy),
          t(uiText.auditChain.colNote),
        ]}
        rows={sortedHistory.map((entry) => [
          t(stageLabels[entry.stage]),
          entry.enteredOn,
          entry.exitedOn ?? '—',
          t(officialRoleLabels[entry.handledByRole]),
          entry.note,
        ])}
      />
    );
  }

  if (sortedHistory.length === 0) {
    return <EmptyState title={t(uiText.auditChain.emptyTitle)} description={t(uiText.auditChain.emptyDescription)} />;
  }

  const validLinkCount = links?.filter((link) => link.isValid).length ?? 0;
  const allValid = links !== undefined && validLinkCount === links.length;

  return (
    <div className="audit-chain">
      <div className="audit-chain-status">
        <Badge tone={links === undefined ? 'neutral' : allValid ? 'success' : 'danger'}>
          {links === undefined
            ? t(uiText.auditChain.sealing)
            : `${allValid ? t(uiText.auditChain.chainVerifiedPrefix) : t(uiText.auditChain.chainBrokenPrefix)} ${validLinkCount} ${t(
                uiText.auditChain.ofWord,
              )} ${links.length} ${t(uiText.auditChain.linksIntactSuffix)}`}
        </Badge>
        <div className="audit-chain-actions">
          <Button type="button" variant="secondary" onClick={handleSimulateTamper} disabled={isTampered || links === undefined}>
            {t(uiText.auditChain.simulateTamperButton)}
          </Button>
          <Button type="button" variant="ghost" onClick={handleReset} disabled={!isTampered}>
            {t(uiText.auditChain.resetButton)}
          </Button>
        </div>
      </div>

      <ul className="audit-chain-list">
        {(links ?? []).map((link, index) => (
          <li key={link.entry.id} className={`audit-chain-item ${link.isValid ? '' : 'audit-chain-item-broken'}`}>
            <div className="audit-chain-item-header">
              <strong>{t(stageLabels[link.entry.stage])}</strong>
              <Badge tone={link.isValid ? 'success' : 'danger'}>
                {link.isValid ? t(uiText.auditChain.sealedBadge) : t(uiText.auditChain.brokenBadge)}
              </Badge>
            </div>
            <p>
              {link.entry.enteredOn} → {link.entry.exitedOn ?? t(uiText.auditChain.ongoingWord)} ·{' '}
              {t(officialRoleLabels[link.entry.handledByRole])}
            </p>
            <p>{link.entry.note}</p>
            <p className="audit-chain-hash">
              {t(uiText.auditChain.hashLabel)} <code>{truncateHash(link.hash)}</code>
              {index > 0 && (
                <>
                  {' '}
                  · {t(uiText.auditChain.prevHashLabel)} <code>{truncateHash(link.previousHash)}</code>
                </>
              )}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
