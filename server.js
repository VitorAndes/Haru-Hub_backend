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

const gameDetailsCache = new Map();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 horas em ms

function getCachedGame(gameId) {
  const cached = gameDetailsCache.get(gameId);
  if (!cached) return null;
  
  const now = Date.now();
  if (now - cached.timestamp > CACHE_DURATION) {
    gameDetailsCache.delete(gameId);
    return null;
  }
  
  return cached.data;
}

function setCachedGame(gameId, data) {
  gameDetailsCache.set(gameId, {
    data,
    timestamp: Date.now(),
  });
}

async function fetchGameDetails(gameIds) {
  const uncachedIds = [];
  const result = {};
  
  for (const gameId of gameIds) {
    const cached = getCachedGame(gameId);
    if (cached) {
      result[gameId] = cached;
    } else {
      uncachedIds.push(gameId);
    }
  }
  
  console.log(`Cache: ${Object.keys(result).length} hits, ${uncachedIds.length} misses`);
  
  if (uncachedIds.length === 0) {
    return result;
  }
  

  const detailsPromises = uncachedIds.map(async (gameId) => {
    try {
      const detailsResponse = await fetch(
        `https://store.steampowered.com/api/appdetails?appids=${gameId}&l=portuguese`
      );

      if (!detailsResponse.ok) {
        console.warn(
          `Failed to fetch details for gameId: ${gameId} - Status: ${detailsResponse.status}`
        );
        return null;
      }

      const data = await detailsResponse.json();

      const gameData = data[gameId];
      if (!gameData || !gameData.success) {
        console.warn(`No valid data returned for gameId: ${gameId}`);
        return null;
      }

      setCachedGame(gameId, gameData);

      return { [gameId]: gameData };
    } catch (error) {
      console.warn(
        `Error fetching details for gameId: ${gameId} - ${error.message}`
      );
      return null;
    }
  });

  const detailsData = await Promise.all(detailsPromises);
  const validDetails = detailsData.filter((detail) => detail !== null);

 
  validDetails.forEach((details) => {
    const key = Object.keys(details)[0];
    result[key] = details[key];
  });

  return result;
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
      details: error.message,
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

    if (
      !data.response ||
      !data.response.games ||
      data.response.games.length === 0
    ) {
      return reply.status(404).send({
        error: "No games found for this user",
      });
    }

    const gameIds = data.response.games.map((game) => game.appid);
    console.log(`Fetching details for ${gameIds.length} games...`);

    const combinedDetails = await fetchGameDetails(gameIds);

    const validGamesCount = Object.keys(combinedDetails).length;
    
    if (validGamesCount === 0) {
      return reply.status(503).send({
        error: "Failed to fetch game details",
        details: "Could not retrieve details for any games. Steam Store API might be unavailable.",
      });
    }

    console.log(`Successfully fetched details for ${validGamesCount} games`);

    reply.send({
      totalGames: gameIds.length,
      validGames: validGamesCount,
      games: combinedDetails,
    });
  } catch (error) {
    console.error("Error in /games endpoint:", error.message);
    reply.status(500).send({
      error: "Failed to fetch games data from Steam API",
      details: error.message,
    });
  }
});

Fastify.get("/recentlyPlayedGames", async (request, reply) => {
  try {
    const data = await fetchSteamAPI(
      `https://api.steampowered.com/IPlayerService/GetRecentlyPlayedGames/v0001/?key=${steamApiKey}&steamid=${steamApiId}&format=json`,
      "Failed to fetch recently played games"
    );

    if (
      !data.response ||
      !data.response.games ||
      data.response.games.length === 0
    ) {
      return reply.status(404).send({
        error: "No recently played games found for this user",
      });
    }

    const gameIds = data.response.games.map((game) => game.appid);
    console.log(
      `Fetching details for ${gameIds.length} recently played games...`
    );

    const combinedDetails = await fetchGameDetails(gameIds);

    const validGamesCount = Object.keys(combinedDetails).length;

    if (validGamesCount === 0) {
      return reply.status(503).send({
        error: "Failed to fetch game details",
        details: "Could not retrieve details for any recently played games. Steam Store API might be unavailable.",
      });
    }

    console.log(
      `Successfully fetched details for ${validGamesCount} recently played games`
    );

    reply.send({
      totalGames: gameIds.length,
      validGames: validGamesCount,
      games: combinedDetails,
    });
  } catch (error) {
    console.error("Error in /recentlyPlayedGames endpoint:", error.message);
    reply.status(500).send({
      error: "Failed to fetch recently played games from Steam API",
      details: error.message,
    });
  }
});

Fastify.delete("/cache", async (request, reply) => {
  gameDetailsCache.clear();
  reply.send({
    message: "Cache cleared successfully",
    timestamp: new Date().toISOString(),
  });
});

Fastify.get("/cache/stats", async (request, reply) => {
  reply.send({
    totalGames: gameDetailsCache.size,
    cacheDuration: `${CACHE_DURATION / (60 * 60 * 1000)} hours`,
    games: Array.from(gameDetailsCache.keys()),
  });
});

Fastify.get("/health", async (request, reply) => {
  reply.send({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    cacheSize: gameDetailsCache.size,
  });
});

Fastify.setErrorHandler((error, request, reply) => {
  console.error("Global error handler:", error);
  reply.status(500).send({
    error: "Internal server error",
    message: error.message,
  });
});

try {
  await Fastify.listen({
    host: "0.0.0.0",
    port: port,
  });
  console.log(`Server running on http://0.0.0.0:${port}`);
  console.log(`Cache duration: ${CACHE_DURATION / (60 * 60 * 1000)} hours`);
} catch (err) {
  console.error("Error starting server:", err);
  process.exit(1);
}