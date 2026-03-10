/**
 * Data Loader and Validator
 * 
 * Design: Load and validate JSON data files
 * - Fetch JSON from public/data directory
 * - Validate against expected schemas
 * - Provide fallback defaults
 * - Support for modding via /data/mods
 */

import {
  Saga,
  Chapter,
  Choice,
  Employee,
  RandomEvent,
  TechStack,
  ValidationResult,
  ValidationError
} from "@/types";

interface LoadResult<T> {
  data: T[];
  errors: ValidationError[];
  isValid: boolean;
}

class DataLoader {
  private baseUrl = "/data";
  private cache: Map<string, any> = new Map();

  /**
   * Load JSON file from public/data directory
   */
  private async loadJSON<T>(filename: string): Promise<T[]> {
    const cacheKey = `${this.baseUrl}/${filename}`;

    // Check cache first
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const response = await fetch(`${cacheKey}.json`);
      if (!response.ok) {
        console.warn(`Failed to load ${filename}: ${response.statusText}`);
        return [];
      }

      const data = await response.json();
      this.cache.set(cacheKey, data);
      return data;
    } catch (error) {
      console.error(`Error loading ${filename}:`, error);
      return [];
    }
  }

  /**
   * Validate saga data
   */
  private validateSaga(saga: any): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!saga.id || typeof saga.id !== "number") {
      errors.push({ field: "id", message: "Missing or invalid id", value: saga.id });
    }

    if (!saga.name || typeof saga.name !== "string") {
      errors.push({ field: "name", message: "Missing or invalid name", value: saga.name });
    }

    if (!saga.category || !["business", "technical", "personal", "crisis"].includes(saga.category)) {
      errors.push({ field: "category", message: "Invalid category", value: saga.category });
    }

    if (typeof saga.rewardMoney !== "number") {
      errors.push({ field: "rewardMoney", message: "Invalid rewardMoney", value: saga.rewardMoney });
    }

    return errors;
  }

  /**
   * Validate chapter data
   */
  private validateChapter(chapter: any): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!chapter.id || typeof chapter.id !== "number") {
      errors.push({ field: "id", message: "Missing or invalid id", value: chapter.id });
    }

    if (!chapter.sagaId || typeof chapter.sagaId !== "number") {
      errors.push({ field: "sagaId", message: "Missing or invalid sagaId", value: chapter.sagaId });
    }

    if (typeof chapter.sequenceNumber !== "number") {
      errors.push({ field: "sequenceNumber", message: "Missing or invalid sequenceNumber", value: chapter.sequenceNumber });
    }

    if (!chapter.title || typeof chapter.title !== "string") {
      errors.push({ field: "title", message: "Missing or invalid title", value: chapter.title });
    }

    return errors;
  }

  /**
   * Validate choice data
   */
  private validateChoice(choice: any): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!choice.id || typeof choice.id !== "number") {
      errors.push({ field: "id", message: "Missing or invalid id", value: choice.id });
    }

    if (!choice.chapterId || typeof choice.chapterId !== "number") {
      errors.push({ field: "chapterId", message: "Missing or invalid chapterId", value: choice.chapterId });
    }

    if (!choice.text || typeof choice.text !== "string") {
      errors.push({ field: "text", message: "Missing or invalid text", value: choice.text });
    }

    if (typeof choice.apCost !== "number") {
      errors.push({ field: "apCost", message: "Missing or invalid apCost", value: choice.apCost });
    }

    return errors;
  }

  /**
   * Load and validate sagas
   */
  async loadSagas(): Promise<LoadResult<Saga>> {
    const rawData = await this.loadJSON<Saga>("sagas");
    const errors: ValidationError[] = [];
    const validSagas: Saga[] = [];

    for (const saga of rawData) {
      const sagaErrors = this.validateSaga(saga);
      if (sagaErrors.length === 0) {
        validSagas.push(saga);
      } else {
        errors.push(...sagaErrors);
      }
    }

    return {
      data: validSagas,
      errors,
      isValid: errors.length === 0
    };
  }

  /**
   * Load and validate chapters
   */
  async loadChapters(): Promise<LoadResult<Chapter>> {
    const rawData = await this.loadJSON<Chapter>("chapters");
    const errors: ValidationError[] = [];
    const validChapters: Chapter[] = [];

    for (const chapter of rawData) {
      const chapterErrors = this.validateChapter(chapter);
      if (chapterErrors.length === 0) {
        validChapters.push(chapter);
      } else {
        errors.push(...chapterErrors);
      }
    }

    return {
      data: validChapters,
      errors,
      isValid: errors.length === 0
    };
  }

  /**
   * Load and validate choices
   */
  async loadChoices(): Promise<LoadResult<Choice>> {
    const rawData = await this.loadJSON<Choice>("choices");
    const errors: ValidationError[] = [];
    const validChoices: Choice[] = [];

    for (const choice of rawData) {
      const choiceErrors = this.validateChoice(choice);
      if (choiceErrors.length === 0) {
        validChoices.push(choice);
      } else {
        errors.push(...choiceErrors);
      }
    }

    return {
      data: validChoices,
      errors,
      isValid: errors.length === 0
    };
  }

  /**
   * Load game configuration
   */
  async loadConfig(): Promise<Record<string, any>> {
    return await this.loadJSON<Record<string, any>>("config").then(data => {
      return data.length > 0 ? data[0] : {};
    });
  }

  /**
   * Load all game data
   */
  async loadAllData(): Promise<{
    sagas: LoadResult<Saga>;
    chapters: LoadResult<Chapter>;
    choices: LoadResult<Choice>;
    config: Record<string, any>;
    hasErrors: boolean;
  }> {
    const [sagasResult, chaptersResult, choicesResult, config] = await Promise.all([
      this.loadSagas(),
      this.loadChapters(),
      this.loadChoices(),
      this.loadConfig()
    ]);

    const hasErrors = !sagasResult.isValid || !chaptersResult.isValid || !choicesResult.isValid;

    if (hasErrors) {
      console.warn("Data validation errors detected:", {
        sagas: sagasResult.errors,
        chapters: chaptersResult.errors,
        choices: choicesResult.errors
      });
    }

    return {
      sagas: sagasResult,
      chapters: chaptersResult,
      choices: choicesResult,
      config,
      hasErrors
    };
  }

  /**
   * Clear cache (for testing or reload)
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// Singleton instance
export const dataLoader = new DataLoader();

export default dataLoader;
