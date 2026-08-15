import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { sign } from 'jsonwebtoken';

type GiisGenerateTextResponse = {
  text?: string;
};

export const GIIS_POSTD_TOKEN_TTL_MS = 5 * 60 * 1000;

export function createGiisPostdToken(giisUserId: string) {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured');
  }

  return sign(
    {
      giisUserId,
      expires: Date.now() + GIIS_POSTD_TOKEN_TTL_MS,
    },
    process.env.JWT_SECRET
  );
}

@Injectable()
export class GiisLlmService {
  private readonly logger = new Logger(GiisLlmService.name);

  async generateText(
    giisUserId: string | null | undefined,
    prompt: string,
    structuredResponseFormat?: Record<string, unknown>
  ) {
    if (!giisUserId) {
      throw new HttpException(
        'AI generation is only available for GiiS SSO users',
        HttpStatus.BAD_REQUEST
      );
    }

    if (!process.env.GIIS_BACKEND_URL) {
      this.logger.error('GIIS_BACKEND_URL is not configured');
      throw new HttpException(
        'AI generation is currently unavailable',
        HttpStatus.SERVICE_UNAVAILABLE
      );
    }

    if (!process.env.JWT_SECRET) {
      this.logger.error('JWT_SECRET is not configured');
      throw new HttpException(
        'AI generation is currently unavailable',
        HttpStatus.SERVICE_UNAVAILABLE
      );
    }

    const token = createGiisPostdToken(giisUserId);

    try {
      const response = await axios.post<GiisGenerateTextResponse>(
        `${process.env.GIIS_BACKEND_URL.replace(/\/$/, '')}/api/postd/generate-text`,
        {
          prompt,
          structured_response_format: structuredResponseFormat || null,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          timeout: 120_000,
        }
      );

      return response.data.text || '';
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const status = err.response?.status || HttpStatus.SERVICE_UNAVAILABLE;
        const detail = err.response?.data?.detail;
        const message =
          typeof detail === 'string'
            ? detail
            : 'AI generation is currently unavailable';

        this.logger.warn(
          `GiiS text generation failed with status ${status}: ${message}`
        );

        throw new HttpException(message, status);
      }

      this.logger.error(
        'GiiS text generation failed',
        err instanceof Error ? err.stack : String(err)
      );
      throw new HttpException(
        'AI generation is currently unavailable',
        HttpStatus.SERVICE_UNAVAILABLE
      );
    }
  }
}
