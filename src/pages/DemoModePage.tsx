import { Link } from 'react-router-dom';
import { Button, Card, PageContainer, PageHeader } from '../components/ui';
import { clearWorkflowEvents } from '../data/workflowEvents';
import { isSupabaseConfigured } from '../lib/supabaseClient';

export function DemoModePage() {
  const canReset = !isSupabaseConfigured;
  return <PageContainer>
    <PageHeader eyebrow="Guided demonstration" title="BhoomiSetu Demo Mode" description="A repeatable judge walkthrough using the Pune–Nagpur hero project and Survey 124/7." />
    <Card eyebrow="01 · See the bottleneck" title="Open the project command center"><p>Start with the delayed Valuation stage, then use the risk-ranked action to open Survey 124/7.</p><Link to="/official/project/project-maharashtra-corridor"><Button>Open hero project</Button></Link></Card>
    <Card eyebrow="02 · Resolve the gate" title="Review the parcel’s required documents"><p>The command card states exactly what blocks progress. Upload/review controls and the document queue use the existing verification rules.</p><Link to="/official/parcel/parcel-124-7#current-stage-documents"><Button>Open hero parcel</Button></Link></Card>
    <Card eyebrow="03 · Show the citizen outcome" title="Open the landowner status view"><p>After a real successful workflow action, the landowner sees a safe status update. Private review notes and internal quality signals are never shown.</p><Link to="/landowner/status/parcel-124-7"><Button variant="secondary">Open citizen view</Button></Link></Card>
    <Card eyebrow="Reset" title="Return to the seeded demo baseline"><p>{canReset ? 'This clears presentation updates and reloads the local demo data. It never writes to Supabase.' : 'Reset is disabled because a live Supabase connection is configured.'}</p>{canReset && <Button variant="secondary" onClick={() => { clearWorkflowEvents(); window.location.reload(); }}>Reset demo session</Button>}</Card>
  </PageContainer>;
}
