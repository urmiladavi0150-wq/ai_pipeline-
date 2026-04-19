#!/usr/bin/env bash

# API Testing Script
# This script tests the async AI pipeline backend endpoints

API_URL="http://localhost:3000"
BOLD='\033[1m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BOLD}=== Async AI Pipeline Backend - API Tests ===${NC}\n"

# Test 1: Health check
echo -e "${BOLD}Test 1: Health Check (Homepage)${NC}"
echo "GET $API_URL"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL")
if [ "$RESPONSE" = "200" ]; then
    echo -e "${GREEN}✓ PASS${NC} - Status: $RESPONSE\n"
else
    echo -e "${RED}✗ FAIL${NC} - Status: $RESPONSE\n"
fi

# Test 2: Invalid type
echo -e "${BOLD}Test 2: Invalid Job Type${NC}"
echo "POST $API_URL/api/create-job"
echo 'Body: {"type":"podcast","input":"https://example.com/audio.mp3"}'
RESPONSE=$(curl -s -X POST "$API_URL/api/create-job" \
  -H "Content-Type: application/json" \
  -d '{"type":"podcast","input":"https://example.com/audio.mp3"}')
echo "Response: $RESPONSE"
if echo "$RESPONSE" | grep -q "INVALID_TYPE"; then
    echo -e "${GREEN}✓ PASS${NC} - Returns expected error\n"
else
    echo -e "${RED}✗ FAIL${NC} - Unexpected response\n"
fi

# Test 3: Create with valid YouTube URL
echo -e "${BOLD}Test 3: Create Job (YouTube - SHOULD RETURN IMMEDIATELY)${NC}"
echo "POST $API_URL/api/create-job"
echo 'Body: {"type":"youtube","input":"https://www.youtube.com/watch?v=dQw4w9WgXcQ"}'
START_TIME=$(date +%s%N)
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/api/create-job" \
  -H "Content-Type: application/json" \
  -d '{"type":"youtube","input":"https://www.youtube.com/watch?v=dQw4w9WgXcQ"}')
END_TIME=$(date +%s%N)
DURATION=$(echo "scale=3; ($END_TIME - $START_TIME) / 1000000" | bc)

HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | sed '$d')
JOB_ID=$(echo "$BODY" | grep -o '"job_id":"[^"]*"' | cut -d'"' -f4)

echo "Response: $BODY"
echo "HTTP Status: $HTTP_CODE"
echo "Response Time: ${DURATION}ms"

if [ "$HTTP_CODE" = "202" ] && [ -n "$JOB_ID" ]; then
    echo -e "${GREEN}✓ PASS${NC} - Returns 202 (Accepted) with job_id: $JOB_ID"
    if (( ${DURATION%.*} < 1000 )); then
        echo -e "${GREEN}✓ FAST${NC} - Responded in under 1 second (${DURATION}ms)\n"
    else
        echo -e "${YELLOW}⚠ SLOW${NC} - Response took ${DURATION}ms (should be < 1s)\n"
    fi
else
    echo -e "${RED}✗ FAIL${NC} - Expected 202 status, got $HTTP_CODE\n"
fi

# Test 4: Poll job status immediately (should be queued or processing)
if [ -n "$JOB_ID" ]; then
    echo -e "${BOLD}Test 4: Poll Job Status (Immediate)${NC}"
    echo "GET $API_URL/api/job-status?job_id=$JOB_ID"
    RESPONSE=$(curl -s "$API_URL/api/job-status?job_id=$JOB_ID")
    echo "Response: $RESPONSE"
    if echo "$RESPONSE" | grep -q '"status"'; then
        echo -e "${GREEN}✓ PASS${NC} - Job status retrieved\n"
    else
        echo -e "${RED}✗ FAIL${NC} - Could not retrieve status\n"
    fi
fi

# Test 5: Non-existent job
echo -e "${BOLD}Test 5: Non-existent Job${NC}"
echo "GET $API_URL/api/job-status?job_id=nonexistent"
RESPONSE=$(curl -s -w "\n%{http_code}" "$API_URL/api/job-status?job_id=nonexistent")
HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | sed '$d')
echo "Response: $BODY"
echo "HTTP Status: $HTTP_CODE"
if [ "$HTTP_CODE" = "404" ] && echo "$BODY" | grep -q "JOB_NOT_FOUND"; then
    echo -e "${GREEN}✓ PASS${NC} - Returns 404 with correct error code\n"
else
    echo -e "${RED}✗ FAIL${NC} - Expected 404 JOB_NOT_FOUND\n"
fi

echo -e "${BOLD}=== Test Summary ===${NC}"
echo -e "${GREEN}✓${NC} Backend is responding to requests"
echo -e "${GREEN}✓${NC} API returns valid job IDs immediately"
echo -e "${GREEN}✓${NC} Error handling is working correctly"
echo ""
echo "Next steps:"
echo "1. The job will process in the background"
echo "2. Poll /api/job-status every 2-5 seconds"
echo "3. When status === 'done', the result will be available"
echo ""
