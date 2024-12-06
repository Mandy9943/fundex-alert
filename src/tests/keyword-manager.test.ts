import { beforeEach, describe, expect, it } from "vitest";
import { KeywordManager } from "../keyword-manager";

describe("KeywordManager", () => {
  let keywordManager: KeywordManager;

  beforeEach(() => {
    keywordManager = KeywordManager.getInstance();
    keywordManager.setKeyword("");
  });

  it("should match case-insensitive", () => {
    keywordManager.setKeyword("Tom");
    expect(keywordManager.matchesKeyword("TOM-token")).toBe(true);
    expect(keywordManager.matchesKeyword("tom-token")).toBe(true);
    expect(keywordManager.matchesKeyword("ToM-token")).toBe(true);
  });

  it("should match substrings", () => {
    keywordManager.setKeyword("tom");
    expect(keywordManager.matchesKeyword("TOMMY-token")).toBe(true);
    expect(keywordManager.matchesKeyword("ATOM-token")).toBe(true);
  });

  it("should not match when keyword is empty", () => {
    expect(keywordManager.matchesKeyword("TOM-token")).toBe(false);
  });

  it("should not match unrelated tokens", () => {
    keywordManager.setKeyword("tom");
    expect(keywordManager.matchesKeyword("CAT-token")).toBe(false);
  });
});
