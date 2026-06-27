import type { Database } from "@/lib/database.types";

// Domain row aliases for convenience across the app.
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Category = Database["public"]["Tables"]["categories"]["Row"];
export type Entry = Database["public"]["Tables"]["entries"]["Row"];
export type Level = Database["public"]["Tables"]["levels"]["Row"];
export type Currency = Database["public"]["Tables"]["currencies"]["Row"];
export type ExchangeRate = Database["public"]["Tables"]["exchange_rates"]["Row"];
export type LevelUpEvent = Database["public"]["Tables"]["level_up_events"]["Row"];

export type EntryType = "deposit" | "withdraw" | "transfer";
