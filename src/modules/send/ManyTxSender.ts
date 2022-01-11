import * as sdk from "boa-sdk-ts";

import { logger, Logger } from "../common/Logger";
import { Config } from "../common/Config";
import { prepare, wait } from "../utils/Process";
import { WK } from "../utils/WK";
import {OutputType} from "boa-sdk-ts";

export class ManyTxSender {
    private boa_client: sdk.BOAClient;
    private config: Config;
    private readonly source: number;

    constructor() {
        this.config = Config.getInstance();
        this.boa_client = new sdk.BOAClient(
            this.config.server.stoa_endpoint.toString(),
            this.config.server.agora_endpoint.toString()
        );
        this.source = 0;
    }

    createTransaction(height: sdk.JSBI): Promise<sdk.Transaction[]> {
        return new Promise<sdk.Transaction[]>(async (resolve, reject) => {
            try {
                let key_count = this.config.process.key_count;
                let tx: sdk.Transaction;
                while (true) {
                    let utxos: Array<sdk.UnspentTxOutput> = [];
                    let source_key_pair = WK.keys(this.source);
                    try {
                        utxos = await this.boa_client.getUTXOs(source_key_pair.address);
                    } catch (e) {
                        logger.error(e);
                    }
                    if (utxos.length === 0) return reject(new Error("Not enough amount"));

                    let destination = Math.floor(Math.random() * key_count);
                    while (this.source === destination) destination = Math.floor(Math.random() * key_count);
                    let destination_key_pair = WK.keys(destination);

                    let builder = new sdk.TxBuilder(source_key_pair);
                    let utxo_manager = new sdk.UTXOManager(utxos);

                    let sum = utxo_manager.getSum()[0];
                    if (sdk.JSBI.lessThanOrEqual(sum.value, sdk.JSBI.BigInt(0))) continue;

                    let tx_sz = sdk.Transaction.getEstimatedNumberOfBytes(3, 2, 0);
                    let fees = await this.boa_client.getTransactionFee(tx_sz);
                    let fee = sdk.JSBI.BigInt(fees.medium);

                    let send_amount = sdk.JSBI.BigInt(10000 * 10000000);
                    let total_send_amount = sdk.JSBI.add(send_amount, fee);
                    let txs: sdk.Transaction[] = [];

                    for (let idx = 0; idx < 10; idx++) {
                        let spent_utxos = utxo_manager.getUTXO(total_send_amount, height);
                        if (spent_utxos.length > 0) {
                            tx_sz = sdk.Transaction.getEstimatedNumberOfBytes(spent_utxos.length, 2, 0);
                            fees = await this.boa_client.getTransactionFee(tx_sz);
                            fee = sdk.JSBI.BigInt(fees.medium);

                            spent_utxos.forEach((u: sdk.UnspentTxOutput) => builder.addInput(OutputType.Payment, u.utxo, u.amount));
                            tx = builder
                                .addOutput(destination_key_pair.address, send_amount)
                                .sign(sdk.OutputType.Payment, fee);
                            txs.push(tx);
                        }
                    }
                    return resolve(txs);
                }
            } catch (e) {
                reject(e);
            }
        });
    }

    public makeBlock(): Promise<any> {
        return new Promise<any>(async (resolve, reject) => {
            try {
                let height: sdk.JSBI = sdk.JSBI.BigInt(0);

                try {
                    height = await this.boa_client.getBlockHeight();
                } catch (e) {
                    logger.error(e);
                    return resolve({
                        status: false,
                        error: e,
                    });
                }

                if (sdk.JSBI.greaterThan(height, sdk.JSBI.BigInt(0))) {
                    let txs: sdk.Transaction[];
                    try {
                        let send_count = 0;
                        let total_count = 0;
                        let hash: Array<string> = [];
                        txs = await this.createTransaction(height);
                        if (txs.length > 0) {
                            for (let tx of txs) {
                                let h = sdk.hashFull(tx).toString();
                                hash.push(h);
                                logger.info(`TX_HASH (send / ${height.toString()}) : ${h}`);
                                try {
                                    await this.boa_client.sendTransaction(tx);
                                    send_count++;
                                } catch (e) {
                                    logger.error(e);
                                }
                                await wait(5000);
                            }
                        }
                        return resolve({
                            status: true,
                            data: {
                                send_count: send_count,
                                total_count: total_count,
                                hash: hash,
                            },
                        });
                    } catch (e) {
                        return resolve({
                            status: false,
                            error: "Please try shortly after Genesis Coin is distributed.",
                        });
                    }
                } else {
                    return resolve({
                        status: false,
                        error: "The block height is 0",
                    });
                }
            } catch (e) {
                return resolve({
                    status: false,
                    error: e,
                });
            }
        });
    }

    send(): Promise<any> {
        return new Promise<any>(async (resolve) => {
            await prepare();
            WK.make();
            let res = await this.makeBlock();
            resolve(res);
        });
    }
}
