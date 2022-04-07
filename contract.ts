import * as val from "./sdk/val.ts";
import { Val } from "./sdk/val.ts";
import * as host from "./sdk/host.ts";

import * as keys from "./storekeys.ts";
import { Config } from "./config.ts";

// Note: Payments in from the source account are done inside this contract, but
// in reality those payments will occur outside the contract somehow, since a
// contract will not be authorized to make payments out of an invoking source
// account.

// Init pool sets up a specific pool between two assets. The pool asset is the
// asset that must be issuable by the contracts account on deposits of assets A
// and B, and returned to the contract on withdrawals of assets A and B.
export function init(
  accId: Val,
  poolAsset: Val,
  assetA: Val,
  assetB: Val,
): Val {
  Config.init(accId, poolAsset, assetA, assetB);
  host.store_set(keys.circulatingPoolAsset, val.fromU63(0));
  return val.fromBool(true);
}

// Deposit adds the amounts for A and B to the pool and issues the pool asset in
// exchange.
// TODO: Support passing in max amounts rather than fixed amounts.
export function deposit(srcAccId: Val, amountAV: Val, amountBV: Val): Val {
  const amountA = val.toU63(amountAV);
  if (amountA == 0) {
    throw new Error();
  }
  const amountB = val.toU63(amountBV);
  if (amountA == 0) {
    throw new Error();
  }

  const c = Config.get();

  // Accept deposits.
  const i1 = host.pay(srcAccId, c.accId, c.assetA, amountAV);
  if (!val.isVoid(i1)) {
    throw new Error();
  }
  const i2 = host.pay(srcAccId, c.accId, c.assetB, amountBV);
  if (!val.isVoid(i2)) {
    throw new Error();
  }

  // Issue pool asset in return.
  const reserveA = val.toU63(host.get_balance(c.accId, c.assetA));
  const reserveB = val.toU63(host.get_balance(c.accId, c.assetB));
  const circulatingPoolAsset = val.toU63(
    host.store_get(keys.circulatingPoolAsset),
  );
  let poolAmount: u64;
  if (circulatingPoolAsset == 0) {
    // TODO: Rounding errors from loss of precision from u64 to f64 is probably
    // fine due to natural rounding issues in sqrt, and result is max u32 anyway.
    // Verify this, or is there a better way to do an isqrt? Or use Graydon's
    // BigNum.
    poolAmount = sqrt((amountA as f64) * (amountB as f64)) as u64;
  } else {
    // TODO: These multiplications can overflow. Use Graydon's BigNum.
    const poolAmountA = reserveA > 0
      ? circulatingPoolAsset * amountA / reserveA
      : 0;
    const poolAmountB = reserveB > 0
      ? circulatingPoolAsset * amountB / reserveB
      : 0;
    if (reserveA > 0 && reserveB > 0) {
      poolAmount = min(poolAmountA, poolAmountB);
    } else if (reserveA > 0) {
      poolAmount = poolAmountA;
    } else if (reserveB > 0) {
      poolAmount = poolAmountB;
    }
  }
  const poolAmountV = val.fromU63(poolAmount);
  const o1 = host.pay(c.accId, srcAccId, c.poolAsset, poolAmountV);
  if (!val.isVoid(o1)) {
    return o1;
    throw new Error();
  }
  host.store_set(
    keys.circulatingPoolAsset,
    val.fromU63(circulatingPoolAsset + poolAmount),
  );

  return poolAmountV;
}

export function withdraw(srcAccId: Val, poolAmountV: Val): Val {
  const poolAmount = val.toU63(poolAmountV);
  if (poolAmount == 0) {
    throw new Error();
  }

  const c = Config.get();

  // Accept deposit of pool token.
  const i1 = host.pay(srcAccId, c.accId, c.poolAsset, poolAmountV);
  if (!val.isVoid(i1)) {
    return i1;
  }

  // Pay out assets.
  const reserveA = val.toU63(host.get_balance(c.accId, c.assetA));
  const reserveB = val.toU63(host.get_balance(c.accId, c.assetB));
  const circulatingPoolAsset = val.toU63(
    host.store_get(keys.circulatingPoolAsset),
  );
  if (circulatingPoolAsset == 0) {
    throw new Error();
  }
  // TODO: These multiplications can overflow. Use Graydon's BigNum.
  const amountA = poolAmount * reserveA / circulatingPoolAsset;
  const amountB = poolAmount * reserveB / circulatingPoolAsset;
  const amountAV = val.fromU63(amountA);
  const amountBV = val.fromU63(amountB);
  const o1 = host.pay(c.accId, srcAccId, c.assetA, amountAV);
  if (!val.isVoid(o1)) {
    throw new Error();
  }
  const o2 = host.pay(c.accId, srcAccId, c.assetB, amountBV);
  if (!val.isVoid(o2)) {
    throw new Error();
  }

  let r = host.vec_new();
  r = host.vec_push(r, amountAV);
  r = host.vec_push(r, amountBV);
  return r;
}

export function trade_fixed_in(
  srcAccId: Val,
  assetIn: Val,
  amountInV: Val,
  assetOut: Val,
  minAmountOutV: Val,
): Val {
  const amountIn = val.toU63(amountInV);
  if (amountIn == 0) {
    throw new Error();
  }
  const minAmountOut = val.toU63(minAmountOutV);
  const c = Config.get();
  if (
    !(
      (assetIn == c.assetA && assetOut == c.assetB) ||
      (assetIn == c.assetB && assetOut == c.assetA)
    )
  ) {
    throw new Error();
  }
  const reserveIn = val.toU63(host.get_balance(c.accId, assetIn));
  const reserveOut = val.toU63(host.get_balance(c.accId, assetOut));

  // Calculate amount out to preserve current price.
  //   (x+a)*(y-b)=x*y
  //   b = (a*y)/(x+a)
  // TODO: Fees.
  const amountOut = (amountIn * reserveOut) / (reserveIn + amountIn);
  if (amountOut < minAmountOut) {
    throw new Error();
  }
  const amountOutV = val.fromU63(amountOut);

  // Pay in and out.
  const in1 = host.pay(srcAccId, c.accId, assetIn, amountInV);
  if (!val.isVoid(in1)) {
    throw new Error();
  }
  const out1 = host.pay(c.accId, srcAccId, assetOut, amountOutV);
  if (!val.isVoid(out1)) {
    throw new Error();
  }

  return amountOutV;
}

export function trade_fixed_out(
  srcAccId: Val,
  assetIn: Val,
  maxAmountInV: Val,
  assetOut: Val,
  amountOutV: Val,
): Val {
  const maxAmountIn = val.toU63(maxAmountInV);
  const amountOut = val.toU63(amountOutV);
  if (amountOut == 0) {
    throw new Error();
  }
  const c = Config.get();
  if (
    !(
      (assetIn == c.assetA && assetOut == c.assetB) ||
      (assetIn == c.assetB && assetOut == c.assetA)
    )
  ) {
    throw new Error();
  }
  const reserveIn = val.toU63(host.get_balance(c.accId, assetIn));
  const reserveOut = val.toU63(host.get_balance(c.accId, assetOut));

  // Calculate amount out to preserve current price.
  //   (x+a)*(y-b)=x*y
  //   a = (b*x)/(y-b)
  // TODO: Fees.
  const amountIn = (amountOut * reserveIn) / (reserveOut - amountOut);
  if (amountIn > maxAmountIn) {
    throw new Error();
  }
  const amountInV = val.fromU63(amountIn);

  // Pay in and out.
  const in1 = host.pay(srcAccId, c.accId, assetIn, amountInV);
  if (!val.isVoid(in1)) {
    throw new Error();
  }
  const out1 = host.pay(c.accId, srcAccId, assetOut, amountOutV);
  if (!val.isVoid(out1)) {
    throw new Error();
  }

  return amountInV;
}
