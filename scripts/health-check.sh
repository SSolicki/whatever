#!/bin/bash

ENVIRONMENT=$1
HEALTH_CHECK_URL=$(aws ssm get-parameter --name "/${ENVIRONMENT}/health-check-url" --query "Parameter.Value" --output text)
MAX_RETRIES=30
RETRY_INTERVAL=10

echo "Running health check for ${ENVIRONMENT} environment..."

for i in $(seq 1 $MAX_RETRIES); do
  HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" $HEALTH_CHECK_URL)
  
  if [ $HTTP_STATUS -eq 200 ]; then
    echo "Health check passed!"
    exit 0
  fi
  
  echo "Attempt $i of $MAX_RETRIES failed. Retrying in ${RETRY_INTERVAL}s..."
  sleep $RETRY_INTERVAL
done

echo "Health check failed after $MAX_RETRIES attempts"
exit 1
