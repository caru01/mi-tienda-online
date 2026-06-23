#!/usr/bin/env bash
# Exit on error
set -o errexit

echo "Install Python dependencies..."
pip install -r requirements.txt

echo "Install Node dependencies and build React app (Dashboard)..."
cd dashboard
npm install
npm run build
cd ..

echo "Install Node dependencies and build React app (Pedidos App)..."
cd pedidos-app
npm install
npm run build
cd ..

echo "Build complete."
