#!/bin/bash
echo "Setting up ForgeAI Studio..."
cd "$(dirname "$0")/.."
npm install
cd shared && npm install && npm run build && cd ..
cd backend && npm install && cd ..
cd frontend && npm install && cd ..
echo "Setup complete! Run 'npm run dev' to start."
