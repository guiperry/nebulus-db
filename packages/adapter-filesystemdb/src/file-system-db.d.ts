declare module 'file-system-db' {
  class FSDB {
    constructor(path?: string, compact?: boolean);
    get(key: string): any;
    set(key: string, value: any): boolean;
    has(key: string): boolean;
    delete(key: string): boolean;
    deleteAll(): boolean;
    all(verbose?: boolean): Array<{ ID: string; data: any }>;
    startsWith(key: string): Array<{ ID: string; data: any }>;
    push(key: string, value: any | any[]): boolean;
    pull(key: string, value: any | any[]): boolean;
    add(key: string, value: number): boolean;
    subtract(key: string, value: number): boolean;
    multiply(key: string, value: number): boolean;
    divide(key: string, value: number): boolean;
    backup(path: string): boolean;
  }

  export = FSDB;
}