declare module 'bcrypt' {
  export function genSalt(rounds?: number): Promise<string>;
  export function hash(data: string, salt: string): Promise<string>;
  export function compare(data: string, hash: string): Promise<boolean>;
}
