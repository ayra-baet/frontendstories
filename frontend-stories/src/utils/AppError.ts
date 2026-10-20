/**
 * Represents an application error with a message intended for user display.
 * Callers are responsible for supplying appropriate text; this class does not
 * sanitize or validate the message.
 */
class AppError extends Error {
  constructor(message: string) {
    super(message);

    this.name = "AppError";
  }
}

export default AppError;
