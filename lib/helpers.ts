import BN from "bn.js";
import { randomInt } from "crypto";
import { ZeroAddress } from "ethers";
import { ethers } from "hardhat";
import Web3 from "web3";

export type BNish = BN | number | string;

export type Nullable<T> = T | null | undefined;

export type Dict<T> = { [key: string]: T };

export const BN_ZERO = Web3.utils.toBN(0);
export const BN_ONE = Web3.utils.toBN(1);
export const BN_TEN = Web3.utils.toBN(10);

export const MAX_BIPS = 10_000;

export const MINUTES = 60;
export const HOURS = 60 * MINUTES;
export const DAYS = 24 * HOURS;
export const WEEKS = 7 * DAYS;

/**
 * Asynchronously wait `ms` milliseconds.
 */
export function sleep(ms: number) {
    return new Promise<void>(resolve => setTimeout(() => resolve(), ms));
}

/**
 * Return system time as timestamp (seconds since 1.1.1970).
 */
export function systemTimestamp() {
    return Math.round(new Date().getTime() / 1000);
}

/**
 * Return latest block timestamp as number (seconds since 1.1.1970).
 */
export async function latestBlockTimestamp() {
    const latestBlock = await web3.eth.getBlock('latest');
    return Number(latestBlock.timestamp);
}

/**
 * Like Array.map but for JavaScript objects.
 */
export function objectMap<T, R>(obj: { [key: string]: T }, func: (x: T) => R): { [key: string]: R } {
    const result: { [key: string]: R } = {};
    for (const key of Object.keys(obj)) {
        result[key] = func(obj[key]);
    }
    return result;
}

/**
 * Check if value is non-null.
 * Useful in array.filter, to return array of non-nullable types.
 */
export function isNotNull<T>(x: T): x is NonNullable<T> {
    return x != null;
}

/**
 * Returns truncated file path.
 * @param file module filename
 * @returns file path from `test/` on, separated by `'/'`
 */
export function getTestFile(myFile: string) {
    return myFile.slice(myFile.replace(/\\/g, '/').indexOf("test/"));
}

export function zip<T1, T2>(a: any[], b: any[]): [T1, T2][] {
    const length = Math.min(a.length, b.length);
    const rtr = new Array<[T1, T2]>(length);
    for (let i = 0; i < length; i++) {
        rtr[i] = [a[i], b[i]];
    }
    return rtr;
}


/**
 * Check if value is non-null and throw otherwise.
 * Returns guaranteed non-null value.
 */
export function requireNotNull<T>(x: T, errorMessage?: string): NonNullable<T> {
    if (x != null) return x as NonNullable<T>;
    throw new Error(errorMessage ?? "Value is null or undefined");
}

/**
 * Helper wrapper to convert number to BN
 * @param x number expressed in any reasonable type
 * @returns same number as BN
 */
export function toBN(x: BN | number | string): BN {
    if (BN.isBN(x)) return x;
    return Web3.utils.toBN(x);
}

/**
 * Helper wrapper to convert BN, BigNumber or plain string to number. May lose precision, so use it for tests only.
 * @param x number expressed in any reasonable type
 * @returns same number as Number
 */
export function toNumber(x: BN | number | string) {
    if (typeof x === 'number') return x;
    return Number(x);
}

// return String(Math.round(x * 10^exponent)), but sets places below float precision to zero instead of some random digits
export function toStringExp(x: number | string, exponent: number): string {
    let xstr: string;
    if (typeof x === 'number') {
        const significantDecimals = x !== 0 ? Math.max(0, 14 - Math.floor(Math.log10(x))) : 0;
        const decimals = Math.min(exponent, significantDecimals);
        xstr = x.toFixed(decimals);
    } else {
        if (!/\d+(\.\d+)?/.test(x)) throw new Error("toStringExp: invalid number string");
        xstr = x;
    }
    const dot = xstr.indexOf('.');
    const mantissa = dot >= 0 ? xstr.slice(0, dot) + xstr.slice(dot + 1) : xstr;
    const precision = dot >= 0 ? xstr.length - (dot + 1) : 0;
    if (precision === exponent) return mantissa;
    if (exponent < precision) throw new Error("toStringExp: loss of precision");
    const zeros = Array.from({ length: exponent - precision }, () => '0').join('');   // trailing zeros
    return mantissa + zeros;
}

// return BN(x * 10^exponent)
export function toBNExp(x: number | string, exponent: number): BN {
    return toBN(toStringExp(x, exponent));
}

// convert NAT amount to base units (wei)
export function toWei(amount: number | string) {
    return toBNExp(amount, 18);
}

/**
 * Format large number in more readable format, using 'fixed-exponential' format, with 'e+18' suffix for very large numbers.
 * (This makes them easy to visually detect bigger/smaller numbers.)
 */
export function formatBN(x: BN | string | number) {
    const xs = x.toString();
    if (xs.length >= 18) {
        const dec = Math.max(0, 22 - xs.length);
        const xm = (Number(xs) / 1e18).toFixed(dec);
        return groupIntegerDigits(xm) + 'e+18';
    } else {
        return groupIntegerDigits(xs);
    }
}

/**
 * Put '_' characters between 3-digit groups in integer part of a number.
 */
export function groupIntegerDigits(x: string) {
    let startp = x.indexOf('.');
    if (startp < 0) startp = x.length;
    const endp = x[0] === '-' ? 1 : 0;
    for (let p = startp - 3; p > endp; p -= 3) {
        x = x.slice(0, p) + '_' + x.slice(p); x
    }
    return x;
}

/**
 * Like `a.muln(b)`, but while muln actualy works with non-integer numbers, it is very imprecise,
 * i.e. `BN(1e30).muln(1e-20) = BN(0)` and `BN(1e10).muln(0.15) = BN(1476511897)`.
 * This function gives as exact results as possible.
 */
export function mulDecimal(a: BN, b: number) {
    if (Math.round(b) === b && Math.abs(b) < 1e16) {
        return a.mul(toBN(b));
    }
    const exp = 15 - Math.ceil(Math.log10(b));
    const bm = Math.round(b * (10 ** exp));
    const m = a.mul(toBN(bm));
    return exp >= 0 ? m.div(exp10(exp)) : m.mul(exp10(-exp));
}

/**
 * Convert value to hex with 0x prefix and optional padding.
 */
export function toHex(x: string | number | BN, padToBytes?: number) {
    if (padToBytes && padToBytes > 0) {
        return Web3.utils.leftPad(Web3.utils.toHex(x), padToBytes * 2);
    }
    return Web3.utils.toHex(x);
}

/**
 * Generate random EVM addresss.
 */
export function randomAddress() {
    return Web3.utils.toChecksumAddress(Web3.utils.randomHex(20))
}

/**
 * Convert object to subclass with type check.
 */
export function checkedCast<S, T extends S>(obj: S, cls: new (...args: any[]) => T): T {
    if (obj instanceof cls) return obj;
    throw new Error(`object not instance of ${cls.name}`);
}

/**
 * Functional style try...catch.
 */
export function tryCatch<T>(body: () => T): T | undefined;
export function tryCatch<T>(body: () => T, errorHandler: (err: unknown) => T): T;
export function tryCatch<T>(body: () => T, errorHandler?: (err: unknown) => T) {
    try {
        return body();
    } catch (err) {
        return errorHandler?.(err);
    }
}

/**
 * Run `func` in parallel. Allows nicer code in case func is an async lambda.
 */
export function runAsync(func: () => Promise<void>) {
    void func()
        .catch(e => { console.error(e); });
}

/**
 * Run async main function and wait for exit.
 */
export function runAsyncMain(func: (args: string[]) => Promise<void>, errorExitCode: number = 123) {
    void func(process.argv.slice(2))
        .then(() => { process.exit(0); })
        .catch(e => { console.error(e); process.exit(errorExitCode); });
}

/**
 * Get value of key `key` for map. If it doesn't exists, create new value, add it to the map and return it.
 */
export function getOrCreate<K, V>(map: Map<K, V>, key: K, create: (key: K) => V): V {
    if (map.has(key)) {
        return map.get(key)!;
    }
    const value = create(key);
    map.set(key, value);
    return value;
}

/**
 * Get value of key `key` for map. If it doesn't exists, create new value, add it to the map and return it.
 */
export async function getOrCreateAsync<K, V>(map: Map<K, V>, key: K, create: (key: K) => Promise<V>): Promise<V> {
    if (map.has(key)) {
        return map.get(key)!;
    }
    const value = await create(key);
    map.set(key, value);
    return value;
}

/**
 * Add a value to "multimap" - a map where there are several values for each key.
 */
export function multimapAdd<K, V>(map: Map<K, Set<V>>, key: K, value: V) {
    let set = map.get(key);
    if (set == undefined) {
        set = new Set();
        map.set(key, set);
    }
    set.add(value);
}

/**
 * Remove a value from "multimap" - a map where there are several values for each key.
 */
export function multimapDelete<K, V>(map: Map<K, Set<V>>, key: K, value: V) {
    let set = map.get(key);
    if (set == undefined) return;
    set.delete(value);
    if (set.size === 0) {
        map.delete(key);
    }
}

/**
 * Returns last element of array or `undefined` if array is empty.
 */
export function last<T>(array: T[]): T | undefined {
    return array.length > 0 ? array[array.length - 1] : undefined;
}

/**
 * Like Array.reduce, but for any Iterable.
 */
export function reduce<T, R>(list: Iterable<T>, initialValue: R, operation: (a: R, x: T) => R) {
    let result = initialValue;
    for (const x of list) {
        result = operation(result, x);
    }
    return result;
}

/**
 * Sum all values in an Array or Iterable of numbers.
 */
export function sum<T>(list: Iterable<T>, elementValue: (x: T) => number): number;
export function sum(list: Iterable<number>): number;
export function sum<T>(list: Iterable<T>, elementValue: (x: T) => number = (x: any) => x) {
    return reduce(list, 0, (a, x) => a + elementValue(x));
}

/**
 * Sum all values in an Array or Iterable of BNs.
 */
export function sumBN<T>(list: Iterable<T>, elementValue: (x: T) => BN): BN;
export function sumBN(list: Iterable<BN>): BN;
export function sumBN<T>(list: Iterable<T>, elementValue: (x: T) => BN = (x: any) => x) {
    return reduce(list, BN_ZERO, (a, x) => a.add(elementValue(x)));
}

/**
 * Return the maximum of two or more BN values.
 */
export function maxBN(first: BN, ...rest: BN[]) {
    let result = first;
    for (const x of rest) {
        if (x.gt(result)) result = x;
    }
    return result;
}

/**
 * Return the minimum of two or more BN values.
 */
export function minBN(first: BN, ...rest: BN[]) {
    let result = first;
    for (const x of rest) {
        if (x.lt(result)) result = x;
    }
    return result;
}

/**
 * Return a copy of list, sorted by comparisonKey.
 */
export function sorted<T, K>(list: Iterable<T>, comparisonKey: (e: T) => K): T[];
export function sorted<T>(list: Iterable<T>): T[];
export function sorted<T, K>(list: Iterable<T>, comparisonKey: (e: T) => K = (x: any) => x) {
    const array = Array.from(list);
    array.sort((a, b) => {
        const aKey = comparisonKey(a), bKey = comparisonKey(b);
        return aKey < bKey ? -1 : (aKey > bKey ? 1 : 0);
    });
    return array;
}

export interface PromiseValue<T> {
    resolved: boolean;
    value?: T;
}

/**
 * Return a struct whose `value` field is set when promise id fullfiled.
 */
export function promiseValue<T>(promise: Promise<T>): PromiseValue<T> {
    const result: PromiseValue<T> = { resolved: false };
    void promise.then(value => {
        result.resolved = true;
        result.value = value;
    });
    return result;
}

// Error handling

export function fail(messageOrError: string | Error): never {
    if (typeof messageOrError === 'string') {
        throw new Error(messageOrError);
    }
    throw messageOrError;
}

export function filterStackTrace(error: any) {
    const stack = String(error.stack || error);
    let lines = stack.split('\n');
    lines = lines.filter(l => !l.startsWith('    at') || /\.(sol|ts):/.test(l));
    return lines.join('\n');
}

export function reportError(error: any) {
    console.error(filterStackTrace(error));
}

// either (part of) error message or an error constructor
export type ErrorFilter = string | { new(...args: any[]): Error };

export function errorIncluded(error: any, expectedErrors: ErrorFilter[]) {
    const message = String(error?.message ?? '');
    for (const expectedErr of expectedErrors) {
        if (typeof expectedErr === 'string') {
            if (message.includes(expectedErr)) return true;
        } else {
            if (error instanceof expectedErr) return true;
        }
    }
    return false;
}

export function expectErrors(error: any, expectedErrors: ErrorFilter[]): undefined {
    if (errorIncluded(error, expectedErrors)) return;
    throw error;    // unexpected error
}

// Convert number or percentage string "x%" to BIPS.
export function toBIPS(x: number | string) {
    if (typeof x === 'string' && x.endsWith('%')) {
        return toBNExp(x.slice(0, x.length - 1), 2);    // x is in percent, only multiply by 100
    } else {
        return toBNExp(x, 4);
    }
}

// Calculate 10 ** n as BN.
export function exp10(n: BNish) {
    return BN_TEN.pow(toBN(n));
}

export function isBNLike(value: any) {
    return BN.isBN(value) || (typeof value === 'string' && /^\d+$/.test(value));
}

/**
 * Some Web3 results are union of array and struct so console.log prints them as array.
 * This function converts it to struct nad also formats values.
 */
export function deepFormat(value: any): any {
    if (isBNLike(value)) {
        return formatBN(value);
    } else if (Array.isArray(value)) {
        const structEntries = Object.entries(value).filter(([key, val]) => typeof key !== 'number' && !/^\d+$/.test(key));
        if (structEntries.length > 0 && structEntries.length >= value.length) {
            const formattedEntries = structEntries.map(([key, val]) => [key, deepFormat(val)]);
            return Object.fromEntries(formattedEntries);
        } else {
            return value.map(v => deepFormat(v));
        }
    } else if (typeof value === 'object') {
        const formattedEntries = Object.entries(value).map(([key, val]) => [key, deepFormat(val)]);
        return Object.fromEntries(formattedEntries);
    } else {
        return value;
    }
}

/**
 * Print `name = value` pairs for a dict of format `{name: value, name: value, ...}`
 */
export function trace(items: Record<string, any>) {
    for (const [key, value] of Object.entries(items)) {
        const serialize = typeof value === 'object' && [Array, Object].includes(value.constructor);
        const valueS = serialize ? JSON.stringify(deepFormat(value)) : deepFormat(value);
        console.log(`${key} = ${valueS}`);
    }
}

export function fullValue(i: any): BN {
    return toBN(10).pow(toBN(18)).mul(toBN(i));
}

export async function prepareSimpleTransfer(
    amount: BN,
    fee: BN,
    sender: string,
    recipient: string,
    data: undefined | string | number = undefined
) {

    if (data === undefined) {
        data = 0x00
    }

    return {
        nonce: await latestBlockTimestamp() - randomInt(1000000),
        amount: amount.toString(),
        fee: fee.toString(),
        sender,
        recipient,
        executionTime: 0,
        callDataGasLimit: fullValue(1).toString(),
        callData: data,
        cancel: false,
        cancellationFeeRefund: 0, // No refund
        negatedBandwidthProvider: ZeroAddress,
        initialNegation: false,
        invalidExecutionProofId: ethers.ZeroHash
    }
}
