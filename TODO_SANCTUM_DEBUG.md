# TODO: Sanctum stateful cookie debug (cafe-admin-app)

- [ ] Add temporary debug endpoint(s) to `cafe-saas/routes/api.php` to print effective config values (no secrets)
- [ ] Call `GET /api/debug/config/cookies-sanctum` and paste JSON output
- [ ] Call `GET /api/debug/sanctum-state` and `GET /api/debug/sanctum-guard` to verify stateful decision + auth guard result
- [ ] Adjust `SESSION_DOMAIN` / `SESSION_SAME_SITE` / `SESSION_SECURE_COOKIE` and `SANCTUM_STATEFUL_DOMAINS` based on effective values
- [ ] Remove temporary debug routes

