export interface Metrics {
    inc(name: string, labels?: Record<string, string>, value?: number): void;
    observe(name: string, value: number, labels?: Record<string, string>): void;
    set(name: string, value: number, labels?: Record<string, string>): void;
}


