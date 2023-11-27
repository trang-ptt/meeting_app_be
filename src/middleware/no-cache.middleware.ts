import { Injectable, NestMiddleware } from '@nestjs/common';

@Injectable()
export class NoCacheMiddleware implements NestMiddleware {
  use(req: any, res: any, next: () => void) {
    res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    res.header('Expires', '-1');
    res.header('Pragma', 'no-cache');
    next();
  }
}
