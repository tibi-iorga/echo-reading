# GitHub Setup Guide

## Step 1: Configure Git (One-Time Setup)

Git needs to know who you are. Run these commands with your information:

```bash
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

**Note**: Use the email associated with your GitHub account (if you have one) or any email you prefer.

## Step 2: Create GitHub Account (If You Don't Have One)

1. Go to https://github.com
2. Click "Sign up"
3. Choose a username, email, and password
4. Verify your email

## Step 3: Create a New Repository on GitHub

1. Log into GitHub
2. Click the "+" icon in the top right
3. Select "New repository"
4. Repository name: `books-reading` (or whatever you prefer)
5. Description: "Echo - AI reading companion for PDFs"
6. Choose **Private** (recommended for personal projects)
7. **DO NOT** initialize with README, .gitignore, or license (we already have files)
8. Click "Create repository"

## Step 4: Connect Local Repository to GitHub

After creating the repository, GitHub will show you commands. Use these:

```bash
# Make sure you're in your project directory
cd d:\personal-projects\books-reading

# Add all files
git add .

# Commit them
git commit -m "Initial commit: v0.1.0 stable baseline"

# Tag the stable version
git tag -a v0.1.0 -m "Stable baseline version"

# Add GitHub as remote (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/books-reading.git

# Push everything to GitHub
git push -u origin main

# Push tags
git push origin v0.1.0
```

**Note**: If your default branch is `master` instead of `main`, use `master` in the commands above.

## Step 5: Verify

1. Go to your GitHub repository page
2. You should see all your files
3. Click "tags" or go to "Releases" to see v0.1.0 tag

## Authentication

GitHub may ask you to authenticate. You have two options:

### Option A: Personal Access Token (Recommended)
1. GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Generate new token (classic)
3. Give it a name like "Echo Project"
4. Select scopes: `repo` (full control)
5. Copy the token
6. When Git asks for password, paste the token instead

### Option B: GitHub CLI (Easier, but requires installation)
```bash
# Install GitHub CLI from https://cli.github.com
gh auth login
```

## Future Workflow

### Daily Development
```bash
git add .
git commit -m "Description of changes"
git push
```

### Before Major Changes
```bash
git tag -a v0.1.0 -m "Stable before [feature]"
git push origin v0.1.0
```

### If Something Breaks
```bash
git tag -l                    # See available versions
git checkout v0.1.0           # Restore stable version
```

## Troubleshooting

**"Branch 'main' does not exist"**
- Your default branch might be `master`. Use `git push -u origin master` instead.

**"Authentication failed"**
- Make sure you're using a Personal Access Token, not your password
- Or use GitHub CLI: `gh auth login`

**"Remote origin already exists"**
- Run: `git remote remove origin` then add it again
