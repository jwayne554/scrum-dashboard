// Latest state distribution from logs:
const stateDistribution = {
  "Todo -> unstarted": 3,
  "In Progress -> started": 13,
  "In Review -> review": 14,
  "In Testing -> testing": 19,
  "Ready For Release -> ready": 16,
  "Done -> completed": 2,
  "Canceled -> canceled": 0
};

// Linear's view (from cycle history):
const linearView = {
  todo: 3,
  inProgress: 46,
  done: 18,
  total: 67
};

console.log('=== STATE DISTRIBUTION ANALYSIS ===\n');

console.log('Actual states in Linear:');
console.log('  Todo:', stateDistribution["Todo -> unstarted"], 'points');
console.log('  In Progress:', stateDistribution["In Progress -> started"], 'points');
console.log('  In Review:', stateDistribution["In Review -> review"], 'points');
console.log('  In Testing:', stateDistribution["In Testing -> testing"], 'points');
console.log('  Ready for Release:', stateDistribution["Ready For Release -> ready"], 'points');
console.log('  Done:', stateDistribution["Done -> completed"], 'points');

const actualInProgress = 
  stateDistribution["In Progress -> started"] +
  stateDistribution["In Review -> review"] + 
  stateDistribution["In Testing -> testing"];

const actualCompleted = 
  stateDistribution["Done -> completed"] +
  stateDistribution["Ready For Release -> ready"];

console.log('\n=== THE PROBLEM ===\n');
console.log('Linear groups states as:');
console.log('  Todo:', linearView.todo, 'points (matches ✓)');
console.log('  In Progress:', linearView.inProgress, 'points');
console.log('    = In Progress (13) + In Review (14) + In Testing (19) = 46 ✓');
console.log('  Done:', linearView.done, 'points');
console.log('    = Done (2) + Ready for Release (16) = 18 ✓');

console.log('\n=== THE ISSUE ===\n');
console.log('Linear counts "Ready for Release" (16 points) as DONE');
console.log('But these tickets are NOT actually released/done!');
console.log('Only 2 points are truly "Done" in Linear');

console.log('\n=== CORRECTED METRICS ===\n');
const trueCompleted = stateDistribution["Done -> completed"];
const trueTotal = linearView.total;
const trueInitial = linearView.total; // assuming no scope change

console.log('If we only count truly DONE items:');
console.log('  Planning Accuracy:', Math.round((trueCompleted / trueInitial) * 100) + '%', `(${trueCompleted} truly done / ${trueInitial} initial)`);
console.log('  Actual Completion:', Math.round((trueCompleted / trueTotal) * 100) + '%', `(${trueCompleted} truly done / ${trueTotal} total)`);

console.log('\nIf we count Ready for Release as done (Linear\'s view):');
console.log('  Planning Accuracy:', Math.round((linearView.done / trueInitial) * 100) + '%', `(${linearView.done} / ${trueInitial} initial)`);
console.log('  Completion:', Math.round((linearView.done / trueTotal) * 100) + '%', `(${linearView.done} / ${trueTotal} total)`);