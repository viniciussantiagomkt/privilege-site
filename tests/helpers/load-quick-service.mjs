import fs from "node:fs";
import Module from "node:module";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const file = fileURLToPath(
  new URL("../../lib/crm/quick-service.ts", import.meta.url),
);
const compiled = new Module(file);
compiled._compile(
  ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText,
  file,
);
export const quickService = compiled.exports;
