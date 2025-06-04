import { useCallback, useEffect, useState } from "react";
import favicon from "/favicon.png";

const CONFIG_STORAGE_KEY = "chrome_slack_sections_cleaner_config";
const HISTORY_STORAGE_KEY = "chrome_slack_sections_cleaner_history";

interface Config {
	teamNames: string;
	sectionNames: string;
	channelAgeInDays: number;
}

type Event = {
	date: string;
	message: string;
};

type History = Event[];

const App = () => {
	const [config, setConfig] = useState<Config>({
		teamNames: "",
		sectionNames: "",
		channelAgeInDays: 180,
	});

	const [history, setHistory] = useState<History>();

	useEffect(() => {
		chrome.storage.sync
			.get([CONFIG_STORAGE_KEY, HISTORY_STORAGE_KEY])
			.then(
				({
					[CONFIG_STORAGE_KEY]: rawConfig,
					[HISTORY_STORAGE_KEY]: rawHistory,
				}) => {
					const storedConfig: Config = rawConfig;
					const storedHistory: History = rawHistory;

					if (
						typeof storedConfig === "object" &&
						storedConfig &&
						(typeof storedConfig.teamNames === "string" ||
							storedConfig.teamNames === undefined) &&
						(typeof storedConfig.sectionNames === "string" ||
							storedConfig.sectionNames === undefined) &&
						(typeof storedConfig.channelAgeInDays === "number" ||
							storedConfig.channelAgeInDays === undefined)
					) {
						setConfig(storedConfig);
					}

					if (
						Array.isArray(storedHistory) &&
						storedHistory.every(
							(element) =>
								element &&
								typeof element === "object" &&
								typeof element.date === "string" &&
								typeof element.message === "string",
						)
					) {
						setHistory(storedHistory);
					}
				},
			)
			.catch(console.error);
	}, []);

	const updateConfig = useCallback((newPartialConfig: Partial<Config>) => {
		setConfig((prevConfig) => {
			const newConfig = { ...prevConfig, ...newPartialConfig };

			chrome.storage.sync
				.set({ [CONFIG_STORAGE_KEY]: newConfig })
				.catch(console.error);

			return newConfig;
		});
	}, []);

	return (
		<div className="flex max-h-[550px] w-[500px] flex-col gap-6 overflow-auto p-8">
			<img src={favicon} width={20} alt="logo" />

			<div className="flex flex-col gap-4">
				<div>
					<label htmlFor="workspaces" className="select-none">
						Workspace names (case-sensitive, separated by commas)
					</label>

					<input
						id="workspaces"
						className="w-full rounded border border-gray-600 px-1 py-0.5 dark:border-gray-400"
						value={config.teamNames}
						onChange={(e) => updateConfig({ teamNames: e.target.value })}
					/>
				</div>

				<div>
					<label htmlFor="sections" className="select-none">
						Sections names (case-sensitive, separated by commas)
					</label>

					<input
						id="sections"
						className="w-full rounded border border-gray-600 px-1 py-0.5 dark:border-gray-400"
						value={config.sectionNames}
						onChange={(e) => updateConfig({ sectionNames: e.target.value })}
					/>
				</div>

				<div>
					<label htmlFor="channelAgeInDays" className="select-none">
						Number of days after which a channel is removed from a section
					</label>

					<input
						id="channelAgeInDays"
						type="number"
						className="w-full rounded border border-gray-600 px-1 py-0.5 dark:border-gray-400"
						value={config.channelAgeInDays}
						onChange={(e) =>
							updateConfig({
								channelAgeInDays: Math.abs(parseInt(e.target.value)) || 1,
							})
						}
					/>
				</div>
			</div>

			{history?.length && (
				<>
					<div className="border-t border-t-gray-500" />

					<div className="flex flex-col gap-1">
						{history?.map(({ date, message }) => (
							<div key={`${date}-${message}`}>
								[<span className="font-mono">{date}</span>] {message}
							</div>
						))}
					</div>
				</>
			)}
		</div>
	);
};

export default App;
