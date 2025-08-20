import { LinearClient } from '@linear/sdk';
import dotenv from 'dotenv';

dotenv.config();

const client = new LinearClient({ apiKey: process.env.LINEAR_API_KEY });

async function test() {
  try {
    const teamId = '1822a56e-3ac7-4664-972a-9bf0d317347c';
    
    const query = `
      query TeamActiveCycle($teamId: String!) {
        team(id: $teamId) {
          id
          name
          activeCycle {
            id
            name
            progress
            scopeHistory
            completedScopeHistory
            inProgressScopeHistory
            issueCountHistory
            completedIssueCountHistory
          }
        }
      }
    `;
    
    const result = await client.client.rawRequest(query, { teamId });
    const cycle = result.data.team.activeCycle;
    
    if (cycle) {
      const lastIndex = cycle.scopeHistory.length - 1;
      console.log('Cycle:', cycle.name);
      console.log('\nFirst day (Day 0):');
      console.log('  Initial Scope:', cycle.scopeHistory[0]);
      console.log('  Completed:', cycle.completedScopeHistory[0]);
      console.log('  In Progress:', cycle.inProgressScopeHistory[0]);
      
      console.log('\nLast day (Day', lastIndex + '):');
      console.log('  Current Scope:', cycle.scopeHistory[lastIndex]);
      console.log('  Completed:', cycle.completedScopeHistory[lastIndex]);
      console.log('  In Progress:', cycle.inProgressScopeHistory[lastIndex]);
      
      // Calculate metrics
      const completed = cycle.completedScopeHistory[lastIndex];
      const inProgress = cycle.inProgressScopeHistory[lastIndex];
      const total = cycle.scopeHistory[lastIndex];
      const initial = cycle.scopeHistory[0];
      
      const cycleSuccess = ((completed + inProgress * 0.25) / total) * 100;
      const planningAccuracy = (completed / initial) * 100;
      
      console.log('\nCalculated Metrics:');
      console.log('  Cycle Success:', Math.round(cycleSuccess) + '%', `(${completed} completed + ${inProgress * 0.25} partial) / ${total} total`);
      console.log('  Planning Accuracy:', Math.round(planningAccuracy) + '%', `(${completed} completed / ${initial} initial)`);
      console.log('  Scope Change:', Math.round(((total - initial) / initial) * 100) + '%');
      
      // Check actual work distribution
      const remaining = total - completed;
      console.log('\nWork Distribution:');
      console.log('  Total Scope:', total, 'points');
      console.log('  Completed:', completed, 'points');
      console.log('  In Progress:', inProgress, 'points');
      console.log('  To Do (remaining):', remaining - inProgress, 'points');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

test();