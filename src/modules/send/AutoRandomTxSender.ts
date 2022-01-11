import * as sdk from "boa-sdk-ts";

import { Config } from "../common/Config";
import { logger } from "../common/Logger";
import { prepare, wait } from "../utils/Process";
import { WK } from "../utils/WK";
import {Amount} from "boa-sdk-ts";

export class AutoRandomTxSender {
    private static doing_genesis: boolean = false;
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
                endpoint: {
                    agora: this.config.server.agora_endpoint.toString(),
                    stoa: this.config.server.stoa_endpoint.toString(),
                },
                fee: sdk.WalletTransactionFeeOption.Medium,
            });
            wallet.getBalance().then((res: sdk.IWalletResult<sdk.WalletBalance>) => {
                if (res.code !== sdk.WalletResultCode.Success || res.data === undefined) return reject();

                const balance: sdk.WalletBalance = res.data;
                if (sdk.Amount.equal(balance.spendable, sdk.BOA(476_000_000))) return resolve(false);
                else return resolve(true);
            });
        });
    }

    public sendRandTransaction(): Promise<any> {
        return new Promise<any>(async (resolve, reject) => {
            const key_count = this.config.process.key_count;
            const source = Math.floor(Math.random() * key_count);
            const source_key_pair = WK.keys(source);

            let destination = Math.floor(Math.random() * key_count);
            while (source === destination) destination = Math.floor(Math.random() * key_count);
            const destination_key_pair = WK.keys(destination);

            const wallet = new sdk.Wallet(source_key_pair, {
                endpoint: {
                    agora: this.config.server.agora_endpoint.toString(),
                    stoa: this.config.server.stoa_endpoint.toString(),
                },
                fee: sdk.WalletTransactionFeeOption.Medium,
            });

            wallet
                .getBalance()
                .then((bal_res: sdk.IWalletResult<sdk.WalletBalance>) => {
                    if (bal_res.code !== sdk.WalletResultCode.Success || bal_res.data === undefined) {
                        return resolve({
                            status: false,
                            error: bal_res.message,
                        });
                    }
                    if (sdk.Amount.lessThan(bal_res.data.spendable, Amount.make(100))) {
                        return resolve({
                            status: false,
                            error: "Not enough amount",
                        });
                    }
                    const range = sdk.JSBI.BigInt(Math.floor(Math.random() * 40) + 10);
                    const send_amount = sdk.JSBI.divide(
                        sdk.JSBI.multiply(bal_res.data.spendable.value, range),
                        sdk.JSBI.BigInt(100)
                    );
                    const receivers = [
                        {
                            address: destination_key_pair.address,
                            amount: new sdk.Amount(send_amount),
                        },
                    ];
                    wallet
                        .transfer(receivers)
                        .then((res) => {
                            if (res.code === sdk.WalletResultCode.Success) {
                                const h = sdk.hashFull(res.data).toString();
                                return resolve({
                                    status: true,
                                    data: h,
                                });
                            } else {
                                return resolve({
                                    status: false,
                                    error: res.message,
                                });
                            }
                        })
                        .catch((reason) => {
                            return resolve({
                                status: false,
                                error: reason,
                            });
                        });
                })
                .catch((reason) => {
                    return resolve({
                        status: false,
                        error: reason,
                    });
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

                    builder.addInput(sdk.OutputType.Payment, utxos[idx].utxo, utxos[idx].amount);
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
                    builder.addInput(sdk.OutputType.Payment, utxos[idx].utxo, utxos[idx].amount);
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

    public sendDistributionTransaction(): Promise<any> {
        return new Promise<any>(async (resolve, reject) => {
            AutoRandomTxSender.doing_genesis = true;
            try {
                let send_count = 0;
                let total_count = 0;
                const hash: string[] = [];
                const txs = await this.createTransaction();
                total_count = txs.length;
                if (txs.length > 0) {
                    let tx_index = 0;
                    for (const tx of txs) {
                        const h = sdk.hashFull(tx).toString();
                        hash.push(h);
                        logger.info(
                            `Send a transaction for distributing Genesis coins : (${tx_index + 1} / ${
                                txs.length
                            })  ${h}`
                        );
                        try {
                            await this.boa_client.sendTransaction(tx);
                            send_count++;
                        } catch (e) {
                            logger.error(e);
                        }
                        await wait(Config.getInstance().process.delay);
                        tx_index++;
                    }
                }
                AutoRandomTxSender.doing_genesis = false;
                return resolve({
                    status: true,
                    data: {
                        send_count,
                        total_count,
                        hash,
                    },
                });
            } catch (e) {
                AutoRandomTxSender.doing_genesis = false;
                return resolve({
                    status: false,
                    error: e,
                });
            }
        });
    }

    public send(): Promise<any> {
        return new Promise<any>((resolve) => {
            prepare().then(() => {
                WK.make();
                this.isDistributed()
                    .then((value) => {
                        if (value) {
                            if (!AutoRandomTxSender.doing_genesis) {
                                logger.info("Send a random transaction");
                                this.sendRandTransaction().then((res) => {
                                    resolve(res);
                                });
                            } else {
                                resolve({
                                    status: false,
                                    error: "Genesis coins are being distributed.",
                                });
                            }
                        } else {
                            logger.info("The distribution of Genesis coins started");
                            this.sendDistributionTransaction().then((res) => {
                                resolve(res);
                            });
                        }
                    })
                    .catch((reason) => {
                        resolve({
                            status: false,
                            error: "Unknown error occurred",
                        });
                    });
            });
        });
    }
}
