import * as val from "./val.ts";
import * as host from "./host.ts";

export function fund(accId: val.Val): val.Val {
  return host.create_account(val.fromVoid(), accId, val.fromU63(0));
}

export function trust(accId: val.Val, asset: val.Val): val.Val {
  return host.create_trustline(accId, asset);
}

export function pay(
  srcAccId: val.Val,
  dstAccId: val.Val,
  asset: val.Val,
  amount: val.Val,
): val.Val {
  return host.pay(srcAccId, dstAccId, asset, amount);
}

export function balance(accId: val.Val, asset: val.Val): val.Val {
  return host.get_balance(accId, asset);
}
