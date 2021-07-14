import * as sdk from "boa-sdk-ts";

import { logger, Logger } from "../common/Logger";
import { Config } from "../common/Config";
import { prepare, wait } from "../utils/Process";
import { WK } from "../utils/WK";

export class RandomTxSender2In {
    private boa_client: sdk.BOAClient;
    private config: Config;

    constructor() {
        this.config = Config.getInstance();
        this.boa_client = new sdk.BOAClient(
            this.config.server.stoa_endpoint.toString(),
            this.config.server.agora_endpoint.toString()
        );
    }

    createTransaction(height: sdk.JSBI): Promise<sdk.Transaction> {
        return new Promise<sdk.Transaction>(async (resolve, reject) => {
            try {
                let key_count = this.config.process.key_count;
                let tx: sdk.Transaction;
                let sources: Array<number> = [];
                while (true) {
                    let utxos1: Array<sdk.UnspentTxOutput> = [];
                    let utxos2: Array<sdk.UnspentTxOutput> = [];

                    let source1 = Math.floor(Math.random() * key_count);
                    while (sources.find((value) => value == source1) !== undefined)
                        source1 = Math.floor(Math.random() * key_count);
                    sources.push(source1);

                    let source2 = Math.floor(Math.random() * key_count);
                    while (sources.find((value) => value == source2) !== undefined)
                        source2 = Math.floor(Math.random() * key_count);
                    sources.push(source2);

                    let source_key_pair1 = WK.keys(source1);
                    let source_key_pair2 = WK.keys(source2);
                    try {
                        utxos1 = await this.boa_client.getUTXOs(source_key_pair1.address);
                        utxos2 = await this.boa_client.getUTXOs(source_key_pair2.address);
                    } catch (e) {
                        logger.error(e);
                    }
                    if (utxos1.length === 0 || utxos2.length === 0) return reject(new Error("Not enough amount"));

                    let destination = Math.floor(Math.random() * key_count);
                    while (source1 === destination || source2 === destination)
                        destination = Math.floor(Math.random() * key_count);
                    let destination_key_pair = WK.keys(destination);

                    let utxo_manager1 = new sdk.UTXOManager(utxos1);
                    let utxo_manager2 = new sdk.UTXOManager(utxos2);

                    let sum1 = utxo_manager1.getSum()[0];
                    if (sdk.JSBI.lessThanOrEqual(sum1, sdk.JSBI.BigInt(0))) continue;

                    let sum2 = utxo_manager2.getSum()[0];
                    if (sdk.JSBI.lessThanOrEqual(sum2, sdk.JSBI.BigInt(0))) continue;

                    let range = sdk.JSBI.BigInt(Math.floor(Math.random() * 50) + 20);
                    let send_amount1 = sdk.JSBI.divide(sdk.JSBI.multiply(sum1, range), sdk.JSBI.BigInt(100));
                    let send_amount2 = sdk.JSBI.divide(sdk.JSBI.multiply(sum2, range), sdk.JSBI.BigInt(100));

                    let spent_utxos1 = utxo_manager1.getUTXO(send_amount1, height);
                    let spent_utxos2 = utxo_manager2.getUTXO(send_amount2, height);

                    let builder = new sdk.TxBuilder(source_key_pair1);
                    if (spent_utxos1.length > 0 && spent_utxos2.length > 0) {
                        let tx_sz = sdk.Transaction.getEstimatedNumberOfBytes(
                            spent_utxos1.length + spent_utxos2.length,
                            1,
                            0
                        );
                        let fees = await this.boa_client.getTransactionFee(tx_sz);
                        let fee = sdk.JSBI.BigInt(fees.medium);

                        spent_utxos1.forEach((u: sdk.UnspentTxOutput) =>
                            builder.addInput(u.utxo, u.amount, source_key_pair1.secret)
                        );
                        spent_utxos2.forEach((u: sdk.UnspentTxOutput) =>
                            builder.addInput(u.utxo, u.amount, source_key_pair2.secret)
                        );
                        let send_amount = sdk.JSBI.subtract(sdk.JSBI.add(send_amount1, send_amount2), fee);
                        console.log(send_amount.toString());
                        console.log(source_key_pair1.address.toString(), send_amount1.toString());
                        console.log(source_key_pair2.address.toString(), send_amount2.toString());
                        tx = builder
                            .addOutput(destination_key_pair.address, send_amount)
                            .sign(sdk.OutputType.Payment, fee);
                        return resolve(tx);
                    }
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
                    let tx: sdk.Transaction;
                    try {
                        tx = await this.createTransaction(height);
                    } catch (e) {
                        return resolve({
                            status: false,
                            error: "Please try shortly after Genesis Coin is distributed.",
                        });
                    }

                    let h = sdk.hashFull(tx).toString();
                    logger.info(`TX_HASH (send / ${height.toString()}) : ${h}`);
                    try {
                        await this.boa_client.sendTransaction(tx);
                    } catch (e) {
                        return resolve({
                            status: false,
                            error: e,
                        });
                    }

                    return resolve({
                        status: true,
                        data: h,
                    });
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
