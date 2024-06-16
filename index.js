import http from 'http';
import { Server as socketIo } from 'socket.io';
import Redis from 'ioredis';

// @TODO: move this to laravel package, and make it "copy it over" during yace:install
// @TODO: Use Laravel .env for these configurations
// @TODO: Do not use "*"
// @TODO: REQUIRES CLEANUP. Everything is in one file.

function startServer() {
    const server = http.createServer();
    const io = new socketIo(server, {
        cors: {
            origin: "*", // Adjust with your Laravel app's origin
            methods: ["GET", "POST"], // Methods allowed
            credentials: true, // If credentials are needed
        },
    });

    // Connect to Redis
    const redis = new Redis({
        host: "127.0.0.1", // Redis server host
        port: 6379, // Redis server port
        password: "root",
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
        console.log(socket);
        console.log("A user connected");

        socket.on("disconnect", () => {
            console.log("User disconnected");
        });
    });

    server.listen(3000, () => {
        console.log("Socket.IO server listening on port 3000");
    });
}

export default startServer;
