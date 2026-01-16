# Backend Dockerfile
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy prisma schema
COPY prisma ./prisma/

# Generate Prisma Client
RUN npx prisma generate

# Copy application files
COPY . .

# Create signatures directory
RUN mkdir -p public/signatures

# Expose port
EXPOSE 5000

# Start command
CMD ["sh", "-c", "npx prisma migrate deploy && node server.js"]
