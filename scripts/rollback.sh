#!/bin/bash

echo "Initiating rollback procedure..."

# Get previous task definition
PREVIOUS_TASK_DEF=$(aws ecs describe-services \
  --cluster production \
  --services app-service \
  --query 'services[0].taskDefinition' \
  --output text)

# Roll back to previous task definition
aws ecs update-service \
  --cluster production \
  --service app-service \
  --task-definition $PREVIOUS_TASK_DEF \
  --force-new-deployment

# Switch traffic back to green environment
./switch-traffic.sh green

echo "Rollback completed"
