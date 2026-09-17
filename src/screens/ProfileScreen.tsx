import React, { useState } from "react";
import {
	StyleSheet,
	Text,
	View,
	ScrollView,
	TouchableOpacity,
	Alert,
	Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import {
	AppSettings,
	SubgroupFilter,
	ThemeMode,
} from "../types/schedule";
import { clearScheduleCache } from "../services/storage";
import { ThemeColors } from "../theme/colors";

interface ProfileScreenProps {
	settings: AppSettings;
	theme: ThemeColors;
	onUpdateSettings: (partial: Partial<AppSettings>) => void;
	onOpenGroupPicker: () => void;
	onOpenCallsModal: () => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
	settings,
	theme,
	onUpdateSettings,
	onOpenGroupPicker,
	onOpenCallsModal,
}) => {
	const [clearing, setClearing] = useState(false);

	const triggerLight = () => {
		try {
			Haptics.impactAsync(
				Haptics.ImpactFeedbackStyle.Light
			);
		} catch {}
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
			{/* Заголовок экрана */}
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

			{/* СЕКЦИЯ 1: ГРУППА И ПОДГРУППА */}
			<View style={styles.section}>
				<Text
					style={[
						styles.sectionTitle,
						{ color: theme.textSecondary },
					]}
				>
					УЧЁБА
				</Text>
				<View
					style={[
						styles.card,
						{
							backgroundColor: theme.card,
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
								size={16}
								color="#FFFFFF"
							/>
						</View>
						<Text
							style={[
								styles.rowLabel,
								{ color: theme.text },
							]}
						>
							Группа
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
							size={16}
							color={theme.textSecondary}
						/>
					</TouchableOpacity>

					<View
						style={[
							styles.divider,
							{ backgroundColor: theme.border },
						]}
					/>

					{/* Выбор подгруппы */}
					<View style={styles.columnRow}>
						<View style={styles.labelRow}>
							<View
								style={[
									styles.iconSquare,
									{
										backgroundColor:
											"#34C759",
									},
								]}
							>
								<Ionicons
									name="person"
									size={16}
									color="#FFFFFF"
								/>
							</View>
							<Text
								style={[
									styles.rowLabel,
									{ color: theme.text },
								]}
							>
								Подгруппа
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
							{(
								[
									"all",
									"1",
									"2",
								] as SubgroupFilter[]
							).map((sg) => {
								const isSelected =
									settings.subgroup === sg;
								let title = "Все";
								if (sg === "1") title = "1-я";
								if (sg === "2") title = "2-я";

								return (
									<TouchableOpacity
										key={sg}
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
												subgroup: sg,
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
							backgroundColor: theme.card,
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
									size={16}
									color="#FFFFFF"
								/>
							</View>
							<Text
								style={[
									styles.rowLabel,
									{ color: theme.text },
								]}
							>
								Тема
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
							{(
								[
									"system",
									"light",
									"dark",
								] as ThemeMode[]
							).map((mode) => {
								const isSelected =
									settings.themeMode === mode;
								let title = "Авто";
								if (mode === "light")
									title = "Светлая";
								if (mode === "dark")
									title = "Тёмная";

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
				</View>
			</View>

			{/* СЕКЦИЯ 3: ИНФОРМАЦИЯ И ЗВОНКИ */}
			<View style={styles.section}>
				<Text
					style={[
						styles.sectionTitle,
						{ color: theme.textSecondary },
					]}
				>
					СПРАВОЧНИК
				</Text>
				<View
					style={[
						styles.card,
						{
							backgroundColor: theme.card,
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
								size={16}
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
						<Ionicons
							name="chevron-forward"
							size={16}
							color={theme.textSecondary}
						/>
					</TouchableOpacity>

					<View
						style={[
							styles.divider,
							{ backgroundColor: theme.border },
						]}
					/>

					{/* Портал колледжа */}
					<TouchableOpacity
						style={styles.row}
						activeOpacity={0.6}
						onPress={() => {
							Linking.openURL(
								"https://it-institut.ru/SearchString/Index/37"
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
								size={16}
								color="#FFFFFF"
							/>
						</View>
						<Text
							style={[
								styles.rowLabel,
								{ color: theme.text },
							]}
						>
							Портал колледжа
						</Text>
						<Ionicons
							name="open-outline"
							size={16}
							color={theme.textSecondary}
						/>
					</TouchableOpacity>
				</View>
			</View>

			{/* СЕКЦИЯ 4: ПАМЯТЬ */}
			<View style={styles.section}>
				<View
					style={[
						styles.card,
						{
							backgroundColor: theme.card,
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
								size={16}
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

			{/* Футер */}
			<View style={styles.footer}>
				<Text
					style={[
						styles.footerText,
						{ color: theme.textSecondary },
					]}
				>
					Альметьевский профессиональный колледж
				</Text>
				<Text
					style={[
						styles.footerSub,
						{ color: theme.textSecondary },
					]}
				>
					Версия 1.0.0
				</Text>
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
		fontSize: 32,
		fontWeight: "800",
		letterSpacing: -0.6,
	},
	section: {
		marginBottom: 22,
	},
	sectionTitle: {
		fontSize: 12,
		fontWeight: "600",
		letterSpacing: 0.3,
		marginBottom: 6,
		marginLeft: 8,
	},
	card: {
		borderRadius: 18,
		borderWidth: StyleSheet.hairlineWidth,
		overflow: "hidden",
	},
	row: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 16,
		paddingVertical: 13,
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
		width: 28,
		height: 28,
		borderRadius: 7,
		alignItems: "center",
		justifyContent: "center",
		marginRight: 12,
	},
	rowLabel: {
		fontSize: 16,
		fontWeight: "500",
		flex: 1,
	},
	rowValue: {
		fontSize: 15,
		marginRight: 6,
	},
	divider: {
		height: StyleSheet.hairlineWidth,
		marginLeft: 56,
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
		shadowOpacity: 0.1,
		shadowRadius: 2,
		elevation: 2,
	},
	segmentBtnText: {
		fontSize: 13,
	},
	footer: {
		alignItems: "center",
		paddingVertical: 16,
	},
	footerText: {
		fontSize: 12,
		fontWeight: "500",
		marginBottom: 2,
	},
	footerSub: {
		fontSize: 11,
	},
});
