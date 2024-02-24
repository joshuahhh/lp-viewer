import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter, Routes } from 'react-router-dom'
import { RouteDoc } from './RouteDoc.js'
import { RouteRoot } from './RouteRoot.js'
import indexCss from "./index.css?inline"
import { BrowserWebSocketClientAdapter } from '@automerge/automerge-repo-network-websocket'
import { Repo } from '@automerge/automerge-repo'
import { RepoContext } from '@automerge/automerge-repo-react-hooks'
import { BuildsViewer } from './BuildsViewer.js'
import { autoRoute } from './autoRoute.js'

// this is bad but I'm lazy
const networkAdapter = new BrowserWebSocketClientAdapter("wss://sync.automerge.org", 500);
export const repo = new Repo({ network: [ networkAdapter ] });

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RepoContext.Provider value={repo}>
      <style dangerouslySetInnerHTML={{ __html: indexCss }} />
      <HashRouter>
        <Routes>
          {autoRoute("/", RouteRoot)}
          {autoRoute("/:docUrl", RouteDoc)}
          {autoRoute("/builds/:buildsUrl", BuildsViewer)}
        </Routes>
      </HashRouter>
    </RepoContext.Provider>
  </React.StrictMode>,
);
