use soroban_sdk::contracterror;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum ContractError {
    NotInitialized = 1,
    Unauthorized = 2,
    InvalidSignature = 3,
    InvalidPublicKey = 4,
    PriceNotFound = 5,
    InvalidPriceData = 6,
}
