import { Role } from '@prisma/client';

import { AuthService } from '@gitroom/helpers/auth/auth.service';
import { OrganizationRepository } from './organization.repository';

describe('OrganizationRepository', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('creates an org for an existing user as superadmin', async () => {
    const organizationCreate = jest.fn().mockResolvedValue({ id: 'org-123' });
    const repository = new OrganizationRepository(
      {
        model: {
          organization: {
            create: organizationCreate,
          },
        },
      } as never,
      {
        model: {
          userOrganization: {},
        },
      } as never,
      {
        model: {
          user: {},
        },
      } as never
    );

    jest.spyOn(AuthService, 'fixedEncryption').mockReturnValue('encrypted-key');

    const result = await repository.createOrgForExistingUser(
      'user-123',
      "Jane Doe's Workspace"
    );

    expect(result).toEqual({ id: 'org-123' });
    expect(organizationCreate).toHaveBeenCalledWith({
      data: {
        name: "Jane Doe's Workspace",
        apiKey: 'encrypted-key',
        allowTrial: true,
        isTrailing: true,
        users: {
          create: {
            role: Role.SUPERADMIN,
            user: {
              connect: {
                id: 'user-123',
              },
            },
          },
        },
      },
      select: {
        id: true,
      },
    });
  });
});
