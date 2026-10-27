// Run: pnpm exec ts-node -r tsconfig-paths/register --project server/tsconfig.json server/utils/asyncLock.bench.ts
import AsyncLock from '@server/utils/asyncLock';
import { performance } from 'node:perf_hooks';

const RUNS = 5;
const SIZES = [1000, 2000, 4000, 8000];

// N callbacks that all wait for the same key, like a scanner saving the same title
const sameKey = async (n: number) => {
  const lock = new AsyncLock();
  await Promise.all(
    Array.from({ length: n }, () => lock.dispatch('movie-1', async () => 0))
  );
};

// N callbacks with different keys, no waiting at all (baseline)
const differentKeys = async (n: number) => {
  const lock = new AsyncLock();
  await Promise.all(
    Array.from({ length: n }, (_, i) => lock.dispatch(i, async () => 0))
  );
};

const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
};

const measure = async (scenario: (n: number) => Promise<void>, n: number) => {
  await scenario(n); // warm up
  const times: number[] = [];
  for (let i = 0; i < RUNS; i++) {
    const start = performance.now();
    await scenario(n);
    times.push(performance.now() - start);
  }
  return median(times);
};

const main = async () => {
  console.log(`median of ${RUNS} runs, in milliseconds`);
  console.log(
    'tasks'.padEnd(8),
    'same key'.padStart(12),
    'different keys'.padStart(16)
  );

  for (const n of SIZES) {
    const same = await measure(sameKey, n);
    const different = await measure(differentKeys, n);
    console.log(
      String(n).padEnd(8),
      same.toFixed(2).padStart(12),
      different.toFixed(2).padStart(16)
    );
  }
};

main();
