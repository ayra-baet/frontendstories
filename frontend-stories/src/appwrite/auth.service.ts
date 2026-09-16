import { Client, Account, ID } from "appwrite";

import config from "./config";

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
    const client = new Client()
      .setEndpoint(config.endpoint)
      .setProject(config.projectId);

    this.account = new Account(client);
  }

  async createAccount({ email, password, name }: CreateAccountData) {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedName = name.trim();

    if (!normalizedEmail || !password || !normalizedName) {
      throw new Error("Email, password, and name are required.");
    }

    await this.account.create({
      userId: ID.unique(),
      email: normalizedEmail,
      password,
      name: normalizedName,
    });

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

    return this.account.createEmailPasswordSession({
      email: normalizedEmail,
      password,
    });
  }

  async getCurrentUser() {
    return this.account.get();
  }

  async logout() {
    return this.account.deleteSession({
      sessionId: "current",
    });
  }

  async updateName(name: string) {
    const normalizedName = name.trim();

    if (!normalizedName) {
      throw new Error("Name cannot be empty.");
    }

    return this.account.updateName({
      name: normalizedName
    });
  }

  async updateEmail(email: string, password: string) {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      throw new Error("Email cannot be empty.");
    }

    if (!password) {
      throw new Error("Password is required.");
    }

    return this.account.updateEmail({
      email: normalizedEmail,
      password
    });
  }

  async updatePassword(password: string, oldPassword: string) {
    if (!password) {
      throw new Error("New password cannot be empty.");
    }

    if (!oldPassword) {
      throw new Error("Current password is required.");
    }

    return this.account.updatePassword({
      password,
      oldPassword
    });
  }

  async sendVerificationEmail() {
    return this.account.createEmailVerification({
      url: config.emailVerificationUrl,
    });
  }

  async verifyEmail(userId: string, secret: string) {
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

const authService = new AuthService();

export default authService;
