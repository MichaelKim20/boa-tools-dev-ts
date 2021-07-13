import * as sdk from "boa-sdk-ts";

import { Config } from "../common/Config";

export class InfoProvider {
    private boa_client: sdk.BOAClient;
    private config: Config;

    constructor() {
        this.config = Config.getInstance();
        this.boa_client = new sdk.BOAClient(
            this.config.server.stoa_endpoint.toString(),
            this.config.server.agora_endpoint.toString()
        );
    }

    public getInformation(): Promise<any> {
        return new Promise<any>(async (resolve) => {
            try {
                let height = await this.boa_client.getBlockHeight();
                resolve({
                    status: true,
                    error: "",
                    data: {
                        height: height.toString(),
                    },
                });
            } catch (e) {
                console.log(e);
                resolve({
                    status: false,
                    error: e.message,
                    data: {
                        height: "",
                    },
                });
            }
        });
    }
}
