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
import { GradeEntry, GradeValue } from "../types/grades";

interface GradeModalProps {
	visible: boolean;
	entryToEdit?: GradeEntry | null;
	initialData?: {
		subject: string;
		date: string;
		pairIndex?: number;
		time?: string;
		room?: string;
		teacher?: string;
	} | null;
	theme: ThemeColors;
	onSave: (
		entryData: Omit<GradeEntry, "id" | "createdAt" | "updatedAt"> & {
			id?: string;
		}
	) => Promise<void>;
	onDelete?: (id: string) => Promise<void>;
	onClose: () => void;
}

const GRADE_OPTIONS: {
	label: string;
	value: GradeValue;
	color: string;
	subtleBg: string;
}[] = [
	{
		label: "5",
		value: "5",
		color: "#34C759",
		subtleBg: "rgba(52, 199, 89, 0.15)",
	},
	{
		label: "4",
		value: "4",
		color: "#007AFF",
		subtleBg: "rgba(0, 122, 255, 0.15)",
	},
	{
		label: "3",
		value: "3",
		color: "#FF9500",
		subtleBg: "rgba(255, 149, 0, 0.15)",
	},
	{
		label: "2",
		value: "2",
		color: "#FF3B30",
		subtleBg: "rgba(255, 59, 48, 0.15)",
	},
];

const EXTRA_GRADE_OPTIONS: {
	label: string;
	value: GradeValue;
	color: string;
}[] = [
	{ label: "Зачёт", value: "зачет", color: "#30D158" },
	{ label: "Незачёт", value: "незачет", color: "#FF453A" },
	{ label: "Н/А", value: "н/а", color: "#8E8E93" },
];

const HOMEWORK_TAGS = [
	"📖 Параграф",
	"✍️ Задачи",
	"💻 Лабораторная",
	"📝 Конспект",
	"🎯 Контрольная",
	"📄 Доклад",
];

export const GradeModal: React.FC<GradeModalProps> = ({
	visible,
	entryToEdit,
	initialData,
	theme,
	onSave,
	onDelete,
	onClose,
}) => {
	const [subject, setSubject] = useState("");
	const [date, setDate] = useState("");
	const [selectedGrade, setSelectedGrade] = useState<GradeValue | undefined>(
		undefined
	);
	const [homeworkText, setHomeworkText] = useState("");
	const [isHomeworkDone, setIsHomeworkDone] = useState(false);
	const [noteText, setNoteText] = useState("");
	const [pairIndex, setPairIndex] = useState<number | undefined>(undefined);
	const [time, setTime] = useState<string | undefined>(undefined);
	const [room, setRoom] = useState<string | undefined>(undefined);
	const [teacher, setTeacher] = useState<string | undefined>(undefined);
	const [isSubmitting, setIsSubmitting] = useState(false);

	useEffect(() => {
		if (visible) {
			if (entryToEdit) {
				setSubject(entryToEdit.subject || "");
				setDate(entryToEdit.date || "");
				setSelectedGrade(entryToEdit.grade);
				setHomeworkText(entryToEdit.homework || "");
				setIsHomeworkDone(entryToEdit.isHomeworkDone || false);
				setNoteText(entryToEdit.note || "");
				setPairIndex(entryToEdit.pairIndex);
				setTime(entryToEdit.time);
				setRoom(entryToEdit.room);
				setTeacher(entryToEdit.teacher);
			} else if (initialData) {
				setSubject(initialData.subject || "");
				setDate(initialData.date || "");
				setSelectedGrade(undefined);
				setHomeworkText("");
				setIsHomeworkDone(false);
				setNoteText("");
				setPairIndex(initialData.pairIndex);
				setTime(initialData.time);
				setRoom(initialData.room);
				setTeacher(initialData.teacher);
			} else {
				const today = new Date();
				const d = String(today.getDate()).padStart(2, "0");
				const m = String(today.getMonth() + 1).padStart(2, "0");
				const y = today.getFullYear();
				setSubject("");
				setDate(`${d}.${m}.${y}`);
				setSelectedGrade(undefined);
				setHomeworkText("");
				setIsHomeworkDone(false);
				setNoteText("");
				setPairIndex(undefined);
				setTime(undefined);
				setRoom(undefined);
				setTeacher(undefined);
			}
		}
	}, [visible, entryToEdit, initialData]);

	const handleGradeSelect = (val: GradeValue) => {
		try {
			Haptics.selectionAsync();
		} catch {}
		if (selectedGrade === val) {
			setSelectedGrade(undefined); // Снять выбор
		} else {
			setSelectedGrade(val);
		}
	};

	const handleTagPress = (tag: string) => {
		try {
			Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
		} catch {}
		if (!homeworkText.trim()) {
			setHomeworkText(tag + " ");
		} else if (!homeworkText.includes(tag)) {
			setHomeworkText((prev) => `${tag} • ${prev}`);
		}
	};

	const handleToggleHomeworkDone = () => {
		try {
			Haptics.selectionAsync();
		} catch {}
		setIsHomeworkDone((prev) => !prev);
	};

	const handleSave = async () => {
		if (!subject.trim()) {
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
				id: entryToEdit?.id,
				subject: subject.trim(),
				date: date.trim(),
				pairIndex,
				time,
				room,
				teacher,
				grade: selectedGrade,
				homework: homeworkText.trim() ? homeworkText.trim() : undefined,
				isHomeworkDone: homeworkText.trim() ? isHomeworkDone : undefined,
				note: noteText.trim() ? noteText.trim() : undefined,
			});
			onClose();
		} catch (err) {
			console.warn("Ошибка сохранения оценки:", err);
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleDelete = async () => {
		if (!entryToEdit?.id || !onDelete) return;
		setIsSubmitting(true);
		try {
			try {
				Haptics.notificationAsync(
					Haptics.NotificationFeedbackType.Warning
				);
			} catch {}
			await onDelete(entryToEdit.id);
			onClose();
		} catch (err) {
			console.warn("Ошибка удаления оценки:", err);
		} finally {
			setIsSubmitting(false);
		}
	};

	const isEditing = !!entryToEdit;

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
							{/* Заголовок модального окна */}
							<View style={styles.header}>
								<View style={styles.headerTitleWrap}>
									<Text
										style={[
											styles.modalTitle,
											{ color: theme.text },
										]}
										numberOfLines={1}
									>
										{isEditing
											? "Редактировать запись"
											: "Оценка и задание"}
									</Text>
									<Text
										style={[
											styles.modalSubtitle,
											{ color: theme.textSecondary },
										]}
									>
										{date}
										{pairIndex ? ` • ${pairIndex} пара` : ""}
										{time ? ` (${time})` : ""}
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
								{/* Предмет */}
								<View style={styles.fieldGroup}>
									<Text
										style={[
											styles.fieldLabel,
											{ color: theme.textSecondary },
										]}
									>
										ПРЕДМЕТ
									</Text>
									{initialData || entryToEdit ? (
										<View
											style={[
												styles.readOnlySubjectBox,
												{
													backgroundColor:
														theme.chipBackground,
													borderColor:
														theme.border,
												},
											]}
										>
											<Text
												style={[
													styles.readOnlySubjectText,
													{ color: theme.text },
												]}
											>
												{subject}
											</Text>
											{(room || teacher) && (
												<Text
													style={[
														styles.metaText,
														{
															color: theme.textSecondary,
														},
													]}
												>
													{room
														? `каб. ${room}`
														: ""}
													{room && teacher
														? " • "
														: ""}
													{teacher || ""}
												</Text>
											)}
										</View>
									) : (
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
											placeholder="Название предмета..."
											placeholderTextColor={
												theme.textSecondary
											}
											value={subject}
											onChangeText={setSubject}
										/>
									)}
								</View>

								{/* Быстрый выбор оценки (увеличенная высота плашек) */}
								<View style={styles.fieldGroup}>
									<View style={styles.gradeHeaderRow}>
										<Text
											style={[
												styles.fieldLabel,
												{
													color: theme.textSecondary,
												},
											]}
										>
											ОЦЕНКА В ЭТОТ ДЕНЬ
										</Text>
										{selectedGrade && (
											<TouchableOpacity
												onPress={() =>
													setSelectedGrade(
														undefined
													)
												}
												activeOpacity={0.7}
											>
												<Text
													style={[
														styles.clearGradeText,
														{
															color: theme.accent,
														},
													]}
												>
													Снять оценку
												</Text>
											</TouchableOpacity>
										)}
									</View>

									{/* Основные цифровые оценки 5, 4, 3, 2 */}
									<View style={styles.gradesRow}>
										{GRADE_OPTIONS.map((item) => {
											const isSelected =
												selectedGrade ===
												item.value;
											return (
												<TouchableOpacity
													key={item.value}
													style={[
														styles.gradeBtn,
														{
															backgroundColor:
																isSelected
																	? item.color
																	: item.subtleBg,
															borderColor:
																isSelected
																	? item.color
																	: "transparent",
														},
													]}
													activeOpacity={0.75}
													onPress={() =>
														handleGradeSelect(
															item.value
														)
													}
												>
													<Text
														style={[
															styles.gradeBtnText,
															{
																color: isSelected
																	? "#FFFFFF"
																	: item.color,
															},
														]}
													>
														{item.label}
													</Text>
												</TouchableOpacity>
											);
										})}
									</View>

									{/* Дополнительные оценки (Зачёт, Незачёт, Н/А) */}
									<View style={styles.extraGradesRow}>
										{EXTRA_GRADE_OPTIONS.map((item) => {
											const isSelected =
												selectedGrade ===
												item.value;
											return (
												<TouchableOpacity
													key={item.value}
													style={[
														styles.extraGradeBtn,
														{
															backgroundColor:
																isSelected
																	? item.color
																	: theme.chipBackground,
															borderColor:
																isSelected
																	? item.color
																	: theme.border,
														},
													]}
													activeOpacity={0.75}
													onPress={() =>
														handleGradeSelect(
															item.value
														)
													}
												>
													<Text
														style={[
															styles.extraGradeBtnText,
															{
																color: isSelected
																	? "#FFFFFF"
																	: theme.text,
															},
														]}
													>
														{item.label}
													</Text>
												</TouchableOpacity>
											);
										})}
									</View>
								</View>

								{/* УЛУЧШЕННЫЙ БЛОК ДОМАШНЕГО ЗАДАНИЯ (Д/З) */}
								<View style={styles.fieldGroup}>
									<View style={styles.hwHeaderRow}>
										<Text
											style={[
												styles.fieldLabel,
												{
													color: theme.textSecondary,
												},
											]}
										>
											ДОМАШНЕЕ ЗАДАНИЕ (Д/З)
										</Text>
										{homeworkText.trim().length > 0 && (
											<TouchableOpacity
												style={[
													styles.hwStatusToggle,
													{
														backgroundColor:
															isHomeworkDone
																? "rgba(52, 199, 89, 0.15)"
																: theme.chipBackground,
														borderColor:
															isHomeworkDone
																? "#34C759"
																: theme.border,
													},
												]}
												activeOpacity={0.75}
												onPress={
													handleToggleHomeworkDone
												}
											>
												<Ionicons
													name={
														isHomeworkDone
															? "checkmark-circle"
															: "ellipse-outline"
													}
													size={14}
													color={
														isHomeworkDone
															? "#34C759"
															: theme.textSecondary
													}
													style={{ marginRight: 4 }}
												/>
												<Text
													style={[
														styles.hwStatusToggleText,
														{
															color: isHomeworkDone
																? "#34C759"
																: theme.textSecondary,
														},
													]}
												>
													{isHomeworkDone
														? "Выполнено"
														: "В процессе"}
												</Text>
											</TouchableOpacity>
										)}
									</View>

									{/* Быстрые теги Д/З */}
									<ScrollView
										horizontal
										showsHorizontalScrollIndicator={false}
										contentContainerStyle={styles.hwTagsRow}
									>
										{HOMEWORK_TAGS.map((tag) => (
											<TouchableOpacity
												key={tag}
												style={[
													styles.hwTagChip,
													{
														backgroundColor:
															theme.chipBackground,
														borderColor:
															theme.border,
													},
												]}
												activeOpacity={0.7}
												onPress={() =>
													handleTagPress(tag)
												}
											>
												<Text
													style={[
														styles.hwTagChipText,
														{
															color: theme.text,
														},
													]}
												>
													{tag}
												</Text>
											</TouchableOpacity>
										))}
									</ScrollView>

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
										placeholder="Например: Параграф 4, задачи №12-16, оформить отчет по лабе..."
										placeholderTextColor={
											theme.textSecondary
										}
										multiline
										numberOfLines={3}
										textAlignVertical="top"
										value={homeworkText}
										onChangeText={setHomeworkText}
									/>
								</View>

								{/* Поле дополнительной заметки */}
								<View style={styles.fieldGroup}>
									<Text
										style={[
											styles.fieldLabel,
											{ color: theme.textSecondary },
										]}
									>
										ЗАМЕТКА К ПАРЕ (НЕОБЯЗАТЕЛЬНО)
									</Text>
									<TextInput
										style={[
											styles.smallNoteInput,
											{
												backgroundColor:
													theme.chipBackground,
												borderColor: theme.border,
												color: theme.text,
											},
										]}
										placeholder="Тема пары, вопросы преподавателю, комментарий..."
										placeholderTextColor={
											theme.textSecondary
										}
										multiline
										numberOfLines={2}
										textAlignVertical="top"
										value={noteText}
										onChangeText={setNoteText}
									/>
								</View>
							</ScrollView>

							{/* Кнопки действий */}
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
												theme.danger ||
												"#FF3B30"
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
											backgroundColor: theme.accent,
											opacity:
												!subject.trim() ||
												isSubmitting
													? 0.5
													: 1,
										},
									]}
									activeOpacity={0.75}
									onPress={handleSave}
									disabled={
										!subject.trim() || isSubmitting
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
		maxHeight: 450,
	},
	scrollContent: {
		paddingHorizontal: SPACING.cardPadding,
		paddingBottom: 16,
		gap: 16,
	},
	fieldGroup: {
		gap: 8,
	},
	fieldLabel: {
		fontSize: 11,
		fontWeight: "700",
		letterSpacing: 0.5,
	},
	readOnlySubjectBox: {
		padding: 12,
		borderRadius: RADIUS.input,
		borderWidth: StyleSheet.hairlineWidth,
	},
	readOnlySubjectText: {
		fontSize: 15,
		fontWeight: "600",
		lineHeight: 20,
	},
	metaText: {
		fontSize: 12,
		fontWeight: "500",
		marginTop: 4,
	},
	textInput: {
		fontSize: 15,
		fontWeight: "500",
		paddingHorizontal: 14,
		paddingVertical: 10,
		borderRadius: RADIUS.input,
		borderWidth: StyleSheet.hairlineWidth,
	},
	gradeHeaderRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
	},
	clearGradeText: {
		fontSize: 12,
		fontWeight: "600",
	},
	gradesRow: {
		flexDirection: "row",
		gap: 10,
	},
	// Увеличенная высота плашек оценки
	gradeBtn: {
		flex: 1,
		height: 64,
		borderRadius: RADIUS.button,
		alignItems: "center",
		justifyContent: "center",
		borderWidth: 2,
	},
	gradeBtnText: {
		fontSize: 28,
		fontWeight: "800",
	},
	extraGradesRow: {
		flexDirection: "row",
		gap: 8,
	},
	extraGradeBtn: {
		flex: 1,
		paddingVertical: 12,
		borderRadius: RADIUS.button,
		alignItems: "center",
		justifyContent: "center",
		borderWidth: StyleSheet.hairlineWidth,
	},
	extraGradeBtnText: {
		fontSize: 13,
		fontWeight: "700",
	},
	hwHeaderRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
	},
	hwStatusToggle: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: RADIUS.capsule,
		borderWidth: StyleSheet.hairlineWidth,
	},
	hwStatusToggleText: {
		fontSize: 11,
		fontWeight: "700",
	},
	hwTagsRow: {
		flexDirection: "row",
		gap: 6,
		paddingVertical: 2,
	},
	hwTagChip: {
		paddingHorizontal: 10,
		paddingVertical: 5,
		borderRadius: RADIUS.capsule,
		borderWidth: StyleSheet.hairlineWidth,
	},
	hwTagChipText: {
		fontSize: 11,
		fontWeight: "600",
	},
	noteInput: {
		minHeight: 70,
		borderRadius: RADIUS.input,
		borderWidth: StyleSheet.hairlineWidth,
		padding: 12,
		fontSize: 14,
		lineHeight: 20,
	},
	smallNoteInput: {
		minHeight: 50,
		borderRadius: RADIUS.input,
		borderWidth: StyleSheet.hairlineWidth,
		padding: 10,
		fontSize: 13,
		lineHeight: 18,
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
		height: 44,
		borderRadius: RADIUS.button,
		alignItems: "center",
		justifyContent: "center",
	},
	cancelBtnText: {
		fontSize: 15,
		fontWeight: "600",
	},
	saveBtn: {
		flex: 1.4,
		height: 44,
		borderRadius: RADIUS.button,
		alignItems: "center",
		justifyContent: "center",
	},
	saveBtnText: {
		color: "#FFFFFF",
		fontSize: 15,
		fontWeight: "700",
	},
});
