#!/usr/bin/env ts-node

import { Project, SyntaxKind, VariableDeclaration, FunctionDeclaration } from "ts-morph";
import path from "path";
import fs from "fs";
import minimist from "minimist";

const argv = minimist(process.argv.slice(2));
const filepath = argv.filepath;
const outdir = argv.outdir;
const flatten = argv.flatten ?? false;

if (!filepath || !outdir) {
  console.error("Usage: --filepath FILE.tsx --outdir /absolute/path [--flatten]");
  process.exit(1);
}

const fileBase = path.basename(filepath, ".tsx");
const fileDir = path.dirname(filepath);
const parentComponentName = toComponentName(fileBase);

const project = new Project();
const sourceFile = project.addSourceFileAtPath(filepath);

// UpperCamelCaseのFunctionまたはArrowFunctionを対象
const components = sourceFile
  .getFunctions()
  .filter((fn) => {
    const name = fn.getName();
    return name && /^[A-Z]/.test(name);
  })
  .concat(
    sourceFile.getVariableDeclarations().filter((decl) => {
      const name = decl.getName();
      const init = decl.getInitializer();
      return /^[A-Z]/.test(name) && init?.getKind() === SyntaxKind.ArrowFunction;
    })
  );

const allNames = new Set(components.map((c) => c.getName()));

for (const comp of components) {
  const name = comp.getName();
  if (!name || name === parentComponentName) continue;

  const filename = `${name}.tsx`;
  const outputPath = flatten
    ? path.join(outdir, filename)
    : path.join(outdir, parentComponentName, filename);

  ensureDirSafe(path.dirname(outputPath));

let componentText: string;

  if (comp instanceof FunctionDeclaration) {
    const func = comp.asKindOrThrow(SyntaxKind.FunctionDeclaration);
    const name = func.getName();
    const funcClone = func.getText()
      .replace(/^export\s+/, '') // export削除
      .trim();
    componentText = `${funcClone}\n\nexport default ${name};`;

  } else if (comp instanceof VariableDeclaration) {
    const name = comp.getName();
    const initializer = comp.getInitializerOrThrow().getText();
    const type = comp.getTypeNode()?.getText() ?? "";
    componentText = `const ${name}${type ? `: ${type}` : ""} = ${initializer};\n\nexport default ${name};`;

  } else {
    throw new Error(`Unsupported component kind: ${comp.getKindName()}`);
  }

  // 依存している他のローカルコンポーネントを調査
  const usedIds = comp
    .getDescendantsOfKind(SyntaxKind.Identifier)
    .map((id) => id.getText());
  const localDeps = [...new Set(usedIds.filter((id) => id !== name && allNames.has(id)))];

  // import パス計算（相対）
  const importBase = flatten
    ? "."
    : path.relative(path.dirname(outputPath), path.join(outdir, parentComponentName)) || ".";

  const importLines = localDeps
    .map((dep) => `import ${dep} from '${path.posix.join(importBase, dep)}';`)
    .join("\n");

  const fullContent = `import React from 'react';\n${importLines ? importLines + "\n" : ""}\n${componentText}\n`;
  fs.writeFileSync(outputPath, fullContent);
  console.log(`✅ Extracted ${name} → ${outputPath}`);

  // 元ファイルから削除 & import追加
  comp.remove();
  const importPath = path
    .relative(fileDir, outputPath)
    .replace(/\\/g, "/")
    .replace(/\.tsx$/, "");
  const importLine = `import ${name} from '${importPath.startsWith(".") ? importPath : "./" + importPath}';`;
  sourceFile.insertStatements(0, importLine);
}

// 元ファイル保存
sourceFile.saveSync();

// Utility
function toComponentName(basename: string): string {
  return basename
    .replace(/[^a-zA-Z0-9]/g, " ")
    .split(/\s+/)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join("");
}

function ensureDirSafe(dirPath: string) {
  if (fs.existsSync(dirPath)) {
    const stat = fs.statSync(dirPath);
    if (!stat.isDirectory()) {
      console.error(`❌ ${dirPath} exists and is not a directory.`);
      process.exit(1);
    }
  } else {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}
