import { Router } from 'express';
import agentRouter from './agent/agent.routes';

const router = Router();

router.use('/agents', agentRouter);

export default router;
