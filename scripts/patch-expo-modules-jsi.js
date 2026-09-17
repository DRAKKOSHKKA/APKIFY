const fs = require('fs');
const path = require('path');

console.log('--- Patching expo-modules-jsi for Swift 6.0/6.1 compatibility ---');

// 1. Patch Package.swift
const pkgPath = path.resolve('node_modules/expo-modules-jsi/apple/Package.swift');
if (fs.existsSync(pkgPath)) {
  let content = fs.readFileSync(pkgPath, 'utf8');
  content = content.replace(/swift-tools-version:\s*6\.\d+/, 'swift-tools-version: 6.0');
  content = content.replace(/\.enableUpcomingFeature\([^)]+\),?/g, '');
  fs.writeFileSync(pkgPath, content, 'utf8');
  console.log('✓ Patched Package.swift (swift-tools-version: 6.0 and removed upcoming features)');
} else {
  console.warn('⚠️ Package.swift not found at', pkgPath);
}

// 2. Patch RuntimeScheduler.h
const headerPath = path.resolve('node_modules/expo-modules-jsi/apple/Sources/ExpoModulesJSI-Cxx/include/RuntimeScheduler.h');
if (fs.existsSync(headerPath)) {
  let content = fs.readFileSync(headerPath, 'utf8');
  content = content.replace(/SWIFT_RETURNS_RETAINED\s+RuntimeScheduler/g, 'RuntimeScheduler');
  fs.writeFileSync(headerPath, content, 'utf8');
  console.log('✓ Patched RuntimeScheduler.h (removed SWIFT_RETURNS_RETAINED)');
} else {
  console.warn('⚠️ RuntimeScheduler.h not found at', headerPath);
}

// 3. Patch all Swift files
function walk(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(full));
    } else if (full.endsWith('.swift')) {
      results.push(full);
    }
  }
  return results;
}

const sourcesDir = path.resolve('node_modules/expo-modules-jsi/apple/Sources');
const swiftFiles = walk(sourcesDir);
let weakLetCount = 0;
let trailingCommaCount = 0;
let sendableClassCount = 0;

for (const file of swiftFiles) {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  // 3a. Replace weak let with weak var
  if (content.includes('weak let')) {
    const matches = (content.match(/weak\s+let/g) || []).length;
    content = content.replace(/weak\s+let/g, 'weak var');
    weakLetCount += matches;
    changed = true;
  }

  // 3b. Remove trailing comma in closure parameter list
  if (content.includes('_ arguments: consuming JavaScriptValuesBuffer,')) {
    content = content.replace(
      /_ arguments: consuming JavaScriptValuesBuffer,/g,
      '_ arguments: consuming JavaScriptValuesBuffer'
    );
    trailingCommaCount++;
    changed = true;
  }

  // 3c. Fix Swift 6 Sendable class concurrency errors on mutable 'weak var runtime'
  // In Swift 6 mode, Sendable classes cannot have mutable stored properties unless marked nonisolated(unsafe)
  if (file.endsWith('JavaScriptPropNameID.swift')) {
    content = content.replace(
      /class JavaScriptPropNameID:\s*JavaScriptType(?!,\s*@unchecked Sendable)/,
      'class JavaScriptPropNameID: JavaScriptType, @unchecked Sendable'
    );
    content = content.replace(
      /(?:nonisolated\(unsafe\)\s+)?private\s+weak\s+(?:let|var)\s+runtime:\s*JavaScriptRuntime\?/,
      'nonisolated(unsafe) private weak var runtime: JavaScriptRuntime?'
    );
    sendableClassCount++;
    changed = true;
  }

  if (file.endsWith('JavaScriptError.swift')) {
    content = content.replace(
      /class JavaScriptError:\s*Error,\s*Sendable\b/,
      'class JavaScriptError: Error, @unchecked Sendable'
    );
    content = content.replace(
      /(?:nonisolated\(unsafe\)\s+)?private\s+weak\s+(?:let|var)\s+runtime:\s*JavaScriptRuntime\?/,
      'nonisolated(unsafe) private weak var runtime: JavaScriptRuntime?'
    );
    sendableClassCount++;
    changed = true;
  }

  if (file.endsWith('JavaScriptValue.swift')) {
    content = content.replace(
      /class JavaScriptValue:\s*JavaScriptType,\s*Equatable,\s*Escapable(?!,\s*@unchecked Sendable)/,
      'class JavaScriptValue: JavaScriptType, Equatable, Escapable, @unchecked Sendable'
    );
    content = content.replace(
      /(?:nonisolated\(unsafe\)\s+)?internal\s+weak\s+(?:let|var)\s+runtime:\s*JavaScriptRuntime\?/,
      'nonisolated(unsafe) internal weak var runtime: JavaScriptRuntime?'
    );
    sendableClassCount++;
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(file, content, 'utf8');
  }
}

console.log(`✓ Patched ${weakLetCount} occurrences of 'weak let' -> 'weak var' across ${swiftFiles.length} Swift files`);
console.log(`✓ Patched ${trailingCommaCount} trailing commas in closure parameter lists`);
console.log(`✓ Patched ${sendableClassCount} Sendable classes with nonisolated(unsafe) and @unchecked Sendable`);

// 4. Patch build-xcframework.sh
const scriptPath = path.resolve('node_modules/expo-modules-jsi/apple/scripts/build-xcframework.sh');
if (fs.existsSync(scriptPath)) {
  let content = fs.readFileSync(scriptPath, 'utf8');
  content = content.replace(
    /CLANG_COVERAGE_MAPPING=NO/g,
    'CLANG_COVERAGE_MAPPING=NO CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO CODE_SIGN_IDENTITY=""'
  );
  content = content.replace(/-quiet/g, '');
  fs.writeFileSync(scriptPath, content, 'utf8');
  console.log('✓ Patched build-xcframework.sh (disabled signing and removed -quiet)');
} else {
  console.warn('⚠️ build-xcframework.sh not found at', scriptPath);
}

console.log('--- Patching complete successfully ---');
