import React, { useState, useMemo, useEffect } from "react";
import {
	StyleSheet,
	Text,
	View,
	ScrollView,
	TouchableOpacity,
	TextInput,
	Alert,
	ActivityIndicator,
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
	getStorageInfo,
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

type ViewMode = "subjects" | "history";

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
	const [viewMode, setViewMode] = useState<ViewMode>("subjects");
	const [searchQuery, setSearchQuery] = useState("");
	const [expandedSubjects, setExpandedSubjects] = useState<
		Record<string, boolean>
	>({});
	const [storageInfo, setStorageInfo] = useState<{
		folderName: string;
		fileName: string;
		fullPath: string;
		fileExists: boolean;
		fileSizeFormatted: string;
		entriesCount: number;
		lastUpdatedFormatted: string;
	} | null>(null);
	const [isLoadingAction, setIsLoadingAction] = useState(false);

	// Загружаем инфо о папке и файле
	useEffect(() => {
		async function fetchInfo() {
			try {
				const info = await getStorageInfo();
				setStorageInfo(info);
			} catch {}
		}
		fetchInfo();
	}, [grades]);

	// Расчёт аналитики
	const overview = useMemo(() => calculateOverview(grades), [grades]);
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
		const list = [...grades].sort((a, b) => b.createdAt - a.createdAt);
		if (!searchQuery.trim()) return list;
		const query = searchQuery.toLowerCase().trim();
		return list.filter(
			(e) =>
				e.subject.toLowerCase().includes(query) ||
				(e.note && e.note.toLowerCase().includes(query)) ||
				e.date.includes(query)
		);
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
									await onImportClipboard(text);
								}
							},
						},
					],
					"plain-text"
			  )
			: (async () => {
					try {
						const hasString = await Clipboard.hasStringAsync();
						if (hasString) {
							const text = await Clipboard.getStringAsync();
							if (text && text.trim().startsWith("{")) {
								await onImportClipboard(text);
							} else {
								Alert.alert(
									"Ошибка",
									"В буфере обмена нет корректного JSON кода резервной копии."
								);
							}
						} else {
							Alert.alert("Буфер пуст", "Скопируйте JSON бэкапа перед импортом.");
						}
					} catch (err: any) {
						Alert.alert("Ошибка", err.message || "Не удалось прочитать буфер");
					}
			  })();
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
						style={[styles.screenTitle, { color: theme.text }]}
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

				<TouchableOpacity
					style={[
						styles.headerAddBtn,
						{ backgroundColor: theme.accent },
					]}
					activeOpacity={0.8}
					onPress={onAddGrade}
				>
					<Ionicons name="add" size={20} color="#FFFFFF" />
					<Text style={styles.headerAddBtnText}>Запись</Text>
				</TouchableOpacity>
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
									{avg !== null ? avg.toFixed(2) : "—"}
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
									{ color: theme.textSecondary },
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
												"rgba(52, 199, 89, 0.12)",
										},
									]}
								>
									<Text style={styles.gradePillNum}>5</Text>
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
												"rgba(0, 122, 255, 0.12)",
										},
									]}
								>
									<Text style={styles.gradePillNum}>4</Text>
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
												"rgba(255, 149, 0, 0.12)",
										},
									]}
								>
									<Text style={styles.gradePillNum}>3</Text>
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
												"rgba(255, 59, 48, 0.12)",
										},
									]}
								>
									<Text style={styles.gradePillNum}>2</Text>
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
									{ color: theme.textSecondary },
								]}
							>
								{overview.subjectsCount} предметов
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
									{ color: theme.textSecondary },
								]}
							>
								{overview.totalNotesCount} заметок и Д/З
							</Text>
						</View>
					</View>
				</View>

				{/* Переключатель вкладок «По предметам» / «Все записи» */}
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
						>
							По предметам ({subjectSummaries.length})
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
						>
							Все записи ({grades.length})
						</Text>
					</TouchableOpacity>
				</View>

				{/* Поле поиска предметов / заметок */}
				{grades.length > 0 && (
					<View
						style={[
							styles.searchBox,
							{
								backgroundColor: theme.chipBackground,
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
							style={[styles.searchInput, { color: theme.text }]}
							placeholder="Поиск по предмету или заметке..."
							placeholderTextColor={theme.textSecondary}
							value={searchQuery}
							onChangeText={setSearchQuery}
						/>
						{searchQuery.length > 0 && (
							<TouchableOpacity
								onPress={() => setSearchQuery("")}
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
				{viewMode === "subjects" ? (
					<View style={styles.listContainer}>
						{filteredSummaries.length > 0 ? (
							filteredSummaries.map((summary) => {
								const isExpanded =
									!!expandedSubjects[summary.subject];
								const sAvg = summary.average;
								let sColor = theme.accent;
								if (sAvg !== null) {
									if (sAvg >= 4.75) sColor = "#34C759";
									else if (sAvg >= 3.75) sColor = "#007AFF";
									else if (sAvg >= 3.0) sColor = "#FF9500";
									else sColor = "#FF3B30";
								}

								return (
									<View
										key={summary.subject}
										style={[
											styles.subjectCard,
											{
												backgroundColor: cardBg,
												borderColor: cardBorder,
											},
										]}
									>
										<TouchableOpacity
											style={styles.subjectCardHeader}
											activeOpacity={0.75}
											onPress={() =>
												toggleExpand(summary.subject)
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
														{ color: theme.text },
													]}
												>
													{summary.subject}
												</Text>
												{/* Оценки в ряд */}
												<View
													style={
														styles.gradesInlineRow
													}
												>
													{summary.grades.length >
													0 ? (
														summary.grades
															.slice(0, 10)
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
															)
													) : (
														<Text
															style={[
																styles.noGradesYetText,
																{
																	color: theme.textSecondary,
																},
															]}
														>
															Оценок нет • только
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
																size={11}
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
														{ color: sColor },
													]}
												>
													{sAvg !== null
														? sAvg.toFixed(2)
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
													style={{ marginTop: 2 }}
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
															key={entry.id}
															style={[
																styles.entryItemRow,
																{
																	borderBottomColor:
																		theme.separator,
																},
															]}
															activeOpacity={0.7}
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
																	{entry.room ? (
																		<Text
																			style={[
																				styles.entryRoom,
																				{
																					color: theme.textSecondary,
																				},
																			]}
																		>
																			каб.{" "}
																			{
																				entry.room
																			}
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
																{entry.grade ? (
																	<View
																		style={[
																			styles.entryGradeBadge,
																			{
																				backgroundColor:
																					getGradeColor(
																						entry.grade
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
																				entry.grade
																			}
																		</Text>
																	</View>
																) : (
																	<Ionicons
																		name="create-outline"
																		size={16}
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
										{ color: theme.textSecondary },
									]}
								>
									Нажмите на любую пару в расписании, чтобы
									добавить оценку или домашнее задание
								</Text>
								<TouchableOpacity
									style={[
										styles.emptyActionBtn,
										{ backgroundColor: theme.accent },
									]}
									activeOpacity={0.8}
									onPress={onAddGrade}
								>
									<Text style={styles.emptyActionBtnText}>
										+ Добавить оценку
									</Text>
								</TouchableOpacity>
							</View>
						)}
					</View>
				) : (
					/* Хронологическая лента «Все записи» */
					<View style={styles.listContainer}>
						{sortedEntries.length > 0 ? (
							sortedEntries.map((entry) => (
								<TouchableOpacity
									key={entry.id}
									style={[
										styles.historyCard,
										{
											backgroundColor: cardBg,
											borderColor: cardBorder,
										},
									]}
									activeOpacity={0.75}
									onPress={() => onEditGrade(entry)}
								>
									<View style={styles.historyCardHeader}>
										<View style={styles.historyHeaderLeft}>
											<Text
												style={[
													styles.historySubject,
													{ color: theme.text },
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
												{entry.room
													? ` • каб. ${entry.room}`
													: ""}
											</Text>
										</View>

										{entry.grade ? (
											<View
												style={[
													styles.historyGradeBadge,
													{
														backgroundColor:
															getGradeColor(
																entry.grade
															),
													},
												]}
											>
												<Text
													style={
														styles.historyGradeText
													}
												>
													{entry.grade}
												</Text>
											</View>
										) : null}
									</View>

									{entry.note ? (
										<View
											style={[
												styles.historyNoteBox,
												{
													backgroundColor:
														theme.chipBackground,
													borderColor: theme.border,
												},
											]}
										>
											<Ionicons
												name="document-text"
												size={12}
												color={theme.accent}
												style={{ marginRight: 6 }}
											/>
											<Text
												style={[
													styles.historyNoteText,
													{ color: theme.text },
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

				{/* Карточка специальной папки и резервного копирования */}
				<View
					style={[
						styles.storageCard,
						{
							backgroundColor: cardBg,
							borderColor: cardBorder,
						},
					]}
				>
					<View style={styles.storageCardHeader}>
						<View
							style={[
								styles.storageIconWrap,
								{
									backgroundColor:
										theme.accentSubtle,
								},
							]}
						>
							<Ionicons
								name="folder-outline"
								size={20}
								color={theme.accent}
							/>
						</View>
						<View style={styles.storageHeaderTitles}>
							<Text
								style={[
									styles.storageCardTitle,
									{ color: theme.text },
								]}
							>
								Специальная папка и резервные копии
							</Text>
							<Text
								style={[
									styles.storageCardSubtitle,
									{ color: theme.textSecondary },
								]}
							>
								Защита от потери данных при переустановках
							</Text>
						</View>
					</View>

					<Text
						style={[
							styles.storageDesc,
							{ color: theme.textSecondary },
						]}
					>
						Все оценки сохраняются в постоянный файл на устройстве.
						Вы можете увидеть его в системном приложении «Файлы»:
					</Text>

					{/* Путь к файлу */}
					<View
						style={[
							styles.pathBox,
							{
								backgroundColor: theme.chipBackground,
								borderColor: theme.border,
							},
						]}
					>
						<Ionicons
							name="phone-portrait-outline"
							size={14}
							color={theme.accent}
							style={{ marginRight: 6 }}
						/>
						<Text
							style={[styles.pathText, { color: theme.text }]}
							numberOfLines={2}
						>
							Файлы › На моем iPhone › Apkify › Apkify_Grades ›
							grades_and_notes.json
						</Text>
					</View>

					{storageInfo && (
						<View style={styles.storageStatsRow}>
							<Text
								style={[
									styles.storageStatText,
									{ color: theme.textSecondary },
								]}
							>
								Статус файла:{" "}
								<Text
									style={{
										color: storageInfo.fileExists
											? "#34C759"
											: theme.warning,
										fontWeight: "700",
									}}
								>
									{storageInfo.fileExists
										? `Сохранён (${storageInfo.fileSizeFormatted})`
										: "Будет создан при первой записи"}
								</Text>
							</Text>
							<Text
								style={[
									styles.storageStatText,
									{ color: theme.textSecondary },
								]}
							>
								Обновлено: {storageInfo.lastUpdatedFormatted}
							</Text>
						</View>
					)}

					{/* Кнопки экспорта и импорта */}
					<View style={styles.storageActionsGrid}>
						<TouchableOpacity
							style={[
								styles.storageActionBtn,
								{
									backgroundColor: theme.chipBackground,
									borderColor: theme.border,
								},
							]}
							activeOpacity={0.7}
							onPress={async () => {
								setIsLoadingAction(true);
								try {
									await onExportFile();
								} finally {
									setIsLoadingAction(false);
								}
							}}
							disabled={isLoadingAction}
						>
							<Ionicons
								name="share-outline"
								size={16}
								color={theme.accent}
								style={{ marginRight: 6 }}
							/>
							<Text
								style={[
									styles.storageActionBtnText,
									{ color: theme.text },
								]}
							>
								Поделиться файлом
							</Text>
						</TouchableOpacity>

						<TouchableOpacity
							style={[
								styles.storageActionBtn,
								{
									backgroundColor: theme.chipBackground,
									borderColor: theme.border,
								},
							]}
							activeOpacity={0.7}
							onPress={async () => {
								setIsLoadingAction(true);
								try {
									await onImportFile();
								} finally {
									setIsLoadingAction(false);
								}
							}}
							disabled={isLoadingAction}
						>
							<Ionicons
								name="download-outline"
								size={16}
								color={theme.accent}
								style={{ marginRight: 6 }}
							/>
							<Text
								style={[
									styles.storageActionBtnText,
									{ color: theme.text },
								]}
							>
								Импорт из файла
							</Text>
						</TouchableOpacity>

						<TouchableOpacity
							style={[
								styles.storageActionBtn,
								{
									backgroundColor: theme.chipBackground,
									borderColor: theme.border,
								},
							]}
							activeOpacity={0.7}
							onPress={onExportClipboard}
							disabled={isLoadingAction}
						>
							<Ionicons
								name="copy-outline"
								size={16}
								color={theme.textSecondary}
								style={{ marginRight: 6 }}
							/>
							<Text
								style={[
									styles.storageActionBtnText,
									{ color: theme.text },
								]}
							>
								Копировать JSON
							</Text>
						</TouchableOpacity>

						<TouchableOpacity
							style={[
								styles.storageActionBtn,
								{
									backgroundColor: theme.chipBackground,
									borderColor: theme.border,
								},
							]}
							activeOpacity={0.7}
							onPress={handleImportClipboardPrompt}
							disabled={isLoadingAction}
						>
							<Ionicons
								name="clipboard-outline"
								size={16}
								color={theme.textSecondary}
								style={{ marginRight: 6 }}
							/>
							<Text
								style={[
									styles.storageActionBtnText,
									{ color: theme.text },
								]}
							>
								Вставить JSON
							</Text>
						</TouchableOpacity>
					</View>
				</View>
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
		paddingHorizontal: 10,
		paddingVertical: 6,
		borderRadius: RADIUS.badge,
	},
	gradePillNum: {
		fontSize: 15,
		fontWeight: "800",
	},
	gradePillCount: {
		fontSize: 12,
		fontWeight: "700",
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
		backgroundColor: "rgba(142, 142, 147, 0.12)",
		borderRadius: RADIUS.button,
		padding: 3,
		marginBottom: 14,
	},
	segmentBtn: {
		flex: 1,
		paddingVertical: 8,
		borderRadius: RADIUS.button - 3,
		alignItems: "center",
		justifyContent: "center",
	},
	segmentBtnActive: {
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.1,
		shadowRadius: 2,
		elevation: 1,
	},
	segmentBtnText: {
		fontSize: 13,
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
		width: 22,
		height: 22,
		borderRadius: 5,
		alignItems: "center",
		justifyContent: "center",
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
	},
	entryGradeBadge: {
		width: 28,
		height: 28,
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
		width: 32,
		height: 32,
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
	storageCard: {
		borderRadius: RADIUS.card,
		borderWidth: 1,
		padding: 16,
		marginTop: 8,
	},
	storageCardHeader: {
		flexDirection: "row",
		alignItems: "center",
		marginBottom: 10,
	},
	storageIconWrap: {
		width: 38,
		height: 38,
		borderRadius: 12,
		alignItems: "center",
		justifyContent: "center",
		marginRight: 12,
	},
	storageHeaderTitles: {
		flex: 1,
	},
	storageCardTitle: {
		fontSize: 15,
		fontWeight: "700",
	},
	storageCardSubtitle: {
		fontSize: 11,
		fontWeight: "500",
		marginTop: 1,
	},
	storageDesc: {
		fontSize: 12,
		lineHeight: 16,
		marginBottom: 10,
	},
	pathBox: {
		flexDirection: "row",
		alignItems: "center",
		padding: 10,
		borderRadius: RADIUS.input,
		borderWidth: StyleSheet.hairlineWidth,
		marginBottom: 10,
	},
	pathText: {
		fontSize: 11,
		fontWeight: "600",
		flex: 1,
		lineHeight: 15,
	},
	storageStatsRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		marginBottom: 12,
	},
	storageStatText: {
		fontSize: 11,
	},
	storageActionsGrid: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: 8,
	},
	storageActionBtn: {
		width: "48%",
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		paddingVertical: 10,
		paddingHorizontal: 8,
		borderRadius: RADIUS.button,
		borderWidth: StyleSheet.hairlineWidth,
	},
	storageActionBtnText: {
		fontSize: 12,
		fontWeight: "600",
	},
});
