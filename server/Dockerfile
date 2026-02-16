# Use Node.js 18 (Alpine for smaller image)
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy source code
COPY . .

# Expose port (Cloud Run sets PORT env var)
EXPOSE 8080

# Start server
CMD ["node", "index.js"]
