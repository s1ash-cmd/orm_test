import { readFile } from "node:fs/promises";
import path from "node:path";
import { downloadFiles } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const filename = new URL(request.url).searchParams.get("path");
  if (!filename || !downloadFiles.some(item => item === filename)) {
    return Response.json({ error: "Файл не найден." }, { status: 404 });
  }
  try {
    let bytes: Buffer;
    if (filename.startsWith("benchmark/")) bytes = await readFile(path.join(process.cwd(), "benchmark", filename.slice(10)));
    else if (filename.startsWith("projects/")) bytes = await readFile(path.join(process.cwd(), "projects", filename.slice(9)));
    else bytes = await readFile(path.join(process.cwd(), "diagrams", filename.slice(9)));
    const mime = filename.endsWith(".json") ? "application/json" : filename.endsWith(".csv") ? "text/csv" : filename.endsWith(".drawio") ? "application/xml" : "text/plain";
    return new Response(new Uint8Array(bytes), { headers: {
      "Content-Type": mime + "; charset=utf-8",
      "Content-Disposition": 'attachment; filename="' + path.basename(filename) + '"',
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "no-store",
    } });
  } catch {
    return Response.json({ error: "Файл отсутствует в репозитории." }, { status: 404 });
  }
}
