console.log('=== FLOW EFFICIENCY EXPLAINED ===\n');

// Your current sprint data
const data = {
  completed: 18,      // Points marked as "Done" or "Ready for Release"
  inProgress: 46,     // Points in "In Progress", "Review", "Testing"
  todo: 3,           // Points not started yet
  total: 67
};

console.log('📊 YOUR CURRENT SPRINT DATA:');
console.log('  Total Scope: 67 points');
console.log('  Completed: 18 points');
console.log('  In Progress: 46 points (In Progress, Review, Testing)');
console.log('  To Do: 3 points\n');

console.log('=== WHAT IS FLOW EFFICIENCY? ===\n');
console.log('Flow Efficiency measures how well work FLOWS through your process.');
console.log('It answers: "Of all the work we started, how much actually finished?"\n');

console.log('Formula:');
console.log('  Flow Efficiency = Completed / (Completed + In Progress) × 100%');
console.log('                  = Work that flowed through / All work that entered the system\n');

console.log('=== YOUR CALCULATION ===\n');
const flowEfficiency = (data.completed / (data.completed + data.inProgress)) * 100;
console.log(`  Flow Efficiency = ${data.completed} / (${data.completed} + ${data.inProgress})`);
console.log(`                  = ${data.completed} / ${data.completed + data.inProgress}`);
console.log(`                  = ${Math.round(flowEfficiency)}%\n`);

console.log('=== WHAT THIS MEANS ===\n');
console.log(`Your flow efficiency is ${Math.round(flowEfficiency)}%`);
console.log('This means:');
console.log(`  ✅ ${data.completed} points flowed all the way through to completion`);
console.log(`  🔄 ${data.inProgress} points entered the system but got STUCK`);
console.log(`  📊 Only ${Math.round(flowEfficiency)}% of started work actually finished\n`);

console.log('=== VISUAL REPRESENTATION ===\n');
console.log('Think of it like a highway:');
console.log('  🚗 64 cars entered the highway (18 completed + 46 in progress)');
console.log('  ✅ 18 cars reached their destination');
console.log('  🚦 46 cars are STUCK IN TRAFFIC on the highway');
console.log(`  📊 Only ${Math.round(flowEfficiency)}% made it through!\n`);

console.log('=== WHY IS THIS IMPORTANT? ===\n');
console.log('1. IDENTIFIES BOTTLENECKS:');
console.log('   - Your 28% efficiency means work is getting stuck');
console.log('   - Could be in Code Review, Testing, or Deployment stages\n');

console.log('2. PREDICTS PROBLEMS:');
console.log('   - With 46 points stuck, you likely won\'t finish the sprint');
console.log('   - These will carry over to next sprint\n');

console.log('3. ACTIONABLE INSIGHTS:');
console.log('   - Stop starting new work (you already have 46 in progress!)');
console.log('   - Focus on removing blockers for in-progress items');
console.log('   - Find out WHERE work is getting stuck\n');

console.log('=== FLOW EFFICIENCY BENCHMARKS ===\n');
console.log('🟢 GOOD (>50%):');
console.log('   Work flows smoothly, more completes than gets stuck\n');

console.log('🟡 POOR (30-50%):');
console.log('   Some bottlenecks, work accumulating in progress\n');

console.log('🔴 CRITICAL (<30%):');
console.log('   Severe bottlenecks, work is piling up and not completing');
console.log('   👉 YOUR TEAM IS HERE at 28%\n');

console.log('=== COMPARE TO OTHER METRICS ===\n');
console.log('• Sprint Health (27%): Shows what % of total scope is done');
console.log('• Flow Efficiency (28%): Shows what % of STARTED work is done');
console.log('• Different insights: Sprint Health = progress, Flow = process health\n');

console.log('=== ROOT CAUSES OF LOW FLOW EFFICIENCY ===\n');
console.log('Common causes in your case:');
console.log('1. Too much WIP (Work In Progress) - 46 points!');
console.log('2. Bottlenecks in review/testing stages');
console.log('3. Dependencies or blockers not resolved');
console.log('4. Starting too many items instead of finishing them\n');

console.log('=== WHAT SHOULD YOU DO? ===\n');
console.log('1. IMMEDIATE: Stop starting new work');
console.log('2. FOCUS: Get the 46 in-progress items completed');
console.log('3. INVESTIGATE: Where exactly are items stuck?');
console.log('   - How many in Code Review?');
console.log('   - How many in Testing?');
console.log('   - How many blocked?');
console.log('4. WIP LIMITS: Consider limiting work in progress');
console.log('5. DAILY STANDUPS: Focus on "what\'s blocking completion?"');