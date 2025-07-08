# `@pidchashyi/next-cookies`

> 🍪 Type-safe, configurable cookie management for Next.js server components — with GDPR compliance, backup/recovery, and expiration management.

A comprehensive cookie management solution featuring:

- Type-safe cookie operations
- GDPR compliance and consent management
- Automatic cookie backup and recovery
- Expiration tracking and management
- Full Next.js app router compatibility

---

## 📦 Installation

```bash
npm install @pidchashyi/next-cookies
# or
yarn add @pidchashyi/next-cookies
# or
pnpm install @pidchashyi/next-cookies
# or
bun install @pidchashyi/next-cookies
```

---

## 🚀 Features

### Core Features

- Type-safe cookie operations
- Automatic value validation
- Comprehensive error handling
- Debug logging in development

### GDPR Compliance

- Cookie categorization (Essential, Marketing, etc.)
- Consent management
- Automatic policy enforcement
- Cookie policy generation

### Backup & Recovery

- Automatic backup of critical cookies
- Corruption detection
- Multiple backup versions
- Easy recovery process

### Expiration Management

- Automatic cleanup of expired cookies
- Expiration monitoring
- Extension of cookie lifetimes
- Early expiration warnings

---

## 🔧 Usage Examples

### Basic Setup with All Features

```typescript
const cookieClient = createCookieClient(
  {
    // Basic cookie configuration
    theme: ["light", "dark"] as const,
    sessionId: undefined,

    // GDPR configuration
    gdpr: {
      theme: {
        category: CookieCategory.Preferences,
        description: "Stores user's theme preference",
        duration: "1 year",
        provider: "First party",
      },
      sessionId: {
        category: CookieCategory.Essential,
        description: "Maintains user session",
        duration: "Session",
        provider: "First party",
      },
    },

    // Backup configuration
    backup: {
      sessionId: {
        critical: true,
        backupCount: 5,
        validateChecksum: true,
      },
    },
  },
  {
    // Optional global settings
    autoCleanupInterval: 60 * 60 * 1000, // 1 hour
    expiringSoonThreshold: 24 * 60 * 60 * 1000, // 24 hours
    gdpr: {
      defaultConsent: {
        functional: true,
        preferences: true,
      },
    },
    backup: {
      prefix: "__bak_",
      defaultBackupCount: 3,
    },
  }
);
```

### GDPR Compliance

```typescript
// Get current consent status
const consent = await cookieClient.getConsent();

// Update consent preferences
await cookieClient.updateConsent({
  analytics: true,
  marketing: false,
});

// Get cookie policy information
const policy = cookieClient.getCookiePolicy();
console.log(policy[CookieCategory.Marketing].cookies);
```

### Cookie Backup & Recovery

```typescript
// Backups are created automatically for critical cookies
await cookieClient.set("sessionId", "abc123");

// Recover a corrupted cookie
const recovery = await cookieClient.recoverCookie("sessionId");
if (recovery.success) {
  console.log("Recovered value:", recovery.value);
}
```

### Expiration Management

```typescript
// Get soon-to-expire cookies
const expiringSoon = await cookieClient.getExpiringSoonCookies();

// Extend cookie expiration
await cookieClient.extendExpiration("sessionId", { maxAge: 3600 });

// Clean up expired cookies
await cookieClient.cleanupExpiredCookies();
```

---

## 📚 API Reference

### Cookie Client Configuration

#### GDPR Options

```typescript
type CookieCategory =
  | "essential"
  | "functional"
  | "analytics"
  | "marketing"
  | "preferences";

interface GDPRConfig {
  category: CookieCategory;
  description: string;
  duration?: string;
  provider?: string;
}
```

#### Backup Options

```typescript
interface BackupConfig {
  critical?: boolean;
  backupCount?: number;
  validateChecksum?: boolean;
}
```

### Methods

#### GDPR Management

- `getConsent()`: Get current consent preferences
- `updateConsent(preferences)`: Update consent settings
- `getCookiePolicy()`: Get structured cookie policy information

#### Backup & Recovery

- `recoverCookie(name)`: Recover a cookie from backup
- `backupCookie(name)`: Manually trigger a backup

#### Expiration Management

- `getExpiredCookies()`: Get all expired cookies
- `getExpiringSoonCookies(threshold?)`: Get cookies nearing expiration
- `extendExpiration(name, extension)`: Extend cookie lifetime
- `cleanupExpiredCookies()`: Remove expired cookies

---

## 🔒 Security Features

- Checksum validation for backups
- Automatic consent enforcement
- Critical cookie protection
- Corruption detection

---

## 🛠️ Development Features

- Comprehensive debug logging
- Type-safe operations
- Detailed error messages
- Performance optimization

---

## 👤 Author

Created by [Pidchashyi](https://github.com/Marian1309/next-cookies).

---

## 📄 License

MIT © [LICENSE](https://github.com/Marian1309/next-cookies/blob/main/LICENSE)
