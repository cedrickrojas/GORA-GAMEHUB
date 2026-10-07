# GORA REST API

Base: `/api`. JSON requests and responses. Errors: `{ "error": "message", "details": ["optional validation details"] }`. Lists return arrays; `limit` (max 100) and `offset` are supported for events, people/users, notifications, and admin lists. HTTP status: 400 invalid input, 401 unsigned/invalid session, 403 denied, 404 inaccessible/missing record, 409 conflict, 429 rate limit.

JWT is issued as an HttpOnly `gora_session` cookie; send credentials for cross-origin requests from an approved origin. Middleware also accepts `Authorization: Bearer TOKEN` for API clients. Tokens are scoped to issuer `gora` and audience `gora-app`; no credential-bearing tokens are returned to browser storage.

| Method        | Endpoint                                          | Access / behavior                                                                                                                                                                |
| ------------- | ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET           | `/health`                                         | Public database readiness and development demo availability                                                                                                                      |
| POST          | `/auth/register`                                  | Full name, username, email, password, confirm_password, date_of_birth, location, favorite_sports names                                                                           |
| POST          | `/auth/login`                                     | email, password                                                                                                                                                                  |
| GET           | `/auth/me`                                        | Current profile; authenticated                                                                                                                                                   |
| POST          | `/auth/logout`                                    | Revoke all user sessions; authenticated                                                                                                                                          |
| POST          | `/auth/forgot-password`                           | email; generic delivery response; dev preview without SMTP                                                                                                                       |
| POST          | `/auth/reset-password`                            | token, password, confirm_password                                                                                                                                                |
| POST          | `/auth/demo`                                      | Seeded local demo login; disabled outside development                                                                                                                            |
| GET           | `/sports`                                         | Categories with active game/community counts                                                                                                                                     |
| GET           | `/sports/:id`                                     | Sport record                                                                                                                                                                     |
| GET           | `/users`, `/people`                               | Public active profiles; filters below                                                                                                                                            |
| GET           | `/users/:id`                                      | Public active profile, connection state                                                                                                                                          |
| PUT           | `/users/:id`                                      | Own profile only; JSON fields or multipart `profile` (same fields as JSON) plus one `photo` file (JPG/PNG/WebP, max 5 MB); existing managed avatar URLs must belong to that user |
| GET           | `/uploads/avatars/:userId/:filename`              | Public re-encoded WebP profile photo; stable unique URL                                                                                                                          |
| DELETE        | `/users/:id`                                      | Own account only; requires password in body                                                                                                                                      |
| GET           | `/users/:id/events`                               | Public/permitted hosted and joined games                                                                                                                                         |
| GET           | `/users/:id/connections?kind=followers`           | kind: followers, following, friends                                                                                                                                              |
| POST / DELETE | `/people/:id/follow`                              | Authenticated; cannot self-follow                                                                                                                                                |
| GET           | `/friends`                                        | Current user's accepted/pending requests                                                                                                                                         |
| POST          | `/friends/:id/request`                            | Send request; unique unordered pair                                                                                                                                              |
| POST          | `/friends/:id/accept`                             | Only incoming request recipient                                                                                                                                                  |
| DELETE        | `/friends/:id`                                    | Reject/cancel/remove own connection                                                                                                                                              |
| GET           | `/events`                                         | Public/permitted games; default upcoming active                                                                                                                                  |
| GET           | `/events/:id`                                     | Permitted details, participant list, current membership/chat                                                                                                                     |
| POST          | `/events`                                         | Create event and group chat; authenticated                                                                                                                                       |
| PUT           | `/events/:id`                                     | Full event fields; host only                                                                                                                                                     |
| DELETE        | `/events/:id`                                     | Cancel event; host/admin; notify crew                                                                                                                                            |
| POST          | `/events/:id/join`                                | Capacity enforcement; private joins pending approval                                                                                                                             |
| DELETE        | `/events/:id/leave`                               | Remove own membership and event-chat access                                                                                                                                      |
| POST          | `/events/:id/invite`                              | user_id; host/approved participant only                                                                                                                                          |
| PUT           | `/events/:id/participants/:userId`                | action: approve/remove; host only                                                                                                                                                |
| GET           | `/conversations`                                  | Current user's conversations and unread counts                                                                                                                                   |
| POST          | `/conversations`                                  | user_id; create/reuse direct conversation                                                                                                                                        |
| GET           | `/conversations/:id/messages`                     | Members only; latest 100; optional `before` ISO cursor                                                                                                                           |
| POST          | `/conversations/:id/messages`                     | body (1–2000 characters); members only                                                                                                                                           |
| GET           | `/notifications`                                  | Current user's notices                                                                                                                                                           |
| PUT           | `/notifications/:id/read`                         | Recipient only                                                                                                                                                                   |
| GET           | `/communities`                                    | Public communities/counts                                                                                                                                                        |
| GET           | `/communities/:id`                                | Details, members, current membership                                                                                                                                             |
| POST / DELETE | `/communities/:id/join`, `/communities/:id/leave` | Join uses POST; leave uses DELETE; authenticated                                                                                                                                 |
| POST          | `/reports`                                        | reason + exactly one of user_id/event_id/message_id                                                                                                                              |
| GET           | `/settings`                                       | Public community guidelines and maintenance banner                                                                                                                               |
| GET           | `/admin/dashboard`                                | Admin statistics and sports usage                                                                                                                                                |
| GET           | `/admin/users`                                    | Admin user roster                                                                                                                                                                |
| PUT           | `/admin/users/:id`                                | status: active/suspended/banned; cannot target self                                                                                                                              |
| GET           | `/admin/events`                                   | Admin all events                                                                                                                                                                 |
| DELETE        | `/admin/events/:id`                               | Admin permanent removal                                                                                                                                                          |
| POST / PUT    | `/admin/sports`, `/admin/sports/:id`              | Admin category create/edit                                                                                                                                                       |
| GET           | `/admin/reports`                                  | Admin report review queue                                                                                                                                                        |
| PUT           | `/admin/reports/:id`                              | status: resolved/dismissed + resolution                                                                                                                                          |
| DELETE        | `/admin/messages/:id`                             | Admin content moderation                                                                                                                                                         |
| POST          | `/admin/notifications`                            | title; notify all active users                                                                                                                                                   |
| GET / PUT     | `/admin/settings`                                 | key/value; maintenance_banner or community_guidelines                                                                                                                            |

Event filters: `q`, `sport` (name), `location`, `date` (YYYY-MM-DD in Asia/Manila), `type`, `scope=mine` (authenticated schedule, includes past/cancelled), `scope=all` (all permitted history).

Profile updates use the authenticated account's role from PostgreSQL. Administrators may save an empty `location` and `favorite_sports` array; ordinary users require a location and at least one valid sport. Profile updates never change the account's role. The admin dashboard's Edit profile dialog uses the same owner-only update and photo upload API.

People filters: `q`, `sport`, `location`, `team`, `event_id`, `date`, `time` (HH:mm after), `age_min`, `age_max`, `distance` (km from current profile coordinates), `seats`, `group_size`. Event/date/time matches only public participation. Match percentages use shared favorite sports and profile city. Anonymous users do not receive a fabricated match percentage.

Search uses the existing `GET /people?q=...`, `GET /events?q=...`, and `GET /sports` endpoints. People queries match each word against the name, username, city, favorite team, and favorite sports; a leading `@` is accepted for usernames. Event queries match each word against the title, sport, location, and venue, accepting phrases such as `Basketball near Manila`. Matching is case-insensitive, `%` and `_` are treated as literal characters, and event visibility rules still apply. Follow and Message buttons call the existing follow and conversation endpoints.

Create/update event body:

```json
{
  "title": "Sunday Basketball Run",
  "sport_id": "A_VALID_SPORT_UUID",
  "description": "Bring water and arrive 15 minutes early.",
  "starts_at": "2026-10-11T08:00:00Z",
  "ends_at": "2026-10-11T11:00:00Z",
  "location": "Muntinlupa, Manila",
  "venue": "Muntinlupa Sports Complex",
  "max_participants": 12,
  "required_participants": 2,
  "type": "Play a Game",
  "skill_level": "Intermediate",
  "privacy": "Public"
}
```

`type`: Watch a Game, Play a Game, Practice, Tournament, Casual Match.
`skill_level`: Beginner, Intermediate, Advanced, Any. `privacy`: Public, Friends, Private.
Dates are ISO-8601 with timezone offset. Optional `image_url` must be HTTPS; otherwise the sport's image is used. Start must be in the future for creation; end must be after start; capacity 2–500 and minimum ≤ capacity.
