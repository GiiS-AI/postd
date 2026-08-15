import { Provider } from '@prisma/client';

import { AuthService as AuthChecker } from '@gitroom/helpers/auth/auth.service';
import { getCookieUrlFromDomain } from '@gitroom/helpers/subdomain/subdomain.management';
import { SsoBridgeController } from './sso-bridge.controller';

jest.mock('@gitroom/helpers/subdomain/subdomain.management', () => ({
  getCookieUrlFromDomain: jest.fn(() => '.example.com'),
}));

describe('SsoBridgeController', () => {
  const verifyJWTSpy = jest.spyOn(AuthChecker, 'verifyJWT');
  const signJWTSpy = jest.spyOn(AuthChecker, 'signJWT');

  const usersService = {
    getUserByProvider: jest.fn(),
    createUserWithoutOrg: jest.fn(),
  };

  const organizationService = {
    createOrgForExistingUser: jest.fn(),
    addUserToOrg: jest.fn(),
  };

  const controller = new SsoBridgeController(
    usersService as never,
    organizationService as never
  );

  const response = () =>
    ({
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
      cookie: jest.fn(),
      header: jest.fn(),
      redirect: jest.fn(),
    }) as never;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.FRONTEND_URL = 'https://frontend.example.com';
    delete process.env.NOT_SECURED;
    verifyJWTSpy.mockImplementation((token: string) => {
      if (token === 'token-1') {
        return {
          email: 'jane@example.com',
          name: 'Jane Doe',
          externalId: 'external-1',
          expires: Date.now() + 60_000,
          redirectPath: '/dashboard',
        };
      }

      return {
        email: 'sam@example.com',
        name: '',
        externalId: 'external-2',
        expires: Date.now() + 60_000,
      };
    });
    signJWTSpy.mockImplementation(
      (value: object) => `signed-${(value as { id: string }).id}`
    );
    usersService.getUserByProvider.mockResolvedValue(null);
    usersService.createUserWithoutOrg.mockImplementation(
      async (email: string, name: string, externalId: string) => ({
        id: `${externalId}-user`,
        email,
        name,
        externalId,
        password: 'secret',
      })
    );
    organizationService.createOrgForExistingUser.mockResolvedValue({
      id: 'org-id',
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('creates a distinct org for each new SSO user', async () => {
    const firstResponse = response();
    await controller.bridge('token-1', firstResponse);

    const secondResponse = response();
    await controller.bridge('token-2', secondResponse);

    expect(usersService.getUserByProvider).toHaveBeenNthCalledWith(
      1,
      'external-1',
      Provider.GENERIC
    );
    expect(usersService.getUserByProvider).toHaveBeenNthCalledWith(
      2,
      'external-2',
      Provider.GENERIC
    );
    expect(usersService.createUserWithoutOrg).toHaveBeenNthCalledWith(
      1,
      'jane@example.com',
      'Jane Doe',
      'external-1',
      Provider.GENERIC
    );
    expect(usersService.createUserWithoutOrg).toHaveBeenNthCalledWith(
      2,
      'sam@example.com',
      '',
      'external-2',
      Provider.GENERIC
    );
    expect(organizationService.createOrgForExistingUser).toHaveBeenNthCalledWith(
      1,
      'external-1-user',
      "Jane Doe's Workspace"
    );
    expect(organizationService.createOrgForExistingUser).toHaveBeenNthCalledWith(
      2,
      'external-2-user',
      "sam@example.com's Workspace"
    );
    expect(organizationService.addUserToOrg).not.toHaveBeenCalled();
    expect(getCookieUrlFromDomain).toHaveBeenCalledWith(
      'https://frontend.example.com'
    );
    expect(firstResponse.redirect).toHaveBeenCalledWith(
      'https://frontend.example.com/dashboard'
    );
    expect(secondResponse.redirect).toHaveBeenCalledWith(
      'https://frontend.example.com/'
    );
  });
});
