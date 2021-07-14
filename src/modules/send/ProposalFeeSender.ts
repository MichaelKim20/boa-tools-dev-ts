import * as sdk from "boa-sdk-ts";

import { logger } from "../common/Logger";
import { Config } from "../common/Config";
import { prepare, wait } from "../utils/Process";
import { WK } from "../utils/WK";

export interface IProposalFeeLinkData {
    proposer_address: string;
    destination: string;
    amount: string;
    payload: string;
}

export class ProposalFeeSender {
    private boa_client: sdk.BOAClient;
    private config: Config;
    private link_data: IProposalFeeLinkData;

    constructor(data: IProposalFeeLinkData) {
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

                let send_amount = sdk.JSBI.BigInt(this.link_data.amount);
                let payload = Buffer.from(this.link_data.payload, "base64");
                let payload_fee = sdk.TxPayloadFee.getFee(payload.length);

                let output_count = 2;
                let estimated_tx_fee = sdk.JSBI.BigInt(
                    sdk.Utils.FEE_FACTOR * sdk.Transaction.getEstimatedNumberOfBytes(0, output_count, payload.length)
                );
                let total_fee = sdk.JSBI.add(payload_fee, estimated_tx_fee);

                let in_utxos = utxo_manager.getUTXO(
                    sdk.JSBI.add(send_amount, total_fee),
                    height,
                    sdk.JSBI.BigInt(sdk.Utils.FEE_FACTOR * sdk.TxInput.getEstimatedNumberOfBytes())
                );

                estimated_tx_fee = sdk.JSBI.BigInt(
                    sdk.Utils.FEE_FACTOR *
                        sdk.Transaction.getEstimatedNumberOfBytes(in_utxos.length, output_count, payload.length)
                );

                in_utxos.forEach((u: sdk.UnspentTxOutput) => builder.addInput(u.utxo, u.amount));
                // Build a transaction
                let tx = builder
                    .addOutput(new sdk.PublicKey(this.link_data.destination), send_amount)
                    .assignPayload(payload)
                    .sign(sdk.OutputType.Payment, estimated_tx_fee, payload_fee);

                // Get the size of the transaction
                let tx_size = tx.getNumberOfBytes();

                // Fees based on the transaction size is obtained from Stoa.
                let fees = await this.boa_client.getTransactionFee(tx_size);

                // Select high
                let tx_fee = sdk.JSBI.BigInt(fees.high);

                let sum_amount_utxo = in_utxos.reduce<sdk.JSBI>(
                    (sum, n) => sdk.JSBI.add(sum, n.amount),
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
                            sdk.JSBI.BigInt(sdk.Utils.FEE_FACTOR * sdk.TxInput.getEstimatedNumberOfBytes())
                        )
                    );
                    in_utxos.forEach((u: sdk.UnspentTxOutput) => builder.addInput(u.utxo, u.amount));
                    estimated_tx_fee = sdk.JSBI.BigInt(
                        sdk.Utils.FEE_FACTOR *
                            sdk.Transaction.getEstimatedNumberOfBytes(in_utxos.length, output_count, payload.length)
                    );

                    // Build a transaction
                    tx = builder
                        .addOutput(new sdk.PublicKey(this.link_data.destination), send_amount)
                        .assignPayload(payload)
                        .sign(sdk.OutputType.Payment, estimated_tx_fee, payload_fee);

                    // Get the size of the transaction
                    tx_size = tx.getNumberOfBytes();

                    // Fees based on the transaction size is obtained from Stoa.
                    fees = await this.boa_client.getTransactionFee(tx_size);

                    // Select high
                    tx_fee = sdk.JSBI.BigInt(fees.high);
                }

                in_utxos.forEach((u: sdk.UnspentTxOutput) => builder.addInput(u.utxo, u.amount));
                tx = builder
                    .addOutput(new sdk.PublicKey(this.link_data.destination), send_amount)
                    .assignPayload(payload)
                    .sign(sdk.OutputType.Payment, tx_fee, payload_fee);

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
