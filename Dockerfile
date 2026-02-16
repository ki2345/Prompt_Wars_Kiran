# Use a light Node.js image
FROM node:18-slim

# Create app directory
WORKDIR /usr/src/app

# Copy all your files from GitHub to the container
COPY . .

# Install dependencies (if any)
RUN npm install --production || true

# Change this to the port your game uses (usually 8080 for Cloud Run)
EXPOSE 8080

# The command to run your game
CMD [ "node", "server.js" ]
