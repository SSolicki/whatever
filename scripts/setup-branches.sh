#!/bin/bash

echo "Starting branch setup..."

# Ensure we're in a clean state
git fetch origin
echo "Fetched latest changes"

# Switch to main
git checkout main
git pull origin main
echo "Updated main branch"

# Create and push release branch
git checkout -b release || git checkout release
git push origin release -f
echo "Created release branch"

# Create category branches
categories=("Frontend" "Backend" "Feature" "Refactor" "Consolidate")

for category in "${categories[@]}"; do
    echo "Setting up ${category} branches..."
    
    # Create and push category branch
    git checkout release
    git checkout -b "${category}" || git checkout "${category}"
    git push origin "${category}" -f
    
    # Create and push sub-team branch
    git checkout "${category}"
    git checkout -b "${category}/SubTeam1" || git checkout "${category}/SubTeam1"
    git push origin "${category}/SubTeam1" -f
done

# Create bugs branch structure
echo "Setting up Bugs branches..."
git checkout main
git checkout -b "Bugs" || git checkout "Bugs"
git push origin "Bugs" -f
git checkout -b "Bugs/SubTeam1" || git checkout "Bugs/SubTeam1"
git push origin "Bugs/SubTeam1" -f

# Return to main
git checkout main

echo "Branch structure setup completed!"
echo "Created branches:"
git branch -a
