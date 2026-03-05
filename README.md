# Roomet

A real-time, end-to-end encrypted chat room platform built with **Next.js 16**, **Socket.io**, **Prisma**, and **MariaDB**. Roomet features themed rooms, social profiles, achievements, leaderboards, and a Notion-inspired UI with dark/light mode.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Room Types](#room-types)
- [End-to-End Encryption](#end-to-end-encryption)
- [Progression System](#progression-system)
- [API Routes](#api-routes)
- [Database Schema](#database-schema)
- [Socket Events](#socket-events)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Scripts](#scripts)

---

## Features

- **Real-time Chat** — Socket.io-powered messaging with typing indicators and presence tracking
- **End-to-End Encryption** — RSA-OAEP key exchange + AES-256-GCM message encryption via Web Crypto API
- **5 Room Types** — Chatting, Discussion, Focus, Study, Hangout — each with unique feature sets
- **Encrypted Media** — Images, audio, videos, and documents encrypted client-side before upload (`.enc` files)
- **Polls** — Create and vote on polls in Discussion, Study, and Hangout rooms
- **User Profiles** — Custom avatar, bio, display name, activity stats, and badge selection
- **Social System** — Follow/unfollow users, friends list (mutual follows), real-time follow notifications
- **Achievements** — 20+ achievements across chat, room, social, and time categories with XP rewards
- **Level Progression** — XP-based leveling system with tiered thresholds
- **Leaderboard** — Global rankings sortable by level, messages, rooms, time spent, and followers
- **Room Invites** — Invite friends to rooms via the platform; accept/decline in inbox
- **Invite Codes** — Shareable invite codes for room joining
- **Password-Protected Rooms** — Lock rooms with a password for private access
- **Room Management** — Host/co-host roles, kick participants, transfer ownership, edit room settings
- **Activity Log** — Track room session history with join/leave times and duration
- **Time Tracking** — Automatic session time recording per room and total
- **Google OAuth** — Sign in with Google, avatar sync
- **Email Verification** — Brevo SMTP-based email verification flow with resend support
- **Responsive UI** — Mobile-first design with sidebar navigation, Notion-inspired aesthetic
- **Dark/Light Theme** — Toggle theme with system preference detection
- **Media Preview** — In-chat image lightbox, audio player, video player, document download
- **Voice Notes** — Record and send voice messages in supported room types

---

## Tech Stack

| Layer      | Technology                                        |
| ---------- | ------------------------------------------------- |
| Framework  | Next.js 16 (App Router, React 19, React Compiler) |
| Language   | TypeScript 5                                      |
| Styling    | Tailwind CSS 4                                    |
| Real-time  | Socket.io 4                                       |
| Database   | MariaDB via Prisma 7 (`@prisma/adapter-mariadb`)  |
| Auth       | JWT (jsonwebtoken) + bcryptjs, Google OAuth 2.0   |
| Email      | Nodemailer + Brevo SMTP                           |
| Encryption | Web Crypto API (RSA-OAEP 2048-bit + AES-256-GCM)  |
| Linting    | Biome 2                                           |
| Runtime    | Node.js with tsx                                  |

---

## Architecture

```
Client (React)
  ├── AuthContext    — JWT token management, user state, Google OAuth callback
  ├── SocketContext  — Socket.io client, room events, notification emitters
  ├── ThemeContext   — Dark/light mode toggle
  └── Web Crypto    — RSA key generation, AES encrypt/decrypt, media encryption
         │
         ▼
Custom HTTP Server (server.ts)
  ├── Next.js App Router  — SSR + API routes
  └── Socket.io Server    — Real-time events (chat, presence, notifications)
         │
         ▼
Prisma ORM → MariaDB
  ├── Users, Sessions, Profiles
  ├── Rooms, Participants, Encrypted Keys
  ├── Messages (encrypted), Media
  ├── Follows, Invites, Polls
  ├── Achievements, Activity Logs
  └── File Storage (uploads/)
```

---

## Room Types

Each room type enables a different set of features:

| Type           | Text | Voice Notes | Audio | Images | Videos | Documents | Polls | Max Media | Description                        |
| -------------- | ---- | ----------- | ----- | ------ | ------ | --------- | ----- | --------- | ---------------------------------- |
| **Chatting**   | ✅   | ✅          | ✅    | ✅     | ✅     | ❌        | ❌    | 25 MB     | Casual chat — memes, photos, voice |
| **Discussion** | ✅   | ✅          | ✅    | ✅     | ❌     | ✅        | ✅    | 50 MB     | Structured discussion with polls   |
| **Focus**      | ✅   | ❌          | ❌    | ❌     | ❌     | ✅        | ❌    | 100 MB    | Distraction-free deep work         |
| **Study**      | ✅   | ✅          | ❌    | ✅     | ❌     | ✅        | ✅    | 50 MB     | Share notes, images, quizzes       |
| **Hangout**    | ✅   | ✅          | ✅    | ✅     | ✅     | ✅        | ✅    | 100 MB    | Full-featured, everything goes     |

---

## End-to-End Encryption

All messages and media are encrypted client-side before transmission:

1. **Key Generation** — On registration, each user generates an RSA-OAEP 2048-bit key pair. The public key is stored on the server; the private key stays in `localStorage`.
2. **Room Key** — When creating a room, the host generates a random AES-256-GCM symmetric key.
3. **Key Distribution** — The room key is encrypted with each participant's RSA public key and stored as `RoomEncryptedKey` entries.
4. **Message Encryption** — Messages are encrypted with the room's AES key + a random IV before sending.
5. **Media Encryption** — Files are encrypted with AES-GCM client-side, uploaded as `.enc` blobs, and decrypted in-browser on download.
6. **Server-Zero-Knowledge** — The server only stores ciphertext. It cannot read messages or media.

---

## Progression System

### Leveling

- Users earn **XP** from achievements
- Level thresholds scale progressively
- Current level and XP displayed on profile and leaderboard

### Achievements (20+)

| Category   | Examples                                                                                                           |
| ---------- | ------------------------------------------------------------------------------------------------------------------ |
| **Chat**   | First Words (1 msg), Chatterbox (100), Motormouth (500), Legend Speaker (2000), Wordsmith (5000)                   |
| **Room**   | Door Opener (1 join), Room Hopper (10), Explorer (50), Party Starter (1 host), Host Master (20), Host Legend (100) |
| **Social** | First Friend (1 follower), Popular (10), Influencer (50), Celebrity (200)                                          |
| **Time**   | Warm Up (1h), Dedicated (10h), No Life (100h), Immortal (500h)                                                     |

---

## API Routes

### Auth

| Method | Route                           | Description                    |
| ------ | ------------------------------- | ------------------------------ |
| POST   | `/api/auth/register`            | Register with email/password   |
| POST   | `/api/auth/login`               | Login with credentials         |
| POST   | `/api/auth/logout`              | Invalidate session             |
| GET    | `/api/auth/me`                  | Get current authenticated user |
| POST   | `/api/auth/keys`                | Store user's RSA public key    |
| GET    | `/api/auth/verify-email`        | Verify email via token         |
| POST   | `/api/auth/resend-verification` | Resend verification email      |
| GET    | `/api/auth/google`              | Initiate Google OAuth flow     |
| GET    | `/api/auth/google/callback`     | Google OAuth callback          |

### Profile

| Method | Route                           | Description                    |
| ------ | ------------------------------- | ------------------------------ |
| GET    | `/api/profile`                  | Get own profile + stats        |
| PATCH  | `/api/profile`                  | Update profile / upload avatar |
| GET    | `/api/profile/:username`        | Get user's public profile      |
| POST   | `/api/profile/:username/follow` | Follow a user                  |
| DELETE | `/api/profile/:username/follow` | Unfollow a user                |
| GET    | `/api/profile/friends`          | List mutual follows (friends)  |

### Rooms

| Method | Route                        | Description                   |
| ------ | ---------------------------- | ----------------------------- |
| GET    | `/api/room`                  | List/search rooms (paginated) |
| POST   | `/api/room`                  | Create a new room             |
| GET    | `/api/room/:roomId`          | Get room details              |
| PATCH  | `/api/room/:roomId`          | Update room settings          |
| DELETE | `/api/room/:roomId`          | Delete room (host only)       |
| POST   | `/api/room/:roomId/join`     | Join a room                   |
| POST   | `/api/room/:roomId/leave`    | Leave a room                  |
| GET    | `/api/room/join/:inviteCode` | Get room by invite code       |

### Chat & Media

| Method | Route                     | Description                     |
| ------ | ------------------------- | ------------------------------- |
| GET    | `/api/room/:roomId/chat`  | Get messages (cursor paginated) |
| POST   | `/api/room/:roomId/chat`  | Send encrypted message          |
| POST   | `/api/room/:roomId/media` | Upload encrypted media file     |
| GET    | `/api/media/:path`        | Serve uploaded media files      |

### Room Features

| Method | Route                                 | Description                |
| ------ | ------------------------------------- | -------------------------- |
| POST   | `/api/room/:roomId/invite`            | Invite user to room        |
| POST   | `/api/room/:roomId/keys`              | Distribute E2E keys        |
| GET    | `/api/room/:roomId/keys`              | Get own encrypted room key |
| GET    | `/api/room/:roomId/poll`              | List room polls            |
| POST   | `/api/room/:roomId/poll`              | Create a poll              |
| POST   | `/api/room/:roomId/poll/:pollId/vote` | Vote on a poll option      |

### Invites

| Method | Route                    | Description                 |
| ------ | ------------------------ | --------------------------- |
| GET    | `/api/invites`           | List pending invites        |
| POST   | `/api/invites/:inviteId` | Accept or decline an invite |

### Other

| Method | Route               | Description                    |
| ------ | ------------------- | ------------------------------ |
| GET    | `/api/achievements` | List all achievements          |
| GET    | `/api/leaderboard`  | Global leaderboard (paginated) |

---

## Database Schema

### Core Models

```
User
├── id, email, username, displayName
├── passwordHash?, googleId?
├── avatarUrl?, avatarType (google | custom)
├── bio?, emailVerified, verifyToken?
├── publicKey? (RSA public key for E2E)
└── Relations: profile, sessions, messages, rooms, follows, achievements, invites, polls, activityLogs

Session
├── id, userId, token, expiresAt
└── JWT-based session management

UserProfile
├── totalMessages, totalRoomsJoined, totalRoomsHosted
├── totalTimeInRooms (seconds), totalFollowers, totalFollowing
├── level, xp, selectedBadge?
└── Progression & stats tracking

Follow
├── followerId → followingId
└── Unique constraint per pair

Achievement / UserAchievement
├── key, name, description, icon, category, threshold, xpReward
└── Per-user unlock tracking with timestamps
```

### Room Models

```
Room
├── id, title, type, tag?, isPublic, isLocked, passwordHash?
├── maxMembers, hostId, coHostId?, inviteCode
├── isActive
└── Relations: participants, messages, invites, polls, encryptedKeys, activityLogs

RoomParticipant
├── roomId, userId, joinedAt, leftAt?, isActive
└── timeSpent (seconds per room)

RoomEncryptedKey
├── roomId, userId
└── encryptedKey (AES room key encrypted with user's RSA public key)

Message
├── roomId, senderId, type (text | image | audio | video | document | system)
├── encryptedContent, iv (AES-GCM)
└── mediaUrl?, mediaName?, mediaMimeType?, mediaSize?

RoomInvite
├── roomId, senderId, receiverId
└── status (pending | accepted | declined)

Poll → PollOption → PollVote
├── question, options[], isActive, expiresAt?
└── Unique vote per user per option

RoomActivityLog
├── userId, roomId, roomTitle, roomType, roomTag?
├── role (host | participant)
├── joinedAt, leftAt?, duration (seconds)
└── Indexed by [userId, joinedAt]
```

---

## Socket Events

### Client → Server

| Event                       | Payload                                                 | Description                      |
| --------------------------- | ------------------------------------------------------- | -------------------------------- |
| `register-user`             | `{ userId }`                                            | Register socket for user channel |
| `join-room`                 | `{ roomId, userId, username, displayName, avatarUrl }`  | Join room + track activity       |
| `leave-room`                | `{ roomId, userId }`                                    | Leave room + record session time |
| `send-message`              | `{ roomId, message }`                                   | Broadcast encrypted message      |
| `typing`                    | `{ roomId, userId, username }`                          | Typing indicator                 |
| `stop-typing`               | `{ roomId, userId }`                                    | Stop typing indicator            |
| `poll-update`               | `{ roomId, poll }`                                      | Broadcast poll state change      |
| `room-updated`              | `{ roomId, update }`                                    | Broadcast room settings change   |
| `invite-notification`       | `{ receiverId, invite }`                                | Send room invite to user         |
| `follow-notification`       | `{ targetUserId, followerName, followerUsername, ... }` | Notify user of new follower      |
| `room-message-notification` | `{ roomId, roomTitle, senderName, senderId, ... }`      | Notify offline participants      |

### Server → Client

| Event                  | Payload                      | Description                          |
| ---------------------- | ---------------------------- | ------------------------------------ |
| `room-participants`    | `[{ id, username, ... }]`    | Updated participant list             |
| `user-joined`          | `{ userId, username, ... }`  | User joined the room                 |
| `user-left`            | `{ userId }`                 | User left the room                   |
| `new-message`          | `{ ...message }`             | New encrypted message                |
| `user-typing`          | `{ userId, username }`       | Someone is typing                    |
| `user-stop-typing`     | `{ userId }`                 | Someone stopped typing               |
| `poll-updated`         | `{ ...poll }`                | Poll state updated                   |
| `room-update`          | `{ ...update }`              | Room settings changed                |
| `invite-received`      | `{ ...invite }`              | Room invite received                 |
| `follow-received`      | `{ followerName, ... }`      | New follower notification            |
| `message-notification` | `{ roomId, roomTitle, ... }` | Message in a room you're not viewing |

---

## Project Structure

```
roomet/
├── server.ts                 # Custom HTTP server (Next.js + Socket.io)
├── prisma.config.ts          # Prisma configuration
├── next.config.ts            # Next.js config (React Compiler enabled)
├── biome.json                # Biome linter/formatter config
├── prisma/
│   ├── schema.prisma         # Database schema
│   ├── seed.ts               # Achievement seeding
│   └── migrations/           # Prisma migrations
├── src/
│   ├── app/
│   │   ├── layout.tsx        # Root layout with providers
│   │   ├── page.tsx          # Landing page
│   │   ├── globals.css       # Tailwind CSS 4 + global styles
│   │   ├── api/              # API route handlers
│   │   │   ├── auth/         # Auth endpoints (register, login, OAuth, verify)
│   │   │   ├── room/         # Room CRUD, join, leave, chat, media, polls, keys
│   │   │   ├── profile/      # Profile, follow, friends
│   │   │   ├── invites/      # Invite management
│   │   │   ├── achievements/ # Achievement listing
│   │   │   ├── leaderboard/  # Global rankings
│   │   │   └── media/        # Static file serving
│   │   ├── auth/             # Auth pages (login, register, verify, callback)
│   │   ├── dashboard/        # Main dashboard (rooms, inbox, profile tabs)
│   │   ├── room/             # Room view + invite code join page
│   │   ├── profile/          # Public profile page
│   │   └── leaderboard/      # Leaderboard page
│   ├── components/
│   │   ├── RoomView.tsx      # Full room chat UI component
│   │   ├── Icons.tsx         # Icon components
│   │   └── ThemeToggle.tsx   # Dark/light mode toggle
│   ├── context/
│   │   ├── AuthContext.tsx    # Auth state, JWT, Google OAuth
│   │   ├── SocketContext.tsx  # Socket.io client + event helpers
│   │   └── ThemeContext.tsx   # Theme state management
│   └── lib/
│       ├── api-client.ts     # Typed API client functions
│       ├── api-helpers.ts    # API route helper utilities
│       ├── auth.ts           # JWT, password hashing, token generation
│       ├── email.ts          # Brevo SMTP email service
│       ├── encryption.ts     # E2E encryption utilities (Web Crypto API)
│       ├── prisma.ts         # Prisma client instance
│       ├── progression.ts    # Achievements, XP, leveling system
│       ├── room-types.ts     # Room type feature definitions
│       └── storage.ts        # File upload/storage utilities
└── uploads/                  # Uploaded media storage
    ├── avatars/
    ├── images/
    ├── audio/
    ├── videos/
    └── documents/
```

---

## Getting Started

### Prerequisites

- **Node.js** 20+
- **MariaDB** (or MySQL-compatible database)
- **Brevo account** (for SMTP email — optional for local dev)
- **Google Cloud Console** project (for OAuth — optional)

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/roomet.git
cd roomet

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your database URL, secrets, and API keys

# Generate Prisma client
npm run db:generate

# Run database migrations
npm run db:migrate

# Seed achievements
npm run db:seed

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to use the app.

---

## Environment Variables

Create a `.env` file in the project root:

```env
# Database
DATABASE_URL="mysql://user:password@host:port/roomet"

# Auth
JWT_SECRET="your-secure-random-secret"
JWT_EXPIRES_IN="7d"

# App URL
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Google OAuth (optional)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Brevo SMTP (optional — for email verification)
BREVO_SMTP_HOST="smtp-relay.brevo.com"
BREVO_SMTP_PORT="587"
BREVO_SMTP_USER="your-brevo-smtp-user"
BREVO_SMTP_PASS="your-brevo-smtp-password"
BREVO_FROM_NAME="Roomet"
BREVO_FROM_EMAIL="noreply@yourdomain.com"

# Server
PORT=3000
```

---

## Scripts

| Command               | Description                              |
| --------------------- | ---------------------------------------- |
| `npm run dev`         | Start development server (tsx server.ts) |
| `npm run build`       | Build for production (next build)        |
| `npm run start`       | Start production server                  |
| `npm run lint`        | Run Biome linter                         |
| `npm run format`      | Format code with Biome                   |
| `npm run db:migrate`  | Run Prisma migrations                    |
| `npm run db:generate` | Generate Prisma client                   |
| `npm run db:seed`     | Seed achievements into database          |

---

## License

This project is private and not licensed for public distribution.
