# TODO — Refactor 4 Dashboard Summary Cards (Dynamic + Real-time)

## Backend (Laravel / cafe-saas)
- [x] Timezone: `config/app.php` → `Africa/Tunis`
- [x] Create `menu_sessions` migration + `MenuSession` model
- [x] Add client endpoints `enter` / `leave` in `ClientMenuController`
- [x] Register new client routes in `routes/api.php`
- [x] Update `DashboardController::getStats`:
  - [x] `last_product_updated_at` (Card 1)
  - [x] `pending_orders_count` (Card 2)
  - [x] `live_active_users` + dynamic percentage (Card 3)
  - [x] `last_qr_updated_at` (Card 4)

## Frontend (Angular / cafe-admin-app)
- [x] Update `dashboard.service.ts` `DashboardStats` interface
- [x] Update `home.ts` `statCards()` to use dynamic subtitles
- [x] Update `home.html` to render dynamic subtitle strings
- [x] Track menu presence: enter/leave in `menu.ts`
- [x] Add `enterMenu` / `leaveMenu` / moment presence methods to `client-menu.ts`

## Follow-up
- [x] `php artisan migrate`
- [x] `php -l` on modified PHP files + `php artisan config:clear`
- [x] `ng build` to verify no compile errors
