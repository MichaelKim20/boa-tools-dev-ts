import * as sdk from "boa-sdk-ts";

import { Config } from "../common/Config";
import { logger, Logger } from "../common/Logger";
import { prepare, wait } from "../utils/Process";
import { WK } from "../utils/WK";

export class Distributor {
    private boa_client: sdk.BOAClient;
    private config: Config;

    constructor() {
        this.config = Config.getInstance();
        this.boa_client = new sdk.BOAClient(
            this.config.server.stoa_endpoint.toString(),
            this.config.server.agora_endpoint.toString()
        );
    }

    public isDistributed(): Promise<boolean> {
        return new Promise<any>(async (resolve, reject) => {
            const wallet = new sdk.Wallet(WK.Genesis(), {
                agoraEndpoint: this.config.server.agora_endpoint.toString(),
                stoaEndpoint: this.config.server.stoa_endpoint.toString(),
                fee: sdk.WalletFeeOption.Medium,
            });
            wallet.getBalance().then((res: sdk.IWalletResult) => {
                if (res.code !== sdk.WalletResultCode.Success || res.data === undefined) return reject();

                const balance: sdk.Balance = res.data;
                if (sdk.JSBI.equal(balance.spendable, sdk.BOA(488_000_000).value)) return resolve(false);
                else return resolve(true);
            });
        });
    }

    public createTransaction(): Promise<sdk.Transaction[]> {
        return new Promise<sdk.Transaction[]>(async (resolve, reject) => {
            try {
                const res: sdk.Transaction[] = [];
                const key_count = this.config.process.key_count;
                let utxos: sdk.UnspentTxOutput[];
                try {
                    utxos = await this.boa_client.getUTXOs(WK.GenesisKey.address);
                } catch (e) {
                    logger.error(e);
                    return reject(e);
                }
                if (utxos.length < 1) return resolve([]);

                const count = utxos.length - 1;
                const tx_out_count = Math.ceil(key_count / count);

                for (let idx = 0; idx < count; idx++) {
                    const tx_sz = sdk.Transaction.getEstimatedNumberOfBytes(1, tx_out_count, 0);
                    const fees = await this.boa_client.getTransactionFee(tx_sz);
                    const fee = sdk.JSBI.BigInt(fees.medium);

                    const sum: sdk.JSBI = sdk.JSBI.subtract(utxos[idx].amount.value, fee);
                    const amount = sdk.JSBI.divide(sum, sdk.JSBI.BigInt(tx_out_count));
                    const remain = sdk.JSBI.subtract(sum, sdk.JSBI.multiply(amount, sdk.JSBI.BigInt(tx_out_count)));

                    const builder = new sdk.TxBuilder(WK.GenesisKey);

                    builder.addInput(utxos[idx].utxo, utxos[idx].amount);
                    for (let key_idx = 0; key_idx < tx_out_count; key_idx++) {
                        if (key_idx < tx_out_count - 1)
                            builder.addOutput(WK.keys(idx * tx_out_count + key_idx).address, amount);
                        else
                            builder.addOutput(
                                WK.keys(idx * tx_out_count + key_idx).address,
                                sdk.JSBI.add(amount, remain)
                            );
                    }
                    const tx = builder.sign(sdk.OutputType.Payment, fee);
                    res.push(tx);
                }

                {
                    const validators = [
                        WK.NODE2().address,
                        WK.NODE3().address,
                        WK.NODE4().address,
                        WK.NODE5().address,
                        WK.NODE6().address,
                        WK.NODE7().address,
                        WK.NODE2().address,
                        WK.NODE3().address,
                        WK.NODE4().address,
                        WK.NODE5().address,
                        WK.NODE6().address,
                        WK.NODE7().address,
                        WK.NODE2().address,
                        WK.NODE3().address,
                        WK.NODE4().address,
                        WK.NODE5().address,
                        WK.NODE6().address,
                        WK.NODE7().address,
                        WK.NODE2().address,
                        WK.NODE3().address,
                        WK.NODE4().address,
                        WK.NODE5().address,
                        WK.NODE6().address,
                        WK.NODE7().address,
                        WK.NODE2().address,
                        WK.NODE3().address,
                        WK.NODE4().address,
                        WK.NODE5().address,
                        WK.NODE6().address,
                        WK.NODE7().address,
                        WK.keys(0).address,
                        WK.keys(0).address,
                        WK.keys(0).address,
                        WK.keys(0).address,
                        WK.keys(0).address,
                        WK.keys(0).address,
                        WK.keys(0).address,
                        WK.keys(0).address,
                        WK.keys(0).address,
                        WK.keys(0).address,
                        WK.keys(0).address,
                        WK.keys(0).address,
                        WK.keys(0).address,
                        WK.keys(0).address,
                        WK.keys(0).address,
                        WK.keys(0).address,
                        WK.keys(0).address,
                        WK.keys(0).address,
                        WK.keys(0).address,
                        WK.keys(0).address,
                        WK.keys(0).address,
                        WK.keys(0).address,
                        WK.keys(0).address,
                        WK.keys(0).address,
                        WK.keys(0).address,
                        WK.keys(0).address,
                        WK.keys(0).address,
                        WK.keys(0).address,
                        WK.keys(0).address,
                        WK.keys(0).address,
                        WK.keys(0).address,
                        WK.keys(0).address,
                        WK.keys(0).address,
                        WK.keys(0).address,
                        WK.keys(0).address,
                        WK.keys(0).address,
                        WK.keys(0).address,
                        WK.keys(0).address,
                        WK.keys(0).address,
                        WK.keys(0).address,
                        WK.keys(0).address,
                        WK.keys(0).address,
                        WK.keys(0).address,
                        WK.keys(0).address,
                        WK.keys(0).address,
                        WK.keys(0).address,
                        WK.keys(0).address,
                        WK.keys(0).address,
                        WK.keys(0).address,
                        WK.keys(0).address,
                        WK.keys(0).address,
                        WK.keys(0).address,
                        WK.keys(0).address,
                        WK.keys(0).address,
                    ];

                    const tx_sz = sdk.Transaction.getEstimatedNumberOfBytes(1, validators.length, 0);
                    const fees = await this.boa_client.getTransactionFee(tx_sz);
                    const fee = sdk.JSBI.BigInt(fees.medium);

                    const idx = utxos.length - 1;
                    const sum: sdk.JSBI = sdk.JSBI.subtract(utxos[idx].amount.value, fee);
                    const amount = sdk.JSBI.divide(sum, sdk.JSBI.BigInt(validators.length));
                    const remain = sdk.JSBI.subtract(
                        sum,
                        sdk.JSBI.multiply(amount, sdk.JSBI.BigInt(validators.length))
                    );
                    const builder = new sdk.TxBuilder(WK.GenesisKey);
                    builder.addInput(utxos[idx].utxo, utxos[idx].amount);
                    for (let key_idx = 0; key_idx < validators.length; key_idx++) {
                        if (key_idx < validators.length - 1) builder.addOutput(validators[key_idx], amount);
                        else builder.addOutput(validators[key_idx], sdk.JSBI.add(amount, remain));
                    }
                    const tx = builder.sign(sdk.OutputType.Payment, fee);
                    res.unshift(tx);
                }

                return resolve(res);
            } catch (e) {
                reject(e);
            }
        });
    }

    public makeBlock(): Promise<any> {
        return new Promise<any>(async (resolve, reject) => {
            try {
                let distributed: boolean;
                try {
                    distributed = await this.isDistributed();
                } catch (e) {
                    return resolve({
                        status: false,
                        error: e,
                    });
                }

                if (!distributed) {
                    let send_count = 0;
                    let total_count = 0;
                    const hash: string[] = [];
                    const txs = await this.createTransaction();
                    total_count = txs.length;
                    if (txs.length > 0) {
                        for (const tx of txs) {
                            const h = sdk.hashFull(tx).toString();
                            hash.push(h);
                            logger.info(`TX_HASH (send ) : ${h}`);
                            try {
                                await this.boa_client.sendTransaction(tx);
                                send_count++;
                            } catch (e) {
                                logger.error(e);
                            }
                            await wait(Config.getInstance().process.delay);
                        }
                    }
                    return resolve({
                        status: true,
                        data: {
                            send_count,
                            total_count,
                            hash,
                        },
                    });
                } else {
                    return resolve({
                        status: false,
                        error: "The block height isn't 0",
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

    public send(): Promise<any> {
        return new Promise<any>(async (resolve) => {
            await prepare();
            WK.make();
            const res = await this.makeBlock();
            resolve(res);
        });
    }
}
