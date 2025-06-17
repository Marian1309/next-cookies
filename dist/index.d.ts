import type { ResponseCookie } from "next-14/dist/compiled/@edge-runtime/cookies";
type AsConst<T> = T extends readonly unknown[] ? T : T extends unknown[] ? readonly [...T] : T;
type CookieConfigInput = Record<string, string[] | readonly string[] | undefined>;
type CookieConfig = {
    [K in keyof CookieConfigInput]: AsConst<CookieConfigInput[K]>;
};
declare class CookieClient<Config extends CookieConfig> {
    private config;
    constructor(config: Config);
    private getCookieStore;
    set<N extends keyof Config>(name: N, value: Config[N] extends readonly string[] ? Config[N][number] : string, options?: Partial<ResponseCookie>): Promise<{
        success: boolean;
        message: string;
    }>;
    get<N extends keyof Config>(name: N): {
        success: boolean;
        message: string;
        value: string | null;
    };
    delete<N extends keyof Config | string>(names: N[]): {
        success: boolean;
        message: string;
        deletedCookies: string[];
    };
}
export default CookieClient;
