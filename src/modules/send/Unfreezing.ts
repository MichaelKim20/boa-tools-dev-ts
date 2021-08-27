import * as sdk from "boa-sdk-ts";
import { OutputType } from "boa-sdk-ts";

import { logger } from "../common/Logger";
import { Config } from "../common/Config";
import { prepare, wait } from "../utils/Process";
import { WK } from "../utils/WK";

export class Unfreezing {
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
                let utxos: Array<sdk.UnspentTxOutput>;
                let sender = sdk.KeyPair.fromSeed(
                    new sdk.SecretKey("SAWI3JZWDDSQR6AX4DRG2OMS26Y6XY4X2WA3FK6D5UW4WTU74GUQXRZP")
                );
                utxos = await this.boa_client.getUTXOs(sender.address);
                let frozen: Array<sdk.UnspentTxOutput> = [];
                utxos.forEach((m) => {
                    if (m.type == OutputType.Freeze) frozen.push(m);
                });

                if (frozen.length > 0) {
                    let tx_size = sdk.Transaction.getEstimatedNumberOfBytes(1, 1, 0);
                    let fees = await this.boa_client.getTransactionFee(tx_size);
                    let tx_fee = sdk.JSBI.BigInt(fees.medium);
                    let amount: sdk.JSBI = sdk.JSBI.subtract(frozen[0].amount.value, tx_fee);
                    let builder = new sdk.TxBuilder(sender);
                    builder.addInput(frozen[0].utxo, frozen[0].amount);
                    builder.addOutput(sender.address, amount);
                    let tx = builder.sign(sdk.OutputType.Payment, tx_fee);
                    console.log(JSON.stringify(tx));
                    return resolve(tx);
                } else {
                    reject(new Error("Frozen UTXO does not exist."));
                }
            } catch (e) {
                reject(e);
            }
        });
    }

    makeBlock(): Promise<any> {
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
