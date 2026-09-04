export const ACCESS_COOKIE = "nc_access";

/**
 * The cookie stores a hash of the shared password, never the password itself.
 * Runs on the Edge runtime (middleware) as well as in route handlers, so it
 * uses Web Crypto rather than node:crypto.
 */
export async function accessToken(password: string): Promise<string> {
  const data = new TextEncoder().encode(`nelson-clone:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
