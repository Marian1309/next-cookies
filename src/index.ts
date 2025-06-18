import { cookies } from "next-14/headers";
import type { ResponseCookie } from "next-14/dist/compiled/@edge-runtime/cookies";

// Helper type to automatically make arrays readonly and preserve literal types
type AsConst<T> = T extends readonly unknown[]
  ? T
  : T extends unknown[]
  ? readonly [...T]
  : T;

type CookieConfigInput = Record<
  string,
  string[] | readonly string[] | undefined
>;
type CookieConfig = {
  [K in keyof CookieConfigInput]: AsConst<CookieConfigInput[K]>;
};

class CookieClient<Config extends CookieConfig> {
  constructor(private config: Config) {}

  // Extract valid cookie names
  private getCookieStore() {
    return cookies();
  }

  async set<N extends keyof Config>(
    name: N,
    value: Config[N] extends readonly string[] ? Config[N][number] : string,
    options?: Partial<ResponseCookie>
  ): Promise<{ success: boolean; message: string }> {
    const cookieStore = this.getCookieStore();

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

  get<N extends keyof Config>(
    name: N
  ): { success: boolean; message: string; value: string | null } {
    const cookieStore = this.getCookieStore();
    const cookie = cookieStore.get(name as string);

    return {
      success: true,
      message: `Cookie "${String(name)}" retrieved successfully`,
      value: cookie?.value ?? null,
    };
  }

  getMultiple<N extends keyof Config>(
    names: N[]
  ): {
    [K in N]: string | null;
  } {
    const cookieStore = this.getCookieStore();
    const result = {} as { [K in N]: string | null };

    names.forEach((name) => {
      const cookie = cookieStore.get(name as string);
      result[name] = cookie?.value ?? null;
    });

    return result;
  }

  delete<N extends keyof Config | string>(
    names: N[]
  ): { success: boolean; message: string; deletedCookies: string[] } {
    const cookieStore = this.getCookieStore();

    const deletedCookies = names.filter((name) => {
      try {
        cookieStore.delete(name as string);
        return true;
      } catch {
        return false;
      }
    });

    return {
      success: deletedCookies.length === names.length,
      message: `Deleted ${deletedCookies.length} of ${names.length} cookies`,
      deletedCookies: deletedCookies as string[],
    };
  }
}

export default CookieClient;
