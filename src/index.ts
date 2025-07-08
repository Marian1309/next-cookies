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
 * Maximum size of a cookie value in bytes (4KB)
 */
const MAX_COOKIE_SIZE = 4096;

/**
 * Default time in milliseconds before a cookie is considered "expiring soon" (24 hours)
 */
const DEFAULT_EXPIRING_SOON_THRESHOLD = 24 * 60 * 60 * 1000;

/**
 * Cookie metadata including expiration information
 */
type CookieMetadata = {
  name: string;
  value: string;
  expires?: Date;
  maxAge?: number;
};

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
 * Type for complex objects that can be stored in cookies
 */
type CookieValue =
  | string
  | number
  | boolean
  | null
  | { [key: string]: CookieValue }
  | CookieValue[];

/**
 * Cookie categories for GDPR compliance
 */
export enum CookieCategory {
  Essential = "essential",
  Functional = "functional",
  Analytics = "analytics",
  Marketing = "marketing",
  Preferences = "preferences",
}

/**
 * Cookie consent preferences
 */
export type CookieConsent = {
  [key in CookieCategory]: boolean;
};

/**
 * Extended cookie configuration with GDPR metadata
 */
type CookieConfigWithGDPR = {
  category: CookieCategory;
  description: string;
  duration?: string; // Human readable duration (e.g., "1 year", "30 days")
  provider?: string; // First or third party
};

/**
 * Cookie backup metadata
 */
type CookieBackup = {
  value: string;
  timestamp: number;
  checksum: string;
};

/**
 * Extended cookie configuration with backup settings
 */
type CookieConfigWithBackup = {
  backup?: {
    critical?: boolean; // If true, cookie will be backed up
    backupCount?: number; // Number of backups to keep (default: 3)
    validateChecksum?: boolean; // If true, validate checksum on recovery
  };
};

/**
 * Input type for cookie configuration allowing string arrays, object types, or undefined
 */
type CookieConfigInput = Record<
  string,
  | string[]
  | readonly string[]
  | { type: "object"; schema: CookieValue }
  | undefined
> & {
  gdpr?: Record<string, CookieConfigWithGDPR>;
  backup?: Record<string, CookieConfigWithBackup>;
};

/**
 * Processed cookie configuration with readonly arrays and object schemas
 */
type CookieConfig = {
  [K in keyof CookieConfigInput]: CookieConfigInput[K] extends {
    type: "object";
    schema: infer S;
  }
    ? { type: "object"; schema: S }
    : AsConst<CookieConfigInput[K]>;
};

/**
 * Helper type to extract the value type from a cookie configuration
 */
type CookieValueType<T> = T extends readonly string[]
  ? T[number]
  : T extends { type: "object"; schema: infer S }
  ? S
  : string;

/**
 * Error messages for cookie operations
 */
const COOKIE_ERRORS = {
  SIZE_EXCEEDED: (size: number) =>
    `Cookie size (${size} bytes) exceeds maximum allowed size of ${MAX_COOKIE_SIZE} bytes`,
  SERIALIZATION_ERROR: "Failed to serialize cookie value",
  DESERIALIZATION_ERROR: "Failed to deserialize cookie value",
  INVALID_EXPIRATION: "Invalid expiration time provided",
} as const;

// ==============================
// Cookie Management Client
// ==============================

/**
 * Type-safe cookie management client for Next.js applications
 * Provides methods for setting, getting, and deleting cookies with strict typing
 * @template Config - The cookie configuration type defining valid cookie names and values
 */
class CookieClient<Config extends CookieConfig> {
  private autoCleanupInterval?: NodeJS.Timeout;
  private consentKey = "__cookie_consent";
  private gdprConfig: Record<string, CookieConfigWithGDPR>;
  private backupConfig: Record<string, CookieConfigWithBackup>;
  private backupPrefix = "__backup_";

  constructor(
    private config: Config,
    private options: {
      /**
       * Interval in milliseconds for automatic cleanup of expired cookies
       * Set to 0 or false to disable automatic cleanup
       * @default 0
       */
      autoCleanupInterval?: number | false;
      /**
       * Threshold in milliseconds to consider a cookie as "expiring soon"
       * @default 24 * 60 * 60 * 1000 (24 hours)
       */
      expiringSoonThreshold?: number;
      gdpr?: {
        defaultConsent?: Partial<CookieConsent>;
        consentCookieName?: string;
      };
      backup?: {
        prefix?: string;
        defaultBackupCount?: number;
      };
    } = {}
  ) {
    if (process.env.NODE_ENV !== "production") {
      console.debug("[CookieClient] Initialized with config:", config);
    }

    // Setup automatic cleanup if enabled
    if (options.autoCleanupInterval) {
      this.startAutoCleanup(options.autoCleanupInterval);
    }

    // Initialize GDPR config
    this.gdprConfig = (config as CookieConfigInput).gdpr || {};
    if (options.gdpr?.consentCookieName) {
      this.consentKey = options.gdpr.consentCookieName;
    }

    // Initialize backup config
    this.backupConfig = (config as CookieConfigInput).backup || {};
    if (options.backup?.prefix) {
      this.backupPrefix = options.backup.prefix;
    }
  }

  /**
   * Starts automatic cleanup of expired cookies
   * @private
   */
  private startAutoCleanup(interval: number) {
    this.autoCleanupInterval = setInterval(async () => {
      await this.cleanupExpiredCookies();
    }, interval);
  }

  /**
   * Stops automatic cleanup of expired cookies
   */
  public stopAutoCleanup() {
    if (this.autoCleanupInterval) {
      clearInterval(this.autoCleanupInterval);
      this.autoCleanupInterval = undefined;
    }
  }

  /**
   * Gets all cookies with their metadata
   * @private
   */
  private async getAllCookiesWithMetadata(): Promise<CookieMetadata[]> {
    const cookieStore = await this.getCookieStore();
    const cookies = cookieStore.getAll();
    return cookies.map((cookie) => ({
      name: cookie.name,
      value: cookie.value,
      expires: (cookie as ResponseCookie).expires
        ? new Date((cookie as ResponseCookie).expires!)
        : undefined,
      maxAge: (cookie as ResponseCookie).maxAge,
    }));
  }

  /**
   * Calculates the expiration date of a cookie
   * @private
   */
  private calculateExpirationDate(cookie: CookieMetadata): Date | null {
    if (cookie.expires) {
      return cookie.expires;
    }
    if (cookie.maxAge !== undefined) {
      const now = new Date();
      return new Date(now.getTime() + cookie.maxAge * 1000);
    }
    return null;
  }

  /**
   * Gets all expired cookies
   * @returns Array of expired cookie names and their metadata
   */
  async getExpiredCookies(): Promise<CookieMetadata[]> {
    const cookies = await this.getAllCookiesWithMetadata();
    const now = new Date();

    return cookies.filter((cookie) => {
      const expirationDate = this.calculateExpirationDate(cookie);
      return expirationDate !== null && expirationDate < now;
    });
  }

  /**
   * Gets all cookies that will expire soon
   * @param threshold - Time in milliseconds to consider a cookie as expiring soon
   * @returns Array of soon-to-expire cookie names and their metadata
   */
  async getExpiringSoonCookies(
    threshold = this.options.expiringSoonThreshold ??
      DEFAULT_EXPIRING_SOON_THRESHOLD
  ): Promise<CookieMetadata[]> {
    const cookies = await this.getAllCookiesWithMetadata();
    const now = new Date();
    const soon = new Date(now.getTime() + threshold);

    return cookies.filter((cookie) => {
      const expirationDate = this.calculateExpirationDate(cookie);
      return (
        expirationDate !== null &&
        expirationDate > now &&
        expirationDate <= soon
      );
    });
  }

  /**
   * Extends the expiration time of a cookie
   * @template N - The cookie name type from the configuration
   * @param name - The name of the cookie to extend
   * @param extension - Extension configuration (maxAge in seconds or specific date)
   * @returns Operation result
   */
  async extendExpiration<N extends keyof Config>(
    name: N,
    extension: { maxAge: number } | { expires: Date }
  ): Promise<{ success: boolean; message: string }> {
    try {
      const cookieStore = await this.getCookieStore();
      const cookie = cookieStore.get(name as string);

      if (!cookie) {
        return {
          success: false,
          message: `Cookie "${String(name)}" not found`,
        };
      }

      // Keep the same value but update expiration
      cookieStore.set({
        name: name as string,
        value: cookie.value,
        ...extension,
      });

      return {
        success: true,
        message: `Cookie "${String(name)}" expiration extended successfully`,
      };
    } catch (error) {
      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to extend cookie expiration",
      };
    }
  }

  /**
   * Removes all expired cookies
   * @returns Operation result with list of cleaned up cookies
   */
  async cleanupExpiredCookies(): Promise<{
    success: boolean;
    message: string;
    cleanedCookies: string[];
  }> {
    try {
      const expiredCookies = await this.getExpiredCookies();
      const expiredNames = expiredCookies.map((cookie) => cookie.name);

      if (expiredNames.length > 0) {
        const deleteResult = await this.delete(expiredNames as any[]);
        return {
          success: deleteResult.success,
          message: `Cleaned up ${deleteResult.deletedCookies.length} expired cookies`,
          cleanedCookies: deleteResult.deletedCookies,
        };
      }

      return {
        success: true,
        message: "No expired cookies to clean up",
        cleanedCookies: [],
      };
    } catch (error) {
      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to clean up expired cookies",
        cleanedCookies: [],
      };
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
   * Calculates the size of a cookie in bytes
   * @private
   * @param name - The name of the cookie
   * @param value - The value of the cookie
   * @returns The size of the cookie in bytes
   */
  private calculateCookieSize(name: string, value: string): number {
    // Cookie format: "name=value"
    // We add 1 for the equals sign
    return new TextEncoder().encode(name + "=" + value).length;
  }

  /**
   * Validates the cookie size
   * @private
   * @param name - The name of the cookie
   * @param value - The value of the cookie
   * @throws {Error} If the cookie size exceeds the maximum allowed size
   */
  private validateCookieSize(name: string, value: string): void {
    const size = this.calculateCookieSize(name, value);
    if (size > MAX_COOKIE_SIZE) {
      throw new Error(COOKIE_ERRORS.SIZE_EXCEEDED(size));
    }
  }

  /**
   * Serializes a value for storage in a cookie
   * @private
   * @param value - The value to serialize
   * @returns Serialized string value
   */
  private serializeValue(value: CookieValue): string {
    if (typeof value === "string") return value;
    try {
      return JSON.stringify(value);
    } catch (error) {
      throw new Error(COOKIE_ERRORS.SERIALIZATION_ERROR);
    }
  }

  /**
   * Deserializes a value from a cookie
   * @private
   * @param value - The string value to deserialize
   * @param expectedType - The expected type configuration
   * @returns Deserialized value
   */
  private deserializeValue<T extends CookieValue>(
    value: string | null,
    config: Config[keyof Config]
  ): T | null {
    if (value === null) return null;

    if (Array.isArray(config)) {
      return value as T; // For string literal unions, return as is
    }

    if (
      config &&
      typeof config === "object" &&
      "type" in config &&
      config.type === "object"
    ) {
      try {
        return JSON.parse(value) as T;
      } catch (error) {
        if (process.env.NODE_ENV !== "production") {
          console.error("[CookieClient] Deserialization error:", error);
        }
        throw new Error(COOKIE_ERRORS.DESERIALIZATION_ERROR);
      }
    }

    return value as T; // Default case: return as string
  }

  /**
   * Gets the cookie category
   * @private
   */
  private getCookieCategory(name: string): CookieCategory {
    return this.gdprConfig[name]?.category || CookieCategory.Essential;
  }

  /**
   * Gets the current consent preferences
   */
  async getConsent(): Promise<CookieConsent> {
    const defaultConsent: CookieConsent = {
      [CookieCategory.Essential]: true, // Essential cookies are always allowed
      [CookieCategory.Functional]: false,
      [CookieCategory.Analytics]: false,
      [CookieCategory.Marketing]: false,
      [CookieCategory.Preferences]: false,
      ...this.options.gdpr?.defaultConsent,
    };

    try {
      const consent = await this.get(this.consentKey as any);
      return consent.value
        ? JSON.parse(consent.value as string)
        : defaultConsent;
    } catch {
      return defaultConsent;
    }
  }

  /**
   * Updates consent preferences
   */
  async updateConsent(consent: Partial<CookieConsent>): Promise<{
    success: boolean;
    message: string;
    cleanedCookies: string[];
  }> {
    try {
      const currentConsent = await this.getConsent();
      const newConsent = { ...currentConsent, ...consent };

      // Save new consent
      await this.set(
        this.consentKey as any,
        JSON.stringify(newConsent) as any,
        {
          maxAge: 365 * 24 * 60 * 60, // 1 year
        }
      );

      // Remove cookies for withdrawn consent
      const cookiesToRemove = Object.entries(this.gdprConfig)
        .filter(([_, config]) => !newConsent[config.category])
        .map(([name]) => name);

      if (cookiesToRemove.length > 0) {
        const deleteResult = await this.delete(cookiesToRemove as any[]);
        return {
          success: true,
          message: "Consent updated and non-consented cookies removed",
          cleanedCookies: deleteResult.deletedCookies,
        };
      }

      return {
        success: true,
        message: "Consent updated successfully",
        cleanedCookies: [],
      };
    } catch (error) {
      return {
        success: false,
        message:
          error instanceof Error ? error.message : "Failed to update consent",
        cleanedCookies: [],
      };
    }
  }

  /**
   * Gets GDPR information for cookies
   */
  getCookiePolicy(): Record<
    CookieCategory,
    {
      cookies: Array<{
        name: string;
        description: string;
        duration?: string;
        provider?: string;
      }>;
      count: number;
    }
  > {
    const policy = Object.fromEntries(
      Object.values(CookieCategory).map((category) => [
        category,
        {
          cookies: [],
          count: 0,
        },
      ])
    ) as unknown as Record<CookieCategory, { cookies: any[]; count: number }>;

    Object.entries(this.gdprConfig).forEach(([name, config]) => {
      policy[config.category].cookies.push({
        name,
        description: config.description,
        duration: config.duration,
        provider: config.provider,
      });
      policy[config.category].count++;
    });

    return policy;
  }

  /**
   * Generates a checksum for a cookie value
   * @private
   */
  private generateChecksum(value: string): string {
    return Array.from(
      new Uint8Array(
        new TextEncoder().encode(value).reduce((acc, curr) => acc + curr, 0)
      )
    ).join("");
  }

  /**
   * Creates a backup of a cookie
   * @private
   */
  private async backupCookie<N extends keyof Config>(
    name: N,
    value: string
  ): Promise<void> {
    const config = this.backupConfig[name as string];
    if (!config?.backup?.critical) return;

    const backupCount =
      config.backup?.backupCount ??
      this.options.backup?.defaultBackupCount ??
      3;
    const backupKey = `${this.backupPrefix}${String(name)}`;

    try {
      // Get existing backups
      const existingBackups = await this.get(backupKey as any);
      const backups: CookieBackup[] = existingBackups.value
        ? JSON.parse(existingBackups.value as string)
        : [];

      // Add new backup
      backups.push({
        value,
        timestamp: Date.now(),
        checksum: this.generateChecksum(value),
      });

      // Keep only the most recent backups
      const recentBackups = backups
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, backupCount);

      // Save backups
      await this.set(backupKey as any, JSON.stringify(recentBackups) as any);
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        console.error("[CookieClient] Failed to backup cookie:", error);
      }
    }
  }

  /**
   * Recovers a cookie from backup
   * @template N - The cookie name type from the configuration
   * @param name - The name of the cookie to recover
   * @returns Operation result with recovered value
   */
  async recoverCookie<N extends keyof Config>(
    name: N
  ): Promise<{
    success: boolean;
    message: string;
    value: string | null;
  }> {
    const config = this.backupConfig[name as string];
    if (!config?.backup?.critical) {
      return {
        success: false,
        message: `Cookie "${String(name)}" is not configured for backup`,
        value: null,
      };
    }

    try {
      const backupKey = `${this.backupPrefix}${String(name)}`;
      const backupsResult = await this.get(backupKey as any);

      if (!backupsResult.value) {
        return {
          success: false,
          message: `No backups found for cookie "${String(name)}"`,
          value: null,
        };
      }

      const backups: CookieBackup[] = JSON.parse(backupsResult.value as string);
      if (backups.length === 0) {
        return {
          success: false,
          message: `No valid backups found for cookie "${String(name)}"`,
          value: null,
        };
      }

      // Get the most recent backup
      const latestBackup = backups[0];

      // Validate checksum if required
      if (config.backup?.validateChecksum) {
        const checksum = this.generateChecksum(latestBackup.value);
        if (checksum !== latestBackup.checksum) {
          return {
            success: false,
            message: `Backup corruption detected for cookie "${String(name)}"`,
            value: null,
          };
        }
      }

      // Restore the cookie
      await this.set(name, latestBackup.value as any);

      return {
        success: true,
        message: `Cookie "${String(name)}" recovered successfully`,
        value: latestBackup.value,
      };
    } catch (error) {
      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : `Failed to recover cookie "${String(name)}"`,
        value: null,
      };
    }
  }

  /**
   * Sets a cookie with the specified name, value, and options
   * @template N - The cookie name type from the configuration
   * @param name - The name of the cookie to set
   * @param value - The value to set for the cookie
   * @param options - Optional cookie configuration options
   * @returns A promise resolving to the operation result
   * @throws {Error} If the cookie size exceeds the maximum allowed size or serialization fails
   */
  async set<N extends keyof Config>(
    name: N,
    value: CookieValueType<Config[N]>,
    options?: Partial<ResponseCookie>
  ): Promise<{ success: boolean; message: string }> {
    try {
      const category = this.getCookieCategory(name as string);

      // Essential cookies bypass consent check
      if (category !== CookieCategory.Essential) {
        const consent = await this.getConsent();
        if (!consent[category]) {
          return {
            success: false,
            message: `Cannot set cookie "${String(
              name
            )}": no consent for ${category} cookies`,
          };
        }
      }

      const serializedValue = this.serializeValue(value);
      this.validateCookieSize(name as string, serializedValue);

      const cookieStore = await this.getCookieStore();
      cookieStore.set({
        name: name as string,
        value: serializedValue,
        ...options,
      });

      // Backup critical cookies after successful set
      await this.backupCookie(name, serializedValue);

      return {
        success: true,
        message: `Cookie "${String(name)}" set successfully`,
      };
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        console.error("[CookieClient] Error setting cookie:", error);
      }
      return {
        success: false,
        message:
          error instanceof Error ? error.message : "Failed to set cookie",
      };
    }
  }

  /**
   * Retrieves a cookie value by name
   * @template N - The cookie name type from the configuration
   * @param name - The name of the cookie to retrieve
   * @returns The cookie value and operation status
   */
  async get<N extends keyof Config>(
    name: N
  ): Promise<{
    success: boolean;
    message: string;
    value: CookieValueType<Config[N]> | null;
  }> {
    if (process.env.NODE_ENV !== "production") {
      console.debug(`[CookieClient] Getting cookie ${String(name)}`);
    }

    try {
      const cookieStore = await this.getCookieStore();
      const cookie = cookieStore.get(name as string);
      const value = this.deserializeValue<CookieValueType<Config[N]>>(
        cookie?.value ?? null,
        this.config[name]
      );

      if (process.env.NODE_ENV !== "production") {
        console.debug(`[CookieClient] Cookie ${String(name)} value:`, value);
      }

      return {
        success: true,
        message: `Cookie "${String(name)}" retrieved successfully`,
        value,
      };
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        console.error("[CookieClient] Error getting cookie:", error);
      }
      return {
        success: false,
        message:
          error instanceof Error ? error.message : "Failed to get cookie",
        value: null,
      };
    }
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
  async delete<N extends keyof Config>(
    names: N[]
  ): Promise<{ success: boolean; message: string; deletedCookies: N[] }> {
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
      deletedCookies: deletedCookies as N[],
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
