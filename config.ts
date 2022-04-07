import * as val from "./sdk/val.ts";
import { Val } from "./sdk/val.ts";
import * as host from "./sdk/host.ts";

import * as keys from "./storekeys.ts";

@unmanaged
export class Config {
  readonly accId: Val;
  readonly poolAsset: Val;
  readonly assetA: Val;
  readonly assetB: Val;
  private constructor(accId: Val, poolAsset: Val, assetA: Val, assetB: Val) {
    this.accId = accId;
    this.poolAsset = poolAsset;
    this.assetA = assetA;
    this.assetB = assetB;
  }
  static init(accId: Val, poolAsset: Val, assetA: Val, assetB: Val): Config {
    if (
      !val.isVoid(host.store_get(keys.accId)) ||
      !val.isVoid(host.store_get(keys.poolAsset)) ||
      !val.isVoid(host.store_get(keys.assetA)) ||
      !val.isVoid(host.store_get(keys.assetB))
    ) {
      throw new Error();
    }
    host.store_set(keys.accId, accId);
    host.store_set(keys.poolAsset, poolAsset);
    host.store_set(keys.assetA, assetA);
    host.store_set(keys.assetB, assetB);
    return new Config(accId, poolAsset, assetA, assetB);
  }
  static get(): Config {
    const accId = host.store_get(keys.accId);
    const poolAsset = host.store_get(keys.poolAsset);
    const assetA = host.store_get(keys.assetA);
    const assetB = host.store_get(keys.assetB);
    if (
      val.isVoid(accId) || val.isVoid(poolAsset) ||
      val.isVoid(assetA) || val.isVoid(assetB)
    ) {
      throw new Error();
    }
    return new Config(accId, poolAsset, assetA, assetB);
  }
}
