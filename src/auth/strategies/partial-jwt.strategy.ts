import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

type PartialPayload = { sub: string; name: string; type: string };

@Injectable()
export class PartialJwtStrategy extends PassportStrategy(Strategy, 'partial-jwt') {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.get('JWT_SECRET'),
    });
  }

  validate(payload: PartialPayload) {
    if (payload.type !== 'partial') throw new UnauthorizedException('Partial token required');
    return { userId: payload.sub, name: payload.name };
  }
}
