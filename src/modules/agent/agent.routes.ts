import { Router } from 'express';
import { httpAgentHealth, httpRunInvestigator } from './agent.controllers';

const agentRouter = Router();

agentRouter.get('/health', httpAgentHealth);
agentRouter.post('/investigator', httpRunInvestigator);

export default agentRouter;
