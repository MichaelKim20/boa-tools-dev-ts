import * as sdk from "boa-sdk-ts";

import { Config } from "../common/Config";
import { prepare } from "../utils/Process";
import { WK } from "../utils/WK";
import { logger } from "../common/Logger";
import { IWalletResult } from "boa-sdk-ts";
import { Balance } from "boa-sdk-ts/src/modules/net/response/Balance";

export class AutoRandomTxSender {
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
            const wallet = new sdk.Wallet(WK.CommonsBudget(), {
                agoraEndpoint: this.config.server.agora_endpoint.toString(),
                stoaEndpoint: this.config.server.stoa_endpoint.toString(),
                fee: sdk.WalletFeeOption.Medium,
            });
            wallet.getBalance().then((res: IWalletResult) => {
                if (res.code !== sdk.WalletResultCode.Success || res.data === undefined) return reject();

                let balance: Balance = res.data;
                if (sdk.JSBI.equal(balance.balance, sdk.JSBI.BigInt(0))) return resolve(true);
                else return resolve(false);
            });
        });
    }

    public makeBlock(): Promise<any> {
        return new Promise<any>(async (resolve, reject) => {
            const key_count = this.config.process.key_count;
            const source = Math.floor(Math.random() * key_count);
            const source_key_pair = WK.keys(source);

            let destination = Math.floor(Math.random() * key_count);
            while (source === destination) destination = Math.floor(Math.random() * key_count);
            const destination_key_pair = WK.keys(destination);

            const wallet = new sdk.Wallet(source_key_pair, {
                agoraEndpoint: this.config.server.agora_endpoint.toString(),
                stoaEndpoint: this.config.server.stoa_endpoint.toString(),
                fee: sdk.WalletFeeOption.Medium,
            });

            wallet
                .getBalance()
                .then((bal_res: IWalletResult) => {
                    if (bal_res.code !== sdk.WalletResultCode.Success || bal_res.data === undefined) {
                        return resolve({
                            status: false,
                            error: bal_res.message,
                        });
                    }
                    if (sdk.JSBI.lessThan(bal_res.data.spendable, sdk.JSBI.BigInt(100))) {
                        return resolve({
                            status: false,
                            error: "Not enough amount",
                        });
                    }
                    const range = sdk.JSBI.BigInt(Math.floor(Math.random() * 40) + 10);
                    const send_amount = sdk.JSBI.divide(
                        sdk.JSBI.multiply(bal_res.data.spendable, range),
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
                                let h = sdk.hashFull(res.data).toString();
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

    send(): Promise<any> {
        return new Promise<any>((resolve) => {
            prepare().then(() => {
                WK.make();
                this.isDistributed()
                    .then((value) => {
                        if (value) {
                            this.makeBlock().then((res) => {
                                resolve(res);
                            });
                        } else {
                            resolve({
                                status: false,
                                error: "Not distributed",
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
