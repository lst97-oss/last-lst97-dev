# Cloudflare Tunnel ingress

The public chat/contact endpoints use `CF-Connecting-IP` for per-client rate limits and diagnostics only when both `NODE_ENV=production` and the request carries a valid `x-origin-verification` header. The app compares that header with `CLOUDFLARE_ORIGIN_VERIFY_SECRET`; a missing or mismatched value fails closed. Configure a Cloudflare Request Header Transform Rule for the public hostname and the chat/contact API paths. Use **Set static** to set `x-origin-verification` to a randomly generated value of at least 32 characters. Set static overwrites a visitor-supplied value before Cloudflare sends the request to the origin. Store the same value as `CLOUDFLARE_ORIGIN_VERIFY_SECRET` in the server's secret store; never commit it or log request headers.

Keep the origin private as well. Do not expose the origin port publicly or accept direct-origin traffic. The verification header is an additional origin check, not a replacement for Cloudflare Tunnel or a firewall rule limiting inbound traffic to trusted Cloudflare ingress.

For an origin that is not already restricted to Cloudflare, create a named Cloudflare Tunnel and configure the public hostname route in the Cloudflare dashboard to point to the private application listener (for example `http://localhost:3000`). Run the connector on the origin host:

```sh
cloudflared tunnel --no-autoupdate run --token "$CLOUDFLARE_TUNNEL_TOKEN"
```

Provide the tunnel token to the connector through the deployment secret manager or a securely exported environment variable; never commit it. Keep the app bound to localhost/private networking and close public ingress to its port. The tunnel is outbound-only and does not require opening an inbound firewall port. Configure Cloudflare Access/WAF policy as appropriate; Tunnel supplies private origin connectivity, not application authentication.

If the platform already guarantees Cloudflare-only origin access and strips/rewrites visitor IP headers, a separate Tunnel is unnecessary, but the origin verification header must still be configured for production rate limits. Configure `CLOUDFLARE_ORIGIN_VERIFY_SECRET`, `TYPESAFE_API_KEY`, `CHAT_CONTEXT_SIGNING_SECRET`, and `RATE_LIMIT_HASH_SECRET` in the server environment; use independent random secrets of at least 32 characters. For example, run this Bun command once per secret and use a different output each time:

```sh
bun -e 'console.log(Array.from(crypto.getRandomValues(new Uint8Array(32)), (byte) => byte.toString(16).padStart(2, "0")).join(""))'
```
