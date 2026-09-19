import React, { useState, useEffect, useRef } from "react";
import {
	StyleSheet,
	Text,
	View,
	Modal,
	TextInput,
	TouchableOpacity,
	FlatList,
	ActivityIndicator,
	SafeAreaView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { SearchResultItem } from "../types/schedule";
import { searchEntities } from "../services/api";
import { ThemeColors } from "../theme/colors";

interface SearchModalProps {
	visible: boolean;
	favorites?: any[];
	theme: ThemeColors;
	onSelectEntity: (entity: SearchResultItem) => void;
	onClose: () => void;
}

type FilterType = "All" | "Group" | "Teacher" | "Classroom";

const SUGGESTIONS: SearchResultItem[] = [
	{
		SearchContent: "21 нмо",
		Type: "Group",
		SearchId: 45041,
		OwnerId: 37,
	},
	{
		SearchContent: "21 нмср",
		Type: "Group",
		SearchId: 790,
		OwnerId: 37,
	},
	{
		SearchContent: "21 нпк",
		Type: "Group",
		SearchId: 791,
		OwnerId: 37,
	},
	{
		SearchContent: "21 нс",
		Type: "Group",
		SearchId: 792,
		OwnerId: 37,
	},
	{
		SearchContent: "21 смп",
		Type: "Group",
		SearchId: 3605,
		OwnerId: 37,
	},
	{
		SearchContent: "Сайфуллина С.Г.",
		Type: "Teacher",
		SearchId: 777,
		OwnerId: 37,
	},
	{
		SearchContent: "301",
		Type: "Classroom",
		SearchId: 385,
		OwnerId: 37,
	},
];

export const SearchModal: React.FC<SearchModalProps> = ({
	visible,
	favorites,
	theme,
	onSelectEntity,
	onClose,
}) => {
	const [query, setQuery] = useState("");
	const [results, setResults] = useState<SearchResultItem[]>(
		[]
	);
	const [isLoading, setIsLoading] = useState(false);
	const [filter, setFilter] = useState<FilterType>("All");
	const debounceTimer = useRef<ReturnType<
		typeof setTimeout
	> | null>(null);

	useEffect(() => {
		if (!query.trim()) {
			setResults([]);
			setIsLoading(false);
			return;
		}

		if (debounceTimer.current) {
			clearTimeout(debounceTimer.current);
		}

		setIsLoading(true);
		debounceTimer.current = setTimeout(async () => {
			try {
				const res = await searchEntities(query);
				setResults(res);
			} catch (err) {
				console.warn("Ошибка при поиске:", err);
			} finally {
				setIsLoading(false);
			}
		}, 280);

		return () => {
			if (debounceTimer.current) {
				clearTimeout(debounceTimer.current);
			}
		};
	}, [query]);

	const filteredResults = results.filter((item) => {
		if (filter === "All") return true;
		return item.Type === filter;
	});

	const getTypeIcon = (type: string) => {
		switch (type) {
			case "Teacher":
				return "person";
			case "Classroom":
				return "business";
			default:
				return "people";
		}
	};

	const getTypeColor = (type: string) => {
		switch (type) {
			case "Teacher":
				return "#BF5AF2";
			case "Classroom":
				return "#30D158";
			default:
				return theme.accent;
		}
	};

	const getTypeLabel = (type: string) => {
		switch (type) {
			case "Teacher":
				return "Преподаватель";
			case "Classroom":
				return "Кабинет";
			default:
				return "Группа";
		}
	};

	const handleSelect = (item: SearchResultItem) => {
		try {
			Haptics.impactAsync(
				Haptics.ImpactFeedbackStyle.Light
			);
		} catch {}
		onSelectEntity(item);
		onClose();
	};

	return (
		<Modal
			visible={visible}
			animationType="slide"
			presentationStyle="pageSheet"
			onRequestClose={onClose}
		>
			<SafeAreaView
				style={[
					styles.safeArea,
					{ backgroundColor: theme.modalBackground },
				]}
			>
				{/* Заголовок */}
				<View
					style={[
						styles.header,
						{
							backgroundColor:
								theme.headerBackground,
							borderBottomColor: theme.border,
						},
					]}
				>
					<Text
						style={[
							styles.title,
							{ color: theme.text },
						]}
					>
						Поиск
					</Text>
					<TouchableOpacity
						style={styles.closeButton}
						onPress={onClose}
						hitSlop={{
							top: 10,
							bottom: 10,
							left: 10,
							right: 10,
						}}
					>
						<Ionicons
							name="close-circle"
							size={28}
							color={theme.textSecondary}
						/>
					</TouchableOpacity>
				</View>

				{/* Поисковая строка iOS */}
				<View
					style={[
						styles.searchBarContainer,
						{
							backgroundColor:
								theme.headerBackground,
						},
					]}
				>
					<View
						style={[
							styles.searchBar,
							{
								backgroundColor:
									theme.searchBarBackground,
							},
						]}
					>
						<Ionicons
							name="search"
							size={18}
							color={theme.textSecondary}
							style={styles.searchIcon}
						/>
						<TextInput
							style={[
								styles.input,
								{ color: theme.text },
							]}
							placeholder="Номер группы, фамилия или кабинет..."
							placeholderTextColor={
								theme.textSecondary
							}
							value={query}
							onChangeText={setQuery}
							autoFocus
							clearButtonMode="while-editing"
						/>
						{isLoading && (
							<ActivityIndicator
								size="small"
								color={theme.accent}
								style={{ marginRight: 6 }}
							/>
						)}
					</View>
				</View>

				{/* Фильтры */}
				<View
					style={[
						styles.filterRow,
						{
							backgroundColor:
								theme.headerBackground,
							borderBottomColor: theme.border,
						},
					]}
				>
					{(
						[
							"All",
							"Group",
							"Teacher",
							"Classroom",
						] as FilterType[]
					).map((f) => {
						const isSelected = filter === f;
						let label = "Все";
						if (f === "Group") label = "Группы";
						if (f === "Teacher")
							label = "Преподаватели";
						if (f === "Classroom")
							label = "Кабинеты";

						return (
							<TouchableOpacity
								key={f}
								style={[
									styles.filterChip,
									{
										backgroundColor:
											theme.chipBackground,
									},
									isSelected && {
										backgroundColor:
											theme.accent,
									},
								]}
								onPress={() => setFilter(f)}
							>
								<Text
									style={[
										styles.filterText,
										{
											color: isSelected
												? "#FFFFFF"
												: theme.textSecondary,
										},
									]}
								>
									{label}
								</Text>
							</TouchableOpacity>
						);
					})}
				</View>

				{/* Список результатов или Избранное/Подсказки */}
				{query.trim().length > 0 ? (
					<FlatList
						data={filteredResults}
						keyExtractor={(item) =>
							`${item.Type}-${item.SearchId}`
						}
						contentContainerStyle={
							styles.listContent
						}
						ListEmptyComponent={
							!isLoading ? (
								<View
									style={styles.emptyContainer}
								>
									<Ionicons
										name="search-outline"
										size={48}
										color={
											theme.textSecondary
										}
									/>
									<Text
										style={[
											styles.emptyTitle,
											{
												color: theme.text,
											},
										]}
									>
										Ничего не найдено
									</Text>
									<Text
										style={[
											styles.emptySubtitle,
											{
												color: theme.textSecondary,
											},
										]}
									>
										Попробуйте изменить
										запрос, например: «21
										нмо» или «Сайфуллина»
									</Text>
								</View>
							) : null
						}
						renderItem={({ item }) => (
							<TouchableOpacity
								style={[
									styles.resultItem,
									{
										backgroundColor:
											theme.card,
										borderColor:
											theme.border,
									},
								]}
								activeOpacity={0.7}
								onPress={() =>
									handleSelect(item)
								}
							>
								<View
									style={[
										styles.typeIconBadge,
										{
											backgroundColor: `${getTypeColor(item.Type)}20`,
										},
									]}
								>
									<Ionicons
										name={
											getTypeIcon(
												item.Type
											) as any
										}
										size={20}
										color={getTypeColor(
											item.Type
										)}
									/>
								</View>

								<View style={styles.resultInfo}>
									<Text
										style={[
											styles.resultName,
											{
												color: theme.text,
											},
										]}
									>
										{item.SearchContent}
									</Text>
									<Text
										style={[
											styles.resultType,
											{
												color: theme.textSecondary,
											},
										]}
									>
										{getTypeLabel(item.Type)}
									</Text>
								</View>

								<Ionicons
									name="chevron-forward"
									size={18}
									color={theme.textSecondary}
								/>
							</TouchableOpacity>
						)}
					/>
				) : (
					<FlatList
						data={[]}
						renderItem={null}
						contentContainerStyle={
							styles.listContent
						}
						ListHeaderComponent={
							<>
								{/* Быстрые подсказки */}
								<View style={styles.section}>
									<Text
										style={[
											styles.sectionTitle,
											{
												color: theme.textSecondary,
											},
										]}
									>
										ПОПУЛЯРНЫЕ В АПК
									</Text>
									{SUGGESTIONS.map((item) => (
										<TouchableOpacity
											key={`sug-${item.SearchId}`}
											style={[
												styles.resultItem,
												{
													backgroundColor:
														theme.card,
													borderColor:
														theme.border,
												},
											]}
											activeOpacity={0.7}
											onPress={() =>
												handleSelect(
													item
												)
											}
										>
											<View
												style={[
													styles.typeIconBadge,
													{
														backgroundColor: `${getTypeColor(item.Type)}20`,
													},
												]}
											>
												<Ionicons
													name={
														getTypeIcon(
															item.Type
														) as any
													}
													size={18}
													color={getTypeColor(
														item.Type
													)}
												/>
											</View>
											<View
												style={
													styles.resultInfo
												}
											>
												<Text
													style={[
														styles.resultName,
														{
															color: theme.text,
														},
													]}
												>
													{
														item.SearchContent
													}
												</Text>
												<Text
													style={[
														styles.resultType,
														{
															color: theme.textSecondary,
														},
													]}
												>
													{getTypeLabel(
														item.Type
													)}
												</Text>
											</View>
											<Ionicons
												name="chevron-forward"
												size={18}
												color={
													theme.textSecondary
												}
											/>
										</TouchableOpacity>
									))}
								</View>
							</>
						}
					/>
				)}
			</SafeAreaView>
		</Modal>
	);
};

const styles = StyleSheet.create({
	safeArea: {
		flex: 1,
	},
	header: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingHorizontal: 20,
		paddingVertical: 14,
		borderBottomWidth: StyleSheet.hairlineWidth,
	},
	title: {
		fontSize: 20,
		fontWeight: "700",
	},
	closeButton: {
		padding: 2,
	},
	searchBarContainer: {
		paddingHorizontal: 16,
		paddingVertical: 10,
	},
	searchBar: {
		flexDirection: "row",
		alignItems: "center",
		borderRadius: 12,
		paddingHorizontal: 10,
		height: 40,
	},
	searchIcon: {
		marginRight: 8,
	},
	input: {
		flex: 1,
		fontSize: 15,
		paddingVertical: 0,
	},
	filterRow: {
		flexDirection: "row",
		paddingHorizontal: 16,
		paddingVertical: 10,
		borderBottomWidth: StyleSheet.hairlineWidth,
		gap: 8,
	},
	filterChip: {
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 16,
	},
	filterText: {
		fontSize: 13,
		fontWeight: "600",
	},
	listContent: {
		paddingHorizontal: 16,
		paddingTop: 16,
		paddingBottom: 40,
	},
	section: {
		marginBottom: 24,
	},
	sectionTitle: {
		fontSize: 12,
		fontWeight: "700",
		letterSpacing: 0.5,
		marginBottom: 8,
		marginLeft: 4,
	},
	resultItem: {
		flexDirection: "row",
		alignItems: "center",
		padding: 12,
		borderRadius: 14,
		marginBottom: 8,
		borderWidth: StyleSheet.hairlineWidth,
	},
	typeIconBadge: {
		width: 36,
		height: 36,
		borderRadius: 18,
		alignItems: "center",
		justifyContent: "center",
		marginRight: 12,
	},
	resultInfo: {
		flex: 1,
	},
	resultName: {
		fontSize: 16,
		fontWeight: "700",
	},
	resultType: {
		fontSize: 12,
		marginTop: 2,
	},
	emptyContainer: {
		alignItems: "center",
		justifyContent: "center",
		paddingVertical: 60,
		paddingHorizontal: 20,
	},
	emptyTitle: {
		fontSize: 17,
		fontWeight: "700",
		marginTop: 12,
	},
	emptySubtitle: {
		fontSize: 14,
		textAlign: "center",
		marginTop: 6,
		lineHeight: 20,
	},
});
