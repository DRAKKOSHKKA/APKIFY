import React, { useState, useEffect } from "react";
import {
	StyleSheet,
	Text,
	View,
	Modal,
	TouchableOpacity,
	TextInput,
	KeyboardAvoidingView,
	Platform,
	ScrollView,
	TouchableWithoutFeedback,
	Keyboard,
	Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { ThemeColors } from "../theme/colors";
import { RADIUS, SPACING } from "../theme/tokens";
import {
	CustomEvent,
	EventRepeatType,
	EventPriority,
	EventSubgroup,
} from "../types/events";

interface CustomEventModalProps {
	visible: boolean;
	eventToEdit?: CustomEvent | null;
	initialDate?: string;
	theme: ThemeColors;
	onSave: (
		eventData: Omit<
			CustomEvent,
			"id" | "createdAt" | "updatedAt"
		> & {
			id?: string;
		}
	) => Promise<void>;
	onDelete?: (id: string) => Promise<void>;
	onClose: () => void;
}

const COLOR_OPTIONS = [
	"#007AFF", // Apple Синий
	"#5856D6", // Apple Индиго
	"#AF52DE", // Apple Фиолетовый
	"#FF2D55", // Apple Розовый
	"#FF9500", // Apple Оранжевый
	"#FFCC00", // Apple Янтарный
	"#34C759", // Apple Зеленый
	"#00C7BE", // Apple Бирюзовый
];

const ICON_OPTIONS: { name: keyof typeof Ionicons.glyphMap; label: string }[] = [
	{ name: "school-outline", label: "Учёба" },
	{ name: "code-slash-outline", label: "IT / Код" },
	{ name: "fitness-outline", label: "Спорт" },
	{ name: "football-outline", label: "Игры" },
	{ name: "flask-outline", label: "Наука" },
	{ name: "color-palette-outline", label: "Арт" },
	{ name: "musical-notes-outline", label: "Музыка" },
	{ name: "language-outline", label: "Языки" },
	{ name: "briefcase-outline", label: "Проект" },
	{ name: "chatbubbles-outline", label: "Консультация" },
	{ name: "flash-outline", label: "Дежурство" },
	{ name: "trophy-outline", label: "Олимпиада" },
	{ name: "people-outline", label: "Собрание" },
	{ name: "bookmark-outline", label: "Заметка" },
	{ name: "calendar-outline", label: "Событие" },
	{ name: "alarm-outline", label: "Дедлайн" },
];

const REPEAT_OPTIONS: { type: EventRepeatType; label: string; sublabel: string }[] = [
	{ type: "none", label: "Не повторять", sublabel: "Только в выбранный день" },
	{ type: "weekly", label: "Каждую неделю", sublabel: "В этот же день недели" },
	{ type: "biweekly", label: "Раз в 2 недели", sublabel: "Через неделю (чёт/нечёт)" },
	{ type: "weekdays", label: "По будням", sublabel: "С понедельника по пятницу" },
	{ type: "daily", label: "Каждый день", sublabel: "Ежедневно без выходных" },
	{ type: "custom_days", label: "Выбранные дни", sublabel: "Настроить дни недели" },
];

const WEEKDAYS = [
	{ day: 1, label: "Пн" },
	{ day: 2, label: "Вт" },
	{ day: 3, label: "Ср" },
	{ day: 4, label: "Чт" },
	{ day: 5, label: "Пт" },
	{ day: 6, label: "Сб" },
];

export const CustomEventModal: React.FC<CustomEventModalProps> = ({
	visible,
	eventToEdit,
	initialDate,
	theme,
	onSave,
	onDelete,
	onClose,
}) => {
	const [title, setTitle] = useState("");
	const [date, setDate] = useState("");
	const [startTime, setStartTime] = useState("15:00");
	const [endTime, setEndTime] = useState("16:30");
	const [room, setRoom] = useState("");
	const [teacher, setTeacher] = useState("");
	const [note, setNote] = useState("");
	const [color, setColor] = useState("#007AFF");
	const [icon, setIcon] = useState<string>("school-outline");
	const [repeatType, setRepeatType] = useState<EventRepeatType>("none");
	const [repeatDays, setRepeatDays] = useState<number[]>([1, 3, 5]);
	const [repeatUntil, setRepeatUntil] = useState("");
	const [priority, setPriority] = useState<EventPriority>("normal");
	const [subgroup, setSubgroup] = useState<EventSubgroup>("all");
	const [isSubmitting, setIsSubmitting] = useState(false);

	useEffect(() => {
		if (visible) {
			if (eventToEdit) {
				setTitle(eventToEdit.title || "");
				setDate(eventToEdit.date || "");
				setStartTime(eventToEdit.startTime || "15:00");
				setEndTime(eventToEdit.endTime || "16:30");
				setRoom(eventToEdit.room || "");
				setTeacher(eventToEdit.teacher || "");
				setNote(eventToEdit.note || "");
				setColor(eventToEdit.color || "#007AFF");
				setIcon(eventToEdit.icon || "school-outline");
				setRepeatType(eventToEdit.repeatType || "none");
				setRepeatDays(eventToEdit.repeatDays || [1, 3, 5]);
				setRepeatUntil(eventToEdit.repeatUntil || "");
				setPriority(eventToEdit.priority || "normal");
				setSubgroup(eventToEdit.subgroup || "all");
			} else {
				setTitle("");
				setDate(initialDate || getTodayFormatted());
				setStartTime("15:00");
				setEndTime("16:30");
				setRoom("");
				setTeacher("");
				setNote("");
				setColor("#007AFF");
				setIcon("school-outline");
				setRepeatType("none");
				setRepeatDays([1, 3, 5]);
				setRepeatUntil("");
				setPriority("normal");
				setSubgroup("all");
			}
		}
	}, [visible, eventToEdit, initialDate]);

	const getTodayFormatted = () => {
		const today = new Date();
		const d = String(today.getDate()).padStart(2, "0");
		const m = String(today.getMonth() + 1).padStart(2, "0");
		const y = today.getFullYear();
		return `${d}.${m}.${y}`;
	};

	const toggleRepeatDay = (day: number) => {
		try {
			Haptics.selectionAsync();
		} catch {}
		setRepeatDays((prev) => {
			if (prev.includes(day)) {
				if (prev.length <= 1) return prev; // Минимум 1 день
				return prev.filter((d) => d !== day);
			}
			return [...prev, day].sort();
		});
	};

	const handleSave = async () => {
		if (!title.trim() || !date.trim()) {
			Alert.alert(
				"Ошибка",
				"Пожалуйста, введите название события и дату."
			);
			return;
		}

		setIsSubmitting(true);
		try {
			try {
				Haptics.notificationAsync(
					Haptics.NotificationFeedbackType.Success
				);
			} catch {}

			await onSave({
				...(eventToEdit?.id ? { id: eventToEdit.id } : {}),
				title: title.trim(),
				date: date.trim(),
				startTime: startTime.trim(),
				endTime: endTime.trim(),
				room: room.trim(),
				teacher: teacher.trim(),
				note: note.trim(),
				color,
				icon,
				repeatType,
				repeatDays: repeatType === "custom_days" ? repeatDays : undefined,
				repeatUntil: repeatUntil.trim() || undefined,
				priority,
				subgroup,
			});
			onClose();
		} catch (err) {
			console.warn("Ошибка сохранения события:", err);
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleDeletePrompt = () => {
		if (!eventToEdit || !onDelete) return;

		Alert.alert(
			"Удалить событие?",
			`Вы действительно хотите удалить «${eventToEdit.title}»?`,
			[
				{ text: "Отмена", style: "cancel" },
				{
					text: "Удалить",
					style: "destructive",
					onPress: handleDelete,
				},
			]
		);
	};

	const handleDelete = async () => {
		if (!eventToEdit || !onDelete) return;

		try {
			try {
				Haptics.notificationAsync(
					Haptics.NotificationFeedbackType.Warning
				);
			} catch {}
			setIsSubmitting(true);
			await onDelete(eventToEdit.id);
			onClose();
		} catch (err) {
			console.warn("Ошибка удаления события:", err);
		} finally {
			setIsSubmitting(false);
		}
	};

	const isEditing = !!eventToEdit;

	return (
		<Modal
			visible={visible}
			transparent
			animationType="fade"
			onRequestClose={onClose}
		>
			<TouchableWithoutFeedback onPress={Keyboard.dismiss}>
				<View style={styles.overlay}>
					<KeyboardAvoidingView
						behavior={Platform.OS === "ios" ? "padding" : undefined}
						style={styles.keyboardContainer}
					>
						<View
							style={[
								styles.modalContent,
								{
									backgroundColor: theme.card,
									borderColor: theme.border,
								},
							]}
						>
							{/* iOS-стиль шапки модального окна */}
							<View
								style={[
									styles.header,
									{
										borderBottomColor: theme.separator,
									},
								]}
							>
								<TouchableOpacity
									style={styles.headerBtn}
									activeOpacity={0.7}
									onPress={onClose}
									disabled={isSubmitting}
								>
									<Text
										style={[
											styles.headerBtnCancel,
											{ color: theme.textSecondary },
										]}
									>
										Отмена
									</Text>
								</TouchableOpacity>

								<Text
									style={[
										styles.modalTitle,
										{ color: theme.text },
									]}
									numberOfLines={1}
								>
									{isEditing
										? "Редактирование"
										: "Новое событие"}
								</Text>

								<TouchableOpacity
									style={styles.headerBtn}
									activeOpacity={0.7}
									onPress={handleSave}
									disabled={isSubmitting}
								>
									<Text
										style={[
											styles.headerBtnSave,
											{ color: theme.accent },
										]}
									>
										Готово
									</Text>
								</TouchableOpacity>
							</View>

							<ScrollView
								style={styles.scrollArea}
								contentContainerStyle={styles.scrollContent}
								showsVerticalScrollIndicator={false}
								keyboardShouldPersistTaps="handled"
							>
								{/* 1. Секция: Название и иконка */}
								<View style={styles.section}>
									<Text
										style={[
											styles.sectionHeader,
											{ color: theme.textSecondary },
										]}
									>
										НАЗВАНИЕ И ИКОНКА
									</Text>
									<View
										style={[
											styles.groupedBox,
											{
												backgroundColor: theme.chipBackground,
												borderColor: theme.border,
											},
										]}
									>
										<View style={styles.titleWithIconRow}>
											<View
												style={[
													styles.iconPreviewBox,
													{ backgroundColor: color + "25" },
												]}
											>
												<Ionicons
													name={icon as any}
													size={22}
													color={color}
												/>
											</View>
											<TextInput
												style={[
													styles.textInput,
													styles.titleInput,
													{ color: theme.text },
												]}
												placeholder="Название (Робототехника, Спорт...)"
												placeholderTextColor={theme.textSecondary}
												value={title}
												onChangeText={setTitle}
												autoFocus={!isEditing}
											/>
										</View>
									</View>

									{/* Каталог иконок */}
									<ScrollView
										horizontal
										showsHorizontalScrollIndicator={false}
										style={styles.iconPickerScroll}
										contentContainerStyle={styles.iconPickerContent}
									>
										{ICON_OPTIONS.map((item) => {
											const isSelected = icon === item.name;
											return (
												<TouchableOpacity
													key={item.name}
													style={[
														styles.iconOptionChip,
														{
															backgroundColor: isSelected
																? color
																: theme.chipBackground,
															borderColor: isSelected
																? color
																: theme.separator,
														},
													]}
													activeOpacity={0.7}
													onPress={() => {
														try {
															Haptics.selectionAsync();
														} catch {}
														setIcon(item.name);
													}}
												>
													<Ionicons
														name={item.name}
														size={16}
														color={isSelected ? "#FFFFFF" : theme.text}
														style={{ marginRight: 4 }}
													/>
													<Text
														style={[
															styles.iconOptionText,
															{
																color: isSelected
																	? "#FFFFFF"
																	: theme.text,
																fontWeight: isSelected ? "700" : "500",
															},
														]}
													>
														{item.label}
													</Text>
												</TouchableOpacity>
											);
										})}
									</ScrollView>
								</View>

								{/* 2. Секция: Повторения */}
								<View style={styles.section}>
									<Text
										style={[
											styles.sectionHeader,
											{ color: theme.textSecondary },
										]}
									>
										ПОВТОРЕНИЕ СОБЫТИЯ
									</Text>
									<View
										style={[
											styles.groupedBox,
											{
												backgroundColor: theme.chipBackground,
												borderColor: theme.border,
											},
										]}
									>
										{REPEAT_OPTIONS.map((opt, idx) => {
											const isSelected = repeatType === opt.type;
											return (
												<React.Fragment key={opt.type}>
													{idx > 0 && (
														<View
															style={[
																styles.rowDivider,
																{ backgroundColor: theme.separator },
															]}
														/>
													)}
													<TouchableOpacity
														style={styles.repeatRow}
														activeOpacity={0.7}
														onPress={() => {
															try {
																Haptics.selectionAsync();
															} catch {}
															setRepeatType(opt.type);
														}}
													>
														<View style={{ flex: 1, paddingRight: 10 }}>
															<Text
																style={[
																	styles.repeatRowTitle,
																	{
																		color: isSelected
																			? theme.accent
																			: theme.text,
																		fontWeight: isSelected
																			? "700"
																			: "500",
																	},
																]}
															>
																{opt.label}
															</Text>
															<Text
																style={[
																	styles.repeatRowSub,
																	{ color: theme.textSecondary },
																]}
															>
																{opt.sublabel}
															</Text>
														</View>
														{isSelected ? (
															<Ionicons
																name="checkmark-circle"
																size={20}
																color={theme.accent}
															/>
														) : (
															<View
																style={[
																	styles.radioCircle,
																	{ borderColor: theme.separator },
																]}
															/>
														)}
													</TouchableOpacity>
												</React.Fragment>
											);
										})}
									</View>

									{/* Если выбраны кастомные дни недели */}
									{repeatType === "custom_days" && (
										<View style={styles.customDaysContainer}>
											<Text
												style={[
													styles.fieldSubNotice,
													{ color: theme.textSecondary },
												]}
											>
												Выберите дни проведения:
											</Text>
											<View style={styles.weekdaysRow}>
												{WEEKDAYS.map((wd) => {
													const isChecked = repeatDays.includes(wd.day);
													return (
														<TouchableOpacity
															key={wd.day}
															style={[
																styles.weekdayBtn,
																{
																	backgroundColor: isChecked
																		? theme.accent
																		: theme.chipBackground,
																	borderColor: isChecked
																		? theme.accent
																		: theme.separator,
																},
															]}
															activeOpacity={0.7}
															onPress={() => toggleRepeatDay(wd.day)}
														>
															<Text
																style={[
																	styles.weekdayBtnText,
																	{
																		color: isChecked
																			? "#FFFFFF"
																			: theme.text,
																		fontWeight: isChecked
																			? "700"
																			: "500",
																	},
																]}
															>
																{wd.label}
															</Text>
														</TouchableOpacity>
													);
												})}
											</View>
										</View>
									)}

									{/* Дата окончания повторений */}
									{repeatType !== "none" && (
										<View
											style={[
												styles.groupedBox,
												{
													backgroundColor: theme.chipBackground,
													borderColor: theme.border,
													marginTop: 8,
												},
											]}
										>
											<View style={styles.inputRow}>
												<Text
													style={[
														styles.inputRowLabel,
														{ color: theme.textSecondary },
													]}
												>
													Повторять до
												</Text>
												<TextInput
													style={[
														styles.inlineTextInput,
														{ color: theme.text },
													]}
													placeholder="Бессрочно или ДД.ММ.ГГГГ"
													placeholderTextColor={theme.textSecondary}
													value={repeatUntil}
													onChangeText={setRepeatUntil}
												/>
											</View>
										</View>
									)}
								</View>

								{/* 3. Секция: Время и дата начала */}
								<View style={styles.section}>
									<Text
										style={[
											styles.sectionHeader,
											{ color: theme.textSecondary },
										]}
									>
										ВРЕМЯ И ДАТА НАЧАЛА
									</Text>
									<View
										style={[
											styles.groupedBox,
											{
												backgroundColor: theme.chipBackground,
												borderColor: theme.border,
											},
										]}
									>
										<View style={styles.inputRow}>
											<Text
												style={[
													styles.inputRowLabel,
													{ color: theme.textSecondary },
												]}
											>
												Начало
											</Text>
											<TextInput
												style={[
													styles.inlineTextInput,
													{ color: theme.text },
												]}
												placeholder="15:00"
												placeholderTextColor={theme.textSecondary}
												value={startTime}
												onChangeText={setStartTime}
											/>
										</View>

										<View
											style={[
												styles.rowDivider,
												{ backgroundColor: theme.separator },
											]}
										/>

										<View style={styles.inputRow}>
											<Text
												style={[
													styles.inputRowLabel,
													{ color: theme.textSecondary },
												]}
											>
												Окончание
											</Text>
											<TextInput
												style={[
													styles.inlineTextInput,
													{ color: theme.text },
												]}
												placeholder="16:30"
												placeholderTextColor={theme.textSecondary}
												value={endTime}
												onChangeText={setEndTime}
											/>
										</View>

										<View
											style={[
												styles.rowDivider,
												{ backgroundColor: theme.separator },
											]}
										/>

										<View style={styles.inputRow}>
											<Text
												style={[
													styles.inputRowLabel,
													{ color: theme.textSecondary },
												]}
											>
												Дата первого дня
											</Text>
											<TextInput
												style={[
													styles.inlineTextInput,
													{ color: theme.text },
												]}
												placeholder="ДД.ММ.ГГГГ"
												placeholderTextColor={theme.textSecondary}
												value={date}
												onChangeText={setDate}
											/>
										</View>
									</View>

									{/* Быстрые пресеты времени */}
									<View style={styles.quickTimePresets}>
										{[
											{ s: "14:00", e: "15:30", label: "14:00" },
											{ s: "15:00", e: "16:30", label: "15:00" },
											{ s: "15:40", e: "17:10", label: "15:40" },
											{ s: "17:20", e: "18:50", label: "17:20" },
										].map((preset) => (
											<TouchableOpacity
												key={preset.label}
												style={[
													styles.timePresetChip,
													{
														backgroundColor: theme.chipBackground,
														borderColor: theme.separator,
													},
												]}
												activeOpacity={0.7}
												onPress={() => {
													try {
														Haptics.selectionAsync();
													} catch {}
													setStartTime(preset.s);
													setEndTime(preset.e);
												}}
											>
												<Text
													style={[
														styles.timePresetText,
														{ color: theme.textSecondary },
													]}
												>
													{preset.s} - {preset.e}
												</Text>
											</TouchableOpacity>
										))}
									</View>
								</View>

								{/* 4. Секция: Место и преподаватель */}
								<View style={styles.section}>
									<Text
										style={[
											styles.sectionHeader,
											{ color: theme.textSecondary },
										]}
									>
										МЕСТО И ПРЕПОДАВАТЕЛЬ
									</Text>
									<View
										style={[
											styles.groupedBox,
											{
												backgroundColor: theme.chipBackground,
												borderColor: theme.border,
											},
										]}
									>
										<View style={styles.inputRow}>
											<Text
												style={[
													styles.inputRowLabel,
													{ color: theme.textSecondary },
												]}
											>
												Кабинет
											</Text>
											<TextInput
												style={[
													styles.inlineTextInput,
													{ color: theme.text },
												]}
												placeholder="Каб. 214 или спортзал..."
												placeholderTextColor={theme.textSecondary}
												value={room}
												onChangeText={setRoom}
											/>
										</View>

										<View
											style={[
												styles.rowDivider,
												{ backgroundColor: theme.separator },
											]}
										/>

										<View style={styles.inputRow}>
											<Text
												style={[
													styles.inputRowLabel,
													{ color: theme.textSecondary },
												]}
											>
												Ведущий
											</Text>
											<TextInput
												style={[
													styles.inlineTextInput,
													{ color: theme.text },
												]}
												placeholder="Преподаватель или тренер..."
												placeholderTextColor={theme.textSecondary}
												value={teacher}
												onChangeText={setTeacher}
											/>
										</View>
									</View>
								</View>

								{/* 5. Секция: Приоритет и подгруппа */}
								<View style={styles.section}>
									<Text
										style={[
											styles.sectionHeader,
											{ color: theme.textSecondary },
										]}
									>
										ПРИОРИТЕТ И ПОДГРУППА
									</Text>
									<View
										style={[
											styles.groupedBox,
											{
												backgroundColor: theme.chipBackground,
												borderColor: theme.border,
												padding: 12,
											},
										]}
									>
										{/* Приоритет */}
										<View style={styles.segmentContainer}>
											<Text
												style={[
													styles.segmentLabel,
													{ color: theme.textSecondary },
												]}
											>
												Важность:
											</Text>
											<View style={styles.segmentRow}>
												<TouchableOpacity
													style={[
														styles.segmentButton,
														priority === "normal" && {
															backgroundColor: theme.card,
															borderColor: theme.separator,
														},
													]}
													activeOpacity={0.7}
													onPress={() => {
														try {
															Haptics.selectionAsync();
														} catch {}
														setPriority("normal");
													}}
												>
													<Text
														style={[
															styles.segmentButtonText,
															{
																color:
																	priority === "normal"
																		? theme.text
																		: theme.textSecondary,
																fontWeight:
																	priority === "normal" ? "700" : "500",
															},
														]}
													>
														Обычное
													</Text>
												</TouchableOpacity>

												<TouchableOpacity
													style={[
														styles.segmentButton,
														priority === "high" && {
															backgroundColor: "#FF3B30",
															borderColor: "#FF3B30",
														},
													]}
													activeOpacity={0.7}
													onPress={() => {
														try {
															Haptics.selectionAsync();
														} catch {}
														setPriority("high");
													}}
												>
													<Ionicons
														name="alert-circle"
														size={14}
														color={
															priority === "high"
																? "#FFFFFF"
																: "#FF3B30"
														}
														style={{ marginRight: 4 }}
													/>
													<Text
														style={[
															styles.segmentButtonText,
															{
																color:
																	priority === "high"
																		? "#FFFFFF"
																		: "#FF3B30",
																fontWeight:
																	priority === "high" ? "700" : "500",
															},
														]}
													>
														Важно 🔴
													</Text>
												</TouchableOpacity>
											</View>
										</View>

										<View
											style={[
												styles.rowDivider,
												{
													backgroundColor: theme.separator,
													marginVertical: 10,
													marginLeft: 0,
												},
											]}
										/>

										{/* Подгруппа */}
										<View style={styles.segmentContainer}>
											<Text
												style={[
													styles.segmentLabel,
													{ color: theme.textSecondary },
												]}
											>
												Подгруппа:
											</Text>
											<View style={styles.segmentRow}>
												{[
													{ val: "all", label: "Для всех" },
													{ val: "1", label: "1 п/г" },
													{ val: "2", label: "2 п/г" },
												].map((sg) => {
													const isSelected = subgroup === sg.val;
													return (
														<TouchableOpacity
															key={sg.val}
															style={[
																styles.segmentButton,
																isSelected && {
																	backgroundColor: theme.accent,
																	borderColor: theme.accent,
																},
															]}
															activeOpacity={0.7}
															onPress={() => {
																try {
																	Haptics.selectionAsync();
																} catch {}
																setSubgroup(sg.val as EventSubgroup);
															}}
														>
															<Text
																style={[
																	styles.segmentButtonText,
																	{
																		color: isSelected
																			? "#FFFFFF"
																			: theme.text,
																		fontWeight: isSelected
																			? "700"
																			: "500",
																	},
																]}
															>
																{sg.label}
															</Text>
														</TouchableOpacity>
													);
												})}
											</View>
										</View>
									</View>
								</View>

								{/* 6. Секция: Заметка */}
								<View style={styles.section}>
									<Text
										style={[
											styles.sectionHeader,
											{ color: theme.textSecondary },
										]}
									>
										ЗАМЕТКА
									</Text>
									<View
										style={[
											styles.groupedBox,
											{
												backgroundColor: theme.chipBackground,
												borderColor: theme.border,
											},
										]}
									>
										<TextInput
											style={[
												styles.textInput,
												styles.textArea,
												{ color: theme.text },
											]}
											placeholder="Дополнительные детали, ссылка или что взять..."
											placeholderTextColor={theme.textSecondary}
											value={note}
											onChangeText={setNote}
											multiline
											numberOfLines={3}
											textAlignVertical="top"
										/>
									</View>
								</View>

								{/* 7. Секция: Цветовая метка */}
								<View style={styles.section}>
									<Text
										style={[
											styles.sectionHeader,
											{ color: theme.textSecondary },
										]}
									>
										ЦВЕТОВАЯ ПАЛИТРА
									</Text>
									<View style={styles.colorsPaletteRow}>
										{COLOR_OPTIONS.map((c) => {
											const isSelected = color === c;
											return (
												<TouchableOpacity
													key={c}
													style={[
														styles.colorCircle,
														{ backgroundColor: c },
														isSelected && styles.colorCircleActive,
													]}
													activeOpacity={0.8}
													onPress={() => {
														try {
															Haptics.selectionAsync();
														} catch {}
														setColor(c);
													}}
												>
													{isSelected && (
														<Ionicons
															name="checkmark"
															size={18}
															color="#FFFFFF"
														/>
													)}
												</TouchableOpacity>
											);
										})}
									</View>
								</View>

								{/* Кнопка удаления для режима редактирования */}
								{isEditing && onDelete && (
									<TouchableOpacity
										style={[
											styles.deleteButton,
											{
												backgroundColor: theme.isDark
													? "rgba(255, 59, 48, 0.12)"
													: "#FFF1F0",
												borderColor: "#FF3B3040",
											},
										]}
										activeOpacity={0.7}
										onPress={handleDeletePrompt}
										disabled={isSubmitting}
									>
										<Ionicons
											name="trash-outline"
											size={16}
											color="#FF3B30"
											style={{ marginRight: 6 }}
										/>
										<Text style={styles.deleteButtonText}>
											Удалить событие
										</Text>
									</TouchableOpacity>
								)}
							</ScrollView>
						</View>
					</KeyboardAvoidingView>
				</View>
			</TouchableWithoutFeedback>
		</Modal>
	);
};

const styles = StyleSheet.create({
	overlay: {
		flex: 1,
		backgroundColor: "rgba(0, 0, 0, 0.55)",
		justifyContent: "center",
		alignItems: "center",
		padding: 16,
	},
	keyboardContainer: {
		width: "100%",
		maxWidth: 520,
		maxHeight: "92%",
	},
	modalContent: {
		borderRadius: 24,
		borderWidth: 1,
		overflow: "hidden",
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 12 },
		shadowOpacity: 0.28,
		shadowRadius: 24,
		elevation: 12,
		maxHeight: "100%",
	},
	header: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingHorizontal: 16,
		paddingVertical: 14,
		borderBottomWidth: StyleSheet.hairlineWidth,
	},
	headerBtn: {
		minWidth: 64,
	},
	headerBtnCancel: {
		fontSize: 16,
		fontWeight: "400",
	},
	headerBtnSave: {
		fontSize: 16,
		fontWeight: "700",
		textAlign: "right",
	},
	modalTitle: {
		fontSize: 17,
		fontWeight: "700",
		textAlign: "center",
		flex: 1,
		letterSpacing: -0.2,
	},
	scrollArea: {
		maxHeight: 580,
	},
	scrollContent: {
		paddingHorizontal: 16,
		paddingTop: 14,
		paddingBottom: 28,
	},
	section: {
		marginBottom: 16,
	},
	sectionHeader: {
		fontSize: 12,
		fontWeight: "600",
		textTransform: "uppercase",
		letterSpacing: 0.5,
		marginBottom: 6,
		marginLeft: 4,
	},
	groupedBox: {
		borderRadius: 14,
		borderWidth: StyleSheet.hairlineWidth,
		overflow: "hidden",
	},
	titleWithIconRow: {
		flexDirection: "row",
		alignItems: "center",
		paddingLeft: 12,
	},
	iconPreviewBox: {
		width: 38,
		height: 38,
		borderRadius: 10,
		alignItems: "center",
		justifyContent: "center",
	},
	textInput: {
		fontSize: 15,
		paddingHorizontal: 14,
		paddingVertical: 12,
	},
	titleInput: {
		flex: 1,
		paddingLeft: 10,
		fontWeight: "600",
	},
	iconPickerScroll: {
		marginTop: 8,
	},
	iconPickerContent: {
		gap: 6,
		paddingVertical: 2,
	},
	iconOptionChip: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 10,
		paddingVertical: 7,
		borderRadius: 10,
		borderWidth: StyleSheet.hairlineWidth,
	},
	iconOptionText: {
		fontSize: 12,
	},
	repeatRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingHorizontal: 14,
		paddingVertical: 10,
	},
	repeatRowTitle: {
		fontSize: 15,
		marginBottom: 2,
	},
	repeatRowSub: {
		fontSize: 12,
	},
	radioCircle: {
		width: 20,
		height: 20,
		borderRadius: 10,
		borderWidth: 1.5,
	},
	customDaysContainer: {
		marginTop: 8,
		paddingHorizontal: 2,
	},
	fieldSubNotice: {
		fontSize: 12,
		marginBottom: 6,
		fontWeight: "500",
	},
	weekdaysRow: {
		flexDirection: "row",
		gap: 6,
		justifyContent: "space-between",
	},
	weekdayBtn: {
		flex: 1,
		paddingVertical: 8,
		borderRadius: 10,
		alignItems: "center",
		justifyContent: "center",
		borderWidth: StyleSheet.hairlineWidth,
	},
	weekdayBtnText: {
		fontSize: 13,
	},
	textArea: {
		minHeight: 68,
		paddingTop: 10,
	},
	inputRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingHorizontal: 14,
		paddingVertical: 11,
	},
	inputRowLabel: {
		fontSize: 15,
		fontWeight: "500",
		minWidth: 90,
	},
	inlineTextInput: {
		flex: 1,
		fontSize: 15,
		textAlign: "right",
		fontWeight: "500",
		paddingVertical: 0,
	},
	quickTimePresets: {
		flexDirection: "row",
		gap: 6,
		marginTop: 8,
		flexWrap: "wrap",
	},
	timePresetChip: {
		paddingHorizontal: 10,
		paddingVertical: 6,
		borderRadius: 8,
		borderWidth: StyleSheet.hairlineWidth,
	},
	timePresetText: {
		fontSize: 12,
		fontWeight: "500",
	},
	rowDivider: {
		height: StyleSheet.hairlineWidth,
		marginLeft: 14,
	},
	segmentContainer: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
	},
	segmentLabel: {
		fontSize: 14,
		fontWeight: "500",
	},
	segmentRow: {
		flexDirection: "row",
		gap: 6,
	},
	segmentButton: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 10,
		paddingVertical: 6,
		borderRadius: 8,
		borderWidth: StyleSheet.hairlineWidth,
		borderColor: "transparent",
	},
	segmentButtonText: {
		fontSize: 13,
	},
	colorsPaletteRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingVertical: 4,
		paddingHorizontal: 4,
	},
	colorCircle: {
		width: 36,
		height: 36,
		borderRadius: 18,
		alignItems: "center",
		justifyContent: "center",
	},
	colorCircleActive: {
		transform: [{ scale: 1.12 }],
		borderWidth: 2.5,
		borderColor: "#FFFFFF",
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 3 },
		shadowOpacity: 0.25,
		shadowRadius: 5,
		elevation: 4,
	},
	deleteButton: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		paddingVertical: 12,
		borderRadius: 14,
		borderWidth: 1,
		marginTop: 10,
	},
	deleteButtonText: {
		fontSize: 15,
		fontWeight: "600",
		color: "#FF3B30",
	},
});
