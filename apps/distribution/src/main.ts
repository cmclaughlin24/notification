import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { setupBullBoard } from './config/bull.config';
import { setupSwaggerDocument } from './config/swagger.config';
import { useGlobalPipes } from './config/use-global.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = process.env.PORT || 3001;

  setupBullBoard(app);
  setupSwaggerDocument(app);
  useGlobalPipes(app);

  await app.listen(port);
}
bootstrap();
