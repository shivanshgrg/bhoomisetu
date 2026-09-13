// Compute statistics from demo data for handbook/deck refresh
import { demoParcels, demoProjects } from '../src/domain/demoData';

// Total parcel count
const totalParcels = demoParcels.length;
console.log(`=== DATASET STATISTICS ===\n`);
console.log(`Total Parcels: ${totalParcels}`);

// Stage distribution
const stageDistribution: Record<string, number> = {};
demoParcels.forEach(p => {
  stageDistribution[p.currentStage] = (stageDistribution[p.currentStage] || 0) + 1;
});
console.log('\nStage Distribution:');
const stages = ['notification', 'survey', 'objection_review', 'valuation', 'compensation_approval', 'award', 'possession'];
stages.forEach(stage => {
  const count = stageDistribution[stage] || 0;
  console.log(`  ${stage}: ${count} (${(count/totalParcels*100).toFixed(1)}%)`);
});

// Compensation stats
const totalCompensationEstimate = demoParcels.reduce((sum, p) => sum + p.compensationEstimate, 0);
const totalCompensationPaid = demoParcels.reduce((sum, p) => sum + p.compensationPaid, 0);
const avgCompensation = totalCompensationEstimate / totalParcels;
console.log(`\nCompensation Statistics:`);
console.log(`  Total Estimated: ₹${(totalCompensationEstimate / 10000000).toFixed(2)} Cr`);
console.log(`  Total Paid: ₹${(totalCompensationPaid / 10000000).toFixed(2)} Cr`);
console.log(`  Average per Parcel: ₹${(avgCompensation / 100000).toFixed(2)} Lakh`);

// Area statistics
const totalArea = demoParcels.reduce((sum, p) => sum + p.areaHectares, 0);
const avgArea = totalArea / totalParcels;
console.log(`\nArea Statistics:`);
console.log(`  Total: ${totalArea.toFixed(2)} hectares`);
console.log(`  Average: ${(avgArea).toFixed(2)} hectares`);

// Project distribution
const projectDistribution: Record<string, number> = {};
demoParcels.forEach(p => {
  projectDistribution[p.projectId] = (projectDistribution[p.projectId] || 0) + 1;
});
console.log(`\nProject Distribution: ${Object.keys(projectDistribution).length} projects`);

// Document issues
const parcelsWithPendingDocs = demoParcels.filter(p => 
  p.documents.some(d => d.status === 'pending_verification')
).length;
const parcelsWithRejectedDocs = demoParcels.filter(p =>
  p.documents.some(d => d.status === 'rejected')
).length;

console.log(`\nDocument Status:`);
console.log(`  Parcels with pending docs: ${parcelsWithPendingDocs} (${(parcelsWithPendingDocs/totalParcels*100).toFixed(1)}%)`);
console.log(`  Parcels with rejected docs: ${parcelsWithRejectedDocs} (${(parcelsWithRejectedDocs/totalParcels*100).toFixed(1)}%)`);

// Objection statistics
const parcelsWithObjections = demoParcels.filter(p => p.objections.length > 0).length;
const totalObjections = demoParcels.reduce((sum, p) => sum + p.objections.length, 0);
console.log(`\nObjection Statistics:`);
console.log(`  Parcels with objections: ${parcelsWithObjections} (${(parcelsWithObjections/totalParcels*100).toFixed(1)}%)`);
console.log(`  Total objections: ${totalObjections}`);

// State distribution
const stateDistribution: Record<string, number> = {};
demoParcels.forEach(p => {
  const project = demoProjects.find(proj => proj.id === p.projectId);
  if (project) {
    stateDistribution[project.state] = (stateDistribution[project.state] || 0) + 1;
  }
});
console.log(`\nState Distribution: ${Object.keys(stateDistribution).length} states`);
Object.entries(stateDistribution).sort((a, b) => b[1] - a[1]).slice(0, 10).forEach(([state, count]) => {
  console.log(`  ${state}: ${count}`);
});

console.log(`\nProject Details (all projects):`);
demoProjects.forEach(p => {
  const count = projectDistribution[p.id] || 0;
  console.log(`  ${p.name}: ${count} parcels`);
});
