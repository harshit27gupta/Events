export class AppError extends Error {
  constructor(public status: number, public code: string, public message: string, public details?: any) {
    super(message);
  }
}

export function isTrustedError(err: any) {
  return err instanceof AppError;
}

export function asyncHandler(fn: any) {
  return function (req: any, res: any, next: any) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
