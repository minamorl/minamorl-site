#!/usr/bin/env ts-node

import { Project, SyntaxKind } from "ts-morph";
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

const fileBase = path.basename(filepath, ".tsx");           // 例: index
const fileDir = path.dirname(filepath);                     // 例: src/pages
const fileDirName = path.basename(fileDir);                 // 例: pages
const parentComponentName = toComponentName(fileBase);      // 例: IndexPage

const project = new Project();
const sourceFile = project.addSourceFileAtPath(filepath);

// 関数またはアロー関数で始まるReactコンポーネントを取得
const components = sourceFile.getFunctions().filter(fn => {
  const name = fn.getName();
  return name && /^[A-Z]/.test(name);
}).concat(
  sourceFile.getVariableDeclarations().filter(decl => {
    const name = decl.getName();
    const initializer = decl.getInitializer();
    return /^[A-Z]/.test(name) && initializer?.getKind() === SyntaxKind.ArrowFunction;
  })
);

// 出力とimport挿入
for (const comp of components) {
  const name = comp.getName();
  if (!name || name === parentComponentName) continue;

  const filename = `${name}.tsx`;

  const outputPath = flatten
    ? path.join(outdir, filename)
    : path.join(outdir, fileDirName, parentComponentName, filename);
  
  const dirPath = path.dirname(outputPath);
  
  if (fs.existsSync(dirPath)) {
    const stat = fs.statSync(dirPath);
    if (!stat.isDirectory()) {
      console.error(`❌ Cannot create directory ${dirPath} because a file with the same name exists.`);
      process.exit(1);
    }
  } else {
    fs.mkdirSync(dirPath, { recursive: true });
  }

  const content = `import React from 'react';\n\n${comp.getText()}\n\nexport default ${name};\n`;
  fs.writeFileSync(outputPath, content);
  console.log(`✅ Extracted ${name} → ${outputPath}`);

  comp.remove();

  const relativeImportPath = path
    .relative(fileDir, outputPath)
    .replace(/\\/g, "/")
    .replace(/\.tsx$/, "");

  sourceFile.insertStatements(0, `import ${name} from '${relativeImportPath.startsWith('.') ? relativeImportPath : './' + relativeImportPath}';`);
}

// 保存
sourceFile.saveSync();

function toComponentName(basename: string): string {
  return basename
    .replace(/[^a-zA-Z0-9]/g, ' ')         // replace non-word chars
    .split(/\s+/)                          // split words
    .map(s => s.charAt(0).toUpperCase() + s.slice(1)) // capitalize
    .join('');
}
