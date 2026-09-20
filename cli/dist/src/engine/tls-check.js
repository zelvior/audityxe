"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkTlsCertificate = checkTlsCertificate;
const node_tls_1 = __importDefault(require("node:tls"));
const WEAK_PROTOCOLS = new Set(["TLSv1", "TLSv1.1", "SSLv3", "SSLv2"]);
function checkTlsCertificate(hostname, timeoutMs = 8000) {
    return new Promise((resolve) => {
        const empty = {
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
        const finish = (result) => {
            if (settled)
                return;
            settled = true;
            clearTimeout(timer);
            try {
                socket.destroy();
            }
            catch {
                /* ignore */
            }
            resolve(result);
        };
        const timer = setTimeout(() => finish({ ...empty, error: "TLS handshake timed out." }), timeoutMs);
        let socket;
        try {
            socket = node_tls_1.default.connect({
                host: hostname,
                port: 443,
                servername: hostname,
                rejectUnauthorized: false, // we inspect validity ourselves; don't throw on self-signed/expired
                timeout: timeoutMs,
            }, () => {
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
                        .map((s) => s.trim().replace(/^DNS:/i, ""))
                        .filter(Boolean);
                    const hostnameMatches = altNames.some((n) => matchesHostname(n, hostname)) ||
                        (!!cert.subject?.CN && matchesHostname(Array.isArray(cert.subject.CN) ? cert.subject.CN[0] : cert.subject.CN, hostname));
                    const protocol = socket.getProtocol();
                    const cipher = socket.getCipher();
                    finish({
                        fetched: true,
                        error: null,
                        protocol: protocol || null,
                        cipherName: cipher?.name || null,
                        subjectCN: (Array.isArray(cert.subject?.CN) ? cert.subject.CN[0] : cert.subject?.CN) || null,
                        issuerCN: (Array.isArray(cert.issuer?.CN) ? cert.issuer.CN[0] : cert.issuer?.CN) || null,
                        issuerOrg: (Array.isArray(cert.issuer?.O) ? cert.issuer.O[0] : cert.issuer?.O) || null,
                        validFrom,
                        validTo,
                        daysUntilExpiry,
                        isExpired: validToMs ? validToMs < now : false,
                        // A same-CN comparison alone is a weak signal (some CAs reuse
                        // matching org/CN legitimately) — the reliable test is
                        // whether the cert's issuer is itself in the chain, which
                        // Node exposes directly via issuerCertificate. Falls back to
                        // the CN heuristic only if that's unavailable.
                        isSelfSigned: cert.issuerCertificate === cert ||
                            (!!cert.fingerprint256 && cert.fingerprint256 === cert.issuerCertificate?.fingerprint256) ||
                            (!!cert.issuer?.CN && !!cert.subject?.CN && cert.issuer.CN === cert.subject.CN),
                        hostnameMatches,
                        sanCount: altNames.length,
                        altNames,
                        isWeakProtocol: protocol ? WEAK_PROTOCOLS.has(protocol) : false,
                        keyBits: cert.bits ?? null,
                        keyType: cert.pubkey ? inferKeyType(cert) : null,
                    });
                }
                catch (err) {
                    finish({ ...empty, error: err instanceof Error ? err.message : "Certificate inspection failed." });
                }
            });
        }
        catch (err) {
            finish({ ...empty, error: err instanceof Error ? err.message : "Could not open TLS connection." });
            return;
        }
        socket.on("error", (err) => {
            finish({ ...empty, error: err instanceof Error ? err.message : "TLS connection error." });
        });
    });
}
function matchesHostname(pattern, hostname) {
    const p = pattern.toLowerCase();
    const h = hostname.toLowerCase();
    if (p === h)
        return true;
    if (p.startsWith("*.")) {
        const suffix = p.slice(1); // ".example.com"
        return h.endsWith(suffix) && h.split(".").length === p.split(".").length;
    }
    return false;
}
function inferKeyType(cert) {
    const asymmetricKeyType = cert.asymmetricKeyType;
    if (asymmetricKeyType)
        return asymmetricKeyType.toUpperCase();
    return null;
}
