import { readFileSync } from 'node:fs';

const image = process.argv[2];
if (!image || !/^[a-z0-9.-]+\/[a-z0-9./_-]+:[a-zA-Z0-9._-]+$/.test(image)) {
  throw new Error('usage: node deployment/render-containerapp.mjs <registry/image:tag>');
}

const contract = JSON.parse(readFileSync(new URL('./containerapp-contract.json', import.meta.url), 'utf8'));
const { database, scale, runtime } = contract;

const body = {
  properties: {
    configuration: {
      secrets: [{
        name: database.containerSecretName,
        keyVaultUrl: database.keyVaultSecretUrl,
        identity: database.identity
      }]
    },
    template: {
      containers: [{
        name: 'app',
        image,
        resources: { cpu: 0.5, memory: '1Gi' },
        env: [
          { name: 'PORT', value: String(runtime.port) },
          { name: database.environmentVariable, secretRef: database.containerSecretName }
        ],
        volumeMounts: []
      }],
      scale: {
        minReplicas: scale.minReplicas,
        maxReplicas: scale.maxReplicas
      },
      volumes: []
    }
  }
};

process.stdout.write(JSON.stringify(body));
