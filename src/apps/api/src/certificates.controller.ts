import { Body, Controller, Get, Param, Post, Res } from '@nestjs/common';
import { Response } from 'express';
import { IsString } from 'class-validator';
import * as QRCode from 'qrcode';
import { PrismaService } from './prisma.service';
import { Public } from './public.decorator';
import { Roles } from './roles.decorator';
import { CurrentUser } from './tenant.decorator';
import { AuthUser } from './auth.types';
import { CertificatesService } from './certificates.service';

class RevokeDto { @IsString() reason!: string; }

@Controller('certificates')
export class CertificatesController {
  constructor(private readonly prisma: PrismaService, private readonly certificates: CertificatesService) {}
  @Get(':certNo')
  @Public()
  get(@Param('certNo') certNo: string) { return this.prisma.certificate.findUniqueOrThrow({ where: { certNo }, include: { verification: { include: { application: { include: { instrument: true, applicant: true } } } } } }); }
  @Get(':certNo/qr')
  @Public()
  async qr(@Param('certNo') certNo: string, @Res() res: Response) {
    const certificate = await this.prisma.certificate.findUniqueOrThrow({ where: { certNo } });
    res.type('png').send(await QRCode.toBuffer(`${process.env.PUBLIC_VERIFY_URL ?? 'http://localhost:3001/verify'}/${certificate.certNo}`));
  }
  @Get(':certNo/pdf')
  @Public()
  async pdf(@Param('certNo') certNo: string, @Res() res: Response) {
    const buffer = await this.certificates.renderPdf(certNo);
    res.type('pdf').set('Content-Disposition', `attachment; filename="${certNo}.pdf"`).send(buffer);
  }
  @Get(':certNo/history')
  history(@Param('certNo') certNo: string) { return this.certificates.history(certNo); }
  @Post(':certNo/revoke')
  @Roles('STATE_ADMIN', 'CENTRAL_ADMIN', 'LMO')
  revoke(@Param('certNo') certNo: string, @Body() dto: RevokeDto, @CurrentUser() user: AuthUser) {
    return this.certificates.revoke(certNo, user.sub, dto.reason);
  }
}
