// src/types/cloudflare.d.ts
interface R2Bucket {
  get(key: string): Promise<R2Object | null>;
  put(key: string, value: any, options?: any): Promise<R2Object>;
  delete(key: string): Promise<void>;
  list(options?: any): Promise<any>;
}

interface R2Object {
  key: string;
  version: string;
  size: number;
  etag: string;
  httpEtag: string;
  uploaded: Date;
  httpMetadata?: any;
  customMetadata?: any;
  body: any;
  writeHttpMetadata(headers: any): void;
}
