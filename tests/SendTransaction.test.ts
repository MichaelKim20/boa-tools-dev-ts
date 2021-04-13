import * as sdk from 'boa-sdk-ts';
import { Genesis } from '../src/modules/utils/Genesis';
import { WK } from '../src/modules/utils/WK';

import * as assert from 'assert';

describe ('Test1', () =>
{
    before('Wait for the package libsodium to finish loading', () =>
    {
        return sdk.SodiumHelper.init();
    });

    before('Make Key', () =>
    {
        WK.make();
    });

    it ('Genesis', () =>
    {
        let gen = Genesis.block();
        let gen_tx = gen.txs[0];

        for (let o of gen_tx.outputs)
            assert.deepStrictEqual((new sdk.PublicKey(o.lock.bytes)).toString(), WK.GenesisKey.address.toString());
    });
});

describe ('Test2', () =>
{
    before('Wait for the package libsodium to finish loading', () =>
    {
        return sdk.SodiumHelper.init();
    });

    before('Make Key', () =>
    {
        WK.make();
    });

    it ('Test 2', () =>
    {
        for (let key of WK._keys)
            console.log(key.address.toString());
    });

    it ('Test 3', () =>
    {
        console.log(WK.NODE2().address.toString());
        console.log(WK.NODE3().address.toString());
        console.log(WK.NODE4().address.toString());
        console.log(WK.NODE5().address.toString());
        console.log(WK.NODE6().address.toString());
        console.log(WK.NODE7().address.toString());
        console.log(WK.CommonsBudget().address.toString());
    });
});
