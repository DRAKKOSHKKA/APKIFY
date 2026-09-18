const fs = require("fs");
const path = require("path");

console.log(
	"--- Patching expo-modules-jsi & expo-modules-core for Swift 6.0/6.1 compatibility ---"
);

// 1. Patch Package.swift
const pkgPath = path.resolve(
	"node_modules/expo-modules-jsi/apple/Package.swift"
);
if (fs.existsSync(pkgPath)) {
	let content = fs.readFileSync(pkgPath, "utf8");
	content = content.replace(
		/swift-tools-version:\s*6\.\d+/,
		"swift-tools-version: 6.0"
	);
	content = content.replace(
		/\.enableUpcomingFeature\([^)]+\),?/g,
		""
	);
	content = content.replace(
		/swiftLanguageModes:\s*\[[^\]]+\]/g,
		"swiftLanguageModes: [.v6]"
	);
	content = content.replace(
		/\s*"-Xfrontend",\s*"-strict-concurrency=targeted",?/g,
		""
	);
	fs.writeFileSync(pkgPath, content, "utf8");
	console.log(
		"✓ Patched Package.swift (swift-tools-version: 6.0, swiftLanguageModes: [.v6])"
	);
}

// 2. Patch ExpoModulesJSI.podspec
const podspecPath = path.resolve(
	"node_modules/expo-modules-jsi/apple/ExpoModulesJSI.podspec"
);
if (fs.existsSync(podspecPath)) {
	let content = fs.readFileSync(podspecPath, "utf8");
	content = content.replace(
		/s\.swift_version\s*=\s*['"][^'"]+['"]/,
		"s.swift_version  = '6.0'"
	);
	content = content.replace(
		/\s*'SWIFT_VERSION'\s*=>\s*'[^']+',/g,
		""
	);
	content = content.replace(
		/\s*'SWIFT_STRICT_CONCURRENCY'\s*=>\s*'[^']+',/g,
		""
	);
	fs.writeFileSync(podspecPath, content, "utf8");
	console.log(
		"✓ Patched ExpoModulesJSI.podspec (reverted to standard Swift 6.0 settings)"
	);
}

// 3. Patch RuntimeScheduler.h
const headerPath = path.resolve(
	"node_modules/expo-modules-jsi/apple/Sources/ExpoModulesJSI-Cxx/include/RuntimeScheduler.h"
);
if (fs.existsSync(headerPath)) {
	let content = fs.readFileSync(headerPath, "utf8");
	content = content.replace(
		/SWIFT_RETURNS_RETAINED\s+RuntimeScheduler/g,
		"RuntimeScheduler"
	);
	if (!content.includes("createRuntimeScheduler")) {
		const factoryCode = `
// Factory functions for Swift 6.1 compatibility.
inline expo::RuntimeScheduler *createRuntimeScheduler() {
  return new expo::RuntimeScheduler();
}

inline expo::RuntimeScheduler *createRuntimeSchedulerWithDispatch(void *scheduler, expo::RuntimeScheduler::ScheduleFn fn) {
  return new expo::RuntimeScheduler(scheduler, fn);
}

`;
		content = content.replace(
			/#endif\s*\/\/\s*__cplusplus/,
			factoryCode + "#endif // __cplusplus"
		);
	}
	fs.writeFileSync(headerPath, content, "utf8");
	console.log(
		"✓ Patched RuntimeScheduler.h (factory functions for Swift 6.1)"
	);
}

// 4. Patch HostFunctionClosure.h
const hfcPath = path.resolve(
	"node_modules/expo-modules-jsi/apple/Sources/ExpoModulesJSI-Cxx/include/HostFunctionClosure.h"
);
if (fs.existsSync(hfcPath)) {
	let content = fs.readFileSync(hfcPath, "utf8");
	if (!content.includes("createHostFunctionClosure")) {
		const factoryCode = `
// Factory function for Swift 6.1 compatibility.
inline expo::HostFunctionClosure *createHostFunctionClosure(
  expo::HostFunctionClosure::Context context,
  expo::HostFunctionClosure::Closure closure,
  expo::HostFunctionClosure::Deallocator deallocator
) {
  return new expo::HostFunctionClosure(context, closure, deallocator);
}

`;
		content = content.trimEnd() + "\n" + factoryCode;
	}
	fs.writeFileSync(hfcPath, content, "utf8");
	console.log(
		"✓ Patched HostFunctionClosure.h (factory function for Swift 6.1)"
	);
}

// 5. Patch HostObjectCallbacks.h to add appendPropNameId C++ helper inside namespace expo
const hocPath = path.resolve(
	"node_modules/expo-modules-jsi/apple/Sources/ExpoModulesJSI-Cxx/include/HostObjectCallbacks.h"
);
if (fs.existsSync(hocPath)) {
	let content = fs.readFileSync(hocPath, "utf8");
	if (!content.includes('#include "IRuntimeCompat.h"')) {
		content = content.replace(
			"#include <jsi/jsi.h>",
			'#include <jsi/jsi.h>\n#include "IRuntimeCompat.h"'
		);
	}
	if (!content.includes("appendPropNameId")) {
		const appendHelper = `
// Helper function to safely append move-only PropNameID from C++ without triggering Swift __construct_at
inline void appendPropNameId(HostObjectCallbacks::PropNameIds &vector, facebook::jsi::IRuntime &runtime, const char *name) {
  vector.push_back(facebook::jsi::PropNameID::forUtf8(runtime, name));
}

} // namespace expo
`;
		content = content.replace(
			/\}\s*\/\/\s*namespace expo/,
			appendHelper
		);
	} else {
		content = content.replace(
			/facebook::jsi::(?:I)?Runtime\s*&\s*runtime/g,
			"facebook::jsi::IRuntime &runtime"
		);
	}
	fs.writeFileSync(hocPath, content, "utf8");
	console.log(
		"✓ Patched HostObjectCallbacks.h (appendPropNameId helper with IRuntime)"
	);
}

// 6. Patch Swift files in expo-modules-jsi and expo-modules-core
function walk(dir) {
	let results = [];
	if (!fs.existsSync(dir)) return results;
	const list = fs.readdirSync(dir);
	for (const file of list) {
		const full = path.join(dir, file);
		const stat = fs.statSync(full);
		if (stat && stat.isDirectory()) {
			results = results.concat(walk(full));
		} else if (full.endsWith(".swift")) {
			results.push(full);
		}
	}
	return results;
}

const sourcesDirs = [
	path.resolve("node_modules/expo-modules-jsi/apple/Sources"),
	path.resolve("node_modules/expo-modules-core/ios"),
];
let swiftFiles = [];
for (const dir of sourcesDirs) {
	if (fs.existsSync(dir)) {
		swiftFiles = swiftFiles.concat(walk(dir));
	}
}

let weakLetCount = 0;
let trailingCommaCount = 0;
let sendableClassCount = 0;
let swiftConcurrencyPatchCount = 0;

for (const file of swiftFiles) {
	let content = fs.readFileSync(file, "utf8");
	let changed = false;

	// 6a. Replace weak let with weak var
	if (content.includes("weak let")) {
		const matches = (content.match(/weak\s+let/g) || [])
			.length;
		content = content.replace(/weak\s+let/g, "weak var");
		weakLetCount += matches;
		changed = true;
	}

	// 6b. Remove trailing comma in closure parameter list
	if (
		content.includes(
			"_ arguments: consuming JavaScriptValuesBuffer,"
		)
	) {
		content = content.replace(
			/_ arguments: consuming JavaScriptValuesBuffer,/g,
			"_ arguments: consuming JavaScriptValuesBuffer"
		);
		trailingCommaCount++;
		changed = true;
	}

	// 6c. Fix Swift 6 Sendable class concurrency errors
	if (file.endsWith("JavaScriptPropNameID.swift")) {
		content = content.replace(
			/class JavaScriptPropNameID:\s*JavaScriptType(?!,\s*@unchecked Sendable)/,
			"class JavaScriptPropNameID: JavaScriptType, @unchecked Sendable"
		);
		content = content.replace(
			/(?:nonisolated\(unsafe\)\s+)?private\s+weak\s+(?:let|var)\s+runtime:\s*JavaScriptRuntime\?/,
			"nonisolated(unsafe) private weak var runtime: JavaScriptRuntime?"
		);
		sendableClassCount++;
		changed = true;
	}

	if (file.endsWith("JavaScriptError.swift")) {
		content = content.replace(
			/class JavaScriptError:\s*Error,\s*Sendable\b/,
			"class JavaScriptError: Error, @unchecked Sendable"
		);
		content = content.replace(
			/(?:nonisolated\(unsafe\)\s+)?private\s+weak\s+(?:let|var)\s+runtime:\s*JavaScriptRuntime\?/,
			"nonisolated(unsafe) private weak var runtime: JavaScriptRuntime?"
		);
		sendableClassCount++;
		changed = true;
	}

	if (file.endsWith("JavaScriptValue.swift")) {
		content = content.replace(
			/class JavaScriptValue:\s*JavaScriptType,\s*Equatable,\s*Escapable(?!,\s*@unchecked Sendable)/,
			"class JavaScriptValue: JavaScriptType, Equatable, Escapable, @unchecked Sendable"
		);
		content = content.replace(
			/(?:nonisolated\(unsafe\)\s+)?internal\s+weak\s+(?:let|var)\s+runtime:\s*JavaScriptRuntime\?/,
			"nonisolated(unsafe) internal weak var runtime: JavaScriptRuntime?"
		);
		sendableClassCount++;
		changed = true;
	}

	// 6d. Patch Task+immediate.swift
	if (file.endsWith("Task+immediate.swift")) {
		content = `// swift-format-ignore-file: AlwaysUseLowerCamelCase
// Patched for Swift 6.1 compatibility: Task.immediate and Task(name:) are Swift 6.2+ only
extension Task where Failure == any Error {
  @discardableResult
  public static func immediate_polyfill(
    name: String? = nil,
    priority: TaskPriority? = nil,
    @_inheritActorContext @_implicitSelfCapture operation: sending @escaping @isolated(any) () async throws -> Success
  ) -> Task<Success, any Error> {
    return Task(priority: priority ?? .high, operation: operation)
  }
}
`;
		swiftConcurrencyPatchCount++;
		changed = true;
	}

	// 6e. Patch JavaScriptPromise.swift:
	// In Swift 6.1, initializing an @JavaScriptActor-isolated class at the property declaration level
	// (`private let longLivedState = LongLivedState()`) fails with:
	// "error: call to global actor 'JavaScriptActor'-isolated initializer"
	// We make it uninitialized and explicitly initialize in BOTH initializers before any use of self.
	if (file.endsWith("JavaScriptPromise.swift")) {
		// 1. Change property to uninitialized let
		if (
			content.includes(
				"private let longLivedState = LongLivedState()"
			)
		) {
			content = content.replace(
				"private let longLivedState = LongLivedState()",
				"private let longLivedState: LongLivedState"
			);
		}

		// 2. Patch init(_ runtime: JavaScriptRuntime, _ object: consuming JavaScriptObject)
		const init1Pattern =
			/(@JavaScriptActor\s+public init\(_ runtime: JavaScriptRuntime, _ object: consuming JavaScriptObject\) throws \{\s*self\.runtime = runtime)(?!\s*self\.longLivedState = LongLivedState\(\))/;
		if (init1Pattern.test(content)) {
			content = content.replace(
				init1Pattern,
				"$1\n    self.longLivedState = LongLivedState()"
			);
		}

		// 3. Patch init(_ runtime: JavaScriptRuntime)
		const init2Pattern =
			/(@JavaScriptActor\s+public init\(_ runtime: JavaScriptRuntime\) throws \{\s*self\.runtime = runtime)(?!\s*self\.longLivedState = LongLivedState\(\))/;
		if (init2Pattern.test(content)) {
			content = content.replace(
				init2Pattern,
				"$1\n    self.longLivedState = LongLivedState()"
			);
		}

		swiftConcurrencyPatchCount++;
		changed = true;
	}

	// 6f. Patch JavaScriptRuntime.swift
	if (file.endsWith("JavaScriptRuntime.swift")) {
		// Replace constructors with factory functions
		content = content.replace(
			/expo\.RuntimeScheduler\(\)/g,
			"createRuntimeScheduler()"
		);
		content = content.replace(
			/expo\.RuntimeScheduler\((\w+),\s*(\w+)\)/g,
			"createRuntimeSchedulerWithDispatch($1, $2)"
		);
		content = content.replace(
			/expo\.HostFunctionClosure\((\w+),\s*(\w+),\s*(\w+)\)/g,
			"createHostFunctionClosure($1, $2, $3)"
		);

		// Replace push_back(consuming:) with C++ helper appendPropNameId
		const propLoopOld =
			/for propertyName in propertyNames \{\s*let propNameId = facebook\.jsi\.PropNameID\.forUtf8\(iRuntime,\s*std\.string\(propertyName\)\)\s*vector\.push_back\(consuming:\s*propNameId\)\s*\}/;
		if (propLoopOld.test(content)) {
			content = content.replace(
				propLoopOld,
				`for propertyName in propertyNames {\n        expo.appendPropNameId(&vector, iRuntime, propertyName)\n      }`
			);
		} else {
			content = content.replace(
				/vector\.push_back\(consuming:\s*\w+\)/g,
				"expo.appendPropNameId(&vector, iRuntime, propertyName)"
			);
			content = content.replace(
				/let propNameId = facebook\.jsi\.PropNameID[^\n]+\n\s*/g,
				""
			);
		}

		// 6f-1: Fix regex literal syntax that fails without BareRegexSyntax:
		// "error: '$' is not a valid digit in integer literal"
		const regexOld =
			/if name\.wholeMatch\(of: \/\^\[a-zA-Z_\$\]\[a-zA-Z0-9_\$\]\*\$\/\) == nil/;
		const regexNew =
			'let validIdentifierRegex = try? Regex(#"^[a-zA-Z_$][a-zA-Z0-9_$]*$"#)\n    if validIdentifierRegex.flatMap({ name.wholeMatch(of: $0) }) == nil';
		if (regexOld.test(content)) {
			content = content.replace(regexOld, regexNew);
		}

		// 6f-2: Fix pointer data races in getter (around line 188)
		const getterOld =
			/let propertyName = String\(cString: propertyName\)\s*(?:nonisolated\(unsafe\)\s+let\s+resultPtr\s*=\s*resultPtr|let\s+resBits\s*=\s*UInt\(bitPattern:\s*resultPtr\))\s*return withGuaranteedContext\(context\) \{\s*\(context:\s*HostObjectContext,\s*runtime\)\s*in\s*return JavaScriptActor\.assumeIsolated \{\s*return forwardingSwiftErrorsToJS\(runtime: runtime\) \{\s*(?:let resultPtr = UnsafeMutablePointer<facebook\.jsi\.Value>\(bitPattern: resBits\)!\s*)?try context\.get\(propertyName\)\.writeJSIValue\(to: resultPtr\)/;
		const getterNew = `let propertyName = String(cString: propertyName)
      let resBits = UInt(bitPattern: resultPtr)

      return withGuaranteedContext(context) { (context: HostObjectContext, runtime) in
        return JavaScriptActor.assumeIsolated {
          return forwardingSwiftErrorsToJS(runtime: runtime) {
            let resultPtr = UnsafeMutablePointer<facebook.jsi.Value>(bitPattern: resBits)!
            try context.get(propertyName).writeJSIValue(to: resultPtr)`;
		if (getterOld.test(content)) {
			content = content.replace(getterOld, getterNew);
		}

		// 6f-3: Fix callerRunLoop in schedule (around line 476)
		content = content.replace(
			/nonisolated\(unsafe\) let callerRunLoop = CFRunLoopGetCurrent\(\)/g,
			"let callerRunLoop = NonisolatedUnsafeVar(CFRunLoopGetCurrent())"
		);
		content = content.replace(
			/CFRunLoopPerformBlock\(callerRunLoop,/g,
			"CFRunLoopPerformBlock(callerRunLoop.value,"
		);
		content = content.replace(
			/CFRunLoopWakeUp\(callerRunLoop\)/g,
			"CFRunLoopWakeUp(callerRunLoop.value)"
		);

		// 6f-4: Fix pointer data races in createFunctionClosure (SyncFunctionClosure)
		const funcClosureOld1 =
			/nonisolated\(unsafe\) let thisPtr = thisPtr\s*nonisolated\(unsafe\) let argumentsPtr = argumentsPtr\s*nonisolated\(unsafe\) let resultPtr = resultPtr\s*\/\/ See `withGuaranteedContext`[^\n]*\n\s*\/\/[^\n]*\n\s*return withGuaranteedContext\(context\) \{\s*\(context:\s*HostFunctionContext,\s*runtime\)\s*in\s*return JavaScriptActor\.assumeIsolated \{\s*return forwardingSwiftErrorsToJS\(runtime: runtime\) \{\s*let this = UnsafeMutablePointer\(mutating: thisPtr\)\.move\(\)/;
		const funcClosureNew1 = `let thisBits = UInt(bitPattern: thisPtr)
    let argsBits = UInt(bitPattern: argumentsPtr)
    let resBits = UInt(bitPattern: resultPtr)

    return withGuaranteedContext(context) { (context: HostFunctionContext, runtime) in
      return JavaScriptActor.assumeIsolated {
        return forwardingSwiftErrorsToJS(runtime: runtime) {
          let thisPtr = UnsafePointer<facebook.jsi.Value>(bitPattern: thisBits)!
          let argumentsPtr = UnsafePointer<facebook.jsi.Value>(bitPattern: argsBits)!
          let resultPtr = UnsafeMutablePointer<facebook.jsi.Value>(bitPattern: resBits)!
          let this = UnsafeMutablePointer(mutating: thisPtr).move()`;
		if (funcClosureOld1.test(content)) {
			content = content.replace(
				funcClosureOld1,
				funcClosureNew1
			);
		}

		// 6f-5: Fix pointer data races in createFunctionClosure (UnownedThisSyncFunctionClosure)
		const funcClosureOld2 =
			/nonisolated\(unsafe\) let thisPtr = thisPtr\s*nonisolated\(unsafe\) let argumentsPtr = argumentsPtr\s*nonisolated\(unsafe\) let resultPtr = resultPtr\s*\/\/ See `withGuaranteedContext`[^\n]*\n\s*\/\/[^\n]*\n\s*return withGuaranteedContext\(context\) \{\s*\(context:\s*UnownedThisHostFunctionContext,\s*runtime\)\s*in\s*return JavaScriptActor\.assumeIsolated \{\s*return forwardingSwiftErrorsToJS\(runtime: runtime\) \{\s*let arguments = JavaScriptValuesBuffer\(runtime, start: argumentsPtr, count: argumentsCount\)/;
		const funcClosureNew2 = `let thisBits = UInt(bitPattern: thisPtr)
    let argsBits = UInt(bitPattern: argumentsPtr)
    let resBits = UInt(bitPattern: resultPtr)

    return withGuaranteedContext(context) { (context: UnownedThisHostFunctionContext, runtime) in
      return JavaScriptActor.assumeIsolated {
        return forwardingSwiftErrorsToJS(runtime: runtime) {
          let thisPtr = UnsafePointer<facebook.jsi.Value>(bitPattern: thisBits)!
          let argumentsPtr = UnsafePointer<facebook.jsi.Value>(bitPattern: argsBits)!
          let resultPtr = UnsafeMutablePointer<facebook.jsi.Value>(bitPattern: resBits)!
          let arguments = JavaScriptValuesBuffer(runtime, start: argumentsPtr, count: argumentsCount)`;
		if (funcClosureOld2.test(content)) {
			content = content.replace(
				funcClosureOld2,
				funcClosureNew2
			);
		}

		swiftConcurrencyPatchCount++;
		changed = true;
	}

	if (changed) {
		fs.writeFileSync(file, content, "utf8");
	}
}

console.log(
	`✓ Patched ${weakLetCount} occurrences of 'weak let' -> 'weak var' across ${swiftFiles.length} Swift files`
);
console.log(
	`✓ Patched ${trailingCommaCount} trailing commas in closure parameter lists`
);
console.log(
	`✓ Patched ${sendableClassCount} Sendable classes with nonisolated(unsafe) and @unchecked Sendable`
);
console.log(
	`✓ Patched ${swiftConcurrencyPatchCount} files with Swift concurrency / UInt pointer / actor init fixes`
);

// 7. Patch build-xcframework.sh
const scriptPath = path.resolve(
	"node_modules/expo-modules-jsi/apple/scripts/build-xcframework.sh"
);
if (fs.existsSync(scriptPath)) {
	let content = fs.readFileSync(scriptPath, "utf8");
	content = content.replace(
		/\s*SWIFT_VERSION=5\.0\s*SWIFT_STRICT_CONCURRENCY=targeted/g,
		""
	);
	if (
		!content.includes(
			'CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO CODE_SIGN_IDENTITY=""'
		)
	) {
		content = content.replace(
			/CLANG_COVERAGE_MAPPING=NO/g,
			'CLANG_COVERAGE_MAPPING=NO CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO CODE_SIGN_IDENTITY=""'
		);
	}
	content = content.replace(/-quiet/g, "");
	fs.writeFileSync(scriptPath, content, "utf8");
	console.log(
		"✓ Patched build-xcframework.sh (disabled signing and removed -quiet)"
	);
}

// 8. Remove prebuilt xcframework tarballs to guarantee CocoaPods cannot link stale Swift 6.3.1 artifacts
// (Note: EXPO_USE_PRECOMPILED_MODULES=0 and package.json buildFromSource already safely instruct autolinking to build from source)
const prebuiltTarballs = [
	"node_modules/expo-modules-core/prebuilds/output/release/xcframeworks/ExpoModulesCore.tar.gz",
	"node_modules/expo-modules-core/prebuilds/output/debug/xcframeworks/ExpoModulesCore.tar.gz",
	"node_modules/expo-modules-core/prebuilds/output/release/xcframeworks/ExpoModulesWorklets.tar.gz",
	"node_modules/expo-modules-core/prebuilds/output/debug/xcframeworks/ExpoModulesWorklets.tar.gz",
	"node_modules/expo-font/prebuilds/output/release/xcframeworks/ExpoFont.tar.gz",
	"node_modules/expo-font/prebuilds/output/debug/xcframeworks/ExpoFont.tar.gz",
	"node_modules/expo/node_modules/expo-file-system/prebuilds/output/release/xcframeworks/ExpoFileSystem.tar.gz",
	"node_modules/expo/node_modules/expo-file-system/prebuilds/output/debug/xcframeworks/ExpoFileSystem.tar.gz",
];
let removedTarballs = 0;
for (const relPath of prebuiltTarballs) {
	const fullPath = path.resolve(relPath);
	if (fs.existsSync(fullPath)) {
		fs.unlinkSync(fullPath);
		removedTarballs++;
	}
}
console.log(
	`✓ Removed ${removedTarballs} prebuilt xcframework tarballs`
);

// 10. Strict Verification of All Required Files and Changes
console.log("--- Verifying applied patches ---");
const filesToVerify = [
	{
		path: "node_modules/expo-modules-jsi/apple/Package.swift",
		checks: [
			"swift-tools-version: 6.0",
			"swiftLanguageModes: [.v6]",
		],
	},
	{
		path: "node_modules/expo-modules-jsi/apple/Sources/ExpoModulesJSI-Cxx/include/RuntimeScheduler.h",
		checks: ["createRuntimeScheduler"],
	},
	{
		path: "node_modules/expo-modules-jsi/apple/Sources/ExpoModulesJSI-Cxx/include/HostFunctionClosure.h",
		checks: ["createHostFunctionClosure"],
	},
	{
		path: "node_modules/expo-modules-jsi/apple/Sources/ExpoModulesJSI-Cxx/include/HostObjectCallbacks.h",
		checks: [
			"appendPropNameId",
			"facebook::jsi::IRuntime &runtime",
		],
	},
	{
		path: "node_modules/expo-modules-jsi/apple/Sources/ExpoModulesJSI/Runtime/Values/JavaScriptPromise.swift",
		checks: ["private let longLivedState: LongLivedState"],
		customCheck: (content) => {
			const count = (
				content.match(
					/self\.longLivedState = LongLivedState\(\)/g
				) || []
			).length;
			if (count !== 2) {
				throw new Error(
					`Expected exactly 2 occurrences of 'self.longLivedState = LongLivedState()' in JavaScriptPromise.swift, but found ${count}`
				);
			}
		},
	},
	{
		path: "node_modules/expo-modules-jsi/apple/Sources/ExpoModulesJSI/Runtime/JavaScriptRuntime.swift",
		checks: [
			"UInt(bitPattern: thisPtr)",
			"UInt(bitPattern: resultPtr)",
			"createRuntimeScheduler()",
			"createHostFunctionClosure(",
			"appendPropNameId(&vector",
			'Regex(#"^[a-zA-Z_$][a-zA-Z0-9_$]*$"#)',
		],
	},
	{
		path: "node_modules/expo-modules-jsi/apple/scripts/build-xcframework.sh",
		checks: [
			'CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO CODE_SIGN_IDENTITY=""',
		],
	},
];

for (const {
	path: relPath,
	checks,
	customCheck,
} of filesToVerify) {
	const fullPath = path.resolve(relPath);
	if (!fs.existsSync(fullPath)) {
		throw new Error(
			`Expected ExpoModulesJSI file not found: ${relPath}`
		);
	}
	const content = fs.readFileSync(fullPath, "utf8");
	for (const check of checks) {
		if (!content.includes(check)) {
			throw new Error(
				`Patch verification failed: '${check}' not found in ${relPath}`
			);
		}
	}
	if (customCheck) {
		customCheck(content);
	}
}

console.log("✓ All patches verified successfully!");
