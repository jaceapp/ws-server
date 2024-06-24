import http from 'http';
import { Server as socketIo } from 'socket.io';
import Redis from 'ioredis';
import dotenv from 'dotenv';

// @TODO: REQUIRES CLEANUP. I hate this, but TIME

function startServer(customConfig = {}) {
    let process = getConfig(customConfig);

    const server = http.createServer();
    const io = new socketIo(server, {
        cors: {
            origin: process.parsed.APP_URL, // Adjust with your Laravel app's origin
            methods: ["GET", "POST"], // Methods allowed
            credentials: true, // If credentials are needed
        },
    });

    // Connect to Redis
    const redis = new Redis({
        host: process.parsed.REDIS_HOST, // Redis server host
        port: process.parsed.REDIS_PORT, // Redis server port
        password: process.parsed.REDIS_PASSWORD,
    });

    // Subscribe to the private channel
    const channelName = "laravel_database_chat-room"; // Adjusted for the Laravel event name

    redis.subscribe(channelName, (err, count) => {
        if (err) {
            console.error("Failed to subscribe: %s", err.message);
        } else {
            console.log(
                `Subscribed successfully! Currently subscribed to ${count} channel(s).`,
            );
        }
    });

    // Handle messages received from Redis
    redis.on("message", (channel, message) => {
        if (channel === channelName) {
            // Deserialize the Laravel broadcasted message
            const eventData = JSON.parse(message);

            switch (eventData.data.type) {
                case "SendMessageEvent":
                    io.emit("SendMessageEvent", eventData.data.data);
                    break;
                case "DeleteMessagesEvent":
                    io.emit("DeleteMessagesEvent", eventData.data.data);
                    break;
                case "BanUserEvent":
                    io.emit("BanUserEvent", eventData.data.data);
                    break;
            }
        }
    });

    io.on("connection", (socket) => {
        console.log("A user connected");

        socket.on("disconnect", () => {
            console.log("User disconnected");
        });
    });

    // TODO: Somesort of global const for stuff like this
    server.listen(process.parsed.JACE_WEBSOCKET_PORT ?? 3000, () => {
        console.log("Socket.IO server listening on port " + process.parsed.JACE_WEBSOCKET_PORT ?? 3000);
    });
}

function getConfig(customConfig = {}) {
    let process = dotenv.config();

    for (const [key, value] of Object.entries(customConfig)) {
        process.parsed[key] = value;
    }

    return process;
}

export default startServer;
