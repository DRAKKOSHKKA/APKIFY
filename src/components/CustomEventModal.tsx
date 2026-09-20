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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { ThemeColors } from "../theme/colors";
import { RADIUS, SPACING } from "../theme/tokens";
import { CustomEvent, EventCategory } from "../types/events";

interface CustomEventModalProps {
	visible: boolean;
	eventToEdit?: CustomEvent | null;
	initialDate?: string;
	theme: ThemeColors;
	onSave: (
		eventData: Omit<CustomEvent, "id" | "createdAt" | "updatedAt"> & {
			id?: string;
		}
	) => Promise<void>;
	onDelete?: (id: string) => Promise<void>;
	onClose: () => void;
}

const CATEGORY_PRESETS: {
	label: string;
	category: EventCategory;
	icon: keyof typeof Ionicons.glyphMap;
	color: string;
}[] = [
	{
		label: "Кружок",
		category: "club",
		icon: "code-working",
		color: "#AF52DE",
	},
	{
		label: "Секция",
		category: "section",
		icon: "basketball-outline",
		color: "#FF9500",
	},
	{
		label: "Консультация",
		category: "consultation",
		icon: "help-buoy-outline",
		color: "#007AFF",
	},
	{
		label: "Факультатив",
		category: "elective",
		icon: "book-outline",
		color: "#34C759",
	},
	{
		label: "Событие",
		category: "event",
		icon: "star-outline",
		color: "#FF2D55",
	},
];

const TIME_PRESETS = [
	{ label: "14:40 — 16:00", start: "14:40", end: "16:00" },
	{ label: "15:00 — 16:30", start: "15:00", end: "16:30" },
	{ label: "16:00 — 17:30", start: "16:00", end: "17:30" },
	{ label: "17:00 — 18:30", start: "17:00", end: "18:30" },
];

const COLOR_OPTIONS = [
	"#AF52DE", // Фиолетовый
	"#007AFF", // Синий
	"#34C759", // Зеленый
	"#FF9500", // Оранжевый
	"#FF2D55", // Розовый
	"#5856D6", // Индиго
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
	const [color, setColor] = useState("#AF52DE");
	const [category, setCategory] = useState<EventCategory>("club");
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
				setColor(eventToEdit.color || "#AF52DE");
				setCategory(eventToEdit.category || "club");
			} else {
				setTitle("");
				setDate(initialDate || getTodayFormatted());
				setStartTime("15:00");
				setEndTime("16:30");
				setRoom("");
				setTeacher("");
				setNote("");
				setColor("#AF52DE");
				setCategory("club");
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

	const handleSelectCategory = (preset: (typeof CATEGORY_PRESETS)[0]) => {
		try {
			Haptics.selectionAsync();
		} catch {}
		setCategory(preset.category);
		setColor(preset.color);
		if (!title.trim()) {
			setTitle(`${preset.label}`);
		}
	};

	const handleSelectTimePreset = (preset: (typeof TIME_PRESETS)[0]) => {
		try {
			Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
		} catch {}
		setStartTime(preset.start);
		setEndTime(preset.end);
	};

	const handleSave = async () => {
		if (!title.trim() || !date.trim()) {
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
				id: eventToEdit?.id,
				title: title.trim(),
				date: date.trim(),
				startTime: startTime.trim(),
				endTime: endTime.trim() ? endTime.trim() : undefined,
				time:
					startTime.trim() && endTime.trim()
						? `${startTime.trim()} - ${endTime.trim()}`
						: startTime.trim(),
				room: room.trim() ? room.trim() : undefined,
				teacher: teacher.trim() ? teacher.trim() : undefined,
				note: note.trim() ? note.trim() : undefined,
				color,
				category,
			});
			onClose();
		} catch (err) {
			console.warn("Ошибка сохранения события:", err);
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleDelete = async () => {
		if (!eventToEdit?.id || !onDelete) return;
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
						behavior={
							Platform.OS === "ios" ? "padding" : undefined
						}
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
							{/* Шапка модального окна */}
							<View
								style={[
									styles.header,
									{ borderBottomColor: theme.separator },
								]}
							>
								<View style={styles.headerTitleWrap}>
									<Text
										style={[
											styles.modalTitle,
											{ color: theme.text },
										]}
										numberOfLines={1}
									>
										{isEditing
											? "Редактировать событие"
											: "Новое событие или кружок"}
									</Text>
									<Text
										style={[
											styles.modalSubtitle,
											{ color: theme.textSecondary },
										]}
									>
										{date}
										{startTime
											? ` • ${startTime}${endTime ? ` — ${endTime}` : ""}`
											: ""}
									</Text>
								</View>
								<TouchableOpacity
									style={[
										styles.closeButton,
										{
											backgroundColor:
												theme.chipBackground,
										},
									]}
									activeOpacity={0.7}
									onPress={onClose}
								>
									<Ionicons
										name="close"
										size={18}
										color={theme.textSecondary}
									/>
								</TouchableOpacity>
							</View>

							<ScrollView
								style={styles.scrollArea}
								contentContainerStyle={styles.scrollContent}
								showsVerticalScrollIndicator={false}
								keyboardShouldPersistTaps="handled"
							>
								{/* Категории событий */}
								<View style={styles.fieldGroup}>
									<Text
										style={[
											styles.fieldLabel,
											{ color: theme.textSecondary },
										]}
									>
										ТИП СОБЫТИЯ
									</Text>
									<ScrollView
										horizontal
										showsHorizontalScrollIndicator={false}
										contentContainerStyle={
											styles.categoryChipsRow
										}
									>
										{CATEGORY_PRESETS.map((item) => {
											const isSelected =
												category === item.category;
											return (
												<TouchableOpacity
													key={item.category}
													style={[
														styles.categoryChip,
														{
															backgroundColor:
																isSelected
																	? item.color +
																		"20"
																	: theme.chipBackground,
															borderColor:
																isSelected
																	? item.color
																	: theme.border,
														},
													]}
													activeOpacity={0.75}
													onPress={() =>
														handleSelectCategory(
															item
														)
													}
												>
													<Ionicons
														name={item.icon}
														size={14}
														color={
															isSelected
																? item.color
																: theme.textSecondary
														}
														style={{
															marginRight: 5,
														}}
													/>
													<Text
														style={[
															styles.categoryChipText,
															{
																color: isSelected
																	? item.color
																	: theme.text,
																fontWeight:
																	isSelected
																		? "700"
																		: "500",
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

								{/* Название события */}
								<View style={styles.fieldGroup}>
									<Text
										style={[
											styles.fieldLabel,
											{ color: theme.textSecondary },
										]}
									>
										НАЗВАНИЕ *
									</Text>
									<TextInput
										style={[
											styles.textInput,
											{
												backgroundColor:
													theme.chipBackground,
												borderColor: theme.border,
												color: theme.text,
											},
										]}
										placeholder="Например: Кружок программирования, Волейбол..."
										placeholderTextColor={
											theme.textSecondary
										}
										value={title}
										onChangeText={setTitle}
									/>
								</View>

								{/* Дата и время */}
								<View style={styles.fieldGroup}>
									<Text
										style={[
											styles.fieldLabel,
											{ color: theme.textSecondary },
										]}
									>
										ВРЕМЯ И ДАТА
									</Text>
									<View style={styles.dateTimeRow}>
										<View style={styles.timeInputCol}>
											<Text
												style={[
													styles.subLabel,
													{
														color: theme.textSecondary,
													},
												]}
											>
												Начало:
											</Text>
											<TextInput
												style={[
													styles.textInput,
													styles.timeInput,
													{
														backgroundColor:
															theme.chipBackground,
														borderColor:
															theme.border,
														color: theme.text,
													},
												]}
												placeholder="15:00"
												placeholderTextColor={
													theme.textSecondary
												}
												value={startTime}
												onChangeText={setStartTime}
											/>
										</View>

										<View style={styles.timeInputCol}>
											<Text
												style={[
													styles.subLabel,
													{
														color: theme.textSecondary,
													},
												]}
											>
												Окончание:
											</Text>
											<TextInput
												style={[
													styles.textInput,
													styles.timeInput,
													{
														backgroundColor:
															theme.chipBackground,
														borderColor:
															theme.border,
														color: theme.text,
													},
												]}
												placeholder="16:30"
												placeholderTextColor={
													theme.textSecondary
												}
												value={endTime}
												onChangeText={setEndTime}
											/>
										</View>

										<View style={styles.dateInputCol}>
											<Text
												style={[
													styles.subLabel,
													{
														color: theme.textSecondary,
													},
												]}
											>
												Дата:
											</Text>
											<TextInput
												style={[
													styles.textInput,
													styles.dateInput,
													{
														backgroundColor:
															theme.chipBackground,
														borderColor:
															theme.border,
														color: theme.text,
													},
												]}
												placeholder="ДД.ММ.ГГГГ"
												placeholderTextColor={
													theme.textSecondary
												}
												value={date}
												onChangeText={setDate}
											/>
										</View>
									</View>

									{/* Быстрые пресеты времени после пар */}
									<ScrollView
										horizontal
										showsHorizontalScrollIndicator={false}
										contentContainerStyle={
											styles.timePresetsRow
										}
									>
										{TIME_PRESETS.map((preset) => {
											const isSelected =
												startTime === preset.start &&
												endTime === preset.end;
											return (
												<TouchableOpacity
													key={preset.label}
													style={[
														styles.timePresetChip,
														{
															backgroundColor:
																isSelected
																	? color +
																		"20"
																	: theme.chipBackground,
															borderColor:
																isSelected
																	? color
																	: theme.border,
														},
													]}
													activeOpacity={0.7}
													onPress={() =>
														handleSelectTimePreset(
															preset
														)
													}
												>
													<Text
														style={[
															styles.timePresetText,
															{
																color: isSelected
																	? color
																	: theme.textSecondary,
																fontWeight:
																	isSelected
																		? "700"
																		: "500",
															},
														]}
													>
														{preset.label}
													</Text>
												</TouchableOpacity>
											);
										})}
									</ScrollView>
								</View>

								{/* Кабинет и преподаватель */}
								<View style={styles.twoColsRow}>
									<View
										style={[
											styles.fieldGroup,
											{ flex: 1 },
										]}
									>
										<Text
											style={[
												styles.fieldLabel,
												{ color: theme.textSecondary },
											]}
										>
											КАБИНЕТ / ЗАЛ
										</Text>
										<TextInput
											style={[
												styles.textInput,
												{
													backgroundColor:
														theme.chipBackground,
													borderColor:
														theme.border,
													color: theme.text,
												},
											]}
											placeholder="каб. 312а"
											placeholderTextColor={
												theme.textSecondary
											}
											value={room}
											onChangeText={setRoom}
										/>
									</View>

									<View
										style={[
											styles.fieldGroup,
											{ flex: 1.2 },
										]}
									>
										<Text
											style={[
												styles.fieldLabel,
												{ color: theme.textSecondary },
											]}
										>
											ПРЕПОДАВАТЕЛЬ / ТРЕНЕР
										</Text>
										<TextInput
											style={[
												styles.textInput,
												{
													backgroundColor:
														theme.chipBackground,
													borderColor:
														theme.border,
													color: theme.text,
												},
											]}
											placeholder="Иванов И.И."
											placeholderTextColor={
												theme.textSecondary
											}
											value={teacher}
											onChangeText={setTeacher}
										/>
									</View>
								</View>

								{/* Заметки / памятка */}
								<View style={styles.fieldGroup}>
									<Text
										style={[
											styles.fieldLabel,
											{ color: theme.textSecondary },
										]}
									>
										ЗАМЕТКА / ЧТО ВЗЯТЬ С СОБОЙ
									</Text>
									<TextInput
										style={[
											styles.noteInput,
											{
												backgroundColor:
													theme.chipBackground,
												borderColor: theme.border,
												color: theme.text,
											},
										]}
										placeholder="Например: Взять спортивную форму, ноутбук с зарядкой..."
										placeholderTextColor={
											theme.textSecondary
										}
										multiline
										numberOfLines={3}
										textAlignVertical="top"
										value={note}
										onChangeText={setNote}
									/>
								</View>

								{/* Выбор цвета плашки */}
								<View style={styles.fieldGroup}>
									<Text
										style={[
											styles.fieldLabel,
											{ color: theme.textSecondary },
										]}
									>
										ЦВЕТ ПЛАШКИ
									</Text>
									<View style={styles.colorsRow}>
										{COLOR_OPTIONS.map((c) => {
											const isSelected = color === c;
											return (
												<TouchableOpacity
													key={c}
													style={[
														styles.colorCircle,
														{ backgroundColor: c },
														isSelected &&
															styles.colorCircleSelected,
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
															size={16}
															color="#FFFFFF"
														/>
													)}
												</TouchableOpacity>
											);
										})}
									</View>
								</View>
							</ScrollView>

							{/* Нижняя панель действий */}
							<View
								style={[
									styles.actionsRow,
									{ borderTopColor: theme.separator },
								]}
							>
								{isEditing && onDelete && (
									<TouchableOpacity
										style={[
											styles.deleteBtn,
											{
												borderColor:
													theme.danger ||
													"#FF3B30",
											},
										]}
										activeOpacity={0.7}
										onPress={handleDelete}
										disabled={isSubmitting}
									>
										<Ionicons
											name="trash-outline"
											size={18}
											color={
												theme.danger || "#FF3B30"
											}
										/>
									</TouchableOpacity>
								)}

								<TouchableOpacity
									style={[
										styles.cancelBtn,
										{
											backgroundColor:
												theme.chipBackground,
										},
									]}
									activeOpacity={0.7}
									onPress={onClose}
									disabled={isSubmitting}
								>
									<Text
										style={[
											styles.cancelBtnText,
											{ color: theme.text },
										]}
									>
										Отмена
									</Text>
								</TouchableOpacity>

								<TouchableOpacity
									style={[
										styles.saveBtn,
										{
											backgroundColor: color,
											opacity:
												!title.trim() ||
												isSubmitting
													? 0.5
													: 1,
										},
									]}
									activeOpacity={0.75}
									onPress={handleSave}
									disabled={
										!title.trim() || isSubmitting
									}
								>
									<Text style={styles.saveBtnText}>
										Сохранить
									</Text>
								</TouchableOpacity>
							</View>
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
		backgroundColor: "rgba(0, 0, 0, 0.5)",
		justifyContent: "center",
		alignItems: "center",
		padding: 20,
	},
	keyboardContainer: {
		width: "100%",
		maxWidth: 480,
	},
	modalContent: {
		borderRadius: RADIUS.modal,
		borderWidth: StyleSheet.hairlineWidth,
		overflow: "hidden",
		maxHeight: "88%",
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 10 },
		shadowOpacity: 0.25,
		shadowRadius: 20,
		elevation: 12,
	},
	header: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingHorizontal: SPACING.cardPadding,
		paddingTop: 16,
		paddingBottom: 12,
		borderBottomWidth: StyleSheet.hairlineWidth,
	},
	headerTitleWrap: {
		flex: 1,
		marginRight: 10,
	},
	modalTitle: {
		fontSize: 18,
		fontWeight: "700",
		letterSpacing: -0.3,
	},
	modalSubtitle: {
		fontSize: 12,
		fontWeight: "500",
		marginTop: 2,
	},
	closeButton: {
		width: 32,
		height: 32,
		borderRadius: 16,
		alignItems: "center",
		justifyContent: "center",
	},
	scrollArea: {
		maxHeight: 460,
	},
	scrollContent: {
		paddingHorizontal: SPACING.cardPadding,
		paddingTop: 12,
		paddingBottom: 16,
		gap: 14,
	},
	fieldGroup: {
		gap: 6,
	},
	fieldLabel: {
		fontSize: 11,
		fontWeight: "700",
		letterSpacing: 0.5,
	},
	subLabel: {
		fontSize: 11,
		fontWeight: "600",
		marginBottom: 3,
	},
	textInput: {
		fontSize: 15,
		fontWeight: "500",
		paddingHorizontal: 14,
		paddingVertical: 10,
		borderRadius: RADIUS.input,
		borderWidth: StyleSheet.hairlineWidth,
	},
	dateTimeRow: {
		flexDirection: "row",
		gap: 8,
	},
	timeInputCol: {
		flex: 1,
	},
	dateInputCol: {
		flex: 1.4,
	},
	timeInput: {
		textAlign: "center",
		fontWeight: "700",
	},
	dateInput: {
		textAlign: "center",
		fontWeight: "600",
	},
	twoColsRow: {
		flexDirection: "row",
		gap: 10,
	},
	categoryChipsRow: {
		flexDirection: "row",
		gap: 8,
		paddingVertical: 2,
	},
	categoryChip: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 10,
		paddingVertical: 7,
		borderRadius: RADIUS.capsule,
		borderWidth: 1,
	},
	categoryChipText: {
		fontSize: 12,
	},
	timePresetsRow: {
		flexDirection: "row",
		gap: 6,
		marginTop: 4,
	},
	timePresetChip: {
		paddingHorizontal: 10,
		paddingVertical: 5,
		borderRadius: RADIUS.capsule,
		borderWidth: 1,
	},
	timePresetText: {
		fontSize: 11,
	},
	noteInput: {
		minHeight: 64,
		borderRadius: RADIUS.input,
		borderWidth: StyleSheet.hairlineWidth,
		padding: 12,
		fontSize: 14,
		lineHeight: 19,
	},
	colorsRow: {
		flexDirection: "row",
		gap: 12,
		paddingVertical: 4,
	},
	colorCircle: {
		width: 32,
		height: 32,
		borderRadius: 16,
		alignItems: "center",
		justifyContent: "center",
	},
	colorCircleSelected: {
		transform: [{ scale: 1.15 }],
		borderWidth: 2.5,
		borderColor: "#FFFFFF",
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.3,
		shadowRadius: 4,
		elevation: 4,
	},
	actionsRow: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: SPACING.cardPadding,
		paddingVertical: 14,
		borderTopWidth: StyleSheet.hairlineWidth,
		gap: 10,
	},
	deleteBtn: {
		width: 44,
		height: 44,
		borderRadius: RADIUS.button,
		borderWidth: 1.5,
		alignItems: "center",
		justifyContent: "center",
	},
	cancelBtn: {
		flex: 1,
		paddingVertical: 12,
		borderRadius: RADIUS.button,
		alignItems: "center",
		justifyContent: "center",
	},
	cancelBtnText: {
		fontSize: 14,
		fontWeight: "600",
	},
	saveBtn: {
		flex: 1.4,
		paddingVertical: 12,
		borderRadius: RADIUS.button,
		alignItems: "center",
		justifyContent: "center",
	},
	saveBtnText: {
		color: "#FFFFFF",
		fontSize: 14,
		fontWeight: "700",
	},
});
