import { AutomergeUrl } from "@automerge/automerge-repo";
import { memo, useEffect, useState } from 'react';
import { BuildsViewer } from "./BuildsViewer";
import { useLocalStorage } from "@engraft/shared/lib/useLocalStorage.js";
import { InfoStuff } from "./InfoStuff";
import { createPortal } from "react-dom";

export const defaultServerUrl = "https://lp.joshuahhh.com:8088/";

export const RouteDoc = memo((props: { docUrl: string }) => {
  const { docUrl } = props;

  const [ serverUrl, setServerUrl ] = useLocalStorage<string>(
    "lp-viewer-serverUrl", () => defaultServerUrl);
  console.log("serverUrl", serverUrl)

  const [ buildsUrl, setBuildsUrl ] = useState<AutomergeUrl | null>(null);

  useEffect(() => {
    const go = async () => {
      const resp = await fetch(new URL(`build/${docUrl}`, serverUrl));
      const buildsUrl = await resp.text();
      console.log("got buildsUrl", buildsUrl);
      setBuildsUrl(buildsUrl as AutomergeUrl);
    };
    go();
    const interval = setInterval(go, 10000);
    return () => clearInterval(interval);
  }, [docUrl, serverUrl]);

  const [ slot, setSlot ] = useState<HTMLDivElement | null>(null);
  const [ buildsViewerSlot, setBuildsViewerSlot ] = useState<HTMLDivElement | null>(null);

  return <>
    { buildsUrl && buildsViewerSlot
    ? <BuildsViewer buildsUrl={buildsUrl} infoSlot={buildsViewerSlot} />
    : <div>loading...</div>
    }
    <InfoStuff setSlot={setSlot} warning={serverUrl !== defaultServerUrl} />
    { slot && createPortal(<>
      using server <a style={{fontFamily: "monospace"}} href={serverUrl}>{serverUrl}</a>
      {' '}
      { serverUrl !== defaultServerUrl && <span style={{backgroundColor: "pink", padding: 4}}>not default</span> }
      <button
        style={{marginLeft: 10}}
        onClick={() => {
          const newUrl = prompt("new server URL (blank to reset)", serverUrl);
          if (newUrl === "") {
            setServerUrl(defaultServerUrl);
          } else if (newUrl) {
            setServerUrl(newUrl);
          }
        }}
      >
        change
      </button>
      <div ref={setBuildsViewerSlot} />
    </>, slot) }
  </>;
});
