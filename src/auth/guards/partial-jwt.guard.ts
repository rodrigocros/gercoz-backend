import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class PartialJwtGuard extends AuthGuard('partial-jwt') {}
