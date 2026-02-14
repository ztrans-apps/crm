# Dockerfile for WhatsApp Service
FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY . .

# Create auth directory
RUN mkdir -p .baileys_auth && chown -R node:node .baileys_auth

# Switch to non-root user
USER node

EXPOSE 3001

CMD ["npm", "start"]
