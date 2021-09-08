import { BOASodium } from "boa-sodium-ts";
import * as sdk from "boa-sdk-ts";

sdk.SodiumHelper.assign(new BOASodium());
sdk.SodiumHelper.init().then(async () => {
    const keypair = sdk.KeyPair.fromSeed(new sdk.SecretKey("SAFRBTFVAB37EEJDIUGCDK5R3KSL3QDBO3SPS6GX752IILWB4NGQY7KJ"));

    const wallet = new sdk.Wallet(keypair, {
        agoraEndpoint: "http://localhost:2826",
        stoaEndpoint: "http://localhost:3836",
        fee: sdk.WalletFeeOption.Medium,
    });

    const res = await wallet.transfer([
        {
            address: new sdk.PublicKey("boa1xrc00kar2yqa3jzve9cm4cvuaa8duazkuwrygmqgpcuf0gqww8ye7ua9lkl"),
            amount: sdk.BOA(10),
        },
    ]);

    console.log(res);
});
