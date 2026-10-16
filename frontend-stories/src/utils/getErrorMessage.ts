import { AppwriteException } from "appwrite";
import AppError from "./AppError";

const FALLBACK_MESSAGE = "Something went wrong. Please try again";

function getErrorMessage(error: unknown): string {
  // Only our explicitly user-facing application errors
  // may return their own messages.
  if (error instanceof AppError) {
    return error.message;
  }

  if (error instanceof AppwriteException) {
    // Prefer specific error types over broad HTTP codes.
    switch (error.type) {
      case "user_invalid_credentials":
        return "The email or password you entered is incorrect. Please try again.";

      case "user_already_exists":
        return "An account with these details already exists.";

      case "user_invalid_token":
        return "This authentication token is invalid or expired. Please try again.";

      case "user_blocked":
        return "Your account is currently unavailable. Please contact the site administrator.";

      case "general_rate_limit_exceeded":
        return "Too many attempts. Please wait a moment before trying again.";

      case "storage_file_type_unsupported":
        return "The file type isn't supported. Please choose an allowed image format.";

      case "storage_invalid_file_size":
        return "The image is too large or has an invalid file size. Please choose another image.";

      case "row_already_exists":
        return "The data already exists. Please choose a different value.";

      case "row_invalid_structure":
        return "The data couldn't be saved. Please try again.";
    }

    // Use HTTP codes only when a more spefic type
    // hasn't already provided a message.
    switch (error.code) {
      case 401:
        return "Please sign in again to continue.";

      case 403:
        return "You don't have permission to perform this action.";

      case 404:
        return "The requested resource couldn't be found. It may have been removed.";

      case 409:
        return "The action conflicts with existing data. Please refresh and try again.";

      case 413:
        return "The uploaded file is too large. Please choose a smaller file.";

      case 429:
        return "Too many requests. Please wait a moment and try again.";
    }

    if (error.code >= 500 && error.code <= 599) {
      return "Something went wrong on our end. Please try again later.";
    }

    return FALLBACK_MESSAGE;
  }

  // Handles unexpected Errors, strings, null, and other values.
  return FALLBACK_MESSAGE;
}

export default getErrorMessage;
