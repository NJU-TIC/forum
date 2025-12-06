// Result type for consistent error handling across the application
export type Result<T, E = string> =
  | {
      success: true;
      data: T;
    }
  | {
      success: false;
      error: E;
    };
