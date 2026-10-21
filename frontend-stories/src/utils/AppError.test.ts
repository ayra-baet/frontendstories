import { describe, expect,it } from "vitest";

import AppError from "./AppError";

describe("AppError", () => {
  it("preserves the provided message", () => {
    const message = "Title and content are required.";
    
    const error = new AppError(message);

    expect(error.message).toBe(message);
  });

  it("is an instance of an AppError", () => {
    const error = new AppError("Post ID is required.");

    expect(error).toBeInstanceOf(AppError);
  });

  it("retains the AppError name", () => {
    const error = new AppError("Post ID is required.");

    expect(error.name).toBe("AppError");
  });

  it("is also an instance of the built-in Error class", () => {
    const error = new AppError("Post ID is required.");

    expect(error).toBeInstanceOf(Error);
  });
});
