FROM node:18

WORKDIR /app

# Copy only package files first (cache optimization)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy rest of the app (public, src, etc.)
COPY . .

# Build React app
RUN CI=true npm run build

# Install serve to host the build
RUN npm install -g serve
EXPOSE 3000

# Serve the build folder
CMD ["serve", "-s", "build", "-l", "3000"]
