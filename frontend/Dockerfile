# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the app for production
RUN npm run build:prod

# Production stage
FROM nginx:alpine

# Copy built files to nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx config (if exists)
COPY nginx.conf /etc/nginx/nginx.conf 2>/dev/null || echo "No nginx.conf found, using default"

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
