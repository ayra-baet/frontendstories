import { AppwriteException } from "appwrite";
import { describe, expect,it } from "vitest";

import AppError from "./AppError";
import getErrorMessage from "./getErrorMessage";

const FALLBACK_MESSAGE = "Something went wrong. Please try again.";

describe("GetErrorMessage", () => {
  // AppError messages are authored for display, so they can be returned unchanged.
  describe("AppError", () => {
    it("returns the user-facing message from an AppError", () => {
      const error = new AppError("Post ID is required.");

      expect(getErrorMessage(error)).toBe("Post ID is required.");
    });
  });

  // Translate known Appwrite failures into actionable, user-safe messages.
  describe("AppwriteException", () => {
    it("maps invalid credentials to a sign-in error message", () => {
      const error = new AppwriteException(
        "Invalid credentials",
        401,
        "user_invalid_credentials",
      );

      expect(getErrorMessage(error)).toBe(
        "The email or password you entered is incorrect. Please try again.",
      );
    });

    it("maps a 403 response to a permission error message", () => {
      const error = new AppwriteException(
        "Forbidden",
        403,
        "general_access_forbidden",
      );

      expect(getErrorMessage(error)).toBe(
        "You don't have permission to perform this action.",
      );
    });

    it("maps a 500-level response to a server error message", () => {
      const error = new AppwriteException(
        "Internal server error",
        500,
        "general_server_error",
      );

      expect(getErrorMessage(error)).toBe(
        "Something went wrong on our end. Please try again later.",
      );
    });

    it("uses the fallback when an Appwrite error has no known mapping", () => {
      const error = new AppwriteException(
        "Missing required parameter",
        400,
        "missing_required_parameter",
      );

      expect(getErrorMessage(error)).toBe(FALLBACK_MESSAGE);
    });
  });

  // Unknown inputs may contain technical details, so never show them directly
  describe("unexpected inputs", () => {
    it("uses the fallback instead of exposing an unexpected Error message", () => {
      const error = new Error("ReferenceError: client is not defined.");

      expect(getErrorMessage(error)).toBe(FALLBACK_MESSAGE);
    });

    it("uses the fallback for a plain string input", () => {
      expect(getErrorMessage("Unexpected failure")).toBe(FALLBACK_MESSAGE);
    });

    it("uses the fallback for null", () => {
      expect(getErrorMessage(null)).toBe(FALLBACK_MESSAGE);
    });
  });
});
