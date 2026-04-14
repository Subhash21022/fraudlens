import { NextFunction, Request, Response } from 'express';
import { TransactionInputSchema } from './agent.schemas';
import { runInvestigator } from './agent.utils';

type AsyncController = (
   req: Request,
   res: Response,
   next: NextFunction
) => Promise<any>;

export const httpRunInvestigator: AsyncController = async (req, res, next) => {
   try {
      const transaction = TransactionInputSchema.parse(req.body);
      const result = runInvestigator(transaction);

      return res.status(200).json({
         success: true,
         message: 'Investigator analysis complete',
         data: result,
      });
   } catch (error) {
      return next(error);
   }
};

export const httpAgentHealth: AsyncController = async (_, res) => {
   return res.status(200).json({
      success: true,
      message: 'Agent module is ready',
   });
};
