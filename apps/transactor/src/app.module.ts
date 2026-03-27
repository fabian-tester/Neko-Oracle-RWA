import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { AppController } from './controllers/app.controller';
import { ProofController } from './controllers/proof.controller';
import { AppService } from './app.service';
import { ProofIngestionService } from './services/proof-ingestion.service';
import { SignatureVerificationService } from './services/signature-verification.service';
import { StellarSubmissionService } from './services/stellar-submission.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    HttpModule,
  ],
  controllers: [AppController, ProofController],
  providers: [
    AppService,
    ProofIngestionService,
    SignatureVerificationService,
    StellarSubmissionService,
  ],
})
export class AppModule {}
