const { fileURLToPath } = require('url');
const { resolve: resolvePath, dirname } = require('path');
const { writeFileSync } = require('fs');
const { resolve, setServers } = require('dns');
const { spawn } = require('child_process');

const mkdirp = require('mkdirp');

mkdirp(resolvePath(__dirname, 'output'));

const results = {
  dnsLookup: {
    openDNS: [],
    cloudflare: [],
    google: []
  },
  traceroute: {
    'vanherk.io': [],
    'google.com': []
  }
};

const resolveForNS = (provider, servers) => {
  return new Promise((resolvePromise) => {
    setServers(servers);
    resolve('vanherk.io', 'A', (err, records) => {
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

const preformTraceroute = (domain) => {
  return new Promise(async (resolvePromise) => {
    const trace = {
      timestamp: new Date().toISOString(),
      data: ''
    };

    const tracer = spawn('traceroute', [domain]);

    tracer.stdout.on('data', (data) => {
      trace.data += data.toString();
    });

    tracer.stderr.on('data', (data) => {
      trace.data += data.toString();
    });

    tracer.on('error', (error) => {
      trace.data += `\n\nERROR: ${error.message}\n\n`;
    });

    tracer.on('close', (code) => {
      trace.data += `\n\nDONE: ${code}`;
      results.traceroute[domain].push(trace);
      resolvePromise();
    });

    // If it takes longer than two minutes, it probably already
    // got the required info or it got stuck. In both cases, bonk it.
    setTimeout(() => tracer.kill(), 120000);
  });
};

async function main() {
  await Promise.all([
    resolveForNS('openDNS', ['208.67.222.222']),
    resolveForNS('cloudflare', ['1.1.1.1']),
    resolveForNS('google', ['8.8.8.8', '8.8.4.4']),

    preformTraceroute('vanherk.io'),
    preformTraceroute('google.com')
  ]);

  writeFileSync(resolvePath(__dirname, 'output/results.json'), JSON.stringify(results, null, 2));

  await new Promise((resolve) => setTimeout(resolve, 600000));

  await main();
};

// Initialize
main();
