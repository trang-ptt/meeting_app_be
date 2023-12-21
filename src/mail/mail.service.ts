import { MailerService } from '@nestjs-modules/mailer';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from './../prisma/prisma.service';

@Injectable()
export class MailService {
  constructor(
    private config: ConfigService,
    private mailerService: MailerService,
    private prisma: PrismaService,
  ) {}
}