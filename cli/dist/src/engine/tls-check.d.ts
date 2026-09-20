export interface TlsCertInfo {
    fetched: boolean;
    error: string | null;
    protocol: string | null;
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
    isWeakProtocol: boolean;
    keyBits: number | null;
    keyType: string | null;
}
export declare function checkTlsCertificate(hostname: string, timeoutMs?: number): Promise<TlsCertInfo>;
