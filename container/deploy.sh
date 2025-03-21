#!/bin/bash

# Define the branches
MASTER_BRANCH="master"
DEPLOY_BRANCH="deploy/latest"
REMOTE="origin"

# Fetch latest changes from remote
echo "Fetching latest changes from [$REMOTE]..."
git fetch $REMOTE

# Switch to master and pull latest changes
echo "Checking out [$MASTER_BRANCH]..."
git checkout $MASTER_BRANCH || exit 1

echo "Pulling latest changes into [$MASTER_BRANCH]..."
git pull $REMOTE $MASTER_BRANCH || exit 1

# Update deploy/latest branch
echo "Checking out [$DEPLOY_BRANCH]..."
git checkout $DEPLOY_BRANCH || exit 1

echo "Pulling latest changes into [$DEPLOY_BRANCH]..."
git pull || exit 1

echo "Rebase [$MASTER_BRANCH] onto [$DEPLOY_BRANCH]..."
git rebase $MASTER_BRANCH || exit 1

echo "Pulling after rebase..."
git pull || exit 1

echo "Pushing updates to [$REMOTE/$DEPLOY_BRANCH]..."
git push $REMOTE $DEPLOY_BRANCH || exit 1

# Prune local branches that no longer exist on remote
echo "Cleaning up local branches that no longer exist on [$REMOTE]..."
git remote prune $REMOTE || exit 1

echo "Update process complete!"
