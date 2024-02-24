import { AutomergeUrl } from "@automerge/automerge-repo";
import { memo, useEffect, useState } from 'react';
import { BuildsViewer } from "./BuildsViewer";

export const RouteDoc = memo((props: { docUrl: string }) => {
  const { docUrl } = props;

  const [ buildsUrl, setBuildsUrl ] = useState<AutomergeUrl | null>(null);

  useEffect(() => {
    const go = async () => {
      const resp = await fetch(`http://64.23.187.85:8088/build/${docUrl}`);
      const buildsUrl = await resp.text();
      console.log("got buildsUrl", buildsUrl);
      setBuildsUrl(buildsUrl as AutomergeUrl);
    };
    go();
    const interval = setInterval(go, 10000);
    return () => clearInterval(interval);
  }, [docUrl]);

  if (!buildsUrl) {
    return <div>loading...</div>;
  } else {
    return <BuildsViewer buildsUrl={buildsUrl} />;
  }
});
