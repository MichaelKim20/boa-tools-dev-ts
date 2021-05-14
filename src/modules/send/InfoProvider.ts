import * as sdk from 'boa-sdk-ts';

import { logger, Logger } from '../common/Logger';
import { Config } from '../common/Config';
import { prepare, wait } from '../utils/Process';
import { WK } from '../utils/WK';

export class InfoProvider
{
    private boa_client: sdk.BOAClient;
    private config: Config;

    constructor () {
        this.config = Config.getInstance();
        this.boa_client = new sdk.BOAClient(
            this.config.server.stoa_endpoint.toString(),
            this.config.server.agora_endpoint.toString());
    }

    public getInformation (): Promise<any>
    {
        return new Promise<any>(async (resolve) =>
        {
            try {
                let height = await this.boa_client.getBlockHeight();
                let validators = await this.boa_client.getAllValidators();
                resolve({
                    status: true,
                    error: "",
                    data : {
                        height: height.toString(),
                        validators: validators.map(m => m.address.toString())
                    }
                });
            } catch (e) {
                resolve({
                    status: false,
                    error: e.message,
                    data : {
                        height: "",
                        validators: ""
                    }
                });
            }
        });

    }
}
