/**
 * Opt-in (--track), purely local trend tracking — a flat JSON file at
 * ~/.audityxe/history.json, one array of every tracked run. No server,
 * no account, nothing leaves the machine; this is just enough
 * persistence to answer "did this get better or worse since last
 * time" without needing the hosted app's account system at all.
 */
export interface HistoryEntry {
    url: string;
    timestamp: string;
    overall: number;
    categories: {
        label: string;
        score: number;
    }[];
}
export declare function appendHistoryEntry(entry: HistoryEntry): void;
export declare function readHistoryForUrl(url: string): HistoryEntry[];
export declare function readAllTrackedUrls(): {
    url: string;
    latest: HistoryEntry;
}[];
export declare function getHistoryFilePath(): string;
