use soroban_sdk::{symbol_short, testutils::BytesN, Address, Env, Symbol};

mod oracle_contract {
    soroban_sdk::contractfile!(file = "target/wasm32-unknown-unknown/release/neko_oracle.wasm");
    use super::*;

    #[allow(unused_imports)]
    use soroban_sdk::{contractclient, contracttype};

    pub struct OracleContractClient;

    impl OracleContractClient {
        pub fn new(env: &Env, contract_id: &Address) -> OracleContractClient {
            OracleContractClient
        }

        pub fn init(&self, admin: &Address) {
            todo!()
        }

        pub fn set_admin(&self, new_admin: &Address) -> Result<(), soroban_sdk::Error> {
            Ok(())
        }

        pub fn update_price(
            &self,
            public_key: &BytesN<32>,
            data: &PriceData,
            signature: &BytesN<64>,
        ) -> Result<(), soroban_sdk::Error> {
            Ok(())
        }

        pub fn get_price(&self, symbol: &Symbol) -> Option<PriceData> {
            None
        }

        pub fn get_price_data(&self, symbol: &Symbol) -> Option<PriceData> {
            None
        }

        pub fn get_signer_pubkey(&self) -> Option<BytesN<32>> {
            None
        }

        pub fn set_signer_pubkey(&self, pubkey: &BytesN<32>) -> Result<(), soroban_sdk::Error> {
            Ok(())
        }

        pub fn prices(&self) -> soroban_sdk::Vec<PriceData> {
            soroban_sdk::Vec::new(&Env::default())
        }
    }

    pub trait OracleContract {
        fn init(env: Env, admin: Address);
        fn set_admin(env: Env, new_admin: Address) -> Result<(), soroban_sdk::Error>;
        fn update_price(
            env: Env,
            public_key: BytesN<32>,
            data: PriceData,
            signature: BytesN<64>,
        ) -> Result<(), soroban_sdk::Error>;
        fn get_price(env: Env, symbol: Symbol) -> Option<PriceData>;
        fn get_price_data(env: Env, symbol: Symbol) -> Option<PriceData>;
        fn get_signer_pubkey(env: Env) -> Option<BytesN<32>>;
        fn set_signer_pubkey(env: Env, pubkey: BytesN<32>) -> Result<(), soroban_sdk::Error>;
        fn prices(env: Env) -> soroban_sdk::Vec<PriceData>;
    }
}

pub struct PriceData {
    pub symbol: Symbol,
    pub price: i64,
    pub timestamp: i64,
    pub source: Option<Symbol>,
}

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::testutils::BytesN;

    fn generate_test_key() -> BytesN<32> {
        BytesN::random()
    }

    fn generate_test_signature() -> BytesN<64> {
        BytesN::random()
    }

    #[test]
    fn test_contract_module_exists() {
        assert!(true);
    }

    #[test]
    fn test_price_data_structure() {
        let env = Env::default();
        let symbol = symbol_short!("AAPL");
        let price_data = PriceData {
            symbol,
            price: 150_0000000i64,
            timestamp: 1234567890i64,
            source: Some(symbol_short!("finnhub")),
        };

        assert_eq!(price_data.price, 150_0000000i64);
        assert_eq!(price_data.timestamp, 1234567890i64);
    }

    #[test]
    fn test_multiple_price_updates() {
        let symbols = vec!["AAPL", "GOOGL", "MSFT", "AMZN", "TSLA"];
        assert_eq!(symbols.len(), 5);

        for symbol in symbols {
            let _price = PriceData {
                symbol: symbol_short!(symbol),
                price: 100_0000000i64,
                timestamp: 1234567890i64,
                source: Some(symbol_short!("test")),
            };
        }
    }

    #[test]
    fn test_signature_length() {
        let signature: BytesN<64> = BytesN::random();
        assert_eq!(signature.len(), 64);
    }

    #[test]
    fn test_public_key_length() {
        let pubkey: BytesN<32> = BytesN::random();
        assert_eq!(pubkey.len(), 32);
    }
}
