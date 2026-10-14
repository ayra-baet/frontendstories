import { describe, expect, it } from "vitest";
import { AppwriteException } from "appwrite";
import getErrorMessage from "./getErrorMessage";

describe("getErrorMessage", () => {
  it("returns the network message for an Appwrite error with code 0", () => {
    const error = new AppwriteException("Test network error", 0);

    expect(getErrorMessage(error)).toBe(
      "Network error. Check your connection and try again.",
    );
  });

  it.each([
    [
      new AppwriteException(
        "Invalid credentials",
        401,
        "user_invalid_credentials",
      ),
      "The email or password you entered is incorrect. Please try again.",
    ],
    [
      new AppwriteException("Not found", 404),
      "Couldn't find what you were looking for.",
    ],
    [new Error("Custom message"), "Custom message"],
    ["unexpected value", "Something went wrong. Please try again"],
  ])("maps %s to a user-facing message", (error, expected) => {
    expect(getErrorMessage(error)).toBe(expected);
  });
});
