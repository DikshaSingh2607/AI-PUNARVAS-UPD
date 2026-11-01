# ─────────────────────────────────────────────────────────────
# AI-Punarvas Frontend — Node 20 Alpine
# ─────────────────────────────────────────────────────────────
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install dependencies first for better Docker layer caching
COPY package.json package-lock.json* ./
RUN npm install

# Copy the rest of the source code
COPY . .

# Expose Vite / Next.js dev server port
EXPOSE 3000

# Start dev server, binding to all interfaces so Nginx can reach it
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
