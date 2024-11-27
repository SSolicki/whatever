#!/bin/bash

echo "Setting up staging performance monitoring..."

# Configure CloudWatch alarms for staging
aws cloudwatch put-metric-alarm \
  --alarm-name "staging-error-rate" \
  --alarm-description "Monitor error rate in staging" \
  --metric-name "5XXError" \
  --namespace "AWS/ApplicationELB" \
  --statistic "Sum" \
  --period 300 \
  --threshold 5 \
  --comparison-operator "GreaterThanThreshold" \
  --evaluation-periods 2 \
  --alarm-actions "${STAGING_SNS_TOPIC_ARN}" \
  --dimensions "Name=LoadBalancer,Value=${STAGING_ALB_NAME}"

# Set up performance monitoring for staging
aws cloudwatch put-metric-alarm \
  --alarm-name "staging-latency" \
  --alarm-description "Monitor API latency in staging" \
  --metric-name "TargetResponseTime" \
  --namespace "AWS/ApplicationELB" \
  --statistic "Average" \
  --period 300 \
  --threshold 0.5 \
  --comparison-operator "GreaterThanThreshold" \
  --evaluation-periods 2 \
  --alarm-actions "${STAGING_SNS_TOPIC_ARN}" \
  --dimensions "Name=LoadBalancer,Value=${STAGING_ALB_NAME}"

echo "Staging performance monitoring setup complete"
