import { NextResponse } from "next/server";
import { readMaterials, writeMaterials } from "@/lib/storage";
import { Material } from "@/lib/types";

export async function GET() {
  try {
    const materials = await readMaterials();
    return NextResponse.json(materials);
  } catch (error) {
    return NextResponse.json(
      { message: "Failed to load materials", error: String(error) },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Material[];
    if (!Array.isArray(body)) {
      return NextResponse.json({ message: "Body must be an array" }, { status: 400 });
    }
    await writeMaterials(body);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { message: "Failed to save materials", error: String(error) },
      { status: 500 },
    );
  }
}
