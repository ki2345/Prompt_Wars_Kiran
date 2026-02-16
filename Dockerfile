# 1. Use Node.js to run the server
FROM node:18-slim

# 2. Create the working directory
WORKDIR /workspace

# 3. Copy your game files into the container
COPY . .

# 4. Install any needed packages (if you have a package.json)
RUN npm install --production || true

# 5. Tell Google Cloud which port to use (8080 is standard)
ENV PORT=8080
EXPOSE 8080

# 6. Start the game (Change 'server.js' to your main file name)
CMD ["node", "server.js"]
