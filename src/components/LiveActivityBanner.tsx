import React, {
	useState,
	useEffect,
	useRef,
	useMemo,
} from "react";
import {
	StyleSheet,
	Text,
	View,
	TouchableOpacity,
	Animated,
	LayoutAnimation,
	Platform,
	UIManager,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Lesson, LiveActivitySettings } from "../types/schedule";
import { ThemeColors } from "../theme/colors";
import { RADIUS } from "../theme/tokens";
import {
	DayLiveStatus,
	getCurrentDayLiveStatus,
	parseTimeRange,
} from "../utils/timeUtils";

if (
	Platform.OS === "android" &&
	UIManager.setLayoutAnimationEnabledExperimental
) {
	UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface LiveActivityBannerProps {
	lessons: Lesson[];
	isToday: boolean;
	mockDate?: Date | null;
	theme: ThemeColors;
	settings?: LiveActivitySettings;
	onOpenSettings?: () => void;
}

export const LiveActivityBanner: React.FC<
	LiveActivityBannerProps
> = ({
	lessons,
	isToday,
	mockDate,
	theme,
	settings,
	onOpenSettings,
}) => {
	const enabled = settings?.enabled ?? true;
	const styleMode = settings?.style ?? "dynamic_island";
	const showSeconds = settings?.showSeconds ?? true;
	const showProgress = settings?.showProgress ?? true;
	const showNextLesson = settings?.showNextLesson ?? true;

	const [isExpanded, setIsExpanded] = useState(false);
	const [nowTick, setNowTick] = useState(Date.now());

	// Анимация пульсации зеленого/акцентного индикатора «В ЭФИРЕ»
	const pulseAnim = useRef(new Animated.Value(1)).current;
	const pulseOpacity = useRef(new Animated.Value(0.9)).current;

	useEffect(() => {
		const animation = Animated.loop(
			Animated.sequence([
				Animated.parallel([
					Animated.timing(pulseAnim, {
						toValue: 1.35,
						duration: 1100,
						useNativeDriver: true,
					}),
					Animated.timing(pulseOpacity, {
						toValue: 0.35,
						duration: 1100,
						useNativeDriver: true,
					}),
				]),
				Animated.parallel([
					Animated.timing(pulseAnim, {
						toValue: 1.0,
						duration: 1100,
						useNativeDriver: true,
					}),
					Animated.timing(pulseOpacity, {
						toValue: 0.9,
						duration: 1100,
						useNativeDriver: true,
					}),
				]),
			])
		);
		animation.start();
		return () => animation.stop();
	}, [pulseAnim, pulseOpacity]);

	// Секундный таймер обновления для живого отсчета
	useEffect(() => {
		if (!enabled) return;
		const interval = setInterval(() => {
			setNowTick(Date.now());
		}, 1000);
		return () => clearInterval(interval);
	}, [enabled]);

	// Текущий статус дня (пара / перемена / до начала / окончены)
	const liveStatus: DayLiveStatus | null = useMemo(() => {
		if (!isToday && !mockDate) return null;
		return getCurrentDayLiveStatus(
			lessons,
			isToday,
			mockDate
		);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [lessons, isToday, mockDate, Math.floor(nowTick / 1000)]);

	// Точный расчет секунд до окончания текущего события
	const timeDetails = useMemo(() => {
		const refDate = mockDate || new Date();
		const currentMinutes =
			refDate.getHours() * 60 + refDate.getMinutes();
		const currentSecs = refDate.getSeconds();

		if (!liveStatus) return null;

		if (liveStatus.type === "in_lesson") {
			const range = parseTimeRange(liveStatus.lesson.time);
			if (!range) return null;

			const totalSecs =
				(range.endMinutes - range.startMinutes) * 60;
			const passedSecs =
				(currentMinutes - range.startMinutes) * 60 +
				currentSecs;
			const leftSecs = Math.max(0, totalSecs - passedSecs);

			const m = Math.floor(leftSecs / 60);
			const s = leftSecs % 60;
			const progress = Math.min(
				1,
				Math.max(0, passedSecs / totalSecs)
			);

			return {
				phase: "in_lesson" as const,
				label: "ИДЁТ ПАРА",
				timeLeftStr: showSeconds
					? `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
					: `${m} мин`,
				progress,
				startStr:
					liveStatus.lesson.time
						.split(/[-—]/)[0]
						?.trim() || "",
				endStr:
					liveStatus.lesson.time
						.split(/[-—]/)[1]
						?.trim() || "",
				color: "#34C759", // Apple Green
			};
		}

		if (liveStatus.type === "break") {
			const nextRange = parseTimeRange(
				liveStatus.nextLesson.time
			);
			if (!nextRange) return null;

			const totalSecs = liveStatus.breakTotalMinutes * 60;
			const leftSecs = Math.max(
				0,
				(nextRange.startMinutes - currentMinutes) * 60 -
					currentSecs
			);
			const passedSecs = Math.max(0, totalSecs - leftSecs);

			const m = Math.floor(leftSecs / 60);
			const s = leftSecs % 60;
			const progress = Math.min(
				1,
				Math.max(0, passedSecs / totalSecs)
			);

			return {
				phase: "break" as const,
				label: "ПЕРЕМЕНА",
				timeLeftStr: showSeconds
					? `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
					: `${m} мин`,
				progress,
				startStr: "",
				endStr: nextRange.startMinutes
					? `${Math.floor(nextRange.startMinutes / 60)}:${String(nextRange.startMinutes % 60).padStart(2, "0")}`
					: "",
				color: "#FF9500", // Apple Orange
			};
		}

		if (liveStatus.type === "before_start") {
			const firstRange = parseTimeRange(
				liveStatus.firstLesson.time
			);
			if (!firstRange) return null;

			const leftSecs = Math.max(
				0,
				(firstRange.startMinutes - currentMinutes) * 60 -
					currentSecs
			);
			const m = Math.floor(leftSecs / 60);
			const s = leftSecs % 60;

			return {
				phase: "before_start" as const,
				label: "ДО НАЧАЛА ПАР",
				timeLeftStr: showSeconds
					? `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
					: `${m} мин`,
				progress: 0,
				startStr: "",
				endStr:
					liveStatus.firstLesson.time
						.split(/[-—]/)[0]
						?.trim() || "",
				color: "#007AFF", // Apple Blue
			};
		}

		if (liveStatus.type === "day_ended") {
			return {
				phase: "day_ended" as const,
				label: "ОКОНЧЕНЫ",
				timeLeftStr: "Отдых",
				progress: 1,
				startStr: "",
				endStr: "",
				color: "#AF52DE", // Apple Purple
			};
		}

		return null;
	}, [liveStatus, mockDate, nowTick, showSeconds]);

	if (!enabled || !liveStatus || !timeDetails) {
		return null;
	}

	const handleToggleExpand = () => {
		try {
			Haptics.impactAsync(
				Haptics.ImpactFeedbackStyle.Light
			);
		} catch {}
		LayoutAnimation.configureNext(
			LayoutAnimation.Presets.easeInEaseOut
		);
		setIsExpanded(!isExpanded);
	};

	// Поиск следующей пары для превью (Next Up)
	const nextLessonPreview = (() => {
		if (!showNextLesson) return null;
		if (liveStatus.type === "break") {
			return liveStatus.nextLesson;
		}
		if (liveStatus.type === "in_lesson") {
			const currIdx = lessons.findIndex(
				(l) => l.id === liveStatus.lesson.id
			);
			if (currIdx !== -1 && currIdx + 1 < lessons.length) {
				return lessons[currIdx + 1];
			}
		}
		return null;
	})();

	return (
		<View style={styles.outerContainer}>
			<TouchableOpacity
				style={[
					styles.islandCard,
					styleMode === "lock_screen" &&
						styles.lockScreenCard,
					styleMode === "minimal" &&
						styles.minimalCard,
					{
						borderColor: "rgba(255, 255, 255, 0.12)",
						backgroundColor: "#000000",
					},
				]}
				activeOpacity={0.92}
				onPress={handleToggleExpand}
			>
				{/* Верхняя компактная строка (Всегда видна) */}
				<View style={styles.topRow}>
					{/* Левая часть: Живой индикатор + Номер пары / Статус */}
					<View style={styles.leftCol}>
						<View style={styles.liveIndicatorWrap}>
							<Animated.View
								style={[
									styles.pulseDotBackground,
									{
										backgroundColor:
											timeDetails.color,
										transform: [
											{ scale: pulseAnim },
										],
										opacity: pulseOpacity,
									},
								]}
							/>
							<View
								style={[
									styles.pulseDotCore,
									{
										backgroundColor:
											timeDetails.color,
									},
								]}
							/>
						</View>

						<Text
							style={[
								styles.liveTagText,
								{ color: timeDetails.color },
							]}
						>
							{timeDetails.label}
						</Text>

						{liveStatus.type === "in_lesson" && (
							<Text style={styles.pairNumberText}>
								• {liveStatus.lesson.pairIndex}{" "}
								пара
							</Text>
						)}
					</View>

					{/* Правая часть: Таймер обратного отсчёта */}
					<View style={styles.rightCol}>
						<Text
							style={[
								styles.countdownTimerText,
								{ color: timeDetails.color },
							]}
						>
							{timeDetails.timeLeftStr}
						</Text>
						<Ionicons
							name={
								isExpanded
									? "chevron-up"
									: "chevron-down"
							}
							size={14}
							color="#8E8E93"
							style={{ marginLeft: 4 }}
						/>
					</View>
				</View>

				{/* Название текущей пары / перемены в компактном виде */}
				{!isExpanded && (
					<View style={styles.compactSubjectRow}>
						<Text
							style={styles.compactSubjectText}
							numberOfLines={1}
						>
							{liveStatus.type === "in_lesson"
								? liveStatus.lesson.subject
								: liveStatus.type === "break"
									? `До «${liveStatus.nextLesson.subject}»`
									: liveStatus.type ===
										  "before_start"
										? `Первая пара: ${liveStatus.firstLesson.subject}`
										: "Все пары на сегодня завершены"}
						</Text>

						{liveStatus.type === "in_lesson" &&
						liveStatus.lesson.room ? (
							<Text style={styles.compactRoomText}>
								каб. {liveStatus.lesson.room}
							</Text>
						) : null}
					</View>
				)}

				{/* Тонкий прогресс-бар в компактном режиме */}
				{!isExpanded &&
					showProgress &&
					timeDetails.phase !== "day_ended" && (
						<View style={styles.miniProgressTrack}>
							<View
								style={[
									styles.miniProgressBar,
									{
										width: `${Math.round(timeDetails.progress * 100)}%`,
										backgroundColor:
											timeDetails.color,
									},
								]}
							/>
						</View>
					)}

				{/* РАЗВЁРНУТЫЙ ВИД DYNAMIC ISLAND ПО ТАПУ */}
				{isExpanded && (
					<View style={styles.expandedContent}>
						{/* Крупный заголовок предмета */}
						<Text style={styles.expandedTitle}>
							{liveStatus.type === "in_lesson"
								? liveStatus.lesson.subject
								: liveStatus.type === "break"
									? `Перемена перед ${liveStatus.nextLesson.pairIndex} парой`
									: liveStatus.type ===
										  "before_start"
										? `Скоро начнётся ${liveStatus.firstLesson.subject}`
										: "Все занятия завершены 🎉"}
						</Text>

						{/* Кабинет и преподаватель */}
						{(liveStatus.type === "in_lesson" ||
							liveStatus.type === "break") && (
							<View style={styles.expandedMetaRow}>
								{((liveStatus.type ===
									"in_lesson" &&
									liveStatus.lesson.room) ||
									(liveStatus.type ===
										"break" &&
										liveStatus.nextLesson
											.room)) && (
									<View
										style={
											styles.expandedMetaItem
										}
									>
										<Ionicons
											name="location-outline"
											size={14}
											color={
												timeDetails.color
											}
											style={{
												marginRight: 4,
											}}
										/>
										<Text
											style={
												styles.expandedMetaText
											}
										>
											каб.{" "}
											{liveStatus.type ===
											"in_lesson"
												? liveStatus
														.lesson
														.room
												: liveStatus
														.nextLesson
														.room}
										</Text>
									</View>
								)}

								{((liveStatus.type ===
									"in_lesson" &&
									liveStatus.lesson.teacher) ||
									(liveStatus.type ===
										"break" &&
										liveStatus.nextLesson
											.teacher)) && (
									<View
										style={
											styles.expandedMetaItem
										}
									>
										<Ionicons
											name="person-outline"
											size={14}
											color="#8E8E93"
											style={{
												marginRight: 4,
											}}
										/>
										<Text
											style={
												styles.expandedMetaText
											}
										>
											{liveStatus.type ===
											"in_lesson"
												? liveStatus
														.lesson
														.teacher
												: liveStatus
														.nextLesson
														.teacher}
										</Text>
									</View>
								)}
							</View>
						)}

						{/* Полноценная шкала прогресса с временными метками */}
						{showProgress &&
							timeDetails.phase !==
								"day_ended" && (
								<View
									style={
										styles.expandedProgressSection
									}
								>
									<View
										style={
											styles.progressTrack
										}
									>
										<View
											style={[
												styles.progressBar,
												{
													width: `${Math.round(timeDetails.progress * 100)}%`,
													backgroundColor:
														timeDetails.color,
												},
											]}
										/>
									</View>
									<View
										style={
											styles.progressTimeRow
										}
									>
										<Text
											style={
												styles.progressTimeLabel
											}
										>
											{timeDetails.startStr ||
												"Начало"}
										</Text>
										<Text
											style={[
												styles.progressPercentLabel,
												{
													color: timeDetails.color,
												},
											]}
										>
											{Math.round(
												timeDetails.progress *
													100
											)}
											%
										</Text>
										<Text
											style={
												styles.progressTimeLabel
											}
										>
											{timeDetails.endStr ||
												"Звонок"}
										</Text>
									</View>
								</View>
							)}

						{/* Превью следующей пары (Next up) */}
						{nextLessonPreview && (
							<View style={styles.nextUpBox}>
								<View
									style={styles.nextUpHeader}
								>
									<Ionicons
										name="arrow-forward-circle-outline"
										size={14}
										color="#8E8E93"
										style={{
											marginRight: 4,
										}}
									/>
									<Text
										style={
											styles.nextUpLabel
										}
									>
										ДАЛЕЕ В РАСПИСАНИИ
									</Text>
								</View>
								<Text
									style={styles.nextUpTitle}
									numberOfLines={1}
								>
									{nextLessonPreview.pairIndex}{" "}
									пара •{" "}
									{nextLessonPreview.subject}
								</Text>
								{nextLessonPreview.room ? (
									<Text
										style={styles.nextUpSub}
									>
										каб.{" "}
										{nextLessonPreview.room}{" "}
										•{" "}
										{nextLessonPreview.time}
									</Text>
								) : null}
							</View>
						)}

						{/* Нижняя строка: Кнопка быстрых настроек Эфира Активности */}
						{onOpenSettings && (
							<TouchableOpacity
								style={styles.settingsQuickBtn}
								activeOpacity={0.7}
								onPress={onOpenSettings}
							>
								<Ionicons
									name="options-outline"
									size={14}
									color="#8E8E93"
									style={{ marginRight: 5 }}
								/>
								<Text
									style={
										styles.settingsQuickBtnText
									}
								>
									Настроить Эфир Активности
								</Text>
							</TouchableOpacity>
						)}
					</View>
				)}
			</TouchableOpacity>
		</View>
	);
};

const styles = StyleSheet.create({
	outerContainer: {
		paddingHorizontal: 16,
		marginBottom: 10,
		marginTop: 4,
	},
	islandCard: {
		borderRadius: 22,
		paddingHorizontal: 16,
		paddingVertical: 12,
		borderWidth: 1,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.35,
		shadowRadius: 10,
		elevation: 6,
	},
	lockScreenCard: {
		borderRadius: 18,
		paddingVertical: 14,
	},
	minimalCard: {
		borderRadius: 16,
		paddingVertical: 9,
		paddingHorizontal: 14,
	},
	topRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
	},
	leftCol: {
		flexDirection: "row",
		alignItems: "center",
	},
	liveIndicatorWrap: {
		width: 14,
		height: 14,
		alignItems: "center",
		justifyContent: "center",
		marginRight: 8,
	},
	pulseDotBackground: {
		position: "absolute",
		width: 14,
		height: 14,
		borderRadius: 7,
	},
	pulseDotCore: {
		width: 8,
		height: 8,
		borderRadius: 4,
	},
	liveTagText: {
		fontSize: 11,
		fontWeight: "800",
		letterSpacing: 0.6,
		textTransform: "uppercase",
	},
	pairNumberText: {
		fontSize: 12,
		fontWeight: "600",
		color: "#EBEBF5",
		marginLeft: 4,
	},
	rightCol: {
		flexDirection: "row",
		alignItems: "center",
	},
	countdownTimerText: {
		fontSize: 14,
		fontWeight: "700",
		letterSpacing: -0.2,
		fontVariant: ["tabular-nums"],
	},
	compactSubjectRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		marginTop: 5,
	},
	compactSubjectText: {
		fontSize: 14,
		fontWeight: "600",
		color: "#FFFFFF",
		flex: 1,
		marginRight: 8,
	},
	compactRoomText: {
		fontSize: 12,
		fontWeight: "600",
		color: "#8E8E93",
	},
	miniProgressTrack: {
		height: 3,
		backgroundColor: "rgba(255, 255, 255, 0.12)",
		borderRadius: 1.5,
		marginTop: 8,
		overflow: "hidden",
	},
	miniProgressBar: {
		height: "100%",
		borderRadius: 1.5,
	},
	expandedContent: {
		marginTop: 12,
		paddingTop: 10,
		borderTopWidth: StyleSheet.hairlineWidth,
		borderTopColor: "rgba(255, 255, 255, 0.14)",
	},
	expandedTitle: {
		fontSize: 17,
		fontWeight: "700",
		color: "#FFFFFF",
		letterSpacing: -0.3,
		lineHeight: 22,
		marginBottom: 6,
	},
	expandedMetaRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 14,
		marginBottom: 12,
	},
	expandedMetaItem: {
		flexDirection: "row",
		alignItems: "center",
	},
	expandedMetaText: {
		fontSize: 13,
		fontWeight: "500",
		color: "#EBEBF5",
	},
	expandedProgressSection: {
		marginBottom: 12,
	},
	progressTrack: {
		height: 6,
		backgroundColor: "rgba(255, 255, 255, 0.14)",
		borderRadius: 3,
		overflow: "hidden",
	},
	progressBar: {
		height: "100%",
		borderRadius: 3,
	},
	progressTimeRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		marginTop: 4,
	},
	progressTimeLabel: {
		fontSize: 11,
		fontWeight: "500",
		color: "#8E8E93",
	},
	progressPercentLabel: {
		fontSize: 11,
		fontWeight: "700",
	},
	nextUpBox: {
		backgroundColor: "rgba(255, 255, 255, 0.06)",
		borderRadius: 12,
		padding: 10,
		marginBottom: 10,
		borderWidth: StyleSheet.hairlineWidth,
		borderColor: "rgba(255, 255, 255, 0.1)",
	},
	nextUpHeader: {
		flexDirection: "row",
		alignItems: "center",
		marginBottom: 3,
	},
	nextUpLabel: {
		fontSize: 10,
		fontWeight: "700",
		color: "#8E8E93",
		letterSpacing: 0.5,
	},
	nextUpTitle: {
		fontSize: 13,
		fontWeight: "600",
		color: "#FFFFFF",
	},
	nextUpSub: {
		fontSize: 11,
		fontWeight: "500",
		color: "#8E8E93",
		marginTop: 1,
	},
	settingsQuickBtn: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		paddingVertical: 6,
	},
	settingsQuickBtnText: {
		fontSize: 12,
		fontWeight: "600",
		color: "#8E8E93",
	},
});
