import fs from "fs";
import path from "path";

const KEYWORD_FILE = path.join(__dirname, "keyword.json");

interface KeywordData {
  keyword: string;
  lastUpdated: string;
}

export class KeywordManager {
  private static instance: KeywordManager;
  private currentKeyword: string = "";

  private constructor() {
    this.loadKeyword();
  }

  static getInstance(): KeywordManager {
    if (!KeywordManager.instance) {
      KeywordManager.instance = new KeywordManager();
    }
    return KeywordManager.instance;
  }

  getKeyword(): string {
    return this.currentKeyword;
  }

  setKeyword(keyword: string): void {
    this.currentKeyword = keyword.toLowerCase();
    this.saveKeyword();
  }

  matchesKeyword(tokenId: string): boolean {
    if (!this.currentKeyword) return true;
    return tokenId.toLowerCase().includes(this.currentKeyword);
  }

  private loadKeyword(): void {
    try {
      if (fs.existsSync(KEYWORD_FILE)) {
        const data: KeywordData = JSON.parse(
          fs.readFileSync(KEYWORD_FILE, "utf-8")
        );
        this.currentKeyword = data.keyword.toLowerCase();
      }
    } catch (error) {
      console.error("Error loading keyword:", error);
    }
  }

  private saveKeyword(): void {
    const data: KeywordData = {
      keyword: this.currentKeyword,
      lastUpdated: new Date().toISOString(),
    };
    fs.writeFileSync(KEYWORD_FILE, JSON.stringify(data, null, 2));
  }
}
