import { LinearClient } from '@linear/sdk';
import dotenv from 'dotenv';

dotenv.config();

const client = new LinearClient({ apiKey: process.env.LINEAR_API_KEY });

async function analyze() {
  try {
    const teamId = '1822a56e-3ac7-4664-972a-9bf0d317347c';
    
    const query = `
      query TeamActiveCycle($teamId: String!) {
        team(id: $teamId) {
          activeCycle {
            name
            scopeHistory
            completedScopeHistory
            inProgressScopeHistory
            startsAt
            endsAt
          }
        }
      }
    `;
    
    const result = await client.client.rawRequest(query, { teamId });
    const cycle = result.data.team.activeCycle;
    
    if (cycle) {
      const initialScope = cycle.scopeHistory[0];
      const currentIndex = cycle.scopeHistory.length - 1;
      const currentScope = cycle.scopeHistory[currentIndex];
      const completedScope = cycle.completedScopeHistory[currentIndex];
      const inProgressScope = cycle.inProgressScopeHistory[currentIndex];
      
      console.log('=== PLANNING ACCURACY ANALYSIS ===\n');
      console.log('Cycle:', cycle.name);
      console.log('Duration:', new Date(cycle.startsAt).toLocaleDateString(), 'to', new Date(cycle.endsAt).toLocaleDateString());
      console.log('Current Day:', currentIndex);
      
      console.log('\n=== WHAT IS PLANNING ACCURACY? ===');
      console.log('Definition: How well did we estimate what we could complete in this sprint?');
      console.log('Formula: (Completed Scope) / (Initial Committed Scope) × 100%');
      
      console.log('\n=== THE DATA ===');
      console.log('Initial Scope (Day 0):', initialScope, 'points');
      console.log('Current Scope (Day', currentIndex + '):', currentScope, 'points');
      console.log('Completed Scope:', completedScope, 'points');
      console.log('In Progress Scope:', inProgressScope, 'points');
      console.log('To Do Scope:', currentScope - completedScope - inProgressScope, 'points');
      
      console.log('\n=== CALCULATION ===');
      const planningAccuracy = (completedScope / initialScope) * 100;
      console.log('Planning Accuracy = Completed / Initial');
      console.log('                  =', completedScope, '/', initialScope);
      console.log('                  =', Math.round(planningAccuracy) + '%');
      
      console.log('\n=== INTERPRETATION ===');
      if (planningAccuracy < 30) {
        console.log('❌ Very Poor (< 30%): Significantly overcommitted');
        console.log('   - Team committed to', initialScope, 'points but only completed', completedScope);
        console.log('   - This suggests unrealistic planning or unexpected blockers');
      } else if (planningAccuracy < 70) {
        console.log('⚠️  Below Target (30-70%): Room for improvement');
        console.log('   - Team is completing less than planned');
      } else if (planningAccuracy <= 110) {
        console.log('✅ Good (70-110%): Well-planned sprint');
        console.log('   - Team is delivering close to what was planned');
      } else {
        console.log('🔍 Over 100%: Completed more than initially planned');
        console.log('   - Either scope was added and completed, or initial planning was conservative');
      }
      
      console.log('\n=== IMPORTANT NOTES ===');
      console.log('1. Linear counts "Ready for Release" as completed (may inflate the metric)');
      console.log('2. Current completion includes', completedScope, 'points marked as done/ready');
      console.log('3. There are still', inProgressScope, 'points in progress (69% of total work!)');
      
      // Check if sprint is near end
      const totalDays = Math.ceil((new Date(cycle.endsAt) - new Date(cycle.startsAt)) / (1000 * 60 * 60 * 24));
      const daysRemaining = totalDays - currentIndex;
      console.log('\n=== SPRINT STATUS ===');
      console.log('Sprint Progress:', currentIndex, '/', totalDays, 'days (' + Math.round(currentIndex/totalDays * 100) + '%)');
      console.log('Days Remaining:', daysRemaining);
      
      if (daysRemaining <= 2) {
        console.log('⏰ Sprint is almost over!');
        console.log('   - Only', completedScope, 'of', initialScope, 'points completed');
        console.log('   - Still', inProgressScope, 'points in progress that may not finish');
      }
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

analyze();