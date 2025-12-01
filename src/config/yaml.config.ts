
import { registerAs } from '@nestjs/config';
import { readFileSync } from 'fs';
import * as yaml from 'js-yaml';
import { join } from 'path';

export const YAML_CONFIG_NAMESPACE = 'yaml_config';

const substituteEnvVariables = (obj: any): any => {
    if (typeof obj === 'string') {
        return obj.replace(/\$\{([^}]+)\}/g, (_, varName) => {
            const value = process.env[varName];
            if (value === undefined) {
                throw new Error(`Environment variable ${varName} is not defined`);
            }
            return value;
        });
    }

    if (Array.isArray(obj)) {
        return obj.map(item => substituteEnvVariables(item));
    }

    if (obj !== null && typeof obj === 'object') {
        const result: any = {};
        for (const [key, value] of Object.entries(obj)) {
            result[key] = substituteEnvVariables(value);
        }
        return result;
    }

    return obj;
};

export default registerAs(YAML_CONFIG_NAMESPACE, () => {
    const configPath = process.env.CONFIG_PATH || join(process.cwd(), 'config.yaml');

    try {
        const fileContent = readFileSync(configPath, 'utf8');
        const rawConfig = yaml.load(fileContent);
        return substituteEnvVariables(rawConfig);
    } catch (error: any) {
        throw new Error(`Failed to load config from ${configPath}: ${error.message}`);
    }
});
