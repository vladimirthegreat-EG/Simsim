#!/bin/bash
echo "========================================"
echo "  Business Simulation - Dev Server"
echo "========================================"
echo ""
echo "Starting Next.js dev server..."
echo ""
cd "$(dirname "$0")/src"
npm run dev
