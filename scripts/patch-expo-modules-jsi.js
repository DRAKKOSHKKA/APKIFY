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
inline SWIFT_RETURNS_RETAINED expo::RuntimeScheduler *createRuntimeScheduler() {
  return new expo::RuntimeScheduler();
}

inline SWIFT_RETURNS_RETAINED expo::RuntimeScheduler *createRuntimeSchedulerWithDispatch(void *scheduler, expo::RuntimeScheduler::ScheduleFn fn) {
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

	if (file.endsWith("SharedObjectRegistry.swift")) {
		content = content.replace(
			/public final class SharedObjectRegistry:\s*Sendable/,
			"public final class SharedObjectRegistry: @unchecked Sendable"
		);
		sendableClassCount++;
		changed = true;
	}

	if (file.endsWith("SceneGeometry.swift")) {
		content = content.replace(
			/public enum SceneGeometry\b/,
			"@MainActor public enum SceneGeometry"
		);
		swiftConcurrencyPatchCount++;
		changed = true;
	}

	if (file.endsWith("PersistentFileLog.swift")) {
		content = content.replace(
			/private static let serialQueue = DispatchQueue/,
			"nonisolated(unsafe) private static let serialQueue = DispatchQueue"
		);
		content = content.replace(
			/public typealias PersistentFileLogFilter = \(String\)/,
			"public typealias PersistentFileLogFilter = @Sendable (String)"
		);
		content = content.replace(
			/public typealias PersistentFileLogCompletionHandler = \(Error\?\)/,
			"public typealias PersistentFileLogCompletionHandler = @Sendable (Error?)"
		);
		swiftConcurrencyPatchCount++;
		changed = true;
	}

	if (file.endsWith("DynamicSwiftUIViewType.swift")) {
		if (!content.includes("class ResultBox")) {
			content =
				`private final class ResultBox: @unchecked Sendable {\n  var value: Any?\n  init(_ value: Any? = nil) { self.value = value }\n}\n` +
				content;
		}
		const fullCastFunc = `func cast<ValueType>(_ value: ValueType, appContext: AppContext) throws -> Any {
    guard let viewTag = value as? Int else {
      throw InvalidViewTagException()
    }
    let box = ResultBox()
    try performSynchronouslyOnMainThread {
      try MainActor.assumeIsolated {
        if let view = appContext.findView(withTag: viewTag, ofType: ExpoSwiftUI.SwiftUIVirtualView<ViewType.Props, ViewType>.self) {
          box.value = view.contentView
          return
        }
        if let view = appContext.findView(withTag: viewTag, ofType: ExpoSwiftUI.SwiftUIVirtualViewDev<ViewType.Props, ViewType>.self) {
          box.value = view.contentView
          return
        }
        // For wrapper types
        // e.g. ExpoUIView(SecureFieldView.self)
        if let provider = appContext.findView(withTag: viewTag, ofType: ExpoSwiftUI.ViewWrapper.self),
           let innerView = provider.getWrappedView() as? ViewType {
          box.value = innerView
          return
        }
        // For views using WithHostingView protocol.
        // e.g. View(HostView.self) where HostView conforms to WithHostingView
        guard let view = appContext.findView(withTag: viewTag, ofType: AnyExpoSwiftUIHostingView.self) else {
          throw Exceptions.SwiftUIViewNotFound((tag: viewTag, type: innerType.self))
        }
        box.value = view.getContentView()
      }
    }
    guard let result = box.value else {
      throw Exceptions.SwiftUIViewNotFound((tag: viewTag, type: innerType.self))
    }
    return result
  }`;

		const castFuncRegex =
			/func cast<ValueType>\(.*?appContext: AppContext\) throws -> Any \{[\s\S]*?(return result\}|return result\s*\}|return view\.getContentView\(\)\s*\}[\s\S]*?\n  \})/;

		if (
			content.includes(
				"performSynchronouslyOnMainThread"
			) ||
			content.includes("MainActor.assumeIsolated")
		) {
			content = content.replace(
				castFuncRegex,
				fullCastFunc
			);
			swiftConcurrencyPatchCount++;
			changed = true;
		}
	}

	if (file.endsWith("DynamicConvertibleType.swift")) {
		if (!content.includes("ConvertBox")) {
			content =
				`private final class ConvertBox<T>: @unchecked Sendable {\n  let value: T\n  init(_ value: T) { self.value = value }\n}\n` +
				content;
			content = content.replace(
				/if let value = value as\? any Record \{\s*return try JavaScriptActor\.assumeIsolated \{\s*try value\.toObject\(appContext: appContext\)\.asValue\(\)\s*\}\s*\}/,
				`if let value = value as? any Record {
      let box = ConvertBox(value)
      return try JavaScriptActor.assumeIsolated {
        try box.value.toObject(appContext: appContext).asValue()
      }
    }`
			);
			content = content.replace(
				/if let value = value as\? any RecordObjectConvertible \{\s*return try JavaScriptActor\.assumeIsolated \{\s*try value\.toObject\(appContext: appContext\)\.asValue\(\)\s*\}\s*\}/,
				`if let value = value as? any RecordObjectConvertible {
      let box = ConvertBox(value)
      return try JavaScriptActor.assumeIsolated {
        try box.value.toObject(appContext: appContext).asValue()
      }
    }`
			);
			swiftConcurrencyPatchCount++;
			changed = true;
		}
	}

	if (file.endsWith("DynamicRawType.swift")) {
		if (!content.includes("BuilderBox")) {
			content =
				`private final class BuilderBox<T>: @unchecked Sendable {\n  let value: T\n  init(_ value: T) { self.value = value }\n}\n` +
				content;
			content = content.replace(
				/if let objectBuilder = result as\? JavaScriptObjectBuilder \{\s*return try JavaScriptActor\.assumeIsolated \{\s*return try objectBuilder\.build\(appContext: appContext\)\.asValue\(\)\s*\}\s*\}/,
				`if let objectBuilder = result as? JavaScriptObjectBuilder {
      let box = BuilderBox(objectBuilder)
      return try JavaScriptActor.assumeIsolated {
        return try box.value.build(appContext: appContext).asValue()
      }
    }`
			);
			swiftConcurrencyPatchCount++;
			changed = true;
		}
	}

	if (file.endsWith("EventEmitter.swift")) {
		if (!content.includes("WeakEmitterBox")) {
			content =
				`private final class WeakEmitterBox: @unchecked Sendable {\n  weak var value: EventEmitter?\n  init(_ value: EventEmitter?) { self.value = value }\n}\n` +
				content;
			content = content.replace(
				/nonisolated\(unsafe\) weak var emitter = self\s*runtime\.schedule \{\s*guard let emitter else \{/,
				`let emitterBox = WeakEmitterBox(self)

    runtime.schedule {
      guard let emitter = emitterBox.value else {`
			);
			content = content.replace(
				/nonisolated\(unsafe\) weak var emitter = self\s*runtime\.schedule \{ \[weak appContext\] in\s*guard let emitter, let appContext else \{/,
				`let emitterBox = WeakEmitterBox(self)

    runtime.schedule { [weak appContext] in
      guard let emitter = emitterBox.value, let appContext else {`
			);
			swiftConcurrencyPatchCount++;
			changed = true;
		}
	}

	if (file.endsWith("ExpoReactDelegate.swift")) {
		content = content.replace(
			/\?\? UIViewController\(\)/,
			"?? MainActor.assumeIsolated { UIViewController() }"
		);
		swiftConcurrencyPatchCount++;
		changed = true;
	}

	if (file.endsWith("SwiftUIViewFrameObserver.swift")) {
		content = content.replace(
			/callback\(CGRect\(origin: view\.frame\.origin, size: newValue\.size\)\)/,
			"let origin = MainActor.assumeIsolated { view.frame.origin }\n        callback(CGRect(origin: origin, size: newValue.size))"
		);
		swiftConcurrencyPatchCount++;
		changed = true;
	}

	if (file.endsWith("ExpoSwiftUI.swift")) {
		content = content.replace(
			/public protocol ViewWrapper \{/,
			"@MainActor public protocol ViewWrapper {"
		);
		swiftConcurrencyPatchCount++;
		changed = true;
	}

	if (file.endsWith("SwiftUIHostingView.swift")) {
		content = content.replace(
			/internal protocol AnyExpoSwiftUIHostingView \{/,
			"@MainActor internal protocol AnyExpoSwiftUIHostingView {"
		);
		if (
			content.includes(
				"@MainActor AnyExpoSwiftUIHostingView"
			)
		) {
			content = content.replace(
				": ExpoView, @MainActor AnyExpoSwiftUIHostingView",
				": ExpoView, AnyExpoSwiftUIHostingView"
			);
			content = content.replace(
				"public final class HostingView<",
				"@MainActor public final class HostingView<"
			);
			swiftConcurrencyPatchCount++;
			changed = true;
		}
	}

	if (
		file.endsWith(
			"URLAuthenticationChallengeForwardSender.swift"
		)
	) {
		if (!content.includes("@unchecked Sendable")) {
			content = content.replace(
				/class URLAuthenticationChallengeForwardSender:\s*NSObject,\s*URLAuthenticationChallengeSender\b/,
				"class URLAuthenticationChallengeForwardSender: NSObject, URLAuthenticationChallengeSender, @unchecked Sendable"
			);
			sendableClassCount++;
			changed = true;
		}
		if (
			!content.includes(
				"nonisolated(unsafe) let completionHandler"
			)
		) {
			content = content.replace(
				/((nonisolated\(unsafe\)\s*)?let completionHandler:\s*)(@Sendable\s*)?(\(URLSession\.AuthChallengeDisposition)/,
				"nonisolated(unsafe) let completionHandler: $4"
			);
			changed = true;
		}
	}

	if (file.endsWith("URLSessionSessionDelegateProxy.swift")) {
		if (!content.includes("@unchecked Sendable")) {
			content = content.replace(
				/class URLSessionSessionDelegateProxy:\s*NSObject,\s*URLSessionDataDelegate\b/,
				"class URLSessionSessionDelegateProxy: NSObject, URLSessionDataDelegate, @unchecked Sendable"
			);
			sendableClassCount++;
			changed = true;
		}
	}

	if (file.endsWith("SwiftUIVirtualView.swift")) {
		if (content.includes("@MainActor ExpoSwiftUIView")) {
			content = content.replace(
				": SwiftUIVirtualViewObjC, @MainActor ExpoSwiftUIView",
				": SwiftUIVirtualViewObjC, ExpoSwiftUIView"
			);
			content = content.replace(
				": SwiftUIVirtualViewObjCDev, @MainActor ExpoSwiftUIView",
				": SwiftUIVirtualViewObjCDev, ExpoSwiftUIView"
			);
			content = content.replace(
				"final class SwiftUIVirtualView<",
				"@MainActor final class SwiftUIVirtualView<"
			);
			content = content.replace(
				"final class SwiftUIVirtualViewDev<",
				"@MainActor final class SwiftUIVirtualViewDev<"
			);
			content = content.replace(
				/extension ExpoSwiftUI\.SwiftUIVirtualView:\s*@MainActor\s+ExpoSwiftUI\.ViewWrapper/g,
				"@MainActor extension ExpoSwiftUI.SwiftUIVirtualView: ExpoSwiftUI.ViewWrapper"
			);
			content = content.replace(
				/extension ExpoSwiftUI\.SwiftUIVirtualViewDev:\s*@MainActor\s+ExpoSwiftUI\.ViewWrapper/g,
				"@MainActor extension ExpoSwiftUI.SwiftUIVirtualViewDev: ExpoSwiftUI.ViewWrapper"
			);
			swiftConcurrencyPatchCount++;
			changed = true;
		}
	}

	if (file.endsWith("ViewDefinition.swift")) {
		content = content.replace(
			/extension UIView:\s*@MainActor\s+AnyArgument/,
			"@MainActor extension UIView: AnyArgument"
		);
		swiftConcurrencyPatchCount++;
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
		const getterBlockRegex =
			/func getter\(\s*context: UnsafeMutableRawPointer,\s*propertyName: UnsafePointer<CChar>,\s*resultPtr: UnsafeMutablePointer<facebook\.jsi\.Value>\s*\) -> Bool \{[\s\S]*?return withGuaranteedContext\(context\) \{ \(context: HostObjectContext, runtime\) in[\s\S]*?try context\.get\(propertyName\)\.writeJSIValue\(to: [^\)]+\)[\s\S]*?\}\s*\}\s*\}\s*\}/;

		const fullGetterBlock = `func getter(
      context: UnsafeMutableRawPointer,
      propertyName: UnsafePointer<CChar>,
      resultPtr: UnsafeMutablePointer<facebook.jsi.Value>
    ) -> Bool {
      let propertyName = String(cString: propertyName)
      let resBits = UInt(bitPattern: resultPtr)

      return withGuaranteedContext(context) { (context: HostObjectContext, runtime) in
        return JavaScriptActor.assumeIsolated {
          return forwardingSwiftErrorsToJS(runtime: runtime) {
            let resultPtr = UnsafeMutablePointer<facebook.jsi.Value>(bitPattern: resBits)!
            try context.get(propertyName).writeJSIValue(to: resultPtr)
          }
        }
      }
    }`;

		if (getterBlockRegex.test(content)) {
			content = content.replace(getterBlockRegex, fullGetterBlock);
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

		// 6f-4 & 6f-5: Replace both createFunctionClosure definitions with thread-safe and null-safe implementations.
		// Note: argumentsPtr MUST remain optional (no force-unwrap !) because when a host function
		// is called with 0 arguments, C++ passes nullptr (argsBits == 0). Force-unwrapping nil
		// causes EXC_BREAKPOINT (SIGTRAP) crash on launch.
		const createFuncClosureBlockRegex =
			/private func createFunctionClosure\(\s*runtime: JavaScriptRuntime,\s*name: String\? = nil,\s*_ closure: @escaping JavaScriptRuntime\.SyncFunctionClosure\s*\) -> expo\.HostFunctionClosure \{[\s\S]*?return createHostFunctionClosure\(context, call, deallocate\)\s*\}\s*private func createFunctionClosure\(\s*runtime: JavaScriptRuntime,\s*name: String\? = nil,\s*_ closure: @escaping JavaScriptRuntime\.UnownedThisSyncFunctionClosure\s*\) -> expo\.HostFunctionClosure \{[\s\S]*?return createHostFunctionClosure\(context, call, deallocate\)\s*\}/;

		const fullCreateFuncClosureBlock = `private func createFunctionClosure(
  runtime: JavaScriptRuntime, name: String? = nil, _ closure: @escaping JavaScriptRuntime.SyncFunctionClosure
) -> expo.HostFunctionClosure {
  let context = Unmanaged.passRetained(HostFunctionContext(runtime: runtime, name: name, closure)).toOpaque()

  func call(
    context: UnsafeMutableRawPointer,
    thisPtr: UnsafePointer<facebook.jsi.Value>,
    argumentsPtr: UnsafePointer<facebook.jsi.Value>,
    argumentsCount: Int,
    resultPtr: UnsafeMutablePointer<facebook.jsi.Value>
  ) -> Bool {
    let thisBits = UInt(bitPattern: thisPtr)
    let argsBits = UInt(bitPattern: argumentsPtr)
    let resBits = UInt(bitPattern: resultPtr)

    return withGuaranteedContext(context) { (context: HostFunctionContext, runtime) in
      return JavaScriptActor.assumeIsolated {
        return forwardingSwiftErrorsToJS(runtime: runtime) {
          guard let thisPtr = UnsafePointer<facebook.jsi.Value>(bitPattern: thisBits),
                let resultPtr = UnsafeMutablePointer<facebook.jsi.Value>(bitPattern: resBits) else {
            return
          }
          let argumentsPtr = UnsafePointer<facebook.jsi.Value>(bitPattern: argsBits)
          let this = UnsafeMutablePointer(mutating: thisPtr).move()
          let arguments = JavaScriptValuesBuffer(runtime, start: argumentsPtr, count: argumentsCount)
          let thisValue = JavaScriptValue(runtime, this)
          try context.call(thisValue, consume arguments).writeJSIValue(to: resultPtr)
        }
      }
    }
  }

  func deallocate(context: UnsafeMutableRawPointer) {
    Unmanaged<HostFunctionContext>.fromOpaque(context).release()
  }

  return createHostFunctionClosure(context, call, deallocate)
}

private func createFunctionClosure(
  runtime: JavaScriptRuntime, name: String? = nil,
  _ closure: @escaping JavaScriptRuntime.UnownedThisSyncFunctionClosure
) -> expo.HostFunctionClosure {
  let context = Unmanaged.passRetained(UnownedThisHostFunctionContext(runtime: runtime, name: name, closure)).toOpaque()

  func call(
    context: UnsafeMutableRawPointer,
    thisPtr: UnsafePointer<facebook.jsi.Value>,
    argumentsPtr: UnsafePointer<facebook.jsi.Value>,
    argumentsCount: Int,
    resultPtr: UnsafeMutablePointer<facebook.jsi.Value>
  ) -> Bool {
    let thisBits = UInt(bitPattern: thisPtr)
    let argsBits = UInt(bitPattern: argumentsPtr)
    let resBits = UInt(bitPattern: resultPtr)

    return withGuaranteedContext(context) { (context: UnownedThisHostFunctionContext, runtime) in
      return JavaScriptActor.assumeIsolated {
        return forwardingSwiftErrorsToJS(runtime: runtime) {
          guard let thisPtr = UnsafePointer<facebook.jsi.Value>(bitPattern: thisBits),
                let resultPtr = UnsafeMutablePointer<facebook.jsi.Value>(bitPattern: resBits) else {
            return
          }
          let argumentsPtr = UnsafePointer<facebook.jsi.Value>(bitPattern: argsBits)
          let arguments = JavaScriptValuesBuffer(runtime, start: argumentsPtr, count: argumentsCount)
          let thisValue = JavaScriptUnownedValue(runtime.pointee, thisPtr)
          try context.call(thisValue, consume arguments).writeJSIValue(to: resultPtr)
        }
      }
    }
  }

  func deallocate(context: UnsafeMutableRawPointer) {
    Unmanaged<UnownedThisHostFunctionContext>.fromOpaque(context).release()
  }

  return createHostFunctionClosure(context, call, deallocate)
}`;

		if (createFuncClosureBlockRegex.test(content)) {
			content = content.replace(
				createFuncClosureBlockRegex,
				fullCreateFuncClosureBlock
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
	{
		path: "node_modules/expo-modules-core/ios/Core/SharedObjects/SharedObjectRegistry.swift",
		checks: [
			"public final class SharedObjectRegistry: @unchecked Sendable",
		],
	},
	{
		path: "node_modules/expo-modules-core/ios/Utilities/SceneGeometry.swift",
		checks: ["@MainActor public enum SceneGeometry"],
	},
	{
		path: "node_modules/expo-modules-core/ios/Core/Logging/PersistentFileLog.swift",
		checks: [
			"nonisolated(unsafe) private static let serialQueue = DispatchQueue",
		],
	},
	{
		path: "node_modules/expo-modules-core/ios/Core/Views/SwiftUI/SwiftUIHostingView.swift",
		checks: [
			"@MainActor public final class HostingView<Props: ViewProps, ContentView: View<Props>>: ExpoView, AnyExpoSwiftUIHostingView",
		],
	},
	{
		path: "node_modules/expo-modules-core/ios/Core/DynamicTypes/DynamicSwiftUIViewType.swift",
		checks: [
			"final class ResultBox: @unchecked Sendable",
			"try MainActor.assumeIsolated {",
		],
	},
	{
		path: "node_modules/expo-modules-core/ios/Core/DynamicTypes/DynamicConvertibleType.swift",
		checks: [
			"private final class ConvertBox<T>: @unchecked Sendable",
		],
	},
	{
		path: "node_modules/expo-modules-core/ios/Core/DynamicTypes/DynamicRawType.swift",
		checks: [
			"private final class BuilderBox<T>: @unchecked Sendable",
		],
	},
	{
		path: "node_modules/expo-modules-core/ios/Core/Events/EventEmitter.swift",
		checks: [
			"private final class WeakEmitterBox: @unchecked Sendable",
		],
	},
	{
		path: "node_modules/expo-modules-core/ios/DevTools/URLAuthenticationChallengeForwardSender.swift",
		checks: [
			"class URLAuthenticationChallengeForwardSender: NSObject, URLAuthenticationChallengeSender, @unchecked Sendable",
			"nonisolated(unsafe) let completionHandler: (URLSession.AuthChallengeDisposition",
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
