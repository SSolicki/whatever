#!/bin/bash

echo "Setting up deployment monitoring..."

# Configure CloudWatch alarms
aws cloudwatch put-metric-alarm \
  --alarm-name "production-error-rate" \
  --alarm-description "Monitor error rate in production" \
  --metric-name "5XXError" \
  --namespace "AWS/ApplicationELB" \
  --statistic "Sum" \
  --period 300 \
  --threshold 10 \
  --comparison-operator "GreaterThanThreshold" \
  --evaluation-periods 2 \
  --alarm-actions "${SNS_TOPIC_ARN}" \
  --dimensions "Name=LoadBalancer,Value=${ALB_NAME}"

# Set up performance monitoring
aws cloudwatch put-metric-alarm \
  --alarm-name "production-latency" \
  --alarm-description "Monitor API latency in production" \
  --metric-name "TargetResponseTime" \
  --namespace "AWS/ApplicationELB" \
  --statistic "Average" \
  --period 300 \
  --threshold 1 \
  --comparison-operator "GreaterThanThreshold" \
  --evaluation-periods 2 \
  --alarm-actions "${SNS_TOPIC_ARN}" \
  --dimensions "Name=LoadBalancer,Value=${ALB_NAME}"

echo "Monitoring setup complete"
