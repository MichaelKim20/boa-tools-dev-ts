import { BOASodium } from "boa-sodium-ts";
import * as sdk from "boa-sdk-ts";
(async () => {
    sdk.SodiumHelper.assign(new BOASodium());
    await sdk.SodiumHelper.init();
    const keypair = sdk.KeyPair.random();
    console.log(keypair.address.toString());
})();
