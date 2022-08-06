import { fileURLToPath } from 'url';
import { resolve as resolvePath, dirname } from 'path';
import { writeFileSync } from 'fs';
import { resolve, setServers } from 'dns';

import mkdirp from 'mkdirp';

const results = {
  dnsLookup: {
    openDNS: [],
    cloudflare: [],
    google: []
  }
};

await mkdirp(resolvePath(dirname(fileURLToPath(import.meta.url)), 'output'));

setInterval(async () => {
  const resolveForNS = (provider, servers) => {
    return new Promise((resolvePromise) => {
      setServers(servers);
      resolve('google.com', 'A', (err, records) => {
        if (err) {
          results.dnsLookup[provider].push({
            timestamp: new Date().toISOString(),
            error: err
          });
        }
  
        results.dnsLookup[provider].push({
          timestamp: new Date().toISOString(),
          result: records
        });

        resolvePromise();
      });
    });
  };

  await Promise.allSettled([
    resolveForNS('openDNS', ['208.67.222.222']),
    resolveForNS('cloudflare', ['1.1.1.1']),
    resolveForNS('google', ['8.8.8.8', '8.8.4.4'])
  ]);

  writeFileSync(resolvePath(dirname(fileURLToPath(import.meta.url)), 'output/results.json'), JSON.stringify(results, null, 2));
}, 1000);
