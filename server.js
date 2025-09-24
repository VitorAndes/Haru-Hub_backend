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


async function fetchGameDetails(gameIds) {
	const detailsPromises = gameIds.map(async (gameId) => {
		try {
			const detailsResponse = await fetch(
				`https://store.steampowered.com/api/appdetails?appids=${gameId}&l=portuguese`,
			);

			if (!detailsResponse.ok) {
				console.warn(`Failed to fetch details for gameId: ${gameId} - Status: ${detailsResponse.status}`);
				return null;
			}

			const data = await detailsResponse.json();
			
			
			const gameData = data[gameId];
			if (!gameData || !gameData.success) {
				console.warn(`No valid data returned for gameId: ${gameId}`);
				return null;
			}

			return { [gameId]: gameData };
		} catch (error) {
			console.warn(`Error fetching details for gameId ${gameId}:`, error.message);
			return null;
		}
	});

	const detailsData = await Promise.all(detailsPromises);
	
	
	const validDetails = detailsData.filter(detail => detail !== null);
	
	return validDetails.reduce((acc, details) => {
		const key = Object.keys(details)[0];
		acc[key] = details[key];
		return acc;
	}, {});
}

async function fetchSteamAPI(url, errorMessage) {
	const response = await fetch(url);
	
	if (!response.ok) {
		throw new Error(`${errorMessage} - Status: ${response.status}`);
	}
	
	return response.json();
}

Fastify.get("/user", async (request, reply) => {
	try {
		const data = await fetchSteamAPI(
			`https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${steamApiKey}&steamids=${steamApiId}&format=json&l=portuguese`,
			"Failed to fetch user data"
		);

		reply.send(data);
	} catch (error) {
		console.error("Error in /user endpoint:", error.message);
		reply.status(500).send({ 
			error: "Failed to fetch user data from Steam API",
			details: error.message 
		});
	}
});

Fastify.get("/games", async (request, reply) => {
	try {
		const data = await fetchSteamAPI(
			`https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=${steamApiKey}&steamid=${steamApiId}&format=json`,
			"Failed to fetch owned games"
		);

		console.log("Response games:", data);

		if (!data.response || !data.response.games || data.response.games.length === 0) {
			return reply.status(404).send({ 
				error: "No games found for this user" 
			});
		}

		const gameIds = data.response.games.map((game) => game.appid);
		console.log(`Fetching details for ${gameIds.length} games...`);

		const combinedDetails = await fetchGameDetails(gameIds);
		
		console.log(`Successfully fetched details for ${gameIds.length} games`);

		reply.send({
			totalGames: gameIds.length,
			games: combinedDetails
		});

	} catch (error) {
		console.error("Error in /games endpoint:", error.message);
		reply.status(500).send({ 
			error: "Failed to fetch games data from Steam API",
			details: error.message 
		});
	}
});

Fastify.get("/recentlyPlayedGames", async (request, reply) => {
	try {
		const data = await fetchSteamAPI(
			`https://api.steampowered.com/IPlayerService/GetRecentlyPlayedGames/v0001/?key=${steamApiKey}&steamid=${steamApiId}&format=json`,
			"Failed to fetch recently played games"
		);

		if (!data.response || !data.response.games || data.response.games.length === 0) {
			return reply.status(404).send({ 
				error: "No recently played games found for this user" 
			});
		}

		const gameIds = data.response.games.map((game) => game.appid);
		console.log(`Fetching details for ${gameIds.length} recently played games...`);

		const combinedDetails = await fetchGameDetails(gameIds);
		
		console.log(`Successfully fetched details for ${gameIds.length} recently played games`);

		reply.send({
			totalGames: gameIds.length,
			games: combinedDetails
		});

	} catch (error) {
		console.error("Error in /recentlyPlayedGames endpoint:", error.message);
		reply.status(500).send({ 
			error: "Failed to fetch recently played games from Steam API",
			details: error.message 
		});
	}
});


Fastify.get("/health", async (request, reply) => {
	reply.send({ 
		status: "OK", 
		timestamp: new Date().toISOString(),
		uptime: process.uptime()
	});
});


Fastify.setErrorHandler((error, request, reply) => {
	console.error("Global error handler:", error);
	reply.status(500).send({
		error: "Internal server error",
		message: error.message
	});
});

try {
	await Fastify.listen({
		host: "0.0.0.0",
		port: port,
	});
	console.log(`Server running on http://0.0.0.0:${port}`);
} catch (err) {
	console.error("Error starting server:", err);
	process.exit(1);
}