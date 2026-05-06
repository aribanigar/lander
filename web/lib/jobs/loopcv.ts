/**
 * LoopCV B2B API wrapper
 * Docs: https://api-docs.loopcv.com/reference/api-reference/loops
 * Base: https://b2b-api.loopcv.com
 */
import axios from "axios";

const BASE    = "https://b2b-api.loopcv.com";
const API_KEY = process.env.LOOPCV_API_KEY!;

const client = axios.create({
  baseURL: BASE,
  headers: { "X-API-KEY": API_KEY, "Content-Type": "application/json" },
  timeout: 12000,
});

export interface LoopCVLoop {
  loopId: string;
  title: string;
  location: string;
  type: string;
  level: string;
  keywords?: string[];
}

export async function createLoop(params: {
  title: string;
  location: string;
  type: "Full-time" | "Contract" | "Part-time" | "Temporary" | "Internship";
  level: "Junior" | "Associate" | "Senior";
  keywords?: string[];
  externalId?: string;
}): Promise<string | null> {
  if (!API_KEY) return null;
  try {
    const { data } = await client.post("/connect/loop", params);
    return data.loopId ?? null;
  } catch {
    console.error("LoopCV createLoop failed");
    return null;
  }
}

export async function getLoop(loopId: string): Promise<LoopCVLoop | null> {
  if (!API_KEY) return null;
  try {
    const { data } = await client.get(`/connect/loop/${loopId}`);
    return data;
  } catch {
    return null;
  }
}

export async function getAllLoops(): Promise<LoopCVLoop[]> {
  if (!API_KEY) return [];
  try {
    const { data } = await client.get("/connect/loops");
    return data ?? [];
  } catch {
    return [];
  }
}

export async function deleteLoop(loopId: string): Promise<boolean> {
  if (!API_KEY) return false;
  try {
    await client.delete(`/connect/loop/${loopId}`);
    return true;
  } catch {
    return false;
  }
}
