#!/bin/bash
echo "🧹 Cleaning caches and old builds..."
rm -rf node_modules/.cache
rm -rf build
rm -rf dist

echo "📦 Reinstalling dependencies..."
npm install

echo "🚀 Starting dev server..."
npm start