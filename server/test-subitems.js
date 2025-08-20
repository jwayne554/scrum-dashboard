import { LinearClient } from '@linear/sdk';
import dotenv from 'dotenv';

dotenv.config();

const client = new LinearClient({ apiKey: process.env.LINEAR_API_KEY });

async function test() {
  try {
    // Test fetching issues with their children (sub-issues)
    const query = `
      query {
        issues(
          filter: { 
            team: { id: { eq: "1822a56e-3ac7-4664-972a-9bf0d317347c" } }
            cycle: { id: { eq: "dcb3931a-952c-4c0f-8a3f-04a21be399ce" } }
          }
          first: 5
        ) {
          nodes {
            identifier
            title
            labels {
              nodes { name }
            }
            children {
              nodes {
                identifier
                title
                labels {
                  nodes { name }
                }
                createdAt
              }
            }
            parent {
              identifier
              title
            }
          }
        }
      }
    `;
    
    const result = await client.client.rawRequest(query);
    
    console.log('=== PARENT-CHILD RELATIONSHIPS IN LINEAR ===\n');
    
    let featuresWithDefects = 0;
    let totalFeatures = 0;
    let totalDefects = 0;
    
    result.data.issues.nodes.forEach(issue => {
      if (issue.children.nodes.length > 0) {
        console.log(`📋 ${issue.identifier}: ${issue.title}`);
        console.log('   Sub-issues:');
        
        let hasDefectChild = false;
        issue.children.nodes.forEach(child => {
          const isBug = child.labels.nodes.some(l => 
            l.name.toLowerCase().includes('bug') || 
            l.name.toLowerCase().includes('defect')
          );
          
          console.log(`     └─ ${child.identifier}: ${child.title}`);
          console.log(`        Labels: ${child.labels.nodes.map(l => l.name).join(', ') || 'none'}`);
          
          if (isBug) {
            hasDefectChild = true;
            totalDefects++;
          }
        });
        
        if (hasDefectChild) featuresWithDefects++;
        if (!issue.parent) totalFeatures++; // Only count parent issues
        
        console.log('');
      }
    });
    
    console.log('\n=== QUALITY METRICS POTENTIAL ===');
    console.log('Features with defects:', featuresWithDefects);
    console.log('Total features:', totalFeatures);
    console.log('Total defects found:', totalDefects);
    
    if (totalFeatures > 0) {
      const defectRate = (featuresWithDefects / totalFeatures) * 100;
      const firstTimeQuality = 100 - defectRate;
      
      console.log('\nFirst Time Quality:', Math.round(firstTimeQuality) + '%');
      console.log('(Features without defects)');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

test();