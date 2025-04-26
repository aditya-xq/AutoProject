// server/config.ts
import { env } from '$env/dynamic/private';

export const LM_STUDIO_SERVER =
  env.DOCKER_ENV === 'true'
    ? env.INFERENCE_SERVER_URL_DOCKER
    : env.INFERENCE_SERVER_URL;
