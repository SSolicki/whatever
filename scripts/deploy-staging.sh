#!/bin/bash

echo "Deploying to staging environment..."

# Build application
npm run build

# Deploy to AWS ECS staging cluster
aws ecs update-service \
  --cluster staging \
  --service app-service \
  --task-definition app-task:latest \
  --force-new-deployment

# Wait for deployment to complete
aws ecs wait services-stable \
  --cluster staging \
  --services app-service

echo "Staging deployment complete"
