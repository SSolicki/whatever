#!/bin/bash

# Deploy to blue environment
echo "Deploying to blue environment..."

# Build application
npm run build

# Deploy to AWS ECS blue target group
aws ecs update-service \
  --cluster production \
  --service app-service \
  --task-definition app-task:latest \
  --force-new-deployment

# Wait for deployment to complete
aws ecs wait services-stable \
  --cluster production \
  --services app-service
