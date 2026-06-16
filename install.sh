#!/bin/bash
set -e

echo "Installing Kodo..."

# Check Docker
if ! command -v docker &> /dev/null; then
  echo "Error: Docker is not installed. https://docs.docker.com/get-docker/"
  exit 1
fi

# Create data directory
mkdir -p ~/.kodo

# Generate JWT secret if not set
if [ -z "$JWT_SECRET" ]; then
  JWT_SECRET=$(openssl rand -hex 32 2>/dev/null || cat /dev/urandom | tr -dc 'a-f0-9' | head -c 64)
fi

# Download compose file
curl -fsSL https://raw.githubusercontent.com/yourusername/kodo/main/docker-compose.yml -o ~/.kodo/docker-compose.yml

# Write env file
cat > ~/.kodo/.env <<EOF
JWT_SECRET=$JWT_SECRET
EOF

# Start
cd ~/.kodo
docker compose --env-file .env up -d

echo ""
echo "Kodo is running at http://localhost:3000"
