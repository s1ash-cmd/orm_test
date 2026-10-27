import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";

const local = process.platform === "win32" ? ".venv/Scripts/python.exe" : ".venv/bin/python";
const python = process.env.PYTHON ?? (existsSync(local) ? local : process.platform === "win32" ? "python" : "python3");
const result = spawnSync(python, ["benchmark/run.py", ...process.argv.slice(2)], { stdio: "inherit" });
if (result.error) {
  console.error("Не удалось запустить Python. Создайте .venv по инструкции в приложении.");
  process.exitCode = 1;
} else {
  process.exitCode = result.status ?? 1;
}
