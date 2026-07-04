export class AppError extends Error {
  public readonly statusCode: number;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = "Resource") {
    super(`${resource} not found`, 404);
  }
}

export class BadRequestError extends AppError {
  constructor(message: string) {
    super(message, 400);
  }
}
