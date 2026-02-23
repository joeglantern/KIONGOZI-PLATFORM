import { defaultCache } from "@serwist/next/worker";
import { type PrecacheEntry, Serwist } from "serwist";

declare global {
    interface WorkerGlobalScope {
        __SW_MANIFEST: (string | PrecacheEntry)[] | undefined;
    }
}

const serwist = new Serwist({
    precacheEntries: (self as any).__SW_MANIFEST,
    skipWaiting: true,
    clientsClaim: true,
    navigationPreload: true,
    runtimeCaching: defaultCache,
});

serwist.addEventListeners();
