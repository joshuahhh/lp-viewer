import { memo } from 'react';
import { Link } from 'react-router-dom';

export const Root = memo(() => {
  return <>
    <h1>lp-viewer</h1>
    <div>
      go to a link like <Link to="./automerge:2UUcAegYikTrcfyvrLJ83dVuaAYB">this</Link>
    </div>
  </>;
});
