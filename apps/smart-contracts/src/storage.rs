use soroban_sdk::{symbol_short, Address, BytesN, Env, Map, Symbol};

const ADMIN_KEY: Symbol = symbol_short!("admin");
const INITIALIZED_KEY: Symbol = symbol_short!("init");
const SIGNER_PUBKEY_KEY: Symbol = symbol_short!("signer");
const PRICE_KEY: Symbol = symbol_short!("price");

pub fn set_admin(env: &Env, admin: &Address) {
    env.storage().instance().set(&ADMIN_KEY, admin);
}

pub fn get_admin(env: &Env) -> Option<Address> {
    env.storage().instance().get(&ADMIN_KEY)
}

pub fn set_initialized(env: &Env, initialized: bool) {
    env.storage().instance().set(&INITIALIZED_KEY, &initialized);
}

pub fn is_initialized(env: &Env) -> bool {
    env.storage()
        .instance()
        .get::<Symbol, bool>(&INITIALIZED_KEY)
        .unwrap_or(false)
}

pub fn set_signer_pubkey(env: &Env, pubkey: &BytesN<32>) {
    env.storage().instance().set(&SIGNER_PUBKEY_KEY, pubkey);
}

pub fn get_signer_pubkey(env: &Env) -> Option<BytesN<32>> {
    env.storage().instance().get(&SIGNER_PUBKEY_KEY)
}

pub fn set_price(env: &Env, symbol: Symbol, data: &super::PriceData) {
    let mut prices: Map<Symbol, super::PriceData> = env
        .storage()
        .instance()
        .get(&PRICE_KEY)
        .unwrap_or_else(|| Map::new(env));
    prices.set(symbol, data.clone());
    env.storage().instance().set(&PRICE_KEY, &prices);
}

pub fn get_price(env: &Env, symbol: Symbol) -> Option<super::PriceData> {
    let prices: Map<Symbol, super::PriceData> = env
        .storage()
        .instance()
        .get(&PRICE_KEY)
        .unwrap_or_else(|| Map::new(env));
    prices.get(symbol)
}
