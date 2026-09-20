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
import { CustomEvent } from "../types/events";

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
	"#34C759", // Apple Зеленый
	"#00C7BE", // Apple Бирюзовый
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
			} else {
				setTitle("");
				setDate(initialDate || getTodayFormatted());
				setStartTime("15:00");
				setEndTime("16:30");
				setRoom("");
				setTeacher("");
				setNote("");
				setColor("#007AFF");
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

	const handleSave = async () => {
		if (!title.trim() || !date.trim()) {
			Alert.alert("Ошибка", "Пожалуйста, введите название события и дату.");
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
									{isEditing ? "Редактирование" : "Новое событие"}
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
								{/* Секция: Название */}
								<View style={styles.section}>
									<Text
										style={[
											styles.sectionHeader,
											{ color: theme.textSecondary },
										]}
									>
										НАЗВАНИЕ
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
												{ color: theme.text },
											]}
											placeholder="Например: Робототехника, Спорт, Консультация..."
											placeholderTextColor={theme.textSecondary}
											value={title}
											onChangeText={setTitle}
											autoFocus={!isEditing}
										/>
									</View>
								</View>

								{/* Секция: Время и дата */}
								<View style={styles.section}>
									<Text
										style={[
											styles.sectionHeader,
											{ color: theme.textSecondary },
										]}
									>
										ВРЕМЯ И ДАТА
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
												Конец
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
												Дата
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
								</View>

								{/* Секция: Место и преподаватель */}
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

								{/* Секция: Заметка */}
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
											placeholder="Дополнительные детали, что взять с собой..."
											placeholderTextColor={theme.textSecondary}
											value={note}
											onChangeText={setNote}
											multiline
											numberOfLines={3}
											textAlignVertical="top"
										/>
									</View>
								</View>

								{/* Секция: Цвет метки */}
								<View style={styles.section}>
									<Text
										style={[
											styles.sectionHeader,
											{ color: theme.textSecondary },
										]}
									>
										ЦВЕТОВАЯ МЕТКА
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
												borderColor: "#FF3B30" + "40",
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
		maxHeight: "90%",
	},
	modalContent: {
		borderRadius: 22,
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
		maxHeight: 520,
	},
	scrollContent: {
		paddingHorizontal: 16,
		paddingTop: 14,
		paddingBottom: 24,
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
	textInput: {
		fontSize: 15,
		paddingHorizontal: 14,
		paddingVertical: 11,
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
		minWidth: 80,
	},
	inlineTextInput: {
		flex: 1,
		fontSize: 15,
		textAlign: "right",
		fontWeight: "500",
		paddingVertical: 0,
	},
	rowDivider: {
		height: StyleSheet.hairlineWidth,
		marginLeft: 14,
	},
	colorsPaletteRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingVertical: 4,
		paddingHorizontal: 4,
	},
	colorCircle: {
		width: 38,
		height: 38,
		borderRadius: 19,
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
		marginTop: 8,
	},
	deleteButtonText: {
		fontSize: 15,
		fontWeight: "600",
		color: "#FF3B30",
	},
});
