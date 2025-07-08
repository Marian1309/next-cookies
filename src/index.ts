/**
 * @package @pidchashyi/next-cookies
 * A TypeScript utility package for type-safe cookie management in Next.js applications
 * @author [Marian Pidchashyi]
 * @license MIT
 */

import { cookies } from "next/headers";
import type { ResponseCookie } from "next/dist/compiled/@edge-runtime/cookies";

// ==============================
// Type Definitions
// ==============================

/**
 * Helper type to automatically make arrays readonly and preserve literal types
 * @template T - The type to be made readonly
 */
type AsConst<T> = T extends readonly unknown[]
  ? T
  : T extends unknown[]
  ? readonly [...T]
  : T;

/**
 * Input type for cookie configuration allowing string arrays or undefined
 */
type CookieConfigInput = Record<
  string,
  string[] | readonly string[] | undefined
>;

/**
 * Processed cookie configuration with readonly arrays
 */
type CookieConfig = {
  [K in keyof CookieConfigInput]: AsConst<CookieConfigInput[K]>;
};

// ==============================
// Cookie Management Client
// ==============================

/**
 * Type-safe cookie management client for Next.js applications
 * Provides methods for setting, getting, and deleting cookies with strict typing
 * @template Config - The cookie configuration type defining valid cookie names and values
 */
class CookieClient<Config extends CookieConfig> {
  constructor(private config: Config) {
    if (process.env.NODE_ENV !== "production") {
      console.debug("[CookieClient] Initialized with config:", config);
    }
  }

  /**
   * Internal method to get the cookie store instance
   * @private
   */
  private getCookieStore() {
    return cookies();
  }

  /**
   * Sets a cookie with the specified name, value, and options
   * @template N - The cookie name type from the configuration
   * @param name - The name of the cookie to set
   * @param value - The value to set for the cookie
   * @param options - Optional cookie configuration options
   * @returns A promise resolving to the operation result
   */
  async set<N extends keyof Config>(
    name: N,
    value: Config[N] extends readonly string[] ? Config[N][number] : string,
    options?: Partial<ResponseCookie>
  ): Promise<{ success: boolean; message: string }> {
    if (process.env.NODE_ENV !== "production") {
      console.debug(
        `[CookieClient] Setting cookie ${String(name)} = ${value}`,
        options ? `with options: ${JSON.stringify(options)}` : ""
      );
    }

    const cookieStore = await this.getCookieStore();

    cookieStore.set({
      name: name as string,
      value: value as string,
      ...options,
    });

    return {
      success: true,
      message: `Cookie "${String(name)}" set successfully`,
    };
  }

  /**
   * Retrieves a cookie value by name
   * @template N - The cookie name type from the configuration
   * @param name - The name of the cookie to retrieve
   * @returns The cookie value and operation status
   */
  async get<N extends keyof Config>(
    name: N
  ): Promise<{ success: boolean; message: string; value: string | null }> {
    if (process.env.NODE_ENV !== "production") {
      console.debug(`[CookieClient] Getting cookie ${String(name)}`);
    }

    const cookieStore = await this.getCookieStore();
    const cookie = cookieStore.get(name as string);

    if (process.env.NODE_ENV !== "production") {
      console.debug(
        `[CookieClient] Cookie ${String(name)} value:`,
        cookie?.value ?? "null"
      );
    }

    return {
      success: true,
      message: `Cookie "${String(name)}" retrieved successfully`,
      value: cookie?.value ?? null,
    };
  }

  /**
   * Retrieves multiple cookie values by their names
   * @template N - The cookie name type from the configuration
   * @param names - Array of cookie names to retrieve
   * @returns Object mapping cookie names to their values
   */
  async getMultiple<N extends keyof Config>(
    names: N[]
  ): Promise<{
    [K in N]: string | null;
  }> {
    if (process.env.NODE_ENV !== "production") {
      console.debug(`[CookieClient] Getting multiple cookies:`, names);
    }

    const cookieStore = await this.getCookieStore();
    const result = {} as { [K in N]: string | null };

    names.forEach((name) => {
      const cookie = cookieStore.get(name as string);
      result[name] = cookie?.value ?? null;
    });

    if (process.env.NODE_ENV !== "production") {
      console.debug(`[CookieClient] Multiple cookies result:`, result);
    }

    return result;
  }

  /**
   * Deletes one or more cookies by their names
   * @template N - The cookie name type from the configuration
   * @param names - Array of cookie names to delete
   * @returns Operation result with list of successfully deleted cookies
   */
  async delete<N extends keyof Config | string>(
    names: N[]
  ): Promise<{ success: boolean; message: string; deletedCookies: string[] }> {
    if (process.env.NODE_ENV !== "production") {
      console.debug(`[CookieClient] Attempting to delete cookies:`, names);
    }

    const cookieStore = await this.getCookieStore();

    const deletedCookies = names.filter((name) => {
      try {
        cookieStore.delete(name as string);
        return true;
      } catch {
        if (process.env.NODE_ENV !== "production") {
          console.warn(
            `[CookieClient] Failed to delete cookie: ${String(name)}`
          );
        }
        return false;
      }
    });

    if (process.env.NODE_ENV !== "production") {
      console.debug(
        `[CookieClient] Successfully deleted cookies:`,
        deletedCookies
      );
    }

    return {
      success: deletedCookies.length === names.length,
      message: `Deleted ${deletedCookies.length} of ${names.length} cookies`,
      deletedCookies: deletedCookies as string[],
    };
  }

  /**
   * Checks if a cookie exists
   * @template N - The cookie name type from the configuration
   * @param name - The name of the cookie to check
   * @returns Boolean indicating if the cookie exists
   */
  async has<N extends keyof Config>(name: N): Promise<boolean> {
    if (process.env.NODE_ENV !== "production") {
      console.debug(
        `[CookieClient] Checking existence of cookie: ${String(name)}`
      );
    }

    const cookieStore = await this.getCookieStore();
    const cookie = cookieStore.get(name as string);
    const exists = cookie !== undefined;

    if (process.env.NODE_ENV !== "production") {
      console.debug(`[CookieClient] Cookie ${String(name)} exists: ${exists}`);
    }

    return exists;
  }

  /**
   * Deletes all cookies defined in the configuration
   * @returns Operation result with list of successfully deleted cookies
   */
  async clearAll(): Promise<{
    success: boolean;
    message: string;
    deletedCookies: string[];
  }> {
    if (process.env.NODE_ENV !== "production") {
      console.debug("[CookieClient] Clearing all cookies defined in config");
    }

    const cookieNames = Object.keys(this.config);
    return this.delete(cookieNames);
  }
}

// ==============================
// Core Functions
// ==============================

/**
 * Creates a type-safe cookie client for managing cookies in Next.js applications
 *
 * @template T - The cookie configuration type defining valid cookie names and values
 * @param config - A configuration object that specifies allowed cookie names and their possible values
 * @returns A type-safe cookie client with methods for setting, getting, and managing cookies
 *
 * @description
 * This function provides a type-safe way to interact with cookies in Next.js applications.
 * It ensures that only predefined cookie names and values can be used, preventing runtime errors.
 *
 * @example
 * ```typescript
 * // Create a cookie client with a strict configuration
 * const cookieClient = createCookieClient({
 *   // Define allowed values for 'theme' cookie
 *   theme: ['light', 'dark'] as const,
 *
 *   // Allow any string value for 'sessionId'
 *   sessionId: undefined,
 * });
 *
 * // Type-safe operations
 * await cookieClient.set('theme', 'light');     // ✅ Valid: 'light' is an allowed theme value
 * await cookieClient.set('theme', 'blue');      // ❌ Type error: 'blue' is not an allowed theme
 * await cookieClient.set('unknown', 'value');   // ❌ Type error: 'unknown' is not a defined cookie
 *
 * // Retrieve a cookie value
 * const themeResult = await cookieClient.get('theme');
 *
 * // Delete cookies
 * await cookieClient.delete(['theme', 'sessionId']);
 * ```
 *
 * @throws {Error} Throws an error during development if the configuration is invalid
 */
export function createCookieClient<T extends CookieConfig>(
  config: T
): CookieClient<T> {
  if (process.env.NODE_ENV !== "production") {
    // Validate config structure
    if (!config || typeof config !== "object") {
      throw new Error("[CookieClient] Configuration must be a valid object");
    }

    // Validate each config entry
    Object.entries(config).forEach(([key, value]) => {
      if (value !== undefined && !Array.isArray(value)) {
        throw new Error(
          `[CookieClient] Config value for "${key}" must be either undefined or an array of strings`
        );
      }
    });
  }

  return new CookieClient(config);
}

export default createCookieClient;
