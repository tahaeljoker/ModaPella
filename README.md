# Moda Pella

Unified POS and E-commerce scaffold for Moda Pella using MongoDB, Express, React, and Node.js.

## Structure

- `backend/` - Express API, MongoDB models, JWT auth, POS routes, socket inventory sync.
- `frontend/` - React + Vite storefront, seller POS dashboard, Instapay checkout page, Tailwind theme.

## Backend setup

1. `cd backend`
2. `npm install`
3. Copy `.env.example` to `.env` and set `MONGO_URI` / `JWT_SECRET`.
4. `npm run dev`

## Frontend setup

1. `cd frontend`
2. `npm install`
3. `npm run dev`

## API endpoints

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/products`
- `POST /api/products`
- `PATCH /api/products/:id/stock`
- `POST /api/orders`
- `GET /api/orders`
- `POST /api/pos/sell`
- `POST /api/pos/recover`
- `PATCH /api/pos/storage/:productId`

## Notes

- Inventory updates are broadcast through Socket.io on `/inventory:update`.
- The frontend uses a white-first theme with burgundy and beige accents.
- The POS interface is intentionally hidden from public navigation; manager/cashier access is available through `/login`.
- Payment page logic is configured for Instapay as the only gateway.

## Production deployment

### Backend on Render
1. Create a new Web Service on Render.
2. Connect this repository and set the root directory to the project root.
3. Use the included [render.yaml](render.yaml) configuration.
4. Add environment variables for `MONGO_URI`, `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `CASHIER_EMAIL`, and `CASHIER_PASSWORD`.

### Frontend on Vercel
1. Import the frontend folder into Vercel.
2. Set the build command to `npm run build`.
3. Set the output directory to `dist`.
4. Set `VITE_API_URL` to your Render backend URL, for example `https://your-backend.onrender.com/api`.

### Local production check
1. Build the frontend with `cd frontend && npm run build`.
2. Start the backend with `cd backend && npm start`.
3. Open the app and ensure the API is reachable.
