FROM node:20-slim

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY client/package*.json ./client/

# Install dependencies
RUN npm install
RUN cd client && npm install

# Copy source code
COPY . .

# Build the application
RUN npm run build:server
RUN cd client && npm run build

# Create data directory for SQLite
RUN mkdir -p /data

# Expose port
EXPOSE 8080

# Start the application
CMD ["npm", "start"]
