import * as sdk from 'boa-sdk-ts';

import { logger, Logger } from '../common/Logger';
import { Config } from '../common/Config';
import { prepare, wait } from '../utils/Process';
import { WK } from '../utils/WK';

export class Distributor {
    private boa_client: sdk.BOAClient;
    private config: Config;

    constructor ()
    {
        this.config = Config.getInstance();
        this.boa_client = new sdk.BOAClient(
            this.config.server.stoa_endpoint.toString(),
            this.config.server.agora_endpoint.toString());
    }

    createTransaction (height: sdk.JSBI): Promise<sdk.Transaction[]>
    {
        return new Promise<sdk.Transaction[]>(async (resolve, reject) => {
            try
            {
                let res: sdk.Transaction[] = [];
                let key_count = this.config.process.key_count;
                let utxos: Array<sdk.UnspentTxOutput>;
                try {
                    utxos = await this.boa_client.getUTXOs(WK.GenesisKey.address);
                } catch (e) {
                    logger.error(e);
                    return reject(e);
                }
                if (utxos.length === 0)
                    return resolve([]);

                let count = utxos.length;
                let tx_out_count = Math.ceil(key_count / count);

                for (let idx = 0; idx < count; idx++)
                {
                    let sum: sdk.JSBI = utxos[idx].amount;
                    let amount = sdk.JSBI.divide(sum, sdk.JSBI.BigInt(tx_out_count));
                    let builder = new sdk.TxBuilder(WK.GenesisKey);
                    builder.addInput(utxos[idx].utxo, utxos[idx].amount);
                    for (let key_idx = 0; key_idx < tx_out_count; key_idx++) {
                        builder.addOutput(WK.keys((idx * tx_out_count) + key_idx).address, amount);
                    }
                    let tx = builder.sign(sdk.TxType.Payment);
                    res.push(tx);
                }

                return resolve(res);
            }
            catch (e)
            {
                reject(e);
            }
        });
    }

    makeBlock(): Promise<any>
    {
        return new Promise<any>(async (resolve, reject) =>
        {
            try
            {
                let height: sdk.JSBI = sdk.JSBI.BigInt(0);
                try {
                    height = await this.boa_client.getBlockHeight();
                } catch (e) {
                    logger.error(e);
                    return resolve({
                        status: false,
                        error: e
                    });
                }

                if (sdk.JSBI.equal(height, sdk.JSBI.BigInt(0))) {

                    let send_count = 0;
                    let total_count = 0;
                    let hash:Array<string> = [];
                    let txs = await this.createTransaction(height);
                    total_count = txs.length;
                    if (txs.length > 0) {
                        for (let tx of txs) {
                            let h = sdk.hashFull(tx).toString();
                            hash.push(h);
                            logger.info(`TX_HASH (send / ${height.toString()}) : ${h}`);
                            try {
                                await this.boa_client.sendTransaction(tx);
                                send_count++;
                            }
                            catch (e) {
                                logger.error(e);
                            }
                            await wait(this.config.process.delay);
                        }
                    }
                    return resolve({
                        status: true,
                        data : {
                            send_count: send_count,
                            total_count: total_count,
                            hash: hash
                        }
                    });
                }
                else
                {
                    return resolve({
                        status: false,
                        error: "The block height isn't 0"
                    });
                }
            }
            catch (e)
            {
                return resolve({
                    status: false,
                    error: e
                });
            }
        });
    }

    send(): Promise<any>
    {
        return new Promise<any>(async (resolve) => {
            await prepare();
            WK.make();
            let res = await this.makeBlock();
            resolve(res);
        });
    }
}
