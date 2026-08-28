import { Link } from 'react-router-dom';
import { Button, Card, EmptyState, PageContainer, PageHeader } from '../components/ui';
import { useLanguage } from '../i18n/LanguageContext';
import { useSession } from '../i18n/SessionContext';
import { appRoleLabels, uiText } from '../i18n/translations';

export function AccessRestrictedPage() {
  const { session } = useSession();
  const { t } = useLanguage();
  const roleLabel = session ? t(appRoleLabels[session.role]) : undefined;

  return (
    <PageContainer>
      <PageHeader eyebrow={t(uiText.accessRestricted.eyebrow)} title={t(uiText.accessRestricted.title)} />
      <Card>
        <EmptyState
          title={t(uiText.accessRestricted.eyebrow)}
          description={
            roleLabel
              ? `${t(uiText.accessRestricted.signedInAsPrefix)} ${roleLabel}${t(uiText.accessRestricted.roleDescriptionSuffix)}`
              : t(uiText.accessRestricted.fallbackDescription)
          }
          action={
            <Link to="/">
              <Button type="button" variant="secondary">
                {t(uiText.accessRestricted.backToHome)}
              </Button>
            </Link>
          }
        />
      </Card>
    </PageContainer>
  );
}
