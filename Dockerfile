FROM node:22-alpine


WORKDIR /app

# Cài đặt OpenSSL (Prisma cần)
RUN apk add --no-cache openssl

# Copy cấu hình package
COPY package.json package-lock.json* ./

# Cài đặt dependencies
RUN npm install


# Copy toàn bộ mã nguồn
COPY . .

# Build mã nguồn (tự động chạy prebuild để sinh schema và tsc để biên dịch)
RUN npm run build

# Expose port
EXPOSE 3000

# Sử dụng start script (node dist/index.js)
CMD ["npm", "start"]

