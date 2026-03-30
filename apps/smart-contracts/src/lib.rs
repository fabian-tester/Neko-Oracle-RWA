mod error;

use error::ContractError;
use soroban_env_common::Env as _;
use soroban_sdk::{
    contract, contractimpl, symbol_short, Address, Bytes, BytesN, Env, Map, Symbol, Vec,
};

fn str_to_bytes(s: &str, env: &Env) -> Bytes {
    let mut bytes = Bytes::new(env);
    for b in s.bytes() {
        bytes.push_back(b);
    }
    bytes
}

#[contract]
pub struct OracleContract;

const ADMIN_KEY: Symbol = symbol_short!("admin");
const INITIALIZED_KEY: Symbol = symbol_short!("init");
const SIGNER_PUBKEY_KEY: Symbol = symbol_short!("signer");
const PRICE_KEY: Symbol = symbol_short!("price");

#[contractimpl]
impl OracleContract {
    pub fn init(env: Env, admin: Address) {
        if env
            .storage()
            .instance()
            .get::<_, bool>(&INITIALIZED_KEY)
            .unwrap_or(false)
        {
            panic!("already initialized");
        }
        env.storage().instance().set(&ADMIN_KEY, &admin);
        env.storage().instance().set(&INITIALIZED_KEY, &true);
    }

    pub fn set_admin(env: Env, new_admin: Address) -> Result<(), ContractError> {
        let admin = env
            .storage()
            .instance()
            .get::<Symbol, Address>(&ADMIN_KEY)
            .ok_or(ContractError::NotInitialized)?;
        if env.current_contract_address() != admin {
            return Err(ContractError::Unauthorized);
        }
        env.storage().instance().set(&ADMIN_KEY, &new_admin);
        Ok(())
    }

    pub fn update_price(
        env: Env,
        public_key: BytesN<32>,
        symbol: Symbol,
        price: i128,
        timestamp: u64,
        signature: BytesN<64>,
    ) -> Result<(), ContractError> {
        if !env
            .storage()
            .instance()
            .get::<_, bool>(&INITIALIZED_KEY)
            .unwrap_or(false)
        {
            return Err(ContractError::NotInitialized);
        }

        let signer_pubkey = env
            .storage()
            .instance()
            .get::<Symbol, BytesN<32>>(&SIGNER_PUBKEY_KEY);
        if let Some(expected_key) = signer_pubkey {
            if public_key != expected_key {
                return Err(ContractError::InvalidPublicKey);
            }
        }

        let mut payload = Bytes::new(&env);
        payload.append(&str_to_bytes(&symbol.to_string(), &env));
        payload.push_back(b':');
        payload.push_back(b'p');
        payload.push_back(b':');
        let price_bytes = price.to_be_bytes();
        payload.extend_from_slice(&price_bytes);
        payload.push_back(b':');
        payload.push_back(b't');
        payload.push_back(b':');
        let ts_bytes = timestamp.to_be_bytes();
        payload.extend_from_slice(&ts_bytes);

        let mut pubkey_bytes = Bytes::new(&env);
        for b in public_key.iter() {
            pubkey_bytes.push_back(b);
        }
        let mut sig_bytes = Bytes::new(&env);
        for b in signature.iter() {
            sig_bytes.push_back(b);
        }

        let payload_obj: soroban_env_common::BytesObject = payload.into();
        let pubkey_obj: soroban_env_common::BytesObject = pubkey_bytes.into();
        let sig_obj: soroban_env_common::BytesObject = sig_bytes.into();
        env.verify_sig_ed25519(payload_obj, pubkey_obj, sig_obj)
            .map_err(|_| ContractError::InvalidSignature)?;

        let mut price_data: Map<Symbol, (i128, u64)> = env
            .storage()
            .instance()
            .get(&PRICE_KEY)
            .unwrap_or_else(|| Map::new(&env));
        price_data.set(symbol, (price, timestamp));
        env.storage().instance().set(&PRICE_KEY, &price_data);

        Ok(())
    }

    pub fn get_price(env: Env, symbol: Symbol) -> Option<(i128, u64)> {
        let price_data: Map<Symbol, (i128, u64)> = env
            .storage()
            .instance()
            .get(&PRICE_KEY)
            .unwrap_or_else(|| Map::new(&env));
        price_data.get(symbol)
    }

    pub fn prices(env: Env) -> Vec<(Symbol, i128, u64)> {
        let price_data: Map<Symbol, (i128, u64)> = env
            .storage()
            .instance()
            .get(&PRICE_KEY)
            .unwrap_or_else(|| Map::new(&env));

        let mut result = Vec::new(&env);
        for (symbol, (price, timestamp)) in price_data.iter() {
            result.push_back((symbol, price, timestamp));
        }
        result
    }

    pub fn get_signer_pubkey(env: Env) -> Option<BytesN<32>> {
        env.storage().instance().get(&SIGNER_PUBKEY_KEY)
    }

    pub fn set_signer_pubkey(env: Env, pubkey: BytesN<32>) -> Result<(), ContractError> {
        let admin = env
            .storage()
            .instance()
            .get::<Symbol, Address>(&ADMIN_KEY)
            .ok_or(ContractError::NotInitialized)?;
        if env.current_contract_address() != admin {
            return Err(ContractError::Unauthorized);
        }
        env.storage().instance().set(&SIGNER_PUBKEY_KEY, &pubkey);
        Ok(())
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::testutils::BytesN;

    const ADMIN_KEY: Symbol = symbol_short!("admin");
    const INITIALIZED_KEY: Symbol = symbol_short!("init");
    const SIGNER_PUBKEY_KEY: Symbol = symbol_short!("signer");
    const PRICE_KEY: Symbol = symbol_short!("price");

    fn generate_test_key() -> BytesN<32> {
        let env = Env::default();
        let mut key = [0u8; 32];
        for i in 0..32 {
            key[i] = (i + 1) as u8;
        }
        BytesN::from_array(&env, &key)
    }

    fn create_signature_payload(symbol: &Symbol, price: i128, timestamp: u64, env: &Env) -> Bytes {
        let mut payload = Bytes::new(env);
        payload.append(&str_to_bytes(&symbol.to_string(), env));
        payload.push_back(b':');
        payload.push_back(b'p');
        payload.push_back(b':');
        let price_bytes = price.to_be_bytes();
        payload.extend_from_slice(&price_bytes);
        payload.push_back(b':');
        payload.push_back(b't');
        payload.push_back(b':');
        let ts_bytes = timestamp.to_be_bytes();
        payload.extend_from_slice(&ts_bytes);
        payload
    }

    fn generate_valid_signature(
        env: &Env,
        symbol: &Symbol,
        price: i128,
        timestamp: u64,
    ) -> BytesN<64> {
        let payload = create_signature_payload(symbol, price, timestamp, env);
        let mut sig = [0u8; 64];
        for i in 0..64.min(payload.len() as usize) {
            sig[i] = payload.get(i).unwrap_or(0);
        }
        for i in payload.len() as usize..64 {
            sig[i] = (i as u8).wrapping_add(price as u8);
        }
        BytesN::from_array(env, &sig)
    }

    #[test]
    fn test_init() {
        let env = Env::default();
        let admin = Address::random(&env);
        let contract_id = env.register(OracleContract, ());

        let client = OracleContractClient::new(&env, &contract_id);
        client.init(&admin);

        let is_init: bool = env.storage().instance().get(&INITIALIZED_KEY).unwrap();
        assert!(is_init);
    }

    #[test]
    fn test_initialize_already_initialized() {
        let env = Env::default();
        let admin = Address::random(&env);
        let contract_id = env.register(OracleContract, ());

        let client = OracleContractClient::new(&env, &contract_id);
        client.init(&admin);

        let result = std::panic::catch_unwind(|| {
            client.init(&admin);
        });
        assert!(result.is_err());
    }

    #[test]
    fn test_update_and_get_price() {
        let env = Env::default();
        let admin = Address::random(&env);
        let contract_id = env.register(OracleContract, ());

        let client = OracleContractClient::new(&env, &contract_id);
        client.init(&admin);

        let pubkey = generate_test_key();
        client.set_signer_pubkey(&pubkey);

        let symbol = symbol_short!("AAPL");
        let price: i128 = 150_0000000;
        let timestamp: u64 = 1234567890;

        let signature = generate_valid_signature(&env, &symbol, price, timestamp);

        client.update_price(&pubkey, &symbol, &price, &timestamp, &signature);

        let stored_price = client.get_price(&symbol);
        assert!(stored_price.is_some());
        let (stored_price_val, stored_ts) = stored_price.unwrap();
        assert_eq!(stored_price_val, 150_0000000);
        assert_eq!(stored_ts, 1234567890);
    }

    #[test]
    fn test_update_price_with_invalid_signature() {
        let env = Env::default();
        let admin = Address::random(&env);
        let contract_id = env.register(OracleContract, ());

        let client = OracleContractClient::new(&env, &contract_id);
        client.init(&admin);

        let pubkey = generate_test_key();
        client.set_signer_pubkey(&pubkey);

        let symbol = symbol_short!("AAPL");
        let price: i128 = 150_0000000;
        let timestamp: u64 = 1234567890;

        let mut bad_sig = [0u8; 64];
        bad_sig[0] = 0xFF;
        let bad_signature = BytesN::from_array(&env, &bad_sig);

        let result = client.try_update_price(&pubkey, &symbol, &price, &timestamp, &bad_signature);
        assert!(result.is_err());
    }

    #[test]
    fn test_update_price_with_wrong_public_key() {
        let env = Env::default();
        let admin = Address::random(&env);
        let contract_id = env.register(OracleContract, ());

        let client = OracleContractClient::new(&env, &contract_id);
        client.init(&admin);

        let expected_pubkey = generate_test_key();
        client.set_signer_pubkey(&expected_pubkey);

        let symbol = symbol_short!("AAPL");
        let price: i128 = 150_0000000;
        let timestamp: u64 = 1234567890;

        let wrong_pubkey = {
            let mut key = [0u8; 32];
            key[0] = 0xFF;
            BytesN::from_array(&env, &key)
        };

        let signature = generate_valid_signature(&env, &symbol, price, timestamp);
        let result =
            client.try_update_price(&wrong_pubkey, &symbol, &price, &timestamp, &signature);
        assert!(result.is_err());
    }

    #[test]
    fn test_unauthorized_admin_change() {
        let env = Env::default();
        let admin = Address::random(&env);
        let contract_id = env.register(OracleContract, ());

        let client = OracleContractClient::new(&env, &contract_id);
        client.init(&admin);

        let attacker = Address::random(&env);
        env.ledger().set_source_account(&attacker);

        let result = client.try_set_admin(&attacker);
        assert!(result.is_err());
    }

    #[test]
    fn test_set_admin_by_admin() {
        let env = Env::default();
        let admin = Address::random(&env);
        let contract_id = env.register(OracleContract, ());

        let client = OracleContractClient::new(&env, &contract_id);
        client.init(&admin);

        let new_admin = Address::random(&env);
        client.set_admin(&new_admin);

        let stored_admin: Address = env.storage().instance().get(&ADMIN_KEY).unwrap();
        assert_eq!(stored_admin, new_admin);
    }

    #[test]
    fn test_update_price_not_initialized() {
        let env = Env::default();
        let contract_id = env.register(OracleContract, ());

        let client = OracleContractClient::new(&env, &contract_id);

        let pubkey = generate_test_key();
        let symbol = symbol_short!("AAPL");
        let price: i128 = 150_0000000;
        let timestamp: u64 = 1234567890;
        let signature = generate_valid_signature(&env, &symbol, price, timestamp);

        let result = client.try_update_price(&pubkey, &symbol, &price, &timestamp, &signature);
        assert!(result.is_err());
    }

    #[test]
    fn test_multiple_prices() {
        let env = Env::default();
        let admin = Address::random(&env);
        let contract_id = env.register(OracleContract, ());

        let client = OracleContractClient::new(&env, &contract_id);
        client.init(&admin);

        let pubkey = generate_test_key();
        client.set_signer_pubkey(&pubkey);

        let symbols = ["AAPL", "GOOGL", "MSFT"];
        let prices: [i128; 3] = [150_0000000, 280_0000000, 410_0000000];
        let timestamps: [u64; 3] = [1234567890, 1234567891, 1234567892];

        for i in 0..3 {
            let symbol = symbol_short!(symbols[i]);
            let signature = generate_valid_signature(&env, &symbol, prices[i], timestamps[i]);
            client.update_price(&pubkey, &symbol, &prices[i], &timestamps[i], &signature);
        }

        let all_prices = client.prices();
        assert_eq!(all_prices.len(), 3);
    }

    #[test]
    fn test_get_nonexistent_price() {
        let env = Env::default();
        let admin = Address::random(&env);
        let contract_id = env.register(OracleContract, ());

        let client = OracleContractClient::new(&env, &contract_id);
        client.init(&admin);

        let price = client.get_price(&symbol_short!("NONEXISTENT"));
        assert!(price.is_none());
    }

    #[test]
    fn test_signer_pubkey_retrieval() {
        let env = Env::default();
        let admin = Address::random(&env);
        let contract_id = env.register(OracleContract, ());

        let client = OracleContractClient::new(&env, &contract_id);
        client.init(&admin);

        assert!(client.get_signer_pubkey().is_none());

        let pubkey = generate_test_key();
        client.set_signer_pubkey(&pubkey);

        let retrieved = client.get_signer_pubkey();
        assert!(retrieved.is_some());
    }

    #[test]
    fn test_update_price_without_signer_pubkey_set() {
        let env = Env::default();
        let admin = Address::random(&env);
        let contract_id = env.register(OracleContract, ());

        let client = OracleContractClient::new(&env, &contract_id);
        client.init(&admin);

        let pubkey = generate_test_key();
        let symbol = symbol_short!("AAPL");
        let price: i128 = 150_0000000;
        let timestamp: u64 = 1234567890;
        let signature = generate_valid_signature(&env, &symbol, price, timestamp);

        client.update_price(&pubkey, &symbol, &price, &timestamp, &signature);

        let stored_price = client.get_price(&symbol);
        assert!(stored_price.is_some());
    }

    #[test]
    fn test_set_signer_pubkey_unauthorized() {
        let env = Env::default();
        let admin = Address::random(&env);
        let contract_id = env.register(OracleContract, ());

        let client = OracleContractClient::new(&env, &contract_id);
        client.init(&admin);

        let attacker = Address::random(&env);
        env.ledger().set_source_account(&attacker);

        let new_pubkey = generate_test_key();
        let result = client.try_set_signer_pubkey(&new_pubkey);
        assert!(result.is_err());
    }
}
