import { Controller, Post, Body, HttpCode, HttpStatus, ValidationPipe } from '@nestjs/common';
import { ProofIngestionService } from '../services/proof-ingestion.service';
import { SignedPriceProofDto, ProofSubmissionResponseDto } from '../dto/proof.dto';

@Controller('proofs')
export class ProofController {
  constructor(private readonly proofIngestionService: ProofIngestionService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async submitProof(
    @Body(new ValidationPipe({ transform: true })) 
    proof: SignedPriceProofDto
  ): Promise<ProofSubmissionResponseDto> {
    try {
      const result = await this.proofIngestionService.processProof(proof);
      
      return {
        success: result.success,
        message: result.message,
        transactionId: result.transactionId,
      };
    } catch (error) {
      return {
        success: false,
        message: `Internal server error: ${error.message}`,
        error: error.message,
      };
    }
  }
}
