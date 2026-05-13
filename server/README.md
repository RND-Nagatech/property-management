# Stayly Backend (Foundation)

## Setup

1. Copy env:
   - `cp .env.example .env`
2. Fill `MONGODB_URI`
3. Install & run:
   - `npm install`
   - `npm run dev`

## Endpoints

- `GET /health` → `{ ok: true }`
- `GET /api/room-types`
- `POST /api/room-types`
- `GET /api/room-types/:slug`
- `PUT /api/room-types/:id`
- `DELETE /api/room-types/:id` (soft delete -> `isActive=false`)
- `GET /api/rooms`
- `POST /api/rooms`
- `PUT /api/rooms/:id`
- `DELETE /api/rooms/:id`
