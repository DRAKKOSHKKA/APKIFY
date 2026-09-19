import React from "react";
import {
	StyleSheet,
	Text,
	View,
	ScrollView,
	RefreshControl,
	ActivityIndicator,
	TouchableOpacity,
	LayoutAnimation,
	Platform,
	UIManager,
	Share,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
	AppSettings,
	Lesson,
	ScheduleData,
	SearchResultItem,
} from "../types/schedule";
import { ThemeColors } from "../theme/colors";
import {
	formatFullDate,
	getCurrentDayLiveStatus,
} from "../utils/timeUtils";
import * as Haptics from "expo-haptics";

import { Header } from "../components/Header";
import { DaySelector } from "../components/DaySelector";
import { LessonCard } from "../components/LessonCard";
import { EmptyDay } from "../components/EmptyDay";

if (
	Platform.OS === "android" &&
	UIManager.setLayoutAnimationEnabledExperimental
) {
	UIManager.setLayoutAnimationEnabledExperimental(true);
}

import { RADIUS } from "../theme/tokens";

interface ScheduleScreenProps {
	entity: SearchResultItem;
	schedule: ScheduleData | null;
	selectedDayIndex: number;
	selectedWeekId?: string;
	isFav: boolean;
	isLoading: boolean;
	isRefreshing: boolean;
	isOffline: boolean;
	isScheduleUpdated?: boolean;
	mockDate?: Date | null;
	errorMessage: string | null;
	settings: AppSettings;
	theme: ThemeColors;
	onSelectDayIndex: (index: number) => void;
	onOpenSearch: () => void;
	onOpenWeeks: () => void;
	onOpenCalls: () => void;
	onToggleFav: () => void;
	onRefresh: () => void;
	onRetry: () => void;
	onDismissUpdateNotice?: () => void;
	onResetMockTime?: () => void;
}

export const ScheduleScreen: React.FC<ScheduleScreenProps> = ({
	entity,
	schedule,
	selectedDayIndex,
	isLoading,
	isRefreshing,
	isOffline,
	isScheduleUpdated = false,
	mockDate = null,
	errorMessage,
	settings,
	theme,
	onSelectDayIndex,
	onOpenSearch,
	onOpenWeeks,
	onOpenCalls,
	onRefresh,
	onRetry,
	onDismissUpdateNotice,
	onResetMockTime,
}) => {
	const selectedDay = schedule?.days[selectedDayIndex];

	// Индекс сегодняшнего дня
	const todayIndex = schedule?.days
		? schedule.days.findIndex((d, idx) =>
				mockDate
					? (mockDate.getDay() === 0
							? 0
							: mockDate.getDay() - 1) === idx
					: d.isToday
			)
		: -1;

	const isDayCurrentlyToday = mockDate
		? (mockDate.getDay() === 0
				? 0
				: mockDate.getDay() - 1) === selectedDayIndex
		: selectedDay
			? selectedDay.isToday
			: false;

	const isSaturday = selectedDay
		? selectedDay.dayName.toLowerCase().includes("суббот") ||
			selectedDayIndex === 5
		: false;

	// Анимация при переключении дня
	const handleSelectDay = (idx: number) => {
		LayoutAnimation.configureNext(
			LayoutAnimation.Presets.easeInEaseOut
		);
		onSelectDayIndex(idx);
	};

	// Фильтрация по подгруппе
	const filterLessons = (lessons: Lesson[]): Lesson[] => {
		if (settings.subgroup === "all") return lessons;
		return lessons.filter((l) => {
			const g = l.group.toLowerCase();
			if (!g.includes("подгруппа") && !g.includes("п/г"))
				return true;
			if (
				settings.subgroup === "1" &&
				(g.includes("1") ||
					g.includes("1-я") ||
					g.includes("1 подгруппа"))
			)
				return true;
			if (
				settings.subgroup === "2" &&
				(g.includes("2") ||
					g.includes("2-я") ||
					g.includes("2 подгруппа"))
			)
				return true;
			return false;
		});
	};

	const displayedLessons = selectedDay
		? filterLessons(selectedDay.lessons)
		: [];

	const liveStatus = getCurrentDayLiveStatus(
		displayedLessons,
		isDayCurrentlyToday,
		mockDate
	);

	const firstLesson =
		displayedLessons.length > 0 ? displayedLessons[0] : null;
	const firstPairNum = firstLesson ? firstLesson.pairIndex : 1;
	const firstStartTime = firstLesson
		? firstLesson.time.split(/[-—]/)[0].trim()
		: "";

	// Единая функция для отправки всего расписания на выбранный день
	const handleShareDaySchedule = async () => {
		if (!selectedDay) return;
		try {
			Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
			const fullDate = formatFullDate(
				selectedDay.dayDate,
				selectedDay.dayName
			);
			const weekText = schedule?.currentWeekNum
				? `${schedule.currentWeekNum}-я неделя`
				: "";
			const subgroupText =
				settings.subgroup !== "all"
					? ` (${settings.subgroup}-я подгруппа)`
					: "";

			const lines = [
				`🏛 Альметьевский профессиональный колледж`,
				`📅 ${fullDate}${weekText ? ` • ${weekText}` : ""}`,
				`👤 ${entity.SearchContent}${subgroupText}`,
				`━━━━━━━━━━━━━━━━━━━━`,
			];

			if (displayedLessons.length === 0) {
				lines.push(`🎉 В этот день занятий нет!`);
			} else {
				displayedLessons.forEach((l) => {
					lines.push(
						`🔔 ${l.pairIndex} пара (${l.time})\n📚 ${l.subject}`
					);
					const meta: string[] = [];
					if (l.room) {
						meta.push(
							l.room.toLowerCase().startsWith("каб")
								? l.room
								: `каб. ${l.room}`
						);
					}
					if (l.teacher) {
						meta.push(l.teacher);
					}
					if (meta.length > 0) {
						lines.push(`📍 ${meta.join(" • ")}`);
					}
					lines.push("");
				});
			}

			await Share.share({
				message: lines.join("\n").trim(),
			});
		} catch (err) {
			console.warn("Ошибка отправки расписания:", err);
		}
	};

	return (
		<View
			style={[
				styles.container,
				{ backgroundColor: theme.background },
			]}
		>
			{/* Лаконичная шапка */}
			<Header
				entity={entity}
				weekNum={schedule?.currentWeekNum || ""}
				theme={theme}
				onOpenSearch={onOpenSearch}
				onOpenWeeks={onOpenWeeks}
				onOpenCalls={onOpenCalls}
			/>

			{/* Уведомление об обновлении расписания */}
			{isScheduleUpdated && (
				<View
					style={[
						styles.updatedBanner,
						{
							backgroundColor: theme.accentSubtle,
							borderColor: theme.accent,
						},
					]}
				>
					<Ionicons
						name="checkmark-circle"
						size={15}
						color={theme.accent}
						style={{ marginRight: 6 }}
					/>
					<Text
						style={[
							styles.updatedBannerText,
							{ color: theme.accent },
						]}
					>
						Расписание обновилось
					</Text>
					{onDismissUpdateNotice && (
						<TouchableOpacity
							onPress={onDismissUpdateNotice}
							hitSlop={{
								top: 8,
								bottom: 8,
								left: 8,
								right: 8,
							}}
							style={{ marginLeft: 8 }}
						>
							<Ionicons
								name="close"
								size={15}
								color={theme.accent}
							/>
						</TouchableOpacity>
					)}
				</View>
			)}

			{/* Баннер активной симуляции времени */}
			{mockDate && (
				<View
					style={[
						styles.timeTravelBanner,
						{
							backgroundColor: theme.isDark
								? "rgba(255, 159, 10, 0.16)"
								: "#FFF8E6",
							borderColor: theme.warning,
						},
					]}
				>
					<View style={styles.timeTravelInfo}>
						<Ionicons
							name="time"
							size={15}
							color={theme.warning}
							style={{ marginRight: 6 }}
						/>
						<Text
							style={[
								styles.timeTravelText,
								{ color: theme.warning },
							]}
						>
							Симуляция:{" "}
							{mockDate.toLocaleDateString(
								"ru-RU",
								{
									weekday: "short",
									day: "numeric",
									month: "short",
								}
							)}
							,{" "}
							{mockDate.toLocaleTimeString(
								"ru-RU",
								{
									hour: "2-digit",
									minute: "2-digit",
								}
							)}
						</Text>
					</View>
					{onResetMockTime && (
						<TouchableOpacity
							style={[
								styles.timeTravelResetBtn,
								{
									backgroundColor:
										theme.warning,
								},
							]}
							onPress={onResetMockTime}
						>
							<Text
								style={
									styles.timeTravelResetText
								}
							>
								Сброс
							</Text>
						</TouchableOpacity>
					)}
				</View>
			)}

			{/* Полоска дней */}
			{schedule?.days && schedule.days.length > 0 && (
				<DaySelector
					days={schedule.days}
					selectedIndex={selectedDayIndex}
					theme={theme}
					mockDate={mockDate}
					onSelectIndex={handleSelectDay}
				/>
			)}

			{/* Спокойное уведомление об офлайн-режиме (если сети нет) */}
			{isOffline && (
				<View style={styles.offlineNotice}>
					<Text
						style={[
							styles.offlineText,
							{ color: theme.textSecondary },
						]}
					>
						Офлайн-копия
					</Text>
				</View>
			)}

			{/* Список пар */}
			<ScrollView
				style={styles.scroll}
				contentContainerStyle={styles.scrollContent}
				showsVerticalScrollIndicator={false}
				refreshControl={
					<RefreshControl
						refreshing={isRefreshing}
						onRefresh={onRefresh}
						tintColor={theme.accent}
					/>
				}
			>
				{errorMessage && !schedule ? (
					<View style={styles.centerBox}>
						<Ionicons
							name="cloud-offline-outline"
							size={48}
							color={theme.textSecondary}
						/>
						<Text
							style={[
								styles.errorTitle,
								{ color: theme.text },
							]}
						>
							Нет связи с сервером
						</Text>
						<Text
							style={[
								styles.errorSubtitle,
								{ color: theme.textSecondary },
							]}
						>
							{errorMessage}
						</Text>
						<TouchableOpacity
							style={[
								styles.retryBtn,
								{
									backgroundColor:
										theme.accent,
								},
							]}
							onPress={onRetry}
						>
							<Text style={styles.retryBtnText}>
								Повторить
							</Text>
						</TouchableOpacity>
					</View>
				) : selectedDay ? (
					<View>
						{/* Дата выбранного дня */}
						<View style={styles.dayHeader}>
							<View style={styles.dayHeaderLeft}>
								<Text
									style={[
										styles.dayTitle,
										{ color: theme.text },
									]}
								>
									{formatFullDate(
										selectedDay.dayDate,
										selectedDay.dayName
									)}
								</Text>
								{settings.subgroup !== "all" && (
									<Text
										style={[
											styles.subgroupNotice,
											{
												color: theme.textSecondary,
											},
										]}
									>
										{settings.subgroup}-я
										подгруппа
									</Text>
								)}
							</View>

							<View style={styles.dayHeaderActions}>
								{selectedDayIndex !== todayIndex &&
									todayIndex !== -1 && (
										<TouchableOpacity
											style={[
												styles.todayJumpBtn,
												{
													backgroundColor:
														theme.accentSubtle,
												},
											]}
											activeOpacity={0.7}
											onPress={() => {
												try {
													Haptics.impactAsync(
														Haptics
															.ImpactFeedbackStyle
															.Light
													);
												} catch {}
												handleSelectDay(
													todayIndex
												);
											}}
										>
											<Ionicons
												name="arrow-undo"
												size={12}
												color={theme.accent}
												style={{
													marginRight: 4,
												}}
											/>
											<Text
												style={[
													styles.todayJumpText,
													{
														color: theme.accent,
													},
												]}
											>
												Сегодня
											</Text>
										</TouchableOpacity>
									)}

								{/* Единая кнопка Поделиться расписанием дня */}
								<TouchableOpacity
									style={[
										styles.shareDayBtn,
										{
											backgroundColor:
												theme.chipBackground,
										},
									]}
									activeOpacity={0.7}
									onPress={handleShareDaySchedule}
									accessibilityLabel="Поделиться расписанием на день"
								>
									<Ionicons
										name="share-outline"
										size={14}
										color={theme.accent}
										style={{ marginRight: 5 }}
									/>
									<Text
										style={[
											styles.shareDayBtnText,
											{
												color: theme.text,
											},
										]}
									>
										Поделиться
									</Text>
								</TouchableOpacity>
							</View>
						</View>

						{/* Специальный субботний баннер */}
						{isSaturday && (
							<TouchableOpacity
								style={[
									styles.saturdayBanner,
									{
										backgroundColor:
											theme.isDark
												? "rgba(10, 132, 255, 0.12)"
												: "rgba(0, 122, 255, 0.08)",
										borderColor:
											theme.accent,
									},
								]}
								activeOpacity={0.75}
								onPress={() => {
									try {
										Haptics.impactAsync(
											Haptics
												.ImpactFeedbackStyle
												.Light
										);
									} catch {}
									onOpenCalls?.();
								}}
							>
								<View
									style={
										styles.saturdayBannerLeft
									}
								>
									<Ionicons
										name="time-outline"
										size={20}
										color={theme.accent}
										style={{
											marginRight: 8,
										}}
									/>
									<View style={{ flex: 1 }}>
										<Text
											style={[
												styles.saturdayBannerTitle,
												{
													color: theme.accent,
												},
											]}
										>
											Суббота • Пары по 60
											минут
										</Text>
										<Text
											style={[
												styles.saturdayBannerSubtitle,
												{
													color: theme.textSecondary,
												},
											]}
										>
											08:00 — 14:35
											(перемены 5-15 мин)
										</Text>
									</View>
								</View>
								<View
									style={[
										styles.saturdayBannerBtn,
										{
											backgroundColor:
												theme.accent,
										},
									]}
								>
									<Text
										style={
											styles.saturdayBannerBtnText
										}
									>
										Звонки
									</Text>
									<Ionicons
										name="chevron-forward"
										size={12}
										color="#FFFFFF"
									/>
								</View>
							</TouchableOpacity>
						)}

						{/* Живой трекер текущей пары / перемены */}
						{liveStatus && (
							<View
								style={
									styles.liveWidgetContainer
								}
							>
								{liveStatus.type ===
									"in_lesson" && (
									<View
										style={[
											styles.liveCard,
											{
												backgroundColor:
													theme.isDark
														? "#092412"
														: "#EBF9EE",
												borderColor:
													theme.success,
											},
										]}
									>
										<View
											style={
												styles.liveCardHeader
											}
										>
											<View
												style={
													styles.liveCardBadge
												}
											>
												<View
													style={[
														styles.pulseDot,
														{
															backgroundColor:
																theme.success,
														},
													]}
												/>
												<Text
													style={[
														styles.liveCardBadgeText,
														{
															color: theme.success,
														},
													]}
												>
													ИДЁТ{" "}
													{
														liveStatus
															.lesson
															.pairIndex
													}{" "}
													ПАРА
												</Text>
											</View>
											<Text
												style={[
													styles.liveCardCountdown,
													{
														color: theme.success,
													},
												]}
											>
												ост.{" "}
												{
													liveStatus.leftMinutes
												}{" "}
												мин
											</Text>
										</View>

										<Text
											style={[
												styles.liveSubject,
												{
													color: theme.text,
												},
											]}
											numberOfLines={1}
										>
											{
												liveStatus.lesson
													.subject
											}
										</Text>

										<View
											style={
												styles.liveMetaRow
											}
										>
											{liveStatus.lesson
												.room ? (
												<Text
													style={[
														styles.liveMetaText,
														{
															color: theme.textSecondary,
														},
													]}
												>
													📍{" "}
													{liveStatus.lesson.room
														.toLowerCase()
														.startsWith(
															"каб"
														)
														? liveStatus
																.lesson
																.room
														: `каб. ${liveStatus.lesson.room}`}
												</Text>
											) : null}
											{liveStatus.lesson
												.teacher ? (
												<Text
													style={[
														styles.liveMetaText,
														{
															color: theme.textSecondary,
														},
													]}
												>
													👤{" "}
													{
														liveStatus
															.lesson
															.teacher
													}
												</Text>
											) : null}
										</View>

										{/* Прогресс пары */}
										<View
											style={[
												styles.progressBarTrack,
												{
													backgroundColor:
														theme.isDark
															? "rgba(255, 255, 255, 0.12)"
															: "rgba(0, 0, 0, 0.08)",
												},
											]}
										>
											<View
												style={[
													styles.progressBarFill,
													{
														backgroundColor:
															theme.success,
														width: `${Math.round(liveStatus.progress * 100)}%`,
													},
												]}
											/>
										</View>
									</View>
								)}

								{liveStatus.type === "break" && (
									<View
										style={[
											styles.liveCard,
											{
												backgroundColor:
													theme.isDark
														? "#281D06"
														: "#FFF8EB",
												borderColor:
													theme.warning,
											},
										]}
									>
										<View
											style={
												styles.liveCardHeader
											}
										>
											<View
												style={
													styles.liveCardBadge
												}
											>
												<Ionicons
													name="cafe"
													size={14}
													color={
														theme.warning
													}
													style={{
														marginRight: 6,
													}}
												/>
												<Text
													style={[
														styles.liveCardBadgeText,
														{
															color: theme.warning,
														},
													]}
												>
													ПЕРЕМЕНА
												</Text>
											</View>
											<Text
												style={[
													styles.liveCardCountdown,
													{
														color: theme.warning,
													},
												]}
											>
												до звонка{" "}
												{
													liveStatus.breakLeftMinutes
												}{" "}
												мин
											</Text>
										</View>

										<Text
											style={[
												styles.liveSubject,
												{
													color: theme.text,
												},
											]}
											numberOfLines={1}
										>
											Далее:{" "}
											{
												liveStatus
													.nextLesson
													.pairIndex
											}{" "}
											пара —{" "}
											{
												liveStatus
													.nextLesson
													.subject
											}
										</Text>

										{liveStatus.nextLesson
											.room ? (
											<Text
												style={[
													styles.liveMetaText,
													{
														color: theme.textSecondary,
													},
												]}
											>
												📍{" "}
												{liveStatus.nextLesson.room
													.toLowerCase()
													.startsWith(
														"каб"
													)
													? liveStatus
															.nextLesson
															.room
													: `каб. ${liveStatus.nextLesson.room}`}
											</Text>
										) : null}
									</View>
								)}

								{liveStatus.type ===
									"before_start" && (
									<View
										style={[
											styles.liveCard,
											{
												backgroundColor:
													theme.isDark
														? "#0A1D30"
														: "#EDF5FF",
												borderColor:
													theme.accent,
											},
										]}
									>
										<View
											style={
												styles.liveCardHeader
											}
										>
											<View
												style={
													styles.liveCardBadge
												}
											>
												<Ionicons
													name="time"
													size={14}
													color={
														theme.accent
													}
													style={{
														marginRight: 6,
													}}
												/>
												<Text
													style={[
														styles.liveCardBadgeText,
														{
															color: theme.accent,
														},
													]}
												>
													СКОРО НАЧАЛО
												</Text>
											</View>
											<Text
												style={[
													styles.liveCardCountdown,
													{
														color: theme.accent,
													},
												]}
											>
												через{" "}
												{
													liveStatus.minutesUntilStart
												}{" "}
												мин
											</Text>
										</View>

										<Text
											style={[
												styles.liveSubject,
												{
													color: theme.text,
												},
											]}
											numberOfLines={1}
										>
											1-я пара:{" "}
											{
												liveStatus
													.firstLesson
													.subject
											}
										</Text>

										{liveStatus.firstLesson
											.room ? (
											<Text
												style={[
													styles.liveMetaText,
													{
														color: theme.textSecondary,
													},
												]}
											>
												📍{" "}
												{liveStatus.firstLesson.room
													.toLowerCase()
													.startsWith(
														"каб"
													)
													? liveStatus
															.firstLesson
															.room
													: `каб. ${liveStatus.firstLesson.room}`}
											</Text>
										) : null}
									</View>
								)}

								{liveStatus.type ===
									"day_ended" && (
									<View
										style={[
											styles.liveCardMini,
											{
												backgroundColor:
													theme.isDark
														? "rgba(52, 199, 89, 0.12)"
														: "rgba(52, 199, 89, 0.10)",
												borderColor:
													theme.success,
											},
										]}
									>
										<Ionicons
											name="checkmark-circle"
											size={16}
											color={theme.success}
											style={{
												marginRight: 8,
											}}
										/>
										<Text
											style={[
												styles.liveEndedText,
												{
													color: theme.success,
												},
											]}
										>
											Все пары на сегодня
											закончились! Хорошего
											отдыха 🎉
										</Text>
									</View>
								)}
							</View>
						)}

						{/* Уведомление серым текстом: если нужно прийти к n-й паре */}
						{firstPairNum > 1 && (
							<View style={styles.lateStartRow}>
								<Ionicons
									name="alarm-outline"
									size={14}
									color={theme.textSecondary}
									style={{ marginRight: 6 }}
								/>
								<Text
									style={[
										styles.lateStartText,
										{
											color: theme.textSecondary,
										},
									]}
								>
									Первой пары нет — ко{" "}
									{firstPairNum}-й паре (к{" "}
									{firstStartTime})
								</Text>
							</View>
						)}

						{/* Карточки занятий */}
						{displayedLessons.length > 0 ? (
							displayedLessons.map((lesson) => {
								const isDayCurrentlyToday =
									mockDate
										? (mockDate.getDay() ===
											0
												? 0
												: mockDate.getDay() -
													1) ===
											selectedDayIndex
										: selectedDay.isToday;

								return (
									<LessonCard
										key={lesson.id}
										lesson={lesson}
										isToday={
											isDayCurrentlyToday
										}
										theme={theme}
										glassEffect={
											settings.glassEffect
										}
										mockDate={mockDate}
									/>
								);
							})
						) : (
							<EmptyDay
								dayName={selectedDay.dayName}
								dayDate={selectedDay.dayDate}
								theme={theme}
							/>
						)}
					</View>
				) : isLoading ? (
					<View style={styles.centerBox}>
						<ActivityIndicator
							size="small"
							color={theme.accent}
						/>
					</View>
				) : null}
			</ScrollView>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	scroll: {
		flex: 1,
	},
	scrollContent: {
		paddingTop: 8,
		paddingBottom: 110,
	},
	offlineNotice: {
		alignItems: "center",
		paddingVertical: 4,
	},
	offlineText: {
		fontSize: 11,
		fontWeight: "500",
	},
	dayHeader: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingHorizontal: 20,
		marginBottom: 12,
		marginTop: 6,
	},
	dayHeaderLeft: {
		flexDirection: "row",
		alignItems: "baseline",
		gap: 8,
	},
	todayJumpBtn: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 9,
		paddingVertical: 4,
		borderRadius: 12,
	},
	todayJumpText: {
		fontSize: 12,
		fontWeight: "700",
	},
	dayHeaderActions: {
		flexDirection: "row",
		alignItems: "center",
		gap: 6,
	},
	shareDayBtn: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 10,
		paddingVertical: 5,
		borderRadius: 12,
	},
	shareDayBtnText: {
		fontSize: 12,
		fontWeight: "600",
	},
	dayTitle: {
		fontSize: 18,
		fontWeight: "700",
		letterSpacing: -0.3,
	},
	saturdayBanner: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		marginHorizontal: 18,
		marginBottom: 12,
		paddingVertical: 10,
		paddingHorizontal: 14,
		borderRadius: RADIUS.card,
		borderWidth: 1,
	},
	saturdayBannerLeft: {
		flexDirection: "row",
		alignItems: "center",
		flex: 1,
		marginRight: 10,
	},
	saturdayBannerTitle: {
		fontSize: 14,
		fontWeight: "700",
		letterSpacing: -0.2,
	},
	saturdayBannerSubtitle: {
		fontSize: 12,
		fontWeight: "500",
		marginTop: 1,
	},
	saturdayBannerBtn: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 10,
		paddingVertical: 6,
		borderRadius: 12,
		gap: 2,
	},
	saturdayBannerBtnText: {
		fontSize: 12,
		fontWeight: "700",
		color: "#FFFFFF",
	},
	liveWidgetContainer: {
		marginHorizontal: 18,
		marginBottom: 14,
	},
	liveCard: {
		padding: 14,
		borderRadius: RADIUS.card,
		borderWidth: 1,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.05,
		shadowRadius: 6,
		elevation: 2,
	},
	liveCardMini: {
		flexDirection: "row",
		alignItems: "center",
		paddingVertical: 10,
		paddingHorizontal: 14,
		borderRadius: RADIUS.card,
		borderWidth: 1,
	},
	liveCardHeader: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		marginBottom: 6,
	},
	liveCardBadge: {
		flexDirection: "row",
		alignItems: "center",
	},
	pulseDot: {
		width: 6,
		height: 6,
		borderRadius: 3,
		marginRight: 6,
	},
	liveCardBadgeText: {
		fontSize: 11,
		fontWeight: "800",
		letterSpacing: 0.5,
	},
	liveCardCountdown: {
		fontSize: 13,
		fontWeight: "700",
	},
	liveSubject: {
		fontSize: 15,
		fontWeight: "700",
		marginBottom: 4,
	},
	liveMetaRow: {
		flexDirection: "row",
		flexWrap: "wrap",
		alignItems: "center",
		gap: 10,
		marginBottom: 8,
	},
	liveMetaText: {
		fontSize: 12,
		fontWeight: "500",
	},
	progressBarTrack: {
		height: 4,
		borderRadius: 2,
		overflow: "hidden",
		marginTop: 2,
	},
	progressBarFill: {
		height: "100%",
		borderRadius: 2,
	},
	liveEndedText: {
		fontSize: 13,
		fontWeight: "600",
	},
	lateStartRow: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 20,
		marginBottom: 12,
		marginTop: -4,
	},
	lateStartText: {
		fontSize: 13,
		fontWeight: "500",
		letterSpacing: -0.2,
	},
	updatedBanner: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		marginHorizontal: 16,
		marginBottom: 6,
		paddingVertical: 8,
		paddingHorizontal: 14,
		borderRadius: 14,
		borderWidth: 1,
	},
	updatedBannerText: {
		fontSize: 13,
		fontWeight: "600",
		letterSpacing: -0.2,
	},
	timeTravelBanner: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		marginHorizontal: 16,
		marginBottom: 8,
		paddingVertical: 7,
		paddingHorizontal: 12,
		borderRadius: RADIUS.button,
		borderWidth: 1,
	},
	timeTravelInfo: {
		flexDirection: "row",
		alignItems: "center",
		flex: 1,
	},
	timeTravelText: {
		fontSize: 13,
		fontWeight: "600",
		letterSpacing: -0.2,
	},
	timeTravelResetBtn: {
		paddingHorizontal: 10,
		paddingVertical: 4,
		borderRadius: RADIUS.badge,
		marginLeft: 8,
	},
	timeTravelResetText: {
		color: "#FFFFFF",
		fontSize: 11,
		fontWeight: "700",
	},
	subgroupNotice: {
		fontSize: 12,
		fontWeight: "500",
	},
	centerBox: {
		alignItems: "center",
		justifyContent: "center",
		paddingVertical: 100,
		paddingHorizontal: 30,
	},
	errorTitle: {
		fontSize: 18,
		fontWeight: "700",
		marginTop: 14,
		marginBottom: 6,
	},
	errorSubtitle: {
		fontSize: 13,
		textAlign: "center",
		marginBottom: 16,
		lineHeight: 18,
	},
	retryBtn: {
		paddingHorizontal: 18,
		paddingVertical: 8,
		borderRadius: 18,
	},
	retryBtnText: {
		fontSize: 14,
		fontWeight: "600",
		color: "#FFFFFF",
	},
});
