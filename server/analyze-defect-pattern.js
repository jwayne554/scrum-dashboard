import { LinearClient } from '@linear/sdk';
import dotenv from 'dotenv';

dotenv.config();

const client = new LinearClient({ apiKey: process.env.LINEAR_API_KEY });

async function analyze() {
  try {
    const teamId = '1822a56e-3ac7-4664-972a-9bf0d317347c';
    const cycleId = 'dcb3931a-952c-4c0f-8a3f-04a21be399ce';
    
    // Fetch all issues in the cycle
    const query = `
      query {
        issues(
          filter: { 
            team: { id: { eq: "${teamId}" } }
            cycle: { id: { eq: "${cycleId}" } }
          }
          first: 100
        ) {
          nodes {
            identifier
            title
            createdAt
            startedAt
            labels {
              nodes { name }
            }
            estimate
            stateType
            relations {
              nodes {
                type
                relatedIssue {
                  identifier
                  title
                  labels {
                    nodes { name }
                  }
                }
              }
            }
            parent {
              identifier
            }
            children {
              nodes {
                identifier
                title
                labels {
                  nodes { name }
                }
              }
            }
          }
        }
      }
    `;
    
    const result = await client.client.rawRequest(query);
    const issues = result.data.issues.nodes;
    
    console.log('=== SPRINT QUALITY ANALYSIS ===\n');
    console.log('Total issues in sprint:', issues.length);
    
    // Categorize issues
    const features = [];
    const bugs = [];
    const defects = [];
    
    issues.forEach(issue => {
      const labels = issue.labels.nodes.map(l => l.name.toLowerCase());
      const isBug = labels.some(l => l.includes('bug') || l.includes('defect'));
      const isDefect = labels.some(l => l.includes('defect'));
      
      if (isBug) {
        bugs.push(issue);
        if (isDefect) defects.push(issue);
      } else {
        features.push(issue);
      }
    });
    
    console.log('\n📊 ISSUE BREAKDOWN:');
    console.log('  Features/Stories:', features.length);
    console.log('  Bugs:', bugs.length);
    console.log('  Defects (subset of bugs):', defects.length);
    
    // Analyze bug creation patterns
    console.log('\n🐛 BUG DETAILS:');
    bugs.forEach(bug => {
      const createdDate = new Date(bug.createdAt);
      console.log(`  ${bug.identifier}: ${bug.title.substring(0, 50)}...`);
      console.log(`    Created: ${createdDate.toLocaleDateString()}`);
      console.log(`    Labels: ${bug.labels.nodes.map(l => l.name).join(', ')}`);
      
      // Check if it has a parent (sub-issue)
      if (bug.parent) {
        console.log(`    Parent: ${bug.parent.identifier}`);
      }
      
      // Check relations
      if (bug.relations.nodes.length > 0) {
        bug.relations.nodes.forEach(rel => {
          console.log(`    ${rel.type}: ${rel.relatedIssue.identifier}`);
        });
      }
    });
    
    // Calculate quality metrics
    console.log('\n📈 QUALITY METRICS:');
    
    // Method 1: Bug Density
    const totalPoints = issues.reduce((sum, i) => sum + (i.estimate || 0), 0);
    const bugPoints = bugs.reduce((sum, i) => sum + (i.estimate || 0), 0);
    const bugDensity = totalPoints > 0 ? (bugPoints / totalPoints) * 100 : 0;
    
    console.log(`  Bug Density: ${Math.round(bugDensity)}% of story points are bugs`);
    
    // Method 2: Bug Rate
    const bugRate = issues.length > 0 ? (bugs.length / issues.length) * 100 : 0;
    console.log(`  Bug Rate: ${Math.round(bugRate)}% of tickets are bugs`);
    
    // Method 3: First Time Quality (inverse of bug rate for features)
    const firstTimeQuality = 100 - bugRate;
    console.log(`  First Time Quality: ${Math.round(firstTimeQuality)}% (features without bugs)`);
    
    // Method 4: In-Sprint Bug Discovery
    // Check bugs created after sprint start
    const sprintStart = new Date('2025-07-29'); // From cycle data
    const inSprintBugs = bugs.filter(bug => new Date(bug.createdAt) > sprintStart);
    console.log(`  In-Sprint Bugs: ${inSprintBugs.length} bugs found during sprint`);
    
    // Method 5: Features with related bugs (check relations)
    let featuresWithBugs = 0;
    features.forEach(feature => {
      const hasRelatedBug = feature.relations.nodes.some(rel => {
        const related = rel.relatedIssue;
        return related.labels.nodes.some(l => 
          l.name.toLowerCase().includes('bug')
        );
      });
      
      if (hasRelatedBug || feature.children.nodes.some(child => 
        child.labels.nodes.some(l => l.name.toLowerCase().includes('bug'))
      )) {
        featuresWithBugs++;
      }
    });
    
    if (features.length > 0) {
      const defectEscapeRate = (featuresWithBugs / features.length) * 100;
      console.log(`  Defect Escape Rate: ${Math.round(defectEscapeRate)}% of features have bugs`);
    }
    
    console.log('\n💡 RECOMMENDATIONS:');
    if (bugRate > 30) {
      console.log('  ⚠️ High bug rate - Review development practices');
    }
    if (inSprintBugs.length > 5) {
      console.log('  ⚠️ Many bugs found during sprint - Improve testing before sprint');
    }
    if (bugDensity > 20) {
      console.log('  ⚠️ Significant effort on bugs - Focus on prevention');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

analyze();