# TODO — Shop Logo Upload + Dynamic Sidebar Header

## Backend (`/home/mr-hadded/Documents/cafe-saas`)
- [x] 1. Migration: add nullable `logo_url` to `shops` table (already exists)
- [x] 2. `Shop` model: add `logo_url` to `$fillable` (already present)
- [x] 3. `AuthController::register`: set `logo_url = null` when no logo uploaded
- [x] 4. `OwnerAuthController::login`: shop response already includes `name` + `logo_url`
- [x] 5. Run `php artisan migrate`, `config:clear`, `route:clear`

## Frontend (`/home/mr-hadded/Documents/angular/cafe-admin-app`)
- [x] 6. `register.component.html`: add optional "Logo du café (optionnel)" file input
- [x] 7. `register.component.ts`: switch to FormData + `onFileSelected()`
- [x] 8. `dashboard.ts`: add `shop` computed signal + `logoError` fallback
- [x] 9. `dashboard.html`: dynamic logo `<img>` + dynamic shop name (green cup fallback)
- [x] 10. `dashboard.css`: style `.brand-logo-img`
- [x] 11. Run `ng build` to verify 0 errors (build full: initial bundle & component-style budget warnings only, exit code 0)
