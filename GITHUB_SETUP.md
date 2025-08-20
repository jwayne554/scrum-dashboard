# GitHub Repository Setup

## Step 1: Create GitHub Repository

1. Go to [GitHub.com](https://github.com) and sign in
2. Click the **"+"** icon in the top right → **"New repository"**
3. Fill in the details:
   - **Repository name**: `scrum-dashboard` (or your preferred name)
   - **Description**: "Real-time Scrum dashboard with Linear integration"
   - **Visibility**: Choose Private or Public based on your preference
   - **DON'T** initialize with README, .gitignore, or license (we already have these)
4. Click **"Create repository"**

## Step 2: Push Code to GitHub

After creating the repository, GitHub will show you commands. Use these:

```bash
# Add your GitHub repository as remote (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/scrum-dashboard.git

# Push the code
git branch -M main
git push -u origin main
```

If you're using SSH instead of HTTPS:
```bash
git remote add origin git@github.com:YOUR_USERNAME/scrum-dashboard.git
git push -u origin main
```

## Step 3: Verify Upload

1. Refresh your GitHub repository page
2. You should see all your files uploaded
3. Check that `.env` files are NOT visible (they should be ignored)

## Next: Railway Deployment

Once your code is on GitHub, we'll proceed with Railway deployment.

## Troubleshooting

### Authentication Issues
If you get authentication errors when pushing:

**Option 1: Personal Access Token (Recommended)**
1. Go to GitHub Settings → Developer settings → Personal access tokens
2. Generate a new token with `repo` scope
3. Use the token as your password when pushing

**Option 2: GitHub CLI**
```bash
# Install GitHub CLI
brew install gh

# Authenticate
gh auth login

# Push using gh
gh repo create scrum-dashboard --private --source=. --remote=origin --push
```

### Permission Denied
If you get "Permission denied (publickey)":
```bash
# Switch to HTTPS instead of SSH
git remote set-url origin https://github.com/YOUR_USERNAME/scrum-dashboard.git
```

## Ready to Continue?

Once your code is successfully pushed to GitHub, let me know and we'll proceed with Railway deployment!