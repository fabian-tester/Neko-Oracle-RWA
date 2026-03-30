use soroban_sdk::{Env, IntoVal, Symbol, TryFromVal, Val};

#[derive(Clone)]
pub struct PriceData {
    pub symbol: Symbol,
    pub price: i64,
    pub timestamp: i64,
    pub source: Option<Symbol>,
}

impl PriceData {
    pub fn to_payload(&self, env: &Env) -> soroban_sdk::Bytes {
        let mut payload = soroban_sdk::Bytes::new(env);

        let symbol_bytes = self.symbol.to_string();
        payload.append(&symbol_bytes);

        let price_bytes: soroban_sdk::Bytes = self.price.into_val(env);
        payload.append(&price_bytes);

        let timestamp_bytes: soroban_sdk::Bytes = self.timestamp.into_val(env);
        payload.append(&timestamp_bytes);

        payload
    }
}

impl IntoVal<Env, Val> for PriceData {
    fn into_val(&self, env: &Env) -> Val {
        self.to_payload(env).into_val(env)
    }
}

impl TryFromVal<Env, Val> for PriceData {
    type Error = ();

    fn try_from_val(_env: &Env, _val: Val) -> Result<Self, Self::Error> {
        Err(())
    }
}
