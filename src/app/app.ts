import express, { Application } from 'express';
import cors from 'cors';
import * as fs from "fs";
import * as path from "path";
import bodyparser from 'body-parser';
import { Server, createServer } from "http";
import * as sslserver from "https";
import { connect, connection } from "mongoose";
import { attachRoutes } from './helpers/decorators';
import * as socket from "./socket/socket";
import { Session as session } from "./services/session"
import { RabbitmqConnection } from "./services/rabbitmq"

class App {
	public app: Application;
	public server: Server;
	public port: number;
	public socketIo: any;

	constructor(controllers: any[], port: number) {
		this.app = express();
		if (process.env.SSL == "true") {
			var ssloptions = {
				key: fs.readFileSync(path.join(__dirname, 'ssl/privkey.pem')),
				cert: fs.readFileSync(path.join(__dirname, 'ssl/cert.pem')),
				//    ca: fs.readFileSync(path.join(__dirname, resolveURL('keys/domain-ca.pem')))
			};
			this.server = sslserver.createServer(ssloptions, this.app);
		} else {
			this.server = createServer(this.app);
		}

		this.port = port;
		// this._connectToRabbitMQ()
		this._startSocket();
		this._startSession();
		this._initializeMiddlewares();
		// this._connectToDatabase();
		this._initializeControllers(controllers);
	}

	private _initializeMiddlewares() {
		this.app.use(cors());
		this.app.use(bodyparser.json({ limit: "50mb" }));
		this.app.use(bodyparser.urlencoded({ limit: "50mb", extended: true, parameterLimit: 50000 }));
		this.app.use((req: any, res, next) => {
			req.socketIo = this.socketIo;
			next();
		})
	}

	private _connectToRabbitMQ() {
		RabbitmqConnection.connect();
		process.on('exit', (code) => {
			RabbitmqConnection.close();
			console.log(`Closing rabbitmq channel`);
		})
	}
	private _initializeControllers(controllers: any[]) {
		attachRoutes(this.app, controllers);

	}

	private _connectToDatabase() {
		const { MONGO_USER, MONGO_PASSWORD, MONGO_HOST, MONGO_DB } = process.env;
		const mongoDBUrl = `mongodb://${MONGO_USER}:${MONGO_PASSWORD}@${MONGO_HOST}:27017/${MONGO_DB}`;

		connect(mongoDBUrl, { useNewUrlParser: true, useFindAndModify: false });

		connection.once("open", () => {
			console.info("Connected to mongo");
		});

		connection.on('error', (err) => {
			console.error('Unable to connect to Mongo via Mongoose', err);
		});
	}
	private _startSession() {
		session.connect();
	}
	private _startSocket() {
		this.socketIo = socket.listen(this.server);
	}

	public listen() {
		this.server.listen(this.port, () => {
			console.log(`Server listening on the port ${this.port}`);
		});
	}
}

export default App;
