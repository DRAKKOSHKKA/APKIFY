const fs = require("fs");
const path = require("path");

console.log(
	"--- Patching expo-modules-jsi for Swift 6.0/6.1 compatibility ---"
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
	fs.writeFileSync(pkgPath, content, "utf8");
	console.log(
		"✓ Patched Package.swift (swift-tools-version: 6.0 and removed upcoming features)"
	);
}

// 2. Patch RuntimeScheduler.h
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

// 3. Patch HostFunctionClosure.h
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

// 4. Patch HostObjectCallbacks.h to add appendPropNameId C++ helper inside namespace expo
const hocPath = path.resolve('node_modules/expo-modules-jsi/apple/Sources/ExpoModulesJSI-Cxx/include/HostObjectCallbacks.h');
if (fs.existsSync(hocPath)) {
  let content = fs.readFileSync(hocPath, 'utf8');
  if (!content.includes('#include "IRuntimeCompat.h"')) {
    content = content.replace('#include <jsi/jsi.h>', '#include <jsi/jsi.h>\n#include "IRuntimeCompat.h"');
  }
  if (!content.includes('appendPropNameId')) {
    const appendHelper = `
// Helper function to safely append move-only PropNameID from C++ without triggering Swift __construct_at
inline void appendPropNameId(HostObjectCallbacks::PropNameIds &vector, facebook::jsi::IRuntime &runtime, const char *name) {
  vector.push_back(facebook::jsi::PropNameID::forUtf8(runtime, name));
}

} // namespace expo
`;
    content = content.replace(/\}\s*\/\/\s*namespace expo/, appendHelper);
  } else {
    content = content.replace(/facebook::jsi::(?:I)?Runtime\s*&\s*runtime/g, 'facebook::jsi::IRuntime &runtime');
  }
  fs.writeFileSync(hocPath, content, 'utf8');
  console.log('✓ Patched HostObjectCallbacks.h (appendPropNameId helper with IRuntime)');
}

// 5. Patch Swift files
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

const sourcesDir = path.resolve(
	"node_modules/expo-modules-jsi/apple/Sources"
);
const swiftFiles = walk(sourcesDir);
let weakLetCount = 0;
let trailingCommaCount = 0;
let sendableClassCount = 0;
let swift62PatchCount = 0;

for (const file of swiftFiles) {
	let content = fs.readFileSync(file, "utf8");
	let changed = false;

	// 5a. Replace weak let with weak var
	if (content.includes("weak let")) {
		const matches = (content.match(/weak\s+let/g) || [])
			.length;
		content = content.replace(/weak\s+let/g, "weak var");
		weakLetCount += matches;
		changed = true;
	}

	// 5b. Remove trailing comma in closure parameter list
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

	// 5c. Fix Swift 6 Sendable class concurrency errors
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

	// 5d. Patch Task+immediate.swift
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
		swift62PatchCount++;
		changed = true;
	}

	// 5e. Patch JavaScriptRuntime.swift
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
		// Original lines:
		//   for propertyName in propertyNames {
		//     let propNameId = facebook.jsi.PropNameID.forUtf8(iRuntime, std.string(propertyName))
		//     vector.push_back(consuming: propNameId)
		//   }
		const propLoopOld =
			/for propertyName in propertyNames \{\s*let propNameId = facebook\.jsi\.PropNameID\.forUtf8\(iRuntime,\s*std\.string\(propertyName\)\)\s*vector\.push_back\(consuming:\s*propNameId\)\s*\}/;
		if (propLoopOld.test(content)) {
			content = content.replace(
				propLoopOld,
				`for propertyName in propertyNames {\n        expo.appendPropNameId(&vector, iRuntime, propertyName)\n      }`
			);
		} else {
			// Fallback in case of formatting variation
			content = content.replace(
				/vector\.push_back\(consuming:\s*\w+\)/g,
				"expo.appendPropNameId(&vector, iRuntime, propertyName)"
			);
			content = content.replace(
				/let propNameId = facebook\.jsi\.PropNameID[^\n]+\n\s*/g,
				""
			);
		}

		swift62PatchCount++;
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
	`✓ Patched ${swift62PatchCount} files with Swift 6.2 -> 6.1 compatibility fixes`
);

// 6. Patch build-xcframework.sh
const scriptPath = path.resolve(
	"node_modules/expo-modules-jsi/apple/scripts/build-xcframework.sh"
);
if (fs.existsSync(scriptPath)) {
	let content = fs.readFileSync(scriptPath, "utf8");
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

console.log("--- Patching complete successfully ---");
