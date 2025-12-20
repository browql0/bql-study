import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Load env
const envPath = path.resolve(process.cwd(), '.env');
let envContent = '';
try {
    envContent = fs.readFileSync(envPath, 'utf-8');
} catch (e) {
    console.log('No .env file found, trying .env.local');
    try {
        envContent = fs.readFileSync(path.resolve(process.cwd(), '.env.local'), 'utf-8');
    } catch (e2) {
        console.log('No .env.local found either');
    }
}

const parseEnv = (content) => {
    const env = {};
    content.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) env[key.trim()] = value.trim();
    });
    return env;
};

const env = parseEnv(envContent);
const url = env.VITE_SUPABASE_URL;
const key = env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
    console.error("Missing ENV vars");
    process.exit(1);
}

const supabase = createClient(url, key);

async function test() {
    console.log("Fetching profiles with ANON key...");
    const { data, error } = await supabase.from('profiles').select('*').limit(5);
    if (error) {
        console.error("Error:", error);
    } else {
        console.log("Data length:", data ? data.length : 0);
        if (data && data.length > 0) {
            console.log("First item sample:", JSON.stringify(data[0], null, 2));
        } else {
            console.log("Data is empty. Likely RLS blocking.");
        }
    }
}

test();
