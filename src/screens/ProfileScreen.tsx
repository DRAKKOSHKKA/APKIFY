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
	SearchResultItem,
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
	const [clearingCache, setClearingCache] = useState(false);

	const triggerLight = () => {
		try {
			Haptics.impactAsync(
				Haptics.ImpactFeedbackStyle.Light
			);
		} catch {}
	};

	const handleClearCache = async () => {
		setClearingCache(true);
		try {
			const count = await clearScheduleCache();
			try {
				Haptics.notificationAsync(
					Haptics.NotificationFeedbackType.Success
				);
			} catch {}
			Alert.alert(
				"Память очищена",
				`Удалено сохранённых копий расписания: ${count}`
			);
		} catch {
			Alert.alert("Ошибка", "Не удалось очистить кэш");
		} finally {
			setClearingCache(false);
		}
	};

	const openCollegeSite = () => {
		Linking.openURL(
			"https://it-institut.ru/SearchString/Index/37"
		);
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
			{/* iOS Large Title */}
			<View style={styles.titleContainer}>
				<Text
					style={[
						styles.largeTitle,
						{ color: theme.text },
					]}
				>
					Профиль
				</Text>
			</View>

			{/* Карточка студента / профиля в стиле Apple ID */}
			<TouchableOpacity
				style={[
					styles.profileCard,
					{
						backgroundColor: theme.groupedCell,
						borderColor: theme.border,
					},
				]}
				activeOpacity={0.7}
				onPress={() => {
					triggerLight();
					onOpenGroupPicker();
				}}
			>
				<View
					style={[
						styles.avatarCircle,
						{ backgroundColor: theme.accent },
					]}
				>
					<Ionicons
						name="school"
						size={32}
						color="#FFFFFF"
					/>
				</View>

				<View style={styles.profileDetails}>
					<Text
						style={[
							styles.profileName,
							{ color: theme.text },
						]}
					>
						{settings.defaultEntity.SearchContent}
					</Text>
					<Text
						style={[
							styles.profileSub,
							{ color: theme.textSecondary },
						]}
					>
						Группа по умолчанию • АПК
					</Text>
				</View>

				<Ionicons
					name="chevron-forward"
					size={20}
					color={theme.textSecondary}
				/>
			</TouchableOpacity>

			{/* СЕКЦИЯ: УЧЕБНЫЙ ПРОЦЕСС */}
			<View style={styles.section}>
				<Text
					style={[
						styles.sectionHeader,
						{ color: theme.textSecondary },
					]}
				>
					УЧЕБНЫЙ ПРОЦЕСС
				</Text>
				<View
					style={[
						styles.groupedCard,
						{
							backgroundColor: theme.groupedCell,
							borderColor: theme.border,
						},
					]}
				>
					{/* Выбор группы */}
					<TouchableOpacity
						style={styles.cellRow}
						activeOpacity={0.7}
						onPress={() => {
							triggerLight();
							onOpenGroupPicker();
						}}
					>
						<View
							style={[
								styles.iconBox,
								{ backgroundColor: "#007AFF" },
							]}
						>
							<Ionicons
								name="people"
								size={17}
								color="#FFFFFF"
							/>
						</View>
						<View style={styles.cellContent}>
							<Text
								style={[
									styles.cellTitle,
									{ color: theme.text },
								]}
							>
								Основная группа
							</Text>
							<Text
								style={[
									styles.cellValue,
									{
										color: theme.textSecondary,
									},
								]}
							>
								{
									settings.defaultEntity
										.SearchContent
								}
							</Text>
						</View>
						<Ionicons
							name="chevron-forward"
							size={18}
							color={theme.textSecondary}
						/>
					</TouchableOpacity>

					<View
						style={[
							styles.separator,
							{ backgroundColor: theme.separator },
						]}
					/>

					{/* Моя подгруппа */}
					<View style={styles.cellRowColumn}>
						<View style={styles.cellRowHeader}>
							<View
								style={[
									styles.iconBox,
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
									styles.cellTitle,
									{ color: theme.text },
								]}
							>
								Фильтр подгруппы
							</Text>
						</View>

						<View
							style={[
								styles.segmentedControl,
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
							).map((val) => {
								const isSelected =
									settings.subgroup === val;
								let label = "Все";
								if (val === "1")
									label = "1 подгруппа";
								if (val === "2")
									label = "2 подгруппа";

								return (
									<TouchableOpacity
										key={val}
										style={[
											styles.segmentItem,
											isSelected && [
												styles.segmentItemSelected,
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
												subgroup: val,
											});
										}}
									>
										<Text
											style={[
												styles.segmentText,
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
											{label}
										</Text>
									</TouchableOpacity>
								);
							})}
						</View>
					</View>
				</View>
			</View>

			{/* СЕКЦИЯ: ОФОРМЛЕНИЕ */}
			<View style={styles.section}>
				<Text
					style={[
						styles.sectionHeader,
						{ color: theme.textSecondary },
					]}
				>
					ОФОРМЛЕНИЕ
				</Text>
				<View
					style={[
						styles.groupedCard,
						{
							backgroundColor: theme.groupedCell,
							borderColor: theme.border,
						},
					]}
				>
					{/* Тема */}
					<View style={styles.cellRowColumn}>
						<View style={styles.cellRowHeader}>
							<View
								style={[
									styles.iconBox,
									{
										backgroundColor:
											"#AF52DE",
									},
								]}
							>
								<Ionicons
									name="color-palette"
									size={17}
									color="#FFFFFF"
								/>
							</View>
							<Text
								style={[
									styles.cellTitle,
									{ color: theme.text },
								]}
							>
								Цветовая тема
							</Text>
						</View>

						<View
							style={[
								styles.segmentedControl,
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
								let label = "Авто";
								let iconName: any =
									"phone-portrait-outline";
								if (mode === "light") {
									label = "Светлая";
									iconName = "sunny";
								}
								if (mode === "dark") {
									label = "Тёмная";
									iconName = "moon";
								}

								return (
									<TouchableOpacity
										key={mode}
										style={[
											styles.segmentItem,
											isSelected && [
												styles.segmentItemSelected,
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
										<Ionicons
											name={iconName}
											size={14}
											color={
												isSelected
													? theme.accent
													: theme.textSecondary
											}
											style={{
												marginRight: 4,
											}}
										/>
										<Text
											style={[
												styles.segmentText,
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
											{label}
										</Text>
									</TouchableOpacity>
								);
							})}
						</View>
					</View>
				</View>
			</View>

			{/* СЕКЦИЯ: ЗВОНКИ */}
			<View style={styles.section}>
				<Text
					style={[
						styles.sectionHeader,
						{ color: theme.textSecondary },
					]}
				>
					ЗВОНКИ И УВЕДОМЛЕНИЯ
				</Text>
				<View
					style={[
						styles.groupedCard,
						{
							backgroundColor: theme.groupedCell,
							borderColor: theme.border,
						},
					]}
				>
					{/* Расписание звонков */}
					<TouchableOpacity
						style={styles.cellRow}
						activeOpacity={0.7}
						onPress={() => {
							triggerLight();
							onOpenCallsModal();
						}}
					>
						<View
							style={[
								styles.iconBox,
								{ backgroundColor: "#FF9500" },
							]}
						>
							<Ionicons
								name="notifications"
								size={17}
								color="#FFFFFF"
							/>
						</View>
						<View style={styles.cellContent}>
							<Text
								style={[
									styles.cellTitle,
									{ color: theme.text },
								]}
							>
								Расписание звонков
							</Text>
						</View>
						<Ionicons
							name="chevron-forward"
							size={18}
							color={theme.textSecondary}
						/>
					</TouchableOpacity>

					<View
						style={[
							styles.separator,
							{ backgroundColor: theme.separator },
						]}
					/>

					{/* Переключатель напоминаний */}
					<View style={styles.cellRow}>
						<View
							style={[
								styles.iconBox,
								{ backgroundColor: "#FF2D55" },
							]}
						>
							<Ionicons
								name="alarm"
								size={17}
								color="#FFFFFF"
							/>
						</View>
						<View style={styles.cellContent}>
							<Text
								style={[
									styles.cellTitle,
									{ color: theme.text },
								]}
							>
								Напоминать о начале пары
							</Text>
						</View>
						<Switch
							value={settings.notificationsEnabled}
							onValueChange={(val) => {
								try {
									Haptics.selectionAsync();
								} catch {}
								onUpdateSettings({
									notificationsEnabled: val,
								});
							}}
							trackColor={{
								false: theme.chipBackground,
								true: "#34C759",
							}}
						/>
					</View>
				</View>
			</View>

			{/* СЕКЦИЯ: ДАННЫЕ И САЙТ */}
			<View style={styles.section}>
				<Text
					style={[
						styles.sectionHeader,
						{ color: theme.textSecondary },
					]}
				>
					СИСТЕМА И ДАННЫЕ
				</Text>
				<View
					style={[
						styles.groupedCard,
						{
							backgroundColor: theme.groupedCell,
							borderColor: theme.border,
						},
					]}
				>
					{/* Открыть сайт */}
					<TouchableOpacity
						style={styles.cellRow}
						activeOpacity={0.7}
						onPress={openCollegeSite}
					>
						<View
							style={[
								styles.iconBox,
								{ backgroundColor: "#5856D6" },
							]}
						>
							<Ionicons
								name="globe-outline"
								size={17}
								color="#FFFFFF"
							/>
						</View>
						<View style={styles.cellContent}>
							<Text
								style={[
									styles.cellTitle,
									{ color: theme.text },
								]}
							>
								Открыть портал колледжа
							</Text>
						</View>
						<Ionicons
							name="open-outline"
							size={18}
							color={theme.textSecondary}
						/>
					</TouchableOpacity>

					<View
						style={[
							styles.separator,
							{ backgroundColor: theme.separator },
						]}
					/>

					{/* Очистить кэш */}
					<TouchableOpacity
						style={styles.cellRow}
						activeOpacity={0.7}
						onPress={handleClearCache}
						disabled={clearingCache}
					>
						<View
							style={[
								styles.iconBox,
								{ backgroundColor: "#FF3B30" },
							]}
						>
							<Ionicons
								name="trash-outline"
								size={17}
								color="#FFFFFF"
							/>
						</View>
						<View style={styles.cellContent}>
							<Text
								style={[
									styles.cellTitle,
									{ color: theme.danger },
								]}
							>
								Очистить сохранённое расписание
							</Text>
						</View>
					</TouchableOpacity>
				</View>
			</View>

			{/* Футер приложения */}
			<View style={styles.footer}>
				<Text
					style={[
						styles.footerText,
						{ color: theme.textSecondary },
					]}
				>
					Расписание АПК для iPhone
				</Text>
				<Text
					style={[
						styles.footerSub,
						{ color: theme.textSecondary },
					]}
				>
					Версия 1.0.0 (Сборка 2026.09) • Альметьевск
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
		paddingTop: 12,
		paddingBottom: 110, // Отступ для нижней панели таб-бара
	},
	titleContainer: {
		marginBottom: 16,
		marginTop: 8,
	},
	largeTitle: {
		fontSize: 34,
		fontWeight: "800",
		letterSpacing: -0.8,
	},
	profileCard: {
		flexDirection: "row",
		alignItems: "center",
		padding: 16,
		borderRadius: 16,
		marginBottom: 24,
		borderWidth: StyleSheet.hairlineWidth,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.04,
		shadowRadius: 5,
		elevation: 1,
	},
	avatarCircle: {
		width: 54,
		height: 54,
		borderRadius: 27,
		alignItems: "center",
		justifyContent: "center",
		marginRight: 14,
	},
	profileDetails: {
		flex: 1,
	},
	profileName: {
		fontSize: 20,
		fontWeight: "700",
		marginBottom: 3,
	},
	profileSub: {
		fontSize: 13,
	},
	section: {
		marginBottom: 24,
	},
	sectionHeader: {
		fontSize: 12,
		fontWeight: "600",
		letterSpacing: 0.4,
		marginBottom: 8,
		marginLeft: 12,
	},
	groupedCard: {
		borderRadius: 16,
		borderWidth: StyleSheet.hairlineWidth,
		overflow: "hidden",
	},
	cellRow: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 16,
		paddingVertical: 12,
	},
	cellRowColumn: {
		paddingHorizontal: 16,
		paddingVertical: 12,
	},
	cellRowHeader: {
		flexDirection: "row",
		alignItems: "center",
		marginBottom: 10,
	},
	iconBox: {
		width: 30,
		height: 30,
		borderRadius: 8,
		alignItems: "center",
		justifyContent: "center",
		marginRight: 12,
	},
	cellContent: {
		flex: 1,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingRight: 8,
	},
	cellTitle: {
		fontSize: 16,
		fontWeight: "500",
	},
	cellValue: {
		fontSize: 15,
	},
	separator: {
		height: StyleSheet.hairlineWidth,
		marginLeft: 58,
	},
	segmentedControl: {
		flexDirection: "row",
		borderRadius: 9,
		padding: 2,
	},
	segmentItem: {
		flex: 1,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		paddingVertical: 6,
		borderRadius: 7,
	},
	segmentItemSelected: {
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.12,
		shadowRadius: 2,
		elevation: 2,
	},
	segmentText: {
		fontSize: 13,
	},
	footer: {
		alignItems: "center",
		paddingVertical: 20,
	},
	footerText: {
		fontSize: 13,
		fontWeight: "600",
		marginBottom: 3,
	},
	footerSub: {
		fontSize: 11,
	},
});
