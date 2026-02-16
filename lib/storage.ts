import { promises as fs } from "node:fs";
import path from "node:path";
import { Material, Quest } from "@/lib/types";

const dataDir = path.join(process.cwd(), "data");
const materialsPath = path.join(dataDir, "materials.json");
const questsPath = path.join(dataDir, "quests.json");

async function readJsonFile<T>(filePath: string): Promise<T> {
  const raw = await fs.readFile(filePath, "utf-8");
  return JSON.parse(raw) as T;
}

async function writeJsonFile<T>(filePath: string, value: T): Promise<void> {
  await fs.writeFile(filePath, JSON.stringify(value, null, 2), "utf-8");
}

export async function readMaterials(): Promise<Material[]> {
  return readJsonFile<Material[]>(materialsPath);
}

export async function writeMaterials(materials: Material[]): Promise<void> {
  await writeJsonFile(materialsPath, materials);
}

export async function readQuests(): Promise<Quest[]> {
  return readJsonFile<Quest[]>(questsPath);
}

export async function writeQuests(quests: Quest[]): Promise<void> {
  await writeJsonFile(questsPath, quests);
}
