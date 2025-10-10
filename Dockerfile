# Stage 1: Base image for dependencies
FROM node:22-alpine AS deps

WORKDIR /usr/src/app

# Install pnpm
RUN npm install -g pnpm

# Copy dependency definition files
COPY package.json pnpm-lock.yaml ./

# Install ALL dependencies (including devDependencies)
RUN pnpm install

# Stage 2: Builder for production
FROM deps AS builder
WORKDIR /usr/src/app
COPY . .
RUN pnpm run build

# Stage 3: Production Image
FROM node:22-alpine AS production
WORKDIR /usr/src/app

# Establecer NODE_ENV para producción
ENV NODE_ENV=prod

RUN npm install -g pnpm
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod
COPY --from=builder /usr/src/app/dist ./dist
COPY entrypoint.sh .
RUN chmod +x ./entrypoint.sh
EXPOSE 3000
ENTRYPOINT ["./entrypoint.sh"]

# Stage 4: Development Image
FROM deps AS development
WORKDIR /usr/src/app
COPY . .
EXPOSE 3000
CMD ["npm", "run", "start:debug"]
