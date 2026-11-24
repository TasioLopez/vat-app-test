import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { NextRequest } from "next/server";
import { redirectApexToWww } from "../canonical-host";
import { normalizeAuthOrigin } from "../auth-origin";
import { getSafeAuthRedirectPath } from "../safe-auth-redirect";

describe("redirectApexToWww", () => {
  it("308-redirects vat-app.nl to www preserving path and query", () => {
    const req = new NextRequest(
      "https://vat-app.nl/auth/callback?code=abc&next=%2Freset-password",
      { headers: { host: "vat-app.nl" } }
    );
    const res = redirectApexToWww(req);
    assert.ok(res);
    assert.equal(res!.status, 308);
    assert.equal(
      res!.headers.get("location"),
      "https://www.vat-app.nl/auth/callback?code=abc&next=%2Freset-password"
    );
  });

  it("leaves www and staging alone", () => {
    const www = new NextRequest("https://www.vat-app.nl/login", {
      headers: { host: "www.vat-app.nl" },
    });
    assert.equal(redirectApexToWww(www), null);

    const staging = new NextRequest("https://staging.vat-app.nl/login", {
      headers: { host: "staging.vat-app.nl" },
    });
    assert.equal(redirectApexToWww(staging), null);
  });
});

describe("normalizeAuthOrigin", () => {
  it("rewrites apex production host to www", () => {
    assert.equal(normalizeAuthOrigin("https://vat-app.nl"), "https://www.vat-app.nl");
    assert.equal(
      normalizeAuthOrigin("https://vat-app.nl/"),
      "https://www.vat-app.nl"
    );
  });

  it("does not rewrite staging", () => {
    assert.equal(
      normalizeAuthOrigin("https://staging.vat-app.nl"),
      "https://staging.vat-app.nl"
    );
  });
});

describe("getSafeAuthRedirectPath", () => {
  it("allows reset-password and signup", () => {
    assert.equal(getSafeAuthRedirectPath("/reset-password", "/signup"), "/reset-password");
    assert.equal(getSafeAuthRedirectPath("/signup", "/login"), "/signup");
  });

  it("rejects open redirects", () => {
    assert.equal(
      getSafeAuthRedirectPath("https://evil.example/phish", "/signup"),
      "/signup"
    );
  });
});
