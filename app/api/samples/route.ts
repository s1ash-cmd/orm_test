import { libraries, cases } from "@/lib/catalog";
import { readRaw } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const library = libraries.find(item => item.id === params.get("library"));
  const kind = cases.find(item => item.id === params.get("case"));
  if (!library || !kind) return Response.json({ error: "Неизвестная библиотека или запрос." }, { status: 400 });
  try {
    const data = await readRaw(library.id);
    return Response.json({
      library: library.id, case: kind.id,
      orm: data.results.find(item => item.case === kind.id && item.method === "orm")?.samples_us,
      sql: data.results.find(item => item.case === kind.id && item.method === "sql")?.samples_us,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Не удалось загрузить исходные измерения." }, { status: 500 });
  }
}
