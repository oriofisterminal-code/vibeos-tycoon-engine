/**
 * Game Initializer
 * 
 * Design: Set up new game with initial state
 * - Load all game data
 * - Create initial company
 * - Initialize store
 * - Set up event listeners
 */

import { useGameStore } from "@/store/gameStore";
import { dataLoader } from "@/lib/dataLoader";
import { eventBus } from "@/lib/eventBus";
import { Company, Employee, Saga, EventType } from "@/types";

export interface GameInitOptions {
  companyName: string;
  difficulty: "easy" | "normal" | "hard";
  startingMoney: number;
  startingReputation: number;
}

const DEFAULT_OPTIONS: GameInitOptions = {
  companyName: "My Software Company",
  difficulty: "normal",
  startingMoney: 10000,
  startingReputation: 10
};

export class GameInitializer {
  /**
   * Initialize a new game
   */
  async initializeGame(options: Partial<GameInitOptions> = {}): Promise<boolean> {
    const opts = { ...DEFAULT_OPTIONS, ...options };

    try {
      // 1. Load all game data
      console.log("Loading game data...");
      const gameData = await dataLoader.loadAllData();

      if (gameData.hasErrors) {
        console.warn("Game data loaded with validation errors");
      }

      // 2. Create initial company
      const company: Company = {
        id: 1,
        name: opts.companyName,
        foundedAt: Date.now(),
        money: opts.startingMoney,
        totalEarned: opts.startingMoney,
        totalSpent: 0,
        reputation: opts.startingReputation,
        clientQuality: 0.5,
        employeeIds: [],
        maxEmployees: 50,
        techStackIds: [],
        dayNumber: 1,
        totalAPBudget: 100,
        usedAP: 0
      };

      // 3. Create initial employees (optional starter team)
      const initialEmployees: Employee[] = [];

      // 4. Initialize store
      const store = useGameStore.getState();
      store.initializeGame(company, gameData.sagas.data, initialEmployees);

      // Add chapters and choices to store
      for (const chapter of gameData.chapters.data) {
        store.chapters[chapter.id] = chapter;
      }

      for (const choice of gameData.choices.data) {
        store.choices[choice.id] = choice;
      }

      // 5. Set up event listeners
      this.setupEventListeners();

      console.log("Game initialized successfully");
      return true;
    } catch (error) {
      console.error("Failed to initialize game:", error);
      return false;
    }
  }

  /**
   * Set up game event listeners
   */
  private setupEventListeners(): void {
    // Log all events
    eventBus.subscribe(EventType.SAGA_STARTED, (event) => {
      console.log(`[Saga Started] ${event.data.sagaName}`);
    });

    eventBus.subscribe(EventType.SAGA_COMPLETED, (event) => {
      console.log(`[Saga Completed] Rewards: $${event.data.rewards.money}`);
    });

    eventBus.subscribe(EventType.EMPLOYEE_HIRED, (event) => {
      console.log(`[Employee Hired] ${event.data.employeeName}`);
    });

    eventBus.subscribe(EventType.EMPLOYEE_QUIT, (event) => {
      console.log(`[Employee Quit] ${event.data.employeeName}`);
    });

    eventBus.subscribe(EventType.MONEY_EARNED, (event) => {
      console.log(`[Money Earned] +$${event.data.amount} (${event.data.reason})`);
    });

    eventBus.subscribe(EventType.MONEY_SPENT, (event) => {
      console.log(`[Money Spent] -$${event.data.amount} (${event.data.reason})`);
    });
  }

  /**
   * Load a saved game
   */
  async loadGame(saveData: any): Promise<boolean> {
    try {
      // TODO: Implement save/load system
      console.log("Loading game from save data...");
      return true;
    } catch (error) {
      console.error("Failed to load game:", error);
      return false;
    }
  }

  /**
   * Create a test game with sample data
   */
  async createTestGame(): Promise<boolean> {
    const store = useGameStore.getState();

    // Create test company
    const company: Company = {
      id: 1,
      name: "Test Company",
      foundedAt: Date.now(),
      money: 50000,
      totalEarned: 50000,
      totalSpent: 0,
      reputation: 50,
      clientQuality: 0.8,
      employeeIds: [1, 2, 3],
      maxEmployees: 50,
      techStackIds: [],
      dayNumber: 1,
      totalAPBudget: 100,
      usedAP: 0
    };

    // Create test employees
    const employees: Employee[] = [
      {
        id: 1,
        name: "Alice Developer",
        role: "developer" as any,
        status: "active" as any,
        coding: 85,
        design: 40,
        leadership: 50,
        testing: 60,
        stress: 30,
        morale: 75,
        productivity: 85,
        baseSalary: 5000,
        currentSalary: 5000,
        hiredAt: Date.now(),
        firedAt: null,
        quitAt: null
      },
      {
        id: 2,
        name: "Bob Designer",
        role: "designer" as any,
        status: "active" as any,
        coding: 40,
        design: 90,
        leadership: 45,
        testing: 30,
        stress: 20,
        morale: 80,
        productivity: 90,
        baseSalary: 4500,
        currentSalary: 4500,
        hiredAt: Date.now(),
        firedAt: null,
        quitAt: null
      },
      {
        id: 3,
        name: "Charlie Manager",
        role: "manager" as any,
        status: "active" as any,
        coding: 60,
        design: 50,
        leadership: 95,
        testing: 50,
        stress: 60,
        morale: 70,
        productivity: 80,
        baseSalary: 6000,
        currentSalary: 6000,
        hiredAt: Date.now(),
        firedAt: null,
        quitAt: null
      }
    ];

    // Create test sagas
    const sagas: Saga[] = [
      {
        id: 1,
        name: "First Client",
        description: "Land your first paying client",
        category: "business",
        status: "in_progress" as any,
        currentChapterId: 1,
        completedChapterIds: [],
        rewardMoney: 5000,
        rewardReputation: 10,
        rewardExperience: 100,
        difficulty: 1,
        estimatedAPCost: 50,
        createdAt: Date.now(),
        startedAt: Date.now(),
        completedAt: null
      }
    ];

    // Initialize store
    store.initializeGame(company, sagas, employees);

    console.log("Test game created successfully");
    return true;
  }
}

// Singleton instance
export const gameInitializer = new GameInitializer();

export default gameInitializer;
