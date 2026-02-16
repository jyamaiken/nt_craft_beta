import { NextResponse } from "next/server";
import { readQuests, writeQuests } from "@/lib/storage";
import { Quest } from "@/lib/types";

export async function GET() {
  try {
    const quests = await readQuests();
    return NextResponse.json(quests);
  } catch (error) {
    return NextResponse.json(
      { message: "Failed to load quests", error: String(error) },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Quest[];
    if (!Array.isArray(body)) {
      return NextResponse.json({ message: "Body must be an array" }, { status: 400 });
    }
    await writeQuests(body);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { message: "Failed to save quests", error: String(error) },
      { status: 500 },
    );
  }
}
