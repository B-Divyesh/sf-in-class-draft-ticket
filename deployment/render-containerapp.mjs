import { readFileSync } from 'node:fs';

const image = process.argv[2];
if (!image || !/^[a-z0-9.-]+\/[a-z0-9./_-]+:[a-zA-Z0-9._-]+$/.test(image)) {
  throw new Error('usage: node deployment/render-containerapp.mjs <registry/image:tag>');
}

const contract = JSON.parse(readFileSync(new URL('./containerapp-contract.json', import.meta.url), 'utf8'));
const { storage, scale, runtime } = contract;

const body = {
  properties: {
    template: {
      containers: [{
        name: 'app',
        image,
        resources: { cpu: 0.5, memory: '1Gi' },
        env: [{ name: 'PORT', value: String(runtime.port) }],
        volumeMounts: [{ volumeName: storage.volumeName, mountPath: storage.mountPath }]
      }],
      scale: {
        minReplicas: scale.minReplicas,
        maxReplicas: scale.maxReplicas
      },
      volumes: [{
        name: storage.volumeName,
        storageType: storage.type,
        storageName: storage.environmentStorageName
      }]
    }
  }
};

process.stdout.write(JSON.stringify(body));
