import { PrismaClient } from '@prisma/client';
import type { Issue, Cycle, CycleHistory } from '@prisma/client';

export class MetricsCalculator {
  constructor(private prisma: PrismaClient) {}

  async calculateCycleMetrics(cycleId: string, assigneeIds?: string[]) {
    const cycle = await this.prisma.cycle.findUnique({
      where: { id: cycleId },
      include: {
        histories: {
          orderBy: { dayIndex: 'asc' }
        },
        issues: {
          where: assigneeIds && assigneeIds.length > 0 ? { assigneeId: { in: assigneeIds } } : undefined,
          include: {
            labels: true
          }
        }
      }
    });

    if (!cycle) {
      throw new Error('Cycle not found');
    }

    // Always recalculate scope based on actual issue states to ensure consistency
    // Linear's history might count "ready" issues as in-progress even if they're completed
    const totalScope = cycle.issues.reduce((sum, issue) => sum + (issue.estimate || 0), 0);
    const completedScope = cycle.issues
      .filter(issue => issue.completedAt)
      .reduce((sum, issue) => sum + (issue.estimate || 0), 0);
    const inProgressScope = cycle.issues
      .filter(issue => !issue.completedAt && !issue.canceledAt && (issue.stateType === 'started' || issue.stateType === 'review' || issue.stateType === 'testing' || issue.stateType === 'ready'))
      .reduce((sum, issue) => sum + (issue.estimate || 0), 0);
    
    const effectiveHistory = {
      scope: totalScope,
      completedScope: completedScope,
      inProgressScope: inProgressScope
    };
    
    const metrics = {
      cycleSuccess: this.calculateCycleSuccess(cycle, assigneeIds),
      velocity: await this.calculateVelocity(cycle.teamId, assigneeIds),
      flowEfficiency: this.calculateFlowEfficiency(cycle, assigneeIds),
      carryOver: this.calculateCarryOver(cycle, assigneeIds),
      scopeChange: this.calculateScopeChange(cycle, assigneeIds),
      bugMetrics: this.calculateBugMetrics(cycle.issues),
      burndown: this.generateBurndownData(cycle, assigneeIds),
      cfd: this.generateCFDData(cycle, assigneeIds),
      workItemAge: this.calculateWorkItemAge(cycle.issues),
      workflowEfficiency: this.calculateWorkflowEfficiency(cycle.issues),
      blockers: this.findBlockers(cycle.issues),
      reviewMetrics: this.calculateReviewMetrics(cycle.issues),
      // Add breakdown for transparency
      breakdown: {
        total: effectiveHistory.scope || 0,
        completed: effectiveHistory.completedScope || 0,
        inProgress: effectiveHistory.inProgressScope || 0,
        todo: (effectiveHistory.scope || 0) - (effectiveHistory.completedScope || 0) - (effectiveHistory.inProgressScope || 0)
      },
      // Add filter information
      filteredBy: assigneeIds && assigneeIds.length > 0 ? { assigneeIds } : null
    };

    return metrics;
  }

  private calculateCycleSuccess(cycle: any, assigneeIds?: string[]): number {
    if (assigneeIds && assigneeIds.length > 0) {
      // Calculate based on filtered issues
      const totalScope = cycle.issues.reduce((sum: number, issue: any) => sum + (issue.estimate || 0), 0);
      const completedScope = cycle.issues
        .filter((issue: any) => issue.completedAt)
        .reduce((sum: number, issue: any) => sum + (issue.estimate || 0), 0);
      
      if (totalScope === 0) return 0;
      return Math.round((completedScope / totalScope) * 100);
    }
    
    if (cycle.histories.length === 0) return 0;
    
    const lastHistory = cycle.histories[cycle.histories.length - 1];
    const completed = lastHistory.completedScope;
    const inProgress = lastHistory.inProgressScope;
    const total = lastHistory.scope;
    
    if (total === 0) return 0;
    
    // More accurate calculation:
    // - Don't give arbitrary credit for in-progress work
    // - Show actual completion percentage
    // Note: Linear counts "Ready for Release" as completed, which may inflate this
    return Math.round((completed / total) * 100);
  }

  private async calculateVelocity(teamId: string, assigneeIds?: string[]): Promise<number> {
    const completedCycles = await this.prisma.cycle.findMany({
      where: {
        teamId,
        completedAt: { not: null }
      },
      orderBy: { completedAt: 'desc' },
      take: 3,
      include: {
        issues: {
          where: assigneeIds && assigneeIds.length > 0 ? { assigneeId: { in: assigneeIds } } : undefined
        }
      }
    });

    if (completedCycles.length === 0) return 0;

    const velocities = completedCycles.map(cycle => {
      return cycle.issues
        .filter(issue => issue.completedAt !== null)
        .reduce((sum, issue) => sum + (issue.estimate || 0), 0);
    });

    return Math.round(velocities.reduce((a, b) => a + b, 0) / velocities.length);
  }

  private calculateFlowEfficiency(cycle: any, assigneeIds?: string[]): number {
    // Flow Efficiency = Work Completed / (Work Completed + Work In Progress)
    // Shows how well work flows through the system
    // High WIP with low completion = poor flow = bottlenecks
    
    if (assigneeIds && assigneeIds.length > 0) {
      // Calculate based on filtered issues
      const completedScope = cycle.issues
        .filter((issue: any) => issue.completedAt)
        .reduce((sum: number, issue: any) => sum + (issue.estimate || 0), 0);
      const inProgressScope = cycle.issues
        .filter((issue: any) => !issue.completedAt && !issue.canceledAt && (issue.stateType === 'started' || issue.stateType === 'review' || issue.stateType === 'testing' || issue.stateType === 'ready'))
        .reduce((sum: number, issue: any) => sum + (issue.estimate || 0), 0);
      
      const totalActive = completedScope + inProgressScope;
      if (totalActive === 0) return 0;
      return Math.round((completedScope / totalActive) * 100);
    }
    
    if (cycle.histories.length === 0) return 0;
    
    const lastHistory = cycle.histories[cycle.histories.length - 1];
    const completed = lastHistory.completedScope || 0;
    const inProgress = lastHistory.inProgressScope || 0;
    
    const totalActive = completed + inProgress;
    if (totalActive === 0) return 0;
    
    // Return percentage of work that has flowed to completion
    return Math.round((completed / totalActive) * 100);
  }
  
  private calculateCarryOver(cycle: any, assigneeIds?: string[]): number {
    // Estimate how much work will carry over to next sprint
    // Based on current progress and time remaining
    
    if (assigneeIds && assigneeIds.length > 0) {
      // Calculate based on filtered issues
      const totalScope = cycle.issues.reduce((sum: number, issue: any) => sum + (issue.estimate || 0), 0);
      const completedScope = cycle.issues
        .filter((issue: any) => issue.completedAt)
        .reduce((sum: number, issue: any) => sum + (issue.estimate || 0), 0);
      const inProgressScope = cycle.issues
        .filter((issue: any) => !issue.completedAt && !issue.canceledAt && (issue.stateType === 'started' || issue.stateType === 'review' || issue.stateType === 'testing' || issue.stateType === 'ready'))
        .reduce((sum: number, issue: any) => sum + (issue.estimate || 0), 0);
      
      const todo = totalScope - completedScope - inProgressScope;
      
      if (totalScope === 0) return 0;
      
      // Estimate that most in-progress work won't complete (conservative)
      // Assume 25% of in-progress might complete
      const likelyCarryOver = todo + (inProgressScope * 0.75);
      
      return Math.round((likelyCarryOver / totalScope) * 100);
    }
    
    if (cycle.histories.length === 0) return 0;
    
    const lastHistory = cycle.histories[cycle.histories.length - 1];
    const inProgress = lastHistory.inProgressScope || 0;
    const todo = (lastHistory.scope || 0) - (lastHistory.completedScope || 0) - inProgress;
    const notCompleted = inProgress + todo;
    const total = lastHistory.scope || 0;
    
    if (total === 0) return 0;
    
    // Estimate that most in-progress work won't complete (conservative)
    // Assume 25% of in-progress might complete
    const likelyCarryOver = todo + (inProgress * 0.75);
    
    return Math.round((likelyCarryOver / total) * 100);
  }

  private calculateScopeChange(cycle: any, assigneeIds?: string[]): number {
    if (assigneeIds && assigneeIds.length > 0) {
      // For assignee filter, we can't really show scope change since 
      // we don't have historical data per assignee
      // Return 0 or could calculate based on current issues
      return 0;
    }
    
    if (cycle.histories.length === 0) return 0;
    
    const initialScope = cycle.histories[0].scope;
    const lastHistory = cycle.histories[cycle.histories.length - 1];
    const finalScope = lastHistory.scope;
    
    if (initialScope === 0) return 0;
    return Math.round(((finalScope - initialScope) / initialScope) * 100);
  }

  private calculateBugMetrics(issues: any[]) {
    const bugs = issues.filter(issue => 
      issue.labels.some((l: any) => l.label.toLowerCase() === 'bug')
    );

    const resolvedBugs = bugs.filter(bug => bug.completedAt !== null);
    
    // Separate features from bugs
    const features = issues.filter(issue => 
      !issue.labels.some((l: any) => l.label.toLowerCase() === 'bug')
    );
    
    // Calculate quality metrics
    const totalIssues = issues.length;
    const bugRate = totalIssues > 0 ? Math.round((bugs.length / totalIssues) * 100) : 0;
    const firstTimeQuality = 100 - bugRate; // Inverse of bug rate
    
    // Calculate bug density (bugs as % of total points)
    const totalPoints = issues.reduce((sum, i) => sum + (i.estimate || 0), 0);
    const bugPoints = bugs.reduce((sum, bug) => sum + (bug.estimate || 0), 0);
    const bugDensity = totalPoints > 0 ? Math.round((bugPoints / totalPoints) * 100) : 0;
    
    // Check for bugs created during this sprint (after sprint start)
    // Assuming sprint started ~2 weeks ago (we can make this more precise later)
    const sprintStartApprox = new Date();
    sprintStartApprox.setDate(sprintStartApprox.getDate() - 14);
    const inSprintBugs = bugs.filter(bug => 
      new Date(bug.createdAt) > sprintStartApprox
    );
    
    let mttr = 0;
    if (resolvedBugs.length > 0) {
      const totalTime = resolvedBugs.reduce((sum, bug) => {
        const created = new Date(bug.createdAt).getTime();
        const completed = new Date(bug.completedAt).getTime();
        return sum + (completed - created);
      }, 0);
      
      mttr = totalTime / resolvedBugs.length / (1000 * 60 * 60 * 24);
    }

    const resolvedPoints = resolvedBugs.reduce((sum, bug) => sum + (bug.estimate || 0), 0);

    // Create detailed bug list
    const bugDetails = bugs.map(bug => {
      const createdDate = new Date(bug.createdAt);
      const completedDate = bug.completedAt ? new Date(bug.completedAt) : null;
      const ageInDays = completedDate 
        ? (completedDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24)
        : (Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24);
      
      return {
        id: bug.identifier,
        title: bug.title,
        estimate: bug.estimate || 0,
        status: bug.stateType,
        createdAt: createdDate.toISOString(),
        completedAt: completedDate ? completedDate.toISOString() : null,
        ageInDays: Math.round(ageInDays * 10) / 10,
        isResolved: bug.completedAt !== null
      };
    }).sort((a, b) => {
      // Sort: unresolved first, then by age
      if (a.isResolved !== b.isResolved) {
        return a.isResolved ? 1 : -1;
      }
      return b.ageInDays - a.ageInDays;
    });

    // Create feature details for quality analysis
    const featureDetails = features.slice(0, 50).map(feature => ({
      id: feature.identifier,
      title: feature.title,
      estimate: feature.estimate || 0,
      status: feature.stateType,
      createdAt: new Date(feature.createdAt).toISOString()
    }));
    
    // Enhance bug details with sprint info
    const enhancedBugDetails = bugDetails.map(bug => ({
      ...bug,
      isInSprintBug: inSprintBugs.some(b => b.identifier === bug.id)
    }));
    
    return {
      total: bugs.length,
      resolved: resolvedBugs.length,
      totalPoints: bugPoints,
      resolvedPoints: resolvedPoints,
      mttr: Math.round(mttr * 10) / 10,
      bugs: enhancedBugDetails,
      // Quality metrics
      firstTimeQuality: firstTimeQuality,
      bugRate: bugRate,
      bugDensity: bugDensity,
      inSprintBugs: inSprintBugs.length,
      featureCount: features.length,
      // Detailed data for drill-down
      features: featureDetails,
      qualityBreakdown: {
        totalIssues: totalIssues,
        featureCount: features.length,
        bugCount: bugs.length,
        inSprintBugCount: inSprintBugs.length,
        preExistingBugCount: bugs.length - inSprintBugs.length
      }
    };
  }

  private generateBurndownData(cycle: any, assigneeIds?: string[]) {
    if (assigneeIds && assigneeIds.length > 0) {
      // Reconstruct historical burndown data for filtered assignees
      const burndownData = [];
      const cycleStart = cycle.startsAt instanceof Date ? cycle.startsAt : new Date(cycle.startsAt);
      const cycleEnd = cycle.endsAt instanceof Date ? cycle.endsAt : new Date(cycle.endsAt);
      const today = new Date();
      const endDate = today < cycleEnd ? today : cycleEnd;
      
      // Calculate total scope (all issues assigned to selected members)
      const totalScope = cycle.issues.reduce((sum: number, issue: any) => sum + (issue.estimate || 0), 0);
      
      // Calculate total days in cycle
      const cycleStartTime = cycleStart.getTime();
      const cycleEndTime = cycleEnd.getTime();
      const todayTime = today.getTime();
      const endTime = Math.min(cycleEndTime, todayTime);
      const totalDays = Math.ceil((endTime - cycleStartTime) / (1000 * 60 * 60 * 24)) + 1;
      
      // For each day in the cycle
      for (let dayIndex = 0; dayIndex < totalDays; dayIndex++) {
        const currentDate = new Date(cycleStart);
        currentDate.setDate(currentDate.getDate() + dayIndex);
        
        // Skip if beyond today
        if (currentDate > today) break;
        
        let completedScope = 0;
        
        // Calculate completed work up to this day
        cycle.issues.forEach((issue: any) => {
          const points = issue.estimate || 0;
          // Dates from Prisma are already Date objects, don't wrap them again
          const completedAt = issue.completedAt ? (issue.completedAt instanceof Date ? issue.completedAt : new Date(issue.completedAt)) : null;
          
          if (completedAt && completedAt <= currentDate) {
            completedScope += points;
          }
        });
        
        const remaining = totalScope - completedScope;
        const ideal = this.calculateIdealBurndown(cycle, dayIndex, totalScope);
        
        burndownData.push({
          day: `Day ${dayIndex}`,
          remaining: remaining,
          ideal: ideal,
          scope: totalScope
        });
      }
      
      return burndownData;
    }
    
    return cycle.histories.map((history: CycleHistory, index: number) => ({
      day: `Day ${index}`,
      remaining: history.scope - history.completedScope,
      ideal: this.calculateIdealBurndown(cycle, index),
      scope: history.scope
    }));
  }

  private calculateIdealBurndown(cycle: any, dayIndex: number, customScope?: number): number {
    if (cycle.histories.length === 0) return 0;
    
    const initialScope = customScope ?? cycle.histories[0].scope;
    const totalDays = cycle.histories.length - 1;
    
    if (totalDays === 0) return initialScope;
    return Math.max(0, initialScope - (initialScope / totalDays) * dayIndex);
  }

  private generateCFDData(cycle: any, assigneeIds?: string[]) {
    if (!cycle.histories || cycle.histories.length === 0) {
      return [];
    }

    // Always reconstruct CFD to ensure consistency with actual issue states
    // Linear's history might count "ready" issues incorrectly
    {
      // Reconstruct historical CFD data for filtered assignees
      // We'll use issue dates to determine state on each day
      const cfdData = [];
      const cycleStart = cycle.startsAt instanceof Date ? cycle.startsAt : new Date(cycle.startsAt);
      const cycleEnd = cycle.endsAt instanceof Date ? cycle.endsAt : new Date(cycle.endsAt);
      const today = new Date();
      const endDate = today < cycleEnd ? today : cycleEnd;
      
      // Calculate total days in cycle
      const cycleStartTime = cycleStart.getTime();
      const cycleEndTime = cycleEnd.getTime();
      const todayTime = today.getTime();
      const endTime = Math.min(cycleEndTime, todayTime);
      const totalDays = Math.ceil((endTime - cycleStartTime) / (1000 * 60 * 60 * 24)) + 1;
      
      // For each day in the cycle (up to today or cycle end)
      for (let dayIndex = 0; dayIndex < totalDays; dayIndex++) {
        const currentDate = new Date(cycleStart);
        currentDate.setDate(currentDate.getDate() + dayIndex);
        
        // Skip if beyond today
        if (currentDate > today) break;
        
        let todoScope = 0;
        let inProgressScope = 0;
        let doneScope = 0;
        
        // Calculate state of each issue on this specific day
        cycle.issues.forEach((issue: any) => {
          const points = issue.estimate || 0;
          // Dates from Prisma are already Date objects, don't wrap them again
          const createdAt = issue.createdAt instanceof Date ? issue.createdAt : new Date(issue.createdAt);
          const startedAt = issue.startedAt ? (issue.startedAt instanceof Date ? issue.startedAt : new Date(issue.startedAt)) : null;
          const completedAt = issue.completedAt ? (issue.completedAt instanceof Date ? issue.completedAt : new Date(issue.completedAt)) : null;
          const canceledAt = issue.canceledAt ? (issue.canceledAt instanceof Date ? issue.canceledAt : new Date(issue.canceledAt)) : null;
          
          // Skip if issue didn't exist yet on this day
          if (createdAt > currentDate) return;
          
          // Skip if issue was canceled before this day
          if (canceledAt && canceledAt <= currentDate) return;
          
          // Determine state on this day
          if (completedAt && completedAt <= currentDate) {
            // Was completed by this day
            doneScope += points;
          } else if (startedAt && startedAt <= currentDate) {
            // Was started but not completed by this day
            inProgressScope += points;
          } else {
            // Not started yet on this day (todo)
            todoScope += points;
          }
        });
        
        cfdData.push({
          day: `Day ${dayIndex}`,
          date: currentDate.toISOString().split('T')[0],
          todo: Math.round(todoScope),
          inProgress: Math.round(inProgressScope),
          done: Math.round(doneScope),
          total: Math.round(todoScope + inProgressScope + doneScope)
        });
      }
      
      return cfdData;
    }
  }

  private calculateWorkflowEfficiency(issues: any[]) {
    const now = Date.now();
    
    // Analyze all issues to understand time spent in different states
    const stateMetrics = {
      pickupTime: [] as number[], // Time from creation to first action
      devTime: [] as number[],    // Time in development
      reviewTime: [] as number[], // Time in review
      testTime: [] as number[],   // Time in testing
      totalLeadTime: [] as number[], // Total time from creation to completion
    };
    
    // Process each issue to calculate state times
    issues.forEach(issue => {
      const createdAt = new Date(issue.createdAt).getTime();
      const startedAt = issue.startedAt ? new Date(issue.startedAt).getTime() : null;
      const completedAt = issue.completedAt ? new Date(issue.completedAt).getTime() : null;
      
      // Calculate pickup time (creation to start)
      if (startedAt) {
        const pickupDays = (startedAt - createdAt) / (1000 * 60 * 60 * 24);
        stateMetrics.pickupTime.push(pickupDays);
      } else if (!issue.completedAt && !issue.canceledAt) {
        // Still waiting to be picked up
        const waitingDays = (now - createdAt) / (1000 * 60 * 60 * 24);
        stateMetrics.pickupTime.push(waitingDays);
      }
      
      // For completed items, calculate total lead time
      if (completedAt) {
        const leadTimeDays = (completedAt - createdAt) / (1000 * 60 * 60 * 24);
        stateMetrics.totalLeadTime.push(leadTimeDays);
      }
      
      // Calculate time in different states using history if available
      if (issue.history) {
        try {
          const history = typeof issue.history === 'string' ? JSON.parse(issue.history) : issue.history;
          if (history && history.nodes) {
            const transitions = history.nodes
              .filter((h: any) => h.toState && h.fromState)
              .sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
            
            // Track time in each state
            let lastTime = createdAt;
            let lastState = 'unstarted';
            
            transitions.forEach((transition: any) => {
              const transitionTime = new Date(transition.createdAt).getTime();
              const timeInState = (transitionTime - lastTime) / (1000 * 60 * 60 * 24);
              
              // Map the from state to our categories
              if (lastState === 'started' || (transition.fromState?.type === 'started')) {
                stateMetrics.devTime.push(timeInState);
              } else if (transition.fromState?.name?.toLowerCase().includes('review')) {
                stateMetrics.reviewTime.push(timeInState);
              } else if (transition.fromState?.name?.toLowerCase().includes('test') || 
                        transition.fromState?.name?.toLowerCase().includes('qa')) {
                stateMetrics.testTime.push(timeInState);
              }
              
              lastTime = transitionTime;
              lastState = transition.toState?.type || transition.toState?.name || lastState;
            });
            
            // Add time in current state if not completed
            if (!completedAt && lastState) {
              const timeInCurrentState = (now - lastTime) / (1000 * 60 * 60 * 24);
              if (issue.stateType === 'started') {
                stateMetrics.devTime.push(timeInCurrentState);
              } else if (issue.stateType === 'review') {
                stateMetrics.reviewTime.push(timeInCurrentState);
              } else if (issue.stateType === 'testing') {
                stateMetrics.testTime.push(timeInCurrentState);
              }
            }
          }
        } catch (e) {
          // Fall back to estimation if history parsing fails
          console.log('Failed to parse history for issue', issue.identifier, e);
        }
      }
      
      // If no history available, fall back to basic calculation for current state
      if (!issue.history && startedAt && !completedAt) {
        const daysInCurrentState = (now - startedAt) / (1000 * 60 * 60 * 24);
        
        if (issue.stateType === 'started') {
          stateMetrics.devTime.push(daysInCurrentState);
        } else if (issue.stateType === 'review') {
          stateMetrics.reviewTime.push(daysInCurrentState);
        } else if (issue.stateType === 'testing') {
          stateMetrics.testTime.push(daysInCurrentState);
        }
      }
    });
    
    // Calculate averages
    const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
    const max = (arr: number[]) => arr.length > 0 ? Math.max(...arr) : 0;
    
    // Find items waiting longest to be picked up
    const waitingItems = issues.filter(issue => 
      !issue.startedAt && !issue.completedAt && !issue.canceledAt
    ).map(issue => {
      const waitDays = (now - new Date(issue.createdAt).getTime()) / (1000 * 60 * 60 * 24);
      return {
        id: issue.identifier,
        title: issue.title,
        estimate: issue.estimate || 0,
        waitingDays: Math.round(waitDays * 10) / 10,
        createdAt: issue.createdAt
      };
    }).sort((a, b) => b.waitingDays - a.waitingDays);
    
    // Identify bottlenecks (which state has highest average time)
    const stateAverages = {
      pickup: avg(stateMetrics.pickupTime),
      development: avg(stateMetrics.devTime),
      review: avg(stateMetrics.reviewTime),
      testing: avg(stateMetrics.testTime)
    };
    
    const bottleneck = Object.entries(stateAverages).reduce((a, b) => 
      a[1] > b[1] ? a : b
    )[0];
    
    // Calculate efficiency score (ideal vs actual lead time)
    const avgLeadTime = avg(stateMetrics.totalLeadTime);
    const idealLeadTime = 5; // Assume 5 days is ideal for most items
    const efficiencyScore = idealLeadTime / (avgLeadTime || idealLeadTime) * 100;
    
    // Distribution of where time is spent
    const totalTime = Object.values(stateAverages).reduce((a, b) => a + b, 0);
    const timeDistribution = totalTime > 0 ? {
      pickup: Math.round((stateAverages.pickup / totalTime) * 100),
      development: Math.round((stateAverages.development / totalTime) * 100),
      review: Math.round((stateAverages.review / totalTime) * 100),
      testing: Math.round((stateAverages.testing / totalTime) * 100)
    } : { pickup: 0, development: 0, review: 0, testing: 0 };
    
    return {
      avgPickupTime: Math.round(avg(stateMetrics.pickupTime) * 10) / 10,
      avgDevTime: Math.round(avg(stateMetrics.devTime) * 10) / 10,
      avgReviewTime: Math.round(avg(stateMetrics.reviewTime) * 10) / 10,
      avgTestTime: Math.round(avg(stateMetrics.testTime) * 10) / 10,
      avgLeadTime: Math.round(avgLeadTime * 10) / 10,
      maxPickupTime: Math.round(max(stateMetrics.pickupTime) * 10) / 10,
      bottleneck,
      efficiencyScore: Math.round(efficiencyScore),
      timeDistribution,
      waitingItems: waitingItems, // All waiting items
      itemsWaitingPickup: waitingItems.length,
      totalAnalyzed: issues.length
    };
  }
  
  private calculateWorkItemAge(issues: any[]) {
    const activeIssues = issues.filter(issue => 
      (issue.stateType === 'started' || issue.stateType === 'review' || issue.stateType === 'testing') && 
      !issue.completedAt && !issue.canceledAt
    );

    const now = Date.now();
    
    return activeIssues
      .map(issue => {
        const startDate = issue.startedAt || issue.createdAt;
        const age = Math.floor((now - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24));
        
        return {
          id: issue.identifier,
          title: issue.title,
          age,
          assignee: 'Unassigned'
        };
      })
      .sort((a, b) => b.age - a.age)
      .slice(0, 10);
  }

  private calculateReviewMetrics(issues: any[]) {
    // Find all items currently in review
    const itemsInReview = issues.filter(issue => 
      issue.stateType === 'review' && !issue.completedAt && !issue.canceledAt
    );
    
    const now = Date.now();
    const reviewThreshold = 2; // Days threshold for "too long in review"
    
    // Calculate time in review for current items using actual state transitions
    const currentReviewItems = itemsInReview.map(issue => {
      let reviewStarted = issue.createdAt; // Default fallback
      let daysInReview = 0;
      
      // Try to find when the issue actually entered review state from history
      if (issue.history) {
        try {
          const history = typeof issue.history === 'string' ? JSON.parse(issue.history) : issue.history;
          if (history && history.nodes) {
            // Find the most recent transition TO review state
            const toReviewTransitions = history.nodes
              .filter((h: any) => h.toState && 
                (h.toState.type === 'review' || 
                 h.toState.name?.toLowerCase().includes('review') ||
                 h.toState.name?.toLowerCase().includes('code review') ||
                 h.toState.name?.toLowerCase().includes('pr review')))
              .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            
            if (toReviewTransitions.length > 0) {
              reviewStarted = toReviewTransitions[0].createdAt;
            }
          }
        } catch (e) {
          // Fall back to startedAt if history parsing fails
          console.log('Failed to parse history for review metrics', issue.identifier, e);
          reviewStarted = issue.startedAt || issue.createdAt;
        }
      } else {
        // No history available, use startedAt as fallback
        reviewStarted = issue.startedAt || issue.createdAt;
      }
      
      daysInReview = (now - new Date(reviewStarted).getTime()) / (1000 * 60 * 60 * 24);
      
      return {
        id: issue.identifier,
        title: issue.title,
        estimate: issue.estimate || 0,
        daysInReview: Math.round(daysInReview * 10) / 10,
        isStuck: daysInReview > reviewThreshold,
        assignee: issue.assignee?.name || 'Unassigned'
      };
    }).sort((a, b) => b.daysInReview - a.daysInReview);
    
    // Calculate statistics
    const totalInReview = currentReviewItems.length;
    const stuckInReview = currentReviewItems.filter(item => item.isStuck).length;
    const avgDaysInReview = totalInReview > 0 
      ? currentReviewItems.reduce((sum, item) => sum + item.daysInReview, 0) / totalInReview
      : 0;
    
    // Calculate distribution for histogram
    const distribution = {
      '0-1 days': 0,
      '1-2 days': 0,
      '2-3 days': 0,
      '3-5 days': 0,
      '5+ days': 0
    };
    
    currentReviewItems.forEach(item => {
      if (item.daysInReview <= 1) distribution['0-1 days']++;
      else if (item.daysInReview <= 2) distribution['1-2 days']++;
      else if (item.daysInReview <= 3) distribution['2-3 days']++;
      else if (item.daysInReview <= 5) distribution['3-5 days']++;
      else distribution['5+ days']++;
    });
    
    // Analyze completed items that went through review
    const completedFromReview = [];
    const reviewTimes = [];
    
    issues.filter(issue => issue.completedAt).forEach(issue => {
      if (issue.history) {
        try {
          const history = typeof issue.history === 'string' ? JSON.parse(issue.history) : issue.history;
          if (history && history.nodes) {
            // Check if this issue went through review state
            const reviewTransitions = history.nodes.filter((h: any) => 
              (h.fromState?.type === 'review' || 
               h.fromState?.name?.toLowerCase().includes('review')) ||
              (h.toState?.type === 'review' || 
               h.toState?.name?.toLowerCase().includes('review'))
            );
            
            if (reviewTransitions.length > 0) {
              completedFromReview.push(issue);
              
              // Calculate time spent in review for completed items
              const toReview = reviewTransitions.find((h: any) => 
                h.toState?.type === 'review' || h.toState?.name?.toLowerCase().includes('review')
              );
              const fromReview = reviewTransitions.find((h: any) => 
                h.fromState?.type === 'review' || h.fromState?.name?.toLowerCase().includes('review')
              );
              
              if (toReview && fromReview) {
                const reviewTime = (new Date(fromReview.createdAt).getTime() - 
                                   new Date(toReview.createdAt).getTime()) / (1000 * 60 * 60 * 24);
                if (reviewTime > 0) {
                  reviewTimes.push(reviewTime);
                }
              }
            }
          }
        } catch (e) {
          // Skip if history parsing fails
        }
      }
    });
    
    // Calculate review velocity (items leaving review per day)
    const sprintDuration = 14; // 14-day sprint
    const reviewVelocity = completedFromReview.length > 0 
      ? Math.round((completedFromReview.length / sprintDuration) * 10) / 10
      : 0;
    
    // Calculate average review time for completed items
    const avgCompletedReviewTime = reviewTimes.length > 0
      ? reviewTimes.reduce((sum, time) => sum + time, 0) / reviewTimes.length
      : 0;
    
    return {
      totalInReview,
      stuckInReview,
      avgDaysInReview: Math.round(avgDaysInReview * 10) / 10,
      reviewThreshold,
      reviewVelocity,
      distribution,
      items: currentReviewItems,
      // Summary metrics
      reviewBacklog: currentReviewItems.reduce((sum, item) => sum + item.estimate, 0),
      oldestReviewDays: currentReviewItems.length > 0 ? currentReviewItems[0].daysInReview : 0,
      // Additional metrics from completed items
      completedThroughReview: completedFromReview.length,
      avgCompletedReviewTime: Math.round(avgCompletedReviewTime * 10) / 10
    };
  }
  
  private findBlockers(issues: any[]) {
    // First, build a map of which issues block which
    const blockingMap = new Map<string, string[]>();
    
    issues.forEach(issue => {
      let relations = null;
      try {
        relations = typeof issue.relations === 'string' && issue.relations 
          ? JSON.parse(issue.relations) 
          : issue.relations;
      } catch (e) {
        // If parsing fails, relations is null
      }
      
      // If this issue blocks others, record it
      if (relations?.nodes) {
        relations.nodes.forEach((relation: any) => {
          if (relation.type === 'blocks' && relation.relatedIssue) {
            const blockedId = relation.relatedIssue.identifier;
            if (!blockingMap.has(blockedId)) {
              blockingMap.set(blockedId, []);
            }
            blockingMap.get(blockedId)!.push(issue.identifier);
          }
        });
      }
    });
    
    const blockedIssues = issues.filter(issue => {
      // Check if this issue is blocked by looking in our map
      const isBlocked = blockingMap.has(issue.identifier);
      
      // Check for blocked/blocker labels
      const hasBlockedLabel = issue.labels.some((l: any) => 
        l.label.toLowerCase().includes('blocked') || 
        l.label.toLowerCase().includes('blocker')
      );
      
      // Only consider issues that are not completed or canceled
      return (isBlocked || hasBlockedLabel) && !issue.completedAt && !issue.canceledAt;
    });

    // Also find issues that have been in progress for too long (potential blockers)
    const stuckIssues = issues.filter(issue => {
      const longInProgress = (issue.stateType === 'started' || issue.stateType === 'review' || issue.stateType === 'testing') && 
        issue.startedAt &&
        (Date.now() - new Date(issue.startedAt).getTime()) > 5 * 24 * 60 * 60 * 1000; // 5 days instead of 3
      
      return longInProgress && !issue.completedAt && !issue.canceledAt;
    });

    // Combine both sets, remove duplicates
    const allBlockers = [...new Map([...blockedIssues, ...stuckIssues].map(item => [item.id, item])).values()];
    
    // Sort by priority: actually blocked items first, then by days stuck/blocked
    allBlockers.sort((a, b) => {
      const aBlocked = blockingMap.has(a.identifier);
      const bBlocked = blockingMap.has(b.identifier);
      
      // Blocked items come first
      if (aBlocked && !bBlocked) return -1;
      if (!aBlocked && bBlocked) return 1;
      
      // Then sort by days (longer = higher priority)
      // For blocked items use createdAt, for stuck items use startedAt
      const aIsBlockedItem = aBlocked || a.labels.some((l: any) => l.label.toLowerCase().includes('blocked'));
      const bIsBlockedItem = bBlocked || b.labels.some((l: any) => l.label.toLowerCase().includes('blocked'));
      
      const aDays = aIsBlockedItem 
        ? (Date.now() - new Date(a.createdAt).getTime()) / (1000 * 60 * 60 * 24)
        : (a.startedAt ? (Date.now() - new Date(a.startedAt).getTime()) / (1000 * 60 * 60 * 24) : 0);
      
      const bDays = bIsBlockedItem
        ? (Date.now() - new Date(b.createdAt).getTime()) / (1000 * 60 * 60 * 24)  
        : (b.startedAt ? (Date.now() - new Date(b.startedAt).getTime()) / (1000 * 60 * 60 * 24) : 0);
      
      return bDays - aDays;
    });
    
    // Return all items (no limit) - show everything stuck for > 5 days
    return allBlockers.map(issue => {
      // Get the blockers for this issue from our map
      const blockers = blockingMap.get(issue.identifier);
      const isActuallyBlocked = !!blockers && blockers.length > 0;
      const blockerInfo = blockers ? blockers[0] : null; // Show first blocker if multiple
      
      // Calculate days blocked/stuck:
      // - For blocked items: use createdAt (they might be blocked from creation)
      // - For stuck items (in progress): use startedAt
      let blockedDays = 0;
      if (isActuallyBlocked || issue.labels.some((l: any) => l.label.toLowerCase().includes('blocked'))) {
        // This is a blocked item, use createdAt since it might never have started
        blockedDays = Math.floor((Date.now() - new Date(issue.createdAt).getTime()) / (1000 * 60 * 60 * 24));
      } else if (issue.startedAt) {
        // This is a stuck item (in progress too long), use startedAt
        blockedDays = Math.floor((Date.now() - new Date(issue.startedAt).getTime()) / (1000 * 60 * 60 * 24));
      }
      
      return {
        id: issue.identifier,
        title: issue.title,
        blockedDays: blockedDays,
        blockedBy: blockerInfo,
        isActuallyBlocked: isActuallyBlocked || issue.labels.some((l: any) => 
          l.label.toLowerCase().includes('blocked'))
      };
    });
  }
}