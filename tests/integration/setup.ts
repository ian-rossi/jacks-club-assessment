import { exec } from 'child_process';
import fs from 'fs-extra'
import { config } from 'dotenv'
import path from 'path';
import archiver, { ArchiverError } from 'archiver';

config({ path: '.env.test.integration' });

type Params = { [key: string]: string };
const runCommand = (commandParts: string[], params: Params = {}): Promise<string> => {
    let command = commandParts.join(' ');
    console.log('Running command ' + command);
    Object.entries(params).forEach(([key, value]) => command = command.replace(':' + key, value))

    return new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error(error);
                reject(`Error: ${error.message}`);
                return;
            }
            if (stderr) {
                console.error(stderr);
                reject(`Stderr: ${stderr}`);
                return;
            }
            resolve(stdout);
        });
    });
}

const buildVarFlags = (varObj: { [key: string]: string }): string => {
    return Object.entries(varObj).map(([key, value]) => `-var="${key}=${value}"`).join(' ')
}

const getPath = (pathParts: string[]): string => pathParts.join(path.sep);

const runTerraformCommand = async (commandParts: string[], params: Params = {}): Promise<string> => runCommand(['terraform', `-chdir=${getPath(['tests', 'integration', 'infra'])}`, ...commandParts], params);

const getPublicIPv4 = async (): Promise<string> => {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        if (!response.ok) {
            throw new Error('Failed to fetch public IP address');
        }
        const data = await response.json();
        return data.ip;
    } catch (error) {
        console.error('Error fetching public IP:', error);
        throw error;
    }
}

const getEnvVarValueRequired = (envVarKey: string): string => {
    const envVarValue = process.env[envVarKey];
    if (!envVarKey) {
        throw new Error(`Env var ${envVarKey} should be set.`);
    }
    return envVarValue!;
}

const isEnvVarValueEqualsTrue = (envVarKey: string): boolean => {
    return process.env[envVarKey]?.trim()?.toLowerCase() === 'true';
}

const doesFolderOrFileNotExists = async (path: string): Promise<boolean> => {
    try {
        await fs.access(path);
        return false;
    } catch (e) {
        return true;
    }
}

const runNpmCommand = async (command: string): Promise<string> => runCommand(['npm', command]);

const zipFolderIfNotExists = async (sourcePath: string, targetPath: string) => {
    const targetPathWithExtension = targetPath + '.zip';
    if (await doesFolderOrFileNotExists(targetPathWithExtension)) {
        console.log(`Zipping ${sourcePath} to ${targetPathWithExtension}`);

        const output = fs.createWriteStream(targetPathWithExtension);

        const archive = archiver('zip');

        output.on('close', () => console.log(`File ${targetPathWithExtension} created.`));

        archive.on('warning', (err: ArchiverError) => { if (err.code !== 'ENOENT') { throw err; } console.warn(err) });

        archive.on('error', err => { throw err; });

        archive.pipe(output);

        archive.directory(sourcePath, false);

        archive.finalize();
    }
}

let vars: string | null = null;
let publicIPv4: string | null = null;

export const setup = async () => {
    getEnvVarValueRequired('AWS_ACCESS_KEY_ID');
    getEnvVarValueRequired('AWS_SECRET_ACCESS_KEY');
    const awsRegion = getEnvVarValueRequired('AWS_DEFAULT_REGION');
    publicIPv4 = await getPublicIPv4();
    const nodeJSFolder = 'nodejs';
    const nodeModules = 'node_modules';
    if (await doesFolderOrFileNotExists(nodeJSFolder)) {
        await runCommand(['mkdir', nodeJSFolder]);
    }
    const doubleNodeJsFolder = getPath([nodeJSFolder, nodeJSFolder]);
    if (await doesFolderOrFileNotExists(doubleNodeJsFolder)) {
        await runCommand(['mkdir', doubleNodeJsFolder]);
    }
    const nodeJSNodeModulesFolder = getPath([doubleNodeJsFolder, nodeModules]);
    const pack = 'package';
    const packageLock = pack + '-lock';
    const jsonExtesion = '.json'
    const pacJson = pack + jsonExtesion;
    const packageLockJson = packageLock + jsonExtesion;
    const nodeJSPackageJsonPath = getPath([doubleNodeJsFolder, pacJson]);
    const nodeJSPackageLockJsonPath = getPath([doubleNodeJsFolder, packageLockJson]);
    if (await doesFolderOrFileNotExists(nodeJSNodeModulesFolder)) {
        await fs.copy(pacJson, nodeJSPackageJsonPath);
        await fs.copy(packageLockJson, nodeJSPackageLockJsonPath);
        await runNpmCommand('ci --omit=dev --prefix nodejs/nodejs');
    }
    const dist = 'dist';
    if (await doesFolderOrFileNotExists(dist)) {
        await runNpmCommand('run build');
    }
    await zipFolderIfNotExists(nodeJSFolder, nodeModules);
    await zipFolderIfNotExists(dist, dist);
    await runTerraformCommand(['init']);
    await runTerraformCommand(['validate']);
    vars = buildVarFlags({
        aws_region: awsRegion,
        origin_ip_address: ':origin_ip_address',
        bucket_id: 'jacks-club-assessment-lambda-store'
    });
    await runTerraformCommand(['apply', vars, '-auto-approve'], { origin_ip_address: publicIPv4 });
    const baseURL = await runTerraformCommand(['output', 'api_gateway_url']);
    fs.writeFileSync('base-url.txt', baseURL.replace(/(^"|"\n$)/g, ''));
};

export const teardown = async () => {
    if (isEnvVarValueEqualsTrue('DESTROY_AWS_RESOURCES_AFTER_INTEGRATION_TESTS_RUN')) {
        await runTerraformCommand(['apply', vars!, '-auto-approve', '-destroy'], { origin_ip_address: publicIPv4! });
    }
}