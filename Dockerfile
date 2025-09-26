# Stage 1: Build the application
FROM node:22-alpine AS builder

# Set working directory
WORKDIR /usr/src/app

# Install pnpm
RUN npm install -g pnpm

# Copy dependency definition files
COPY package.json pnpm-lock.yaml ./

# Install ALL dependencies (including devDependencies for building)
RUN pnpm install

# Copy the rest of the application source code
COPY . .

# Build the application
RUN pnpm run build

# Stage 2: Create the production image
FROM node:22-alpine AS production

# Set working directory
WORKDIR /usr/src/app

# Install pnpm
RUN npm install -g pnpm

# Copy dependency definition files for production
COPY package.json pnpm-lock.yaml ./

# Install ONLY production dependencies
RUN pnpm install --prod

# Copy built application from the builder stage
COPY --from=builder /usr/src/app/dist ./dist

# Expose the port the app runs on
EXPOSE 3000

# Command to run the application
CMD ["node", "dist/main"]
