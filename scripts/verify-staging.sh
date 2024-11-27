#!/bin/bash

echo "Verifying staging deployment..."

# Run integration tests
npm run test:integration

# Run API tests
npm run test:api

# Run UI tests
npm run test:ui

# Run performance tests
npm run test:performance

# Check deployment health
./health-check.sh staging

echo "Staging verification complete"
