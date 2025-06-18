# `@pidchashyi/next-cookies`

> 🍪 Type-safe, configurable cookie management client for Next.js server components — strongly typed cookie names and values with full support for setting, getting, and deleting cookies.

Simplify cookie handling with compile-time validation of cookie names and their allowed values. Designed to work seamlessly with Next.js 14 app router’s `cookies()` API.

---

## ⚠️ Important Usage Note

For full type safety and autocomplete support, **you must declare each cookie’s allowed values using `as const`**. This ensures TypeScript treats the arrays as readonly tuples of literal strings instead of general `string[]`.

If you want to include a cookie name without specifying allowed values (accept any string), set its value to `undefined`.

Example:

```ts
const cookieManager = new CookieClient({
  userRole: ["user", "admin", "superadmin"] as const, // ✅ readonly tuple with literal types
  theme: ["light", "dark"] as const, // ✅ readonly tuple with literal types
  sessionId: undefined, // ✅ no restrictions on value
});
```

If you omit `as const`, you lose literal type inference, breaking autocomplete and type safety:

```ts
// ❌ Not type-safe, values inferred as string[]
const cookieManager = new CookieClient({
  userRole: ["user", "admin", "superadmin"], // Avoid this!
});
```

---

## ⚠️ Next.js 15 Support Notice

If you are using **Next.js 15**, you **must import** from the `/v15` path for compatibility:

```ts
import CookieClient from "@pidchashyi/next-cookies/v15";

const cookieManager = new CookieClient({
  // your config here
});
```

This ensures the package works correctly with Next.js 15’s updated `cookies()` API.

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

## ⚙️ API Overview

### `CookieClient<Config>`

- Generic class that takes a config object describing cookie names and their allowed string values (readonly tuples or `undefined`).
- Methods:

  - `set(name, value, options?)`: set a cookie with type-safe value.
  - `get(name)`: retrieve cookie value.
  - `delete(names)`: delete one or more cookies by name.
  - `getMultiple(names)`: retrieve the array of values

---

## 🔧 Usage

### Setup with cookie config

```ts
import CookieClient from "@pidchashyi/next-cookies";

const cookieManager = new CookieClient({
  userRole: ["user", "admin", "superadmin"] as const,
  theme: ["light", "dark"] as const,
  sessionId: undefined, // no restrictions on this cookie value
});
```

### Setting a cookie

```ts
// v14
cookieManager.set("userRole", "admin", { path: "/", maxAge: 3600 });
cookieManager.set("theme", "dark");
cookieManager.set("sessionId", "abc123xyz"); // any string allowed here

// v15
await cookieManager.set("userRole", "admin", { path: "/", maxAge: 3600 });
await cookieManager.set("theme", "dark");
await cookieManager.set("sessionId", "abc123xyz"); // any string allowed here
```

### Getting a cookie

```ts
const userRole = cookieManager.get("userRole");
if (userRole.success && userRole.value) {
  console.log("Current user role:", userRole.value);
}

const [userRole, theme] = cookieManager.getMultiple(["userRole", "theme"]);
if (userRole.success && userRole.value) {
  console.log("Current user role:", userRole.value);
}

if (theme.success && theme.value) {
  console.log("Current theme:", theme.value);
}
```

### Deleting cookies

```ts
const result = cookieManager.delete(["userRole", "theme"]);
console.log(result.message);

// `Deleted 2 of 2 cookies`
```

---

## 🧰 API Reference

### `constructor(config: CookieConfig)`

- `config`: Object mapping cookie names to allowed string literal arrays (readonly tuples using `as const`) or `undefined` for unrestricted values.

### `async set(name, value, options?)`

- `name`: Cookie name from config keys.
- `value`: Allowed value from the specified cookie’s allowed values or any string if `undefined`.
- `options?`: Partial cookie options matching `ResponseCookie`.
- Returns a promise resolving to `{ success: boolean; message: string }`.

### `get(name)`

- `name`: Cookie name from config keys.
- Returns `{ success: boolean; message: string; value: string | null }`.

### `delete(names)`

- `names`: Array of cookie names to delete.
- Returns `{ success: boolean; message: string; deletedCookies: string[] }`.

---

## 🔍 Type Safety

- **Always use `as const`** to enforce literal types for cookie values.
- Using `undefined` allows any string value for that cookie.
- Incorrect typing or missing `as const` disables autocomplete and weakens type safety.

---

## 👤 Author

Created by [Pidchashyi](https://github.com/Marian1309/next-cookies).

---

## 📄 License

MIT © [LICENSE](https://github.com/Marian1309/next-cookies/blob/main/LICENSE)

---
