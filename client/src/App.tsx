import { useState, useEffect, useCallback } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area, Legend 
} from 'recharts';
import { 
  RefreshCw, Gauge, Activity, AlertTriangle, Calendar, CalendarDays,
  Bug, Timer, TrendingUp, Moon, Sun, ChevronDown, ChevronUp, Shield 
} from 'lucide-react';
import { Card, CardHeader, CardContent } from './components/Card';
import { Badge } from './components/Badge';
import { Progress } from './components/Progress';
import { Tooltip as InfoTooltip } from './components/Tooltip';
import { MultiSelect } from './components/MultiSelect';
import { WaitingItemsList } from './components/WaitingItemsList';
import { useApi, apiPost } from './hooks/useApi';
import { getLinearIssueUrl } from './utils/linear';

interface Team {
  id: string;
  key: string;
  name: string;
  organization?: {
    urlKey: string;
  };
}

interface Organization {
  id: string;
  name: string;
  urlKey: string;
}

interface TeamMember {
  id: string;
  name: string;
  email?: string;
  avatarUrl?: string;
}

interface Cycle {
  id: string;
  number: number;
  name: string;
  startsAt: string;
  endsAt: string;
  progress: number;
  completedAt?: string | null;
}

interface BugDetail {
  id: string;
  title: string;
  estimate: number;
  status: string;
  createdAt: string;
  completedAt: string | null;
  ageInDays: number;
  isResolved: boolean;
  isInSprintBug?: boolean;
}

interface FeatureDetail {
  id: string;
  title: string;
  estimate: number;
  status: string;
  createdAt: string;
}

interface WorkflowEfficiency {
  avgPickupTime: number;
  avgDevTime: number;
  avgReviewTime: number;
  avgTestTime: number;
  avgLeadTime: number;
  maxPickupTime: number;
  bottleneck: string;
  efficiencyScore: number;
  timeDistribution: {
    pickup: number;
    development: number;
    review: number;
    testing: number;
  };
  waitingItems: Array<{
    id: string;
    title: string;
    estimate: number;
    waitingDays: number;
    createdAt: string;
  }>;
  itemsWaitingPickup: number;
  totalAnalyzed: number;
}

interface ReviewMetrics {
  totalInReview: number;
  stuckInReview: number;
  avgDaysInReview: number;
  reviewThreshold: number;
  reviewVelocity: number;
  distribution: {
    '0-1 days': number;
    '1-2 days': number;
    '2-3 days': number;
    '3-5 days': number;
    '5+ days': number;
  };
  items: Array<{
    id: string;
    title: string;
    estimate: number;
    daysInReview: number;
    isStuck: boolean;
    assignee: string;
  }>;
  reviewBacklog: number;
  oldestReviewDays: number;
}

interface Metrics {
  cycleSuccess: number;
  velocity: number;
  flowEfficiency: number;
  carryOver: number;
  scopeChange: number;
  reviewMetrics?: ReviewMetrics;
  workflowEfficiency?: WorkflowEfficiency;
  breakdown?: {
    total: number;
    completed: number;
    inProgress: number;
    todo: number;
  };
  bugMetrics: {
    total: number;
    resolved: number;
    totalPoints: number;
    resolvedPoints: number;
    mttr: number;
    bugs: BugDetail[];
    firstTimeQuality?: number;
    bugRate?: number;
    bugDensity?: number;
    inSprintBugs?: number;
    featureCount?: number;
    features?: FeatureDetail[];
    qualityBreakdown?: {
      totalIssues: number;
      featureCount: number;
      bugCount: number;
      inSprintBugCount: number;
      preExistingBugCount: number;
    };
  };
  burndown: Array<{
    day: string;
    remaining: number;
    ideal: number;
    scope: number;
  }>;
  cfd: Array<{
    day: string;
    todo: number;
    inProgress: number;
    done: number;
    total: number;
  }>;
  workItemAge: Array<{
    id: string;
    title: string;
    age: number;
    assignee: string;
  }>;
  blockers: Array<{
    id: string;
    title: string;
    blockedDays: number;
    blockedBy?: string;
    isActuallyBlocked?: boolean;
  }>;
}

export default function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [selectedCycleId, setSelectedCycleId] = useState<string>('');
  const [selectedAssigneeIds, setSelectedAssigneeIds] = useState<string[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [showBugDetails, setShowBugDetails] = useState(false);
  const [showQualityAnalysis, setShowQualityAnalysis] = useState(false);
  const [qualityTab, setQualityTab] = useState<'features' | 'bugs'>('bugs');
  const [showReviewDetails, setShowReviewDetails] = useState(false);
  const [organizationUrlKey, setOrganizationUrlKey] = useState<string>('');

  const { data: teams } = useApi<Team[]>('/api/teams');
  const { data: organization } = useApi<Organization>('/api/organization');
  const { data: cycles, refetch: refetchCycles } = useApi<Cycle[]>(
    selectedTeamId ? `/api/cycles?teamId=${selectedTeamId}` : null
  );
  const { data: teamMembers } = useApi<TeamMember[]>(
    selectedTeamId ? `/api/teams/${selectedTeamId}/members` : null
  );
  const { data: metrics, refetch: refetchMetrics } = useApi<Metrics>(
    selectedCycleId 
      ? `/api/cycles/${selectedCycleId}/metrics${selectedAssigneeIds.length > 0 ? `?assigneeIds=${selectedAssigneeIds.join(',')}` : ''}`
      : null
  );

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    if (organization?.urlKey) {
      setOrganizationUrlKey(organization.urlKey);
    } else if (teams && teams.length > 0 && teams[0].organization?.urlKey) {
      setOrganizationUrlKey(teams[0].organization.urlKey);
    }
  }, [organization, teams]);

  useEffect(() => {
    if (teams && teams.length > 0 && !selectedTeamId) {
      setSelectedTeamId(teams[0].id);
    }
  }, [teams, selectedTeamId]);

  useEffect(() => {
    if (cycles && cycles.length > 0 && !selectedCycleId) {
      // Find active cycle (one with highest progress or first one)
      const activeCycle = cycles[0];
      setSelectedCycleId(activeCycle.id);
    }
  }, [cycles, selectedCycleId]);

  const handleRefresh = useCallback(async () => {
    if (!selectedTeamId) return;
    
    setRefreshing(true);
    try {
      await apiPost(`/api/refresh?teamId=${selectedTeamId}`);
      setLastRefresh(new Date());
      await refetchCycles();
      await refetchMetrics();
    } catch (error) {
      console.error('Refresh failed:', error);
    } finally {
      setRefreshing(false);
    }
  }, [selectedTeamId, refetchCycles, refetchMetrics]);

  const selectedTeam = teams?.find(t => t.id === selectedTeamId);
  const selectedCycle = cycles?.find(c => c.id === selectedCycleId);

  const formatSprintDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getDaysRemaining = (endDate: string) => {
    if (!endDate) return null;
    const end = new Date(endDate);
    const today = new Date();
    const diffTime = end.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div className="min-h-screen w-full bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100">
      <div className="max-w-7xl mx-auto px-5 py-6">
        <div className="flex flex-col gap-4 mb-6">
          {/* Header Row */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Scrum Dashboard</h1>
              <div className="flex flex-col gap-1">
                <p className="text-sm text-neutral-500">
                  {selectedTeam ? `${selectedTeam.name} · ${selectedCycle?.name || 'No cycle'}` : 'Select a team'}
                  {lastRefresh && ` · Last refresh: ${lastRefresh.toLocaleTimeString()}`}
                </p>
                {selectedCycle && (
                  <div className="flex items-center gap-3 text-xs text-neutral-600 dark:text-neutral-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatSprintDate(selectedCycle.startsAt)} - {formatSprintDate(selectedCycle.endsAt)}
                    </span>
                    {(() => {
                      const days = getDaysRemaining(selectedCycle.endsAt);
                      if (days === null) return null;
                      if (days < 0) return (
                        <Badge tone="gray" className="text-xs">
                          Sprint ended {Math.abs(days)} days ago
                        </Badge>
                      );
                      if (days === 0) return (
                        <Badge tone="red" className="text-xs">
                          Sprint ends today!
                        </Badge>
                      );
                      if (days <= 3) return (
                        <Badge tone="amber" className="text-xs">
                          {days} days remaining
                        </Badge>
                      );
                      return (
                        <Badge tone="green" className="text-xs">
                          {days} days remaining
                        </Badge>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={handleRefresh}
                disabled={!selectedTeamId || refreshing}
                className="px-4 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-50 flex items-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </button>

              <button 
                onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')} 
                className="p-2 rounded-xl border border-neutral-300 dark:border-neutral-700"
              >
                {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Filters Row */}
          <div className="flex flex-wrap items-center gap-3">
            <select 
              value={selectedTeamId} 
              onChange={(e) => setSelectedTeamId(e.target.value)}
              className="px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 min-w-[150px]"
            >
              <option value="">Select Team</option>
              {teams?.map(team => (
                <option key={team.id} value={team.id}>{team.name}</option>
              ))}
            </select>

            <select 
              value={selectedCycleId} 
              onChange={(e) => setSelectedCycleId(e.target.value)}
              className="px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 min-w-[150px]"
              disabled={!cycles || cycles.length === 0}
            >
              <option value="">Select Cycle</option>
              {cycles?.map(cycle => (
                <option key={cycle.id} value={cycle.id}>
                  {cycle.name} {!cycle.completedAt && '(Active)'}
                </option>
              ))}
            </select>

            <div className="min-w-[200px] max-w-[300px]">
              <MultiSelect
                options={teamMembers || []}
                selectedIds={selectedAssigneeIds}
                onChange={setSelectedAssigneeIds}
                placeholder="All Team Members"
                disabled={!teamMembers || teamMembers.length === 0}
              />
            </div>

            {selectedAssigneeIds.length > 0 && (
              <Badge tone="blue" className="ml-2">
                Filtered: {selectedAssigneeIds.length === 1 
                  ? teamMembers?.find(m => m.id === selectedAssigneeIds[0])?.name 
                  : `${selectedAssigneeIds.length} members`}
              </Badge>
            )}
          </div>
        </div>

        {!metrics ? (
          <div className="text-center py-20">
            <p className="text-neutral-500">
              {selectedTeamId ? 'Click Refresh to load data from Linear' : 'Select a team to get started'}
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader 
                  title="Sprint Health" 
                  subtitle="Actual completion status" 
                  icon={<Gauge className="w-5 h-5"/>} 
                  action={<InfoTooltip content="Percentage of story points completed. Formula: Completed Points / Total Sprint Points × 100. Note: Linear counts 'Ready for Release' as completed." />}
                />
                <CardContent>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm">{metrics.cycleSuccess}% complete</span>
                    <Badge tone={metrics.cycleSuccess >= 70 ? 'green' : metrics.cycleSuccess >= 40 ? 'amber' : 'red'}>
                      {metrics.cycleSuccess >= 70 ? 'On track' : metrics.cycleSuccess >= 40 ? 'Behind' : 'At risk'}
                    </Badge>
                  </div>
                  <Progress value={metrics.cycleSuccess} />
                  
                  {metrics.breakdown && (
                    <div className="mt-3 p-2 bg-neutral-100 dark:bg-neutral-800 rounded text-xs space-y-1">
                      <div className="flex justify-between">
                        <span className="text-neutral-500">Total scope:</span>
                        <span className="font-medium">{metrics.breakdown.total} pts</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-500">Completed:</span>
                        <span className="font-medium text-green-600">{metrics.breakdown.completed} pts ({metrics.cycleSuccess}%)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-500">In progress:</span>
                        <span className="font-medium text-blue-600">{metrics.breakdown.inProgress} pts ({Math.round(metrics.breakdown.inProgress / metrics.breakdown.total * 100)}%)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-500">To do:</span>
                        <span className="font-medium">{metrics.breakdown.todo} pts</span>
                      </div>
                    </div>
                  )}
                  
                  {selectedCycle && (
                    <div className="mt-3 pt-3 border-t border-neutral-200 dark:border-neutral-700">
                      <div className="flex items-center justify-between text-xs text-neutral-600 dark:text-neutral-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Sprint Progress
                        </span>
                        <span>
                          {(() => {
                            const start = new Date(selectedCycle.startsAt);
                            const end = new Date(selectedCycle.endsAt);
                            const today = new Date();
                            const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
                            const daysElapsed = Math.ceil((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
                            return `Day ${Math.min(daysElapsed, totalDays)} of ${totalDays}`;
                          })()}
                        </span>
                      </div>
                      <div className="mt-1">
                        <Progress 
                          value={(() => {
                            const start = new Date(selectedCycle.startsAt);
                            const end = new Date(selectedCycle.endsAt);
                            const today = new Date();
                            const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
                            const daysElapsed = Math.ceil((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
                            return Math.min(100, Math.max(0, (daysElapsed / totalDays) * 100));
                          })()}
                        />
                      </div>
                    </div>
                  )}
                  
                  <div className="mt-3 text-xs">
                    {metrics.carryOver > 50 && (
                      <div className="text-red-600 dark:text-red-400 font-medium mb-1">
                        ⚠️ High carry-over risk: ~{metrics.carryOver}% likely won't complete
                      </div>
                    )}
                    <div className="text-amber-600 dark:text-amber-400">
                      Note: Linear counts "Ready for Release" as completed
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 text-neutral-500 mb-2">
                        <Activity className="w-5 h-5" />
                        <span className="text-sm font-medium">Review Time Analysis</span>
                        <InfoTooltip content="Average time tickets spend in code review. Calculated from all items currently in review. Target: <2 days for healthy flow." />
                      </div>
                      <div className="text-2xl font-bold mb-1">
                        {metrics.reviewMetrics?.avgDaysInReview || 0} days
                      </div>
                      <div className="text-xs text-neutral-500">
                        avg review time • {metrics.reviewMetrics?.totalInReview || 0} in review
                      </div>
                      {metrics.reviewMetrics && metrics.reviewMetrics.stuckInReview > 0 && (
                        <div className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                          ⚠️ {metrics.reviewMetrics.stuckInReview} stuck &gt;2 days
                        </div>
                      )}
                    </div>
                    <Badge tone={
                      (metrics.reviewMetrics?.avgDaysInReview || 0) <= 1 ? 'green' : 
                      (metrics.reviewMetrics?.avgDaysInReview || 0) <= 2 ? 'amber' : 'red'
                    }>
                      {(metrics.reviewMetrics?.avgDaysInReview || 0) <= 1 ? 'Fast' : 
                       (metrics.reviewMetrics?.avgDaysInReview || 0) <= 2 ? 'Normal' : 'Slow'}
                    </Badge>
                  </div>
                  
                  {/* Review Details Drill-down */}
                  {metrics.reviewMetrics && metrics.reviewMetrics.items.length > 0 && (
                    <>
                      <div className="pt-3 mt-3 border-t">
                        <button
                          onClick={() => setShowReviewDetails(!showReviewDetails)}
                          className="flex items-center gap-2 text-sm font-medium hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors"
                        >
                          {showReviewDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          View Details ({metrics.reviewMetrics.items.length} items)
                        </button>
                      </div>
                      
                      {showReviewDetails && (
                        <div className="mt-3 space-y-3">
                          {/* Distribution */}
                          <div className="p-2 bg-neutral-100 dark:bg-neutral-800 rounded-lg text-xs">
                            <div className="font-medium mb-2">Review Time Distribution:</div>
                            <div className="space-y-1">
                              {Object.entries(metrics.reviewMetrics.distribution).map(([range, count]) => (
                                <div key={range} className="flex items-center justify-between">
                                  <span className="text-neutral-500">{range}:</span>
                                  <div className="flex items-center gap-2">
                                    <div className="w-20 bg-neutral-200 dark:bg-neutral-700 rounded-full h-2">
                                      <div 
                                        className={`h-2 rounded-full ${
                                          range === '0-1 days' ? 'bg-green-500' :
                                          range === '1-2 days' ? 'bg-blue-500' :
                                          range === '2-3 days' ? 'bg-amber-500' :
                                          range === '3-5 days' ? 'bg-orange-500' :
                                          'bg-red-500'
                                        }`}
                                        style={{ width: `${(count / metrics.reviewMetrics!.totalInReview) * 100}%` }}
                                      />
                                    </div>
                                    <span className="font-medium w-8 text-right">{count}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                          
                          {/* Items in Review */}
                          <div className="max-h-64 overflow-y-auto space-y-2">
                            {metrics.reviewMetrics.items.map(item => (
                              <div 
                                key={item.id} 
                                className="p-2 rounded-lg border border-neutral-200 dark:border-neutral-700 text-xs"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                      <a 
                                        href={getLinearIssueUrl(item.id, organizationUrlKey)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="font-medium text-blue-600 dark:text-blue-400 hover:underline"
                                      >
                                        {item.id}
                                      </a>
                                      {item.estimate > 0 && (
                                        <Badge tone="blue">{item.estimate} pts</Badge>
                                      )}
                                      <Badge 
                                        tone={item.isStuck ? 'red' : 
                                              item.daysInReview > 1 ? 'amber' : 'green'}
                                      >
                                        {item.daysInReview}d in review
                                      </Badge>
                                      {item.isStuck && (
                                        <Badge tone="red">Stuck</Badge>
                                      )}
                                    </div>
                                    <p className="text-neutral-600 dark:text-neutral-400 truncate mt-1">
                                      {item.title}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                          
                          {/* Summary Stats */}
                          <div className="p-2 bg-neutral-100 dark:bg-neutral-800 rounded-lg text-xs space-y-1">
                            <div className="flex justify-between">
                              <span className="text-neutral-500">Oldest in review:</span>
                              <span className="font-medium text-red-600">{metrics.reviewMetrics.oldestReviewDays} days</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-neutral-500">Review backlog:</span>
                              <span className="font-medium">{metrics.reviewMetrics.reviewBacklog} pts</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-neutral-500">Review velocity:</span>
                              <span className="font-medium">{metrics.reviewMetrics.reviewVelocity} items/day</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardContent>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 text-neutral-500 mb-2">
                        <TrendingUp className="w-5 h-5" />
                        <span className="text-sm font-medium">Flow Efficiency</span>
                        <InfoTooltip content="Percentage of work that completes vs gets stuck. Formula: Completed / (Completed + In Progress) × 100. Low values indicate bottlenecks." />
                      </div>
                      <div className="text-2xl font-bold mb-1">
                        {metrics.flowEfficiency}%
                      </div>
                      <div className="text-xs text-neutral-500">
                        {metrics.breakdown && (
                          <span>{metrics.breakdown.completed} done / {metrics.breakdown.completed + metrics.breakdown.inProgress} started</span>
                        )}
                      </div>
                      {metrics.flowEfficiency < 30 && (
                        <div className="mt-2 text-xs text-red-600 dark:text-red-400">
                          🚨 Bottleneck detected!
                        </div>
                      )}
                    </div>
                    <Badge tone={metrics.flowEfficiency >= 50 ? 'green' : metrics.flowEfficiency >= 30 ? 'amber' : 'red'}>
                      {metrics.flowEfficiency >= 50 ? 'Good' : metrics.flowEfficiency >= 30 ? 'Poor' : 'Critical'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 text-neutral-500 mb-2">
                        <Shield className="w-5 h-5" />
                        <span className="text-sm font-medium">First Time Quality</span>
                        <InfoTooltip content="Percentage of work that doesn't generate bugs. Formula: Features / (Features + Bugs) × 100. Higher is better. Target: >85%." />
                      </div>
                      <div className="text-2xl font-bold mb-1">
                        {metrics.bugMetrics.firstTimeQuality || 0}%
                      </div>
                      <div className="text-xs text-neutral-500">
                        {metrics.bugMetrics.featureCount || 0} features, {metrics.bugMetrics.total || 0} bugs
                      </div>
                      {metrics.bugMetrics.inSprintBugs && metrics.bugMetrics.inSprintBugs > 0 && (
                        <div className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                          🐛 {metrics.bugMetrics.inSprintBugs} bugs found this sprint
                        </div>
                      )}
                    </div>
                    <Badge tone={
                      (metrics.bugMetrics.firstTimeQuality || 0) >= 85 ? 'green' : 
                      (metrics.bugMetrics.firstTimeQuality || 0) >= 70 ? 'amber' : 'red'
                    }>
                      {(metrics.bugMetrics.firstTimeQuality || 0) >= 85 ? 'Excellent' : 
                       (metrics.bugMetrics.firstTimeQuality || 0) >= 70 ? 'Good' : 'Poor'}
                    </Badge>
                  </div>
                  
                  {/* Quality Analysis Drill-down */}
                  {(metrics.bugMetrics.features || metrics.bugMetrics.bugs) && (
                    <>
                      <div className="pt-3 mt-3 border-t">
                        <button
                          onClick={() => setShowQualityAnalysis(!showQualityAnalysis)}
                          className="flex items-center gap-2 text-sm font-medium hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors"
                        >
                          {showQualityAnalysis ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          View Analysis Details
                        </button>
                      </div>
                      
                      {showQualityAnalysis && (
                        <div className="mt-3 space-y-3">
                          {/* Breakdown Summary */}
                          {metrics.bugMetrics.qualityBreakdown && (
                            <div className="p-2 bg-neutral-100 dark:bg-neutral-800 rounded-lg text-xs space-y-1">
                              <div className="font-medium mb-1">Quality Calculation:</div>
                              <div className="flex justify-between">
                                <span className="text-neutral-500">Total Issues:</span>
                                <span className="font-medium">{metrics.bugMetrics.qualityBreakdown.totalIssues}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-neutral-500">Features:</span>
                                <span className="font-medium text-green-600">{metrics.bugMetrics.qualityBreakdown.featureCount}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-neutral-500">Bugs (Total):</span>
                                <span className="font-medium text-red-600">{metrics.bugMetrics.qualityBreakdown.bugCount}</span>
                              </div>
                              <div className="flex justify-between ml-2">
                                <span className="text-neutral-500">- In-Sprint:</span>
                                <span className="text-amber-600">{metrics.bugMetrics.qualityBreakdown.inSprintBugCount}</span>
                              </div>
                              <div className="flex justify-between ml-2">
                                <span className="text-neutral-500">- Pre-existing:</span>
                                <span className="text-neutral-600">{metrics.bugMetrics.qualityBreakdown.preExistingBugCount}</span>
                              </div>
                              <div className="border-t mt-1 pt-1 font-medium">
                                Quality = {metrics.bugMetrics.qualityBreakdown.featureCount} / {metrics.bugMetrics.qualityBreakdown.totalIssues} = {metrics.bugMetrics.firstTimeQuality}%
                              </div>
                            </div>
                          )}
                          
                          {/* Tabs */}
                          <div className="flex gap-2">
                            <button
                              onClick={() => setQualityTab('features')}
                              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                                qualityTab === 'features' 
                                  ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300' 
                                  : 'bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                              }`}
                            >
                              Features ({metrics.bugMetrics.featureCount || 0})
                            </button>
                            <button
                              onClick={() => setQualityTab('bugs')}
                              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                                qualityTab === 'bugs' 
                                  ? 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300' 
                                  : 'bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                              }`}
                            >
                              Bugs ({metrics.bugMetrics.total || 0})
                            </button>
                          </div>
                          
                          {/* Content */}
                          <div className="max-h-64 overflow-y-auto space-y-2">
                            {qualityTab === 'features' && metrics.bugMetrics.features ? (
                              metrics.bugMetrics.features.length === 0 ? (
                                <p className="text-xs text-neutral-500">No features found</p>
                              ) : (
                                metrics.bugMetrics.features.map((feature: FeatureDetail) => (
                                  <div 
                                    key={feature.id} 
                                    className="p-2 rounded-lg border border-neutral-200 dark:border-neutral-700 text-xs"
                                  >
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                          <a 
                                            href={getLinearIssueUrl(feature.id, organizationUrlKey)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="font-medium text-blue-600 dark:text-blue-400 hover:underline"
                                          >
                                            {feature.id}
                                          </a>
                                          {feature.estimate > 0 && (
                                            <Badge tone="blue">{feature.estimate} pts</Badge>
                                          )}
                                        </div>
                                        <p className="text-neutral-600 dark:text-neutral-400 truncate mt-1">
                                          {feature.title}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                ))
                              )
                            ) : qualityTab === 'bugs' && metrics.bugMetrics.bugs ? (
                              metrics.bugMetrics.bugs.length === 0 ? (
                                <p className="text-xs text-neutral-500">No bugs found</p>
                              ) : (
                                metrics.bugMetrics.bugs.map((bug: BugDetail) => (
                                  <div 
                                    key={bug.id} 
                                    className="p-2 rounded-lg border border-neutral-200 dark:border-neutral-700 text-xs"
                                  >
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                          <a 
                                            href={getLinearIssueUrl(bug.id, organizationUrlKey)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="font-medium text-blue-600 dark:text-blue-400 hover:underline"
                                          >
                                            {bug.id}
                                          </a>
                                          {bug.estimate > 0 && (
                                            <Badge tone="blue">{bug.estimate} pts</Badge>
                                          )}
                                          <Badge 
                                            tone={bug.isResolved ? 'green' : 
                                                  bug.ageInDays > 7 ? 'red' : 
                                                  bug.ageInDays > 3 ? 'amber' : 'gray'}
                                          >
                                            {bug.isResolved ? 'Resolved' : `${bug.ageInDays}d old`}
                                          </Badge>
                                          {bug.isInSprintBug && (
                                            <Badge tone="amber">In-Sprint</Badge>
                                          )}
                                        </div>
                                        <p className="text-neutral-600 dark:text-neutral-400 truncate mt-1">
                                          {bug.title}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                ))
                              )
                            ) : (
                              <p className="text-xs text-neutral-500">No data available</p>
                            )}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-6">
              <Card className="lg:col-span-2">
                <CardHeader 
                  title="Burndown" 
                  subtitle={selectedCycle ? `${formatSprintDate(selectedCycle.startsAt)} - ${formatSprintDate(selectedCycle.endsAt)}` : "Points remaining per day"} 
                  icon={<Calendar className="w-5 h-5"/>}
                  action={metrics.scopeChange > 0 && <Badge tone="amber">Scope increased</Badge>}
                />
                <CardContent className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={metrics.burndown} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                      <XAxis dataKey="day" fontSize={12} />
                      <YAxis fontSize={12} />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="remaining" stroke="#10b981" strokeWidth={2} dot={false} name="Remaining" />
                      <Line type="monotone" dataKey="ideal" stroke="#94a3b8" strokeDasharray="4 4" dot={false} name="Ideal" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader 
                  title="Bug Metrics" 
                  subtitle="Created vs resolved" 
                  icon={<Bug className="w-5 h-5"/>}
                  action={
                    <Badge tone={metrics.bugMetrics.mttr <= 2 ? 'green' : 'amber'}>
                      MTTR {metrics.bugMetrics.mttr}d
                    </Badge>
                  }
                />
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Total Bugs</span>
                      <span className="font-semibold">{metrics.bugMetrics.total}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Resolved</span>
                      <span className="font-semibold text-emerald-600">{metrics.bugMetrics.resolved}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Open</span>
                      <span className="font-semibold text-rose-600">
                        {metrics.bugMetrics.total - metrics.bugMetrics.resolved}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Bug Density</span>
                      <span className="font-semibold">{metrics.bugMetrics.bugDensity || 0}%</span>
                    </div>
                    <div className="pt-3 border-t">
                      <div className="text-xs text-neutral-500">Mean Time to Resolution</div>
                      <div className="text-2xl font-semibold mt-1">{metrics.bugMetrics.mttr} days</div>
                    </div>
                    
                    {metrics.bugMetrics.bugs && metrics.bugMetrics.bugs.length > 0 && (
                      <>
                        <div className="pt-3 border-t">
                          <button
                            onClick={() => setShowBugDetails(!showBugDetails)}
                            className="flex items-center gap-2 text-sm font-medium hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors"
                          >
                            {showBugDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            View Details ({metrics.bugMetrics.bugs.length} bugs)
                          </button>
                        </div>
                        
                        {showBugDetails && (
                          <div className="max-h-64 overflow-y-auto space-y-2">
                            {metrics.bugMetrics.bugs.map(bug => (
                              <div 
                                key={bug.id} 
                                className="p-2 rounded-lg border border-neutral-200 dark:border-neutral-700 text-xs"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                      <a 
                                        href={getLinearIssueUrl(bug.id, organizationUrlKey)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="font-medium text-blue-600 dark:text-blue-400 hover:underline"
                                      >
                                        {bug.id}
                                      </a>
                                      {bug.estimate > 0 && (
                                        <Badge tone="blue">{bug.estimate} pts</Badge>
                                      )}
                                      <Badge 
                                        tone={bug.isResolved ? 'green' : 
                                              bug.ageInDays > 7 ? 'red' : 
                                              bug.ageInDays > 3 ? 'amber' : 'gray'}
                                      >
                                        {bug.isResolved ? 'Resolved' : `${bug.ageInDays}d old`}
                                      </Badge>
                                    </div>
                                    <p className="text-neutral-600 dark:text-neutral-400 truncate mt-1">
                                      {bug.title}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
              <Card className="lg:col-span-2">
                <CardHeader 
                  title="Cumulative Flow Diagram" 
                  subtitle={selectedCycle ? `Work flow from ${formatSprintDate(selectedCycle.startsAt)}` : "Historical work flow"} 
                  icon={<CalendarDays className="w-5 h-5"/>}
                />
                <CardContent className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={metrics.cfd} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                      <XAxis dataKey="day" fontSize={12} />
                      <YAxis fontSize={12} />
                      <Tooltip 
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-white dark:bg-neutral-900 p-3 rounded-lg shadow-lg border border-neutral-200 dark:border-neutral-700">
                                <p className="font-semibold text-sm mb-1">{label}</p>
                                {data.date && (
                                  <p className="text-xs text-neutral-500 mb-2">{new Date(data.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</p>
                                )}
                                <div className="space-y-1">
                                  <div className="flex justify-between gap-4 text-xs">
                                    <span className="text-neutral-500">To Do:</span>
                                    <span className="font-medium">{data.todo} pts</span>
                                  </div>
                                  <div className="flex justify-between gap-4 text-xs">
                                    <span className="text-neutral-500">In Progress:</span>
                                    <span className="font-medium text-blue-600">{data.inProgress} pts</span>
                                  </div>
                                  <div className="flex justify-between gap-4 text-xs">
                                    <span className="text-neutral-500">Done:</span>
                                    <span className="font-medium text-green-600">{data.done} pts</span>
                                  </div>
                                  <div className="flex justify-between gap-4 text-xs pt-1 border-t border-neutral-200 dark:border-neutral-700">
                                    <span className="text-neutral-500">Total:</span>
                                    <span className="font-semibold">{data.total} pts</span>
                                  </div>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Legend />
                      <Area type="monotone" dataKey="todo" stackId="1" stroke="#94a3b8" fill="#94a3b8" name="To Do" />
                      <Area type="monotone" dataKey="inProgress" stackId="1" stroke="#60a5fa" fill="#60a5fa" name="In Progress (All Active Work)" />
                      <Area type="monotone" dataKey="done" stackId="1" stroke="#10b981" fill="#10b981" name="Done" />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader 
                  title="Workflow Efficiency" 
                  subtitle="Lead time breakdown analysis" 
                  icon={<Timer className="w-5 h-5"/>} 
                />
                <CardContent>
                  {metrics.workflowEfficiency ? (
                    <div className="space-y-3">
                      {/* Efficiency Score */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <span className="text-sm font-medium">Efficiency Score</span>
                          <InfoTooltip content="Calculated as: (Ideal Lead Time / Actual Avg Lead Time) × 100. Ideal = 5 days. Higher score means faster delivery." />
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-neutral-200 dark:bg-neutral-700 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${
                                metrics.workflowEfficiency.efficiencyScore >= 80 ? 'bg-green-500' :
                                metrics.workflowEfficiency.efficiencyScore >= 60 ? 'bg-amber-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${Math.min(100, metrics.workflowEfficiency.efficiencyScore)}%` }}
                            />
                          </div>
                          <span className="text-sm font-bold">{metrics.workflowEfficiency.efficiencyScore}%</span>
                        </div>
                      </div>
                      
                      {/* Bottleneck Alert */}
                      {metrics.workflowEfficiency.bottleneck && (
                        <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-lg text-xs">
                          <span className="text-red-600 dark:text-red-400 font-medium">
                            🚨 Bottleneck: {metrics.workflowEfficiency.bottleneck.charAt(0).toUpperCase() + metrics.workflowEfficiency.bottleneck.slice(1)}
                          </span>
                        </div>
                      )}
                      
                      {/* Lead Time Breakdown */}
                      <div className="space-y-2">
                        <div className="text-xs font-medium text-neutral-600 dark:text-neutral-400">Avg Time by Stage:</div>
                        
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-1">
                              <span className="text-neutral-500">Pickup Wait</span>
                              <InfoTooltip content="Time from ticket creation until work starts. Calculated as: (Started Date - Created Date) for all issues. High values indicate capacity or prioritization issues." />
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge tone={metrics.workflowEfficiency.avgPickupTime > 3 ? 'red' : metrics.workflowEfficiency.avgPickupTime > 1 ? 'amber' : 'green'}>
                                {metrics.workflowEfficiency.avgPickupTime}d
                              </Badge>
                              <span className="text-neutral-400">({metrics.workflowEfficiency.timeDistribution.pickup}%)</span>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-1">
                              <span className="text-neutral-500">Development</span>
                              <InfoTooltip content="Time spent in 'In Progress' state. Calculated from when work starts until moved to review. High values may indicate complex work or unclear requirements." />
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge tone={metrics.workflowEfficiency.avgDevTime > 5 ? 'red' : metrics.workflowEfficiency.avgDevTime > 3 ? 'amber' : 'green'}>
                                {metrics.workflowEfficiency.avgDevTime}d
                              </Badge>
                              <span className="text-neutral-400">({metrics.workflowEfficiency.timeDistribution.development}%)</span>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-1">
                              <span className="text-neutral-500">Review</span>
                              <InfoTooltip content="Time spent in 'In Review' state waiting for code review. High values indicate reviewer availability issues or PR complexity." />
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge tone={metrics.workflowEfficiency.avgReviewTime > 2 ? 'red' : metrics.workflowEfficiency.avgReviewTime > 1 ? 'amber' : 'green'}>
                                {metrics.workflowEfficiency.avgReviewTime}d
                              </Badge>
                              <span className="text-neutral-400">({metrics.workflowEfficiency.timeDistribution.review}%)</span>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-1">
                              <span className="text-neutral-500">Testing</span>
                              <InfoTooltip content="Time spent in 'In Testing' state. High values may indicate QA bottlenecks, test environment issues, or quality problems requiring rework." />
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge tone={metrics.workflowEfficiency.avgTestTime > 3 ? 'red' : metrics.workflowEfficiency.avgTestTime > 1 ? 'amber' : 'green'}>
                                {metrics.workflowEfficiency.avgTestTime}d
                              </Badge>
                              <span className="text-neutral-400">({metrics.workflowEfficiency.timeDistribution.testing}%)</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Total Lead Time */}
                      <div className="pt-2 border-t">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-medium">Avg Total Lead Time</span>
                            <InfoTooltip content="Total time from ticket creation to completion. This is the key metric for delivery speed. Target: <7 days for most teams." />
                          </div>
                          <Badge tone={metrics.workflowEfficiency.avgLeadTime > 10 ? 'red' : metrics.workflowEfficiency.avgLeadTime > 7 ? 'amber' : 'green'}>
                            {metrics.workflowEfficiency.avgLeadTime} days
                          </Badge>
                        </div>
                      </div>
                      
                      {/* Items Waiting for Pickup */}
                      {metrics.workflowEfficiency.itemsWaitingPickup > 0 && (
                        <div className="pt-2 border-t">
                          <div className="text-xs font-medium text-amber-600 dark:text-amber-400 mb-2">
                            ⚠️ {metrics.workflowEfficiency.itemsWaitingPickup} {metrics.workflowEfficiency.itemsWaitingPickup === 1 ? 'item' : 'items'} waiting to be picked up
                          </div>
                          {metrics.workflowEfficiency.waitingItems.length > 0 && (
                            <WaitingItemsList 
                              items={metrics.workflowEfficiency.waitingItems}
                              getLinearIssueUrl={getLinearIssueUrl}
                              organizationUrlKey={organizationUrlKey}
                            />
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-neutral-500 text-sm">No workflow data available</p>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4 mb-8">
              <Card>
                <CardHeader 
                  title="Blockers & Stuck Items" 
                  subtitle={`${metrics.blockers.length} issues needing attention`}
                  icon={<AlertTriangle className="w-5 h-5"/>} 
                />
                <CardContent>
                  <div className="space-y-3">
                    <div className="text-xs text-neutral-500 p-2 bg-neutral-100 dark:bg-neutral-800 rounded-lg">
                      <div className="flex items-start gap-2 mb-1">
                        <span className="font-medium">🔴 Blocked:</span>
                        <span>Issues with explicit blocking dependencies in Linear</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="font-medium">🟡 Stuck:</span>
                        <span>Issues in progress for more than 5 days without status change</span>
                      </div>
                    </div>
                    
                    <div className="max-h-96 overflow-y-auto space-y-2">
                      {metrics.blockers.length === 0 ? (
                        <p className="text-neutral-500 text-sm">No blockers or stuck items identified</p>
                      ) : (
                        metrics.blockers.map(blocker => (
                          <div key={blocker.id} className="flex items-center justify-between p-2 rounded-lg border border-neutral-200 dark:border-neutral-700 text-sm">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <a 
                                  href={getLinearIssueUrl(blocker.id, organizationUrlKey)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="font-medium text-blue-600 dark:text-blue-400 hover:underline text-sm"
                                >
                                  {blocker.id}
                                </a>
                                {blocker.blockedBy && (
                                  <span className="text-xs text-neutral-500">
                                    blocked by {blocker.blockedBy}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-neutral-500 truncate">{blocker.title}</p>
                            </div>
                            <Badge tone={blocker.isActuallyBlocked ? "red" : "amber"}>
                              {blocker.isActuallyBlocked ? "Blocked" : "Stuck"} {blocker.blockedDays}d
                            </Badge>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  );
}