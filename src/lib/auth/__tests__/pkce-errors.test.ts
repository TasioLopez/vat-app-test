import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { humanizeAuthCallbackError } from "../pkce-errors";

describe("humanizeAuthCallbackError", () => {
  it("maps the classic PKCE verifier error to a Dutch recovery hint", () => {
    const out = humanizeAuthCallbackError(
      "invalid request: both auth code and code verifier should be non-empty"
    );
    assert.match(out, /resetlink/i);
    assert.match(out, /www\.vat-app\.nl/);
    assert.doesNotMatch(out, /both auth code/);
  });

  it("maps expired / flow-state errors", () => {
    const out = humanizeAuthCallbackError("otp_expired");
    assert.match(out, /verlopen/i);
  });

  it("passes through unrelated messages", () => {
    assert.equal(humanizeAuthCallbackError("Something else"), "Something else");
  });

  it("falls back when empty", () => {
    assert.match(humanizeAuthCallbackError(""), /Sessie/);
  });
});
