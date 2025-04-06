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

// ファイルパス内の "components" ディレクトリを除去
const fileDirParts = path.relative(process.cwd(), fileDir).split(path.sep);
const cleanDirParts = fileDirParts.filter(p => p !== "components");

const project = new Project();
const sourceFile = project.addSourceFileAtPath(filepath);

// コンポーネント抽出：Function or Arrow Function (UpperCase)
const components = sourceFile.getFunctions().filter(fn => {
  const name = fn.getName();
  return name && /^[A-Z]/.test(name);
}).concat(
  sourceFile.getVariableDeclarations().filter(decl => {
    const name = decl.getName();
    const init = decl.getInitializer();
    return /^[A-Z]/.test(name) && init?.getKind() === SyntaxKind.ArrowFunction;
  })
);

for (const comp of components) {
  const name = comp.getName();
  if (!name || name === parentComponentName) continue;

  const filename = `${name}.tsx`;
  const outputPath = flatten
    ? path.join(outdir, filename)
    : path.join(outdir, ...cleanDirParts, parentComponentName, filename);

  ensureDirSafe(path.dirname(outputPath));

  // 修飾を保持した安全なコード取得
  let componentText: string;

  if (comp instanceof FunctionDeclaration) {
    comp.setIsExported(true);
    componentText = comp.getText();
  } else if (comp instanceof VariableDeclaration) {
    const statement = comp.getFirstAncestorByKindOrThrow(SyntaxKind.VariableStatement);
    statement.setIsExported(true);
    componentText = statement.getText();
  } else {
    throw new Error(`Unsupported component kind: ${comp.getKindName()}`);
  }

  // 書き出し
  const fullContent = `import React from 'react';\n\n${componentText}\n`;
  fs.writeFileSync(outputPath, fullContent);
  console.log(`✅ Extracted ${name} → ${outputPath}`);

  // 削除 & import 文追加
  comp.remove();

  const importPath = path
    .relative(fileDir, outputPath)
    .replace(/\\/g, "/")
    .replace(/\.tsx$/, "");

  const importLine = `import ${name} from '${importPath.startsWith('.') ? importPath : './' + importPath}';`;
  sourceFile.insertStatements(0, importLine);
}

// 上書き保存
sourceFile.saveSync();

function toComponentName(basename: string): string {
  return basename
    .replace(/[^a-zA-Z0-9]/g, ' ')
    .split(/\s+/)
    .map(s => s.charAt(0).toUpperCase() + s.slice(1))
    .join('');
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
