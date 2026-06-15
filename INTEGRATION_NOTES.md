# WorkManager React — Backend Integration Notes

This frontend is now connected to the Django + DRF backend.

## Main changes
- Added `src/api/client.js` with JWT login, token storage, API request helper, pagination normalization and endpoint map.
- Added Auth pages: `/login`, `/register`, `/forgot-password`, `/reset-password`.
- Added protected routing; all app pages redirect to `/login` when no JWT token exists.
- Replaced mock-only routing with API-backed pages in `src/pages/IntegratedPages.jsx`.
- Added backend-integrated pages for dashboard, tasks, bulk tasks, meetings, MOM, leave, salary, email logs/send flow, reports, and all management pages.
- Added `.env.example` with `VITE_API_BASE_URL`.

## Backend URL
Create `.env` in this frontend folder:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000/api
```

## Run
```bash
npm install
npm run dev
```

## Verified
`npm run build` passed successfully.
