/**
 * Represents an intentional application error whose message
 * has been written for safe display to the user.
 */
class AppError extends Error {
  constructor(message: string) {
    super(message);

    this.name = "AppError";
  }
}

export default AppError;
