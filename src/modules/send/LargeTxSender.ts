import * as sdk from 'boa-sdk-ts';

import { logger, Logger } from '../common/Logger';
import { Config } from '../common/Config';
import { prepare, wait } from '../utils/Process';
import { WK } from '../utils/WK';
import {KeyPair} from "boa-sdk-ts";

export class LargeTxSender
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

                    let utxo_manager = new sdk.UTXOManager(utxos);

                    let sum = utxo_manager.getSum()[0];
                    if (sdk.JSBI.lessThanOrEqual(sum, sdk.JSBI.BigInt(2000)))
                        continue;

                    let destination_key_pairs: Array<KeyPair> = [];
                    for (let i = 0; i < 1000; i++)
                        destination_key_pairs.push(WK.keys(i));
                    let builder = new sdk.TxBuilder(source_key_pair);

                    let send_amount = sdk.JSBI.divide(sum, sdk.JSBI.BigInt(2000));
                    let total_amount = sdk.JSBI.multiply(send_amount, sdk.JSBI.BigInt(destination_key_pairs.length));

                    logger.info(`Sender: ${source_key_pair.address.toString()}`);

                    // Get UTXO for the amount to need.
                    let spent_utxos = utxo_manager.getUTXO(total_amount, height);

                    if (spent_utxos.length > 0) {
                        spent_utxos.forEach((u: sdk.UnspentTxOutput) => builder.addInput(u.utxo, u.amount));
                        for (let key_pair of destination_key_pairs)
                            builder.addOutput(key_pair.address, send_amount);
                        tx = builder
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

                if (sdk.JSBI.greaterThan(height, sdk.JSBI.BigInt(0)))
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
                    let json = JSON.stringify(tx);
                    //logger.info(`TX (send / ${height.toString()}) : ${json}`);
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
                        data : h,
                        size : json.length
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
