FROM node:22-slim

# Cài đặt OpenSSL cho Prisma (Debian sử dụng apt-get)
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy các file config package
COPY package.json package-lock.json* ./

# Cấu hình npm để tránh đứng máy và lỗi mạng (timeout, retries, sockets)
RUN npm config set fetch-retry-maxtimeout 600000 && \
    npm config set fetch-retry-mintimeout 10000 && \
    npm config set fetch-retries 10 && \
    npm config set maxsockets 20 && \
    npm install --no-audit --no-fund --ignore-scripts

# Copy Prisma schema trước để generate client
COPY prisma ./prisma/
RUN npx prisma generate

# Copy toàn bộ mã nguồn
COPY . .

# Build mã nguồn
RUN npm run build

# Expose port
EXPOSE 3000

# Chạy ứng dụng
CMD ["npm", "start"]

