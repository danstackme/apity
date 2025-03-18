# Use Node.js 20 as the base image
FROM node:20-slim

# Set working directory
WORKDIR /app

# Install git and other dependencies
RUN apt-get update && apt-get install -y git

# Copy the example project
COPY examples/with-openapi /app/example

# Set working directory to example project
WORKDIR /app/example

# Install tsx globally first
RUN npm install -g tsx

# Clean npm cache and node_modules
RUN rm -rf node_modules package-lock.json && npm cache clean --force

# Install dependencies with platform flag
RUN npm install --platform=linux

# Install the latest version of our package
RUN npm install @danstackme/apity@latest --platform=linux

# Build the project
RUN npm run build

# Run type checking and tests
CMD ["sh", "-c", "npm run typecheck && npm test"] 