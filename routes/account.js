import Router from 'express';
import { body, validationResult } from 'express-validator';

import { globalLogger } from '../server.js';
import appError from '../utils/errors.js';
import validateToken from '../utils/auth.js';
import { supabaseAuth, supabaseDeleteAccount } from '../utils/supabase.js';

// create router
const router = Router();

// # POST delete Account #
router.post(
    '/delete', 
    [
        body("userID").notEmpty().withMessage("Please provide a userID"),
    ],
    validateToken,
    supabaseAuth,
    async (req, res, next) => {

        globalLogger.info("##### POST delete Account #####");

        // ## validate body# #
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        // ## get request data ##
        // # get token from header #
        const supabaseToken = req.headers['supabase_token'];
        // # get body #
        const { userID } = req.body;

        // ### generate audio Story ###
        try {
            
            //# delete account #
            const result = await supabaseDeleteAccount(userID);
            if (!result) {
                globalLogger.error("delete Account - supabaseDeleteAccount.");
                next(new appError("Error account could not be deleted.",404));
            }
            else {
                // send result
                res.json({userID: userID});
            }
            globalLogger.info("##### delete Account - done send result #####");
    
        } catch (error) {
            globalLogger.error(error,`POST delete Account: ${error.message}`);
            next(new appError());
        }
});

export default router;