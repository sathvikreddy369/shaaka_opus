# Shaaka - Organic Grocery E-Commerce Platform

A production-ready, full-stack e-commerce web application for organic groceries, serving the Hyderabad region with a 25km delivery radius.

## 🌿 Features

### Customer Features
- 📱 OTP-based phone authentication (MSG91)
- 🛒 Full shopping cart functionality
- ❤️ Wishlist management
- 🔍 Product search with filters (category, price, sort)
- 📦 Order tracking and history
- ⭐ Product reviews and ratings
- 📍 Geolocation-based delivery verification
- 💳 Razorpay payment integration + COD
- 👤 Profile and address management

### Admin Features
- 📊 Dashboard with key metrics
- 📦 Product CRUD with image upload
- 📁 Category management
- 🛍️ Order management with status updates
- 👥 Customer management with role assignment
- 📈 Analytics with charts (revenue, orders, top products)

## 🛠️ Tech Stack

### Backend
- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB with Mongoose ODM
- **Authentication:** JWT (access & refresh tokens) + MSG91 OTP
- **Payment:** Razorpay
- **Storage:** Cloudinary for images
- **Security:** bcrypt, helmet, rate limiting

### Frontend
- **Framework:** Next.js 14 (App Router)
- **UI:** React 18 with TypeScript
- **Styling:** Tailwind CSS
- **State Management:** Zustand with persist middleware
- **Forms:** React Hook Form
- **Charts:** Recharts
- **Icons:** Heroicons
- **UI Components:** Headless UI

## Getting Started

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)
- Cloudinary account
- Razorpay account
- MSG91 account

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file from example:
```bash
cp .env.example .env
```

4. Configure environment variables:
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/shaaka
JWT_SECRET=your-super-secret-jwt-key
JWT_REFRESH_SECRET=your-refresh-token-secret
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
RAZORPAY_KEY_ID=your-key-id
RAZORPAY_KEY_SECRET=your-key-secret
RAZORPAY_WEBHOOK_SECRET=your-webhook-secret
MSG91_AUTH_KEY=your-auth-key
MSG91_TEMPLATE_ID=your-template-id
MSG91_SENDER_ID=SHAAKA
```

5. Seed the database:
```bash
# Create admin user
npm run seed:admin

# Seed sample data
npm run seed
```

6. Start the server:
```bash
# Development
npm run dev

# Production
npm start
```

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env.local` file:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_RAZORPAY_KEY_ID=your-razorpay-key-id
```

4. Start the development server:
```bash
npm run dev
```

5. Build for production:
```bash
npm run build
npm start
```

## API Endpoints

### Authentication
- `POST /api/auth/send-otp` - Send OTP to phone
- `POST /api/auth/verify-otp` - Verify OTP and login
- `POST /api/auth/complete-profile` - Complete user profile
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update profile
- `POST /api/auth/location` - Set user location
- `POST /api/auth/refresh-token` - Refresh access token
- `POST /api/auth/logout` - Logout

### Products
- `GET /api/products` - List products (with filters)
- `GET /api/products/featured` - Featured products
- `GET /api/products/:slug` - Product details
- `POST /api/products` - Create product (Admin)
- `PUT /api/products/:id` - Update product (Admin)
- `DELETE /api/products/:id` - Delete product (Admin)

### Categories
- `GET /api/categories` - List categories
- `GET /api/categories/:slug` - Category details
- `POST /api/categories` - Create category (Admin)
- `PUT /api/categories/:id` - Update category (Admin)
- `DELETE /api/categories/:id` - Delete category (Admin)

### Cart
- `GET /api/cart` - Get user cart
- `POST /api/cart/items` - Add item to cart
- `PUT /api/cart/items/:productId` - Update cart item
- `DELETE /api/cart/items/:productId` - Remove cart item
- `DELETE /api/cart` - Clear cart

### Orders
- `GET /api/orders` - Get user orders
- `GET /api/orders/:id` - Order details
- `POST /api/orders` - Create order
- `POST /api/orders/:id/verify-payment` - Verify Razorpay payment
- `POST /api/orders/:id/cancel` - Cancel order

### Wishlist
- `GET /api/wishlist` - Get wishlist
- `POST /api/wishlist` - Add to wishlist
- `DELETE /api/wishlist/:productId` - Remove from wishlist

### Reviews
- `GET /api/reviews/product/:productId` - Product reviews
- `POST /api/reviews` - Create review
- `PUT /api/reviews/:id` - Update review
- `DELETE /api/reviews/:id` - Delete review

### Admin
- `GET /api/admin/dashboard` - Dashboard data
- `GET /api/admin/analytics` - Analytics data
- `GET /api/admin/users` - List users
- `PATCH /api/admin/users/:id/role` - Update user role
- `GET /api/orders/admin/all` - All orders (with filters)
- `PATCH /api/orders/:id/status` - Update order status

## Deployment

### Backend Deployment (e.g., Railway, Render)
1. Set all environment variables
2. Deploy from Git repository
3. Ensure MongoDB is accessible
4. Set up Razorpay webhooks to point to `/api/webhooks/razorpay`

### Frontend Deployment (e.g., Vercel)
1. Connect Git repository to Vercel
2. Set environment variables
3. Deploy

## Project Structure

```
shaaka2/
├── backend/
│   ├── src/
│   │   ├── config/         # Configuration files
│   │   ├── controllers/    # Route handlers
│   │   ├── middleware/     # Express middleware
│   │   ├── models/         # Mongoose models
│   │   ├── routes/         # API routes
│   │   ├── scripts/        # Seed scripts
│   │   ├── utils/          # Helper functions
│   │   └── server.js       # Express server
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── app/            # Next.js App Router pages
    │   ├── components/     # React components
    │   ├── lib/            # API client & utilities
    │   └── store/          # Zustand stores
    ├── public/             # Static assets
    └── package.json
```

## License

MIT License
