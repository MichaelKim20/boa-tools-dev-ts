import * as sdk from "boa-sdk-ts";

import { logger } from "../common/Logger";
import { Config } from "../common/Config";
import { prepare, wait } from "../utils/Process";
import { WK } from "../utils/WK";
import {OutputType} from "boa-sdk-ts";

export interface IVotingFeeLinkData {
    proposer_address: string;
    validators: Array<string>;
    voting_fee: string;
    payload: string;
}

export class VotingFeeSender {
    private boa_client: sdk.BOAClient;
    private config: Config;
    private link_data: IVotingFeeLinkData;

    constructor(data: IVotingFeeLinkData) {
        this.config = Config.getInstance();
        this.boa_client = new sdk.BOAClient(
            this.config.server.stoa_endpoint.toString(),
            this.config.server.agora_endpoint.toString()
        );
        this.link_data = data;
    }

    public createTransaction(height: sdk.JSBI): Promise<sdk.Transaction> {
        return new Promise<sdk.Transaction>(async (resolve, reject) => {
            try {
                let utxos: Array<sdk.UnspentTxOutput> = [];
                let source_key_pair = WK.keys(this.link_data.proposer_address);
                try {
                    utxos = await this.boa_client.getUTXOs(source_key_pair.address);
                } catch (e) {}
                if (utxos.length === 0) return reject(new Error("Not enough amount"));

                let builder = new sdk.TxBuilder(source_key_pair);
                let utxo_manager = new sdk.UTXOManager(utxos);

                let voting_fee = sdk.JSBI.BigInt(this.link_data.voting_fee);
                let send_amount = sdk.JSBI.multiply(sdk.JSBI.BigInt(this.link_data.validators.length), voting_fee);
                let payload = Buffer.from(this.link_data.payload, "base64");
                let payload_fee = sdk.TxPayloadFee.getFee(payload.length);

                let output_count = 1 + this.link_data.validators.length;
                let estimated_tx_fee = sdk.JSBI.BigInt(
                    sdk.Utils.FEE_RATE * sdk.Transaction.getEstimatedNumberOfBytes(0, output_count, payload.length)
                );
                let total_fee = sdk.JSBI.add(payload_fee, estimated_tx_fee);

                let in_utxos = utxo_manager.getUTXO(
                    sdk.JSBI.add(send_amount, total_fee),
                    height,
                    sdk.JSBI.BigInt(sdk.Utils.FEE_RATE * sdk.TxInput.getEstimatedNumberOfBytes())
                );

                estimated_tx_fee = sdk.JSBI.BigInt(
                    sdk.Utils.FEE_RATE *
                        sdk.Transaction.getEstimatedNumberOfBytes(in_utxos.length, output_count, payload.length)
                );

                in_utxos.forEach((u: sdk.UnspentTxOutput) => builder.addInput(OutputType.Payment, u.utxo, u.amount));

                // Build a transaction
                this.link_data.validators.forEach((m) => builder.addOutput(new sdk.PublicKey(m), voting_fee));
                let tx = builder.assignPayload(payload).sign(sdk.OutputType.Payment, estimated_tx_fee, payload_fee);

                // Get the size of the transaction
                let tx_size = tx.getNumberOfBytes();

                // Fees based on the transaction size is obtained from Stoa.
                let fees = await this.boa_client.getTransactionFee(tx_size);

                // Select high
                let tx_fee = sdk.JSBI.BigInt(fees.high);

                let sum_amount_utxo = in_utxos.reduce<sdk.JSBI>(
                    (sum, n) => sdk.JSBI.add(sum, n.amount.value),
                    sdk.JSBI.BigInt(0)
                );
                total_fee = sdk.JSBI.add(payload_fee, tx_fee);
                let total_send_amount = sdk.JSBI.add(total_fee, send_amount);

                // If the value of LockType in UTXO is not a 'LockType.Key', the size may vary. The code below is for that.
                if (sdk.JSBI.lessThan(sum_amount_utxo, total_send_amount)) {
                    //  Add additional UTXO for the required amount.
                    in_utxos.push(
                        ...utxo_manager.getUTXO(
                            sdk.JSBI.subtract(total_send_amount, sum_amount_utxo),
                            height,
                            sdk.JSBI.BigInt(sdk.Utils.FEE_RATE * sdk.TxInput.getEstimatedNumberOfBytes())
                        )
                    );
                    in_utxos.forEach((u: sdk.UnspentTxOutput) => builder.addInput(OutputType.Payment, u.utxo, u.amount));
                    estimated_tx_fee = sdk.JSBI.BigInt(
                        sdk.Utils.FEE_RATE *
                            sdk.Transaction.getEstimatedNumberOfBytes(in_utxos.length, output_count, payload.length)
                    );

                    // Build a transaction
                    this.link_data.validators.forEach((m) => builder.addOutput(new sdk.PublicKey(m), voting_fee));
                    tx = builder.assignPayload(payload).sign(sdk.OutputType.Payment, estimated_tx_fee, payload_fee);

                    // Get the size of the transaction
                    tx_size = tx.getNumberOfBytes();

                    // Fees based on the transaction size is obtained from Stoa.
                    fees = await this.boa_client.getTransactionFee(tx_size);

                    // Select high
                    tx_fee = sdk.JSBI.BigInt(fees.high);
                }

                in_utxos.forEach((u: sdk.UnspentTxOutput) => builder.addInput(OutputType.Payment, u.utxo, u.amount));
                this.link_data.validators.forEach((m) => builder.addOutput(new sdk.PublicKey(m), voting_fee));
                tx = builder.assignPayload(payload).sign(sdk.OutputType.Payment, tx_fee, payload_fee);

                resolve(tx);
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
                            error: e,
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

    public send(): Promise<any> {
        return new Promise<any>(async (resolve) => {
            await prepare();
            WK.make();
            let res = await this.makeBlock();
            resolve(res);
        });
    }
}
