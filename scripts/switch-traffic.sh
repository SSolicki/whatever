#!/bin/bash

TARGET=$1

echo "Switching traffic to ${TARGET} environment..."

# Get the ALB listener ARN
LISTENER_ARN=$(aws elbv2 describe-listeners \
  --load-balancer-arn $(aws elbv2 describe-load-balancers --names app-lb --query 'LoadBalancers[0].LoadBalancerArn' --output text) \
  --query 'Listeners[0].ListenerArn' \
  --output text)

# Get target group ARN
TARGET_GROUP_ARN=$(aws elbv2 describe-target-groups \
  --names "app-${TARGET}" \
  --query 'TargetGroups[0].TargetGroupArn' \
  --output text)

# Update listener rule to forward traffic to new target group
aws elbv2 modify-listener \
  --listener-arn $LISTENER_ARN \
  --default-actions Type=forward,TargetGroupArn=$TARGET_GROUP_ARN

echo "Traffic successfully switched to ${TARGET} environment"
