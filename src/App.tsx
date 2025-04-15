import { useCallback, useEffect, useState } from "react";
import favicon from "/favicon.png";

const CONFIG_STORAGE_KEY = "chrome_slack_sections_cleaner_config";

interface Config {
	teamNames: string;
	sectionNames: string;
	channelAgeInDays: number;
}

const App = () => {
	const [config, setConfig] = useState<Config>({
		teamNames: "",
		sectionNames: "",
		channelAgeInDays: 180,
	});

	useEffect(() => {
		chrome.storage.sync
			.get(CONFIG_STORAGE_KEY)
			.then(({ [CONFIG_STORAGE_KEY]: rawConfig }) => {
				const storedConfig: Config = rawConfig;

				if (
					storedConfig &&
					typeof storedConfig === "object" &&
					(typeof storedConfig.teamNames === "string" ||
						storedConfig.teamNames === undefined) &&
					(typeof storedConfig.sectionNames === "string" ||
						storedConfig.sectionNames === undefined) &&
					(typeof storedConfig.channelAgeInDays === "number" ||
						storedConfig.channelAgeInDays === undefined)
				) {
					setConfig(storedConfig);
				}
			})
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
		</div>
	);
};

export default App;
