import appError from '../utils/errors.js';
import { supabaseSelect, supabaseUpdate } from './supabase.js';
import { globalLogger } from '../server.js';

const checkCredit = async (req, res, next) => {
    globalLogger.info("--- checkCredit ---");

    try {
        const token = req.headers['supabase_token'];
        const userID = req.body['userID'];
        const queryCredit = await supabaseSelect(token, "credits",`id=eq.${userID}`);
        const credit = queryCredit[0].credit;
        
        if (credit <= 0) return next(new appError('Not enough credit.', 400));

        return next();

    } 
    catch (error) {
        globalLogger.error(error,`Error checkCredit: ${error.message}`);
        return next(new appError());
    }
};

const updateCredit = async (token, userID, amount=1) => {
    globalLogger.info("--- updateCredit ---");

    try {
        // get credit
        const queryCredit = await supabaseSelect(token, "credits",`id=eq.${userID}`);
        if (!queryCredit) return false;
        // decrease credit
        const newCredit = queryCredit[0].credit - amount;
        // update credit
        let insertData = {
            credit: newCredit
        }
        const result = await supabaseUpdate(token,"credits",`id=eq.${userID}`,insertData);
        if (!result) return false;

        return true;

    } catch (error) {
        globalLogger.error(error,`Error updateCredit: ${error.message}`);
        return false;
    }
}

export { checkCredit, updateCredit }