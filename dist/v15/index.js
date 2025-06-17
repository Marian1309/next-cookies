"use server";
import { cookies } from "next-15/headers";
class CookieClient {
    constructor(config) {
        this.config = config;
    }
    // Extract valid cookie names
    getCookieStore() {
        return cookies();
    }
    async set(name, value, options) {
        const cookieStore = await this.getCookieStore();
        cookieStore.set({
            name: name,
            value: value,
            ...options,
        });
        return {
            success: true,
            message: `Cookie "${String(name)}" set successfully`,
        };
    }
    async get(name) {
        const cookieStore = await this.getCookieStore();
        const cookie = cookieStore.get(name);
        return {
            success: true,
            message: `Cookie "${String(name)}" retrieved successfully`,
            value: cookie?.value ?? null,
        };
    }
    async getMultiple(names) {
        const cookieStore = await this.getCookieStore();
        const result = {};
        names.forEach((name) => {
            const cookie = cookieStore.get(name);
            result[name] = cookie?.value ?? null;
        });
        return result;
    }
    async delete(names) {
        const cookieStore = await this.getCookieStore();
        const deletedCookies = names.filter((name) => {
            try {
                cookieStore.delete(name);
                return true;
            }
            catch {
                return false;
            }
        });
        return {
            success: deletedCookies.length === names.length,
            message: `Deleted ${deletedCookies.length} of ${names.length} cookies`,
            deletedCookies: deletedCookies,
        };
    }
}
export default CookieClient;
