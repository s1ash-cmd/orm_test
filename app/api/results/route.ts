import { loadDataset } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { examples: _, ...data } = await loadDataset();
    void _;
    return Response.json(data, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Не удалось прочитать результаты из benchmark." }, { status: 500 });
  }
}
