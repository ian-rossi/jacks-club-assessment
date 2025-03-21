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
    const paramEntries = Object.entries(params);
    paramEntries.forEach(([key, value]) => command = command.replace(':' + key, value))

    return new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
            if (error) {
                reject(`Error: ${error.stack}`);
                return;
            }
            if (stderr) {
                reject(`Stderr: ${stderr}`);
                return;
            }
            resolve(stdout);
        });
    });
}

const runTerraformCommand = async (commandParts: string[], params: Params = {}): Promise<string> => runCommand(['terraform', `-chdir=${getPath(['tests', 'integration', 'infra'])}`, ...commandParts], params);

const runTerraformApplyCommand = async (vars: string, publicIPv4: string, destroy: boolean = false): Promise<string> => {
    const commandParts = ['apply', vars, '-auto-approve'];
    if (destroy) {
        commandParts.push('-destroy')
    }
    return runTerraformCommand(commandParts, { origin_ip_address: publicIPv4 });
};

const runNpmCommand = async (command: string): Promise<string> => runCommand(['npm', command]);

const runMkdirCommand = async (command: string): Promise<string> => runCommand(['mkdir', command]);

const buildVarFlags = (varObj: { [key: string]: string }): string => {
    return Object.entries(varObj).map(([key, value]) => `-var="${key}=${value}"`).join(' ')
}

const getPath = (pathParts: string[]): string => pathParts.join(path.sep);

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
        console.error(e);
        return true;
    }
}

const zipFolderIfNotExistsToFile = async (folderPath: string, targetFilePath: string, isDevelopmentMode: boolean) => {
    const targetFilePathWithExtension = targetFilePath + '.zip';
    if (isDevelopmentMode) {
        forceRemoveRecursive(targetFilePathWithExtension);
    }
    if (await doesFolderOrFileNotExists(targetFilePathWithExtension)) {
        console.log(`Zipping ${folderPath} to ${targetFilePathWithExtension}`);

        const output = fs.createWriteStream(targetFilePathWithExtension);

        const archive = archiver('zip');

        output.on('close', () => console.log(`File ${targetFilePathWithExtension} created.`));

        archive.on('warning', (err: ArchiverError) => {
            if (err.code !== 'ENOENT') {
                throw err;
            }
            console.warn(err)
        });

        archive.on('error', err => { throw err; });

        archive.pipe(output);

        archive.directory(folderPath, false);

        archive.finalize();
    }
}

let vars: string | null = null;
let publicIPv4: string | null = null;

const forceRemoveRecursive = (path: string): void => {
    console.log('Excluindo pasta ou arquivo no caminho ' + path);
    fs.rmSync(path, { force: true, recursive: true })
};

export const setup = async () => {
    getEnvVarValueRequired('AWS_ACCESS_KEY_ID');
    getEnvVarValueRequired('AWS_SECRET_ACCESS_KEY');
    const awsRegion = getEnvVarValueRequired('AWS_DEFAULT_REGION');
    publicIPv4 = await getPublicIPv4();
    const nodeJSFolder = 'nodejs';
    const nodeModules = 'node_modules'
    const isDevelopmentMode = isEnvVarValueEqualsTrue('DEVELOPMENT_MODE');
    if (isDevelopmentMode) {
        forceRemoveRecursive(nodeJSFolder);
    }
    if (await doesFolderOrFileNotExists(nodeJSFolder)) {
        await runMkdirCommand(nodeJSFolder);
    }
    const doubleNodeJsFolder = getPath([nodeJSFolder, nodeJSFolder]);
    if (await doesFolderOrFileNotExists(doubleNodeJsFolder)) {
        await runMkdirCommand(doubleNodeJsFolder);
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
        await runNpmCommand(`ci --omit=dev --prefix ${doubleNodeJsFolder}`);
    }
    const dist = 'dist';
    if (isDevelopmentMode) {
        forceRemoveRecursive(dist);
    }
    if (await doesFolderOrFileNotExists(dist)) {
        await runNpmCommand('run build');
    }
    await zipFolderIfNotExistsToFile(nodeJSFolder, nodeModules, isDevelopmentMode);
    await zipFolderIfNotExistsToFile(dist, dist, isDevelopmentMode);
    await runTerraformCommand(['init']);
    await runTerraformCommand(['validate']);
    vars = buildVarFlags({
        aws_region: awsRegion,
        origin_ip_address: ':origin_ip_address',
        bucket_id: 'transactions-challenge-lambda-store'
    });
    await runTerraformApplyCommand(vars, publicIPv4);
    const baseURL = await runTerraformCommand(['output', 'api_gateway_url']);
    fs.writeFileSync('base-url.txt', baseURL.replace(/(^"|"\n$)/g, ''));
};

export const teardown = async () => {
    if (isEnvVarValueEqualsTrue('DESTROY_AWS_RESOURCES_AFTER_INTEGRATION_TESTS_RUN')) {
        await runTerraformApplyCommand(vars!, publicIPv4!, true);
    }
}