// whenever you need to run async code on tv show or movie that does "get existing" / "check if need to create new" / "save"
// then you need to put all of that code in "await asyncLock.dispatch" callback based on media id
// this will guarantee that only one part of code will run at the same for this media id to avoid code
// trying to create two or more entries for same movie/tvshow (which would result in sqlite unique constraint failrue)

// waiters for a locked key, in arrival order. head points at the next waiter,
// so handing the lock over doesn't have to shift the array
interface WaitQueue {
  waiters: (() => void)[];
  head: number;
}

class AsyncLock {
  // a key is locked while it has an entry here
  private queues = new Map<string, WaitQueue>();

  private acquire = (key: string): Promise<void> => {
    const queue = this.queues.get(key);

    if (!queue) {
      this.queues.set(key, { waiters: [], head: 0 });
      return Promise.resolve();
    }

    return new Promise((resolve) => queue.waiters.push(resolve));
  };

  // hands the lock straight to the next waiter instead of waking all of them
  private release = (key: string): void => {
    const queue = this.queues.get(key);

    if (!queue || queue.head >= queue.waiters.length) {
      this.queues.delete(key);
      return;
    }

    const next = queue.waiters[queue.head];
    queue.head++;

    // drop waiters that already got the lock so a busy key doesn't grow forever
    if (queue.head > 1000 && queue.head * 2 >= queue.waiters.length) {
      queue.waiters = queue.waiters.slice(queue.head);
      queue.head = 0;
    }

    next();
  };

  public dispatch = async <T>(
    key: string | number,
    callback: () => Promise<T>
  ): Promise<T> => {
    const skey = String(key);
    await this.acquire(skey);
    try {
      return await callback();
    } finally {
      this.release(skey);
    }
  };
}

export default AsyncLock;
