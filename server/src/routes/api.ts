import { Router } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { LinearService } from '../lib/linear-client.js';
import { MetricsCalculator } from '../lib/metrics.js';
import pino from 'pino';

const logger = pino({ name: 'api-routes' });

export function createApiRouter(prisma: PrismaClient, linearService: LinearService) {
  const router = Router();
  const metrics = new MetricsCalculator(prisma);

  router.post('/refresh', async (req, res) => {
    try {
      const teamId = z.string().parse(req.query.teamId);
      logger.info({ teamId }, 'Refreshing data for team');

      const teamData = await linearService.fetchTeamWithActiveCycle(teamId);
      
      if (!teamData) {
        return res.status(404).json({ error: 'Team not found' });
      }

      if (!teamData.activeCycle) {
        return res.status(422).json({ error: 'No active cycle found. Cycles may be disabled for this team.' });
      }

      const activeCycle = teamData.activeCycle;

      await prisma.team.upsert({
        where: { id: teamData.id },
        update: { name: teamData.name, key: teamData.key },
        create: { id: teamData.id, name: teamData.name, key: teamData.key }
      });

      const transition = await linearService.detectCycleTransition(teamId);
      
      if (transition.transitioned && transition.previousCycleId) {
        const previousCycle = await prisma.cycle.findUnique({
          where: { id: transition.previousCycleId },
          include: { histories: true, issues: true }
        });

        if (previousCycle) {
          const snapshotData = {
            cycle: previousCycle,
            metrics: await metrics.calculateCycleMetrics(previousCycle.id),
            timestamp: new Date().toISOString()
          };
          
          await linearService.saveSnapshot(previousCycle.id, snapshotData);
          
          await prisma.cycle.update({
            where: { id: previousCycle.id },
            data: { completedAt: new Date() }
          });
        }
      }

      const cycle = await prisma.cycle.upsert({
        where: { id: activeCycle.id },
        update: {
          name: activeCycle.name,
          progress: activeCycle.progress,
          startsAt: new Date(activeCycle.startsAt),
          endsAt: new Date(activeCycle.endsAt),
          completedAt: activeCycle.completedAt ? new Date(activeCycle.completedAt) : null
        },
        create: {
          id: activeCycle.id,
          teamId: teamData.id,
          number: activeCycle.number,
          name: activeCycle.name,
          startsAt: new Date(activeCycle.startsAt),
          endsAt: new Date(activeCycle.endsAt),
          completedAt: activeCycle.completedAt ? new Date(activeCycle.completedAt) : null,
          progress: activeCycle.progress
        }
      });

      if (activeCycle.scopeHistory && activeCycle.scopeHistory.length > 0) {
        const initialScope = activeCycle.scopeHistory[0];
        const finalScope = activeCycle.scopeHistory[activeCycle.scopeHistory.length - 1];
        
        await prisma.cycle.update({
          where: { id: cycle.id },
          data: { initialScope, finalScope }
        });
      }

      await prisma.cycleHistory.deleteMany({
        where: { cycleId: activeCycle.id }
      });

      const histories = [];
      for (let i = 0; i < activeCycle.issueCountHistory.length; i++) {
        const date = new Date(activeCycle.startsAt);
        date.setDate(date.getDate() + i);

        histories.push({
          cycleId: activeCycle.id,
          dayIndex: i,
          date,
          issueCount: activeCycle.issueCountHistory[i] || 0,
          completedIssueCount: activeCycle.completedIssueCountHistory?.[i] || 0,
          scope: activeCycle.scopeHistory?.[i] || 0,
          completedScope: activeCycle.completedScopeHistory?.[i] || 0,
          inProgressScope: activeCycle.inProgressScopeHistory?.[i] || 0
        });
      }

      await prisma.cycleHistory.createMany({ data: histories });

      const issues: any[] = await linearService.fetchCycleIssues(teamId, activeCycle.id);
      
      // Log state distribution for debugging
      const stateDistribution = new Map<string, number>();
      
      for (const issue of issues) {
        // Store actual state name for proper categorization
        const stateName = issue.state?.name?.toLowerCase() || '';
        const stateType = issue.state?.type || 'unstarted';
        
        // Map Linear state names to our CFD categories - R&D specific workflow
        // R&D team uses specific status names that need accurate mapping
        let mappedStateType = stateType;
        const lowerStateName = stateName.toLowerCase();
        
        // R&D Workflow status mapping
        if (lowerStateName === 'backlog' || lowerStateName === 'icebox') {
          mappedStateType = 'backlog';
        } else if (lowerStateName === 'todo' || lowerStateName === 'to do' || lowerStateName === 'planned' || stateType === 'unstarted') {
          mappedStateType = 'unstarted';
        } else if (lowerStateName === 'in progress' || lowerStateName === 'in development' || lowerStateName === 'developing' || lowerStateName === 'coding') {
          mappedStateType = 'started';
        } else if (lowerStateName === 'in review' || lowerStateName.includes('code review') || lowerStateName.includes('pr review') || lowerStateName === 'reviewing') {
          mappedStateType = 'review';
        } else if (lowerStateName === 'in testing' || lowerStateName.includes('qa') || lowerStateName === 'testing' || lowerStateName === 'in qa') {
          mappedStateType = 'testing';
        } else if (lowerStateName.includes('ready for release') || lowerStateName.includes('ready to deploy') || lowerStateName === 'ready' || lowerStateName === 'approved' || lowerStateName === 'staging') {
          mappedStateType = 'ready';
        } else if (lowerStateName === 'done' || lowerStateName === 'released' || lowerStateName === 'deployed' || lowerStateName === 'complete' || stateType === 'completed') {
          mappedStateType = 'completed';
        } else if (lowerStateName === 'canceled' || lowerStateName === 'cancelled' || lowerStateName === 'won\'t do' || stateType === 'canceled') {
          mappedStateType = 'canceled';
        } else if (lowerStateName === 'blocked' || lowerStateName === 'on hold') {
          mappedStateType = 'blocked';
        }
        
        // Track state distribution (use 0 for unestimated)
        const stateKey = `${issue.state?.name || 'Unknown'} -> ${mappedStateType}`;
        const points = issue.estimate || 0;
        stateDistribution.set(stateKey, (stateDistribution.get(stateKey) || 0) + points);
        
        // Upsert assignee if exists
        if (issue.assignee) {
          await prisma.user.upsert({
            where: { id: issue.assignee.id },
            update: {
              name: issue.assignee.name,
              email: issue.assignee.email,
              avatarUrl: issue.assignee.avatarUrl,
              teamId: teamData.id
            },
            create: {
              id: issue.assignee.id,
              name: issue.assignee.name,
              email: issue.assignee.email,
              avatarUrl: issue.assignee.avatarUrl,
              teamId: teamData.id
            }
          });
        }

        // Upsert creator if exists
        if (issue.creator) {
          await prisma.user.upsert({
            where: { id: issue.creator.id },
            update: {
              name: issue.creator.name,
              email: issue.creator.email,
              avatarUrl: issue.creator.avatarUrl,
              teamId: teamData.id
            },
            create: {
              id: issue.creator.id,
              name: issue.creator.name,
              email: issue.creator.email,
              avatarUrl: issue.creator.avatarUrl,
              teamId: teamData.id
            }
          });
        }
        
        await prisma.issue.upsert({
          where: { id: issue.id },
          update: {
            title: issue.title,
            estimate: issue.estimate,
            priority: issue.priority,
            stateId: issue.state?.id,
            stateType: mappedStateType,
            startedAt: issue.startedAt ? new Date(issue.startedAt) : null,
            completedAt: issue.completedAt ? new Date(issue.completedAt) : null,
            canceledAt: issue.canceledAt ? new Date(issue.canceledAt) : null,
            updatedAt: new Date(issue.updatedAt),
            cycleId: activeCycle.id,
            relations: issue.relations ? JSON.stringify(issue.relations) : null,
            assigneeId: issue.assignee?.id || null,
            creatorId: issue.creator?.id || null,
            history: issue.history ? JSON.stringify(issue.history) : null
          },
          create: {
            id: issue.id,
            teamId: teamData.id,
            identifier: issue.identifier,
            title: issue.title,
            estimate: issue.estimate,
            priority: issue.priority,
            stateId: issue.state?.id,
            stateType: mappedStateType,
            startedAt: issue.startedAt ? new Date(issue.startedAt) : null,
            completedAt: issue.completedAt ? new Date(issue.completedAt) : null,
            canceledAt: issue.canceledAt ? new Date(issue.canceledAt) : null,
            createdAt: new Date(issue.createdAt),
            updatedAt: new Date(issue.updatedAt),
            cycleId: activeCycle.id,
            relations: issue.relations ? JSON.stringify(issue.relations) : null,
            assigneeId: issue.assignee?.id || null,
            creatorId: issue.creator?.id || null,
            history: issue.history ? JSON.stringify(issue.history) : null
          }
        });

        await prisma.issueLabel.deleteMany({
          where: { issueId: issue.id }
        });

        if (issue.labels?.nodes) {
          const labels = issue.labels.nodes.map((label: any) => ({
            issueId: issue.id,
            label: label.name
          }));

          await prisma.issueLabel.createMany({ data: labels });
        }
      }

      // Log state distribution for debugging
      logger.info({ 
        teamId, 
        cycleId: activeCycle.id, 
        issueCount: issues.length,
        stateDistribution: Object.fromEntries(stateDistribution)
      }, 'Data refresh completed with state distribution');
      
      res.json({
        ok: true,
        cycle: {
          id: activeCycle.id,
          name: activeCycle.name,
          number: activeCycle.number
        },
        issuesProcessed: issues.length,
        transitioned: transition.transitioned
      });
    } catch (error: any) {
      logger.error({ error, message: error.message, stack: error.stack }, 'Failed to refresh data');
      res.status(500).json({ error: 'Failed to refresh data', details: error.message });
    }
  });

  router.get('/cycles', async (req, res) => {
    try {
      const teamId = z.string().parse(req.query.teamId);
      
      const cycles = await prisma.cycle.findMany({
        where: { teamId },
        orderBy: { number: 'desc' },
        take: 10
      });

      res.json(cycles);
    } catch (error) {
      logger.error({ error }, 'Failed to fetch cycles');
      res.status(500).json({ error: 'Failed to fetch cycles' });
    }
  });

  router.get('/cycles/:cycleId/metrics', async (req, res) => {
    try {
      const cycleId = z.string().parse(req.params.cycleId);
      
      // Support both single assigneeId and multiple assigneeIds
      let assigneeIds: string[] | undefined;
      if (req.query.assigneeIds) {
        // Multiple IDs passed as comma-separated string
        const idsParam = z.string().parse(req.query.assigneeIds);
        assigneeIds = idsParam.split(',').filter(id => id.length > 0);
      } else if (req.query.assigneeId) {
        // Single ID for backward compatibility
        assigneeIds = [z.string().parse(req.query.assigneeId)];
      }
      
      const cycleMetrics = await metrics.calculateCycleMetrics(cycleId, assigneeIds);
      
      res.json(cycleMetrics);
    } catch (error) {
      logger.error({ error }, 'Failed to calculate metrics');
      res.status(500).json({ error: 'Failed to calculate metrics' });
    }
  });

  router.get('/teams', async (req, res) => {
    try {
      // Fetch teams directly from Linear API
      const teamsData = await linearService.fetchTeams();
      
      // Save teams to database for future use
      for (const team of teamsData) {
        await prisma.team.upsert({
          where: { id: team.id },
          update: { name: team.name, key: team.key },
          create: { id: team.id, name: team.name, key: team.key }
        });
      }
      
      res.json(teamsData);
    } catch (error) {
      logger.error({ error }, 'Failed to fetch teams');
      res.status(500).json({ error: 'Failed to fetch teams' });
    }
  });

  router.get('/organization', async (req, res) => {
    try {
      const organization = await linearService.fetchOrganization();
      res.json(organization);
    } catch (error) {
      logger.error({ error }, 'Failed to fetch organization');
      res.status(500).json({ error: 'Failed to fetch organization' });
    }
  });

  router.get('/teams/:teamId/members', async (req, res) => {
    try {
      const teamId = z.string().parse(req.params.teamId);
      
      // First try to get from database
      let members = await prisma.user.findMany({
        where: { teamId },
        orderBy: { name: 'asc' }
      });
      
      // If no members in DB, fetch from Linear
      if (members.length === 0) {
        const linearMembers = await linearService.fetchTeamMembers(teamId);
        
        // Save to database
        for (const member of linearMembers) {
          await prisma.user.upsert({
            where: { id: member.id },
            update: {
              name: member.name,
              email: member.email,
              avatarUrl: member.avatarUrl,
              teamId
            },
            create: {
              id: member.id,
              name: member.name,
              email: member.email,
              avatarUrl: member.avatarUrl,
              teamId
            }
          });
        }
        
        members = linearMembers;
      }
      
      res.json(members);
    } catch (error) {
      logger.error({ error }, 'Failed to fetch team members');
      res.status(500).json({ error: 'Failed to fetch team members' });
    }
  });

  router.get('/teams/:teamId/recent-cycles', async (req, res) => {
    try {
      const teamId = z.string().parse(req.params.teamId);
      
      // Fetch recent cycles from Linear API
      const teamData = await linearService.fetchRecentCycles(teamId);
      
      res.json({
        activeCycle: teamData.activeCycle,
        pastCycles: teamData.cycles?.nodes || []
      });
    } catch (error) {
      logger.error({ error }, 'Failed to fetch recent cycles');
      res.status(500).json({ error: 'Failed to fetch recent cycles' });
    }
  });

  router.get('/health', async (req, res) => {
    try {
      // Check database connection
      await prisma.$queryRaw`SELECT 1`;
      
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
      });
    } catch (error) {
      logger.error({ error }, 'Health check failed');
      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Database connection failed'
      });
    }
  });

  return router;
}