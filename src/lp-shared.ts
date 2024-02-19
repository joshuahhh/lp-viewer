import * as R from 'remeda';

// TODO: kept in sync manually between multiple repos

export type BuildsDoc = {
  builds: { [buildId: string]: Build },
}

export type Build = {
  id: string,
  startTime: Date,
  result:
    | Result<BuildOutput, string> & {
        finishTime: Date,
        stdout: string,
        stderr: string,
      }
    | null,
}

export type Result<T, E = Error> =
  | { ok: true, value: T }
  | { ok: false, error: E };

export type BuildOutput = {
  pdf: Uint8Array,
}

export type SuccessfulBuild = Build & { result: { ok: true } }
export function buildIsSuccessful(build: Build): build is SuccessfulBuild {
  return build.result?.ok || false;
}

export function getLatestBuild(doc: BuildsDoc): Build | undefined {
  // TODO: ooooo rel – select(`argmax(${doc.builds} .startTime)`)
  return R.pipe(
    doc.builds,
    Object.values,
    R.maxBy(build => build.startTime.getTime()),
  );
}

export function getLatestSuccessfulBuild(doc: BuildsDoc): SuccessfulBuild | undefined {
  return R.pipe(
    doc.builds,
    Object.values,
    R.filter(buildIsSuccessful),
    R.maxBy(build => build.startTime.getTime()),
  );
}
