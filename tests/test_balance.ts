import { BOASodium } from "boa-sodium-ts";
import * as sdk from "boa-sdk-ts";

if (!sdk.SodiumHelper.isAssigned()) sdk.SodiumHelper.assign(new BOASodium());
sdk.SodiumHelper.init().then(async () => {
    const keypair = sdk.KeyPair.fromSeed(new sdk.SecretKey("SAFRBTFVAB37EEJDIUGCDK5R3KSL3QDBO3SPS6GX752IILWB4NGQY7KJ"));

    const wallet = new sdk.Wallet(keypair, {
        agoraEndpoint: "http://localhost:2826",
        stoaEndpoint: "http://localhost:3836",
        fee: sdk.WalletFeeOption.Medium,
    });

    const res = await wallet.getBalance();

    console.log(res.code);
    console.log(res.message);
    console.log(res.data.balance.toString());
    console.log(res.data.spendable.toString());
    console.log(res.data.frozen.toString());
    console.log(res.data.locked.toString());
});
