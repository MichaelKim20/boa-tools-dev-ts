import * as sdk from 'boa-sdk-ts';

import { logger, Logger } from '../common/Logger';
import { Config } from '../common/Config';
import { prepare, wait } from '../utils/Process';
import { WK } from '../utils/WK';

export class RandomTxSender2
{
    private boa_client: sdk.BOAClient;
    private config: Config;

    constructor ()
    {
        this.config = Config.getInstance();
        this.boa_client = new sdk.BOAClient(
            this.config.server.stoa_endpoint.toString(),
            this.config.server.agora_endpoint.toString());
    }

    createTransaction (height: sdk.JSBI): Promise<sdk.Transaction>
    {
        return new Promise<sdk.Transaction>(async (resolve, reject) => {
            try
            {
                let key_count = this.config.process.key_count;
                let tx: sdk.Transaction;
                let sources: Array<number> = [];
                while (true) {
                    let utxos: Array<sdk.UnspentTxOutput> = [];
                    let source = Math.floor(Math.random() * key_count);
                    while (sources.find(value => value == source) !== undefined)
                        source = Math.floor(Math.random() * key_count);
                    sources.push(source);
                    let source_key_pair = WK.keys(source);
                    try {
                        utxos = await this.boa_client.getUTXOs(source_key_pair.address);
                    } catch (e) {
                        logger.error(e);
                    }
                    if (utxos.length === 0)
                        return reject(new Error("Not enough amount"));

                    let destination = Math.floor(Math.random() * key_count);
                    while (source === destination)
                        destination = Math.floor(Math.random() * key_count);
                    let destination_key_pair = WK.keys(destination);

                    let builder = new sdk.TxBuilder(source_key_pair);
                    let utxo_manager = new sdk.UTXOManager(utxos);

                    let sum = utxo_manager.getSum()[0];
                    if (sdk.JSBI.lessThanOrEqual(sum, sdk.JSBI.BigInt(0)))
                        continue;

                    let range = sdk.JSBI.BigInt(Math.floor(Math.random() * 50) + 20);
                    let send_amount = sdk.JSBI.divide(sdk.JSBI.multiply(sum, range), sdk.JSBI.BigInt(100));

                    logger.info(`Sender: ${source_key_pair.address.toString()}, Receiver: ${destination_key_pair.address.toString()}, amount: ${send_amount.toString()}`);

                    // Get UTXO for the amount to need.
                    let spent_utxos = utxo_manager.getUTXO(send_amount, height);

                    if (spent_utxos.length > 0) {
                        spent_utxos.forEach((u: sdk.UnspentTxOutput) => builder.addInput(u.utxo, u.amount));
                        tx = builder
                            .addOutput(destination_key_pair.address, send_amount)
                            .sign(sdk.TxType.Payment);
                        return resolve(tx);
                    }
                }
            }
            catch (e)
            {
                reject(e);
            }
        });
    }

    public makeBlock(): Promise<any>
    {
        return new Promise<any>(async (resolve, reject) =>
        {
            try
            {
                let height: sdk.JSBI = sdk.JSBI.BigInt(0);

                try
                {
                    height = await this.boa_client.getBlockHeight();
                } catch (e) {
                    logger.error(e);
                    return resolve({
                        status: false,
                        error: e
                    });
                }

                if (
                    (sdk.JSBI.greaterThan(height, sdk.JSBI.BigInt(0))) &&
                    (sdk.JSBI.lessThan(height, sdk.JSBI.BigInt(1000))))
                {
                    let tx:sdk.Transaction;
                    try {
                        tx = await this.createTransaction(height);
                    }
                    catch (e) {
                        return resolve({
                            status: false,
                            error : "Please try shortly after Genesis Coin is distributed."
                        });
                    }

                    let h = sdk.hashFull(tx).toString();
                    logger.info(`TX_HASH (send / ${height.toString()}) : ${h}`);
                    try {
                        await this.boa_client.sendTransaction(tx);
                    }
                    catch (e) {
                        return resolve({
                            status: false,
                            error : e
                        });
                    }

                    return resolve({
                        status: true,
                        data : h
                    });
                }
                else
                {
                    return resolve({
                        status: false,
                        error: "The block height is 0"
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
        return new Promise<any>(async (resolve) =>
        {
            await prepare();
            WK.make();
            let res = await this.makeBlock();
            resolve(res);
        });
    }
}