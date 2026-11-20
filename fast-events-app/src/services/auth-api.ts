export type AuthenticatedUser = {
  id: number;
  username: string;
  phone_number: string;
  phone_number_verified: boolean;
  country: string;
  currency: string;
};

export type AuthSession = {
  access: string;
  refresh: string;
  user: AuthenticatedUser;
};

export type SignupDetails = {
  username: string;
  phone_number: string;
  country: string;
  currency: string;
};

export type OTPRequestResult = {
  expiresInSeconds: number;
  resendAfterSeconds: number;
};

export class AuthApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly retryAfterSeconds = 0,
  ) {
    super(message);
    this.name = "AuthApiError";
  }
}

type RequestOptions = {
  body?: unknown;
  accessToken?: string;
  method?: "GET" | "POST";
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getApiBaseUrl(): string {
  const configuredUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (!configuredUrl) {
    throw new AuthApiError(
      "The API URL is not configured. Set EXPO_PUBLIC_API_URL and restart the app.",
      0,
    );
  }

  return configuredUrl.replace(/\/+$/, "");
}

function extractDetail(value: unknown): string | null {
  if (typeof value === "string") {
    return value;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const detail = extractDetail(item);
      if (detail) {
        return detail;
      }
    }
    return null;
  }
  if (!isRecord(value)) {
    return null;
  }

  if (typeof value.detail === "string") {
    return value.detail;
  }
  for (const nestedValue of Object.values(value)) {
    const detail = extractDetail(nestedValue);
    if (detail) {
      return detail;
    }
  }
  return null;
}

async function requestJson(
  path: string,
  options: RequestOptions = {},
): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  if (options.accessToken) {
    headers.Authorization = `Bearer ${options.accessToken}`;
  }

  let response: Response;
  try {
    response = await fetch(`${getApiBaseUrl()}${path}`, {
      method: options.method ?? "GET",
      headers,
      body:
        options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new AuthApiError(
        "The server took too long to respond. Please try again.",
        0,
      );
    }
    if (error instanceof TypeError) {
      throw new AuthApiError(
        "We couldn't reach the server. Check your connection and try again.",
        0,
      );
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }

  const responseText = await response.text();
  let payload: unknown = null;
  if (responseText) {
    try {
      payload = JSON.parse(responseText);
    } catch (error) {
      if (!(error instanceof SyntaxError)) {
        throw error;
      }
    }
  }

  if (!response.ok) {
    const retryAfterValue = isRecord(payload) ? payload.retry_after : undefined;
    const retryAfterHeader = response.headers.get("Retry-After");
    const retryAfterSeconds =
      typeof retryAfterValue === "number"
        ? retryAfterValue
        : retryAfterHeader
          ? Number(retryAfterHeader)
          : 0;
    throw new AuthApiError(
      extractDetail(payload) ?? `Request failed with status ${response.status}.`,
      response.status,
      Number.isFinite(retryAfterSeconds) ? retryAfterSeconds : 0,
    );
  }

  if (response.status === 205) {
    return null;
  }
  if (payload === null) {
    throw new AuthApiError("The server returned an empty response.", response.status);
  }
  return payload;
}

function parseOTPRequestResult(value: unknown): OTPRequestResult {
  if (
    !isRecord(value) ||
    typeof value.expires_in !== "number" ||
    typeof value.resend_after !== "number"
  ) {
    throw new AuthApiError("The server returned an invalid OTP response.", 502);
  }

  return {
    expiresInSeconds: value.expires_in,
    resendAfterSeconds: value.resend_after,
  };
}

function parseUser(value: unknown): AuthenticatedUser {
  if (
    !isRecord(value) ||
    typeof value.id !== "number" ||
    typeof value.username !== "string" ||
    typeof value.phone_number !== "string" ||
    typeof value.phone_number_verified !== "boolean" ||
    typeof value.country !== "string" ||
    typeof value.currency !== "string"
  ) {
    throw new AuthApiError("The server returned an invalid user profile.", 502);
  }

  return {
    id: value.id,
    username: value.username,
    phone_number: value.phone_number,
    phone_number_verified: value.phone_number_verified,
    country: value.country,
    currency: value.currency,
  };
}

function parseSession(value: unknown): AuthSession {
  if (
    !isRecord(value) ||
    typeof value.access !== "string" ||
    typeof value.refresh !== "string"
  ) {
    throw new AuthApiError("The server returned an invalid auth session.", 502);
  }

  return {
    access: value.access,
    refresh: value.refresh,
    user: parseUser(value.user),
  };
}

export async function requestSignupCode(
  details: SignupDetails,
): Promise<OTPRequestResult> {
  return parseOTPRequestResult(
    await requestJson("/auth/signup/request-code/", {
      method: "POST",
      body: details,
    }),
  );
}

export async function verifySignupCode(
  phoneNumber: string,
  code: string,
): Promise<AuthSession> {
  return parseSession(
    await requestJson("/auth/signup/verify-code/", {
      method: "POST",
      body: { phone_number: phoneNumber, code },
    }),
  );
}

export async function requestLoginCode(
  phoneNumber: string,
): Promise<OTPRequestResult> {
  return parseOTPRequestResult(
    await requestJson("/auth/login/request-code/", {
      method: "POST",
      body: { phone_number: phoneNumber },
    }),
  );
}

export async function verifyLoginCode(
  phoneNumber: string,
  code: string,
): Promise<AuthSession> {
  return parseSession(
    await requestJson("/auth/login/verify-code/", {
      method: "POST",
      body: { phone_number: phoneNumber, code },
    }),
  );
}

export async function refreshAuthTokens(
  refreshToken: string,
): Promise<Pick<AuthSession, "access" | "refresh">> {
  const payload = await requestJson("/auth/token/refresh/", {
    method: "POST",
    body: { refresh: refreshToken },
  });
  if (
    !isRecord(payload) ||
    typeof payload.access !== "string" ||
    typeof payload.refresh !== "string"
  ) {
    throw new AuthApiError("The server returned invalid refreshed tokens.", 502);
  }

  return { access: payload.access, refresh: payload.refresh };
}

export async function getCurrentUser(
  accessToken: string,
): Promise<AuthenticatedUser> {
  return parseUser(await requestJson("/auth/me/", { accessToken }));
}

export async function revokeAuthSession(session: AuthSession): Promise<void> {
  await requestJson("/auth/logout/", {
    method: "POST",
    accessToken: session.access,
    body: { refresh: session.refresh },
  });
}
