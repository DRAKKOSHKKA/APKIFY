import React, { useState, useMemo } from "react";
import {
	StyleSheet,
	Text,
	View,
	ScrollView,
	TouchableOpacity,
	TextInput,
	Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";
import { ThemeColors } from "../theme/colors";
import { AppSettings } from "../types/schedule";
import { RADIUS, SPACING } from "../theme/tokens";
import { GradeEntry, SubjectSummary } from "../types/grades";
import {
	calculateOverview,
	calculateSubjectSummaries,
	getEntryGradesList,
	upsertGradeEntry,
} from "../services/gradesStorage";

interface GradesScreenProps {
	grades: GradeEntry[];
	theme: ThemeColors;
	settings: AppSettings;
	onAddGrade: () => void;
	onEditGrade: (entry: GradeEntry) => void;
	onExportFile: () => Promise<void>;
	onImportFile: () => Promise<void>;
	onExportClipboard: () => Promise<void>;
	onImportClipboard: (jsonString: string) => Promise<void>;
	onRefreshGrades: () => Promise<void>;
}

type ViewMode = "subjects" | "history" | "homework";

function getGradeColor(grade?: string): string {
	if (!grade) return "#8E8E93";
	switch (grade.toLowerCase()) {
		case "5":
			return "#34C759";
		case "4":
			return "#007AFF";
		case "3":
			return "#FF9500";
		case "2":
			return "#FF3B30";
		case "зачет":
		case "зачёт":
			return "#30D158";
		case "незачет":
		case "незачёт":
			return "#FF453A";
		default:
			return "#8E8E93";
	}
}

export const GradesScreen: React.FC<GradesScreenProps> = ({
	grades,
	theme,
	settings,
	onAddGrade,
	onEditGrade,
	onExportFile,
	onImportFile,
	onExportClipboard,
	onImportClipboard,
	onRefreshGrades,
}) => {
	const [viewMode, setViewMode] =
		useState<ViewMode>("subjects");
	const [searchQuery, setSearchQuery] = useState("");
	const [expandedSubjects, setExpandedSubjects] = useState<
		Record<string, boolean>
	>({});

	// Расчёт аналитики
	const overview = useMemo(
		() => calculateOverview(grades),
		[grades]
	);
	const subjectSummaries = useMemo(
		() => calculateSubjectSummaries(grades),
		[grades]
	);

	// Фильтрация по поиску
	const filteredSummaries = useMemo(() => {
		if (!searchQuery.trim()) return subjectSummaries;
		const query = searchQuery.toLowerCase().trim();
		return subjectSummaries.filter((s) =>
			s.subject.toLowerCase().includes(query)
		);
	}, [subjectSummaries, searchQuery]);

	// Все записи хронологически
	const sortedEntries = useMemo(() => {
		const list = [...grades].sort(
			(a, b) => b.createdAt - a.createdAt
		);
		if (!searchQuery.trim()) return list;
		const query = searchQuery.toLowerCase().trim();
		return list.filter(
			(e) =>
				e.subject.toLowerCase().includes(query) ||
				(e.note &&
					e.note.toLowerCase().includes(query)) ||
				e.date.includes(query)
		);
	}, [grades, searchQuery]);

	// Список домашних заданий
	const homeworkList = useMemo(() => {
		const list = grades.filter(
			(e) => !!e.homework && e.homework.trim().length > 0
		);
		const filtered = searchQuery.trim()
			? list.filter((e) => {
					const query = searchQuery
						.toLowerCase()
						.trim();
					return (
						e.subject
							.toLowerCase()
							.includes(query) ||
						(e.homework &&
							e.homework
								.toLowerCase()
								.includes(query)) ||
						(e.note &&
							e.note
								.toLowerCase()
								.includes(query)) ||
						e.date.includes(query)
					);
				})
			: list;

		return [...filtered].sort((a, b) => {
			if (!a.isHomeworkDone && b.isHomeworkDone) return -1;
			if (a.isHomeworkDone && !b.isHomeworkDone) return 1;
			return b.createdAt - a.createdAt;
		});
	}, [grades, searchQuery]);

	const toggleExpand = (subject: string) => {
		try {
			Haptics.selectionAsync();
		} catch {}
		setExpandedSubjects((prev) => ({
			...prev,
			[subject]: !prev[subject],
		}));
	};

	const handleToggleHomework = async (entry: GradeEntry) => {
		try {
			try {
				Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
			} catch {}
			await upsertGradeEntry({
				...entry,
				isHomeworkDone: !entry.isHomeworkDone,
			});
			await onRefreshGrades();
		} catch (err) {
			console.warn("Ошибка переключения статуса Д/З:", err);
		}
	};

	const handleImportClipboardPrompt = () => {
		Alert.prompt
			? Alert.prompt(
					"Импорт из буфера",
					"Вставьте JSON код резервной копии:",
					[
						{ text: "Отмена", style: "cancel" },
						{
							text: "Импортировать",
							onPress: async (text?: string) => {
								if (text) {
									await onImportClipboard(
										text
									);
								}
							},
						},
					],
					"plain-text"
				)
			: (async () => {
					try {
						const hasString =
							await Clipboard.hasStringAsync();
						if (hasString) {
							const text =
								await Clipboard.getStringAsync();
							if (
								text &&
								text.trim().startsWith("{")
							) {
								await onImportClipboard(text);
							} else {
								Alert.alert(
									"Ошибка",
									"В буфере обмена нет корректного JSON кода резервной копии."
								);
							}
						} else {
							Alert.alert(
								"Буфер пуст",
								"Скопируйте JSON бэкапа перед импортом."
							);
						}
					} catch (err: any) {
						Alert.alert(
							"Ошибка",
							err.message ||
								"Не удалось прочитать буфер"
						);
					}
				})();
	};

	const handleShowBackupMenu = () => {
		Alert.alert(
			"Резервное копирование",
			"Экспорт и импорт базы оценок и домашних заданий:",
			[
				{
					text: "Поделиться файлом",
					onPress: async () => {
						try {
							await onExportFile();
						} catch (e: any) {
							Alert.alert(
								"Ошибка",
								e.message ||
									"Не удалось экспортировать файл"
							);
						}
					},
				},
				{
					text: "Импорт из файла",
					onPress: async () => {
						try {
							await onImportFile();
						} catch (e: any) {
							Alert.alert(
								"Ошибка",
								e.message ||
									"Не удалось импортировать файл"
							);
						}
					},
				},
				{
					text: "Скопировать JSON",
					onPress: onExportClipboard,
				},
				{
					text: "Вставить JSON",
					onPress: handleImportClipboardPrompt,
				},
				{
					text: "Отмена",
					style: "cancel",
				},
			]
		);
	};

	const cardBg = settings.glassEffect
		? theme.glassCard
		: theme.card;
	const cardBorder = settings.glassEffect
		? theme.glassBorder
		: theme.border;

	// Статус среднего балла
	const avg = overview.averageGrade;
	let avgColor = theme.textSecondary;
	let avgStatus = "Нет данных";
	if (avg !== null) {
		if (avg >= 4.75) {
			avgColor = "#34C759";
			avgStatus = "Отличник";
		} else if (avg >= 3.75) {
			avgColor = "#007AFF";
			avgStatus = "Хорошист";
		} else if (avg >= 3.0) {
			avgColor = "#FF9500";
			avgStatus = "Удовлетворительно";
		} else {
			avgColor = "#FF3B30";
			avgStatus = "Требует внимания";
		}
	}

	return (
		<View
			style={[
				styles.container,
				{ backgroundColor: theme.background },
			]}
		>
			{/* Шапка раздела */}
			<View
				style={[
					styles.header,
					{
						backgroundColor: settings.glassEffect
							? "transparent"
							: theme.headerBackground,
						borderBottomColor: theme.border,
					},
				]}
			>
				<View style={styles.headerLeft}>
					<Text
						style={[
							styles.screenTitle,
							{ color: theme.text },
						]}
					>
						Оценки и успеваемость
					</Text>
					<Text
						style={[
							styles.screenSubtitle,
							{ color: theme.textSecondary },
						]}
					>
						{overview.totalGradesCount > 0
							? `${overview.totalGradesCount} оценок по ${overview.subjectsCount} предметам`
							: "Учёт оценок, домашних заданий и заметок"}
					</Text>
				</View>

				<View style={styles.headerRightActions}>
					<TouchableOpacity
						style={[
							styles.headerBackupBtn,
							{
								backgroundColor:
									theme.chipBackground,
								borderColor: theme.border,
							},
						]}
						activeOpacity={0.7}
						onPress={handleShowBackupMenu}
						hitSlop={{
							top: 8,
							bottom: 8,
							left: 8,
							right: 8,
						}}
						accessibilityLabel="Резервное копирование"
					>
						<Ionicons
							name="ellipsis-horizontal"
							size={18}
							color={theme.text}
						/>
					</TouchableOpacity>

					<TouchableOpacity
						style={[
							styles.headerAddBtn,
							{ backgroundColor: theme.accent },
						]}
						activeOpacity={0.8}
						onPress={onAddGrade}
					>
						<Ionicons
							name="add"
							size={20}
							color="#FFFFFF"
						/>
						<Text style={styles.headerAddBtnText}>
							Запись
						</Text>
					</TouchableOpacity>
				</View>
			</View>

			<ScrollView
				style={styles.scrollArea}
				contentContainerStyle={styles.scrollContent}
				showsVerticalScrollIndicator={false}
			>
				{/* Главная аналитическая карточка успеваемости */}
				<View
					style={[
						styles.overviewCard,
						{
							backgroundColor: cardBg,
							borderColor: cardBorder,
						},
					]}
				>
					<View style={styles.overviewTopRow}>
						<View style={styles.avgCircleCol}>
							<View
								style={[
									styles.avgCircle,
									{
										backgroundColor:
											avg !== null
												? avgColor + "20"
												: theme.chipBackground,
										borderColor:
											avg !== null
												? avgColor
												: theme.border,
									},
								]}
							>
								<Text
									style={[
										styles.avgText,
										{
											color:
												avg !== null
													? avgColor
													: theme.textSecondary,
										},
									]}
								>
									{avg !== null
										? avg.toFixed(2)
										: "—"}
								</Text>
							</View>
							<Text
								style={[
									styles.avgStatusText,
									{
										color:
											avg !== null
												? avgColor
												: theme.textSecondary,
									},
								]}
							>
								{avgStatus}
							</Text>
						</View>

						<View style={styles.statsCountersCol}>
							<Text
								style={[
									styles.counterHeaderTitle,
									{
										color: theme.textSecondary,
									},
								]}
							>
								РАСПРЕДЕЛЕНИЕ ОЦЕНОК
							</Text>
							<View style={styles.gradePillsGrid}>
								<View
									style={[
										styles.gradePillItem,
										{
											backgroundColor:
												theme.isDark
													? "rgba(52, 199, 89, 0.18)"
													: "rgba(52, 199, 89, 0.12)",
											borderColor:
												theme.isDark
													? "rgba(52, 199, 89, 0.35)"
													: "rgba(52, 199, 89, 0.22)",
										},
									]}
								>
									<Text
										style={[
											styles.gradePillNum,
											{ color: "#34C759" },
										]}
									>
										5
									</Text>
									<Text
										style={[
											styles.gradePillCount,
											{ color: "#34C759" },
										]}
									>
										{overview.count5} шт
									</Text>
								</View>

								<View
									style={[
										styles.gradePillItem,
										{
											backgroundColor:
												theme.isDark
													? "rgba(0, 122, 255, 0.18)"
													: "rgba(0, 122, 255, 0.12)",
											borderColor:
												theme.isDark
													? "rgba(0, 122, 255, 0.35)"
													: "rgba(0, 122, 255, 0.22)",
										},
									]}
								>
									<Text
										style={[
											styles.gradePillNum,
											{ color: "#007AFF" },
										]}
									>
										4
									</Text>
									<Text
										style={[
											styles.gradePillCount,
											{ color: "#007AFF" },
										]}
									>
										{overview.count4} шт
									</Text>
								</View>

								<View
									style={[
										styles.gradePillItem,
										{
											backgroundColor:
												theme.isDark
													? "rgba(255, 149, 0, 0.18)"
													: "rgba(255, 149, 0, 0.12)",
											borderColor:
												theme.isDark
													? "rgba(255, 149, 0, 0.35)"
													: "rgba(255, 149, 0, 0.22)",
										},
									]}
								>
									<Text
										style={[
											styles.gradePillNum,
											{ color: "#FF9500" },
										]}
									>
										3
									</Text>
									<Text
										style={[
											styles.gradePillCount,
											{ color: "#FF9500" },
										]}
									>
										{overview.count3} шт
									</Text>
								</View>

								<View
									style={[
										styles.gradePillItem,
										{
											backgroundColor:
												theme.isDark
													? "rgba(255, 59, 48, 0.18)"
													: "rgba(255, 59, 48, 0.12)",
											borderColor:
												theme.isDark
													? "rgba(255, 59, 48, 0.35)"
													: "rgba(255, 59, 48, 0.22)",
										},
									]}
								>
									<Text
										style={[
											styles.gradePillNum,
											{ color: "#FF3B30" },
										]}
									>
										2
									</Text>
									<Text
										style={[
											styles.gradePillCount,
											{ color: "#FF3B30" },
										]}
									>
										{overview.count2} шт
									</Text>
								</View>
							</View>
						</View>
					</View>

					{/* Нижняя строчка мета-инфо */}
					<View
						style={[
							styles.overviewFooter,
							{ borderTopColor: theme.separator },
						]}
					>
						<View style={styles.footerInfoItem}>
							<Ionicons
								name="book-outline"
								size={14}
								color={theme.accent}
							/>
							<Text
								style={[
									styles.footerInfoText,
									{
										color: theme.textSecondary,
									},
								]}
							>
								{overview.subjectsCount}{" "}
								предметов
							</Text>
						</View>

						<View style={styles.footerInfoItem}>
							<Ionicons
								name="document-text-outline"
								size={14}
								color={theme.accent}
							/>
							<Text
								style={[
									styles.footerInfoText,
									{
										color: theme.textSecondary,
									},
								]}
							>
								{overview.totalNotesCount}{" "}
								заметок
							</Text>
						</View>

						{overview.totalHomeworkCount > 0 && (
							<View style={styles.footerInfoItem}>
								<Ionicons
									name="checkbox-outline"
									size={14}
									color={
										overview.pendingHomeworkCount >
										0
											? theme.warning
											: "#34C759"
									}
								/>
								<Text
									style={[
										styles.footerInfoText,
										{
											color:
												overview.pendingHomeworkCount >
												0
													? theme.warning
													: "#34C759",
											fontWeight: "600",
										},
									]}
								>
									{overview.pendingHomeworkCount >
									0
										? `${overview.pendingHomeworkCount} Д/З сдать`
										: `${overview.totalHomeworkCount} Д/З сдано`}
								</Text>
							</View>
						)}
					</View>
				</View>

				{/* Переключатель вкладок «По предметам» / «Все записи» / «Домашка» */}
				<View style={styles.segmentedRow}>
					<TouchableOpacity
						style={[
							styles.segmentBtn,
							viewMode === "subjects" && [
								styles.segmentBtnActive,
								{ backgroundColor: theme.card },
							],
						]}
						activeOpacity={0.8}
						onPress={() => {
							try {
								Haptics.selectionAsync();
							} catch {}
							setViewMode("subjects");
						}}
					>
						<Text
							style={[
								styles.segmentBtnText,
								{
									color:
										viewMode === "subjects"
											? theme.text
											: theme.textSecondary,
									fontWeight:
										viewMode === "subjects"
											? "700"
											: "500",
								},
							]}
							numberOfLines={1}
						>
							Предметы ({subjectSummaries.length})
						</Text>
					</TouchableOpacity>

					<TouchableOpacity
						style={[
							styles.segmentBtn,
							viewMode === "history" && [
								styles.segmentBtnActive,
								{ backgroundColor: theme.card },
							],
						]}
						activeOpacity={0.8}
						onPress={() => {
							try {
								Haptics.selectionAsync();
							} catch {}
							setViewMode("history");
						}}
					>
						<Text
							style={[
								styles.segmentBtnText,
								{
									color:
										viewMode === "history"
											? theme.text
											: theme.textSecondary,
									fontWeight:
										viewMode === "history"
											? "700"
											: "500",
								},
							]}
							numberOfLines={1}
						>
							Все ({grades.length})
						</Text>
					</TouchableOpacity>

					<TouchableOpacity
						style={[
							styles.segmentBtn,
							viewMode === "homework" && [
								styles.segmentBtnActive,
								{ backgroundColor: theme.card },
							],
						]}
						activeOpacity={0.8}
						onPress={() => {
							try {
								Haptics.selectionAsync();
							} catch {}
							setViewMode("homework");
						}}
					>
						<Text
							style={[
								styles.segmentBtnText,
								{
									color:
										viewMode === "homework"
											? theme.text
											: theme.textSecondary,
									fontWeight:
										viewMode === "homework"
											? "700"
											: "500",
								},
							]}
							numberOfLines={1}
						>
							Д/З ({homeworkList.length})
						</Text>
					</TouchableOpacity>
				</View>

				{/* Поле поиска предметов / заметок */}
				{grades.length > 0 && (
					<View
						style={[
							styles.searchBox,
							{
								backgroundColor:
									theme.chipBackground,
								borderColor: theme.border,
							},
						]}
					>
						<Ionicons
							name="search-outline"
							size={16}
							color={theme.textSecondary}
							style={{ marginRight: 8 }}
						/>
						<TextInput
							style={[
								styles.searchInput,
								{ color: theme.text },
							]}
							placeholder="Поиск по предмету или заметке..."
							placeholderTextColor={
								theme.textSecondary
							}
							value={searchQuery}
							onChangeText={setSearchQuery}
						/>
						{searchQuery.length > 0 && (
							<TouchableOpacity
								onPress={() =>
									setSearchQuery("")
								}
								hitSlop={{
									top: 8,
									bottom: 8,
									left: 8,
									right: 8,
								}}
							>
								<Ionicons
									name="close-circle"
									size={16}
									color={theme.textSecondary}
								/>
							</TouchableOpacity>
						)}
					</View>
				)}

				{/* Содержимое в зависимости от выбранного режима */}
				{viewMode === "subjects" && (
					<View style={styles.listContainer}>
						{filteredSummaries.length > 0 ? (
							filteredSummaries.map((summary) => {
								const isExpanded =
									!!expandedSubjects[
										summary.subject
									];
								const sAvg = summary.average;
								let sColor = theme.accent;
								if (sAvg !== null) {
									if (sAvg >= 4.75)
										sColor = "#34C759";
									else if (sAvg >= 3.75)
										sColor = "#007AFF";
									else if (sAvg >= 3.0)
										sColor = "#FF9500";
									else sColor = "#FF3B30";
								}

								return (
									<View
										key={summary.subject}
										style={[
											styles.subjectCard,
											{
												backgroundColor:
													cardBg,
												borderColor:
													cardBorder,
											},
										]}
									>
										<TouchableOpacity
											style={
												styles.subjectCardHeader
											}
											activeOpacity={0.75}
											onPress={() =>
												toggleExpand(
													summary.subject
												)
											}
										>
											<View
												style={
													styles.subjectTitleCol
												}
											>
												<Text
													style={[
														styles.subjectName,
														{
															color: theme.text,
														},
													]}
												>
													{
														summary.subject
													}
												</Text>
												{/* Оценки в ряд */}
												<View
													style={
														styles.gradesInlineRow
													}
												>
													{summary
														.grades
														.length >
													0 ? (
														<>
															{summary.grades
																.slice(
																	0,
																	10
																)
																.map(
																	(
																		val,
																		idx
																	) => (
																		<View
																			key={
																				idx
																			}
																			style={[
																				styles.inlineGradeBadge,
																				{
																					backgroundColor:
																						getGradeColor(
																							val
																						),
																				},
																			]}
																		>
																			<Text
																				style={
																					styles.inlineGradeText
																				}
																			>
																				{
																					val
																				}
																			</Text>
																		</View>
																	)
																)}
															{summary
																.grades
																.length >
																10 && (
																<View
																	style={[
																		styles.inlineGradeBadgeMore,
																		{
																			backgroundColor:
																				theme.chipBackground,
																		},
																	]}
																>
																	<Text
																		style={[
																			styles.inlineGradeTextMore,
																			{
																				color: theme.textSecondary,
																			},
																		]}
																	>
																		+
																		{summary
																			.grades
																			.length -
																			10}
																	</Text>
																</View>
															)}
														</>
													) : (
														<Text
															style={[
																styles.noGradesYetText,
																{
																	color: theme.textSecondary,
																},
															]}
														>
															Оценок
															нет •
															только
															заметки
														</Text>
													)}

													{summary.notesCount >
														0 && (
														<View
															style={[
																styles.notesCountBadge,
																{
																	backgroundColor:
																		theme.chipBackground,
																},
															]}
														>
															<Ionicons
																name="document-text-outline"
																size={
																	11
																}
																color={
																	theme.accent
																}
																style={{
																	marginRight: 3,
																}}
															/>
															<Text
																style={[
																	styles.notesCountText,
																	{
																		color: theme.textSecondary,
																	},
																]}
															>
																{
																	summary.notesCount
																}
															</Text>
														</View>
													)}
												</View>
											</View>

											{/* Средний балл предмета */}
											<View
												style={
													styles.subjectScoreBlock
												}
											>
												<Text
													style={[
														styles.subjectScoreText,
														{
															color: sColor,
														},
													]}
												>
													{sAvg !==
													null
														? sAvg.toFixed(
																2
															)
														: "—"}
												</Text>
												<Ionicons
													name={
														isExpanded
															? "chevron-up"
															: "chevron-down"
													}
													size={16}
													color={
														theme.textSecondary
													}
													style={{
														marginTop: 2,
													}}
												/>
											</View>
										</TouchableOpacity>

										{/* Раскрывающийся список записей по этому предмету */}
										{isExpanded && (
											<View
												style={[
													styles.subjectEntriesList,
													{
														borderTopColor:
															theme.separator,
													},
												]}
											>
												{summary.entries.map(
													(entry) => (
														<TouchableOpacity
															key={
																entry.id
															}
															style={[
																styles.entryItemRow,
																{
																	borderBottomColor:
																		theme.separator,
																},
															]}
															activeOpacity={
																0.7
															}
															onPress={() =>
																onEditGrade(
																	entry
																)
															}
														>
															<View
																style={
																	styles.entryLeft
																}
															>
																<View
																	style={
																		styles.entryMetaLine
																	}
																>
																	<Text
																		style={[
																			styles.entryDate,
																			{
																				color: theme.text,
																			},
																		]}
																	>
																		{
																			entry.date
																		}
																	</Text>
																	{entry.pairIndex ? (
																		<Text
																			style={[
																				styles.entryPair,
																				{
																					color: theme.textSecondary,
																				},
																			]}
																		>
																			{
																				entry.pairIndex
																			}{" "}
																			пара
																		</Text>
																	) : null}
																</View>

																{entry.note ? (
																	<Text
																		style={[
																			styles.entryNoteText,
																			{
																				color: theme.textSecondary,
																			},
																		]}
																		numberOfLines={
																			2
																		}
																	>
																		{
																			entry.note
																		}
																	</Text>
																) : null}
															</View>

															<View
																style={
																	styles.entryRight
																}
															>
																{getEntryGradesList(
																	entry
																)
																	.length >
																0 ? (
																	<View
																		style={
																			styles.entryGradesListRow
																		}
																	>
																		{getEntryGradesList(
																			entry
																		).map(
																			(
																				g,
																				gIdx
																			) => (
																				<View
																					key={
																						gIdx
																					}
																					style={[
																						styles.entryGradeBadge,
																						{
																							backgroundColor:
																								getGradeColor(
																									g
																								),
																						},
																					]}
																				>
																					<Text
																						style={
																							styles.entryGradeText
																						}
																					>
																						{
																							g
																						}
																					</Text>
																				</View>
																			)
																		)}
																	</View>
																) : (
																	<Ionicons
																		name="create-outline"
																		size={
																			16
																		}
																		color={
																			theme.textSecondary
																		}
																	/>
																)}
															</View>
														</TouchableOpacity>
													)
												)}
											</View>
										)}
									</View>
								);
							})
						) : (
							<View style={styles.emptyBox}>
								<Ionicons
									name="school-outline"
									size={48}
									color={theme.textSecondary}
								/>
								<Text
									style={[
										styles.emptyTitle,
										{ color: theme.text },
									]}
								>
									Пока нет записей
								</Text>
								<Text
									style={[
										styles.emptySubtitle,
										{
											color: theme.textSecondary,
										},
									]}
								>
									Нажмите на любую пару в
									расписании, чтобы добавить
									оценку или домашнее задание
								</Text>
								<TouchableOpacity
									style={[
										styles.emptyActionBtn,
										{
											backgroundColor:
												theme.accent,
										},
									]}
									activeOpacity={0.8}
									onPress={onAddGrade}
								>
									<Text
										style={
											styles.emptyActionBtnText
										}
									>
										+ Добавить оценку
									</Text>
								</TouchableOpacity>
							</View>
						)}
					</View>
				)}

				{/* Хронологическая лента «Все записи» */}
				{viewMode === "history" && (
					<View style={styles.listContainer}>
						{sortedEntries.length > 0 ? (
							sortedEntries.map((entry) => (
								<TouchableOpacity
									key={entry.id}
									style={[
										styles.historyCard,
										{
											backgroundColor:
												cardBg,
											borderColor:
												cardBorder,
										},
									]}
									activeOpacity={0.75}
									onPress={() =>
										onEditGrade(entry)
									}
								>
									<View
										style={
											styles.historyCardHeader
										}
									>
										<View
											style={
												styles.historyHeaderLeft
											}
										>
											<Text
												style={[
													styles.historySubject,
													{
														color: theme.text,
													},
												]}
												numberOfLines={1}
											>
												{entry.subject}
											</Text>
											<Text
												style={[
													styles.historyDate,
													{
														color: theme.textSecondary,
													},
												]}
											>
												{entry.date}
												{entry.pairIndex
													? ` • ${entry.pairIndex} пара`
													: ""}
											</Text>
										</View>

										{getEntryGradesList(
											entry
										).length > 0 ? (
											<View
												style={
													styles.historyGradesListRow
												}
											>
												{getEntryGradesList(
													entry
												).map(
													(
														g,
														gIdx
													) => (
														<View
															key={
																gIdx
															}
															style={[
																styles.historyGradeBadge,
																{
																	backgroundColor:
																		getGradeColor(
																			g
																		),
																},
															]}
														>
															<Text
																style={
																	styles.historyGradeText
																}
															>
																{
																	g
																}
															</Text>
														</View>
													)
												)}
											</View>
										) : null}
									</View>

									{entry.homework ? (
										<View
											style={[
												styles.historyHomeworkBox,
												{
													backgroundColor:
														entry.isHomeworkDone
															? "rgba(52, 199, 89, 0.12)"
															: "rgba(255, 149, 0, 0.12)",
													borderColor:
														entry.isHomeworkDone
															? "#34C759"
															: "#FF9500",
												},
											]}
										>
											<Ionicons
												name={
													entry.isHomeworkDone
														? "checkmark-circle"
														: "time-outline"
												}
												size={14}
												color={
													entry.isHomeworkDone
														? "#34C759"
														: "#FF9500"
												}
												style={{
													marginRight: 6,
												}}
											/>
											<Text
												style={[
													styles.historyHomeworkText,
													{
														color: theme.text,
														textDecorationLine:
															entry.isHomeworkDone
																? "line-through"
																: "none",
													},
												]}
												numberOfLines={2}
											>
												<Text
													style={{
														fontWeight:
															"700",
													}}
												>
													Д/З:{" "}
												</Text>
												{entry.homework}
											</Text>
										</View>
									) : null}

									{entry.note ? (
										<View
											style={[
												styles.historyNoteBox,
												{
													backgroundColor:
														theme.chipBackground,
													borderColor:
														theme.border,
												},
											]}
										>
											<Ionicons
												name="document-text"
												size={12}
												color={
													theme.accent
												}
												style={{
													marginRight: 6,
												}}
											/>
											<Text
												style={[
													styles.historyNoteText,
													{
														color: theme.text,
													},
												]}
											>
												{entry.note}
											</Text>
										</View>
									) : null}
								</TouchableOpacity>
							))
						) : (
							<View style={styles.emptyBox}>
								<Ionicons
									name="folder-open-outline"
									size={44}
									color={theme.textSecondary}
								/>
								<Text
									style={[
										styles.emptyTitle,
										{ color: theme.text },
									]}
								>
									Ничего не найдено
								</Text>
							</View>
						)}
					</View>
				)}

				{/* Вкладка «Домашка» в iOS-стиле (Apple Reminders) */}
				{viewMode === "homework" && (
					<View style={styles.listContainer}>
						{homeworkList.length > 0 ? (
							homeworkList.map((entry) => (
								<TouchableOpacity
									key={entry.id}
									style={[
										styles.homeworkCard,
										{
											backgroundColor:
												cardBg,
											borderColor:
												cardBorder,
										},
									]}
									activeOpacity={0.75}
									onPress={() =>
										onEditGrade(entry)
									}
								>
									<View style={styles.homeworkRow}>
										{/* Круглый интерактивный чекбокс в стиле iOS */}
										<TouchableOpacity
											style={[
												styles.circularCheckbox,
												entry.isHomeworkDone
													? styles.circularCheckboxDone
													: [
															styles.circularCheckboxPending,
															{
																borderColor:
																	theme.isDark
																		? "#636366"
																		: "#C7C7CC",
															},
														],
											]}
											activeOpacity={0.7}
											onPress={() =>
												handleToggleHomework(
													entry
												)
											}
											hitSlop={{
												top: 10,
												bottom: 10,
												left: 10,
												right: 10,
											}}
											accessibilityLabel={
												entry.isHomeworkDone
													? "Отметить как несделанное"
													: "Отметить как сделанное"
											}
										>
											{entry.isHomeworkDone && (
												<Ionicons
													name="checkmark"
													size={15}
													color="#FFFFFF"
												/>
											)}
										</TouchableOpacity>

										{/* Тело задания: предмет, дата и полный текст без сокращений */}
										<View
											style={
												styles.homeworkBodyCol
											}
										>
											<View
												style={
													styles.homeworkHeaderLine
												}
											>
												<Text
													style={[
														styles.homeworkSubjectText,
														{
															color: theme.text,
														},
													]}
													numberOfLines={1}
												>
													{entry.subject}
												</Text>
												<Text
													style={[
														styles.homeworkDateText,
														{
															color: theme.textSecondary,
														},
													]}
												>
													{entry.date}
													{entry.pairIndex
														? ` • ${entry.pairIndex} пара`
														: ""}
												</Text>
											</View>

											{/* Полный текст Д/З без троеточия */}
											<Text
												style={[
													styles.homeworkFullText,
													{
														color: theme.text,
														textDecorationLine:
															entry.isHomeworkDone
																? "line-through"
																: "none",
														opacity:
															entry.isHomeworkDone
																? 0.5
																: 1,
													},
												]}
											>
												{entry.homework}
											</Text>

											{entry.note ? (
												<View
													style={[
														styles.homeworkNoteBox,
														{
															backgroundColor:
																theme.chipBackground,
															borderColor:
																theme.border,
														},
													]}
												>
													<Ionicons
														name="document-text-outline"
														size={12}
														color={
															theme.accent
														}
														style={{
															marginRight: 5,
															marginTop: 1,
														}}
													/>
													<Text
														style={[
															styles.homeworkNoteText,
															{
																color: theme.textSecondary,
															},
														]}
													>
														{entry.note}
													</Text>
												</View>
											) : null}
										</View>
									</View>
								</TouchableOpacity>
							))
						) : (
							<View style={styles.emptyBox}>
								<Ionicons
									name="checkbox-outline"
									size={48}
									color={theme.textSecondary}
								/>
								<Text
									style={[
										styles.emptyTitle,
										{ color: theme.text },
									]}
								>
									{searchQuery.trim()
										? "Ничего не найдено"
										: "Нет домашних заданий"}
								</Text>
								<Text
									style={[
										styles.emptySubtitle,
										{
											color: theme.textSecondary,
										},
									]}
								>
									{searchQuery.trim()
										? "Попробуйте изменить поисковый запрос"
										: "Нажмите на пару в расписании или кнопку «Запись», чтобы добавить Д/З"}
								</Text>
							</View>
						)}
					</View>
				)}
			</ScrollView>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	header: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingHorizontal: SPACING.screenHorizontal,
		paddingTop: 10,
		paddingBottom: 12,
		borderBottomWidth: StyleSheet.hairlineWidth,
	},
	headerLeft: {
		flex: 1,
		marginRight: 10,
	},
	screenTitle: {
		fontSize: 22,
		fontWeight: "800",
		letterSpacing: -0.4,
	},
	screenSubtitle: {
		fontSize: 12,
		fontWeight: "500",
		marginTop: 2,
	},
	headerRightActions: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
	},
	headerBackupBtn: {
		width: 36,
		height: 36,
		borderRadius: 18,
		alignItems: "center",
		justifyContent: "center",
		borderWidth: StyleSheet.hairlineWidth,
	},
	headerAddBtn: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 14,
		paddingVertical: 8,
		borderRadius: RADIUS.button,
	},
	headerAddBtnText: {
		color: "#FFFFFF",
		fontSize: 13,
		fontWeight: "700",
		marginLeft: 4,
	},
	scrollArea: {
		flex: 1,
	},
	scrollContent: {
		paddingHorizontal: SPACING.screenHorizontal,
		paddingTop: 14,
		paddingBottom: 100, // Запас под нижний TabBar
		maxWidth: 720,
		width: "100%",
		alignSelf: "center",
	},
	overviewCard: {
		borderRadius: RADIUS.card,
		borderWidth: 1,
		padding: 16,
		marginBottom: 16,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.05,
		shadowRadius: 8,
		elevation: 2,
	},
	overviewTopRow: {
		flexDirection: "row",
		alignItems: "center",
	},
	avgCircleCol: {
		alignItems: "center",
		marginRight: 18,
	},
	avgCircle: {
		width: 80,
		height: 80,
		borderRadius: 40,
		alignItems: "center",
		justifyContent: "center",
		borderWidth: 2,
	},
	avgText: {
		fontSize: 26,
		fontWeight: "800",
		letterSpacing: -0.5,
	},
	avgStatusText: {
		fontSize: 11,
		fontWeight: "700",
		marginTop: 6,
	},
	statsCountersCol: {
		flex: 1,
	},
	counterHeaderTitle: {
		fontSize: 10,
		fontWeight: "700",
		letterSpacing: 0.5,
		marginBottom: 8,
	},
	gradePillsGrid: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: 8,
	},
	gradePillItem: {
		width: "47%",
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingHorizontal: 12,
		paddingVertical: 8,
		borderRadius: RADIUS.badge,
		borderWidth: 1,
	},
	gradePillNum: {
		fontSize: 16,
		fontWeight: "900",
	},
	gradePillCount: {
		fontSize: 13,
		fontWeight: "700",
	},
	entryGradesListRow: {
		flexDirection: "row",
		flexWrap: "wrap",
		alignItems: "center",
		justifyContent: "flex-end",
		gap: 4,
	},
	historyGradesListRow: {
		flexDirection: "row",
		flexWrap: "wrap",
		alignItems: "center",
		justifyContent: "flex-end",
		maxWidth: "48%",
		gap: 4,
	},
	overviewFooter: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-around",
		marginTop: 14,
		paddingTop: 12,
		borderTopWidth: StyleSheet.hairlineWidth,
	},
	footerInfoItem: {
		flexDirection: "row",
		alignItems: "center",
		gap: 6,
	},
	footerInfoText: {
		fontSize: 12,
		fontWeight: "500",
	},
	segmentedRow: {
		flexDirection: "row",
		backgroundColor: "rgba(120, 120, 128, 0.16)",
		borderRadius: 12,
		padding: 3,
		marginBottom: 14,
	},
	segmentBtn: {
		flex: 1,
		paddingVertical: 7,
		borderRadius: 9,
		alignItems: "center",
		justifyContent: "center",
	},
	segmentBtnActive: {
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.12,
		shadowRadius: 3,
		elevation: 2,
	},
	segmentBtnText: {
		fontSize: 13,
		letterSpacing: -0.1,
	},
	searchBox: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 12,
		paddingVertical: 8,
		borderRadius: RADIUS.input,
		borderWidth: StyleSheet.hairlineWidth,
		marginBottom: 14,
	},
	searchInput: {
		flex: 1,
		fontSize: 14,
		padding: 0,
	},
	listContainer: {
		gap: 12,
		marginBottom: 20,
	},
	subjectCard: {
		borderRadius: RADIUS.card,
		borderWidth: 1,
		overflow: "hidden",
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.03,
		shadowRadius: 4,
		elevation: 1,
	},
	subjectCardHeader: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		padding: 14,
	},
	subjectTitleCol: {
		flex: 1,
		paddingRight: 12,
	},
	subjectName: {
		fontSize: 15,
		fontWeight: "700",
		lineHeight: 20,
		marginBottom: 6,
	},
	gradesInlineRow: {
		flexDirection: "row",
		flexWrap: "wrap",
		alignItems: "center",
		gap: 5,
	},
	inlineGradeBadge: {
		minWidth: 22,
		height: 22,
		paddingHorizontal: 4,
		borderRadius: 5,
		alignItems: "center",
		justifyContent: "center",
	},
	inlineGradeBadgeMore: {
		height: 22,
		paddingHorizontal: 5,
		borderRadius: 5,
		alignItems: "center",
		justifyContent: "center",
	},
	inlineGradeTextMore: {
		fontSize: 10,
		fontWeight: "800",
	},
	inlineGradeText: {
		color: "#FFFFFF",
		fontSize: 12,
		fontWeight: "800",
	},
	noGradesYetText: {
		fontSize: 12,
		fontStyle: "italic",
	},
	notesCountBadge: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 6,
		paddingVertical: 3,
		borderRadius: 5,
	},
	notesCountText: {
		fontSize: 11,
		fontWeight: "600",
	},
	subjectScoreBlock: {
		alignItems: "flex-end",
	},
	subjectScoreText: {
		fontSize: 20,
		fontWeight: "800",
		letterSpacing: -0.3,
	},
	subjectEntriesList: {
		borderTopWidth: StyleSheet.hairlineWidth,
		paddingHorizontal: 14,
		paddingVertical: 6,
	},
	entryItemRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingVertical: 10,
		borderBottomWidth: StyleSheet.hairlineWidth,
	},
	entryLeft: {
		flex: 1,
		paddingRight: 10,
	},
	entryMetaLine: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
		marginBottom: 2,
	},
	entryDate: {
		fontSize: 13,
		fontWeight: "700",
	},
	entryPair: {
		fontSize: 12,
		fontWeight: "500",
	},
	entryRoom: {
		fontSize: 12,
		fontWeight: "500",
	},
	entryNoteText: {
		fontSize: 12,
		lineHeight: 16,
		marginTop: 2,
	},
	entryRight: {
		marginLeft: 8,
		maxWidth: "48%",
		alignItems: "flex-end",
	},
	entryGradeBadge: {
		minWidth: 28,
		height: 28,
		paddingHorizontal: 5,
		borderRadius: 7,
		alignItems: "center",
		justifyContent: "center",
	},
	entryGradeText: {
		color: "#FFFFFF",
		fontSize: 14,
		fontWeight: "800",
	},
	historyCard: {
		borderRadius: RADIUS.card,
		borderWidth: 1,
		padding: 14,
	},
	historyCardHeader: {
		flexDirection: "row",
		alignItems: "flex-start",
		justifyContent: "space-between",
	},
	historyHeaderLeft: {
		flex: 1,
		paddingRight: 10,
	},
	historySubject: {
		fontSize: 15,
		fontWeight: "700",
		lineHeight: 20,
		marginBottom: 2,
	},
	historyDate: {
		fontSize: 12,
		fontWeight: "500",
	},
	historyGradeBadge: {
		minWidth: 32,
		height: 32,
		paddingHorizontal: 6,
		borderRadius: 8,
		alignItems: "center",
		justifyContent: "center",
	},
	historyGradeText: {
		color: "#FFFFFF",
		fontSize: 16,
		fontWeight: "800",
	},
	historyNoteBox: {
		flexDirection: "row",
		alignItems: "center",
		marginTop: 10,
		padding: 8,
		borderRadius: RADIUS.badge,
		borderWidth: StyleSheet.hairlineWidth,
	},
	historyNoteText: {
		fontSize: 13,
		lineHeight: 17,
		flex: 1,
	},
	emptyBox: {
		alignItems: "center",
		justifyContent: "center",
		paddingVertical: 36,
		gap: 8,
	},
	emptyTitle: {
		fontSize: 17,
		fontWeight: "700",
	},
	emptySubtitle: {
		fontSize: 13,
		textAlign: "center",
		maxWidth: 280,
		lineHeight: 18,
	},
	emptyActionBtn: {
		marginTop: 8,
		paddingHorizontal: 20,
		paddingVertical: 10,
		borderRadius: RADIUS.button,
	},
	emptyActionBtnText: {
		color: "#FFFFFF",
		fontSize: 14,
		fontWeight: "700",
	},
	entryHomeworkPill: {
		flexDirection: "row",
		alignItems: "center",
		marginTop: 4,
		paddingHorizontal: 8,
		paddingVertical: 3,
		borderRadius: 6,
		borderWidth: StyleSheet.hairlineWidth,
		alignSelf: "flex-start",
		maxWidth: "100%",
	},
	entryHomeworkPillText: {
		fontSize: 11,
		fontWeight: "600",
		flexShrink: 1,
	},
	historyHomeworkBox: {
		flexDirection: "row",
		alignItems: "center",
		marginTop: 8,
		padding: 8,
		borderRadius: RADIUS.badge,
		borderWidth: StyleSheet.hairlineWidth,
	},
	historyHomeworkText: {
		fontSize: 12,
		lineHeight: 16,
		flex: 1,
		marginRight: 6,
	},
	homeworkCard: {
		borderRadius: 16,
		borderWidth: 1,
		padding: 14,
		marginBottom: 10,
	},
	homeworkRow: {
		flexDirection: "row",
		alignItems: "flex-start",
	},
	circularCheckbox: {
		width: 24,
		height: 24,
		borderRadius: 12,
		alignItems: "center",
		justifyContent: "center",
		marginRight: 12,
		marginTop: 2,
	},
	circularCheckboxPending: {
		borderWidth: 2,
	},
	circularCheckboxDone: {
		backgroundColor: "#34C759",
	},
	homeworkBodyCol: {
		flex: 1,
	},
	homeworkHeaderLine: {
		flexDirection: "row",
		alignItems: "baseline",
		justifyContent: "space-between",
		marginBottom: 4,
		gap: 8,
	},
	homeworkSubjectText: {
		fontSize: 16,
		fontWeight: "700",
		letterSpacing: -0.2,
		flex: 1,
	},
	homeworkDateText: {
		fontSize: 12,
		fontWeight: "500",
	},
	homeworkFullText: {
		fontSize: 14,
		lineHeight: 20,
		marginTop: 2,
	},
	homeworkNoteBox: {
		flexDirection: "row",
		alignItems: "flex-start",
		marginTop: 8,
		paddingHorizontal: 10,
		paddingVertical: 6,
		borderRadius: 8,
		borderWidth: StyleSheet.hairlineWidth,
	},
	homeworkNoteText: {
		fontSize: 12,
		lineHeight: 16,
		flex: 1,
	},
});
