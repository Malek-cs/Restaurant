export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fields?: Record<string, string>,
  ) {
    super(message);
  }
}

export const badRequest = (message: string, fields?: Record<string, string>) => new ApiError(400, "BAD_REQUEST", message, fields);
export const unauthorized = (message = "Please sign in to continue.") => new ApiError(401, "UNAUTHORIZED", message);
export const forbidden = (message = "You don't have permission to do that.") => new ApiError(403, "FORBIDDEN", message);
export const notFound = (what = "Resource") => new ApiError(404, "NOT_FOUND", `${what} not found.`);
export const conflict = (message: string, fields?: Record<string, string>) => new ApiError(409, "CONFLICT", message, fields);
export const unprocessable = (message: string, fields?: Record<string, string>) => new ApiError(422, "VALIDATION_ERROR", message, fields);
export const tooMany = (retryAfterSec: number) =>
  new ApiError(429, "RATE_LIMITED", `Too many attempts. Try again in ${retryAfterSec} seconds.`);
