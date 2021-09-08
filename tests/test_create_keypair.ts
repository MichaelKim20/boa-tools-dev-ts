import { BOASodium } from "boa-sodium-ts";
import * as sdk from "boa-sdk-ts";

sdk.SodiumHelper.assign(new BOASodium());
sdk.SodiumHelper.init().then(async () => {
    const keypair = sdk.KeyPair.random();
    console.log(keypair.address.toString());
    console.log(keypair.secret.toString(false));
});
