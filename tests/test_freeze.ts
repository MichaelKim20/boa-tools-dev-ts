import { BOASodium } from "boa-sodium-ts";
import * as sdk from "boa-sdk-ts";

sdk.SodiumHelper.assign(new BOASodium());
sdk.SodiumHelper.init().then(async () => {
    const validator_keypair = sdk.KeyPair.random();
    console.log(validator_keypair.address.toString());
    console.log(validator_keypair.secret.toString(false));

    const keypair = sdk.KeyPair.fromSeed(new sdk.SecretKey("SAFRBTFVAB37EEJDIUGCDK5R3KSL3QDBO3SPS6GX752IILWB4NGQY7KJ"));

    const wallet = new sdk.Wallet(keypair, {
        agoraEndpoint: "http://localhost:2826",
        stoaEndpoint: "http://localhost:3836",
        fee: sdk.WalletTransactionFeeOption.Medium,
    });

    // 동결된 자금이 전송되는 주
    const res = await wallet.freeze({
        address: validator_keypair.address,
        amount: sdk.BOA(40000),
    });

    console.log(res.code);
    console.log(res.message);
});
