#!/bin/bash

echo "Running integration verification..."

# Run end-to-end tests
npm run test:e2e

# Run cross-browser tests
npm run test:cross-browser

# Run visual regression tests
npm run test:visual

# Run security scans
npm run test:security

# Run accessibility tests
npm run test:a11y

echo "Integration verification complete"
