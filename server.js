import cors from "@fastify/cors";
import dotenv from "dotenv";
import fastify from "fastify";
dotenv.config();

const port = process.env.PORT || 3333;
const steamApiKey = process.env.STEAM_API_KEY;
const steamApiId = process.env.STEAM_API_ID;

const Fastify = fastify({ logger: true });

await Fastify.register(cors, {
	origin: "*",
	methods: ["GET"],
});

Fastify.get("/user", async (request, reply) => {
	try {
		const response = await fetch(
			`https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${steamApiKey}&steamids=${steamApiId}&format=json%l=portuguese`,
		);
		const data = await response.json();

		reply.send(data);
	} catch (error) {
		reply.status(500).send({ error: "Failed to fetch data from API" });
	}
});

Fastify.get("/friends", async (request, reply) => {
	try {
		const response = await fetch(
			`https://api.steampowered.com/ISteamUser/GetFriendList/v0001/?key=${steamApiKey}&steamid=${steamApiId}&relationship=friend`,
		);
		const data = await response.json();

		reply.send(data);
	} catch (error) {
		reply.status(500).send({ error: "Failed to fetch data from API" });
	}
});

Fastify.get("/games", async (request, reply) => {
	try {
		const response = await fetch(
			`https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=${steamApiKey}&steamid=${steamApiId}&format=json`,
		);

		if (!response.ok) {
			throw new Error("Failed to fetch owned games");
		}

		const data = await response.json();

		console.log("response games", data);

		if (!data.response || !data.response.games) {
			return reply.status(404).send({ error: "No games found" });
		}

		const gameIds = data.response.games.map((game) => game.appid);

		const detailsPromises = gameIds.map(async (gameId) => {
			const detailsResponse = await fetch(
				`https://store.steampowered.com/api/appdetails?appids=${gameId}&l=portuguese`,
			);

			if (!detailsResponse.ok) {
				throw new Error(`Failed to fetch details for gameId: ${gameId}`);
			}

			return detailsResponse.json();
		});

		const detailsData = await Promise.all(detailsPromises);

		const combinedDetails = detailsData.reduce((acc, details) => {
			const key = Object.keys(details)[0];
			acc[key] = details[key];
			return acc;
		}, {});		
		reply.send(combinedDetails);
	} catch (error) {
		console.error(error);
		reply.status(500).send({ error: "Failed to fetch data from API" });
	}
});

Fastify.get("/recentlyPlayedGames", async (request, reply) => {
	try {
		const response = await fetch(
			`https://api.steampowered.com/IPlayerService/GetRecentlyPlayedGames/v0001/?key=${steamApiKey}&steamid=${steamApiId}&format=json`,
		);

		if (!response.ok) {
			throw new Error("Failed to fetch RecentlyPlayedGames");
		}

		const data = await response.json();

		const gameIds = data.response.games.map((game) => game.appid);

		const detailsPromises = gameIds.map(async (gameId) => {
			const detailsResponse = await fetch(
				`https://store.steampowered.com/api/appdetails?appids=${gameId}&l=portuguese`,
			);

			if (!detailsResponse.ok) {
				throw new Error(`Failed to fetch details for gameId: ${gameId}`);
			}

			return detailsResponse.json();
		});

		const detailsData = await Promise.all(detailsPromises);

		const combinedDetails = detailsData.reduce((acc, details) => {
			const key = Object.keys(details)[0];
			acc[key] = details[key];
			return acc;
		}, {});

		reply.send(combinedDetails);
		reply.header("Access-Control-Allow-Origin", "*");
	} catch (error) {
		console.error(error);
		reply.status(500).send({ error: "Failed to fetch data from API" });
	}
});

Fastify.listen({
	host: "0.0.0.0",
	port: port,
});
