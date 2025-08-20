export function getLinearIssueUrl(issueId: string, workspaceUrlKey?: string): string {
  // Linear URL format: https://linear.app/{workspace-url-key}/issue/{issue-id}/
  // Note: The trailing slash is required for Linear URLs
  // The workspace URL key is the organization's URL slug (e.g., "spinachhr")
  
  if (workspaceUrlKey) {
    return `https://linear.app/${workspaceUrlKey}/issue/${issueId}/`;
  }
  
  // Fallback: Linear can handle issue IDs directly
  return `https://linear.app/issue/${issueId}/`;
}