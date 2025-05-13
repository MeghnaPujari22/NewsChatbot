FROM node:18

# Set working directory
WORKDIR /app

# Copy package.json and install dependencies
COPY package*.json ./
RUN npm install

# Copy all source code
COPY . .

# Expose the app port
EXPOSE 3000

# Start the server
CMD ["node", "src/server.js"]
