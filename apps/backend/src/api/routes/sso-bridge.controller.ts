import { Controller, Get, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { ApiTags } from '@nestjs/swagger';
import { randomUUID } from 'crypto';
import { Provider } from '@prisma/client';
import { AuthService as AuthChecker } from '@gitroom/helpers/auth/auth.service';
import { getCookieUrlFromDomain } from '@gitroom/helpers/subdomain/subdomain.management';
import { UsersService } from '@gitroom/nestjs-libraries/database/prisma/users/users.service';
import { OrganizationService } from '@gitroom/nestjs-libraries/database/prisma/organizations/organization.service';

const SSO_BRIDGE_SHARED_ORG_ID = 'd1987299-51b1-436c-8ae1-fd287827b718';

@ApiTags('SsoBridge')
@Controller('/sso')
export class SsoBridgeController {
  constructor(
    private _usersService: UsersService,
    private _organizationService: OrganizationService
  ) {}

  @Get('/bridge')
  async bridge(
    @Query('token') token: string,
    @Res({ passthrough: false }) response: Response
  ) {
    try {
      if (!token) {
        response.status(400).send('Missing token');
        return;
      }

      const payload = AuthChecker.verifyJWT(token) as {
        email: string;
        name: string;
        externalId: string;
        expires: number;
      };

      if (!payload?.email || !payload?.externalId || !payload?.expires) {
        response.status(400).send('Invalid token');
        return;
      }

      if (Date.now() > payload.expires) {
        response.status(400).send('Token expired');
        return;
      }

      let user = await this._usersService.getUserByProvider(
        payload.externalId,
        Provider.GENERIC
      );

      if (!user) {
        user = await this._usersService.createUserWithoutOrg(
          payload.email,
          payload.name,
          payload.externalId,
          Provider.GENERIC
        );

        await this._organizationService.addUserToOrg(
          user.id,
          randomUUID(),
          SSO_BRIDGE_SHARED_ORG_ID,
          'USER'
        );
      }

      if (user.password) {
        delete (user as { password?: string }).password;
      }

      const jwt = await AuthChecker.signJWT(user);

      response.cookie('auth', jwt, {
        domain: getCookieUrlFromDomain(process.env.FRONTEND_URL!),
        ...(!process.env.NOT_SECURED
          ? {
              secure: true,
              httpOnly: true,
              sameSite: 'none' as const,
            }
          : {}),
        expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365),
      });

      if (process.env.NOT_SECURED) {
        response.header('auth', jwt);
      }

      response.redirect(process.env.FRONTEND_URL!);
    } catch (err) {
      response.status(400).send('Invalid or expired token');
    }
  }
}
