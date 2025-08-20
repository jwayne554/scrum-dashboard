import { LinearClient } from '@linear/sdk';
import dotenv from 'dotenv';

dotenv.config();

const client = new LinearClient({ apiKey: process.env.LINEAR_API_KEY });

async function test() {
  try {
    // Test fetching a specific issue with its relations
    const query = `
      query {
        issue(id: "GP-1254") {
          identifier
          title
          relations {
            nodes {
              type
              relatedIssue {
                identifier
                title
              }
            }
          }
        }
      }
    `;
    
    const result = await client.client.rawRequest(query);
    console.log('GP-1254 Relations:', JSON.stringify(result.data, null, 2));
    
    // Also test GP-1301
    const query2 = `
      query {
        issue(id: "GP-1301") {
          identifier
          title
          relations {
            nodes {
              type
              relatedIssue {
                identifier
                title
              }
            }
          }
        }
      }
    `;
    
    const result2 = await client.client.rawRequest(query2);
    console.log('\nGP-1301 Relations:', JSON.stringify(result2.data, null, 2));
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

test();