import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma';
@Injectable()
export class UserService {
    constructor(private prismaService: PrismaService) {}
    async findUsersByNameAndEmail(name: string) {
        return this.prismaService.user.findMany({
            where: {
                OR: [
                    { name: { contains: name } },
                    { email: { contains: name } },
                ],
            },
        });
    }
    async getAllUser(){
        return this.prismaService.user.findMany();
    }
}
