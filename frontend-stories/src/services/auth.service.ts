import { Account, ID } from "appwrite";
import config from "../config/config";
import client from "./client";

interface LoginCredentials {
  email: string;
  password: string;
}

interface CreateAccountData extends LoginCredentials {
  name: string;
}

class AuthService {
  private account: Account;

  constructor() {
    // Keep Appwrite auth logic inside the service boundary.
    this.account = new Account(client);
  }

  async createAccount({ email, password, name }: CreateAccountData) {
    // Normalize input before sending it to Appwrite.
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedName = name.trim();

    // Basic validation before the external API call.
    if (!normalizedEmail || !password || !normalizedName) {
      throw new Error("Email, password, and name are required.");
    }

    await this.account.create({
      userId: ID.unique(),
      email: normalizedEmail,
      password,
      name: normalizedName,
    });

    // Auto-login after registration for smoother UX.
    return this.login({
      email: normalizedEmail,
      password,
    });
  }

  async login({ email, password }: LoginCredentials) {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !password) {
      throw new Error("Email and password are required.");
    }

    // Let Appwrite errors propagate; this service does not transform them.
    return this.account.createEmailPasswordSession({
      email: normalizedEmail,
      password,
    });
  }

  async getCurrentUser() {
    // Keep components independent of Appwrite's Account API.
    return this.account.get();
  }

  async logout() {
    // "current" deletes the session of the authenticated user.
    return this.account.deleteSession({
      sessionId: "current",
    });
  }

  async updateName(name: string) {
    const normalizedName = name.trim();

    // Ensure name is non-empty before update.
    if (!normalizedName) {
      throw new Error("Name cannot be empty.");
    }

    return this.account.updateName({
      name: normalizedName,
    });
  }

  async updateEmail(email: string, password: string) {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      throw new Error("Email cannot be empty.");
    }

    // The current password is required to confirm the email change.
    if (!password) {
      throw new Error("Password is required.");
    }

    return this.account.updateEmail({
      email: normalizedEmail,
      password,
    });
  }

  async updatePassword(password: string, oldPassword: string) {
    if (!password) {
      throw new Error("New password cannot be empty.");
    }

    if (!oldPassword) {
      throw new Error("Current password is required.");
    }

    // Appwrite verifies the current password and whether the change is allowed.
    return this.account.updatePassword({
      password,
      oldPassword,
    });
  }

  async sendVerificationEmail() {
    // Keep the verification URL in config rather than hard-coding it here.
    return this.account.createEmailVerification({
      url: config.emailVerificationUrl,
    });
  }

  async verifyEmail(userId: string, secret: string) {
    // Require the userId and secret from the verification flow.
    if (!userId || !secret) {
      throw new Error("User ID and verification secret are required.");
    }

    return this.account.updateEmailVerification({
      userId,
      secret,
    });
  }

  async requestPasswordRecovery(email: string) {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      throw new Error("Email is required.");
    }

    // Keep the recovery URL in config rather than hard-coding it here.
    return this.account.createRecovery({
      email: normalizedEmail,
      url: config.passwordResetUrl,
    });
  }

  async resetPassword(userId: string, secret: string, password: string) {
    if (!userId || !secret || !password) {
      throw new Error("User ID, secret, and password are required.");
    }

    return this.account.updateRecovery({
      userId,
      secret,
      password,
    });
  }
}

// Export one shared instance for consistent use across the UI.
const authService = new AuthService();

export default authService;
