FROM node:20-alpine

WORKDIR /app

# Cài đặt OpenSSL (Prisma cần)
RUN apk add --no-cache openssl

# Copy cấu hình package
COPY package.json package-lock.json* ./

# Cài đặt dependencies
RUN npm ci

# Copy toàn bộ mã nguồn
COPY . .

# Generate Prisma Client và Build TypeScript
RUN npx prisma generate
RUN npm run build

# Expose port
EXPOSE 3000

# Command chạy môi trường
CMD ["npm", "start"]
