import { LinearClient } from '@linear/sdk';
import { PrismaClient } from '@prisma/client';
import pino from 'pino';

const logger = pino({ name: 'linear-client' });

export class LinearService {
  private client: LinearClient;
  private prisma: PrismaClient;

  constructor(apiKey: string, prisma: PrismaClient) {
    this.client = new LinearClient({ apiKey });
    this.prisma = prisma;
  }

  async fetchTeamWithActiveCycle(teamId: string) {
    const query = `
      query TeamActiveCycle($teamId: String!) {
        team(id: $teamId) {
          id
          key
          name
          activeCycle {
            id
            number
            name
            startsAt
            endsAt
            completedAt
            progress
            issueCountHistory
            completedIssueCountHistory
            scopeHistory
            completedScopeHistory
            inProgressScopeHistory
          }
        }
      }
    `;

    const result = await this.client.client.rawRequest(query, { teamId });
    return result.data.team;
  }

  async fetchCycleIssues(teamId: string, cycleId: string) {
    const allIssues = [];
    let hasNextPage = true;
    let cursor = null;

    while (hasNextPage) {
      const query = `
        query CycleIssues($teamId: String!, $after: String) {
          team(id: $teamId) {
            issues(
              after: $after
              first: 50
              filter: { cycle: { id: { eq: "${cycleId}" } } }
              orderBy: updatedAt
            ) {
              pageInfo { hasNextPage endCursor }
              nodes {
                id
                identifier
                title
                estimate
                priority
                createdAt
                updatedAt
                startedAt
                completedAt
                canceledAt
                labels { nodes { name } }
                state { id name type }
                cycle { id }
                assignee { id name email avatarUrl }
                creator { id name email avatarUrl }
                relations {
                  nodes {
                    type
                    relatedIssue {
                      id
                      identifier
                      title
                    }
                  }
                }
                history(first: 10) {
                  nodes {
                    createdAt
                    fromState { name type }
                    toState { name type }
                  }
                }
              }
            }
          }
        }
      `;

      const result = await this.client.client.rawRequest(query, {
        teamId,
        after: cursor
      });

      const issues = result.data.team.issues;
      allIssues.push(...issues.nodes);
      
      hasNextPage = issues.pageInfo.hasNextPage;
      cursor = issues.pageInfo.endCursor;
    }

    return allIssues;
  }

  async fetchRecentCycles(teamId: string) {
    const query = `
      query TeamRecentCycles($teamId: String!) {
        team(id: $teamId) {
          id
          cycles(first: 20) {
            nodes { 
              id 
              number 
              name 
              startsAt 
              endsAt 
              completedAt 
              progress 
            }
          }
          activeCycle { 
            id 
            number 
            name 
            startsAt
            endsAt
            progress
          }
        }
      }
    `;

    const result = await this.client.client.rawRequest(query, { teamId });
    return result.data.team;
  }

  async detectCycleTransition(teamId: string): Promise<{
    transitioned: boolean;
    previousCycleId?: string;
    currentCycleId?: string;
  }> {
    const team = await this.prisma.team.findUnique({
      where: { id: teamId }
    });

    if (!team) {
      return { transitioned: false };
    }

    const lastActiveCycle = await this.prisma.cycle.findFirst({
      where: { 
        teamId,
        completedAt: null
      },
      orderBy: { createdAt: 'desc' }
    });

    const teamData = await this.fetchTeamWithActiveCycle(teamId);
    const currentActiveCycle = teamData.activeCycle;

    if (!lastActiveCycle || !currentActiveCycle) {
      return { transitioned: false };
    }

    if (lastActiveCycle.id !== currentActiveCycle.id) {
      return {
        transitioned: true,
        previousCycleId: lastActiveCycle.id,
        currentCycleId: currentActiveCycle.id
      };
    }

    return { transitioned: false };
  }

  async saveSnapshot(cycleId: string, data: any) {
    const snapshot = await this.prisma.snapshot.create({
      data: {
        cycleId,
        json: JSON.stringify(data)
      }
    });
    
    logger.info({ cycleId }, 'Snapshot saved for cycle');
    return snapshot;
  }

  async fetchTeams() {
    const query = `
      query GetTeams {
        teams {
          nodes {
            id
            key
            name
            organization {
              urlKey
            }
          }
        }
      }
    `;

    const result = await this.client.client.rawRequest(query);
    return result.data.teams.nodes;
  }

  async fetchOrganization() {
    const query = `
      query GetOrganization {
        organization {
          id
          name
          urlKey
        }
      }
    `;

    const result = await this.client.client.rawRequest(query);
    return result.data.organization;
  }

  async fetchTeamMembers(teamId: string) {
    const query = `
      query TeamMembers($teamId: String!) {
        team(id: $teamId) {
          members {
            nodes {
              id
              email
              name
              avatarUrl
              isMe
              active
            }
          }
        }
      }
    `;

    const result = await this.client.client.rawRequest(query, { teamId });
    return result.data.team.members.nodes.filter((member: any) => member.active);
  }
}