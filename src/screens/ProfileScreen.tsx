import React, { useState } from "react";
import {
	StyleSheet,
	Text,
	View,
	ScrollView,
	TouchableOpacity,
	Switch,
	Alert,
	Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import {
	AppSettings,
	SubgroupFilter,
	ThemeMode,
	AccentColor,
} from "../types/schedule";
import { clearScheduleCache } from "../services/storage";
import { ThemeColors, ACCENT_PALETTES } from "../theme/colors";
import { RADIUS } from "../theme/tokens";
import { APP_CONFIG } from "../constants/appInfo";

interface ProfileScreenProps {
	settings: AppSettings;
	theme: ThemeColors;
	onUpdateSettings: (partial: Partial<AppSettings>) => void;
	onOpenGroupPicker: () => void;
	onOpenCallsModal: () => void;
	onOpenDebugModal: () => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
	settings,
	theme,
	onUpdateSettings,
	onOpenGroupPicker,
	onOpenCallsModal,
	onOpenDebugModal,
}) => {
	const [clearing, setClearing] = useState(false);
	const [debugTaps, setDebugTaps] = useState<number>(0);
	const [lastTapTime, setLastTapTime] = useState<number>(0);

	const triggerLight = () => {
		try {
			Haptics.impactAsync(
				Haptics.ImpactFeedbackStyle.Light
			);
		} catch {}
	};

	// Скрытое открытие Debug Menu по 7 нажатиям на версию
	const handleVersionPress = () => {
		const now = Date.now();
		const newCount =
			now - lastTapTime < 2500 ? debugTaps + 1 : 1;
		setLastTapTime(now);
		setDebugTaps(newCount);

		if (newCount === 7) {
			try {
				Haptics.notificationAsync(
					Haptics.NotificationFeedbackType.Success
				);
			} catch {}
			setDebugTaps(0);
			onOpenDebugModal();
		} else if (newCount >= 4) {
			try {
				Haptics.impactAsync(
					Haptics.ImpactFeedbackStyle.Light
				);
			} catch {}
		} else {
			try {
				Haptics.selectionAsync();
			} catch {}
		}
	};

	const handleClear = async () => {
		setClearing(true);
		try {
			const count = await clearScheduleCache();
			try {
				Haptics.notificationAsync(
					Haptics.NotificationFeedbackType.Success
				);
			} catch {}
			Alert.alert(
				"Кэш очищен",
				`Удалено сохранённых дней расписания: ${count}`
			);
		} catch {
			Alert.alert("Ошибка", "Не удалось очистить кэш");
		} finally {
			setClearing(false);
		}
	};

	return (
		<ScrollView
			style={[
				styles.container,
				{ backgroundColor: theme.background },
			]}
			contentContainerStyle={styles.scrollContent}
			showsVerticalScrollIndicator={false}
		>
			{/* Крупный заголовок в стиле Apple iOS */}
			<View style={styles.header}>
				<Text
					style={[
						styles.largeTitle,
						{ color: theme.text },
					]}
				>
					Настройки
				</Text>
			</View>

			{/* СЕКЦИЯ 1: РАСПИСАНИЕ И ГРУППА */}
			<View style={styles.section}>
				<Text
					style={[
						styles.sectionTitle,
						{ color: theme.textSecondary },
					]}
				>
					РАСПИСАНИЕ И ГРУППА
				</Text>
				<View
					style={[
						styles.card,
						{
							backgroundColor: theme.groupedCell,
							borderColor: theme.border,
						},
					]}
				>
					{/* Выбор группы */}
					<TouchableOpacity
						style={styles.row}
						activeOpacity={0.6}
						onPress={() => {
							triggerLight();
							onOpenGroupPicker();
						}}
					>
						<View
							style={[
								styles.iconSquare,
								{ backgroundColor: "#007AFF" },
							]}
						>
							<Ionicons
								name="people"
								size={17}
								color="#FFFFFF"
							/>
						</View>
						<Text
							style={[
								styles.rowLabel,
								{ color: theme.text },
							]}
						>
							Моя группа
						</Text>
						<Text
							style={[
								styles.rowValue,
								{ color: theme.textSecondary },
							]}
						>
							{
								settings.defaultEntity
									.SearchContent
							}
						</Text>
						<Ionicons
							name="chevron-forward"
							size={17}
							color={theme.separator}
						/>
					</TouchableOpacity>

				</View>
			</View>

			{/* СЕКЦИЯ 2: ОФОРМЛЕНИЕ */}
			<View style={styles.section}>
				<Text
					style={[
						styles.sectionTitle,
						{ color: theme.textSecondary },
					]}
				>
					ОФОРМЛЕНИЕ
				</Text>
				<View
					style={[
						styles.card,
						{
							backgroundColor: theme.groupedCell,
							borderColor: theme.border,
						},
					]}
				>
					<View style={styles.columnRow}>
						<View style={styles.labelRow}>
							<View
								style={[
									styles.iconSquare,
									{
										backgroundColor:
											"#AF52DE",
									},
								]}
							>
								<Ionicons
									name="moon"
									size={17}
									color="#FFFFFF"
								/>
							</View>
							<Text
								style={[
									styles.rowLabel,
									{ color: theme.text },
								]}
							>
								Тема оформления
							</Text>
						</View>

						<View
							style={[
								styles.segmented,
								{
									backgroundColor:
										theme.chipBackground,
								},
							]}
						>
							{[
								{
									mode: "system" as ThemeMode,
									title: "Авто",
								},
								{
									mode: "light" as ThemeMode,
									title: "Светлая",
								},
								{
									mode: "gray" as ThemeMode,
									title: "Серая",
								},
								{
									mode: "dark" as ThemeMode,
									title: "Тёмная",
								},
								{
									mode: "oled" as ThemeMode,
									title: "OLED",
								},
							].map(({ mode, title }) => {
								const isSelected =
									settings.themeMode === mode;

								return (
									<TouchableOpacity
										key={mode}
										style={[
											styles.segmentBtn,
											isSelected && [
												styles.segmentBtnActive,
												{
													backgroundColor:
														theme.card,
												},
											],
										]}
										activeOpacity={0.7}
										onPress={() => {
											try {
												Haptics.selectionAsync();
											} catch {}
											onUpdateSettings({
												themeMode: mode,
											});
										}}
									>
										<Text
											style={[
												styles.segmentBtnText,
												{
													color: isSelected
														? theme.text
														: theme.textSecondary,
													fontWeight:
														isSelected
															? "700"
															: "500",
												},
											]}
										>
											{title}
										</Text>
									</TouchableOpacity>
								);
							})}
						</View>
					</View>

					<View
						style={[
							styles.divider,
							{ backgroundColor: theme.separator },
						]}
					/>

					{/* Выбор акцентного цвета */}
					<View style={styles.columnRow}>
						<View style={styles.labelRow}>
							<View
								style={[
									styles.iconSquare,
									{
										backgroundColor:
											theme.accent,
									},
								]}
							>
								<Ionicons
									name="color-palette"
									size={17}
									color="#FFFFFF"
								/>
							</View>
							<View style={{ flex: 1 }}>
								<Text
									style={[
										styles.rowLabel,
										{ color: theme.text },
									]}
								>
									Акцентный цвет
								</Text>
								<Text
									style={[
										styles.colorSelectedLabel,
										{
											color: theme.textSecondary,
										},
									]}
								>
									{
										ACCENT_PALETTES[
											settings.accentColor ||
												"blue"
										]?.name
									}
								</Text>
							</View>
						</View>

						<View style={styles.colorPaletteRow}>
							{(
								[
									"blue",
									"purple",
									"green",
									"orange",
									"pink",
									"teal",
								] as AccentColor[]
							).map((cKey) => {
								const pal =
									ACCENT_PALETTES[cKey];
								const isSelected =
									(settings.accentColor ||
										"blue") === cKey;

								return (
									<TouchableOpacity
										key={cKey}
										style={[
											styles.colorCircle,
											{
												backgroundColor:
													pal.color,
											},
											isSelected && [
												styles.colorCircleSelected,
												{
													borderColor:
														theme.text,
												},
											],
										]}
										activeOpacity={0.75}
										onPress={() => {
											try {
												Haptics.selectionAsync();
											} catch {}
											onUpdateSettings({
												accentColor:
													cKey,
											});
										}}
										accessibilityLabel={
											pal.name
										}
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

					<View
						style={[
							styles.divider,
							{ backgroundColor: theme.separator },
						]}
					/>

					{/* Переключатель Liquid Glass */}
					<View style={styles.switchRow}>
						<View style={styles.labelRowCompact}>
							<View
								style={[
									styles.iconSquare,
									{
										backgroundColor:
											"#5AC8FA",
									},
								]}
							>
								<Ionicons
									name="sparkles"
									size={17}
									color="#FFFFFF"
								/>
							</View>
							<View style={styles.textColumn}>
								<Text
									style={[
										styles.rowLabel,
										{ color: theme.text },
									]}
								>
									Эффект Liquid Glass
								</Text>
								<Text
									style={[
										styles.rowSubLabel,
										{
											color: theme.textSecondary,
										},
									]}
								>
									Полупрозрачные акриловые
									подложки iOS
								</Text>
							</View>
						</View>
						<Switch
							value={settings.glassEffect}
							onValueChange={(val) => {
								try {
									Haptics.selectionAsync();
								} catch {}
								onUpdateSettings({
									glassEffect: val,
								});
							}}
							trackColor={{
								false: theme.chipBackground,
								true: theme.success,
							}}
							thumbColor="#FFFFFF"
							ios_backgroundColor={
								theme.chipBackground
							}
						/>
					</View>
				</View>
			</View>

			{/* СЕКЦИЯ 3: СПРАВОЧНИК И ЗВОНКИ */}
			<View style={styles.section}>
				<Text
					style={[
						styles.sectionTitle,
						{ color: theme.textSecondary },
					]}
				>
					СПРАВОЧНИК И ЗВОНКИ
				</Text>
				<View
					style={[
						styles.card,
						{
							backgroundColor: theme.groupedCell,
							borderColor: theme.border,
						},
					]}
				>
					{/* Расписание звонков */}
					<TouchableOpacity
						style={styles.row}
						activeOpacity={0.6}
						onPress={() => {
							triggerLight();
							onOpenCallsModal();
						}}
					>
						<View
							style={[
								styles.iconSquare,
								{ backgroundColor: "#FF9500" },
							]}
						>
							<Ionicons
								name="notifications"
								size={17}
								color="#FFFFFF"
							/>
						</View>
						<Text
							style={[
								styles.rowLabel,
								{ color: theme.text },
							]}
						>
							Расписание звонков
						</Text>
						<Text
							style={[
								styles.rowValue,
								{ color: theme.textSecondary },
							]}
						>
							Пн—Пт и Сб
						</Text>
						<Ionicons
							name="chevron-forward"
							size={17}
							color={theme.separator}
						/>
					</TouchableOpacity>

					<View
						style={[
							styles.divider,
							{ backgroundColor: theme.separator },
						]}
					/>

					{/* Портал колледжа */}
					<TouchableOpacity
						style={styles.row}
						activeOpacity={0.6}
						onPress={() => {
							Linking.openURL(
								APP_CONFIG.websiteUrl
							);
						}}
					>
						<View
							style={[
								styles.iconSquare,
								{ backgroundColor: "#5856D6" },
							]}
						>
							<Ionicons
								name="globe-outline"
								size={17}
								color="#FFFFFF"
							/>
						</View>
						<Text
							style={[
								styles.rowLabel,
								{ color: theme.text },
							]}
						>
							Сайт колледжа
						</Text>
						<Text
							style={[
								styles.rowValue,
								{ color: theme.textSecondary },
							]}
						>
							it-institut.ru
						</Text>
						<Ionicons
							name="open-outline"
							size={16}
							color={theme.separator}
						/>
					</TouchableOpacity>
				</View>
			</View>

			{/* СЕКЦИЯ 4: ХРАНИЛИЩЕ ДАННЫХ */}
			{/* СЕКЦИЯ: ИНСТРУМЕНТЫ РАЗРАБОТКИ */}
			<View style={styles.section}>
				<Text
					style={[
						styles.sectionTitle,
						{ color: theme.textSecondary },
					]}
				>
					ИНСТРУМЕНТЫ РАЗРАБОТЧИКА
				</Text>
				<View
					style={[
						styles.card,
						{
							backgroundColor: theme.groupedCell,
							borderColor: theme.border,
						},
					]}
				>
					<TouchableOpacity
						style={styles.row}
						activeOpacity={0.7}
						onPress={() => {
							try {
								Haptics.impactAsync(
									Haptics.ImpactFeedbackStyle.Medium
								);
							} catch {}
							onOpenDebugModal();
						}}
					>
						<View
							style={[
								styles.iconSquare,
								{ backgroundColor: theme.accent },
							]}
						>
							<Ionicons
								name="flask-outline"
								size={17}
								color="#FFFFFF"
							/>
						</View>
						<View style={{ flex: 1 }}>
							<Text
								style={[
									styles.rowLabel,
									{ color: theme.text },
								]}
							>
								Инспектор системы (Debug Menu)
							</Text>
							<Text
								style={{
									fontSize: 12,
									color: theme.textSecondary,
									marginTop: 1,
								}}
							>
								Тесты подгрупп, времени, звонков и тем
							</Text>
						</View>
						<Ionicons
							name="chevron-forward"
							size={17}
							color={theme.separator}
						/>
					</TouchableOpacity>
				</View>
			</View>

			<View style={styles.section}>
				<Text
					style={[
						styles.sectionTitle,
						{ color: theme.textSecondary },
					]}
				>
					ХРАНИЛИЩЕ ДАННЫХ
				</Text>
				<View
					style={[
						styles.card,
						{
							backgroundColor: theme.groupedCell,
							borderColor: theme.border,
						},
					]}
				>
					<TouchableOpacity
						style={styles.row}
						activeOpacity={0.6}
						onPress={handleClear}
						disabled={clearing}
					>
						<View
							style={[
								styles.iconSquare,
								{ backgroundColor: "#FF3B30" },
							]}
						>
							<Ionicons
								name="trash-outline"
								size={17}
								color="#FFFFFF"
							/>
						</View>
						<Text
							style={[
								styles.rowLabel,
								{ color: theme.danger },
							]}
						>
							Очистить сохранённый кэш
						</Text>
					</TouchableOpacity>
				</View>
			</View>

			{/* Футер: единая версия из APP_CONFIG + 7 тапов для открытия Debug */}
			<View style={styles.footer}>
				<Text
					style={[
						styles.footerText,
						{ color: theme.textSecondary },
					]}
				>
					{APP_CONFIG.collegeName}
				</Text>
				<TouchableOpacity
					activeOpacity={0.7}
					onPress={handleVersionPress}
					hitSlop={{
						top: 12,
						bottom: 16,
						left: 24,
						right: 24,
					}}
				>
					<Text
						style={[
							styles.footerSub,
							{ color: theme.textSecondary },
						]}
					>
						{APP_CONFIG.name} v{APP_CONFIG.version}
						{debugTaps >= 4
							? ` (ещё ${7 - debugTaps} до Debug)`
							: ""}
					</Text>
				</TouchableOpacity>
			</View>
		</ScrollView>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	scrollContent: {
		paddingHorizontal: 16,
		paddingTop: 8,
		paddingBottom: 110,
	},
	header: {
		marginBottom: 16,
		marginTop: 6,
		paddingHorizontal: 4,
	},
	largeTitle: {
		fontSize: 34,
		fontWeight: "800",
		letterSpacing: -0.8,
	},
	section: {
		marginBottom: 24,
	},
	sectionTitle: {
		fontSize: 13,
		fontWeight: "400",
		letterSpacing: -0.08,
		marginBottom: 7,
		marginLeft: 16,
	},
	card: {
		borderRadius: RADIUS.card,
		borderWidth: StyleSheet.hairlineWidth,
		overflow: "hidden",
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.03,
		shadowRadius: 4,
		elevation: 1,
	},
	row: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 16,
		minHeight: 48,
		paddingVertical: 11,
	},
	columnRow: {
		paddingHorizontal: 16,
		paddingVertical: 12,
	},
	labelRow: {
		flexDirection: "row",
		alignItems: "center",
		marginBottom: 10,
	},
	iconSquare: {
		width: 30,
		height: 30,
		borderRadius: RADIUS.iconSquare,
		alignItems: "center",
		justifyContent: "center",
		marginRight: 12,
	},
	rowLabel: {
		fontSize: 17,
		letterSpacing: -0.4,
		fontWeight: "400",
		flex: 1,
	},
	rowSubLabel: {
		fontSize: 13,
		letterSpacing: -0.2,
		marginTop: 2,
	},
	textColumn: {
		flex: 1,
		justifyContent: "center",
	},
	switchRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingHorizontal: 16,
		minHeight: 48,
		paddingVertical: 10,
	},
	labelRowCompact: {
		flexDirection: "row",
		alignItems: "center",
		flex: 1,
		marginRight: 12,
	},
	rowValue: {
		fontSize: 17,
		letterSpacing: -0.4,
		marginRight: 6,
	},
	divider: {
		height: StyleSheet.hairlineWidth,
		marginLeft: 58,
	},
	segmented: {
		flexDirection: "row",
		borderRadius: 9,
		padding: 2,
	},
	segmentBtn: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		paddingVertical: 7,
		borderRadius: 7,
	},
	segmentBtnActive: {
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.12,
		shadowRadius: 2,
		elevation: 2,
	},
	segmentBtnText: {
		fontSize: 13,
		letterSpacing: -0.2,
	},
	colorSelectedLabel: {
		fontSize: 13,
		fontWeight: "500",
		marginTop: 2,
	},
	colorPaletteRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingVertical: 8,
		paddingHorizontal: 4,
	},
	colorCircle: {
		width: 38,
		height: 38,
		borderRadius: 19,
		alignItems: "center",
		justifyContent: "center",
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.15,
		shadowRadius: 3,
		elevation: 2,
	},
	colorCircleSelected: {
		borderWidth: 3,
		transform: [{ scale: 1.12 }],
	},
	footer: {
		alignItems: "center",
		paddingVertical: 18,
	},
	footerText: {
		fontSize: 13,
		fontWeight: "400",
		marginBottom: 4,
	},
	footerSub: {
		fontSize: 12,
		fontWeight: "500",
	},
});
