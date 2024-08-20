import { createClient } from '@supabase/supabase-js';
import { decode } from 'base64-arraybuffer';
import dotenv from 'dotenv';

import { globalLogger } from '../server.js';
import appError from './errors.js';

// Load environment variables from .env file
dotenv.config();

// var for supabase
let supabase = null;
let supabaseUrl = null;
let supabaseAnonKey = null;

// Initialize Supabase client
const supabaseCreateClient = (url, anonKey) => {
    supabase = createClient(url, anonKey);
    supabaseUrl = url;
    supabaseAnonKey = anonKey;
};

// Supabase authentication middleware
const supabaseAuth = async (req, res, next) => {

    const token = req.headers['supabase_token'];

    if (!token) {
        return next(new AppError('A Supabase token is required for authentication', 403));
    }

    try {

        const { data, error } = await supabase.auth.getUser(token.replace('Bearer ', ''));

        if (error || !data) {
            globalLogger.error('Invalid Supabase Token');
            return next(new appError('Invalid Supabase Token', 401));
        }
    
        return next();

    } catch (error) {
        globalLogger.error(error,`Error supabaseAuth: ${error.message}`);
        return next(new appError());
    }

};

// select Supabase
const supabaseSelect = async (token, table, filter, order=false) => {

    try {

        let url = `${supabaseUrl}/rest/v1/${table}?${filter}`;

        if (order) url = `${supabaseUrl}/rest/v1/${table}?${filter}&order=id.desc`;

        const headers = {
            'apikey': supabaseAnonKey,
            'Authorization': `Bearer ${token}`
        };
    
        const requestOptions = {
            method: 'GET',
            headers
        };
        
        const response = await fetch(url, requestOptions);
        const responseData =  await response.json();

        if (response.ok) return responseData;

        globalLogger.error(`Error supabaseSelect: ${table}. ${responseData.message}`);
        return false;
    } 
    catch (error) {
        globalLogger.error(error,`Error supabaseSelect: ${error.message}`);
        return false;
    }
};
// update Supabase
const supabaseUpdate = async (token, table, filter, data) => {

    try {
        const url = `${supabaseUrl}/rest/v1/${table}?${filter}`;

        const headers = {
            'apikey': supabaseAnonKey,
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation',
        };

        const response = await fetch(url, {
            method: 'PATCH',
            headers: headers,
            body: JSON.stringify(data)
        });
        const responseData = await response.json();

        if (response.ok) return responseData;

        globalLogger.error(`Error supabaseUpdate: ${table}. ${responseData.message}`);
        return false;

    } 
    catch (error) {
        globalLogger.error(error,`Error supabaseUpdate: ${error.message}`);
        return false;
    }
};
// insert Supabase
const supabaseInsert = async (token, table, data) => {

    try {
        const url = `${supabaseUrl}/rest/v1/${table}`;

        const headers = {
            'apikey': supabaseAnonKey,
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation',
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(data)
        });
        const responseData = await response.json();

        if (response.ok) return responseData;

        globalLogger.error(`Error supabaseInsert: ${table}. ${responseData.message}`);
        return false;

    } 
    catch (error) {
        globalLogger.error(error,`Error supabaseInsert: ${error.message}`);
        return false;
    }
};
// upload file to storage
const supabaseUploadFile = async (bucket, path, audioBase64) => {

    try {
        const { data, error } = await supabase
                .storage
                .from(bucket)
                .upload(path, decode(audioBase64), {
                    contentType: 'audio/mpeg'
                });
        
        if (error) {
            globalLogger.error(error,"supabaseUploadFile");
            return false;
        }

        globalLogger.debug(data.path,"supabaseUploadFile Path:");

        return data.path;
    } 
    catch (error) {
        globalLogger.error(error,`Error supabaseUploadFile: ${error.message}`);
        return false;
    }
};
// create signURL for file
const supabaseCreateSignedURL = async (bucket, path) => {

    try {
        // expire in SUPABASE_URL_EXPIRATION years
        let expiration = process.env.SUPABASE_URL_EXPIRATION * 31556952;

        const { data, error } = await supabase
                    .storage
                    .from(bucket)
                    .createSignedUrl(path, expiration);
        
        if (error) {
            globalLogger.error(error,"supabaseCreateSignURL");
            return false;
        }

        globalLogger.debug(data.signedUrl,"supabaseCreateSignedURL URL:");

        return data.signedUrl;
    } 
    catch (error) {
        globalLogger.error(error,`supabaseCreateSignURL: ${error.message}`);
        return false;
    }

};
// delete account
const supabaseDeleteAccount = async (userID) => {

    try {

        // create supabase admin client
        const supabase = createClient(supabaseUrl, process.env.SUPABASE_SERVER_KEY_TEST, {
            auth: {
              autoRefreshToken: false,
              persistSession: false
            }
          })
          
          // delete account
          const { data, error } = await supabase.auth.admin.deleteUser(userID);

          if (error) {
            globalLogger.error(`supabaseDeleteAccount: ${error.message}`);
            return false;
        }

        globalLogger.debug(data.signedUrl,"supabaseDeleteAccount");

        return true;
        
    } catch (error) {
        globalLogger.error(error,`supabaseDeleteAccount: ${error.message}`);
        return false;
    }
}

export { supabaseCreateClient, supabaseAuth, supabaseSelect, supabaseUpdate, supabaseInsert, supabaseUploadFile, supabaseCreateSignedURL, supabaseDeleteAccount }