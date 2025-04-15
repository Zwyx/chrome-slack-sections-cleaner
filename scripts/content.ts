const CONFIG_STORAGE_KEY = "chrome_slack_sections_cleaner_config";
const LAST_RUN_TIME_CONFIG_STORAGE_KEY =
	"chrome_slack_sections_cleaner_last_run_time";

const DELAY_BETWEEN_RUNS_IN_HOURS = 24;

interface Config {
	teamNames: string;
	sectionNames: string;
	channelAgeInDays: number;
}

interface SlackLocalConfig {
	teams: {
		[id: string]: {
			id: string;
			name: string;
			token: string;
		};
	};
}

interface SlackApiResponse {
	ok: boolean;
}

interface ChannelSection {
	channel_section_id: string;
	name: string;
	channel_ids_page: {
		channel_ids: string[];
		count: number;
	};
}

interface ChannelSectionResponse extends SlackApiResponse {
	channel_sections: ChannelSection[];
}

interface ConversationLatestUpdates {
	[update: string]: string;
}

interface ConversationHistoryResponse extends SlackApiResponse {
	latest_updates: ConversationLatestUpdates;
}

function log(msg: string) {
	console.info(`[Slack Sections Cleaner] ${msg}`);
}

async function main() {
	function setNextTimeout() {
		log(`Setting next run for ${DELAY_BETWEEN_RUNS_IN_HOURS} hours from now.`);
		setTimeout(main, DELAY_BETWEEN_RUNS_IN_HOURS * 60 * 60 * 1000);
	}

	log("Starting...");

	const { [CONFIG_STORAGE_KEY]: rawConfig } = await chrome.storage.sync.get(
		CONFIG_STORAGE_KEY,
	);

	const config: Config = rawConfig;

	if (
		!(
			config &&
			typeof config === "object" &&
			typeof config.teamNames === "string" &&
			config.teamNames &&
			typeof config.sectionNames === "string" &&
			config.sectionNames &&
			typeof config.channelAgeInDays === "number" &&
			config.channelAgeInDays
		)
	) {
		log("Invalid extension configuration, exiting.");
		return setNextTimeout();
	}

	const slackLocalConfig: SlackLocalConfig = JSON.parse(
		localStorage.getItem("localConfig_v2") || "{}",
	);

	if (!slackLocalConfig.teams) {
		log("Empty or unrecognised Slack configuration, exiting.");
		return setNextTimeout();
	}

	const { [LAST_RUN_TIME_CONFIG_STORAGE_KEY]: storedLastRunTime } =
		await chrome.storage.sync.get(LAST_RUN_TIME_CONFIG_STORAGE_KEY);

	if (
		typeof storedLastRunTime === "number" &&
		new Date().getTime() - storedLastRunTime <
			DELAY_BETWEEN_RUNS_IN_HOURS * 60 * 60 * 1000 - 60 * 1000
	) {
		log(
			`Last run was less than ${DELAY_BETWEEN_RUNS_IN_HOURS} hours ago, exiting.`,
		);
		return setNextTimeout();
	}

	await chrome.storage.sync.set({
		[LAST_RUN_TIME_CONFIG_STORAGE_KEY]: new Date().getTime(),
	});

	const teamNames = config.teamNames
		.split(",")
		.map((teamName) => teamName.trim());

	const sectionNames = config.sectionNames
		.split(",")
		.map((sectionName) => sectionName.trim());

	log(`- Teams: ${teamNames.join(", ")}`);
	log(`- Sections: ${sectionNames.join(", ")}`);
	log(`- Channel age in days: ${config.channelAgeInDays}`);

	for (const team of Object.values(slackLocalConfig.teams)) {
		if (!teamNames.includes(team.name)) {
			continue;
		}

		log(`Cleaning team ${team.name}...`);

		let channelSections: ChannelSection[];

		try {
			const channelSectionsResponse: ChannelSectionResponse = await (
				await fetch(
					`https://slack.com/api/users.channelSections.list?slack_route=${team.id}&_x_version_ts=1744611152&_x_frontend_build_type=current&_x_desktop_ia=4&_x_gantry=true&fp=af&_x_num_retries=0`,
					{
						headers: {
							accept: "*/*",
							"content-type":
								"multipart/form-data; boundary=----WebKitFormBoundaryhBVohucGosZCNHTT",
						},
						referrerPolicy: "no-referrer",
						body: `------WebKitFormBoundaryhBVohucGosZCNHTT\r\nContent-Disposition: form-data; name="token"\r\n\r\n${team.token}\r\n------WebKitFormBoundaryhBVohucGosZCNHTT\r\nContent-Disposition: form-data; name="_x_reason"\r\n\r\nconditional-fetch-manager\r\n------WebKitFormBoundaryhBVohucGosZCNHTT\r\nContent-Disposition: form-data; name="_x_mode"\r\n\r\nonline\r\n------WebKitFormBoundaryhBVohucGosZCNHTT\r\nContent-Disposition: form-data; name="_x_sonic"\r\n\r\ntrue\r\n------WebKitFormBoundaryhBVohucGosZCNHTT\r\nContent-Disposition: form-data; name="_x_app_name"\r\n\r\nclient\r\n------WebKitFormBoundaryhBVohucGosZCNHTT--\r\n`,
						method: "POST",
						mode: "cors",
						credentials: "include",
					},
				)
			).json();

			if (!channelSectionsResponse.ok) {
				throw Error("'ok' is not 'true' in response.");
			}

			channelSections = channelSectionsResponse.channel_sections;
		} catch (err) {
			log(`Error fetching 'users.channelSections.list': ${err}`);
			return setNextTimeout();
		}

		for (const channelSection of channelSections) {
			if (!sectionNames.includes(channelSection.name)) {
				continue;
			}

			log(`Cleaning channel section ${channelSection.name}...`);

			for (const channelId of channelSection.channel_ids_page.channel_ids) {
				log(`Getting info for channel ${channelId}...`);

				let conversationLatestUpdates: ConversationLatestUpdates;

				try {
					const conversationHistoryResponse: ConversationHistoryResponse =
						await (
							await fetch(
								`https://slack.com/api/conversations.history?slack_route=${team.name}&_x_version_ts=1744674042&_x_frontend_build_type=current&_x_desktop_ia=4&_x_gantry=true&fp=af&_x_num_retries=0`,
								{
									headers: {
										accept: "*/*",
										"content-type":
											"multipart/form-data; boundary=----WebKitFormBoundarytkcwglFcYRVgLGgM",
									},
									referrerPolicy: "no-referrer",
									body: `------WebKitFormBoundarytkcwglFcYRVgLGgM\r\nContent-Disposition: form-data; name="token"\r\n\r\n${team.token}\r\n------WebKitFormBoundarytkcwglFcYRVgLGgM\r\nContent-Disposition: form-data; name="channel"\r\n\r\n${channelId}\r\n------WebKitFormBoundarytkcwglFcYRVgLGgM\r\nContent-Disposition: form-data; name="limit"\r\n\r\n28\r\n------WebKitFormBoundarytkcwglFcYRVgLGgM\r\nContent-Disposition: form-data; name="ignore_replies"\r\n\r\ntrue\r\n------WebKitFormBoundarytkcwglFcYRVgLGgM\r\nContent-Disposition: form-data; name="include_pin_count"\r\n\r\ntrue\r\n------WebKitFormBoundarytkcwglFcYRVgLGgM\r\nContent-Disposition: form-data; name="inclusive"\r\n\r\ntrue\r\n------WebKitFormBoundarytkcwglFcYRVgLGgM\r\nContent-Disposition: form-data; name="no_user_profile"\r\n\r\ntrue\r\n------WebKitFormBoundarytkcwglFcYRVgLGgM\r\nContent-Disposition: form-data; name="include_stories"\r\n\r\ntrue\r\n------WebKitFormBoundarytkcwglFcYRVgLGgM\r\nContent-Disposition: form-data; name="include_free_team_extra_messages"\r\n\r\ntrue\r\n------WebKitFormBoundarytkcwglFcYRVgLGgM\r\nContent-Disposition: form-data; name="include_date_joined"\r\n\r\ntrue\r\n------WebKitFormBoundarytkcwglFcYRVgLGgM\r\nContent-Disposition: form-data; name="cached_latest_updates"\r\n\r\n{}\r\n------WebKitFormBoundarytkcwglFcYRVgLGgM\r\nContent-Disposition: form-data; name="_x_reason"\r\n\r\nmessage-pane/requestHistory\r\n------WebKitFormBoundarytkcwglFcYRVgLGgM\r\nContent-Disposition: form-data; name="_x_mode"\r\n\r\nonline\r\n------WebKitFormBoundarytkcwglFcYRVgLGgM\r\nContent-Disposition: form-data; name="_x_sonic"\r\n\r\ntrue\r\n------WebKitFormBoundarytkcwglFcYRVgLGgM\r\nContent-Disposition: form-data; name="_x_app_name"\r\n\r\nclient\r\n------WebKitFormBoundarytkcwglFcYRVgLGgM--\r\n`,
									method: "POST",
									mode: "cors",
									credentials: "include",
								},
							)
						).json();

					if (!conversationHistoryResponse.ok) {
						throw Error("'ok' is not 'true' in response.");
					}

					conversationLatestUpdates =
						conversationHistoryResponse.latest_updates;
				} catch (err) {
					log(`Error fetching 'conversations.history': ${err}`);
					return setNextTimeout();
				}

				const latestUpdate = Number(
					Object.values(conversationLatestUpdates).sort().at(-1),
				);

				const timeDifferenceInDays =
					(new Date().getTime() - latestUpdate * 1000) / (24 * 60 * 60 * 1000);

				log(
					`Number of days since last update in channel ${channelId}: ${timeDifferenceInDays}`,
				);

				if (timeDifferenceInDays < config.channelAgeInDays) {
					continue;
				}

				log(
					`Removing channel ${channelId} from section ${channelSection.name}...`,
				);

				try {
					const slackApiResponse: SlackApiResponse = await (
						await fetch(
							`https://slack.com/api/users.channelSections.channels.bulkUpdate?slack_route=${team.name}&_x_version_ts=1744679553&_x_frontend_build_type=current&_x_desktop_ia=4&_x_gantry=true&fp=af&_x_num_retries=0`,
							{
								headers: {
									accept: "*/*",
									"content-type":
										"multipart/form-data; boundary=----WebKitFormBoundary3V6AzfH9JOpmoazH",
								},
								referrerPolicy: "no-referrer",
								body: `------WebKitFormBoundary3V6AzfH9JOpmoazH\r\nContent-Disposition: form-data; name="token"\r\n\r\n${team.token}\r\n------WebKitFormBoundary3V6AzfH9JOpmoazH\r\nContent-Disposition: form-data; name="remove"\r\n\r\n[{"channel_section_id":"${channelSection.channel_section_id}","channel_ids":["${channelId}"]}]\r\n------WebKitFormBoundary3V6AzfH9JOpmoazH\r\nContent-Disposition: form-data; name="insert"\r\n\r\n[]\r\n------WebKitFormBoundary3V6AzfH9JOpmoazH\r\nContent-Disposition: form-data; name="_x_reason"\r\n\r\nchannel-ctx-menu-remove\r\n------WebKitFormBoundary3V6AzfH9JOpmoazH\r\nContent-Disposition: form-data; name="_x_mode"\r\n\r\nonline\r\n------WebKitFormBoundary3V6AzfH9JOpmoazH\r\nContent-Disposition: form-data; name="_x_sonic"\r\n\r\ntrue\r\n------WebKitFormBoundary3V6AzfH9JOpmoazH\r\nContent-Disposition: form-data; name="_x_app_name"\r\n\r\nclient\r\n------WebKitFormBoundary3V6AzfH9JOpmoazH--\r\n`,
								method: "POST",
								mode: "cors",
								credentials: "include",
							},
						)
					).json();

					if (!slackApiResponse.ok) {
						throw Error("'ok' is not 'true' in response.");
					}
				} catch (err) {
					log(
						`Error fetching 'users.channelSections.channels.bulkUpdate': ${err}`,
					);
					return setNextTimeout();
				}
			}
		}
	}

	log("Finished");

	setNextTimeout();
}

// Using two `setTimeout`s instead of one `setInterval` ensures that
// in no circumstances events can be stacked and triggered all together

setTimeout(main, 60 * 1000);
