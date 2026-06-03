/** Creates a process-local incremental id generator. */
export function init_id_generator(): () => string {
  let counter = 0;
  const initMoment = Date.now();

  return () => {
    ++counter;
    const now = Date.now();
    const id = now - initMoment + counter;

    return id.toString(36);
  };
}
