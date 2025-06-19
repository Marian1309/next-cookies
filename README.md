# `@pidchashyi/next-cookies`

> 🍪 Type-safe, configurable cookie management client for Next.js server components — strongly typed cookie names and values with full support for setting, getting, and deleting cookies.

Simplify cookie handling with compile-time validation of cookie names and their allowed values. Designed to work seamlessly with Next.js 14 app router's `cookies()` API.

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

## ⚠️ Important Usage Notes

### Type Safety with `as const`

For full type safety and autocomplete support, **you must declare each cookie's allowed values using `as const`**. This ensures TypeScript treats the arrays as readonly tuples of literal strings instead of general `string[]`.

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

### Next.js 15 Support

If you are using **Next.js 15**, you **must import** from the `/v15` path for compatibility:

```ts
import CookieClient from "@pidchashyi/next-cookies/v15";

const cookieManager = new CookieClient({
  // your config here
});
```

This ensures the package works correctly with Next.js 15's updated `cookies()` API.

---

## 🔧 Basic Usage

### Setup with Cookie Config

```ts
import CookieClient from "@pidchashyi/next-cookies";

const cookieManager = new CookieClient({
  userRole: ["user", "admin", "superadmin"] as const,
  theme: ["light", "dark"] as const,
  sessionId: undefined, // no restrictions on this cookie value
});
```

### Setting a Cookie

```ts
// Next.js 14
cookieManager.set("userRole", "admin", { path: "/", maxAge: 3600 });
cookieManager.set("theme", "dark");
cookieManager.set("sessionId", "abc123xyz"); // any string allowed here

// Next.js 15
await cookieManager.set("userRole", "admin", { path: "/", maxAge: 3600 });
await cookieManager.set("theme", "dark");
await cookieManager.set("sessionId", "abc123xyz"); // any string allowed here
```

### Getting a Cookie

```ts
// Single cookie
const userRole = cookieManager.get("userRole");
if (userRole.success && userRole.value) {
  console.log("Current user role:", userRole.value);
}

// Multiple cookies
const [userRole, theme] = cookieManager.getMultiple(["userRole", "theme"]);
if (userRole.success && userRole.value) {
  console.log("Current user role:", userRole.value);
}

if (theme.success && theme.value) {
  console.log("Current theme:", theme.value);
}
```

### Deleting Cookies

```ts
const result = cookieManager.delete(["userRole", "theme"]);
console.log(result.message); // "Deleted 2 of 2 cookies"
```

---

## 🧰 API Reference

### `CookieClient<Config>`

The main class for managing cookies with type safety.

#### Constructor

```ts
constructor(config: CookieConfig)
```

- `config`: Object mapping cookie names to allowed string literal arrays (readonly tuples using `as const`) or `undefined` for unrestricted values.

#### Methods

##### `async set<N>(name: N, value: string, options?: Partial<ResponseCookie>)`

Sets a cookie with the specified name, value, and options.

- **Parameters:**
  - `name`: Cookie name from config keys
  - `value`: Allowed value from the specified cookie's allowed values or any string if `undefined`
  - `options?`: Optional cookie configuration options (ResponseCookie)
- **Returns:** Promise<{ success: boolean; message: string }>

##### `get<N>(name: N)`

Retrieves a cookie value by name.

- **Parameters:**
  - `name`: Cookie name from config keys
- **Returns:** { success: boolean; message: string; value: string | null }

##### `getMultiple<N>(names: N[])`

Retrieves multiple cookie values by their names.

- **Parameters:**
  - `names`: Array of cookie names to retrieve
- **Returns:** Object mapping cookie names to their values

##### `delete<N>(names: N[])`

Deletes one or more cookies by their names.

- **Parameters:**
  - `names`: Array of cookie names to delete
- **Returns:** { success: boolean; message: string; deletedCookies: string[] }

##### `has<N>(name: N)`

Checks if a cookie exists.

- **Parameters:**
  - `name`: The name of the cookie to check
- **Returns:** boolean

##### `clearAll()`

Deletes all cookies defined in the configuration.

- **Returns:** { success: boolean; message: string; deletedCookies: string[] }

### `createCookieClient<T>(config: T)`

Factory function to create a type-safe cookie client instance.

```ts
const client = createCookieClient({
  theme: ["light", "dark"] as const,
  sessionId: undefined, // any string value allowed
});

// Type-safe operations:
await client.set("theme", "light"); // ✅ Valid
await client.set("theme", "blue"); // ❌ Type error
await client.set("unknown", "value"); // ❌ Type error
```

---

## 🔒 Type Safety Features

- Strict typing for cookie names and values
- Compile-time validation of cookie values
- TypeScript generics for type inference
- Utility types for enhanced type safety
- No `any` types used in the codebase

---

## 🛠️ Development Features

- Debug logging in development mode
- Comprehensive error messages
- Configuration validation
- Type-safe error handling
- Performance optimized for production

---

## 🧪 Error Handling

The package includes comprehensive error handling:

- Configuration validation
- Type checking
- Operation result status
- Detailed error messages
- Debug logging in development

---

## 👤 Author

Created by [Pidchashyi](https://github.com/Marian1309/next-cookies).

---

## 📄 License

MIT © [LICENSE](https://github.com/Marian1309/next-cookies/blob/main/LICENSE)
