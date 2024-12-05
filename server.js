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
      `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${steamApiKey}&steamids=${steamApiId}&format=json`
    );
    const data = await response.json();
    console.log(data);

    reply.send(data);
  } catch (error) {
    reply.status(500).send({ error: "Failed to fetch data from API" });
  }
});

Fastify.get("/friends", async (request, reply) => {
  try {
    const response = await fetch(
      `https://api.steampowered.com/ISteamUser/GetFriendList/v0001/?key=${steamApiKey}&steamid=${steamApiId}&relationship=friend`
    );
    const data = await response.json();
    console.log(data);

    reply.send(data);
  } catch (error) {
    reply.status(500).send({ error: "Failed to fetch data from API" });
  }
});

Fastify.listen({
  port: port,
});
