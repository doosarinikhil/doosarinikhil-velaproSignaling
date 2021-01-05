import App from './app';
import { config } from "dotenv";
import { WelcomeController } from './controllers';

//For dotenv.
config();

const app = new App(
  //controllers of array
  [
    new WelcomeController()
  ],
  Number(process.env.SERVERPORT || 9000)
).listen();