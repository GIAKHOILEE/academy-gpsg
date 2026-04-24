import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Certificates } from './certificates.entity';
import { Student } from '../students/students.entity';
import { CertificatesService } from './certificates.service';
import { AdminCertificatesController, CertificatesController } from './certificates.controller';

@Module({
    imports: [TypeOrmModule.forFeature([Certificates, Student])],
    controllers: [AdminCertificatesController, CertificatesController],
    providers: [CertificatesService],
    exports: [CertificatesService],
})
export class CertificatesModule { }