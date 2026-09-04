import tls from "node:tls";

export interface TlsCertInfo {
  fetched: boolean;
  error: string | null;
  protocol: string | null; // e.g. TLSv1.3
  cipherName: string | null;
  subjectCN: string | null;
  issuerCN: string | null;
  issuerOrg: string | null;
  validFrom: string | null;
  validTo: string | null;
  daysUntilExpiry: number | null;
  isExpired: boolean;
  isSelfSigned: boolean;
  hostnameMatches: boolean;
  sanCount: number;
  altNames: string[];
  isWeakProtocol: boolean; // TLS 1.0/1.1 or SSLv3
  keyBits: number | null;
  keyType: string | null;
}

const WEAK_PROTOCOLS = new Set(["TLSv1", "TLSv1.1", "SSLv3", "SSLv2"]);

export function checkTlsCertificate(hostname: string, timeoutMs = 8000): Promise<TlsCertInfo> {
  return new Promise((resolve) => {
    const empty: TlsCertInfo = {
      fetched: false,
      error: null,
      protocol: null,
      cipherName: null,
      subjectCN: null,
      issuerCN: null,
      issuerOrg: null,
      validFrom: null,
      validTo: null,
      daysUntilExpiry: null,
      isExpired: false,
      isSelfSigned: false,
      hostnameMatches: false,
      sanCount: 0,
      altNames: [],
      isWeakProtocol: false,
      keyBits: null,
      keyType: null,
    };

    let settled = false;
    const finish = (result: TlsCertInfo) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        socket.destroy();
      } catch {
        /* ignore */
      }
      resolve(result);
    };

    const timer = setTimeout(() => finish({ ...empty, error: "TLS handshake timed out." }), timeoutMs);

    let socket: tls.TLSSocket;
    try {
      socket = tls.connect(
        {
          host: hostname,
          port: 443,
          servername: hostname,
          rejectUnauthorized: false, // we inspect validity ourselves; don't throw on self-signed/expired
          timeout: timeoutMs,
        },
        () => {
          try {
            const cert = socket.getPeerCertificate(true);
            if (!cert || Object.keys(cert).length === 0) {
              finish({ ...empty, error: "No certificate presented by server." });
              return;
            }

            const now = Date.now();
            const validFrom = cert.valid_from ? new Date(cert.valid_from).toISOString() : null;
            const validTo = cert.valid_to ? new Date(cert.valid_to).toISOString() : null;
            const validToMs = cert.valid_to ? new Date(cert.valid_to).getTime() : null;
            const daysUntilExpiry = validToMs ? Math.round((validToMs - now) / 86400000) : null;

            const altNamesRaw = cert.subjectaltname || "";
            const altNames = altNamesRaw
              .split(",")
              .map((s: string) => s.trim().replace(/^DNS:/i, ""))
              .filter(Boolean);

            const hostnameMatches =
              altNames.some((n: string) => matchesHostname(n, hostname)) ||
              (!!cert.subject?.CN && matchesHostname(cert.subject.CN, hostname));

            const protocol = socket.getProtocol();
            const cipher = socket.getCipher();

            finish({
              fetched: true,
              error: null,
              protocol: protocol || null,
              cipherName: cipher?.name || null,
              subjectCN: cert.subject?.CN || null,
              issuerCN: cert.issuer?.CN || null,
              issuerOrg: cert.issuer?.O || null,
              validFrom,
              validTo,
              daysUntilExpiry,
              isExpired: validToMs ? validToMs < now : false,
              isSelfSigned: !!cert.issuer?.CN && !!cert.subject?.CN && cert.issuer.CN === cert.subject.CN,
              hostnameMatches,
              sanCount: altNames.length,
              altNames,
              isWeakProtocol: protocol ? WEAK_PROTOCOLS.has(protocol) : false,
              keyBits: (cert as unknown as { bits?: number }).bits ?? null,
              keyType: cert.pubkey ? inferKeyType(cert) : null,
            });
          } catch (err) {
            finish({ ...empty, error: err instanceof Error ? err.message : "Certificate inspection failed." });
          }
        }
      );
    } catch (err) {
      finish({ ...empty, error: err instanceof Error ? err.message : "Could not open TLS connection." });
      return;
    }

    socket.on("error", (err: Error) => {
      finish({ ...empty, error: err instanceof Error ? err.message : "TLS connection error." });
    });
  });
}

function matchesHostname(pattern: string, hostname: string): boolean {
  const p = pattern.toLowerCase();
  const h = hostname.toLowerCase();
  if (p === h) return true;
  if (p.startsWith("*.")) {
    const suffix = p.slice(1); // ".example.com"
    return h.endsWith(suffix) && h.split(".").length === p.split(".").length;
  }
  return false;
}

function inferKeyType(cert: tls.PeerCertificate): string | null {
  const asymmetricKeyType = (cert as unknown as { asymmetricKeyType?: string }).asymmetricKeyType;
  if (asymmetricKeyType) return asymmetricKeyType.toUpperCase();
  return null;
}
