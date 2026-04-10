FROM node:20-slim

# Cài đặt OpenSSL cho Prisma (Debian sử dụng apt-get)
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy các file config package
COPY package.json package-lock.json* ./

# Cấu hình npm để tránh đứng máy (timeout, log level)
# Sử dụng --ignore-scripts để không chạy prisma generate tự động lúc này
RUN npm config set fetch-retry-maxtimeout 600000 && \
    npm config set fetch-retries 5 && \
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

