# 🚀 Smart API Hub

REST API Platform tự động sinh API từ file `schema.json` (Node.js + TypeScript + Express + Prisma + PostgreSQL).

## 🌟 Tính Năng
- **Auto-Migration**: Tự động load `schema.json` định nghĩa các model.
- **Dynamic CRUD**: Cung cấp API endpoint động (`GET /api/:resource`, `POST /api/:resource`, ...).
- **Advanced Query**: Hỗ trợ phân trang (`_page`, `_limit`), sắp xếp (`_sort`, `_order`), và filters (`_gte`, `_lte`, `_ne`, `_like`, `q=`).
- **Relationships**: `_expand`, `_embed` để tải dữ liệu liên kết.
- **Bảo Mật**: JWT Authentication & Role-based Authorization (Admin & User).
- **Global Error Handling**: Bắt và định dạng lỗi (404, 400, 500) an toàn.
- **Testing**: 10+ Test cases bằng Vitest + Supertest chuẩn xác.
- **Swagger UI**: `/api-docs` tích hợp sẵn.

---

## 🏗 Architecture Diagram

```mermaid
graph TD;
    Client((Client)) -->|HTTP Requests| Express[Express Server];
    Express -->|Auth Middleware| JWT[JWT Validator];
    Express -->|Validation| Zod[Zod Validator];
    Express -->|Dynamic Route| DynamicCRUD[Dynamic CRUD Controller];
    DynamicCRUD -->|ORM| Prisma[Prisma ORM];
    Prisma -->|Query/Execute| Postgres[(PostgreSQL)];
    
    subgraph "Application Core"
      Express
      JWT
      Zod
      DynamicCRUD
    end
```

## 🛠 Hướng Dẫn Cài Đặt & Chạy

### 1. Requirements
- Node.js >= 20
- Docker & Docker Compose

### 2. Chạy với Docker Compose (Platform đầy đủ)
Đảm bảo bạn đang ở thư mục gốc chứa `docker` hoặc truyền thẻ `-f`:

```bash
docker-compose -f docker/docker-compose.yml up --build -d
```
Docker sẽ khởi tạo PostgreSQL database (`postgres_db`) và Web server app.

### 3. Chạy Local (Môi trường Dev)
Cấu hình URL trong file `.env`:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/postgres_db?schema=public"
JWT_SECRET="YOUR_SECRET"
PORT=3000
```
Tiến hành cập nhật Prisma & Database:
```bash
npm install
npx prisma db push # Hoặc npx prisma migrate dev
```
Chạy ứng dụng:
```bash
npm run dev
```

Chạy kiểm thử:
```bash
npm run test
```

## 📚 API Docs
Swagger UI đã được khởi tạo và cấu hình tài liệu ở `docker/swagger.yaml`.
Sau khi server chạy, truy cập tài liệu tại:
[http://localhost:3000/api-docs](http://localhost:3000/api-docs)

> Tệp Postman Collection đính kèm cùng source code cho phép tải vào và test nhanh chóng!
