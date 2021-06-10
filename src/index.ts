import dotenv from "dotenv";
import express from "express";
import path from "path";
import * as routes from "./routes";

import { logger, Logger } from './modules/common/Logger';
import { Config } from './modules/common/Config';
import {Page, RandomTxSender2} from "./modules";

import bodyParser from 'body-parser';

// Create with the arguments and read from file
let config = Config.createWithArgument();

Config.saveInstance(config);

// Now configure the logger with the expected transports
switch (process.env.NODE_ENV) {
    case "test":
        // Logger is silent, do nothingg
        break;

    case "development":
        // Only use the console log
        logger.add(Logger.defaultConsoleTransport());
        break;

    case "production":
    default:
        // Read the config file and potentially use both
        logger.add(Logger.defaultFileTransport(config.logging.folder));
        if (config.logging.console)
            logger.add(Logger.defaultConsoleTransport());
}
logger.transports.forEach((tp:any) => { tp.level = config.logging.level });

logger.info(`Stoa endpoint: ${config.server.stoa_endpoint.toString()}`);
logger.info(`Agora endpoint: ${config.server.agora_endpoint.toString()}`);

dotenv.config();

const port = process.env.SERVER_PORT || 5000;
const app = express();

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))
// parse application/json
app.use(bodyParser.json())
app.use(express.json());

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

app.use(express.static(path.join(__dirname, "public")));

// Configure routes
routes.register(app);

// start the express server
app.listen(port, () => {
    // tslint:disable-next-line:no-console
    console.log(`server started at http://localhost:${port}`);
});
/*
function autoSendRandomTx()
{
    if (config.process.auto_send)
    {
        const sender = new RandomTxSender2();
        sender.send()
            .then((result) =>
            {
                console.log(`${result.status}; ${result.data}`);
            })
            .finally(() =>
            {
                setTimeout(autoSendRandomTx, 5000);
            })
    }
    else {
        setTimeout(autoSendRandomTx, 5000);
    }
}

if (config.process.auto_send) {
    setTimeout(autoSendRandomTx, 5000);
}
*/
