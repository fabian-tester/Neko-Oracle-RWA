import { IsString, IsNumber, IsNotEmpty, IsObject } from 'class-validator';

export class PriceDataDto {
  @IsString()
  @IsNotEmpty()
  symbol: string;

  @IsNumber()
  price: number;

  @IsNumber()
  timestamp: number;

  @IsString()
  source?: string;
}

export class SignedPriceProofDto {
  @IsObject()
  data: PriceDataDto;

  @IsString()
  @IsNotEmpty()
  signature: string;

  @IsString()
  @IsNotEmpty()
  publicKey: string;

  @IsNumber()
  timestamp: number;
}

export class ProofSubmissionResponseDto {
  success: boolean;
  message: string;
  transactionId?: string;
  error?: string;
}
